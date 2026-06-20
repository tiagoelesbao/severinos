#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze_video_benchmark.py — MVC-02: Análise Holística de RETENÇÃO (vídeo).

Etapa 2 do pipeline *industrialize-video renascido (EPIC-MKT-Video-Creative).
Espelha o analyze_benchmark.py (estáticos), mas focado em RETENÇÃO de vídeo:
explica POR QUE o criativo de referência segura a audiência.

Lê o video-brief.yaml (MVC-01) — transcript[], beats[], hook_raw, metadata,
frames — e grava brief["benchmark_analysis"] no próprio brief.

Saída (benchmark_analysis):
  - hook_type            : bold claim | curiosity gap | pattern interrupt
  - pattern_interrupts[] : quebras de padrão detectadas (hook, viradas)
  - cut_cadence          : ritmo de cortes (checkpoint de retenção ~1,5–2s)
  - broll_strategy       : como o b-roll/visual sustenta a fala
  - caption_style        : estilo de legenda recomendado
  - pacing_curve         : densidade de fala por janela
  - retention_devices[]  : dispositivos de retenção (loops, callbacks, payoff)
  - recommendation       : como modelar a versão do cliente

NÃO-FATAL: se o LLM estiver indisponível, degrada para uma análise HEURÍSTICA
determinística (sem rede). Aborta apenas se o brief não tiver transcript.

Pipeline: deep_modeler_video -> [analyze_video_benchmark] -> plan_video_creative
"""

import os
import re
import sys
import json
import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML ausente. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# Reusa o motor LLM multi-provedor do recast_engine (decisão MVC: call_llm_json).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recast_engine import call_llm_json  # noqa: E402

HOOK_TYPES = ("bold claim", "curiosity gap", "pattern interrupt")
# Alvo de retenção (pesquisa 2026): checkpoint a cada ~1,5–2s.
RETENTION_CHECKPOINT_S = 2.0


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(text):
    """Extrai o JSON da resposta do LLM, tolerando cercas/ruído."""
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Métricas determinísticas (compartilhadas LLM + heurística)
# ---------------------------------------------------------------------------
def _duration(brief):
    segments = brief.get("transcript") or []
    meta = brief.get("metadata") or {}
    dur = meta.get("duration_seconds")
    if isinstance(dur, (int, float)) and dur > 0:
        return float(dur)
    return float(segments[-1]["end"]) if segments else 0.0


def compute_cut_cadence(brief):
    """Ritmo de cortes a partir dos segmentos: média de s/segmento + flag."""
    segments = brief.get("transcript") or []
    n = len(segments)
    duration = _duration(brief)
    avg = round(duration / n, 2) if n else 0.0
    return {
        "segments": n,
        "duration_s": round(duration, 2),
        "avg_segment_s": avg,
        # Ritmo "viral" quando cada beat dura ~<= 2s (checkpoint de retenção).
        "meets_retention_checkpoint": bool(avg and avg <= RETENTION_CHECKPOINT_S + 0.5),
    }


def compute_pacing_curve(brief, window=5):
    """Densidade de fala (segmentos) por janela de `window` segundos."""
    segments = brief.get("transcript") or []
    buckets = {}
    for s in segments:
        key = int(s.get("start", 0)) // window
        buckets[key] = buckets.get(key, 0) + 1
    return [
        {"window": f"{k * window:02d}-{k * window + window:02d}s", "segments": v}
        for k, v in sorted(buckets.items())
    ]


def classify_hook_heuristic(hook_text):
    """Classifica o hook sem LLM: pergunta → curiosity; número → bold claim."""
    h = (hook_text or "").strip()
    if not h:
        return "pattern interrupt"
    if "?" in h:
        return "curiosity gap"
    if re.search(r"\d", h) or "%" in h:
        return "bold claim"
    return "pattern interrupt"


# ---------------------------------------------------------------------------
# Análise heurística (fallback NÃO-FATAL quando o LLM indisponível)
# ---------------------------------------------------------------------------
def heuristic_analysis(brief):
    hook = brief.get("hook_raw") or ""
    beats = brief.get("beats") or []
    cadence = compute_cut_cadence(brief)
    pacing = compute_pacing_curve(brief)

    pattern_interrupts = []
    if hook:
        pattern_interrupts.append({"t": 0, "device": "abertura", "text": hook[:120]})
    for b in beats:
        if b.get("role") in ("twist", "peak", "cta") and b.get("text"):
            pattern_interrupts.append({
                "t": b.get("start"), "device": b.get("role"), "text": b["text"][:120],
            })

    return {
        "hook_type": classify_hook_heuristic(hook),
        "hook_text": hook,
        "pattern_interrupts": pattern_interrupts,
        "cut_cadence": cadence,
        "broll_strategy": "Sustentar a fala com inserts/visual a cada beat "
                          f"(~{len(beats)} batidas); fala carrega a retenção.",
        "caption_style": "word-by-word (TikTok-style), alto contraste, 4–7 palavras "
                         "por linha na safe zone.",
        "pacing_curve": pacing,
        "retention_devices": [
            "hook nos primeiros 3s",
            "ritmo de cortes" + (
                " dentro do checkpoint (~<=2s)" if cadence["meets_retention_checkpoint"]
                else " a apertar (segmentos longos)"),
            "payoff/cta no fechamento",
        ],
        "recommendation": (
            "Manter o ARCO do benchmark (hook → desenvolvimento → payoff), "
            "remodelar a fala na voz do cliente e cortar para um beat a cada "
            "~1,5–2s. Hook autêntico a partir do tema, não cópia."
        ),
    }


# ---------------------------------------------------------------------------
# Prompt do LLM
# ---------------------------------------------------------------------------
def build_analysis_prompt(brief):
    source = brief.get("source", {}) or {}
    meta = brief.get("metadata", {}) or {}
    hook = brief.get("hook_raw") or ""
    cadence = compute_cut_cadence(brief)

    beat_lines = []
    for b in brief.get("beats", []) or []:
        beat_lines.append(
            f"[{b.get('start')}s–{b.get('end')}s] ({b.get('role')}) {b.get('text', '')[:180]}"
        )
    beats_block = "\n".join(beat_lines) or "(sem batidas)"

    return f"""Você é Analista de Conteúdo Viral da Virals, especialista em RETENÇÃO
de vídeo curto (Reels/TikTok/Shorts). Analise este benchmark de ALTA PERFORMANCE
de forma HOLÍSTICA — o vídeo inteiro — e explique POR QUE ele segura a audiência.

FONTE: {source.get('creator', '?')} · {source.get('platform', '?')} · tipo {source.get('type', '?')}
MÉTRICAS: duração {meta.get('duration_seconds', '?')}s · likes {meta.get('like_count', '?')}
RITMO MEDIDO: {cadence['segments']} segmentos, média {cadence['avg_segment_s']}s/segmento

HOOK (0–3s):
{hook or '(sem hook)'}

BATIDAS (timeline):
{beats_block}

Ancore a análise na pesquisa 2026: drop-off em 0–3s; hook multimodal (pattern
interrupt visual + texto 4–7 palavras + fala keyword-rich); checkpoint de
retenção a cada ~1,5–2s.

Produza a análise estruturada:
- hook_type: um de [bold claim | curiosity gap | pattern interrupt].
- pattern_interrupts: quebras de padrão (com t em segundos e o device).
- cut_cadence: avalie se o ritmo segura retenção (use o RITMO MEDIDO acima).
- broll_strategy: como o visual/b-roll sustenta a fala.
- caption_style: estilo de legenda que combina com este vídeo.
- pacing_curve: como a densidade varia ao longo do vídeo.
- retention_devices: 3–5 dispositivos (loops, callbacks, escalada, payoff).
- recommendation: como modelar a versão do cliente (manter arco, trocar voz).

Responda APENAS JSON válido, sem markdown:
{{"hook_type":"...","pattern_interrupts":[{{"t":0,"device":"...","text":"..."}}],"cut_cadence":{{"avaliacao":"...","meets_retention_checkpoint":true}},"broll_strategy":"...","caption_style":"...","pacing_curve":[{{"window":"00-05s","densidade":"..."}}],"retention_devices":["..."],"recommendation":"..."}}"""


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def analyze(brief):
    """Devolve (analysis, label). Tenta LLM; degrada para heurística (não-fatal)."""
    prompt = build_analysis_prompt(brief)
    try:
        analysis, label = call_llm_json(prompt, _extract_json)
        # Garante que as métricas determinísticas estejam sempre presentes/corretas.
        analysis.setdefault("cut_cadence", {})
        if isinstance(analysis["cut_cadence"], dict):
            analysis["cut_cadence"].update(compute_cut_cadence(brief))
        analysis.setdefault("pacing_curve", compute_pacing_curve(brief))
        return analysis, label
    except (RuntimeError, json.JSONDecodeError, ValueError) as e:
        print(f"  ! LLM indisponível ({e}) — usando análise HEURÍSTICA.")
        return heuristic_analysis(brief), "heuristic"


def analyze_video_benchmark(brief_path):
    brief_path = brief_path.strip()
    print(f"=== MVC-02: Análise de Retenção — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Video-brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    if not brief.get("transcript"):
        raise ValueError(
            "Video-brief sem 'transcript' — rode deep_modeler_video.py (MVC-01) antes.")

    print(f"Segmentos: {len(brief['transcript'])} | Batidas: {len(brief.get('beats') or [])}")
    analysis, label = analyze(brief)

    analysis["analyzed_by"] = label
    analysis["analyzed_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    brief["benchmark_analysis"] = analysis

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(analysis, brief_path)
    return analysis


def _print_report(analysis, brief_path):
    cad = analysis.get("cut_cadence", {}) or {}
    print("-" * 60)
    print(f"Motor        : {analysis.get('analyzed_by', '?')}")
    print(f"Hook type    : {analysis.get('hook_type', '?')}")
    print(f"Ritmo        : {cad.get('avg_segment_s', '?')}s/segmento "
          f"(checkpoint: {'OK' if cad.get('meets_retention_checkpoint') else 'apertar'})")
    devices = analysis.get("retention_devices") or []
    if devices:
        print("Dispositivos de retenção:")
        for d in devices[:5]:
            print(f"  - {d}")
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python squads/virals-marketing-squad/scripts/analyze_video_benchmark.py "
              "<video-brief-*.yaml>")
        sys.exit(1)
    try:
        analyze_video_benchmark(sys.argv[1])
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
