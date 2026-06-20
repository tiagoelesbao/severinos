#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
quality_gate_video.py — MVC-04: Gate Terminal de Qualidade do Plano de Vídeo.

Etapa 4 do pipeline *industrialize-video renascido (EPIC-MKT-Video-Creative).
Espelha o quality_gate.py (estáticos), mas valida o content_plan de VÍDEO
(MVC-03). É o GATE TERMINAL: o que reprova aqui NÃO vai à produção.

Requisitos cravados pelo gate @qa da MVC-03 (CONCERNS):
  1. Fidelidade COMPLETA — não só números: liga detect_fabricated_numbers +
     detect_fabricated_claims + source_entities do recast_engine.
  2. BLOQUEANTE de verdade — violação de fidelidade/voz/CTA → FAIL (exit 2).
  3. Self-healing — tenta corrigir via LLM antes de barrar (máx 2 iterações).

Checklists V1–V7 (determinísticos):
  V1 Hook        — 3 variantes; text_overlay 4–7 palavras; pattern_interrupt.
  V2 Retenção    — ritmo dentro do checkpoint (~1,5–2s) via cut_cadence/storyboard.
  V3 Fid. núm.   — nenhum número fora da fala do benchmark (BLOQUEANTE).
  V4 Fid. qual.  — nenhuma atribuição/evidência inventada (BLOQUEANTE).
  V5 Voz/tabu    — nenhuma palavra de lexico.nunca_usar (BLOQUEANTE).
  V6 Shotlist    — todo plano tem o que gravar + fala-chave.
  V7 CTA         — sem cta_estilo.exemplos_proibidos (BLOQUEANTE).

Saída: grava brief["quality_gate_video"] + brief["_validation"] (consumido pela
MVC-05, que bloqueia a saída). Exit 2 se FAIL (bloqueado), 0 caso contrário.
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
from recast_engine import (  # noqa: E402
    call_llm_json,
    detect_fabricated_numbers,
    detect_fabricated_claims,
    source_entities,
)
from _client_resolver import (  # noqa: E402
    extract_client_arg,
    resolve_from_argv_or_brief,
)

MAX_ITERATIONS = 3
RETENTION_CHECKPOINT_S = 2.0
HOOK_OVERLAY_MAX_WORDS = 7

# Tokens TÉCNICOS de edição (cadência/duração/beat) — NÃO são fatos de conteúdo.
# Removidos antes do guard de NÚMEROS (V3) para evitar falso-positivo (ex.:
# "cut a cada 1,5‑2 s", "@ beat 3", "zoom 3s"). O guard de stats de conteúdo
# (inserts/scene) continua intacto — "8%" em "print churn 8%" NÃO é tempo.
_TIMING_RE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*[\-‐-―]\s*\d+(?:[.,]\d+)?\s*s\b"  # 1,5-2 s
    r"|\b\d+(?:[.,]\d+)?\s*s\b"                                        # 3s / 1,5 s
    r"|\bbeats?\s*\d+"                                                  # beat 3
    r"|\bpassos?\s*\d+"                                                 # passo 2
    r"|@\s*\d+(?:[.,]\d+)?\s*s?",                                       # @ 6s / @ beat
    re.IGNORECASE,
)


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


# ---------------------------------------------------------------------------
# Coleta de texto + fonte de fatos
# ---------------------------------------------------------------------------
def plan_text(plan, for_numbers=False):
    """TODO o texto gerado do plano (cobertura completa p/ fidelidade/voz).

    MVC-05/fix: inclui storyboard.scene/broll, edit_spec inteiro e rationale —
    onde fabricações se escondiam (ex.: "+150%" no scene, "churn ↓8%" no insert)
    e chegavam ao Plano-de-Criativo.md apesar do gate PASS.

    for_numbers=True (V3): remove tokens TÉCNICOS de edição (cadência/duração/
    beat) do bloco edit_spec antes da varredura de números — evita falso-positivo
    com "cut a cada 1,5‑2 s". Stats de conteúdo (inserts/scene) seguem checadas.
    """
    content = [plan.get("script", ""), plan.get("tema", ""), plan.get("rationale", "")]
    for v in (plan.get("hook", {}) or {}).get("variants", []) or []:
        content += [v.get("text_overlay", ""), v.get("spoken_open", "")]
    for s in plan.get("storyboard", []) or []:
        content += [s.get("on_screen_text", ""), s.get("scene", ""), s.get("broll", "")]
    for s in plan.get("shotlist", []) or []:
        content += [s.get("falas_chave", ""), s.get("plano", ""), s.get("props", "")]

    es = plan.get("edit_spec", {}) or {}
    edit = []
    for key in ("zooms", "transitions", "inserts", "motion_graphics"):
        edit += [str(x) for x in (es.get(key) or [])]
    edit.append(str(es.get("captions", "")))
    edit_text = " ".join(e for e in edit if e)
    if for_numbers:
        edit_text = _TIMING_RE.sub(" ", edit_text)

    return " ".join(c for c in content if c) + " " + edit_text


def transcript_text(brief):
    parts = [s.get("text", "") for s in brief.get("transcript", []) or []]
    caption = (brief.get("source", {}) or {}).get("caption") or ""
    return " ".join(parts + [caption]).strip()


def _last_text(plan):
    """Texto do fechamento (último storyboard + cauda do script) — alvo do CTA."""
    sb = plan.get("storyboard", []) or []
    tail = sb[-1].get("on_screen_text", "") if sb else ""
    script = plan.get("script", "") or ""
    return f"{tail} {script[-200:]}".strip()


# ---------------------------------------------------------------------------
# Checklists V1–V7 (determinísticos)
# ---------------------------------------------------------------------------
def check_video_plan(plan, brief, identity):
    """Roda V1–V7 e devolve {check: {ok, blocking, detail}}."""
    txt = plan_text(plan)
    transcript = transcript_text(brief)
    lexico = ((identity.get("tom_de_voz", {}) or {}).get("lexico", {}) or {})
    taboo = [w for w in (lexico.get("nunca_usar") or []) if w]
    cta_proibidos = ((identity.get("cta_estilo", {}) or {}).get("exemplos_proibidos") or [])

    # Pseudo-slide/brief para reusar os detectores do recast_engine (IDS REUSE).
    pseudo_slide = {"headline": "", "body_text": txt,
                    "reference_headline": "", "reference_body": transcript}
    # V3 usa texto com tokens de cadência/duração removidos (evita falso-positivo).
    pseudo_slide_num = {"headline": "", "body_text": plan_text(plan, for_numbers=True),
                        "reference_headline": "", "reference_body": transcript}
    pseudo_brief = {"benchmark_caption": transcript, "central_theme": plan.get("tema", ""),
                    "content_data": []}
    _ = source_entities(pseudo_brief)  # allowlist da fonte (transparência/uso futuro)

    checks = {}

    # V1 — Hook
    variants = (plan.get("hook", {}) or {}).get("variants", []) or []
    overlay_long = [v.get("text_overlay", "") for v in variants
                    if len((v.get("text_overlay") or "").split()) > HOOK_OVERLAY_MAX_WORDS]
    no_interrupt = [i + 1 for i, v in enumerate(variants) if not (v.get("pattern_interrupt") or "").strip()]
    checks["V1_hook"] = {
        "ok": len(variants) >= 3 and not overlay_long and not no_interrupt,
        "blocking": len(variants) < 3,  # <3 variantes é bloqueante; overlay longo é soft
        "detail": {"variants": len(variants), "overlay_acima_de_7_palavras": overlay_long,
                   "sem_pattern_interrupt": no_interrupt},
    }

    # V2 — Retenção (cut_cadence do benchmark OU média do storyboard)
    cadence = (brief.get("benchmark_analysis", {}) or {}).get("cut_cadence", {}) or {}
    sb = plan.get("storyboard", []) or []
    durs = [d for d in (s.get("duration_s") for s in sb) if isinstance(d, (int, float))]
    avg_sb = round(sum(durs) / len(durs), 2) if durs else None
    meets = bool(cadence.get("meets_retention_checkpoint")) or (
        avg_sb is not None and avg_sb <= RETENTION_CHECKPOINT_S + 0.5)
    checks["V2_retencao"] = {"ok": meets, "blocking": False,
                             "detail": {"avg_storyboard_s": avg_sb,
                                        "benchmark_meets": cadence.get("meets_retention_checkpoint")}}

    # V3 — Fidelidade de números (BLOQUEANTE) — timing técnico já removido.
    fab_num = detect_fabricated_numbers(pseudo_slide_num)
    checks["V3_fid_numeros"] = {"ok": not fab_num, "blocking": True,
                                "detail": {"fabricados": fab_num}}

    # V4 — Fidelidade qualitativa (BLOQUEANTE)
    fab_claims = detect_fabricated_claims(pseudo_slide)
    checks["V4_fid_qualitativa"] = {"ok": not fab_claims, "blocking": True,
                                    "detail": {"atribuicoes_inventadas": fab_claims}}

    # V5 — Voz / léxico-tabu (BLOQUEANTE)
    found_taboo = sorted({w for w in taboo
                          if re.search(rf"\b{re.escape(w)}\b", txt, re.IGNORECASE)})
    checks["V5_voz_tabu"] = {"ok": not found_taboo, "blocking": True,
                             "detail": {"palavras_tabu": found_taboo}}

    # V6 — Shotlist completa
    shots = plan.get("shotlist", []) or []
    incompletos = [i + 1 for i, s in enumerate(shots)
                   if not (s.get("plano") or "").strip() or not (s.get("falas_chave") or "").strip()]
    checks["V6_shotlist"] = {"ok": bool(shots) and not incompletos, "blocking": False,
                             "detail": {"total": len(shots), "incompletos": incompletos}}

    # V7 — CTA (BLOQUEANTE)
    last = _last_text(plan).lower()
    cta_hits = [c for c in cta_proibidos if c and c.lower() in last]
    checks["V7_cta"] = {"ok": not cta_hits, "blocking": True,
                        "detail": {"cta_proibido": cta_hits}}

    return checks


def blocking_failures(checks):
    """Lista de checks bloqueantes reprovados."""
    return [name for name, c in checks.items() if c["blocking"] and not c["ok"]]


def soft_failures(checks):
    return [name for name, c in checks.items() if not c["blocking"] and not c["ok"]]


# ---------------------------------------------------------------------------
# Self-healing — reparo via LLM dos itens bloqueantes textuais
# ---------------------------------------------------------------------------
def build_repair_prompt(plan, checks, transcript, identity):
    voz = yaml.dump({"tom_de_voz": identity.get("tom_de_voz", {}),
                     "cta_estilo": identity.get("cta_estilo", {})},
                    allow_unicode=True, sort_keys=False)
    issues = {
        "numeros_fabricados": checks["V3_fid_numeros"]["detail"]["fabricados"],
        "atribuicoes_inventadas": checks["V4_fid_qualitativa"]["detail"]["atribuicoes_inventadas"],
        "palavras_tabu": checks["V5_voz_tabu"]["detail"]["palavras_tabu"],
        "cta_proibido": checks["V7_cta"]["detail"]["cta_proibido"],
    }
    return f"""Você é o editor de fidelidade da Virals. O PLANO de vídeo abaixo
viola regras inegociáveis. Reescreva REMOVENDO as violações, mantendo tema, arco
e voz do cliente.

VIOLAÇÕES A CORRIGIR:
{json.dumps(issues, ensure_ascii=False, indent=1)}

REGRAS:
- Remova TODO número/percentual/data que não esteja na FALA DA FONTE abaixo.
- Remova atribuições/evidências inventadas ("pesquisa mostrou", "segundo X").
- Remova as palavras-tabu; troque por equivalente da voz do cliente.
- Reescreva qualquer CTA proibido como call-to-think.
- NÃO invente novos números, marcas, datas ou citações.

FALA DA FONTE (única origem de fato permitida):
{transcript[:2500]}

VOZ DO CLIENTE:
{voz}

PLANO ATUAL (corrija TODOS os campos abaixo — a fabricação costuma se esconder
em scene/inserts/rationale, não só no script):
script: {plan.get('script', '')}
rationale: {plan.get('rationale', '')}
hook_overlays: {[v.get('text_overlay', '') for v in (plan.get('hook', {}) or {}).get('variants', [])]}
hook_spoken: {[v.get('spoken_open', '') for v in (plan.get('hook', {}) or {}).get('variants', [])]}
on_screen: {[s.get('on_screen_text', '') for s in plan.get('storyboard', []) or []]}
scenes: {[s.get('scene', '') for s in plan.get('storyboard', []) or []]}
shotlist_falas: {[s.get('falas_chave', '') for s in plan.get('shotlist', []) or []]}
edit_inserts: {(plan.get('edit_spec', {}) or {}).get('inserts', [])}
edit_zooms: {(plan.get('edit_spec', {}) or {}).get('zooms', [])}
edit_motion: {(plan.get('edit_spec', {}) or {}).get('motion_graphics', [])}

Responda APENAS JSON, sem markdown, com os MESMOS comprimentos de lista:
{{"script":"...","rationale":"...","hook_overlays":["..."],"hook_spoken":["..."],"on_screen":["..."],"scenes":["..."],"shotlist_falas":["..."],"edit_inserts":["..."],"edit_zooms":["..."],"edit_motion":["..."]}}"""


def _apply_repair(plan, fixed):
    """Aplica o JSON de reparo de volta ao plano (conservador, por índice).

    Cobre todos os campos textuais (MVC-05/fix): script, rationale, hook,
    storyboard (on_screen_text + scene), shotlist.falas_chave e edit_spec.
    """
    if isinstance(fixed.get("script"), str) and fixed["script"].strip():
        plan["script"] = fixed["script"].strip()
    if isinstance(fixed.get("rationale"), str) and fixed["rationale"].strip():
        plan["rationale"] = fixed["rationale"].strip()
    variants = (plan.get("hook", {}) or {}).get("variants", []) or []
    for v, ov in zip(variants, fixed.get("hook_overlays", []) or []):
        if isinstance(ov, str) and ov.strip():
            v["text_overlay"] = ov.strip()
    for v, sp in zip(variants, fixed.get("hook_spoken", []) or []):
        if isinstance(sp, str) and sp.strip():
            v["spoken_open"] = sp.strip()
    sb = plan.get("storyboard", []) or []
    for s, ost in zip(sb, fixed.get("on_screen", []) or []):
        if isinstance(ost, str):
            s["on_screen_text"] = ost.strip()
    for s, sc in zip(sb, fixed.get("scenes", []) or []):
        if isinstance(sc, str) and sc.strip():
            s["scene"] = sc.strip()
    for s, fl in zip(plan.get("shotlist", []) or [], fixed.get("shotlist_falas", []) or []):
        if isinstance(fl, str):
            s["falas_chave"] = fl.strip()
    es = plan.get("edit_spec", {}) or {}
    for key, fixed_key in (("inserts", "edit_inserts"), ("zooms", "edit_zooms"),
                           ("motion_graphics", "edit_motion")):
        new_list = fixed.get(fixed_key)
        if isinstance(new_list, list) and len(new_list) == len(es.get(key) or []):
            es[key] = [str(x).strip() for x in new_list]
    plan["edit_spec"] = es


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def quality_gate_video(brief_path, max_iterations=MAX_ITERATIONS):
    brief_path = brief_path.strip()
    print(f"=== MVC-04: Quality Gate de Vídeo — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Video-brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    plan = brief.get("content_plan")
    if not plan:
        raise ValueError("Video-brief sem 'content_plan' — rode plan_video_creative.py (MVC-03) antes.")

    client = resolve_from_argv_or_brief(None, brief)
    identity = _load_yaml(client.brand_identity)
    transcript = transcript_text(brief)

    iterations, model_label = 0, None
    checks = check_video_plan(plan, brief, identity)

    # Self-healing: enquanto houver bloqueante textual e ainda houver iteração.
    while blocking_failures(checks) and iterations < max_iterations:
        iterations += 1
        print(f"Iteração {iterations}: bloqueantes → {blocking_failures(checks)}")
        prompt = build_repair_prompt(plan, checks, transcript, identity)
        try:
            fixed, model_label = call_llm_json(prompt, _extract_json)
        except (RuntimeError, json.JSONDecodeError, ValueError) as e:
            print(f"  ! reparo LLM indisponível ({e}) — mantendo plano, gate decidirá.")
            break
        _apply_repair(plan, fixed)
        checks = check_video_plan(plan, brief, identity)

    blockers = blocking_failures(checks)
    softs = soft_failures(checks)
    status = "FAIL" if blockers else ("CONCERNS" if softs else "PASS")

    # Persiste o veredito + flags consumidas pela MVC-05 (bloqueio de saída).
    brief["content_plan"] = plan
    brief["quality_gate_video"] = {
        "status": status,
        "iterations": iterations,
        "model": model_label,
        "blocking_failures": blockers,
        "soft_failures": softs,
        "checks": checks,
        "checked_at": datetime.datetime.now().isoformat(timespec="seconds"),
    }
    v = brief.setdefault("_validation", {})
    v["video_gate_status"] = status
    if blockers:
        v["video_fidelity_unresolved"] = {
            "numeros": checks["V3_fid_numeros"]["detail"]["fabricados"],
            "claims": checks["V4_fid_qualitativa"]["detail"]["atribuicoes_inventadas"],
            "tabu": checks["V5_voz_tabu"]["detail"]["palavras_tabu"],
            "cta": checks["V7_cta"]["detail"]["cta_proibido"],
        }
    else:
        v.pop("video_fidelity_unresolved", None)

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(status, checks, iterations, brief_path)
    return status


def _print_report(status, checks, iterations, brief_path):
    print("-" * 60)
    icon = {"PASS": "✅", "CONCERNS": "⚠️", "FAIL": "⛔"}.get(status, "?")
    print(f"Quality Gate de Vídeo: {icon} {status} (em {iterations} iteração/ões)")
    for name, c in checks.items():
        mark = "ok" if c["ok"] else ("BLOQUEIA" if c["blocking"] else "concern")
        print(f"  [{mark:>8}] {name}")
        if not c["ok"]:
            print(f"             {c['detail']}")
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)


if __name__ == "__main__":
    _client_slug, _rest = extract_client_arg(sys.argv[1:])
    if len(_rest) < 1:
        print("Uso: python squads/virals-marketing-squad/scripts/quality_gate_video.py "
              "<video-brief-*.yaml>")
        sys.exit(1)
    try:
        st = quality_gate_video(_rest[0])
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    # FAIL = bloqueado (exit 2) — sinaliza à MVC-05/CI que a saída está barrada.
    sys.exit(2 if st == "FAIL" else 0)
