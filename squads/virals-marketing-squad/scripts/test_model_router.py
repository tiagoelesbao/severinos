#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_model_router.py — VEX-14: descoberta dinâmica de modelos de texto free.

A lista fixa OPENROUTER_MODELS do recast_engine apodreceu (3 de 4 modelos → 404)
e a síntese do Chief falhou por esgotar a cascata. Estes testes travam o
comportamento do roteador que resolveu isso, SEM rede (as funções puras) e com
rede opcional (a descoberta, que nunca deve lançar).

Uso: python squads/virals-marketing-squad/scripts/test_model_router.py
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

import model_router  # noqa: E402
from model_router import (  # noqa: E402
    _eh_gratuito, _eh_texto, _util, discover_free_text_models,
    ROTEADOR_OFICIAL, _FALLBACK_ESTATICO,
)


# ── _eh_gratuito ─────────────────────────────────────────────────────────────
def test_gratuito_zero_nas_duas_pontas():
    assert _eh_gratuito({"pricing": {"prompt": "0", "completion": "0"}}) is True
    assert _eh_gratuito({"pricing": {"prompt": "0", "completion": "0.0000012"}}) is False
    assert _eh_gratuito({"pricing": {"prompt": "0.0000005", "completion": "0"}}) is False


def test_gratuito_sem_pricing_conta_como_zero():
    # O catálogo omite pricing em alguns modelos free.
    assert _eh_gratuito({}) is True


def test_gratuito_pricing_malformado_nao_lanca():
    assert _eh_gratuito({"pricing": {"prompt": "abc"}}) is False


# ── _eh_texto ────────────────────────────────────────────────────────────────
def test_texto_exige_entrada_e_saida_de_texto():
    assert _eh_texto({"architecture": {"input_modalities": ["text"],
                                       "output_modalities": ["text"]}}) is True
    # Só-visão (entra imagem, mas não gera texto) não serve para síntese.
    assert _eh_texto({"architecture": {"input_modalities": ["image"],
                                       "output_modalities": ["image"]}}) is False
    assert _eh_texto({}) is False


# ── _util ────────────────────────────────────────────────────────────────────
def test_util_exclui_moderacao_audio_embed():
    # Estes aceitam/geram texto mas não servem para análise/síntese.
    assert _util("meta-llama/llama-guard-4:free") is False
    assert _util("nvidia/nemotron-3.5-content-safety:free") is False
    assert _util("openai/whisper:free") is False
    assert _util("some/text-embedding:free") is False
    # Os que de fato geram análise:
    assert _util("qwen/qwen3-next-80b-a3b-instruct:free") is True
    assert _util("meta-llama/llama-3.3-70b-instruct:free") is True


# ── FALLBACK_ESTATICO ────────────────────────────────────────────────────────
def test_fallback_comeca_pelo_roteador_e_so_tem_uteis():
    # Rede de segurança quando o catálogo não responde. Se apodrecer como a lista
    # antiga, o bug volta — por isso é curto, encabeçado pelo roteador oficial
    # (que resolve disponibilidade na origem) e sem modelos inúteis.
    assert len(_FALLBACK_ESTATICO) > 0
    assert _FALLBACK_ESTATICO[0] == ROTEADOR_OFICIAL
    for mid in _FALLBACK_ESTATICO:
        assert _util(mid), f"{mid} não deveria estar no fallback"


# ── discover_free_text_models: contrato de degradação ────────────────────────
def test_discover_nunca_lanca_e_devolve_lista_util():
    lista = discover_free_text_models()
    assert isinstance(lista, list) and len(lista) > 0
    assert lista[0] == ROTEADOR_OFICIAL, "o roteador oficial deve ser a 1ª tentativa"
    assert all(isinstance(x, str) for x in lista)


def test_discover_sem_rede_cai_no_fallback(monkeypatch=None):
    # Simula catálogo indisponível E cache ausente: deve devolver o fallback,
    # nunca lançar. (Sem pytest-monkeypatch: troca a função de fetch na mão.)
    orig_urlopen = model_router.urllib.request.urlopen
    orig_cache = model_router._CACHE_FILE

    def _boom(*a, **k):
        raise OSError("sem rede (simulado)")

    try:
        model_router.urllib.request.urlopen = _boom
        model_router._CACHE_FILE = os.path.join(
            os.path.dirname(__file__), ".cache-inexistente-test.json")
        lista = discover_free_text_models(force=True)
        assert lista == list(_FALLBACK_ESTATICO)
    finally:
        model_router.urllib.request.urlopen = orig_urlopen
        model_router._CACHE_FILE = orig_cache


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
