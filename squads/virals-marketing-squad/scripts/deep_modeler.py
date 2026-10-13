#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deep_modeler.py — Motor de Modelagem de Criativos (v5)

Etapa 1 do pipeline *design-creative.

Lê os 3 insumos de um diretório de benchmark:
  - Transcrição.md  → texto real de cada slide + caption
  - Análise.md      → auditorias dos especialistas + síntese estratégica
  - Screenshots/    → imagens reais dos slides (mapeadas e validadas)
  - Benchmark.json  → metadados (caption canônica, URL, tipo)

Produz um brief de criativo:
  - FIEL ao benchmark (extração real, sem placeholder mascarado)
  - VALIDADO (campo ausente vira flag explícita, nunca silêncio)
  - PERSONALIZÁVEL (tokens de marca do brand-config do cliente resolvido via
    --client em data/clients/<slug>/brand-config.yaml + diretiva de recast obrigatória por slide)
  - RASTREÁVEL (cada campo aponta a origem)

Substitui a v4 (regex frágil, 1 insumo, fallback silencioso).
A função `analyze_slide()` é o seam para uma futura camada de análise via LLM.
"""

import os
import re
import sys
import json
import datetime

# --- UTF-8 enforcement: corrige UnicodeEncodeError no Windows (cp1252) ---
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML não instalado. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# Resolução dinâmica de cliente (MKT-MC-02). Substitui o hardcode antigo.
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
from _client_resolver import (  # noqa: E402
    resolve_client,
    extract_client_arg,
    persist_client_in_brief,
)
from transcript_adapter import adapt as adapt_transcript  # noqa: E402  (MCI-05)

# Mantido apenas como fallback legado quando o resolver não é injetado.
LEGACY_BRAND_CONFIG_PATH = "squads/virals-marketing-squad/data/clients/virals/brand-config.yaml"

# Dicionários de rótulos — agnósticos de idioma e de variação de escrita.
# Ordem = prioridade de seleção.
HEADLINE_LABELS = [
    "headline", "título principal", "titulo principal", "manchete",
    "título", "titulo", "texto principal", "title", "chamada",
]
BODY_LABELS = [
    "corpo do texto", "body text", "body", "descrição", "descricao",
    "texto secundário", "texto secundario", "subtítulo", "subtitulo",
    "legenda", "supporting text",
]
CTA_SIGNALS = [
    "salve", "salvar", "siga", "compartilhe", "comente", "comenta",
    "acesse", "link na bio", "clique", "compre", "garanta",
    "qual desses", "deixe seu", "marque alguém", "marque alguem",
]
ACCENT_DEFAULT = "#E94560"


# ---------------------------------------------------------------------------
# Utilitários de I/O
# ---------------------------------------------------------------------------
def _read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _strip(text):
    """Limpa um valor extraído: remove markdown, aspas e bullets nas bordas."""
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r'^[\s"“”\'`*\-•]+', "", text)
    text = re.sub(r'[\s"“”\'`*]+$', "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Carregamento e validação dos insumos
# ---------------------------------------------------------------------------
def load_inputs(benchmark_dir):
    """Carrega os 3 insumos. Falha explícita se a Transcrição não existir."""
    transcript_path = os.path.join(benchmark_dir, "Transcrição.md")
    analysis_path = os.path.join(benchmark_dir, "Análise.md")
    json_path = os.path.join(benchmark_dir, "Benchmark.json")
    shots_dir = os.path.join(benchmark_dir, "Screenshots")

    if not os.path.exists(transcript_path):
        raise FileNotFoundError(f"Transcrição.md não encontrada em {benchmark_dir}")

    inputs = {
        "transcript": _read(transcript_path),
        "analysis": _read(analysis_path) if os.path.exists(analysis_path) else None,
        "benchmark_json": None,
        "screenshots": [],
    }

    if os.path.exists(json_path):
        try:
            inputs["benchmark_json"] = json.loads(_read(json_path))
        except json.JSONDecodeError:
            inputs["benchmark_json"] = None

    if os.path.isdir(shots_dir):
        inputs["screenshots"] = sorted(
            f for f in os.listdir(shots_dir)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        )

    return inputs


def load_brand_config(path=None):
    """Lê os tokens de marca do cliente resolvido. Path resolvido pelo client_resolver."""
    resolved = path or LEGACY_BRAND_CONFIG_PATH
    if not os.path.exists(resolved):
        raise FileNotFoundError(
            f"Brand config ausente: {resolved} — personalização impossível."
        )
    with open(resolved, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# ---------------------------------------------------------------------------
# Parsing da Transcrição
# ---------------------------------------------------------------------------
def parse_caption(transcript):
    """Extrai a caption original (bloco antes do primeiro slide)."""
    m = re.search(
        r"##\s*[^\n]*Caption[^\n]*\n(.*?)(?=\n##\s|\Z)",
        transcript, re.DOTALL | re.IGNORECASE,
    )
    if not m:
        return ""
    body = m.group(1)
    body = re.sub(r"^\s*-{3,}\s*$", "", body, flags=re.MULTILINE)
    return body.strip()


def split_slide_blocks(transcript):
    """Divide a transcrição em blocos por slide, preservando a ordem."""
    parts = re.split(r"##[^\n]*Slide\s+0*\d+", transcript)
    # O primeiro pedaço é cabeçalho/caption — descartado.
    return [b for b in parts[1:] if b.strip()]


def extract_section(block, section_num):
    """Retorna o texto da seção numerada N (entre '**N. ...' e '**N+1. ...')."""
    pattern = (
        r"(?:\*\*|\#{1,4}\s*)" + str(section_num) + r"\.\s*[^\n]*\n"
        r"(.*?)"
        r"(?=(?:\*\*|\#{1,4}\s*)" + str(section_num + 1) + r"\.\s|\Z)"
    )
    m = re.search(pattern, block, re.DOTALL)
    return m.group(1) if m else ""


def parse_labeled_items(text):
    """Extrai itens '**Rótulo:** valor' como lista [(rótulo, valor)].

    Tolera duas variações de formato da transcrição:
      A) inline      → '**Rótulo:** valor'
      B) sub-bullet  → '**Rótulo:**' e o valor numa linha-filha indentada
    """
    items = []
    lines = text.split("\n")
    for idx, line in enumerate(lines):
        m = re.search(r"\*\*([^*\n:]+):\*\*[ \t]*(.*)", line)
        if not m:
            continue
        label = m.group(1).strip().lower()
        value = _strip(m.group(2))
        if not value:
            # Formato B: valor na(s) linha(s)-filha(s).
            #  B1 — sub-bullets aninhados;  B2 — uma linha-parágrafo única.
            collected = []
            as_bullets = None
            for nxt in lines[idx + 1:]:
                if not nxt.strip():
                    if collected:
                        break
                    continue
                # Tira só o marcador de lista, PRESERVANDO o '**'.
                unbulleted = re.sub(r"^\s*[*\-•]\s+", "", nxt)
                # Outro rótulo em negrito → este rótulo ficou sem valor.
                if re.match(r"\*\*[^*\n:]+:\*\*", unbulleted):
                    break
                is_bullet = bool(re.match(r"^\s*[*\-•]\s", nxt))
                if as_bullets is None:
                    as_bullets = is_bullet
                if as_bullets and not is_bullet:
                    break  # fim da lista de sub-bullets
                cleaned = _strip(unbulleted)
                if cleaned:
                    collected.append(cleaned)
                if not as_bullets:
                    break  # B2: valor é a única linha-parágrafo
            value = " ".join(collected)
        if value:
            items.append((label, value))
    return items


def _match_label(label, candidates):
    """True se o rótulo corresponde a algum candidato (substring tolerante)."""
    for c in candidates:
        if c in label:
            return True
    return False


def pick_by_labels(items, label_set):
    """Escolhe o valor cujo rótulo casa com label_set, na ordem de prioridade.

    Retorna (valor, rótulo_de_origem) ou (None, None).
    """
    for wanted in label_set:
        for label, value in items:
            if wanted in label:
                return value, label
    return None, None


def parse_design_triggers(block):
    """Lê a seção 3 ('Identificação de gatilhos de design') → nomes dos gatilhos."""
    section = extract_section(block, 3)
    triggers = [label for label, _ in parse_labeled_items(section)]
    # Remove genéricos longos demais para serem nome de gatilho.
    return [t.title() for t in triggers if len(t) <= 40]


# ---------------------------------------------------------------------------
# Parsing da Análise (contexto estratégico)
# ---------------------------------------------------------------------------
def parse_strategic_context(analysis):
    """Extrai score do Chief e a síntese estratégica da Análise.md."""
    if not analysis:
        return {"chief_score": None, "pattern": None, "audits_present": False}

    score = None
    m = re.search(r"[Ss]core\s+consolidado[:\s*]*\**\s*(\d+)\s*/\s*10", analysis)
    if m:
        score = int(m.group(1))

    pattern = None
    m = re.search(
        r"###\s*S[íi]ntese\s+Final[^\n]*\n(.*?)(?=\n###|\n##|\Z)",
        analysis, re.DOTALL | re.IGNORECASE,
    )
    if m:
        synthesis = re.sub(r"\s+", " ", m.group(1)).strip()
        if synthesis and not synthesis.lower().startswith("_pendente"):
            pattern = synthesis[:400]

    return {
        "chief_score": score,
        "pattern": pattern,
        "audits_present": "@mrbeast-mk" in analysis,
    }


# ---------------------------------------------------------------------------
# Métricas de texto — alimentam o layout harmônico do template
# ---------------------------------------------------------------------------
def text_metrics(headline, body):
    h, b = len(headline or ""), len(body or "")

    if h < 20:
        h_tier = "xl"
    elif h < 35:
        h_tier = "lg"
    elif h < 55:
        h_tier = "md"
    else:
        h_tier = "sm"

    if b < 80:
        b_tier = "lg"
    elif b < 160:
        b_tier = "md"
    else:
        b_tier = "sm"

    if h + b < 90:
        density = "light"
    elif h + b < 200:
        density = "medium"
    else:
        density = "heavy"

    return {
        "headline_chars": h,
        "body_chars": b,
        "headline_tier": h_tier,
        "body_tier": b_tier,
        "density": density,
        "headline_overflow_risk": h > 75,
        "body_overflow_risk": b > 240,
    }


# ---------------------------------------------------------------------------
# Geração de prompt de imagem contextual (substitui o if-chain hardcoded)
# ---------------------------------------------------------------------------
def build_ai_prompt(headline, triggers, palette):
    base = (headline or "marketing concept").strip()
    trigger_hint = ", ".join(triggers[:2]).lower() if triggers else "editorial"
    return (
        f"Editorial marketing key visual representing the concept '{base}'. "
        f"Mood: {trigger_hint}. Modern flat editorial design, premium social "
        f"media aesthetic, brand palette deep navy {palette.get('primary', '#1A1A2E')} "
        f"and coral {palette.get('accent', ACCENT_DEFAULT)}, soft cinematic "
        f"lighting, high-end, NO TEXT, NO WORDS, 1:1 composition."
    )


# ---------------------------------------------------------------------------
# Análise de slide — SEAM para futura camada LLM
# ---------------------------------------------------------------------------
def classify_variant(slide_n, total, headline, body):
    text = f"{headline or ''} {body or ''}".lower()
    if any(sig in text for sig in CTA_SIGNALS):
        return "CTA"
    if slide_n == 1:
        return "HOOK"
    if not body or len(body) < 15:
        return "IMAGE_FOCUS"
    return "CONTENT"


def recast_directive(variant, triggers):
    trig = ", ".join(triggers[:3]) if triggers else "os gatilhos do benchmark"
    base = {
        "HOOK": "Manter o tema/notícia do slide; otimizar o gancho e adaptar "
                "à voz Virals.",
        "CONTENT": "Manter a notícia e os fatos do slide; apertar o texto e "
                   "adaptar à voz Virals.",
        "IMAGE_FOCUS": "Manter o tema do slide; otimizar a headline na voz Virals.",
        "CTA": "Manter a função de CTA do slide; adaptar à voz Virals.",
    }
    return f"{base.get(variant, base['CONTENT'])} Preservar os gatilhos: {trig}."


def analyze_slide(slide_n, total, block, screenshots, palette):
    """Modela um slide a partir do bloco de transcrição. Sem fallback mascarado."""
    issues = []
    section1 = extract_section(block, 1)
    items = parse_labeled_items(section1)

    headline, h_label = pick_by_labels(items, HEADLINE_LABELS)
    body, b_label = pick_by_labels(items, BODY_LABELS)
    triggers = parse_design_triggers(block)

    # headline_source: 'label' (rótulo explícito) | 'heuristic' | 'none'.
    if headline:
        headline_source = "label"
    else:
        # Heurística NÃO-silenciosa: 1º texto substantivo que não seja body.
        headline_source = "none"
        for lbl, val in items:
            if len(val) >= 4 and not _match_label(lbl, BODY_LABELS):
                headline, h_label, headline_source = val, f"heurística:{lbl}", "heuristic"
                break
        if headline_source == "heuristic":
            issues.append(f"slide {slide_n}: headline via heurística ({h_label}) — revisar")
        else:
            issues.append(f"slide {slide_n}: nenhum texto de headline encontrado")
    headline = headline or ""
    body = body or ""

    # Screenshot real correspondente.
    shot = None
    m = re.search(r"Arquivo:\**\s*`?([^`\n]+)`?", block)
    if m:
        shot = _strip(m.group(1))
    elif slide_n <= len(screenshots):
        shot = f"Screenshots/{screenshots[slide_n - 1]}"

    variant = classify_variant(slide_n, total, headline, body)
    metrics = text_metrics(headline, body)

    # Kicker (sub_headline): rótulo curado em PT por variante — NÃO usar o nome
    # cru do gatilho de análise (termo interno, às vezes em inglês).
    sub_headline = {
        "HOOK": "ABERTURA",
        "CONTENT": "INSIGHT",
        "IMAGE_FOCUS": "DESTAQUE",
        "CTA": "PRÓXIMO PASSO",
    }.get(variant, "INSIGHT")

    slide = {
        "slide_n": slide_n,
        "variant": variant,
        "screenshot_ref": shot,
        "source": {
            "headline_label": h_label,
            "headline_source": headline_source,
            "body_label": b_label,
            "extraction_ok": headline_source == "label",
        },
        # Conteúdo REAL do benchmark — preservado, nunca descartado.
        "reference_headline": headline,
        "reference_body": body,
        # Campos que a Etapa 2 consome (iguais à referência até o recast).
        "headline": (headline or "[RECAST PENDENTE]").upper(),
        "sub_headline": sub_headline,
        "body_text": body,
        "design_triggers": triggers,
        "text_metrics": metrics,
        "ai_prompt": build_ai_prompt(headline, triggers, palette),
        "accent_color": palette.get("accent", ACCENT_DEFAULT),
        "personalization": {
            "status": "PENDING_RECAST",
            "directive": recast_directive(variant, triggers),
        },
    }
    return slide, issues


# ---------------------------------------------------------------------------
# Validação do brief — relatório explícito, zero mascaramento
# ---------------------------------------------------------------------------
def validate_brief(brief, extraction_issues):
    issues = list(extraction_issues)
    slides = brief.get("content_data", [])

    none_count = heuristic_count = 0
    for s in slides:
        src = s["source"].get("headline_source")
        if src == "none":
            none_count += 1
        elif src == "heuristic":
            heuristic_count += 1
        if s["variant"] == "CONTENT" and not s["reference_body"]:
            issues.append(f"slide {s['slide_n']}: variant CONTENT sem body")

    pending = sum(
        1 for s in slides if s["personalization"]["status"] == "PENDING_RECAST"
    )
    headlines_ok = sum(
        1 for s in slides
        if s["source"].get("headline_source") in ("label", "heuristic")
    )
    bodies_ok = sum(1 for s in slides if s["reference_body"])

    # FAIL só quando há headline genuinamente vazia (nenhum texto).
    if none_count:
        status = "FAIL"
    elif issues:
        status = "WARN"
    else:
        status = "PASS"

    return {
        "status": status,
        "issues": issues,
        "headlines_extracted": f"{headlines_ok}/{len(slides)}",
        "bodies_extracted": f"{bodies_ok}/{len(slides)}",
        "headlines_via_heuristic": heuristic_count,
        "personalization_pending": pending,
    }


# ---------------------------------------------------------------------------
# Orquestração da modelagem
# ---------------------------------------------------------------------------
def deep_model_benchmark(benchmark_dir, mode="carousel", client_slug=None, bench_type=None):
    benchmark_dir = benchmark_dir.rstrip("/\\")
    slug = os.path.basename(benchmark_dir)
    client = resolve_client(client_slug)
    print(f"=== Deep Modeler v5 — {mode} ===")
    print(f"Benchmark: {slug}")
    print(f"Cliente  : {client.nome_exibicao} ({client.slug})")

    inputs = load_inputs(benchmark_dir)
    brand = load_brand_config(client.brand_config)
    palette = brand.get("palette", {})

    print(f"Insumos → transcrição: ok | análise: {'ok' if inputs['analysis'] else 'AUSENTE'} "
          f"| screenshots: {len(inputs['screenshots'])} | "
          f"json: {'ok' if inputs['benchmark_json'] else 'ausente'}")

    # MCI-05: vídeos (Reels/Shorts/TikTok) vêm em formato `## Minuto NN:NN`,
    # que o split_slide_blocks() não parseia. O adapter detecta vídeo e
    # reformata para `## Slide NN` (modos: key_moments | llm | heuristic).
    adapted_transcript, adapter_info = adapt_transcript(
        inputs["transcript"],
        benchmark_json=inputs["benchmark_json"],
        bench_type=bench_type,
        llm_enabled=True,
    )
    inputs["transcript"] = adapted_transcript
    inputs["_adapter_info"] = adapter_info

    caption = parse_caption(inputs["transcript"])
    blocks = split_slide_blocks(inputs["transcript"])
    strategic = parse_strategic_context(inputs["analysis"])

    bj = inputs["benchmark_json"] or {}
    source_url = bj.get("url")

    all_issues = []

    if mode == "single":
        if not blocks:
            raise ValueError("Nenhum slide encontrado na transcrição.")
        slide, issues = analyze_slide(1, 1, blocks[0], inputs["screenshots"], palette)
        all_issues += issues
        brief = {
            "schema_version": "5.0",
            "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
            "archetype": "single",
            "post_brief": {
                "slug": f"v5-single-{slug}",
                "source_benchmark": benchmark_dir,
                "source_url": source_url,
                "layout": "text-over-image",
                "brand_config": client.brand_config,
            },
            "brand_tokens": _brand_tokens(brand),
            "inputs_used": _inputs_used(inputs),
            "strategic_context": strategic,
            "content_data": [slide],
        }
        output_prefix = "brief-v5-single"
    else:
        total = len(blocks)
        if total == 0:
            raise ValueError("Nenhum slide encontrado na transcrição.")
        content = []
        for i, block in enumerate(blocks):
            slide, issues = analyze_slide(i + 1, total, block,
                                          inputs["screenshots"], palette)
            content.append(slide)
            all_issues += issues
        brief = {
            "schema_version": "5.0",
            "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
            # Default heurístico; o recast_engine refina via LLM.
            "archetype": "single" if total == 1 else "news",
            "carousel_brief": {
                "slug": f"v5-precision-{slug}",
                "source_benchmark": benchmark_dir,
                "source_url": source_url,
                "tema": f"Modelagem de precisão: {slug}",
                "slide_count": total,
                "narrative_type": "modelado-de-benchmark",
                "brand_config": client.brand_config,
            },
            "brand_tokens": _brand_tokens(brand),
            "inputs_used": _inputs_used(inputs),
            "strategic_context": strategic,
            "benchmark_caption": caption,
            "content_data": content,
        }
        output_prefix = "brief-v5"

    persist_client_in_brief(brief, client)
    brief["_validation"] = validate_brief(brief, all_issues)

    output_path = f"squads/virals-marketing-squad/data/{output_prefix}-{slug}.yaml"
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(brief, output_path)
    # Exit code reflete o resultado real: FAIL → 2.
    return output_path, brief["_validation"]["status"]


def _brand_tokens(brand):
    return {
        "palette": brand.get("palette", {}),
        "accent": brand.get("palette", {}).get("accent", ACCENT_DEFAULT),
        "typography": brand.get("typography", {}),
        "layout": brand.get("layout", {}),
    }


def _inputs_used(inputs):
    info = {
        "transcript": True,
        "analysis": inputs["analysis"] is not None,
        "screenshots": len(inputs["screenshots"]),
        "benchmark_json": inputs["benchmark_json"] is not None,
    }
    # MCI-05: reporta se o adapter de vídeo foi usado e em qual modo.
    adapter_info = inputs.get("_adapter_info") or {}
    if adapter_info.get("adapter_used"):
        info["video_adapter_used"] = True
        info["video_adapter_mode"] = adapter_info.get("mode")
        info["video_adapter_slides"] = adapter_info.get("slides", 0)
    return info


def _print_report(brief, output_path):
    v = brief["_validation"]
    print("-" * 60)
    print(f"Status de validação : {v['status']}")
    print(f"Headlines extraídas : {v['headlines_extracted']}"
          f" (heurística: {v['headlines_via_heuristic']})")
    print(f"Bodies extraídos    : {v['bodies_extracted']}")
    print(f"Recast pendente     : {v['personalization_pending']} slide(s)")
    if v["issues"]:
        print("Pendências:")
        for i in v["issues"]:
            print(f"  - {i}")
    print(f"Brief salvo em      : {output_path}")
    print("-" * 60)


if __name__ == "__main__":
    client_slug, _argv_rest = extract_client_arg(sys.argv[1:])
    # MCI-05: aceita --bench-type=video|single|carousel (informa o adapter).
    bench_type = None
    _filtered = []
    for a in _argv_rest:
        if a.startswith("--bench-type="):
            bench_type = a.split("=", 1)[1].strip() or None
        else:
            _filtered.append(a)
    _argv_rest = _filtered

    if len(_argv_rest) < 1:
        print(
            "Uso: python squads/virals-marketing-squad/scripts/deep_modeler.py "
            "<path> [single|carousel] [--client=<slug>] [--bench-type=video|single|carousel]"
        )
        sys.exit(1)
    mode = _argv_rest[1] if len(_argv_rest) > 1 else "carousel"
    try:
        _, status = deep_model_benchmark(_argv_rest[0], mode=mode,
                                          client_slug=client_slug,
                                          bench_type=bench_type)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    sys.exit(2 if status == "FAIL" else 0)
