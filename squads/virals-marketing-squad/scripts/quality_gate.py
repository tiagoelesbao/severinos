#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
quality_gate.py — MCI-03: Checklists de Produção + Loop Self-Healing.

Valida cada slide produzido contra os checklists de qualidade. Slide reprovado
é corrigido automaticamente pelo LLM e revalidado, em loop, até passar — ou
atingir o limite de iterações (sem bloqueio manual).

Saída: aplica correções ao content_data e grava brief["quality_gate"].

Pipeline: ... -> recast_engine -> [quality_gate] -> orchestrate
"""

import os
import re
import sys
import json
import datetime

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML ausente. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recast_engine import (             # noqa: E402
    call_llm_json,
    enforce_fact_fidelity,
    enforce_qualitative_fidelity,
    sanitize_author_refs,
)
from deep_modeler import text_metrics   # noqa: E402
from _client_resolver import resolve_from_argv_or_brief  # noqa: E402
from copy_guardrails import check_slide, build_editor_prompt  # noqa: E402

# Quantas vezes o editor-especialista tenta consertar antes do fallback determinístico.
EDITOR_MAX_PASSES = 2

MAX_ITERATIONS = 3

# Fonte canônica dos critérios C1-C7 — lidos do checklist .md no boot.
# Fallback hardcoded apenas se o arquivo estiver ausente (degradação graciosa).
CHECKLIST_PATH = (
    "squads/virals-marketing-squad/checklists/creative-quality-checklist.md"
)

_FALLBACK_CHECKLIST = [
    "C1 — PT-BR: headline e body em português (anglicismo só se consagrado).",
    "C2 — Sem @handle, assinatura ou marca d'água de terceiros.",
    "C3 — Dentro do TEMA CENTRAL do criativo.",
    "C4 — Voz Virals: sem promessa vazia, corporativês, linguagem genérica, "
    "ego-driven ou mistério.",
    "C5 — Headline não-vazia e não é placeholder ('[RECAST PENDENTE]').",
    "C6 — Comprimento adequado: headline concisa; body de 1 a 3 frases.",
    "C7 — Headline e body SEM emoji e SEM hashtag (#) — texto limpo e profissional.",
    "C8 — Voz do cliente: headline OU body deve ser CONCRETO — ancorado em "
    "bastidor/processo/lugar/método/fato real. NÚMERO só é aceitável se já "
    "existir na fonte; é PROIBIDO inventar estatística, %, '1,8×', '+1,2 mi', "
    "'subiu 34%' ou 'pesquisa/dados internos'. Reprovar motivacional genérico "
    "sem evidência — mas concretude vem de fato real, jamais de número fabricado.",
    "C9 — CTA proibido: último slide NÃO pode conter 'comente X', 'link na bio', "
    "'zona de conforto', 'extraordinário', etc. Reescrever como call-to-think.",
]


def _load_checklist(path=CHECKLIST_PATH):
    """Lê os itens C{n} — ... do checklist .md (AIOX-04)."""
    if not os.path.exists(path):
        print(f"AVISO: checklist '{path}' ausente — usando fallback in-code.",
              file=sys.stderr)
        return list(_FALLBACK_CHECKLIST)
    items = []
    pattern = re.compile(r"^[-*]\s+(C\d+\s+[—-].+)$")
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            m = pattern.match(raw_line.strip())
            if m:
                items.append(m.group(1).strip())
    if not items:
        print(f"AVISO: nenhum critério parseado em '{path}' — usando fallback.",
              file=sys.stderr)
        return list(_FALLBACK_CHECKLIST)
    return items


CHECKLIST = _load_checklist()


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(text):
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    return json.loads(cleaned)


def build_gate_prompt(slides, central_theme):
    slide_lines = []
    for s in slides:
        slide_lines.append(
            f"Slide {s['slide_n']}:\n"
            f"  headline: \"{s.get('headline', '')}\"\n"
            f"  body: \"{s.get('body_text', '')}\""
        )
    slides_block = "\n\n".join(slide_lines)
    checklist = "\n".join(CHECKLIST)

    return f"""Você é o Auditor de Qualidade de Criativos da Virals. Avalie cada
slide contra o CHECKLIST e, para qualquer item reprovado, entregue a versão
CORRIGIDA do texto.

TEMA CENTRAL — escopo obrigatório do criativo:
"{central_theme}"

CHECKLIST:
{checklist}

SLIDES PRODUZIDOS:
{slides_block}

IMPORTANTE — CONVERGÊNCIA: reprove APENAS violações CLARAS e OBJETIVAS do
checklist (ex.: tem emoji, tem hashtag, está em inglês, tem @handle). Se o item
está aceitável, APROVE. NÃO reprove por preferência subjetiva de estilo. O alvo
é convergir rápido: corrija o que está claramente errado e aprove o resto.

Para CADA slide, retorne:
- aprovado: true se passa em TODOS os itens; false caso contrário.
- problemas: lista dos itens reprovados (vazia se aprovado).
- headline: a headline — CORRIGIDA se havia problema, senão a mesma.
- body: o body — CORRIGIDO se havia problema, senão o mesmo.

Ao corrigir, MANTENHA sempre o tema central e a voz Virals. headline/body
sempre em PT-BR.

Responda APENAS JSON válido, sem markdown:
{{"slides":[{{"slide_n":1,"aprovado":true,"problemas":[],"headline":"...","body":"..."}}]}}"""


def _source_ref_for_slide(brief, slide):
    """Recupera a copy-fonte boa do benchmark para reancorar o editor.

    O fallback final de qualidade é sempre a fonte — ela já era boa. Preferimos
    a linha de referência do próprio slide; se vazia, a caption do benchmark.
    """
    ref_h = (slide.get("reference_headline") or "").strip()
    ref_b = (slide.get("reference_body") or "").strip()
    if ref_h or ref_b:
        return f"{ref_h}\n{ref_b}".strip()
    return (brief.get("benchmark_caption") or "").strip()


def _run_expert_editor(brief, slides, central_theme):
    """Guardrails determinísticos + editor-especialista que reescreve.

    Retorna 'clean' | 'improved' | 'hard_fail'. Nunca lança.
    """
    def _hook_flags():
        return [(i == 0) or str(s.get("variant", "")).upper() == "HOOK"
                for i, s in enumerate(slides)]

    hooks = _hook_flags()

    def _failing():
        out = []
        for s, is_hook in zip(slides, hooks):
            probs = check_slide(s, is_hook=is_hook)
            if probs:
                out.append((s, is_hook, probs))
        return out

    failing = _failing()
    if not failing:
        print("Editor-especialista: copy já dentro do padrão (0 slides reprovados).")
        return "clean"

    print(f"Editor-especialista: {len(failing)} slide(s) reprovado(s) pelos guardrails — reescrevendo...")
    source_caption = brief.get("benchmark_caption", "")

    for att in range(1, EDITOR_MAX_PASSES + 1):
        payload = [{
            "slide_n": s.get("slide_n"), "is_hook": is_hook,
            "headline": s.get("headline", ""), "body_text": s.get("body_text", ""),
            "problemas": probs,
        } for (s, is_hook, probs) in failing]

        prompt = build_editor_prompt(payload, source_caption, central_theme)
        try:
            result, _model = call_llm_json(prompt, _extract_json)
            by_n = {int(r["slide_n"]): r for r in result.get("slides", [])}
        except Exception as e:  # noqa: BLE001 — editor é não-fatal
            print(f"  editor: LLM indisponível ({e}) — indo para fallback.")
            break

        for (s, _is_hook, _p) in failing:
            r = by_n.get(int(s["slide_n"]), {})
            if r.get("headline"):
                s["headline"] = str(r["headline"]).strip().upper()
            if r.get("body") is not None:
                s["body_text"] = str(r["body"]).strip()
            s["text_metrics"] = text_metrics(s["headline"], s.get("body_text", ""))

        failing = _failing()
        if not failing:
            print(f"  editor: convergiu na passagem {att}.")
            return "improved"
        print(f"  editor: passagem {att} — restam {len(failing)} slide(s).")

    # ── Fallback determinístico: a fonte é o piso ────────────────────────────
    # O editor LLM não convergiu. Em vez de publicar jargão, reancoramos na
    # copy-fonte do benchmark (que já era boa) e cortamos no limite duro.
    still = _failing()
    for (s, is_hook, _probs) in still:
        src = _source_ref_for_slide(brief, s)
        if src:
            first = re.split(r"[.!?\n]+", src)[0].strip()
            if first:
                s["headline"] = first[:52].strip().upper()
        # corte duro do corpo, preservando frases inteiras
        body = str(s.get("body_text", ""))
        if len(body) > 200:
            sentences = re.split(r"(?<=[.!?])\s+", body)
            trimmed = ""
            for sent in sentences:
                if len(trimmed) + len(sent) > 200:
                    break
                trimmed += (" " if trimmed else "") + sent
            s["body_text"] = (trimmed or body[:200]).strip()
        s["text_metrics"] = text_metrics(s["headline"], s.get("body_text", ""))

    remaining = _failing()
    if remaining:
        print(f"  fallback aplicado; {len(remaining)} slide(s) ainda no limite — marcando CONCERNS_COPY.")
        return "hard_fail"
    print("  fallback determinístico reancorou na fonte — dentro do padrão.")
    return "improved"


def quality_gate(brief_path, max_iterations=MAX_ITERATIONS):
    brief_path = brief_path.strip()
    print(f"=== MCI-03: Quality Gate — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    slides = brief.get("content_data", [])
    if not slides:
        raise ValueError("Brief sem content_data.")

    central_theme = (brief.get("central_theme")
                     or (brief.get("benchmark_analysis", {}) or {}).get("tema_central", "")
                     or "(tema não definido)")

    status, model_label, iterations = "WARN_MAX_ITER", None, 0
    for it in range(1, max_iterations + 1):
        iterations = it
        prompt = build_gate_prompt(slides, central_theme)
        result, model_label = call_llm_json(prompt, _extract_json)
        by_n = {int(s["slide_n"]): s for s in result.get("slides", [])}

        failures = []
        for s in slides:
            r = by_n.get(s["slide_n"], {})
            # Aplica a versão devolvida (corrigida ou mantida).
            if r.get("headline"):
                s["headline"] = str(r["headline"]).strip().upper()
            if r.get("body") is not None:
                s["body_text"] = str(r["body"]).strip()
            s["text_metrics"] = text_metrics(s["headline"], s.get("body_text", ""))
            if not r.get("aprovado", False):
                failures.append({"slide_n": s["slide_n"],
                                 "problemas": r.get("problemas", [])})

        print(f"Iteração {it}: {len(failures)} slide(s) reprovado(s)")
        for f in failures:
            for p in f["problemas"]:
                print(f"  s{f['slide_n']}: {p}")

        if not failures:
            status = "PASS"
            break

    # ── EDITOR-ESPECIALISTA (barra de qualidade independente do LLM) ──────────
    # O loop acima só pega violações mecânicas. Aqui rodam os guardrails
    # determinísticos (densidade, hook fraco, jargão abstrato) e o editor com
    # rubrica Hormozi/MrBeast/Ladeira REESCREVE o que reprovar. Piso de
    # qualidade que não depende do modelo ter caprichado na geração.
    editor_status = _run_expert_editor(brief, slides, central_theme)
    if editor_status == "hard_fail" and status == "PASS":
        status = "CONCERNS_COPY"  # o render (design_creative) barra

    # ── MCI-06: GUARD TERMINAL ────────────────────────────────────────────────
    # O quality_gate é um reescritor LLM e pode reintroduzir números fabricados.
    # Por isso a fidelidade factual + a sanitização de autor rodam por ÚLTIMO,
    # depois da convergência do checklist — esta é a última transformação de
    # texto antes da escrita. Decisão de arquitetura (a) da MCI-06.
    client = resolve_from_argv_or_brief(None, brief)
    identity = _load_yaml(client.brand_identity)
    print("Guard terminal: fidelidade factual + qualitativa + sanitização de autor...")
    enforce_fact_fidelity(brief, identity, model_label)
    enforce_qualitative_fidelity(brief, identity, model_label)
    sanitize_author_refs(brief, identity)

    v = brief.get("_validation", {}) or {}
    if (v.get("fact_fidelity_unresolved") or v.get("qualitative_unresolved")) and status == "PASS":
        status = "CONCERNS_FIDELITY"  # gate de render (design_creative) vai barrar

    brief["quality_gate"] = {
        "status": status,
        "iterations": iterations,
        "model": model_label,
        "checked_at": datetime.datetime.now().isoformat(timespec="seconds"),
    }
    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    print("-" * 60)
    print(f"Quality Gate: {status} (em {iterations} iteração/ões)")
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)
    return status


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python squads/virals-marketing-squad/scripts/quality_gate.py <brief-v5-*.yaml>")
        sys.exit(1)
    try:
        quality_gate(sys.argv[1])
    except (FileNotFoundError, ValueError, RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
