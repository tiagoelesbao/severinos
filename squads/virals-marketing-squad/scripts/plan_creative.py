#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plan_creative.py — MCI-02: Motor de Planejamento.

Dada a análise holística (MCI-01) + a identidade Virals, projeta o PLANO DE
CONTEÚDO do post Virals: quantos slides, papel e kicker contextual de cada um,
direção de copy e de imagem. DECIDE a estrutura — não copia a do benchmark.

Saída: grava brief["content_plan"] no próprio brief.

Pipeline: deep_modeler -> analyze_benchmark -> [plan_creative] -> produção
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
from recast_engine import call_llm_json  # noqa: E402
from copy_frameworks import build_arc_block  # noqa: E402
from _client_resolver import (  # noqa: E402
    extract_client_arg,
    resolve_from_argv_or_brief,
)

# Mantido como fallback legado quando o resolver não é injetado.
LEGACY_IDENTITY_PATH = "squads/virals-marketing-squad/data/clients/virals/brand-identity.yaml"


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


def build_plan_prompt(brief, identity):
    analysis = brief.get("benchmark_analysis", {}) or {}
    slides = brief.get("content_data", [])

    # Copy-squad: arco narrativo garantido + princípios dos mestres (Schwartz,
    # Sugarman, Halbert, Bencivenga). O nº de slides do plano segue o benchmark
    # como base — o LLM pode reduzir, mas o arco vale para qualquer contagem.
    arc_block = build_arc_block(brief, max(len(slides), 2))

    ref_lines = []
    for s in slides:
        body = (s.get("reference_body") or "")[:200]
        ref_lines.append(
            f"Slide {s['slide_n']}: \"{s.get('reference_headline', '')}\""
            + (f" | {body}" if body else "")
        )
    ref_block = "\n".join(ref_lines)

    # MCI-V2-02: injeção ampla de voz — léxico, CTA preference, restrições
    # (não só tom_de_voz). Garante que o LLM saiba ANTES o que evitar.
    voz = yaml.dump(
        {"tom_de_voz": identity.get("tom_de_voz", {}),
         "lexico": (identity.get("tom_de_voz", {}) or {}).get("lexico", {}),
         "cta_estilo": identity.get("cta_estilo", {}),
         "restricoes": identity.get("restricoes", {})},
        allow_unicode=True, sort_keys=False,
    )
    client_label = identity.get("perfil", {}).get("identidade", "do cliente")

    return f"""Você é o Planejador de Conteúdo. Projete o PLANO do post
({client_label}) a partir da análise do benchmark e da identidade abaixo.

REGRAS:
- O TEMA e as NOTÍCIAS vêm do benchmark — é modelagem, não reinvenção.
- A ESTRUTURA é decidida por você: aplique a recomendação da análise, corte
  redundância, defina o arco. O nº de slides pode ser MENOR que o do benchmark.
- O kicker de cada slide deve ser CONTEXTUAL ao conteúdo (ex.: "O CASO",
  "O DADO", "REFLEXÃO", "O QUE MUDOU") — NUNCA o genérico "ABERTURA".
  SEMPRE em PORTUGUÊS do Brasil — nunca em espanhol ("O RETO", "EL CASO") nem
  inglês. Se ficar em dúvida, use "DESAFIO", "LIÇÃO" ou "O PONTO".
- A voz do cliente guia ESTILO; não troca o assunto.
- copy_direction NUNCA deve mandar manter @handle, assinatura ou marca d'água
  do autor do benchmark — o post é do cliente, conteúdo todo em PT-BR.
- AUTOR DO BENCHMARK ≠ PERSONAGEM: é PROIBIDO criar slide que apresente o autor
  do benchmark (o perfil/handle de onde o conteúdo foi modelado) como
  personagem, especialista, entrevistado, fonte ou narrador nomeado. Quando o
  slide-fonte é o próprio autor falando, trate como observação/narração do
  PRÓPRIO criativo do cliente — sem nomear nem aludir a terceiros. NÃO invente
  um "especialista" para contextualizar.
- FIDELIDADE AOS FATOS (INEGOCIÁVEL): a copy_direction só pode citar número,
  percentual, data ou quantidade que JÁ EXISTA no conteúdo de referência do
  benchmark. É PROIBIDO inventar estatística, "X%", "1,8× mais", "+1,2 mi",
  "subiu 34%" ou "pesquisa/estudo interno mostrou". Se o slide-fonte não tem
  número, NÃO peça um.
- Para dar concretude SEM número, ancore a copy_direction num FATO REAL da
  fonte (marca citada, evento, lugar, mecanismo, exemplo). Concretude vem do
  fato real, nunca de dado fabricado. Nada de motivacional genérico.
- REGRA DO HOOK + SIMPLICIDADE (críticas): a copy_direction deve levar a um hook
  que lidera pelo BENEFÍCIO concreto (o que a audiência aprende/ganha/evita),
  em linguagem simples de rede social rápida. PRESERVE o ângulo atraente da
  fonte — NÃO o reescreva para algo mais "sofisticado" ou abstrato. É PROIBIDO
  transformar uma dica simples num "sistema", "framework" ou "previsibilidade
  sistematizada". O léxico da marca é tempero de contexto, jamais o assunto do
  hook. Se a fonte tem uma frase forte e simples, a direção é AFIAR, não trocar.
- O ÚLTIMO slide (CTA) deve seguir `cta_estilo.preferencia` (call-to-think ≠
  "Comente X"). PROIBIDO usar exemplos de `cta_estilo.exemplos_proibidos`.
- Evite TODA palavra de `lexico.nunca_usar`.

ANÁLISE HOLÍSTICA DO BENCHMARK:
{json.dumps(analysis, ensure_ascii=False, indent=1)}

CONTEÚDO DE REFERÊNCIA DO BENCHMARK (temas a manter):
{ref_block}

VOZ DA VIRALS:
{voz}

{arc_block}

Projete o Plano de Conteúdo SEGUINDO O ARCO NARRATIVO acima (o carrossel conta
UMA história com início-meio-fim). Para cada slide:
- role: o papel do slide no arco (HOOK, INSIGHT ou PAYOFF, conforme o arco).
- kicker: rótulo curto e CONTEXTUAL.
- copy_direction: o que a headline/body devem comunicar (mesmo tema do benchmark).
- image_direction: o conceito visual do slide.
- source_slides: quais slides do benchmark originam este (pode fundir vários).

Responda APENAS JSON válido, sem markdown:
{{"archetype":"quote|news|single","slide_count":0,"tema":"...","slides":[{{"slide_n":1,"role":"...","kicker":"...","copy_direction":"...","image_direction":"...","source_slides":[1]}}],"rationale":"..."}}"""


def plan_creative(brief_path, client_slug=None):
    brief_path = brief_path.strip()
    print(f"=== MCI-02: Planejamento — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    if not brief.get("benchmark_analysis"):
        raise ValueError("Brief sem 'benchmark_analysis' — rode analyze_benchmark.py antes.")

    client = resolve_from_argv_or_brief(client_slug, brief)
    print(f"Cliente  : {client.nome_exibicao} ({client.slug})")
    identity = _load_yaml(client.brand_identity)
    prompt = build_plan_prompt(brief, identity)
    plan, model_label = call_llm_json(prompt, _extract_json)

    plan["planned_by"] = model_label
    plan["planned_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    brief["content_plan"] = plan

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(plan, len(brief.get("content_data", [])), brief_path)
    return plan


def _print_report(plan, benchmark_slides, brief_path):
    print("-" * 60)
    print(f"Arquétipo : {plan.get('archetype', '')}")
    print(f"Tema      : {plan.get('tema', '')}")
    print(f"Slides    : {plan.get('slide_count', '?')} planejados "
          f"(benchmark tinha {benchmark_slides})")
    for s in plan.get("slides", []):
        print(f"  s{s.get('slide_n')} [{s.get('kicker', '')}] {s.get('role', '')}")
    print(f"Racional  : {plan.get('rationale', '')}")
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)


if __name__ == "__main__":
    client_slug, _argv_rest = extract_client_arg(sys.argv[1:])
    if len(_argv_rest) < 1:
        print(
            "Uso: python squads/virals-marketing-squad/scripts/plan_creative.py "
            "<brief-v5-*.yaml> [--client=<slug>]"
        )
        sys.exit(1)
    try:
        plan_creative(_argv_rest[0], client_slug=client_slug)
    except (FileNotFoundError, ValueError, RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
