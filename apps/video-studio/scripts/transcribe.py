#!/usr/bin/env python3
"""Transcrição com timestamps por palavra (faster-whisper).

Entrada: um ou mais caminhos de mídia (áudio/vídeo).
Saída: JSON em stdout — { "<arquivo>": { "text": str, "words": [{w,start,end}], "duration": float } }

Usado pela Fase B do video-studio para gerar legendas REAIS (o que é dito,
no tempo exato) em vez de estimar pelo roteiro. Determinístico o suficiente
(greedy decoding) e roda offline.
"""
import json
import os
import sys

from faster_whisper import WhisperModel

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
LANG = os.environ.get("WHISPER_LANG", "pt")


def transcribe(model: WhisperModel, path: str) -> dict:
    segments, info = model.transcribe(
        path,
        language=LANG,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )
    words = []
    text_parts = []
    for seg in segments:
        text_parts.append(seg.text.strip())
        for w in (seg.words or []):
            words.append({
                "w": w.word.strip(),
                "start": round(w.start, 3),
                "end": round(w.end, 3),
            })
    return {
        "text": " ".join(p for p in text_parts if p),
        "words": words,
        "duration": round(info.duration, 3),
    }


def main() -> int:
    args = sys.argv[1:]
    out_path = None
    if "--out" in args:
        i = args.index("--out")
        out_path = args[i + 1]
        args = args[:i] + args[i + 2:]
    paths = args
    if not paths:
        print("uso: transcribe.py [--out arquivo.json] <midia> [<midia> ...]", file=sys.stderr)
        return 2
    # CPU int8 — leve e suficiente para narração curta.
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    out = {}
    for p in paths:
        name = os.path.basename(p)
        try:
            out[name] = transcribe(model, p)
            print(f"[ok] {name}: {len(out[name]['words'])} palavras, "
                  f"{out[name]['duration']}s", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 — degrada por arquivo
            out[name] = {"error": str(e)}
            print(f"[erro] {name}: {e}", file=sys.stderr)
    payload = json.dumps(out, ensure_ascii=False, indent=2)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(payload)
        print(f"[gravado] {out_path}", file=sys.stderr)
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
