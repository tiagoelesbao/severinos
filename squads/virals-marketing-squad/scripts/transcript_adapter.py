#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
transcript_adapter.py — MCI-05: Adapter `bench_type=video` → slides.

Quando o benchmark é vídeo (ig-reel, tiktok, short), a Transcrição.md vem em
formato minuto-por-minuto (`## ⏱️ Minuto NN:NN`), incompatível com o
`deep_modeler.py` (que exige `## Slide NN`).

Este adapter detecta vídeo e reformata a transcrição em N pseudo-slides,
em três modos (em ordem de preferência):

  1. key_moments  — usa Benchmark.json.key_moments (determinístico, sem LLM, gratis).
  2. llm          — chama call_llm() do recast_engine para segmentar (1 chamada).
  3. heuristic    — split por minuto/chunks (último recurso, sem LLM).

A saída é uma string Transcrição.md reformatada que o `split_slide_blocks()`
do deep_modeler consegue parsear sem mudanças.
"""

import os
import re
import sys
import json

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

VIDEO_PLATFORM_TYPES = {
    "video-short", "video", "reel", "ig-reel", "short", "tiktok-video", "yt-short",
}

MIN_SLIDES = 3
MAX_SLIDES = 10


# ---------------------------------------------------------------------------
# Detecção
# ---------------------------------------------------------------------------
def detect_video(bench_type=None, benchmark_json=None, transcript=None):
    """Decide se a transcrição é de vídeo. Prioridade: CLI flag > JSON > heurística."""
    if bench_type:
        return bench_type.strip().lower() == "video"

    if benchmark_json:
        for field in ("type", "subtype", "platform_type", "media_type"):
            val = (benchmark_json.get(field) or "").strip().lower()
            if val in VIDEO_PLATFORM_TYPES:
                return True

    if transcript:
        has_minute = re.search(r"##\s*[^\n]*Minuto\s+\d{1,2}:\d{2}", transcript)
        has_slide = re.search(r"##[^\n]*Slide\s+0*\d+", transcript)
        if has_minute and not has_slide:
            return True

    return False


# ---------------------------------------------------------------------------
# Modo 1 — key_moments (primário)
# ---------------------------------------------------------------------------
def _parse_sentences(transcript):
    """Lista [(start_sec, text)] extraída do markdown minuto-por-minuto."""
    out = []
    for m in re.finditer(r"\*\*\[(\d{1,2}):(\d{2})\]\*\*\s+([^\n]+)", transcript):
        mm, ss, text = m.group(1), m.group(2), m.group(3)
        sec = int(mm) * 60 + int(ss)
        out.append((sec, text.strip().rstrip(".")))
    return out


def _segment_via_key_moments(transcript, benchmark_json):
    """N slides = N key_moments. Body = sentenças entre time[i] e time[i+1]."""
    moments = (benchmark_json or {}).get("key_moments") or []
    if len(moments) < MIN_SLIDES:
        return None

    moments = sorted(moments, key=lambda m: m.get("time", 0))[:MAX_SLIDES]
    sentences = _parse_sentences(transcript)
    if not sentences:
        return None

    blocks = []
    duration = (benchmark_json or {}).get("duration_seconds") or 999
    for i, mom in enumerate(moments):
        start = mom.get("time", 0)
        end = moments[i + 1]["time"] if i + 1 < len(moments) else duration + 1

        headline = (mom.get("label") or "").strip().rstrip(".")
        body_sentences = [t for sec, t in sentences if start <= sec < end and t]
        body = " ".join(body_sentences).strip() or headline

        blocks.append({
            "slide_n": i + 1,
            "headline": headline or body.split(".")[0][:60],
            "body": body,
            "triggers": [],  # key_moments mode não emite gatilhos analíticos.
            "role": "hook" if i == 0 else ("cta" if i == len(moments) - 1 else "build"),
            "timestamp": f"{start//60:02d}:{start%60:02d}",
        })

    return blocks


# ---------------------------------------------------------------------------
# Modo 2 — LLM (secundário)
# ---------------------------------------------------------------------------
LLM_PROMPT_TEMPLATE = """Você é Estrategista de Conteúdo Viral. Receba a transcrição
COMPLETA de um vídeo de alta performance e segmente-o em N momentos-chave
(N entre 3 e 8) — cada momento será um slide de um carrossel derivado.

PLATAFORMA: {platform}
DURAÇÃO: {duration} segundos
CAPTION: {caption}

TRANSCRIÇÃO COMPLETA (minuto-por-minuto):
{transcript_clean}

Identifique os momentos que CARREGAM a viralidade (hooks, viradas, pontos
emocionais, payoff). NÃO segmente por tempo igual — segmente por NARRATIVA.

Responda APENAS JSON válido, sem markdown:
{{"momentos": [
  {{"start_timestamp":"00:00","headline":"...","body":"...","triggers":["..."],"role":"hook|build|peak|twist|cta"}},
  ...
]}}"""


def _extract_json(text):
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    return json.loads(cleaned)


def _segment_via_llm(transcript, benchmark_json):
    """Chama call_llm() para segmentar a transcrição em N momentos-chave."""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from recast_engine import call_llm  # noqa: E402
    except Exception as e:
        print(f"  [adapter] LLM indisponível (import falhou: {e})")
        return None

    bj = benchmark_json or {}
    transcript_clean = re.sub(r"\*\*|\[|\]", "", transcript)[:6000]
    prompt = LLM_PROMPT_TEMPLATE.format(
        platform=bj.get("platform", "?"),
        duration=bj.get("duration_seconds", "?"),
        caption=(bj.get("description") or bj.get("title") or "(sem caption)")[:200],
        transcript_clean=transcript_clean,
    )

    try:
        raw, model = call_llm(prompt)
        print(f"  [adapter] LLM ({model}) segmentou a transcrição.")
        data = _extract_json(raw)
        momentos = data.get("momentos") or []
    except Exception as e:
        print(f"  [adapter] LLM falhou: {e}")
        return None

    if len(momentos) < MIN_SLIDES:
        print(f"  [adapter] LLM retornou {len(momentos)} momentos (<{MIN_SLIDES}) — descartando.")
        return None

    blocks = []
    for i, mom in enumerate(momentos[:MAX_SLIDES]):
        blocks.append({
            "slide_n": i + 1,
            "headline": (mom.get("headline") or "").strip()[:80],
            "body": (mom.get("body") or "").strip(),
            "triggers": mom.get("triggers") or [],
            "role": mom.get("role") or ("hook" if i == 0 else "build"),
            "timestamp": mom.get("start_timestamp", "00:00"),
        })
    return blocks


# ---------------------------------------------------------------------------
# Modo 3 — heurística (último recurso)
# ---------------------------------------------------------------------------
def _segment_via_heuristic(transcript, benchmark_json):
    """Split por minuto; vídeos <60s viram chunks de ~12s."""
    sentences = _parse_sentences(transcript)
    if not sentences:
        return None

    duration = int((benchmark_json or {}).get("duration_seconds") or 0)
    if duration and duration < 60:
        chunk = max(10, duration // MIN_SLIDES)
        buckets = {}
        for sec, text in sentences:
            key = sec // chunk
            buckets.setdefault(key, []).append((sec, text))
    else:
        buckets = {}
        for sec, text in sentences:
            buckets.setdefault(sec // 60, []).append((sec, text))

    keys = sorted(buckets.keys())[:MAX_SLIDES]
    if len(keys) < 2:
        # Vídeo muito curto, agrupa tudo num "single-shot".
        all_sentences = [t for _, t in sentences]
        if not all_sentences:
            return None
        return [{
            "slide_n": 1,
            "headline": all_sentences[0][:80],
            "body": " ".join(all_sentences),
            "triggers": [],
            "role": "single",
            "timestamp": "00:00",
        }]

    blocks = []
    for i, k in enumerate(keys):
        items = buckets[k]
        first_sec, first_text = items[0]
        body = " ".join(t for _, t in items).strip()
        blocks.append({
            "slide_n": i + 1,
            "headline": first_text[:80].rstrip(".") or f"Momento {i+1}",
            "body": body,
            "triggers": [],
            "role": "hook" if i == 0 else ("cta" if i == len(keys) - 1 else "build"),
            "timestamp": f"{first_sec//60:02d}:{first_sec%60:02d}",
        })
    return blocks


# ---------------------------------------------------------------------------
# Renderização para `## Slide NN` (formato que o deep_modeler espera)
# ---------------------------------------------------------------------------
def _render_as_slide_markdown(blocks, original_caption=""):
    """Devolve uma transcrição reformatada que o split_slide_blocks consegue parsear."""
    lines = ["# Transcrição — adaptada de vídeo para slides\n"]
    if original_caption:
        lines.append("## Caption original\n")
        lines.append(original_caption.strip() + "\n")
    for b in blocks:
        triggers = ", ".join(b["triggers"]) if b["triggers"] else "—"
        lines.append(f"\n## Slide {b['slide_n']:02d} — `{b['timestamp']}`\n")
        lines.append("### 1. Texto extraído\n")
        lines.append(f"**Headline:** {b['headline']}\n")
        lines.append(f"**Body:** {b['body']}\n")
        lines.append("\n### 3. Identificação de gatilhos de design\n")
        lines.append(f"**{b['role'].upper()}:** {triggers}\n")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------
def adapt(transcript, benchmark_json=None, bench_type=None, llm_enabled=True):
    """Adapta transcrição de vídeo para formato slides.

    Retorna (transcript_str, info_dict).
      info_dict = {
        "adapter_used": bool,
        "mode": "key_moments" | "llm" | "heuristic" | None,
        "slides": int,
      }
    """
    info = {"adapter_used": False, "mode": None, "slides": 0}

    if not detect_video(bench_type, benchmark_json, transcript):
        return transcript, info

    print("  [adapter] benchmark detectado como vídeo — adaptando para slides...")

    original_caption = ""
    m = re.search(r"##\s*[^\n]*Caption[^\n]*\n(.*?)(?=\n##\s|\Z)",
                  transcript, re.DOTALL | re.IGNORECASE)
    if m:
        original_caption = m.group(1).strip()

    blocks = _segment_via_key_moments(transcript, benchmark_json)
    if blocks:
        info["mode"] = "key_moments"

    if not blocks and llm_enabled:
        blocks = _segment_via_llm(transcript, benchmark_json)
        if blocks:
            info["mode"] = "llm"

    if not blocks:
        blocks = _segment_via_heuristic(transcript, benchmark_json)
        if blocks:
            info["mode"] = "heuristic"
            print(f"  [adapter] modo heurístico (LLM indisponível ou key_moments insuficientes)")

    if not blocks:
        print("  [adapter] FALHA: nenhum modo conseguiu segmentar — devolvendo transcrição original")
        return transcript, info

    info["adapter_used"] = True
    info["slides"] = len(blocks)
    print(f"  [adapter] modo='{info['mode']}' produziu {info['slides']} slides")

    return _render_as_slide_markdown(blocks, original_caption), info


# ---------------------------------------------------------------------------
# CLI (debug standalone)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python transcript_adapter.py <benchmark_dir> [--no-llm]")
        sys.exit(1)

    bdir = sys.argv[1].rstrip("/\\")
    llm = "--no-llm" not in sys.argv

    with open(os.path.join(bdir, "Transcrição.md"), "r", encoding="utf-8") as f:
        tr = f.read()
    bj = None
    bjp = os.path.join(bdir, "Benchmark.json")
    if os.path.exists(bjp):
        with open(bjp, "r", encoding="utf-8") as f:
            bj = json.load(f)

    adapted, info = adapt(tr, benchmark_json=bj, llm_enabled=llm)
    print("\n" + "=" * 60)
    print(f"info: {info}")
    print("=" * 60)
    print(adapted[:2000])
