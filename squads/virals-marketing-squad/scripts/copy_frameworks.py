#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
copy_frameworks.py — traz a munição do copy-squad (22 mestres) para o pipeline
de produção, GARANTINDO o arco narrativo (início-meio-fim) do criativo inteiro.

Problema que resolve: a máquina de qualidade (copy_guardrails) opera slide a
slide — conserta a FORMA de cada peça isolada, mas ninguém garante que o
conjunto conte UMA história com hook → valor → payoff. Quando o benchmark-fonte
já tem bom arco, o resultado sai bom; quando não tem, o carrossel fica solto.

Estratégia: em vez de invocar os 22 agentes ao vivo (lento, dependente de LLM),
DESTILAMOS os frameworks (copy-squad/data/copy-frameworks.yaml) + os princípios
dos mestres em texto injetável nos prompts de plan/recast/editor. A expertise
fica baked-in, determinística.

Fontes destiladas:
  - Eugene Schwartz — 5 níveis de awareness (calibra o hook).
  - Joe Sugarman — Slippery Slide (cada slide puxa o próximo; open loops).
  - Gary Halbert — starving crowd + empatia; escreve como fala.
  - Gary Bencivenga — teste "Yeah, sure" (toda afirmação sobrevive ao ceticismo).
"""

import os
import yaml

# Frameworks canônicos vivem no copy-squad — reusamos, não duplicamos.
_COPY_SQUAD_FRAMEWORKS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "copy-squad", "data", "copy-frameworks.yaml")
)


def load_frameworks():
    """Carrega os frameworks do copy-squad. Degrada para {} se ausente."""
    try:
        with open(_COPY_SQUAD_FRAMEWORKS, "r", encoding="utf-8") as f:
            return (yaml.safe_load(f) or {}).get("frameworks", {})
    except (OSError, yaml.YAMLError):
        return {}


# ── Níveis de awareness (Schwartz) ───────────────────────────────────────────
# Calibram o HOOK. Conteúdo modelado de benchmark é quase sempre problem_aware:
# a audiência sente a dor (reel que floppa, criativo que não converte) mas não
# conhece a solução. Default = problem_aware.
AWARENESS_HOOKS = {
    "unaware": "A audiência não sabe que tem o problema. Hook por história, curiosidade ou pattern interrupt — nunca pela solução.",
    "problem_aware": "A audiência SENTE a dor mas não conhece a saída. Hook por empatia + a dor específica dela (Halbert). Depois entrega o caminho.",
    "solution_aware": "A audiência sabe que existem soluções, não a sua. Hook pelo mecanismo único ou pela grande ideia (Ogilvy).",
    "product_aware": "A audiência conhece você, falta convencer. Hook por diferenciação + prova (Bencivenga).",
    "most_aware": "A audiência confia em você. Hook pela oferta, condição ou urgência.",
}


def detect_awareness(brief):
    """Heurística: conteúdo de benchmark educativo → problem_aware por padrão.

    (Ganchos de 'novidade/tendência' → solution_aware; oferta direta → most_aware.)
    """
    analysis = (brief.get("benchmark_analysis", {}) or {})
    tema = f"{brief.get('central_theme','')} {analysis.get('tema_central','')}".lower()
    if any(w in tema for w in ("lançou", "lancou", "novidade", "tendência", "tendencia", "chegou")):
        return "solution_aware"
    return "problem_aware"


# ── Arco do carrossel (garantido, independente da fonte) ──────────────────────
# Um carrossel curto de rede social precisa de início-meio-fim. Mapeamos o nº de
# slides para papéis narrativos com base no arco AIDA/PAS + Slippery Slide.
def build_arc(slide_count):
    """Papéis narrativos por slide — garante hook → valor → payoff.

    Devolve lista de dicts {role, guia} na ordem dos slides.
    """
    hook = {"role": "HOOK", "guia": "Fisga pela dor/benefício concreto. Abre um loop que só fecha no fim. Máx. ~50 chars, uma ideia."}
    payoff = {"role": "PAYOFF", "guia": "Fecha o loop do hook com o takeaway prático (Bencivenga: útil, prático, aplicável hoje). Termina em call-to-think, não venda direta."}
    insight = {"role": "INSIGHT", "guia": "Entrega UMA lição concreta que paga a curiosidade do slide anterior e abre a do próximo (Sugarman: slippery slide)."}

    if slide_count <= 1:
        return [hook]
    if slide_count == 2:
        return [hook, payoff]
    # 3+: hook, (n-2) insights, payoff
    return [hook] + [dict(insight) for _ in range(slide_count - 2)] + [payoff]


# ── Princípios dos mestres (injetáveis no prompt) ─────────────────────────────
MASTER_PRINCIPLES = """PRINCÍPIOS DE COPY (os mestres do copy-squad):

SCHWARTZ (awareness) — a copy não CRIA desejo, ela FOCA um desejo que já existe.
Fale da dor/vontade que a audiência já tem; não invente uma nova.

SUGARMAN (slippery slide) — a única função de cada elemento é fazer ler o
próximo. Cada slide fecha um loop e abre outro. Nada de becos sem saída.
Venda o CONCEITO (a ideia que torna a lição irresistível), não o mecanismo.

HALBERT (starving crowd) — escreva como você fala, frase curta, visceral,
empatia real com a dor. Uma ideia por frase.

BENCIVENGA (prova) — leia cada afirmação como o cético diria "sim, claro..." —
se não sobrevive, corte ou prove. Específico vence genérico. Todo criativo
entrega algo ÚTIL e aplicável hoje (não só teoria)."""


def build_arc_block(brief, slide_count):
    """Bloco de texto pronto para injetar no prompt do plan_creative."""
    awareness = detect_awareness(brief)
    arc = build_arc(slide_count)
    linhas = [f"NÍVEL DE AWARENESS (Schwartz): {awareness} — {AWARENESS_HOOKS[awareness]}", ""]
    linhas.append("ARCO NARRATIVO OBRIGATÓRIO (início-meio-fim — o carrossel conta UMA história):")
    for i, a in enumerate(arc, 1):
        linhas.append(f"  slide {i} [{a['role']}]: {a['guia']}")
    linhas.append("")
    linhas.append(MASTER_PRINCIPLES)
    return "\n".join(linhas)


__all__ = [
    "load_frameworks", "detect_awareness", "build_arc", "build_arc_block",
    "MASTER_PRINCIPLES", "AWARENESS_HOOKS",
]
