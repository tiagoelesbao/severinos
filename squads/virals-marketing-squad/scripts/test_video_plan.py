#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_video_plan.py — MVC-05: testes do orquestrador (funções puras).

Cobre o gate de saída (is_blocked / block_reasons) e o render do
Plano-de-Criativo.md. O encadeamento de subprocessos é validado pelo smoke
E2E real (fora do unit). Self-contained.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video_plan as vp  # noqa: E402


def _brief(gate_status="PASS", unresolved=None):
    return {
        "client_slug": "tiago-elesbao",
        "client_nome": "Tiago Elesbão",
        "source": {"creator": "@hormozi", "platform": "instagram", "url": "http://x", "type": "reel"},
        "metadata": {"duration_seconds": 32},
        "_validation": {"video_gate_status": gate_status,
                        **({"video_fidelity_unresolved": unresolved} if unresolved else {})},
        "quality_gate_video": {"status": gate_status,
                               "blocking_failures": (["V3_fid_numeros"] if gate_status == "FAIL" else [])},
        "content_plan": {
            "tema": "poder vs paz",
            "format_concept": "talking-head",
            "hook": {"variants": [
                {"text_overlay": "Poder ou paz?", "pattern_interrupt": "zoom", "spoken_open": "Olha isso"},
                {"text_overlay": "E se fosse só paz?", "pattern_interrupt": "cut", "spoken_open": "Pensa"},
                {"text_overlay": "Qual prioridade?", "pattern_interrupt": "whip", "spoken_open": "Repara"},
            ]},
            "storyboard": [{"beat_n": 1, "scene": "escritório", "shot_type": "close",
                            "duration_s": 2.5, "on_screen_text": "Poder ou Paz?",
                            "broll": "none", "motion": "zoom-in"}],
            "script": "Tiago aqui. Você já pensou...",
            "edit_spec": {"zooms": ["na 1ª frase"], "transitions": ["cut @ 6s"],
                          "inserts": [], "captions": "word-by-word", "motion_graphics": []},
            "shotlist": [{"plano": "close nos olhos", "framing": "close", "audio": "fala",
                          "props": "laptop", "locacao": "escritório", "falas_chave": "Você já pensou?"}],
            "rationale": "modela o arco mantendo voz",
            "fidelity_check": {"status": "PASS", "fabricated_numbers": []},
        },
    }


def test_is_blocked_pass():
    assert vp.is_blocked(_brief("PASS")) is False


def test_is_blocked_concerns_not_blocked():
    assert vp.is_blocked(_brief("CONCERNS")) is False


def test_is_blocked_fail():
    assert vp.is_blocked(_brief("FAIL")) is True


def test_force_overrides_block():
    assert vp.is_blocked(_brief("FAIL"), force=True) is False


def test_block_reasons_lists_unresolved():
    b = _brief("FAIL", unresolved={"numeros": ["47%"], "claims": [], "tabu": ["segredo"], "cta": []})
    reasons = vp.block_reasons(b)
    assert any("números fabricados" in r for r in reasons)
    assert any("léxico-tabu" in r for r in reasons)


def test_block_reasons_empty_when_pass():
    assert vp.block_reasons(_brief("PASS")) == []


def test_render_plan_md_has_all_sections():
    md = vp.render_plan_md(_brief("PASS"))
    assert "# Plano de Criativo de Vídeo — Tiago Elesbão" in md
    assert "## 🪝 Hook" in md
    assert "Poder ou paz?" in md
    assert "## 🎬 Storyboard" in md
    assert "## 📝 Roteiro" in md
    assert "## 🎥 Shotlist" in md
    assert "Você já pensou?" in md       # fala-chave da shotlist
    assert "✅ PASS" in md                # status do gate


def test_render_plan_md_three_hook_variants():
    md = vp.render_plan_md(_brief("PASS"))
    assert md.count("**Variante") == 3


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
