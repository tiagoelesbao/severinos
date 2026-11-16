#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze_benchmark.py — MCI-01: Análise Holística do Benchmark.

Lê o brief extraído pelo deep_modeler e produz uma ANÁLISE HOLÍSTICA do
benchmark — tema, formato, arco narrativo, estrutura (papel de cada slide +
se é essencial), redundâncias e fatores de performance. É a base para o
Motor de Planejamento (MCI-02) decidir o post Virals.

Saída: grava brief["benchmark_analysis"] no próprio brief.

Pipeline: deep_modeler -> [analyze_benchmark] -> plan_creative -> produção
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

# Reusa o motor LLM multi-provedor do recast_engine (mesma pasta).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recast_engine import call_llm_json  # noqa: E402


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(text):
    """Extrai o JSON da resposta do LLM, tolerando cercas/ruído."""
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    return json.loads(cleaned)


def build_analysis_prompt(brief):
    caption = brief.get("benchmark_caption", "")
    strategic = brief.get("strategic_context", {}) or {}
    slides = brief.get("content_data", [])

    slide_lines = []
    for s in slides:
        triggers = ", ".join((s.get("design_triggers") or [])[:5])
        body = (s.get("reference_body") or "")[:200]
        slide_lines.append(
            f"Slide {s['slide_n']}:\n"
            f"  headline: \"{s.get('reference_headline', '')}\"\n"
            f"  body: \"{body}\"\n"
            f"  gatilhos: {triggers}"
        )
    slides_block = "\n\n".join(slide_lines)

    return f"""Você é Analista de Conteúdo Viral da Virals. Analise este benchmark
de ALTA PERFORMANCE de forma HOLÍSTICA — o post inteiro, não slide a slide.

CAPTION ORIGINAL:
{caption or '(sem caption)'}

CONTEXTO ESTRATÉGICO (auditoria prévia):
{strategic.get('pattern') or '(sem síntese)'}

SLIDES DO BENCHMARK ({len(slides)} no total):
{slides_block}

Produza uma análise estruturada:
- tema_central: o tema/assunto central do post, em uma frase.
- formato: que tipo de post é (ex.: digest de notícias, quote motivacional, case único).
- arco_narrativo: como o conteúdo flui do início ao fim.
- estrutura: para CADA slide, seu papel no conjunto e se é ESSENCIAL (true/false).
- redundancias: slides redundantes, repetidos ou que poderiam ser fundidos/cortados
  (lista vazia se não houver).
- fatores_de_performance: o que fez este benchmark performar (3 a 5 itens).
- recomendacao: nº de slides ideal para a versão Virals + justificativa. Pode ser
  MENOR que o benchmark se houver redundância.

Responda APENAS JSON válido, sem markdown:
{{"tema_central":"...","formato":"...","arco_narrativo":"...","estrutura":[{{"slide_n":1,"papel":"...","essencial":true}}],"redundancias":["..."],"fatores_de_performance":["..."],"recomendacao":{{"slides_ideais":0,"justificativa":"..."}}}}"""


def analyze_benchmark(brief_path):
    brief_path = brief_path.strip()
    print(f"=== MCI-01: Análise Holística — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    slides = brief.get("content_data", [])
    if not slides:
        raise ValueError("Brief sem content_data.")

    print(f"Slides no benchmark: {len(slides)}")
    prompt = build_analysis_prompt(brief)
    analysis, model_label = call_llm_json(prompt, _extract_json)

    analysis["analyzed_by"] = model_label
    analysis["analyzed_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    brief["benchmark_analysis"] = analysis

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    _print_report(analysis, len(slides), brief_path)
    return analysis


def _print_report(analysis, slide_count, brief_path):
    rec = analysis.get("recomendacao", {}) or {}
    print("-" * 60)
    print(f"Tema central : {analysis.get('tema_central', '')}")
    print(f"Formato      : {analysis.get('formato', '')}")
    print(f"Slides ideais: {rec.get('slides_ideais', '?')} "
          f"(benchmark tem {slide_count})")
    redundancias = analysis.get("redundancias") or []
    if redundancias:
        print("Redundâncias detectadas:")
        for r in redundancias:
            print(f"  - {r}")
    else:
        print("Redundâncias : nenhuma")
    print(f"Brief atualizado: {brief_path}")
    print("-" * 60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python squads/virals-marketing-squad/scripts/analyze_benchmark.py <brief-v5-*.yaml>")
        sys.exit(1)
    try:
        analyze_benchmark(sys.argv[1])
    except (FileNotFoundError, ValueError, RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
