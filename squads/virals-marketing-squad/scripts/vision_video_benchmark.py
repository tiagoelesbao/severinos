#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vision_video_benchmark.py — VEX-04: DNA VISUAL do benchmark de vídeo.

Etapa 1b do pipeline *industrialize-video (entre deep_modeler_video e
analyze_video_benchmark). Dá OLHOS à Fase A: analisa os frames de Screenshots/
via visão (Gemini, mesmo padrão do generate_template_from_benchmark) e grava
brief["visual_analysis"]:

  - frames[]           : {file, shot_type, on_screen_text, has_captions}
  - shot_mix           : proporção talking_head / screen_capture / broll / graphic
  - caption_style_seen : estilo de legenda observado (posição, caixa, destaque)
  - text_overlay_style : como o texto-na-tela é usado (tamanho/posição/cor)
  - visual_hook_device : o que segura o olho nos primeiros frames
  - broll_density      : low | medium | high
  - edit_style_notes   : observações de edição replicáveis
  - palette            : cores dominantes observadas

REGRA DE FIDELIDADE: a visão DESCREVE o benchmark (contexto de modelagem).
Texto/números lidos por OCR NÃO viram fatos do plano — a fonte de fatos segue
sendo transcript+caption (gate V3/V4 intocado).

NÃO-FATAL: sem GEMINI_API_KEY/rede/frames → visual_analysis = null e o
pipeline segue (padrão MCI-06). Exit 0 sempre que o brief existir.

Uso:
  python vision_video_benchmark.py <video-brief-*.yaml> [--max-frames=8]
"""

import base64
import json
import os
import re
import sys
import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"ERRO: dependência ausente ({e}). Rode: pip install pyyaml requests python-dotenv",
          file=sys.stderr)
    sys.exit(1)

load_dotenv()

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)
MAX_FRAMES_DEFAULT = 8
SHOT_TYPES = ("talking_head", "screen_capture", "broll", "graphic")
DENSITIES = ("low", "medium", "high")

VISION_PROMPT = """Você é um diretor de edição de vídeo viral analisando FRAMES de um
Reel/TikTok de ALTA performance. Descreva o DNA VISUAL da edição — o que um editor
precisa saber para MODELAR (não copiar) este estilo com outra marca.

IMPORTANTE: você está DESCREVENDO a referência. Qualquer número/estatística visível
nos frames é contexto descritivo — NÃO é fato utilizável em outro vídeo.

Os frames vêm em ordem cronológica (o nome de cada um traz o timestamp e a fala).

Responda APENAS um JSON com este schema exato:
{"frames":[{"file":"<nome>","shot_type":"talking_head|screen_capture|broll|graphic",
"on_screen_text":"<texto visível ou vazio>","has_captions":true}],
"shot_mix":{"talking_head":0.4,"screen_capture":0.6,"broll":0.0,"graphic":0.0},
"caption_style_seen":"<estilo de legenda: posição, caixa, cor de destaque, caixa-alta?>",
"text_overlay_style":"<como usa texto-na-tela além das legendas>",
"visual_hook_device":"<o que prende o olho nos primeiros frames>",
"broll_density":"low|medium|high",
"edit_style_notes":"<2-3 observações de edição replicáveis (enquadramento, zoom, cortes)>",
"palette":["#RRGGBB","#RRGGBB"]}"""


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Puras (testáveis)
# ---------------------------------------------------------------------------
def sample_frames(benchmark_dir, max_frames=MAX_FRAMES_DEFAULT):
    """Amostra uniforme (ordem preservada) dos frames de Screenshots/."""
    shots_dir = os.path.join(benchmark_dir, "Screenshots")
    if not os.path.isdir(shots_dir):
        return []
    all_frames = sorted(
        f for f in os.listdir(shots_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    )
    n = len(all_frames)
    if n <= max_frames:
        picked = all_frames
    else:
        idx = sorted({round(i * (n - 1) / (max_frames - 1)) for i in range(max_frames)})
        picked = [all_frames[i] for i in idx]
    return [os.path.join(shots_dir, f) for f in picked]


def normalize_visual_analysis(raw, sent_files):
    """Estrutura o retorno do LLM com defaults seguros. None se inutilizável."""
    if not isinstance(raw, dict):
        return None
    frames = []
    for fr in raw.get("frames") or []:
        if not isinstance(fr, dict):
            continue
        st = str(fr.get("shot_type", "")).strip().lower()
        frames.append({
            "file": str(fr.get("file", "")).strip(),
            "shot_type": st if st in SHOT_TYPES else "broll",
            "on_screen_text": str(fr.get("on_screen_text", "")).strip(),
            "has_captions": bool(fr.get("has_captions", False)),
        })
    mix = raw.get("shot_mix") if isinstance(raw.get("shot_mix"), dict) else {}
    shot_mix = {k: round(float(mix.get(k, 0) or 0), 2) for k in SHOT_TYPES}
    dens = str(raw.get("broll_density", "")).strip().lower()
    palette = [c for c in (raw.get("palette") or [])
               if isinstance(c, str) and re.match(r"^#[0-9a-fA-F]{6}$", c.strip())]
    out = {
        "frames": frames,
        "frames_sent": len(sent_files),
        "shot_mix": shot_mix,
        "caption_style_seen": str(raw.get("caption_style_seen", "")).strip(),
        "text_overlay_style": str(raw.get("text_overlay_style", "")).strip(),
        "visual_hook_device": str(raw.get("visual_hook_device", "")).strip(),
        "broll_density": dens if dens in DENSITIES else "medium",
        "edit_style_notes": str(raw.get("edit_style_notes", "")).strip(),
        "palette": palette[:5],
    }
    # Inutilizável se não tem nem frames nem observações.
    if not frames and not out["edit_style_notes"] and not out["visual_hook_device"]:
        return None
    return out


# ---------------------------------------------------------------------------
# Visão (I/O)
# ---------------------------------------------------------------------------
def vision_call(frame_paths):
    """Chama o Gemini com os frames. Retorna dict cru ou None (não-fatal)."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or not frame_paths:
        return None
    parts = [{"text": VISION_PROMPT}]
    for p in frame_paths:
        try:
            with open(p, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
        except OSError:
            continue
        mime = "image/png" if p.lower().endswith(".png") else "image/jpeg"
        parts.append({"text": f"\nframe: {os.path.basename(p)}"})
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    try:
        resp = requests.post(GEMINI_URL.format(model=GEMINI_MODEL, key=key),
                             json=body, timeout=120)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (requests.RequestException, KeyError, IndexError, ValueError) as e:
        print(f"  ! visão indisponível ({e}) — visual_analysis = null.", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def vision_video_benchmark(brief_path, max_frames=MAX_FRAMES_DEFAULT):
    brief_path = brief_path.strip()
    print(f"=== VEX-04: DNA Visual — {os.path.basename(brief_path)} ===")
    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Video-brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    benchmark_dir = (brief.get("video_brief", {}) or {}).get("source_benchmark") or ""
    frames = sample_frames(benchmark_dir, max_frames) if benchmark_dir else []
    print(f"Frames amostrados: {len(frames)} (de {benchmark_dir or '?'})")

    analysis = None
    if frames:
        raw = vision_call(frames)
        analysis = normalize_visual_analysis(raw, frames) if raw else None
        if analysis:
            analysis["analyzed_by"] = GEMINI_MODEL
            analysis["analyzed_at"] = datetime.datetime.now().isoformat(timespec="seconds")

    brief["visual_analysis"] = analysis  # null = degradação explícita, nunca falha
    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    if analysis:
        mix = analysis["shot_mix"]
        print(f"Shot mix    : th={mix['talking_head']} screen={mix['screen_capture']} "
              f"broll={mix['broll']} graphic={mix['graphic']}")
        print(f"Hook visual : {analysis['visual_hook_device'][:70]}")
        print(f"Legendas    : {analysis['caption_style_seen'][:70]}")
        print(f"B-roll      : {analysis['broll_density']}")
    else:
        print("visual_analysis = null (sem visão/frames) — pipeline segue.")
    print(f"Brief atualizado: {brief_path}")
    return analysis


if __name__ == "__main__":
    max_frames = MAX_FRAMES_DEFAULT
    rest = []
    for a in sys.argv[1:]:
        if a.startswith("--max-frames="):
            max_frames = max(1, int(a.split("=", 1)[1]))
        else:
            rest.append(a)
    if not rest:
        print("Uso: python squads/virals-marketing-squad/scripts/vision_video_benchmark.py "
              "<video-brief-*.yaml> [--max-frames=8]")
        sys.exit(1)
    try:
        vision_video_benchmark(rest[0], max_frames=max_frames)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
