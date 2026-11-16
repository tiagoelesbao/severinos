#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_recast_helpers.py — normalização de kicker (espanhol→PT) e sanitização de
pexels_query (metáfora abstrata → cena concreta). Determinísticos, sem rede.

Uso: python squads/virals-marketing-squad/scripts/test_recast_helpers.py
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

from recast_engine import normalize_kicker, sanitize_pexels_query  # noqa: E402


# ── normalize_kicker ─────────────────────────────────────────────────────────
def test_kicker_traduz_espanhol():
    assert normalize_kicker("O RETO") == "O DESAFIO"   # o resíduo real
    assert normalize_kicker("reto") == "DESAFIO"
    assert normalize_kicker("EL CASO") == "O CASO"
    assert normalize_kicker("REFLEXIÓN") == "REFLEXÃO"


def test_kicker_traduz_por_palavra():
    assert normalize_kicker("O RETO FINAL") == "O DESAFIO FINAL"


def test_kicker_pt_intacto_e_vazio_vira_insight():
    assert normalize_kicker("O DADO") == "O DADO"
    assert normalize_kicker("") == "INSIGHT"
    assert normalize_kicker(None) == "INSIGHT"


# ── sanitize_pexels_query ────────────────────────────────────────────────────
def test_pexels_metafora_pura_vira_cena_concreta():
    # O resíduo real: queries metafóricas que o banco não ilustra.
    for q in ["future content kingdom", "multiplatform dominance", "digital empire"]:
        out = sanitize_pexels_query(q)
        assert out != q
        assert "kingdom" not in out and "dominance" not in out and "empire" not in out


def test_pexels_query_concreta_preservada():
    for q in ["person filming phone", "team meeting laptop", "hands writing notebook"]:
        assert sanitize_pexels_query(q) == q


def test_pexels_query_vazia_recebe_fallback():
    out = sanitize_pexels_query("")
    assert out and len(out.split()) >= 2


def test_pexels_seed_determinístico():
    # Mesma seed → mesmo fallback (reprodutível).
    assert sanitize_pexels_query("pure dominance", seed=1) == sanitize_pexels_query("total mastery", seed=1)


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
