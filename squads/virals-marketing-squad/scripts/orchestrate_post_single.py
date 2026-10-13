# -*- coding: utf-8 -*-
"""
orchestrate_post_single.py — Etapa final do pipeline *design-creative para
output_type=single.

Paridade com orchestrate_carousel.py (MKT-MC4-04/05/06/07):
- Aceita --template para escolher entre os 4 templates single registrados em
  templates.yaml do cliente (single-insight, single-quote, single-data,
  single-provocation) — driving via templateId no render switch.
- Brand-agnostic signature + footer + palette injetados a partir do cliente.
- Output unique-per-run: outputs/<client>/posts/<slug>/<template>__<ts>/
- _pipeline-trace.json para auditoria.

Insumos: brief gerado pelo deep_modeler com mode=single (brief-v5-single-*).
"""

import os
import sys
import yaml
import json
import time
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
# Reusa helpers do orquestrador de carousel (mesmas regras de branding/trace)
from orchestrate_carousel import (  # noqa: E402
    _resolve_client_signature,
    _build_pipeline_trace,
    check_render_service,
    RENDER_BASE_URL,
)


def _load_template_spec(spec_path):
    """Carrega a TemplateSpec de um template gerado (Frente A).

    O arquivo é a ENTRY do registry gerado; a spec vive em entry['spec'].
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


def orchestrate_post_single(brief_path, template_override=None,
                            template_spec_path=None):
    # ── PHASE 1: Briefing ────────────────────────────────────────────────────
    print(f"--- PHASE 1: Briefing ---")
    if not check_render_service():
        print(f"ERRO: render service não disponível em {RENDER_BASE_URL}.", file=sys.stderr)
        return 2

    with open(brief_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Frente A: spec do template gerado (dirige o BenchmarkDerivedSlide).
    template_spec = _load_template_spec(template_spec_path)
    if template_spec:
        print(f"  Template spec: {template_spec_path} "
              f"(archetype={template_spec.get('archetype')})")

    # Suporta tanto a forma nova (content_data com 1 slide) quanto legada
    # (post_brief com headline/body_text inline).
    brief = data.get("post_brief", {}) or data.get("carousel_brief", {}) or {}
    slug = brief.get("slug", "post-teste")
    client_slug = data.get("client_slug", "virals")
    archetype = data.get("archetype", "single")

    # Slide content: prefere content_data[0] (deep_modeler v5) sobre campos
    # inline do post_brief (formato legacy).
    content = (data.get("content_data") or [])
    slide = content[0] if content else {}

    print(f"  Cliente:  {client_slug}")
    print(f"  Slug:     {slug}")
    print(f"  Archetype: {archetype}")

    # ── Resolução de template ─────────────────────────────────────────────────
    if template_override:
        template_id = template_override
        print(f"  Template (override): {template_id}")
    else:
        # Heurística baseada no archetype quando nada vem do usuário.
        if archetype == "quote":
            template_id = "quote-slide"
        else:
            template_id = "single-post"
        print(f"  Template (auto, arquétipo={archetype}): {template_id}")

    # ── Brand-agnostic (MKT-MC4-04 + MC4-05) ─────────────────────────────────
    client_signature, client_footer = _resolve_client_signature(client_slug)
    print(f"  Signature: {client_signature or '(BrandingLogo V+)'} · "
          f"Footer: {client_footer or '(vazio)'}")
    brand_tokens = data.get("brand_tokens", {}) or {}
    palette = (brand_tokens.get("palette") or {})
    pass_palette = client_slug != "virals" and bool(palette)
    palette_props = {
        "primaryColor":   palette.get("primary")       if pass_palette else None,
        "secondaryColor": palette.get("secondary")     if pass_palette else None,
        "accentAlt":      palette.get("accent_alt")    if pass_palette else None,
        "accentAurora":   palette.get("accent_aurora") if pass_palette else None,
    }
    # MED-07: paleta completa para o modo 'preset' (buildPreset usa as 5 cores).
    preset_palette = {
        "primary": palette.get("primary", "#0B0B0F"),
        "secondary": palette.get("secondary", "#1A1A24"),
        "accent": palette.get("accent", "#FFB800"),
        "accentAlt": palette.get("accent_alt", "#FF4D2E"),
        "accentAurora": palette.get("accent_aurora", "#FFD86B"),
    }

    # ── PHASE 2: Imagem Base (IA opcional) ───────────────────────────────────
    print(f"\n--- PHASE 2: Imagem Base ---")
    ai_prompt = brief.get("ai_prompt") or slide.get("ai_prompt")
    base_image_path = None

    if ai_prompt:
        print(f"  IA: {ai_prompt[:60]}...")
        try:
            gen_result = generate(ai_prompt, {
                "negative_prompt": brief.get("ai_negative_prompt", ""),
                "width": 1080,
                "height": 1350,
            })
            ai_output_dir = os.path.join("outputs", client_slug, "ai-generated")
            os.makedirs(ai_output_dir, exist_ok=True)
            base_image_path = os.path.abspath(
                os.path.join(ai_output_dir, f"{slug}_base.png")
            )
            gen_result.image.save(base_image_path)
            print(f"  Imagem IA salva em: {base_image_path}")
        except Exception as e:  # noqa: BLE001
            print(f"  ⚠️ IA falhou ({e}) — seguindo sem imagem base.")
            base_image_path = None
    else:
        fonte = brief.get("imagem_fonte") or slide.get("image_url")
        if fonte and os.path.exists(fonte):
            base_image_path = os.path.abspath(fonte)
            print(f"  Imagem fornecida: {base_image_path}")
        else:
            print("  Sem imagem base — render usará apenas o background de marca.")

    # ── PHASE 3: Output dir (unique-per-run, MKT-MC4-07) ─────────────────────
    run_stamp = time.strftime("%Y%m%dT%H%M%S")
    template_label = (template_id or "single-post").replace("/", "_")
    output_dir = os.path.join(
        "outputs", client_slug, "posts", slug,
        f"{template_label}__{run_stamp}",
    )
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n--- PHASE 3: Render ({output_dir}) ---")

    # Symlink _latest aponta para o run atual (Windows fallback: _latest.txt)
    latest_link = os.path.join("outputs", client_slug, "posts", slug, "_latest")
    try:
        if os.path.exists(latest_link) or os.path.islink(latest_link):
            try:
                if os.path.islink(latest_link) or not os.path.isdir(latest_link):
                    os.remove(latest_link)
                else:
                    os.rmdir(latest_link)
            except OSError:
                pass
        os.symlink(os.path.basename(output_dir), latest_link, target_is_directory=True)
    except (OSError, NotImplementedError):
        with open(latest_link + ".txt", "w", encoding="utf-8") as f:
            f.write(os.path.basename(output_dir) + "\n")

    # ── Props enviadas ao render switch ──────────────────────────────────────
    props = {
        "templateId": template_id,
        # Campos derivados do content_data ou post_brief
        "slideNumber": 1,
        "totalSlides": 1,
        "variant": slide.get("variant", brief.get("layout", "CONTENT")),
        "headline": slide.get("headline", brief.get("headline", "")),
        "subHeadline": slide.get("sub_headline", brief.get("sub_headline", "")),
        "bodyText": slide.get("body_text", brief.get("body_text", "")),
        "ctaText": brief.get("cta_text", ""),
        "accentColor": slide.get("accent_color", brief.get("accent_color", "#FFB800")),
        "mainObjectImage": (
            f"file://{base_image_path}" if base_image_path
            else slide.get("image_url")
        ),
        "backgroundImage": (
            f"file://{base_image_path}" if base_image_path else None
        ),
        "headlineFontSize": slide.get("headline_font_size"),
        "bodyFontSize": slide.get("body_font_size"),
        "imageZoom": slide.get("image_zoom"),
        "imagePosX": slide.get("image_pos_x"),
        "imagePosY": slide.get("image_pos_y"),
        "theme": "dark",
        # Brand-agnostic
        "signatureHandle": client_signature,
        "footerText": client_footer,
    }
    # Palette só mescla se vier preenchida (client != virals)
    for k, v in palette_props.items():
        if v:
            props[k] = v

    # Campos extras para DataCardSlide e ProvocationHeroSlide (best-effort)
    # — recast_engine não persiste esses campos hoje, mas se vierem do brief
    # via futura extensão, são passados.
    for extra in ("kicker", "number", "unitSuffix", "callToThink", "quote",
                  "authorName", "authorRole", "caption", "dateLabel", "stepNumber"):
        if slide.get(extra) is not None:
            props[extra] = slide.get(extra)

    # ── Render ──────────────────────────────────────────────────────────────
    render_service = VVSRenderService()
    png_name = "single.png"
    webp_name = "single.webp"
    png_path = os.path.abspath(os.path.join(output_dir, png_name))

    if template_spec:
        # Frente A: template GERADO dirigido por spec — render dedicado (legado).
        props["templateSpec"] = template_spec
        render_service.render_component(
            "design-system-templates-singleposttemplate--text-over-image",
            props, png_path, viewport=(1080, 1350),
        )
    else:
        # MED-07: render UNIFICADO — single usa os MESMOS presets do Studio.
        accent = slide.get("accent_color") or brief.get("accent_color") or preset_palette.get("accent") or "#FFB800"
        preset_props = {
            "templateId": "preset",
            "presetTemplate": template_id,
            "content": {
                "headline": slide.get("headline", brief.get("headline", "")),
                "subHeadline": slide.get("sub_headline", brief.get("sub_headline", "")),
                "bodyText": slide.get("body_text", brief.get("body_text", "")),
                "number": slide.get("number", ""),
                "unitSuffix": slide.get("unit_suffix", ""),
                "callToThink": slide.get("call_to_think", brief.get("cta_text", "")),
                "image": (f"file://{base_image_path}" if base_image_path else slide.get("image_url")),
                "accentColor": accent,
            },
            "palette": preset_palette,
            "meta": {"slideNumber": 1, "totalSlides": 1, "signature": client_signature or ""},
        }
        render_service.render_component("preset", preset_props, png_path, viewport=(1080, 1350))

    # WebP comprimido
    try:
        from PIL import Image
        img = Image.open(png_path)
        img.save(os.path.join(output_dir, webp_name), "WEBP", quality=85)
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️ WebP falhou: {e}")

    # ── PHASE 4: Manifest + Pipeline Trace ───────────────────────────────────
    manifest = {
        "slug": slug,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "engine": "VVS-Playwright",
        "template_id_render": template_id,
        "formato": "1080x1350",
        "files": {"png": png_name, "webp": webp_name},
    }
    with open(os.path.join(output_dir, "single_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # Pipeline trace (MKT-MC4-06)
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
        trace["trace_kind"] = "design-creative-single"  # override
        with open(os.path.join(output_dir, "_pipeline-trace.json"), "w", encoding="utf-8") as f:
            json.dump(trace, f, indent=2, ensure_ascii=False)
        print(f"  Pipeline Trace: {os.path.join(output_dir, '_pipeline-trace.json')}")
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️ Não foi possível gerar pipeline-trace: {e}")

    print(f"\n✅ Single Post gerado: {png_path}")
    print(f"Arquivos em: {output_dir}")
    print(f"⚠️  CHECKPOINT: acionar @mrbeast-mk para Auditoria de Hook Visual.")
    return 0


if __name__ == "__main__":
    brief = "squads/virals-marketing-squad/data/MKT-MEDIA-02-brief.yaml"
    template_override = None
    template_spec_path = None
    rest = []
    for a in sys.argv[1:]:
        if a.startswith("--template="):
            template_override = a.split("=", 1)[1].strip() or None
        elif a.startswith("--template-spec="):
            template_spec_path = a.split("=", 1)[1].strip() or None
        else:
            rest.append(a)
    if rest:
        brief = rest[0]
    rc = orchestrate_post_single(brief, template_override=template_override,
                                 template_spec_path=template_spec_path)
    sys.exit(rc or 0)
