#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_plan_video_creative.py — MVC-03: testes do motor de planejamento de vídeo.

Cobre as partes determinísticas (coleta de texto, fidelidade reusando o guard do
recast_engine), as guardas de pré-condição (transcript / benchmark_analysis) e o
caminho de escrita com o LLM mockado. Self-contained; sem rede.
"""

import os
import sys
import yaml
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plan_video_creative as pvc  # noqa: E402


def _brief():
    return {
        "client_slug": "tiago-elesbao",
        "source": {"caption": "Como dobrar a retenção", "creator": "@x"},
        "metadata": {"duration_seconds": 30},
        "hook_raw": "Você está perdendo 80% da audiência",
        "transcript": [
            {"start": 0, "end": 3, "text": "Você está perdendo 80% da audiência"},
            {"start": 3, "end": 9, "text": "O problema é o primeiro frame"},
            {"start": 9, "end": 30, "text": "Corta o silêncio e poe texto grande"},
        ],
        "beats": [
            {"n": 1, "start": 0, "end": 9, "text": "hook", "role": "hook"},
            {"n": 2, "start": 9, "end": 30, "text": "fecho", "role": "cta"},
        ],
        "benchmark_analysis": {"hook_type": "bold claim", "cut_cadence": {"avg_segment_s": 2.0}},
    }


def _plan(script="Corta o silêncio e poe texto grande no frame", overlay="Pare de perder views"):
    return {
        "tema": "retenção",
        "hook": {"variants": [
            {"pattern_interrupt": "snap-zoom", "text_overlay": overlay, "spoken_open": "Olha isso"},
        ]},
        "storyboard": [{"beat_n": 1, "on_screen_text": "frame", "duration_s": 3}],
        "script": script,
        "shotlist": [{"plano": "close", "falas_chave": "vai direto ao ponto"}],
    }


def test_transcript_text_includes_caption():
    txt = pvc._transcript_text(_brief())
    assert "primeiro frame" in txt
    assert "Como dobrar a retenção" in txt  # caption


def test_plan_text_collects_all_generated_text():
    txt = pvc._plan_text(_plan(script="ROTEIRO", overlay="OVERLAY"))
    assert "ROTEIRO" in txt
    assert "OVERLAY" in txt
    assert "vai direto ao ponto" in txt  # falas_chave da shotlist


def test_fidelity_pass_when_grounded():
    # "80%" existe no transcript → não deve ser flaggado.
    plan = _plan(script="Você perde 80% se errar o frame")
    fid = pvc.check_fidelity(plan, _brief())
    assert fid["status"] == "PASS"
    assert fid["fabricated_numbers"] == []


def test_fidelity_warn_when_fabricated():
    # "47%" NÃO existe no transcript → deve ser sinalizado.
    plan = _plan(script="A retenção sobe 47% com esse ajuste")
    fid = pvc.check_fidelity(plan, _brief())
    assert fid["status"] == "WARN"
    assert any("47" in f for f in fid["fabricated_numbers"])


def test_plan_requires_transcript():
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump({"transcript": [], "benchmark_analysis": {"x": 1}}, f, allow_unicode=True)
        path = f.name
    try:
        try:
            pvc.plan_video_creative(path)
            assert False, "esperava ValueError"
        except ValueError as e:
            assert "transcript" in str(e).lower()
    finally:
        os.unlink(path)


def test_plan_requires_benchmark_analysis():
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump({"transcript": [{"start": 0, "end": 1, "text": "x"}]}, f, allow_unicode=True)
        path = f.name
    try:
        try:
            pvc.plan_video_creative(path)
            assert False, "esperava ValueError"
        except ValueError as e:
            assert "benchmark_analysis" in str(e)
    finally:
        os.unlink(path)


def test_plan_video_creative_writes_plan_with_llm_mock():
    brief = _brief()
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True)
        path = f.name
    orig = pvc.call_llm_json
    pvc.call_llm_json = lambda prompt, parser, **k: (_plan(), "mock:model")
    try:
        plan = pvc.plan_video_creative(path, client_slug="tiago-elesbao")
        with open(path, encoding="utf-8") as f:
            out = yaml.safe_load(f)
    finally:
        pvc.call_llm_json = orig
        os.unlink(path)
    assert out["content_plan"]["planned_by"] == "mock:model"
    assert "fidelity_check" in out["content_plan"]
    assert "planned_at" in out["content_plan"]
    assert plan["hook"]["variants"]


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
