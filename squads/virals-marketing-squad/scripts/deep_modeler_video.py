#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deep_modeler_video.py — MVC-01: Extrator de benchmark de VÍDEO → video-brief.

Etapa 1 do pipeline *industrialize-video renascido (EPIC-MKT-Video-Creative).
Espelha o deep_modeler.py (estáticos), mas para vídeo: em vez de slides, extrai
a TIMELINE do criativo de referência (a "bússola").

Lê de um diretório de benchmark gerado pelo *creative-benchmark:
  - Transcrição.md  → formato minuto-por-minuto (`**[MM:SS]** texto`)
  - Benchmark.json  → metadata (creator, url, duration, key_moments)
  - Screenshots/    → frames extraídos
  - Análise.md      → inteligência crua (a análise HOLÍSTICA é a MVC-02)

Produz video-brief-<slug>.yaml:
  - source / metadata  → proveniência e números reais
  - transcript[]       → segmentos {start, end, text}
  - frames[]           → {file, timestamp}
  - beats[]            → batidas iniciais {n, start, end, text, role}
  - hook_raw           → fala dos primeiros ~3s (alvo do hook autêntico)
  - _validation        → status explícito (FAIL é NÃO-FATAL; padrão MCI-06)

Uso:
  python deep_modeler_video.py <benchmark_dir> --client=<slug> [--bench-platform=...]

A análise holística (MVC-02), o plano (MVC-03) e o gate (MVC-04) consomem este
brief. Esta etapa é DETERMINÍSTICA (sem LLM) — extração fiel, sem reinvenção.
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

# Resolução dinâmica de cliente (MKT-MC-02) — mesma base do deep_modeler.py.
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
from _client_resolver import (  # noqa: E402
    resolve_client,
    extract_client_arg,
    persist_client_in_brief,
)

SCHEMA_VERSION = "1.0"
HOOK_WINDOW_S = 3        # janela do hook (drop-off acontece em 0–3s)
MIN_BEATS = 3
MAX_BEATS = 10
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")


# ---------------------------------------------------------------------------
# Reuso do parser canônico de transcrição de vídeo (transcript_adapter.py).
# IDS: REUSE > CREATE. Fallback local se o import falhar.
# ---------------------------------------------------------------------------
try:
    from transcript_adapter import (  # noqa: E402
        _parse_sentences as _adapter_parse_sentences,
        _segment_via_key_moments,
        _segment_via_heuristic,
    )
except Exception:  # pragma: no cover — defensivo
    _adapter_parse_sentences = None
    _segment_via_key_moments = None
    _segment_via_heuristic = None


def _parse_sentences_fallback(transcript):
    """Cópia mínima do parser do adapter: [(start_sec, text)]."""
    out = []
    for m in re.finditer(r"\*\*\[(\d{1,2}):(\d{2})\]\*\*\s+([^\n]+)", transcript):
        mm, ss, text = m.group(1), m.group(2), m.group(3)
        out.append((int(mm) * 60 + int(ss), text.strip().rstrip(".")))
    return out


def parse_sentences(transcript):
    fn = _adapter_parse_sentences or _parse_sentences_fallback
    return fn(transcript)


def _ts_to_sec(ts):
    """'MM:SS' → segundos. Tolerante a formatos inválidos."""
    m = re.match(r"\s*(\d{1,2}):(\d{2})\s*$", str(ts or ""))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else 0


def _sec_to_ts(sec):
    sec = int(sec or 0)
    return f"{sec // 60:02d}:{sec % 60:02d}"


# ---------------------------------------------------------------------------
# Carregamento dos insumos
# ---------------------------------------------------------------------------
def _read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_inputs(benchmark_dir):
    """Carrega os insumos. Falha explícita se a Transcrição.md não existir."""
    transcript_path = os.path.join(benchmark_dir, "Transcrição.md")
    analysis_path = os.path.join(benchmark_dir, "Análise.md")
    json_path = os.path.join(benchmark_dir, "Benchmark.json")
    shots_dir = os.path.join(benchmark_dir, "Screenshots")

    if not os.path.exists(transcript_path):
        raise FileNotFoundError(
            f"Transcrição.md não encontrada em {benchmark_dir}")

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
            if f.lower().endswith(IMAGE_EXTS)
        )

    return inputs


# ---------------------------------------------------------------------------
# Extração da timeline
# ---------------------------------------------------------------------------
def _resolve_duration(sentences, benchmark_json):
    """Duração do vídeo: do Benchmark.json, ou inferida do último timestamp."""
    dur = (benchmark_json or {}).get("duration_seconds")
    if isinstance(dur, (int, float)) and dur > 0:
        return int(dur)
    if sentences:
        return sentences[-1][0] + 4  # último start + buffer
    return 0


def build_transcript(sentences, duration):
    """Segmentos {start, end, text}. end[i] = start[i+1] (último → duração)."""
    segments = []
    for i, (start, text) in enumerate(sentences):
        end = sentences[i + 1][0] if i + 1 < len(sentences) else max(start + 2, duration)
        segments.append({"start": start, "end": end, "text": text})
    return segments


def build_frames(screenshots, benchmark_json, duration):
    """Mapeia Screenshots/ → frames com timestamp.

    Prioridade do timestamp:
      1. key_moments[i].time (se houver e bater a contagem);
      2. distribuição uniforme ao longo da duração;
      3. None (sem base temporal).
    """
    moments = (benchmark_json or {}).get("key_moments") or []
    moment_times = [m.get("time") for m in moments if isinstance(m.get("time"), (int, float))]

    frames = []
    n = len(screenshots)
    for i, fname in enumerate(screenshots):
        if i < len(moment_times):
            ts = int(moment_times[i])
        elif duration and n > 1:
            ts = int(round(duration * i / (n - 1)))
        elif duration and n == 1:
            ts = 0
        else:
            ts = None
        frames.append({
            "file": f"Screenshots/{fname}",
            "timestamp": _sec_to_ts(ts) if ts is not None else None,
            "t_seconds": ts,
        })
    return frames


def detect_beats(transcript_md, benchmark_json, segments):
    """Batidas iniciais (determinístico): key_moments → heurística.

    Reusa os segmentadores do transcript_adapter (sem LLM nesta etapa — a
    segmentação semântica refinada é trabalho da MVC-02/03). Fallback local
    agrupa segmentos por janelas se os segmentadores não estiverem disponíveis.
    """
    blocks = None
    if _segment_via_key_moments:
        blocks = _segment_via_key_moments(transcript_md, benchmark_json)
    if not blocks and _segment_via_heuristic:
        blocks = _segment_via_heuristic(transcript_md, benchmark_json)
    if not blocks:
        blocks = _beats_fallback(segments)

    beats = []
    for i, b in enumerate(blocks or []):
        start = _ts_to_sec(b.get("timestamp", "00:00"))
        nxt = blocks[i + 1] if i + 1 < len(blocks) else None
        end = _ts_to_sec(nxt.get("timestamp")) if nxt else (
            segments[-1]["end"] if segments else start)
        beats.append({
            "n": i + 1,
            "start": start,
            "end": end,
            "text": (b.get("body") or b.get("headline") or "").strip(),
            "role": b.get("role") or ("hook" if i == 0 else "build"),
        })
    return beats


def _beats_fallback(segments):
    """Agrupa segmentos em ~MIN_BEATS..MAX_BEATS janelas iguais (sem adapter)."""
    if not segments:
        return []
    n_beats = max(MIN_BEATS, min(MAX_BEATS, len(segments)))
    per = max(1, len(segments) // n_beats)
    blocks = []
    for i in range(0, len(segments), per):
        chunk = segments[i:i + per]
        idx = len(blocks)
        blocks.append({
            "timestamp": _sec_to_ts(chunk[0]["start"]),
            "headline": chunk[0]["text"][:80],
            "body": " ".join(s["text"] for s in chunk).strip(),
            "role": "hook" if idx == 0 else "build",
        })
    if blocks:
        blocks[-1]["role"] = "cta" if len(blocks) > 1 else "single"
    return blocks[:MAX_BEATS]


def extract_hook(segments):
    """Fala dos primeiros ~HOOK_WINDOW_S segundos (alvo do hook autêntico)."""
    if not segments:
        return ""
    early = [s["text"] for s in segments if s["start"] < HOOK_WINDOW_S]
    if not early:
        early = [segments[0]["text"]]
    return " ".join(early).strip()


# ---------------------------------------------------------------------------
# Validação — relatório explícito, zero mascaramento (padrão deep_modeler)
# ---------------------------------------------------------------------------
def validate_brief(brief):
    issues = []
    segments = brief.get("transcript") or []
    frames = brief.get("frames") or []
    beats = brief.get("beats") or []
    meta = brief.get("metadata") or {}

    if not segments:
        issues.append("transcript vazio — nenhum segmento `**[MM:SS]**` parseado")
    if not frames:
        issues.append("nenhum frame em Screenshots/")
    if not beats:
        issues.append("nenhuma batida detectada")
    if not brief.get("hook_raw"):
        issues.append("hook_raw vazio (sem fala nos primeiros segundos)")
    if not meta.get("duration_seconds"):
        issues.append("duração ausente no Benchmark.json (inferida do transcript)")

    # FAIL só quando a base do modelo (transcript) está ausente.
    if not segments:
        status = "FAIL"
    elif issues:
        status = "WARN"
    else:
        status = "PASS"

    return {
        "status": status,
        "issues": issues,
        "segments": len(segments),
        "frames": len(frames),
        "beats": len(beats),
    }


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def deep_model_video(benchmark_dir, client_slug=None, bench_platform=None):
    benchmark_dir = benchmark_dir.rstrip("/\\")
    slug = os.path.basename(benchmark_dir)
    client = resolve_client(client_slug)

    print("=== Deep Modeler VIDEO (MVC-01) ===")
    print(f"Benchmark: {slug}")
    print(f"Cliente  : {client.nome_exibicao} ({client.slug})")

    inputs = load_inputs(benchmark_dir)
    bj = inputs["benchmark_json"] or {}

    sentences = parse_sentences(inputs["transcript"])
    duration = _resolve_duration(sentences, bj)
    segments = build_transcript(sentences, duration)
    frames = build_frames(inputs["screenshots"], bj, duration)
    beats = detect_beats(inputs["transcript"], bj, segments)
    hook_raw = extract_hook(segments)

    print(f"Insumos → transcrição: ok | análise: {'ok' if inputs['analysis'] else 'AUSENTE'} "
          f"| screenshots: {len(inputs['screenshots'])} | "
          f"json: {'ok' if inputs['benchmark_json'] else 'ausente'}")

    brief = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "media_kind": "video",
        "video_brief": {
            "slug": f"video-{slug}",
            "source_benchmark": benchmark_dir,
        },
        "source": {
            "creator": bj.get("creator") or bj.get("author"),
            "platform": bench_platform or bj.get("platform"),
            "url": bj.get("url"),
            "type": bj.get("type") or bj.get("subtype"),
            "caption": bj.get("description") or bj.get("title"),
        },
        "metadata": {
            "view_count": bj.get("view_count"),
            "like_count": bj.get("like_count"),
            "comment_count": bj.get("comment_count"),
            "duration_seconds": bj.get("duration_seconds") or duration or None,
        },
        "hook_raw": hook_raw,
        "transcript": segments,
        "frames": frames,
        "beats": beats,
        # Inteligência crua preservada — a análise holística é a MVC-02.
        "analysis_raw_present": inputs["analysis"] is not None,
    }

    persist_client_in_brief(brief, client)
    brief["_validation"] = validate_brief(brief)

    output_path = f"squads/virals-marketing-squad/data/video-brief-{slug}.yaml"
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(brief, output_path)
    return output_path, brief["_validation"]["status"]


def _print_report(brief, output_path):
    v = brief["_validation"]
    print("-" * 60)
    print(f"Status de validação : {v['status']}")
    print(f"Segmentos (transcript): {v['segments']}")
    print(f"Frames               : {v['frames']}")
    print(f"Batidas (beats)      : {v['beats']}")
    print(f"Hook (0–{HOOK_WINDOW_S}s)        : {(brief.get('hook_raw') or '')[:70]}")
    if v["issues"]:
        print("Pendências:")
        for i in v["issues"]:
            print(f"  - {i}")
    print(f"Brief salvo em       : {output_path}")
    print("-" * 60)


if __name__ == "__main__":
    client_slug, _rest = extract_client_arg(sys.argv[1:])
    bench_platform = None
    _filtered = []
    for a in _rest:
        if a.startswith("--bench-platform="):
            bench_platform = a.split("=", 1)[1].strip() or None
        else:
            _filtered.append(a)
    _rest = _filtered

    if len(_rest) < 1:
        print(
            "Uso: python squads/virals-marketing-squad/scripts/deep_modeler_video.py "
            "<benchmark_dir> [--client=<slug>] [--bench-platform=instagram|tiktok|youtube|linkedin]"
        )
        sys.exit(1)

    try:
        _, status = deep_model_video(
            _rest[0], client_slug=client_slug, bench_platform=bench_platform)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    # FAIL (extração incompleta) é NÃO-FATAL → exit 2 (brief salvo; MVC-05 decide).
    sys.exit(2 if status == "FAIL" else 0)
