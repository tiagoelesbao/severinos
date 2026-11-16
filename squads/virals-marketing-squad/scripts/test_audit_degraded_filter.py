#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_audit_degraded_filter.py — VEX-14: criativo degradado fora da auditoria.

O benchmark de 2026-07-11 auditou 10 criativos que eram capa/metadados e produziu
o veredito falso "falta de bastidor/evidência". O fail-loud marca item_status;
`find_benchmark_creatives` deve honrá-lo e excluir degraded/failed — senão a
auditoria (e a síntese do Chief) volta a comer lixo.

Uso: python squads/virals-marketing-squad/scripts/test_audit_degraded_filter.py
(também roda sob pytest).
"""

import json
import os
import shutil
import sys
import tempfile

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from run_audit_benchmark import find_benchmark_creatives  # noqa: E402


def _criar_criativo(base, plat, folder, item_status, com_analise=True):
    d = os.path.join(base, "daily-monitoring", "2026-07-11", "benchmark", plat, folder)
    os.makedirs(d, exist_ok=True)
    bench = {
        "url": f"https://x/{folder}", "platform": plat,
        "type": "carousel", "subtype": "ig-carousel",
        "item_status": item_status,
        "status_reason": None if item_status == "ok" else "apenas metadados",
    }
    with open(os.path.join(d, "Benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(bench, f)
    with open(os.path.join(d, "Transcrição.md"), "w", encoding="utf-8") as f:
        f.write("# Transcrição\n\nconteúdo real\n")
    if com_analise:
        with open(os.path.join(d, "Análise.md"), "w", encoding="utf-8") as f:
            f.write("# Análise\n\n(placeholder)\n")
    return folder


def _fixture():
    base = tempfile.mkdtemp(prefix="vex14-audit-")
    _criar_criativo(base, "instagram", "01-bom-aaa", "ok")
    _criar_criativo(base, "instagram", "02-degradado-bbb", "degraded")
    _criar_criativo(base, "youtube", "01-removido-ccc", "failed")
    _criar_criativo(base, "youtube", "02-bom-ddd", "ok")
    return base


def test_exclui_degraded_e_failed():
    base = _fixture()
    try:
        got = find_benchmark_creatives(base, "2026-07-11", ["instagram", "youtube"])
        ids = {c["creative_id"] for c in got}
        assert ids == {"01-bom-aaa", "02-bom-ddd"}, f"esperado só os ok, veio {ids}"
    finally:
        shutil.rmtree(base, ignore_errors=True)


def test_criativo_sem_item_status_nao_e_excluido():
    # Retrocompatibilidade: benchmark antigo (pré-fail-loud) não tem o campo.
    # Excluir por ausência apagaria todo batch legado — o certo é deixar passar.
    base = tempfile.mkdtemp(prefix="vex14-audit-")
    try:
        d = os.path.join(base, "daily-monitoring", "2026-07-11", "benchmark", "instagram", "01-legado")
        os.makedirs(d)
        with open(os.path.join(d, "Benchmark.json"), "w", encoding="utf-8") as f:
            json.dump({"url": "x", "type": "carousel", "subtype": "ig-carousel"}, f)  # sem item_status
        with open(os.path.join(d, "Transcrição.md"), "w", encoding="utf-8") as f:
            f.write("conteúdo\n")
        with open(os.path.join(d, "Análise.md"), "w", encoding="utf-8") as f:
            f.write("análise\n")

        got = find_benchmark_creatives(base, "2026-07-11", ["instagram"])
        assert len(got) == 1 and got[0]["creative_id"] == "01-legado"
    finally:
        shutil.rmtree(base, ignore_errors=True)


def test_todos_degradados_devolve_vazio():
    base = tempfile.mkdtemp(prefix="vex14-audit-")
    try:
        _criar_criativo(base, "instagram", "01-x", "degraded")
        _criar_criativo(base, "instagram", "02-y", "failed")
        got = find_benchmark_creatives(base, "2026-07-11", ["instagram"])
        assert got == [], "batch 100% degradado não pode entregar nada para auditar"
    finally:
        shutil.rmtree(base, ignore_errors=True)


# ── runner standalone ────────────────────────────────────────────────────────
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
