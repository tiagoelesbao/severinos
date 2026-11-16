#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_fact_fidelity.py — MCI-06: testes do guard de fidelidade factual.

Cobre (sem rede / sem LLM):
  - detect_fabricated_numbers   (recast_engine)
  - sanitize_author_refs        (recast_engine)
  - _render_blockers            (design_creative)

Uso: python squads/virals-marketing-squad/scripts/test_fact_fidelity.py
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

from recast_engine import (  # noqa: E402
    detect_fabricated_numbers, sanitize_author_refs, _norm_num, _looks_broken,
    source_entities, detect_fabricated_claims,
)
from design_creative import _render_blockers  # noqa: E402


# ── detect_fabricated_numbers ────────────────────────────────────────────────
def test_detect_flags_percentage_not_in_source():
    s = {"headline": "VENDAS SUBIRAM 34%", "body_text": "",
         "reference_headline": "as vendas dispararam", "reference_body": ""}
    assert "34%" in detect_fabricated_numbers(s)


def test_detect_flags_multiplier_and_magnitude_and_fake_research():
    s = {"headline": "ROSA GERA 1,8× MAIS",
         "body_text": "+1,2 mi de unidades; segundo pesquisa interna das marcas",
         "reference_headline": "rosa chama atenção", "reference_body": ""}
    flagged = detect_fabricated_numbers(s)
    assert any("1,8" in f for f in flagged)
    assert any("1,2" in f for f in flagged)
    assert any("pesquisa" in f.lower() for f in flagged)


def test_detect_ignores_small_count():
    # "4 marcas" é contagem, não estatística — não deve ser flaggado.
    s = {"headline": "AS 4 MARCAS DISPUTAM",
         "body_text": "Nike, Adidas, Puma e New Balance no mesmo campo",
         "reference_headline": "Nike Adidas Puma New Balance", "reference_body": ""}
    assert detect_fabricated_numbers(s) == []


def test_detect_allows_number_present_in_source():
    s = {"headline": "46 DE 64 TITULARES",
         "body_text": "",
         "reference_headline": "46 dos 64 titulares usaram rosa",
         "reference_body": ""}
    assert detect_fabricated_numbers(s) == []


def test_detect_flags_large_plain_counts():
    # "1.200 fotos" e "500 análises" são contagens grandes inventadas.
    s = {"headline": "A CONFIRMAÇÃO",
         "body_text": "mais de 1.200 fotos e 500 análises confirmam a tendência",
         "reference_headline": "não é impressão minha", "reference_body": ""}
    flagged = detect_fabricated_numbers(s)
    assert any(_norm_num(f) == "1200" for f in flagged)
    assert any(f.strip() == "500" for f in flagged)


def test_detect_ignores_year():
    s = {"headline": "COPA 2022 FOI ROSA", "body_text": "",
         "reference_headline": "a cor dominou a copa", "reference_body": ""}
    assert detect_fabricated_numbers(s) == []


# ── sanitize_author_refs ─────────────────────────────────────────────────────
def test_sanitize_removes_handle_and_author_name():
    brief = {
        "carousel_brief": {"source_url": "https://www.instagram.com/falajoaobranco/p/X/"},
        "benchmark_caption": "João Branco @falajoaobranco on June 14",
        "content_data": [
            {"slide_n": 1,
             "headline": "JOÃO BRANCO @FALAJOAOBRANCO EXPLICA A COR",
             "body_text": "Segundo falajoaobranco, a cor virou tendência.",
             "reference_headline": "João Branco @falajoaobranco", "reference_body": ""},
        ],
    }
    sanitize_author_refs(brief)
    h = brief["content_data"][0]["headline"]
    b = brief["content_data"][0]["body_text"]
    assert "@" not in h and "@" not in b
    assert "FALAJOAOBRANCO" not in h.upper()
    assert "falajoaobranco" not in b.lower()
    assert "JOÃO BRANCO" not in h.upper()


def test_sanitize_never_blanks_a_headline():
    # Headline composta SÓ de handle+nome do autor não pode virar string vazia.
    brief = {
        "carousel_brief": {"source_url": "https://www.instagram.com/falajoaobranco/p/X/"},
        "content_data": [
            {"slide_n": 1, "headline": "JOÃO BRANCO @FALAJOAOBRANCO", "body_text": "",
             "reference_headline": "João Branco @falajoaobranco", "reference_body": ""},
        ],
    }
    sanitize_author_refs(brief)
    assert brief["content_data"][0]["headline"].strip() != ""


def test_sanitize_keeps_brand_names_in_body():
    brief = {
        "carousel_brief": {"source_url": "https://www.instagram.com/falajoaobranco/p/X/"},
        "content_data": [
            {"slide_n": 1, "headline": "A GUERRA DAS MARCAS",
             "body_text": "Nike, Adidas e Puma disputam o campo.",
             "reference_headline": "", "reference_body": ""},
        ],
    }
    sanitize_author_refs(brief)
    b = brief["content_data"][0]["body_text"]
    assert "Nike" in b and "Adidas" in b and "Puma" in b


# ── _looks_broken + sanitização clause-aware (MCI-07/A2) ─────────────────────
def test_looks_broken_detects_orphan_verb_and_conjunction():
    assert _looks_broken("garante que as vendas vão decolar")   # minúscula inicial
    assert _looks_broken("que, a partir de agora, sobe")        # conjunção solta
    assert not _looks_broken("A reação não deixa dúvidas")      # frase completa


def test_sanitize_flags_broken_without_identity():
    # Sem identity, frase quebrada é mantida mas SINALIZADA para revisão.
    brief = {
        "carousel_brief": {"source_url": "https://www.instagram.com/falajoaobranco/p/X/"},
        "content_data": [
            {"slide_n": 1, "headline": "VENDAS VÃO DISPARAR",
             "body_text": "João Branco garante que as vendas vão decolar",
             "reference_headline": "João Branco @falajoaobranco",
             "reference_body": "as vendas vão disparar"},
        ],
    }
    sanitize_author_refs(brief)  # sem identity → não chama LLM
    arts = (brief.get("_validation") or {}).get("sanitization_artifacts") or []
    assert 1 in arts
    assert "joão branco" not in brief["content_data"][0]["body_text"].lower()


# ── source_entities (allowlist do guard qualitativo — MCI-07/B2) ─────────────
def test_source_entities_includes_source_brands_excludes_invented():
    brief = {
        "benchmark_caption": "A FIFA cobriu o nome da Levi's nos estádios.",
        "central_theme": "",
        "content_data": [
            {"slide_n": 1, "reference_headline": "Nike, Adidas e Puma disputam a Copa 2026",
             "reference_body": "New Balance também entrou."},
        ],
    }
    ents = source_entities(brief)
    # presentes na fonte → permitidas
    for e in ("nike", "adidas", "puma", "fifa", "copa", "2026"):
        assert e in ents, f"esperava '{e}' na allowlist"
    # NÃO presentes na fonte → não entram (serão suspeitas no guard)
    assert "espn" not in ents
    assert "março" not in ents


# ── detect_fabricated_claims (fabricação qualitativa — MCI-07/B) ─────────────
def _claim(h, b=""):
    return {"slide_n": 1, "headline": h, "body_text": b}


def test_claims_flags_invented_attributions():
    assert detect_fabricated_claims(_claim("", "destacadas nas campanhas publicitárias oficiais"))
    assert detect_fabricated_claims(_claim("", "aumento nas menções online"))
    assert detect_fabricated_claims(_claim("", "Análises de mídia mostraram a tendência"))
    assert detect_fabricated_claims(_claim("", "Relatórios de mercado apontam crescimento"))
    assert detect_fabricated_claims(_claim("", "em entrevista à ESPN, diretores confirmaram"))
    # recall ampliado: atribuição por papel + "testes de laboratório"
    assert detect_fabricated_claims(_claim("", "Treinadores de diferentes seleções confirmam a adoção"))
    assert detect_fabricated_claims(_claim("", "Os testes de laboratório revelam melhor aderência"))


def test_claims_does_not_flag_grounded_source_paraphrase():
    # Estes eram FALSOS-POSITIVOS do grounding aberto — agora NÃO disparam.
    assert detect_fabricated_claims(_claim("POR QUE QUASE TODOS OS JOGADORES ESTÃO USANDO CHUTEIRA ROSA?")) == []
    assert detect_fabricated_claims(_claim("NÃO IMPORTA A SELEÇÃO NEM A MARCA: CHUTEIRAS ROSAS DOMINAM")) == []
    assert detect_fabricated_claims(_claim("", "as vendas de chuteira rosa vão disparar no mundo")) == []
    assert detect_fabricated_claims(_claim("", "a chuteira é um dos poucos itens que o atleta personaliza")) == []


# ── _render_blockers ─────────────────────────────────────────────────────────
def test_blockers_flags_fail_and_pending_and_placeholder():
    brief = {
        "_validation": {"status": "FAIL"},
        "content_data": [
            {"slide_n": 1, "headline": "OK", "personalization": {"status": "PENDING_RECAST"}},
            {"slide_n": 2, "headline": "[RECAST PENDENTE]", "personalization": {"status": "DONE"}},
        ],
    }
    reasons = _render_blockers(brief)
    assert any("FAIL" in r for r in reasons)
    assert any("pendente" in r for r in reasons)
    assert any("placeholder" in r for r in reasons)


def test_blockers_flags_unresolved_fabrication():
    brief = {"_validation": {"status": "PASS", "fact_fidelity_unresolved": {1: ["30%"]}},
             "content_data": [{"slide_n": 1, "headline": "OK",
                               "personalization": {"status": "DONE"}}]}
    reasons = _render_blockers(brief)
    assert any("fabricados" in r for r in reasons)


def test_blockers_empty_when_clean():
    brief = {"_validation": {"status": "PASS"},
             "content_data": [{"slide_n": 1, "headline": "COPY LIMPA",
                               "personalization": {"status": "DONE"}}]}
    assert _render_blockers(brief) == []


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
