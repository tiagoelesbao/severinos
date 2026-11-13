#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_copy_frameworks.py — o arco narrativo do copy-squad garante início-meio-fim
independente da fonte. Testes puros, sem rede.

Uso: python squads/virals-marketing-squad/scripts/test_copy_frameworks.py
(também roda sob pytest).
"""

import os
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from copy_frameworks import (  # noqa: E402
    build_arc, build_arc_block, detect_awareness, load_frameworks, AWARENESS_HOOKS,
)


def test_arco_tem_inicio_meio_fim():
    assert [a["role"] for a in build_arc(1)] == ["HOOK"]
    assert [a["role"] for a in build_arc(2)] == ["HOOK", "PAYOFF"]
    assert [a["role"] for a in build_arc(3)] == ["HOOK", "INSIGHT", "PAYOFF"]
    assert [a["role"] for a in build_arc(5)] == ["HOOK", "INSIGHT", "INSIGHT", "INSIGHT", "PAYOFF"]


def test_arco_sempre_abre_com_hook_e_fecha_com_payoff():
    for n in range(2, 8):
        arc = build_arc(n)
        assert arc[0]["role"] == "HOOK"
        assert arc[-1]["role"] == "PAYOFF"


def test_detect_awareness_default_problem_aware():
    # Conteúdo educativo de benchmark → a audiência sente a dor mas não sabe a saída.
    assert detect_awareness({"central_theme": "como testar seu reel antes de postar"}) == "problem_aware"


def test_detect_awareness_novidade_vira_solution_aware():
    assert detect_awareness({"central_theme": "a marca lançou um tênis novo"}) == "solution_aware"


def test_build_arc_block_injeta_awareness_arco_e_mestres():
    bloco = build_arc_block({"central_theme": "testar reel"}, 3)
    assert "awareness" in bloco.lower()
    assert "ARCO NARRATIVO" in bloco
    assert "HOOK" in bloco and "PAYOFF" in bloco
    # os mestres precisam estar presentes (a munição do copy-squad)
    for mestre in ("SCHWARTZ", "SUGARMAN", "HALBERT", "BENCIVENGA"):
        assert mestre in bloco, f"{mestre} ausente do bloco"


def test_frameworks_do_copy_squad_carregam():
    fw = load_frameworks()
    # o copy-squad tem AIDA, PAS, etc. — se sumirem, a fonte canônica quebrou
    assert "aida" in fw and "pas" in fw, "frameworks canônicos do copy-squad ausentes"


def test_awareness_hooks_cobre_os_5_niveis():
    assert set(AWARENESS_HOOKS) == {"unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"}


# ── runner ───────────────────────────────────────────────────────────────────
def _run_all():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {t.__name__}  — {e}")
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR {t.__name__}  — {type(e).__name__}: {e}")
    print("-" * 60)
    print(f"{passed}/{len(tests)} testes passaram")
    return passed == len(tests)


if __name__ == "__main__":
    sys.exit(0 if _run_all() else 1)
