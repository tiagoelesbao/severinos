#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_ocr_extraction.py — a leitura do texto real do benchmark (Transcrição) é a
raiz da qualidade da copy; precisa ser confiável nos dois formatos.

Uso: python squads/virals-marketing-squad/scripts/test_ocr_extraction.py
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

from deep_modeler import extract_ocr_lines  # noqa: E402


NOVO = """## Texto no slide
Alguém mandaria isso para um amigo?
Se não, falta utilidade.
## Leitura visual
Fundo preto, texto branco, mood sério.
## Gatilhos de design
Pergunta, contraste.
## 💡 Ângulo de modelagem para Tiago Elesbão
Modelar como teste rápido, hook por benefício."""

LEGADO = """**1. Transcribed Text:**
*   @community_ca
*   Here's an analysis of the marketing image:
*   Alguém mandaria isso para um amigo?
*   Fortaleça a mensagem antes de postar.
**2. Visual Elements:**
*   black background"""


def test_novo_formato_extrai_o_ouro():
    ocr = extract_ocr_lines(NOVO)
    assert "Alguém mandaria isso para um amigo?" in ocr


def test_novo_formato_nao_vaza_leitura_nem_angulo_cliente():
    # A leitura visual e o ângulo de modelagem NÃO podem virar copy — só o texto.
    ocr = extract_ocr_lines(NOVO)
    assert not any("fundo preto" in l.lower() for l in ocr)
    assert not any("modelar como teste" in l.lower() for l in ocr)
    assert not any("gatilhos" in l.lower() for l in ocr)


def test_legado_ainda_funciona():
    # Retrocompatibilidade: benchmarks antigos (visão em inglês) continuam legíveis.
    ocr = extract_ocr_lines(LEGADO)
    assert "Alguém mandaria isso para um amigo?" in ocr
    assert not any("community_ca" in l for l in ocr)
    assert not any("analysis of the marketing" in l.lower() for l in ocr)
    assert not any("black background" in l.lower() for l in ocr)


def test_sem_texto_devolve_vazio():
    assert extract_ocr_lines("## Texto no slide\n(sem texto)\n## Leitura visual\nfoto") == []


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
