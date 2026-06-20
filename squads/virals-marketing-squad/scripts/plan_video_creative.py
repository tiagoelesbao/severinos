#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plan_video_creative.py — MVC-03: Motor de Planejamento de Criativo de Vídeo.

Etapa 3 (coração) do pipeline *industrialize-video renascido
(EPIC-MKT-Video-Creative). Espelha o plan_creative.py (estáticos), mas entrega
um PLANO AUDIOVISUAL COMPLETO na voz do cliente, usando o benchmark como bússola.

Lê o video-brief.yaml (com benchmark_analysis da MVC-02) + a brand-identity do
cliente, e grava brief["content_plan"]:

  - hook        : 3 variantes (pattern_interrupt + text_overlay 4–7 palavras +
                  spoken_open) — estratégia "1 body, 3 hooks".
  - storyboard  : batida-a-batida (scene, shot_type, duration_s, on_screen_text,
                  broll, motion) com checkpoints de retenção.
  - script      : roteiro integral remodelado na voz do cliente (sem fabricar dados).
  - edit_spec   : onde entram zooms, transições, inserts, legendas, motion graphics.
  - shotlist    : 🎥 material bruto a captar (plano, framing, audio, props,
                  locacao, falas_chave) — o output que o usuário leva para gravar.

Fidelidade de fatos: reusa detect_fabricated_numbers() do recast_engine — números
no plano que NÃO existem no transcript do benchmark são sinalizados (a MVC-04 é o
gate terminal que bloqueia).

Pipeline: deep_modeler_video -> analyze_video_benchmark -> [plan_video_creative]
          -> quality_gate_video
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
from recast_engine import call_llm_json, detect_fabricated_numbers  # noqa: E402
from _client_resolver import (  # noqa: E402
    extract_client_arg,
    resolve_from_argv_or_brief,
)
from video_templates import load_video_templates, recommend  # noqa: E402  (MVC-06)


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


def _transcript_text(brief):
    """Concatena a fala real do benchmark — fonte de verdade para fidelidade."""
    parts = [s.get("text", "") for s in brief.get("transcript", []) or []]
    caption = (brief.get("source", {}) or {}).get("caption") or ""
    return " ".join(parts + [caption]).strip()


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
def build_plan_prompt(brief, identity):
    analysis = brief.get("benchmark_analysis", {}) or {}
    beats = brief.get("beats", []) or []
    hook_raw = brief.get("hook_raw", "")
    meta = brief.get("metadata", {}) or {}

    beat_lines = []
    for b in beats:
        beat_lines.append(
            f"[{b.get('start')}s–{b.get('end')}s] ({b.get('role')}) {b.get('text', '')[:200]}"
        )
    beats_block = "\n".join(beat_lines) or "(sem batidas)"

    # Injeção ampla de voz (espelha plan_creative): tom, léxico, cta, restrições.
    voz = yaml.dump(
        {"tom_de_voz": identity.get("tom_de_voz", {}),
         "lexico": (identity.get("tom_de_voz", {}) or {}).get("lexico", {}),
         "cta_estilo": identity.get("cta_estilo", {}),
         "restricoes": identity.get("restricoes", {})},
        allow_unicode=True, sort_keys=False,
    )
    client_label = identity.get("perfil", {}).get("identidade", "do cliente")
    duration = meta.get("duration_seconds") or "?"

    return f"""Você é o Diretor de Criativo de Vídeo da Virals. Projete o PLANO
COMPLETO de um vídeo curto autêntico de {client_label}, usando o benchmark de
ALTA PERFORMANCE abaixo como BÚSSOLA (não cópia).

REGRAS INEGOCIÁVEIS:
- O TEMA e os FATOS vêm do benchmark — modelagem, não reinvenção.
- A VOZ é do cliente (abaixo): troca o jeito de falar, não o assunto.
- FIDELIDADE: só cite número/percentual/data/quantidade que JÁ EXISTA na fala do
  benchmark. É PROIBIDO inventar estatística ("+34%", "1,8×", "1,2 mi", "pesquisa
  mostrou"). Sem número na fonte → NÃO peça um. Concretude vem de fato real ou do
  léxico do cliente.
- AUTOR DO BENCHMARK ≠ PERSONAGEM: nunca apresente o autor da referência como
  personagem/fonte/entrevistado. O vídeo é do cliente, em PT-BR.
- HOOK (0–3s): drop-off acontece aqui. Entregue 3 VARIANTES (estratégia "1 body,
  3 hooks"): cada uma = pattern_interrupt visual + text_overlay (4–7 palavras) +
  spoken_open (fala de abertura keyword-rich).
- RITMO: trate cada ~1,5–2s como checkpoint de retenção (corte/zoom/insert/virada).
- CTA: siga cta_estilo.preferencia (call-to-think). PROIBIDO usar cta_estilo.exemplos_proibidos.
- Evite TODA palavra de lexico.nunca_usar e respeite restricoes.nunca_fazer.

ANÁLISE DE RETENÇÃO DO BENCHMARK:
{json.dumps(analysis, ensure_ascii=False, indent=1)}

HOOK ORIGINAL (0–3s): {hook_raw or '(sem hook)'}
DURAÇÃO ALVO: ~{duration}s

BATIDAS DO BENCHMARK (tema/fatos a preservar):
{beats_block}

VOZ DO CLIENTE:
{voz}

Projete o plano. Responda APENAS JSON válido, sem markdown:
{{"tema":"...","format_concept":"talking-head|skit|tutorial|reaction",
"hook":{{"variants":[{{"pattern_interrupt":"...","text_overlay":"4–7 palavras","spoken_open":"..."}},{{"pattern_interrupt":"...","text_overlay":"...","spoken_open":"..."}},{{"pattern_interrupt":"...","text_overlay":"...","spoken_open":"..."}}]}},
"storyboard":[{{"beat_n":1,"scene":"...","shot_type":"close|médio|amplo|insert","duration_s":3,"on_screen_text":"...","broll":"...","motion":"zoom-in|whip|cut|none"}}],
"script":"roteiro integral falado, na voz do cliente",
"edit_spec":{{"zooms":["em qual fala"],"transitions":["tipo @ momento"],"inserts":["b-roll @ momento"],"captions":"estilo de legenda","motion_graphics":["elemento @ momento"]}},
"shotlist":[{{"plano":"o que gravar","framing":"close|médio|amplo","audio":"fala|ambiente|trilha","props":"...","locacao":"...","falas_chave":"frase a dizer"}}],
"rationale":"por que este plano modela o benchmark mantendo autenticidade"}}"""


# ---------------------------------------------------------------------------
# Fidelidade — reusa o guard do recast_engine
# ---------------------------------------------------------------------------
def _plan_text(plan):
    """Reúne todo o texto gerado do plano para a checagem de fidelidade."""
    chunks = [plan.get("script", ""), plan.get("tema", "")]
    for v in (plan.get("hook", {}) or {}).get("variants", []) or []:
        chunks += [v.get("text_overlay", ""), v.get("spoken_open", "")]
    for s in plan.get("storyboard", []) or []:
        chunks.append(s.get("on_screen_text", ""))
    for s in plan.get("shotlist", []) or []:
        chunks.append(s.get("falas_chave", ""))
    return " ".join(c for c in chunks if c)


def check_fidelity(plan, brief):
    """Sinaliza números no plano que NÃO existem na fala do benchmark.

    Reusa detect_fabricated_numbers() (recast_engine) montando um pseudo-slide:
    o texto gerado é o 'body', a transcrição é a 'reference'.
    """
    pseudo = {
        "headline": "",
        "body_text": _plan_text(plan),
        "reference_headline": "",
        "reference_body": _transcript_text(brief),
    }
    fabricated = detect_fabricated_numbers(pseudo)
    return {
        "fabricated_numbers": fabricated,
        "status": "WARN" if fabricated else "PASS",
    }


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def plan_video_creative(brief_path, client_slug=None):
    brief_path = brief_path.strip()
    print(f"=== MVC-03: Planejamento de Vídeo — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Video-brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    if not brief.get("transcript"):
        raise ValueError("Video-brief sem 'transcript' — rode a MVC-01 antes.")
    if not brief.get("benchmark_analysis"):
        raise ValueError(
            "Video-brief sem 'benchmark_analysis' — rode analyze_video_benchmark.py (MVC-02) antes.")

    client = resolve_from_argv_or_brief(client_slug, brief)
    print(f"Cliente  : {client.nome_exibicao} ({client.slug})")
    identity = _load_yaml(client.brand_identity)

    prompt = build_plan_prompt(brief, identity)
    plan, model_label = call_llm_json(prompt, _extract_json)

    plan["fidelity_check"] = check_fidelity(plan, brief)
    # MVC-06: anexa IDs de templates de vídeo recomendados (ponte p/ Fase B).
    # Degrada em silêncio se o registry do cliente ainda não existir.
    try:
        vt = load_video_templates(client.slug)
        if vt:
            hook_type = (brief.get("benchmark_analysis", {}) or {}).get("hook_type")
            plan.setdefault("edit_spec", {})["template_refs"] = recommend(vt, hook_type)
    except Exception:  # noqa: BLE001 — wiring opcional, nunca derruba o plano
        pass
    plan["planned_by"] = model_label
    plan["planned_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    brief["content_plan"] = plan

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(plan, brief_path)
    return plan


def _print_report(plan, brief_path):
    hook = plan.get("hook", {}) or {}
    variants = hook.get("variants", []) or []
    fid = plan.get("fidelity_check", {}) or {}
    print("-" * 60)
    print(f"Motor       : {plan.get('planned_by', '?')}")
    print(f"Tema        : {plan.get('tema', '')}")
    print(f"Conceito    : {plan.get('format_concept', '')}")
    print(f"Hook variants: {len(variants)} "
          f"({'OK' if len(variants) >= 3 else 'INSUFICIENTE'})")
    for i, v in enumerate(variants[:3], 1):
        print(f"  H{i}: \"{(v.get('text_overlay') or '')[:48]}\"")
    print(f"Storyboard  : {len(plan.get('storyboard') or [])} batidas")
    print(f"Shotlist    : {len(plan.get('shotlist') or [])} planos a gravar")
    fab = fid.get("fabricated_numbers") or []
    print(f"Fidelidade  : {fid.get('status', '?')}"
          + (f" — números suspeitos: {fab}" if fab else ""))
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)


if __name__ == "__main__":
    client_slug, _rest = extract_client_arg(sys.argv[1:])
    if len(_rest) < 1:
        print("Uso: python squads/virals-marketing-squad/scripts/plan_video_creative.py "
              "<video-brief-*.yaml> [--client=<slug>]")
        sys.exit(1)
    try:
        plan_video_creative(_rest[0], client_slug=client_slug)
    except (FileNotFoundError, ValueError, RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
