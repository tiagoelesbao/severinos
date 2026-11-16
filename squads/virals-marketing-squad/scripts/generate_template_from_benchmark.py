#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_template_from_benchmark.py — Frente A do pedido "criar modelo a partir
do benchmark".

Em vez de escolher um template fixo do catálogo, este gerador EXTRAI o DNA
visual de um benchmark já processado pelo *creative-benchmark e materializa um
NOVO template — uma `TemplateSpec` consumida pelo componente React genérico
`BenchmarkDerivedSlide` (template_id_render = "benchmark-derived").

Decisões de design:
  - SPEC-DRIVEN, não codegen: não gera .tsx bespoke (frágil); produz uma spec
    YAML que dirige um componente genérico já existente.
  - NÃO-DESTRUTIVO: o template gerado é gravado em
    data/clients/<slug>/generated-templates/<id>.spec.yaml. NÃO reescreve o
    templates.yaml curado — o design_creative.py mescla o diretório em memória.
  - ON-BRAND: as cores/tipografia vêm dos brand tokens do CLIENTE
    (brand-config.yaml), nunca das cores literais do benchmark de origem.
  - GRACEFUL: extração por visão (Gemini 2.5 Flash multimodal, reusa
    GEMINI_API_KEY). Se a chave/visão falhar, cai num extrator heurístico sobre
    o Análise.md — o gerador nunca quebra o fluxo.

Uso:
  python generate_template_from_benchmark.py <benchmark_dir> <carousel|single> \\
    --client=<slug>

Saída (stdout, parseável pelo design_creative.py):
  TEMPLATE_ID=<id>
  SPEC_PATH=<path-relativo>
"""

import os
import re
import sys
import json
import base64
import datetime

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
    import requests
    from dotenv import load_dotenv
except ImportError as e:  # noqa: BLE001
    print(f"ERRO: dependência ausente ({e}). "
          f"Rode: pip install pyyaml requests python-dotenv", file=sys.stderr)
    sys.exit(1)

load_dotenv()

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)
MAX_SHOTS = 4  # nº de slides enviados ao modelo de visão (custo/contexto)


# ---------------------------------------------------------------------------
# I/O dos insumos do benchmark
# ---------------------------------------------------------------------------
def _read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_inputs(benchmark_dir):
    analysis_path = os.path.join(benchmark_dir, "Análise.md")
    json_path = os.path.join(benchmark_dir, "Benchmark.json")
    shots_dir = os.path.join(benchmark_dir, "Screenshots")

    analysis = _read(analysis_path) if os.path.exists(analysis_path) else ""
    bench_json = {}
    if os.path.exists(json_path):
        try:
            bench_json = json.loads(_read(json_path))
        except json.JSONDecodeError:
            bench_json = {}

    shots = []
    if os.path.isdir(shots_dir):
        for fn in sorted(os.listdir(shots_dir)):
            if fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                shots.append(os.path.join(shots_dir, fn))
    return analysis, bench_json, shots


def load_brand_palette(client_slug):
    """Lê a paleta do brand-config do cliente. Fallback razoável se ausente."""
    path = os.path.join(
        ROOT, "squads", "virals-marketing-squad", "data", "clients",
        client_slug, "brand-config.yaml",
    )
    palette = {}
    if os.path.exists(path):
        try:
            cfg = yaml.safe_load(_read(path)) or {}
            palette = (cfg.get("palette") or {})
        except yaml.YAMLError:
            palette = {}
    light = (palette.get("light") or {})
    return {
        "accent": palette.get("accent", "#FFB800"),
        "card_bg": light.get("background", "#F4F4F5"),
        "card_text": light.get("text", palette.get("primary", "#0B0B0F")),
    }


# ---------------------------------------------------------------------------
# Extração do DNA visual — visão (Gemini) com fallback heurístico
# ---------------------------------------------------------------------------
VISION_PROMPT = """Você é um diretor de arte analisando os slides de um carrossel/post
de referência. Sua tarefa é descrever a ESTRUTURA VISUAL do layout (NÃO o conteúdo,
NÃO as cores específicas — apenas a arquitetura do design) para que ela possa ser
replicada com outra identidade de marca.

Responda APENAS um JSON com este schema exato:
{
  "archetype": "dialog-box" | "quote-card" | "generic",
  "card_style": "tweet" | "note" | "imessage" | null,
  "align": "left" | "center",
  "show_avatar": true | false,
  "show_handle_row": true | false,
  "verified": true | false,
  "body_scale": "sm" | "md" | "lg" | "xl",
  "glow": true | false,
  "label": "<rótulo curto humano do estilo, ex: 'Dialog-Box (Tweet Card)'>",
  "description": "<1 frase descrevendo o layout para um operador>"
}

Regras:
- "dialog-box": o conteúdo aparece dentro de um card que simula um tweet, post, nota
  ou balão de mensagem (com possível avatar/nome/handle).
- "quote-card": citação isolada em fonte gigante, sem card de UI.
- "generic": qualquer outro layout headline+corpo.
- body_scale reflete o tamanho relativo do texto principal (xl = bem grande)."""


def _vision_extract(shots, analysis):
    """Extrai a spec via Gemini vision. Retorna dict ou None se indisponível."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or not shots:
        return None

    parts = [{"text": VISION_PROMPT}]
    if analysis:
        parts.append({"text": f"\nContexto textual (auditoria do benchmark):\n{analysis[:2000]}"})
    for shot in shots[:MAX_SHOTS]:
        try:
            with open(shot, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
        except OSError:
            continue
        mime = "image/png" if shot.lower().endswith(".png") else "image/jpeg"
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    url = GEMINI_URL.format(model=GEMINI_MODEL, key=key)
    try:
        resp = requests.post(url, json=body, timeout=90)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (requests.RequestException, KeyError, IndexError, ValueError) as e:
        print(f"  ⚠️  Visão indisponível ({e}) — usando extrator heurístico.", file=sys.stderr)
        return None


_DIALOG_SIGNALS = [
    "tweet", "balão", "balao", "dialog", "diálogo", "dialogo", "card",
    "cartão", "cartao", "notificação", "notificacao", "mensagem", "imessage",
    "nome de usuário", "nome de usuario", "@", "post simulado", "tweet simulado",
]


def _heuristic_extract(analysis, bench_json):
    """Fallback sem visão: infere o arquétipo do texto do Análise.md."""
    text = (analysis or "").lower()
    hits = sum(1 for sig in _DIALOG_SIGNALS if sig in text)
    if hits >= 2:
        return {
            "archetype": "dialog-box",
            "card_style": "tweet",
            "align": "left",
            "show_avatar": True,
            "show_handle_row": True,
            "verified": True,
            "body_scale": "lg",
            "glow": True,
            "label": "Dialog-Box (Tweet Card)",
            "description": "Conteúdo dentro de um card estilo tweet (avatar + nome + handle).",
        }
    if "quote" in text or "citação" in text or "citacao" in text:
        return {
            "archetype": "quote-card", "card_style": None, "align": "center",
            "show_avatar": False, "show_handle_row": False, "verified": False,
            "body_scale": "xl", "glow": True, "label": "Quote Card",
            "description": "Citação isolada em fonte gigante.",
        }
    return {
        "archetype": "generic", "card_style": None, "align": "center",
        "show_avatar": False, "show_handle_row": False, "verified": False,
        "body_scale": "md", "glow": True, "label": "Layout Genérico",
        "description": "Headline + corpo centrados sobre fundo de marca.",
    }


# ---------------------------------------------------------------------------
# Montagem da TemplateSpec + entrada de registry
# ---------------------------------------------------------------------------
def _short_slug(benchmark_dir):
    base = os.path.basename(benchmark_dir.rstrip("/\\"))
    # "02-hormozi-7eb444" → "hormozi-7eb444"
    base = re.sub(r"^\d+-", "", base)
    return re.sub(r"[^a-z0-9-]", "", base.lower()) or "bench"


def build_template_entry(raw, palette, benchmark_dir, output_type):
    archetype = raw.get("archetype", "generic")
    short = _short_slug(benchmark_dir)
    arch_tag = archetype.replace("-", "")
    template_id = f"benchmark-{arch_tag}-{short}"

    spec = {
        "id": template_id,
        "archetype": archetype,
        "source_benchmark": os.path.relpath(benchmark_dir, ROOT).replace("\\", "/"),
        "layout": {
            "cardStyle": raw.get("card_style") or "tweet",
            "cardBg": palette["card_bg"],
            "cardText": palette["card_text"],
            "cardRadius": 36,
            "align": raw.get("align", "left"),
            "showAvatar": bool(raw.get("show_avatar", True)),
            "showHandleRow": bool(raw.get("show_handle_row", True)),
            "verified": bool(raw.get("verified", True)),
        },
        "typography": {"bodyScale": raw.get("body_scale", "lg")},
        "decor": {"glow": bool(raw.get("glow", True)), "grain": False},
    }

    label = raw.get("label") or f"Benchmark · {archetype}"
    description = raw.get("description") or "Template gerado a partir de benchmark."

    entry = {
        "id": template_id,
        "label": f"✨ {label} (gerado)",
        "description": description,
        "react_component": "BenchmarkDerivedSlide",
        "template_id_render": "benchmark-derived",
        "best_for_bench_types": ["carousel", "single", "video"],
        "preview_status": "ready",
        "generated": True,
        "source_benchmark": spec["source_benchmark"],
        "output_type": output_type,
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "spec": spec,
    }
    return template_id, entry


def write_generated_template(client_slug, template_id, entry):
    out_dir = os.path.join(
        ROOT, "squads", "virals-marketing-squad", "data", "clients",
        client_slug, "generated-templates",
    )
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{template_id}.spec.yaml")
    header = (
        "# Template GERADO automaticamente por generate_template_from_benchmark.py\n"
        "# (Frente A — 'criar modelo a partir do benchmark').\n"
        "# Mesclado em memória pelo design_creative.py; consumido pelo componente\n"
        "# React BenchmarkDerivedSlide (template_id_render: benchmark-derived).\n"
        "# Edição manual é permitida (este NÃO é o templates.yaml curado).\n\n"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header)
        yaml.dump(entry, f, allow_unicode=True, sort_keys=False)
    return out_path


def generate(benchmark_dir, output_type, client_slug):
    benchmark_dir = os.path.abspath(benchmark_dir.rstrip("/\\"))
    if not os.path.isdir(benchmark_dir):
        print(f"ERRO: benchmark_dir inexistente: {benchmark_dir}", file=sys.stderr)
        return 1

    print(f"*generate-template-from-benchmark — {os.path.basename(benchmark_dir)}")
    print(f"  client:      {client_slug}")
    print(f"  output_type: {output_type}")

    analysis, bench_json, shots = load_inputs(benchmark_dir)
    palette = load_brand_palette(client_slug)
    print(f"  brand tokens: accent={palette['accent']} card_bg={palette['card_bg']}")
    print(f"  screenshots: {len(shots)} encontrados")

    raw = _vision_extract(shots, analysis)
    source = "visão (Gemini)"
    if raw is None:
        raw = _heuristic_extract(analysis, bench_json)
        source = "heurística (Análise.md)"
    print(f"  extração:    {source} → archetype='{raw.get('archetype')}'")

    template_id, entry = build_template_entry(raw, palette, benchmark_dir, output_type)
    out_path = write_generated_template(client_slug, template_id, entry)
    rel_path = os.path.relpath(out_path, ROOT).replace("\\", "/")

    print(f"  ✅ Template gerado: {entry['label']}")
    print(f"  spec: {rel_path}")
    # Linhas parseáveis pelo design_creative.py:
    print(f"TEMPLATE_ID={template_id}")
    print(f"SPEC_PATH={rel_path}")
    return 0


if __name__ == "__main__":
    client = None
    rest = []
    for a in sys.argv[1:]:
        if a.startswith("--client="):
            client = a.split("=", 1)[1].strip() or None
        else:
            rest.append(a)

    if len(rest) < 2 or rest[1] not in ("single", "carousel"):
        print(
            "Uso: python generate_template_from_benchmark.py "
            "<benchmark_dir> <single|carousel> --client=<slug>",
            file=sys.stderr,
        )
        sys.exit(1)

    if not client:
        print("ERRO: --client=<slug> é obrigatório.", file=sys.stderr)
        sys.exit(1)

    sys.exit(generate(rest[0], rest[1], client))
