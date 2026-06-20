# -*- coding: utf-8 -*-
"""
orchestrate_carousel.py — Etapa 2 do pipeline *design-creative.

Consome o brief gerado pelo deep_modeler (Etapa 1) e renderiza o carrossel
via VVS (Playwright + Next.js).

Resiliência (MKT-MEDIA-05):
  - Pre-check do render service ANTES de gastar chamadas de IA.
  - Gate de validação do brief (_validation.status == FAIL aborta).
  - Isolamento por slide: 1 falha não derruba o batch.
  - Aviso explícito quando há recast de personalização pendente.
"""

import os
import re
import sys
import yaml
import json
import time
import zipfile
import urllib.request

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tools.vvs_render_service import VVSRenderService
from tools.casey_ai_image_service import generate
from tools.pexels_service import search_and_download
from _client_resolver import resolve_client  # noqa: E402


def _sha256_of_file(path: str) -> str:
    """SHA-256 hex de um arquivo (curto: primeiros 16 chars). '' se ausente."""
    if not path or not os.path.exists(path):
        return ""
    try:
        import hashlib
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()[:16]
    except Exception:
        return ""


def _build_pipeline_trace(data, client_slug, template_id, signature_handle,
                          footer_text, palette_props, brief_path):
    """Constrói o pipeline-trace.json — auditoria completa do que foi consumido.

    Inclui:
    - Cliente resolvido + display name
    - Paths dos YAMLs efetivamente carregados (brief, brand-identity, brand-config,
      audit-config, templates) com SHA-256 (detecção de drift)
    - Modelos LLM usados em cada etapa do pipeline (extraídos dos campos
      personalization.* / benchmark_analysis.* / quality_gate.* do brief)
    - brand_tokens.palette efetivamente injetados no render
    - signature/footer/palette_props passados aos templates
    - Timestamps
    """
    # Resolução do cliente (paths canônicos via registry)
    client_info = {"slug": client_slug, "display": client_slug}
    yaml_paths = {}
    try:
        cp = resolve_client(client_slug)
        client_info["display"] = cp.nome_exibicao
        client_info["handle_instagram"] = cp.handle_instagram
        yaml_paths["brand_identity"] = cp.brand_identity
        yaml_paths["brand_config"] = cp.brand_config
    except Exception as e:  # noqa: BLE001
        client_info["resolver_error"] = str(e)

    # Audit-config + templates.yaml (mesma convenção do registry)
    base_client_dir = f"squads/virals-marketing-squad/data/clients/{client_slug}"
    audit_cfg = f"{base_client_dir}/audit-config.yaml"
    templates_yaml = f"{base_client_dir}/templates.yaml"
    if os.path.exists(audit_cfg):
        yaml_paths["audit_config"] = audit_cfg
    if os.path.exists(templates_yaml):
        yaml_paths["templates"] = templates_yaml

    # Hashes para detectar drift entre runs
    yaml_hashes = {key: _sha256_of_file(path) for key, path in yaml_paths.items()}
    yaml_hashes["brief"] = _sha256_of_file(brief_path)

    # Modelos LLM extraídos do brief (cada etapa persiste o model usado)
    llm_models = {}
    benchmark_analysis = (data.get("benchmark_analysis") or {})
    if benchmark_analysis.get("model"):
        llm_models["analyze_benchmark"] = benchmark_analysis["model"]
    plan_meta = (data.get("plan_creative") or {})
    if plan_meta.get("model"):
        llm_models["plan_creative"] = plan_meta["model"]
    # Recast persiste o model em cada slide.personalization
    recast_models = set()
    for s in data.get("content_data", []) or []:
        m = ((s.get("personalization") or {}).get("recast_model"))
        if m:
            recast_models.add(m)
    if recast_models:
        llm_models["recast_engine"] = sorted(recast_models)
    qg = (data.get("quality_gate") or {})
    if qg.get("model"):
        llm_models["quality_gate"] = qg["model"]

    # Paleta efetivamente injetada (mesmo objeto que foi passado aos templates)
    palette_injected = {k: v for k, v in (palette_props or {}).items() if v}

    return {
        "schema_version": "1.0",
        "trace_kind": "design-creative-carousel",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "client": client_info,
        "brief_path": brief_path,
        "yamls_consumed": yaml_paths,
        "yaml_hashes_sha256_short": yaml_hashes,
        "llm_models_used": llm_models,
        "render_inputs": {
            "template_id_render": template_id,
            "signature_handle": signature_handle,
            "footer_text": footer_text,
            "palette_injected": palette_injected,
        },
        "brand_tokens_from_brief": (data.get("brand_tokens") or {}).get("palette", {}),
        "client_slug_in_brief": data.get("client_slug"),
        "audit_provenance_note": (
            "Para auditar a análise dos agentes sobre o benchmark, consulte os "
            "Análise.md em workspaces/businesses/<slug>/marketing/daily-monitoring/"
            "<date>/benchmark/<...>/ — cada Análise.md indica o modelo LLM usado "
            "por agente (campo _model no JSON de cada audit em "
            "_audit-summary-<date>.json) e cita o creative_id real (regra de "
            "citação obrigatória, MKT-MC3-03)."
        ),
    }


def _resolve_client_signature(client_slug: str):
    """Devolve (signatureHandle, footerText) brand-agnostic para o cliente.

    Virals (back-compat): signature vazio (renderiza o BrandingLogo V+) e
    footer canônico 'Virals Intelligence Engine'.
    Outros clientes: handle do registry como wordmark; footer vazio (a
    assinatura textual já comunica a marca).
    """
    if not client_slug or client_slug == "virals":
        return "", "Virals Intelligence Engine"
    try:
        cp = resolve_client(client_slug)
        return cp.handle_instagram or f"@{client_slug}", ""
    except Exception:
        return f"@{client_slug}", ""

RENDER_BASE_URL = os.environ.get("RENDER_BASE_URL", "http://localhost:3001")


def check_render_service(base_url=RENDER_BASE_URL, timeout=3):
    """Verifica se o render service Next.js está no ar."""
    try:
        with urllib.request.urlopen(base_url, timeout=timeout) as resp:
            return resp.status < 500
    except Exception:
        return False


def _fallback_query(slide):
    """Query Pexels de reserva quando o brief não traz pexels_query."""
    words = re.findall(r"[A-Za-zÀ-ÿ]{4,}", slide.get("headline", ""))
    return " ".join(words[:3]) or "marketing concept"


def _load_template_spec(spec_path):
    """Carrega a TemplateSpec de um template gerado (Frente A).

    O arquivo é a ENTRY do registry gerado; a spec vive em entry['spec'].
    Retorna o dict da spec ou None.
    """
    if not spec_path or not os.path.exists(spec_path):
        if spec_path:
            print(f"  ⚠️  template-spec não encontrado: {spec_path}", file=sys.stderr)
        return None
    try:
        with open(spec_path, "r", encoding="utf-8") as f:
            entry = yaml.safe_load(f) or {}
        return entry.get("spec") or None
    except yaml.YAMLError as e:  # noqa: BLE001
        print(f"  ⚠️  falha ao ler template-spec ({e})", file=sys.stderr)
        return None


def orchestrate_carousel(brief_path, force=False, image_mode="pexels",
                         template_override=None, template_spec_path=None):
    print(f"--- PHASE 0: Pre-checks (image-mode: {image_mode}) ---")

    if not os.path.exists(brief_path):
        print(f"ERRO: brief não encontrado: {brief_path}", file=sys.stderr)
        return 1

    # Frente A: spec do template gerado (dirige o BenchmarkDerivedSlide).
    template_spec = _load_template_spec(template_spec_path)
    if template_spec:
        print(f"  Template spec: {template_spec_path} "
              f"(archetype={template_spec.get('archetype')})")

    with open(brief_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Gate de validação do brief (Etapa 1).
    validation = data.get("_validation", {})
    if validation:
        status = validation.get("status", "UNKNOWN")
        print(f"  Brief validation: {status}")
        if status == "FAIL" and not force:
            print("ERRO: brief reprovado na validação da Etapa 1. "
                  "Pendências:", file=sys.stderr)
            for issue in validation.get("issues", []):
                print(f"  - {issue}", file=sys.stderr)
            print("Corrija o brief ou rode com --force.", file=sys.stderr)
            return 2
        pending = validation.get("personalization_pending", 0)
        if pending:
            print(f"  ⚠️  AVISO: {pending} slide(s) com recast de personalização "
                  f"PENDENTE — o render usará o conteúdo de referência do "
                  f"benchmark. Personalize para Virals antes de publicar.")

    # Pre-check do render service ANTES de gastar chamadas de IA.
    if not check_render_service():
        print(f"ERRO: render service indisponível em {RENDER_BASE_URL}.",
              file=sys.stderr)
        print("Inicie-o antes de rodar a orquestração:", file=sys.stderr)
        print("  cd apps/creative-design && npm run dev -- -p 3001",
              file=sys.stderr)
        return 2
    print(f"  Render service: ON ({RENDER_BASE_URL})")

    brief = data.get("carousel_brief", {})
    content_data = data.get("content_data", [])
    slug = brief.get("slug", "carousel-teste")
    slide_count = brief.get("slide_count", len(content_data))
    # Segregação por cliente (MKT-MC-03). Fallback: virals (briefs legados).
    client_slug = data.get("client_slug", "virals")
    # Brand-agnostic signature (MKT-MC4-04) — resolve handle/footer do registry.
    client_signature, client_footer = _resolve_client_signature(client_slug)
    print(f"  Signature: {client_signature or '(BrandingLogo V+)'} · "
          f"Footer: {client_footer or '(vazio)'}")

    # Brand-agnostic palette (MKT-MC4-05) — carrega do brief.brand_tokens.
    # Para clientes não-Virals, propaga as 5 cores ao PremiumBackground via props.
    brand_tokens = data.get("brand_tokens", {}) or {}
    palette = (brand_tokens.get("palette") or {})
    pass_palette = client_slug != "virals" and bool(palette)
    palette_props = {
        "primaryColor":   palette.get("primary")        if pass_palette else None,
        "secondaryColor": palette.get("secondary")      if pass_palette else None,
        "accentAlt":      palette.get("accent_alt")     if pass_palette else None,
        "accentAurora":   palette.get("accent_aurora")  if pass_palette else None,
    }
    if pass_palette:
        print(f"  Paleta: primary={palette_props['primaryColor']} · "
              f"alt={palette_props['accentAlt']} · aurora={palette_props['accentAurora']}")

    # MED-07: paleta completa para o modo 'preset' (buildPreset usa as 5 cores).
    preset_palette = {
        "primary": palette.get("primary", "#0B0B0F"),
        "secondary": palette.get("secondary", "#1A1A24"),
        "accent": palette.get("accent", "#FFB800"),
        "accentAlt": palette.get("accent_alt", "#FF4D2E"),
        "accentAurora": palette.get("accent_aurora", "#FFD86B"),
    }

    # Template: override manual do usuário tem prioridade; senão, decide-se por
    # estilo ('quote' via LLM) + estrutura (single vs carousel por nº de slides).
    archetype = data.get("archetype", "news")
    if template_override:
        template_id = template_override
        print(f"  Template (override manual): {template_id}")
    else:
        if archetype == "quote":
            template_id = "quote-slide"
        elif len(content_data) == 1:
            template_id = "single-post"
        else:
            template_id = "carousel-slide"
        print(f"  Arquétipo: {archetype} | slides: {len(content_data)} -> template: {template_id}")

    if not content_data:
        print("ERRO: brief sem content_data.", file=sys.stderr)
        return 1

    # Output unique-per-run (MKT-MC4-07) — cada execução cria uma pasta nova,
    # nunca sobrescreve runs anteriores. Permite comparar templates lado-a-lado
    # e preserva histórico de iterações sobre o mesmo benchmark.
    # Estrutura: outputs/<client>/carousels/<slug>/<template>__<timestamp>/
    run_stamp = time.strftime("%Y%m%dT%H%M%S")
    template_label = (template_id or "carousel-slide").replace("/", "_")
    output_dir = os.path.join(
        "outputs", client_slug, "carousels", slug,
        f"{template_label}__{run_stamp}",
    )
    os.makedirs(output_dir, exist_ok=True)
    print(f"  Output dir: {output_dir} (cliente: {client_slug})")
    # Atualiza um symlink/junction _latest apontando para o run atual,
    # facilitando integrações que querem o "mais recente" estável.
    latest_link = os.path.join("outputs", client_slug, "carousels", slug, "_latest")
    try:
        if os.path.exists(latest_link) or os.path.islink(latest_link):
            os.remove(latest_link) if not os.path.isdir(latest_link) or os.path.islink(latest_link) else os.rmdir(latest_link)
    except OSError:
        pass
    try:
        # Symlinks no Windows exigem privilégio; fallback: arquivo .txt com path.
        os.symlink(os.path.basename(output_dir), latest_link, target_is_directory=True)
    except (OSError, NotImplementedError):
        with open(latest_link + ".txt", "w", encoding="utf-8") as f:
            f.write(os.path.basename(output_dir) + "\n")

    manifest = {
        "slug": slug,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "engine": "VVS-Playwright",
        "slide_count": slide_count,
        "slides": [],
        "failures": [],
    }

    render_service = VVSRenderService()
    print("\n--- PHASE 2..4: VVS Slide Processing ---")

    for i, slide in enumerate(content_data):
        slide_n = slide.get("slide_n", i + 1)
        print(f"\n--- Processando Slide {slide_n}/{slide_count} ---")

        # Isolamento: falha em 1 slide não derruba o batch.
        try:
            _process_slide(slide, slide_n, slide_count, slug,
                           render_service, output_dir, manifest,
                           first=(i == 0), image_mode=image_mode,
                           template_id=template_id,
                           signature_handle=client_signature,
                           footer_text=client_footer,
                           palette_props=palette_props,
                           template_spec=template_spec,
                           preset_palette=preset_palette)
        except Exception as e:
            print(f"  ❌ Slide {slide_n} FALHOU: {e}")
            manifest["failures"].append({"slide_n": slide_n, "error": str(e)})
            continue

    # --- PHASE 5: Export, ZIP e Pipeline Trace ---
    print("\n--- PHASE 5: Export, ZIP e Pipeline Trace ---")
    manifest_path = os.path.join(output_dir, "carousel_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # ── Pipeline Trace (MKT-MC4-06) — auditoria total do run ────────────────────
    # Para que o dono consiga verificar APÓS o run quais YAMLs/configs foram
    # efetivamente consumidos (brand-identity, brand-config, audit-config, etc),
    # quais modelos LLM foram usados em cada etapa, e a paleta + signature
    # injetadas no render. Detecta drift via hash SHA-256 dos YAMLs.
    trace_path = os.path.join(output_dir, "_pipeline-trace.json")
    try:
        trace = _build_pipeline_trace(
            data=data,
            client_slug=client_slug,
            template_id=template_id,
            signature_handle=client_signature,
            footer_text=client_footer,
            palette_props=palette_props,
            brief_path=brief_path,
        )
        with open(trace_path, "w", encoding="utf-8") as f:
            json.dump(trace, f, indent=2, ensure_ascii=False)
        print(f"Pipeline Trace: {trace_path}")
    except Exception as e:  # noqa: BLE001
        print(f"⚠️  Não foi possível gerar pipeline-trace: {e}")

    ok = len(manifest["slides"])
    failed = len(manifest["failures"])

    if ok:
        zip_path = os.path.join(output_dir, f"carousel_{slug}.zip")
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for s in manifest["slides"]:
                zipf.write(os.path.join(output_dir, s["path"]), s["path"])
                zipf.write(os.path.join(output_dir, s["webp_path"]), s["webp_path"])
            zipf.write(manifest_path, "carousel_manifest.json")
        print(f"ZIP: {zip_path}")

    print(f"\nPipeline VVS (Carrossel) — OK: {ok} | Falhas: {failed}")
    print(f"Arquivos em: {output_dir}")
    if failed:
        print("⚠️  Slides com falha:", [f["slide_n"] for f in manifest["failures"]])
    print("⚠️  CHECKPOINT: acionar @mrbeast-mk para Auditoria de Hook Visual.")
    return 0 if failed == 0 else 3


def _process_slide(slide, slide_n, slide_count, slug, render_service,
                   output_dir, manifest, first, image_mode="brand",
                   template_id="carousel-slide",
                   signature_handle="", footer_text="Virals Intelligence Engine",
                   palette_props=None, template_spec=None, preset_palette=None):
    # Creative Studio (MED-05): slide com camadas renderiza via template 'layered'
    # e carrega seus próprios assets — pula a geração/busca automática de imagem.
    layers = slide.get("layers")
    if layers:
        layered_props = {
            "templateId": "layered",
            "layers": layers,
            "background": slide.get("background", {"type": "brand"}),
            "accentColor": slide.get("accent_color", "#FFB800"),
        }
        if palette_props:
            for k, v in palette_props.items():
                if v:
                    layered_props[k] = v
        filename = f"slide_{slide_n:02d}.png"
        filepath = os.path.abspath(os.path.join(output_dir, filename))
        render_service.render_component("layered", layered_props, filepath)
        from PIL import Image
        webp_filename = filename.replace(".png", ".webp")
        Image.open(filepath).save(
            os.path.join(output_dir, webp_filename), "WEBP", quality=85)
        manifest["slides"].append({
            "slide_n": slide_n, "path": filename,
            "webp_path": webp_filename, "variant": "LAYERED",
        })
        print(f"  ✅ Slide {slide_n} OK (layered · {len(layers)} camadas)")
        return

    # MED-07: presets que usam imagem (os demais são número/citação/passos).
    slide_template = slide.get("template_id") or template_id
    image_templates = {"carousel-slide", "single-post", "tiago-diary"}
    wants_image = slide_template in image_templates

    # Override do Editor (MED-04) tem prioridade sobre a geração automática.
    context_image_url = slide.get("image_url")
    public_render_dir = "apps/creative-design/public/render-assets"
    # 'pexels' (padrão): foto real de banco. 'ai': geração por IA (opt-in).
    # 'brand': sem imagem — só o background de marca.
    # MED-07: só busca imagem para templates que a usam (evita fetch desperdiçado).
    if context_image_url:
        print(f"  > Imagem do Editor: {context_image_url}")
    elif not wants_image:
        pass  # template sem imagem (data/step/quote) — sem busca
    elif image_mode == "ai" and slide.get("ai_prompt"):
        # Delay sutil para respeitar rate limits de APIs Free.
        if not first:
            time.sleep(3)
        print(f"  > Visual contextual (IA): {str(slide.get('headline'))[:40]}...")
        gen_result = generate(slide["ai_prompt"], {"width": 1080, "height": 1080})
        os.makedirs(public_render_dir, exist_ok=True)
        filename = f"ctx_{slug}_{slide_n}_{int(time.time())}.png"
        full_path = os.path.join(public_render_dir, filename)
        gen_result.image.save(full_path)
        context_image_url = f"/render-assets/{filename}"
        print(f"  > Imagem: {context_image_url}")

    elif image_mode == "pexels":
        query = slide.get("pexels_query") or _fallback_query(slide)
        # Orientação casada com o placeholder: HOOK = painel vertical.
        orientation = "portrait" if slide.get("variant") == "HOOK" else "landscape"
        try:
            stem = f"px_{slug}_{slide_n}_{int(time.time())}"
            path = search_and_download(query, public_render_dir, stem, orientation)
            if path:
                context_image_url = f"/render-assets/{os.path.basename(path)}"
                print(f"  > Pexels '{query}' → {context_image_url}")
            else:
                print(f"  > Pexels: nada para '{query}' — slide sem imagem")
        except Exception as e:  # noqa: BLE001
            print(f"  > Pexels falhou ('{query}'): {e} — slide sem imagem")

    # Creative Studio v2: template por slide + sobreposições + campos extras.
    props = {
        "templateId": slide_template,
        "slideNumber": slide_n,
        "totalSlides": slide_count,
        "variant": slide.get("variant", "CONTENT"),
        "headline": slide.get("headline", ""),
        "subHeadline": slide.get("sub_headline", ""),
        "kicker": slide.get("sub_headline", ""),
        "bodyText": slide.get("body_text", ""),
        "number": slide.get("number", ""),
        "unitSuffix": slide.get("unit_suffix", ""),
        "callToThink": slide.get("call_to_think", ""),
        "overlayLayers": slide.get("overlay_layers") or [],
        "backgroundImage": slide.get("bg_preset_url"),
        "mainObjectImage": context_image_url or slide.get("object_url"),
        "accentColor": slide.get("accent_color", "#E94560"),
        "textMetrics": slide.get("text_metrics", {}),
        # Overrides do Editor (MED-04) — None quando não editado (template usa auto).
        "headlineFontSize": slide.get("headline_font_size"),
        "bodyFontSize": slide.get("body_font_size"),
        "imageZoom": slide.get("image_zoom"),
        "imagePosX": slide.get("image_pos_x"),
        "imagePosY": slide.get("image_pos_y"),
        "theme": "dark",
        # Brand-agnostic signature (MKT-MC4-04). Vazio = back-compat com BrandingLogo V+.
        "signatureHandle": signature_handle,
        "footerText": footer_text,
    }

    # Brand-agnostic palette (MKT-MC4-05) — só mescla quando palette_props vier preenchido.
    if palette_props:
        for k, v in palette_props.items():
            if v:
                props[k] = v

    filename = f"slide_{slide_n:02d}.png"
    filepath = os.path.abspath(os.path.join(output_dir, filename))

    if template_spec:
        # Frente A: template GERADO dirigido por spec — render dedicado (legado).
        props["templateSpec"] = template_spec
        render_service.render_component(
            "design-system-templates-modeledcarouselslide--premium-hook",
            props, filepath,
        )
    else:
        # MED-07: render UNIFICADO — o auto usa os MESMOS presets do Studio
        # (buildPreset → LayeredSlide), via o modo 'preset' do TemplateSwitch.
        accent = slide.get("accent_color") or (preset_palette or {}).get("accent") or "#FFB800"
        preset_props = {
            "templateId": "preset",
            "presetTemplate": slide_template,
            "content": {
                "headline": slide.get("headline", ""),
                "subHeadline": slide.get("sub_headline", ""),
                "bodyText": slide.get("body_text", ""),
                "number": slide.get("number", ""),
                "unitSuffix": slide.get("unit_suffix", ""),
                "callToThink": slide.get("call_to_think", ""),
                "image": context_image_url or slide.get("object_url"),
                "accentColor": accent,
            },
            "palette": preset_palette or {
                "primary": "#0B0B0F", "secondary": "#1A1A24", "accent": accent,
                "accentAlt": "#FF4D2E", "accentAurora": "#FFD86B",
            },
            "meta": {
                "slideNumber": slide_n,
                "totalSlides": slide_count,
                "signature": signature_handle or "",
            },
        }
        render_service.render_component("preset", preset_props, filepath)

    from PIL import Image
    webp_filename = filename.replace(".png", ".webp")
    img = Image.open(filepath)
    img.save(os.path.join(output_dir, webp_filename), "WEBP", quality=85)

    manifest["slides"].append({
        "slide_n": slide_n,
        "path": filename,
        "webp_path": webp_filename,
        "variant": slide.get("variant"),
    })
    print(f"  ✅ Slide {slide_n} OK")


if __name__ == "__main__":
    image_mode = "pexels"
    template_override = None
    template_spec_path = None
    positional = []
    for a in sys.argv[1:]:
        if a.startswith("--image-mode="):
            image_mode = a.split("=", 1)[1].strip()
        elif a.startswith("--template="):
            template_override = a.split("=", 1)[1].strip() or None
        elif a.startswith("--template-spec="):
            template_spec_path = a.split("=", 1)[1].strip() or None
        elif a != "--force":
            positional.append(a)
    force = "--force" in sys.argv
    brief = positional[0] if positional else "squads/virals-marketing-squad/data/MKT-MEDIA-03-carousel-brief.yaml"
    sys.exit(orchestrate_carousel(brief, force=force, image_mode=image_mode,
                                  template_override=template_override,
                                  template_spec_path=template_spec_path))
