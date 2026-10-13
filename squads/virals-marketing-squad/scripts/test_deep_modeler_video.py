#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_deep_modeler_video.py — MVC-01: testes do extrator de benchmark de vídeo.

Cobre as funções puras (parsing, hook, frames, beats, validação) + os caminhos
load_inputs (fatal quando falta Transcrição.md). Self-contained: gera fixtures
em tempdir, não escreve em data/. Roda com pytest OU `python test_*.py`.
"""

import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deep_modeler_video as dmv  # noqa: E402


def test_parse_sentences_and_transcript():
    tr = "**[00:00]** Olá mundo.\n**[00:05]** Segunda frase."
    sents = dmv.parse_sentences(tr)
    assert sents == [(0, "Olá mundo"), (5, "Segunda frase")]
    segs = dmv.build_transcript(sents, duration=10)
    assert segs[0] == {"start": 0, "end": 5, "text": "Olá mundo"}
    assert segs[1]["end"] == 10  # último → duração


def test_extract_hook_window():
    segs = [
        {"start": 0, "end": 2, "text": "A"},
        {"start": 2, "end": 4, "text": "B"},
        {"start": 5, "end": 7, "text": "C"},
    ]
    hook = dmv.extract_hook(segs)
    assert "A" in hook and "B" in hook and "C" not in hook


def test_extract_hook_fallback_first_segment():
    # Nenhum segmento < 3s → cai no primeiro.
    segs = [{"start": 4, "end": 6, "text": "Primeiro tardio"}]
    assert dmv.extract_hook(segs) == "Primeiro tardio"
    assert dmv.extract_hook([]) == ""


def test_frames_via_key_moments():
    bj = {"key_moments": [{"time": 0}, {"time": 10}]}
    frames = dmv.build_frames(["a.png", "b.png"], bj, 20)
    assert [f["t_seconds"] for f in frames] == [0, 10]
    assert frames[1]["timestamp"] == "00:10"


def test_frames_even_spread_without_moments():
    frames = dmv.build_frames(["a.png", "b.png", "c.png"], {}, 40)
    assert [f["t_seconds"] for f in frames] == [0, 20, 40]


def test_frames_no_duration_no_moments():
    frames = dmv.build_frames(["a.png"], {}, 0)
    assert frames[0]["t_seconds"] is None
    assert frames[0]["timestamp"] is None


def test_validation_fail_when_no_transcript():
    brief = {"transcript": [], "frames": [], "beats": [], "hook_raw": "", "metadata": {}}
    v = dmv.validate_brief(brief)
    assert v["status"] == "FAIL"
    assert any("transcript vazio" in i for i in v["issues"])


def test_validation_pass_when_complete():
    brief = {
        "transcript": [{"start": 0, "end": 2, "text": "x"}],
        "frames": [{"file": "a"}],
        "beats": [{"n": 1}],
        "hook_raw": "x",
        "metadata": {"duration_seconds": 10},
    }
    v = dmv.validate_brief(brief)
    assert v["status"] == "PASS"
    assert v["issues"] == []


def test_validation_warn_when_missing_frames():
    brief = {
        "transcript": [{"start": 0, "end": 2, "text": "x"}],
        "frames": [],
        "beats": [{"n": 1}],
        "hook_raw": "x",
        "metadata": {"duration_seconds": 10},
    }
    v = dmv.validate_brief(brief)
    assert v["status"] == "WARN"


def test_load_inputs_missing_transcript_is_fatal():
    with tempfile.TemporaryDirectory() as d:
        try:
            dmv.load_inputs(d)
            assert False, "esperava FileNotFoundError"
        except FileNotFoundError:
            pass


def test_load_inputs_reads_full_fixture():
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "Transcrição.md"), "w", encoding="utf-8") as f:
            f.write("**[00:00]** Olá.\n**[00:03]** Tudo bem.")
        with open(os.path.join(d, "Benchmark.json"), "w", encoding="utf-8") as f:
            json.dump({"duration_seconds": 8, "creator": "@x"}, f)
        os.makedirs(os.path.join(d, "Screenshots"))
        open(os.path.join(d, "Screenshots", "a.png"), "w").close()

        inputs = dmv.load_inputs(d)
        assert inputs["benchmark_json"]["duration_seconds"] == 8
        assert inputs["screenshots"] == ["a.png"]

        sents = dmv.parse_sentences(inputs["transcript"])
        segs = dmv.build_transcript(sents, dmv._resolve_duration(sents, inputs["benchmark_json"]))
        assert len(segs) == 2
        beats = dmv.detect_beats(inputs["transcript"], inputs["benchmark_json"], segs)
        assert len(beats) >= 1
        assert beats[0]["role"] in ("hook", "single")


def _run_all():
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  ✓ {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  ✗ {fn.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  ✗ {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passaram.")
    return failed


if __name__ == "__main__":
    sys.exit(1 if _run_all() else 0)
