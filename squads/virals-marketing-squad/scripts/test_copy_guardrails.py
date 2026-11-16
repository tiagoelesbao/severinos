#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_copy_guardrails.py — a barra de qualidade de copy é o piso independente do
LLM; precisa ser confiável. Testes puros, sem rede.

Uso: python squads/virals-marketing-squad/scripts/test_copy_guardrails.py
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

from copy_guardrails import check_slide, check_brief, build_editor_prompt  # noqa: E402


# ── o caso REAL que motivou tudo ─────────────────────────────────────────────
def test_reprova_o_output_ruim_real():
    # O hook que passou no gate antigo e o dono reprovou.
    s = {
        "variant": "HOOK",
        "headline": "O PROBLEMA ESTÁ ESCONDIDO NO BASTIDOR DO SEU SISTEMA DE PRÉ-VISUALIZAÇÃO",
        "body_text": ("Antes de publicar um Reel, o sistema identifica contraste fraco, "
                      "tipografia ilegível e uso confuso de espaço negativo. Ver o log de "
                      "produção evita que você lance um vídeo que já começa com baixa taxas "
                      "de alcance. Já vimos Reels cair por causa de uma paleta monótona."),
    }
    probs = check_slide(s, is_hook=True)
    # tem que pegar: comprimento, densidade, jargão na manchete, jargão no corpo, hook fraco
    assert len(probs) >= 4, f"guardrail frouxo demais: {probs}"
    assert any("jargão abstrato na manchete" in p for p in probs)
    assert any("benefício" in p.lower() for p in probs)


def test_aprova_o_hook_bom_da_fonte():
    # A copy-fonte original (que o pipeline deveria ter preservado) passa limpa.
    s = {"variant": "HOOK",
         "headline": "SEU REEL DÁ SINAIS DE FLOP ANTES DE POSTAR",
         "body_text": "Existe um teste rápido pra saber onde o conteúdo perde força antes de ir pro feed."}
    assert check_slide(s, is_hook=True) == []


def test_hook_curto_e_concreto_passa():
    s = {"variant": "HOOK",
         "headline": "O TESTE DE 5 SEGUNDOS PRO SEU CRIATIVO",
         "body_text": "Mostre pra um amigo. Se ele não mandaria pra outro, falta utilidade."}
    assert check_slide(s, is_hook=True) == []


def test_reprova_manchete_longa():
    s = {"variant": "HOOK", "headline": "A" * 60, "body_text": "curto"}
    probs = check_slide(s, is_hook=True)
    assert any("longa demais" in p for p in probs)


def test_reprova_corpo_denso():
    s = {"headline": "OK CURTA", "body_text": "frase. " * 40}
    probs = check_slide(s, is_hook=False)
    assert any("denso" in p or "muitas frases" in p for p in probs)


def test_jargao_permitido_como_contexto_no_corpo_uma_vez():
    # "sistema" uma vez no corpo, com hook bom, NÃO reprova (é tempero).
    s = {"variant": "HOOK",
         "headline": "COMO SABER SE SEU ANÚNCIO VAI VENDER",
         "body_text": "A gente testa no sistema antes de subir. Simples assim."}
    assert check_slide(s, is_hook=True) == []


def test_hook_flag_por_posicao_e_por_variant():
    slides = [
        {"headline": "O PROBLEMA ESTÁ NO SEU SISTEMA DE PRÉ-VISUALIZAÇÃO ABSTRATA GIGANTE", "body_text": "x"},
        {"variant": "CTA", "headline": "MANCHETE CURTA OK", "body_text": "corpo curto e simples aqui."},
    ]
    res = check_brief(slides)
    assert 1 in res  # primeiro slide é hook por posição e reprova


def test_reprova_formalidade_excessiva():
    # O resíduo formal do output real: "validação pré-publicação", "critério técnico".
    s = {"variant": "CONTENT",
         "headline": "O CRITÉRIO DE OURO",
         "body_text": "Se a resposta for não, o conteúdo carece de utilidade. Refine para gerar intenção de envio antes da publicação."}
    probs = check_slide(s, is_hook=False)
    assert any("formal" in p for p in probs), probs


def test_hook_com_um_termo_formal_ja_reprova():
    s = {"variant": "HOOK", "headline": "VALIDAÇÃO PRÉ-PUBLICAÇÃO DO SEU REEL", "body_text": "curto e simples."}
    probs = check_slide(s, is_hook=True)
    assert any("formal" in p for p in probs)


def test_texto_coloquial_passa():
    s = {"variant": "HOOK",
         "headline": "SEU REEL VAI FLOPAR? TEM UM TESTE",
         "body_text": "Mostra pra um amigo. Se ele não mandaria pra ninguém, falta utilidade. Ajusta antes de postar."}
    assert check_slide(s, is_hook=True) == []


def test_reprova_placeholder_de_letra():
    # O resíduo real: "quando a fundadora da marca Y aparece..."
    s = {"headline": "QUANDO A PESSOA É A MARCA",
         "body_text": "Quando a fundadora da marca Y aparece em cada vídeo, a comunidade responde."}
    probs = check_slide(s, is_hook=False)
    assert any("placeholder" in p for p in probs), probs
    # também na variante "franquias Y"
    s2 = {"headline": "NA REDE DE FRANQUIAS Y", "body_text": "curto."}
    assert any("placeholder" in p for p in check_slide(s2, is_hook=False))


def test_nao_reprova_letra_legitima():
    # "plano B", "geração Z", "vitamina C" NÃO são placeholders — não reprovar.
    for txt in ["Vá para o plano B agora", "A geração Z consome assim", "Tome vitamina C"]:
        s = {"headline": "OK", "body_text": txt}
        assert not any("placeholder" in p for p in check_slide(s, is_hook=False)), txt


def test_build_editor_prompt_traz_fonte_e_rubrica():
    payload = [{"slide_n": 1, "is_hook": True, "headline": "X", "body_text": "Y", "problemas": ["hook fraco"]}]
    prompt = build_editor_prompt(payload, "Seu Reel dá sinais de flop antes de postar.", "tema teste")
    assert "HORMOZI" in prompt and "MRBEAST" in prompt and "LADEIRA" in prompt
    assert "flop" in prompt  # a copy-fonte foi injetada
    assert "benefício" in prompt.lower()


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
