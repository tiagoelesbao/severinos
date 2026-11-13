#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
copy_guardrails.py — barra de qualidade de copy INDEPENDENTE DO LLM.

Motivo: o pipeline pegava uma copy-fonte boa e simples ("Seu Reel pode dar
sinais de flop antes de publicar") e a degradava em jargão denso e abstrato
("O PROBLEMA ESTÁ ESCONDIDO NO BASTIDOR DO SEU SISTEMA DE PRÉ-VISUALIZAÇÃO"),
que passava no quality_gate porque o gate só checava violações mecânicas
(emoji, hashtag, inglês). Densidade pesada, hook fraco e jargão inventado
passavam batido.

Este módulo tem duas partes:
  1. GUARDRAILS DETERMINÍSTICOS (código puro, zero LLM) — falham hook fraco,
     densidade pesada, jargão abstrato como manchete. É o PISO de qualidade.
  2. RUBRICA DE EDITOR (Hormozi/MrBeast/Ladeira) — texto do prompt que o
     quality_gate usa para REESCREVER a copy reprovada, não só aprovar.

Se o editor LLM não consertar após N tentativas, o fallback é a COPY-FONTE do
benchmark (que já era boa) — o piso final nunca é jargão inventado.
"""

import re
import unicodedata

# ── Limites determinísticos ──────────────────────────────────────────────────
# Rede social de conteúdo rápido: manchete curta, corpo enxuto, 1 ideia/slide.
HOOK_HEADLINE_MAX = 52     # o hook precisa ser mais punchy que os demais
HEADLINE_MAX = 62          # manchete de slide de corpo
BODY_MAX = 200             # corpo: 1–3 frases curtas (o overflow do layout é ~240)
BODY_MAX_SENTENCES = 3

# Jargão ABSTRATO que não pode ser manchete nem dominar o corpo. Estes são os
# padrões que degradaram o output real — abstrações de founder que ninguém
# procura numa rede rápida. (O léxico da marca — "sistema", "prova" — é
# permitido como CONTEXTO no corpo; o que se proíbe é a abstração empilhada.)
JARGAO_ABSTRATO = [
    "previsibilidade de demanda",
    "demanda sistematiz",
    "sistema de pre-visualiz",
    "sistema de pre visualiz",
    "gatilhos psicologicos",
    "framework de gatilhos",
    "profundidade psicologica",
    "hierarquia visual",
    "espaco negativo",
    "log de producao",       # ótimo como bordão do dono, péssimo como copy de venda
    "bastidor do seu sistema",
    "sistema de aquisicao antes de queimar",
]

# Aberturas de hook fracas — descrevem o PROBLEMA de forma abstrata em vez de
# prometer o BENEFÍCIO. Um hook forte diz o que a pessoa ganha/aprende/evita.
HOOK_FRACO_PREFIXOS = [
    "o problema esta",
    "o problema e",
    "entenda o",
    "vamos falar sobre",
    "a importancia de",
    "como funciona o sistema",
]

# FORMALIDADE — palavras burocráticas/literárias que não cabem em rede social
# rápida. Halbert: "escreva como você fala". Mapeamos formal → coloquial para o
# editor trocar. Chave = termo formal (normalizado, sem acento); valor = troca.
FORMAL_PARA_COLOQUIAL = {
    "pre-publicacao": "antes de postar",
    "publicacao": "post",
    "carece de": "falta",
    "criterio tecnico": "regra simples",
    "intencao de envio": "vontade de compartilhar",
    "compartilhabilidade": "vontade de compartilhar",
    "mediante": "com",
    "referente a": "sobre",
    "possibilita": "deixa",
    "viabiliza": "deixa",
    "otimizacao": "melhora",
    "aprimoramento": "melhora",
    "utilizar": "usar",
    "utilize": "use",
    "realizar": "fazer",
    "obter": "conseguir",
    "necessario": "preciso",
    "adequado": "certo",
    "eficaz": "que funciona",
    "metodologia": "método",
    "implementar": "aplicar",
    "efetuar": "fazer",
    "proceder": "seguir",
    "elevada": "alta",
    "reduzida": "baixa",
    "diagnostico": "check",
    "validacao pre": "teste antes",
}
# Limite: acima de N termos formais num slide, reprova (texto engessado).
FORMAL_MAX = 1

# PLACEHOLDER de letra — o LLM, instruído a não nomear terceiros, inventa
# "marca Y", "empresa X", "a fundadora da marca Z". Soa artificial e denuncia
# copy de robô. O certo é termo genérico natural ("uma marca", "o negócio").
# Case-insensitive nos nomes; a letra-placeholder restrita a X/Y/Z/W (as usadas
# como marcador) evita falsos positivos como "plano B", "vitamina C", "gráfico A".
PLACEHOLDER_RE = re.compile(
    r"\b(marca|empresa|produto|cliente|loja|neg[óo]cio|founder|fundador[ae]?|"
    r"criador[ae]?|pessoa|perfil|conta|canal|rede|franquia[s]?|matriz)\s+[XYZW]\b",
    re.IGNORECASE,
)


def _norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return s.lower().strip()


def _sentence_count(text):
    parts = [p for p in re.split(r"[.!?]+", text or "") if p.strip()]
    return len(parts)


def check_slide(slide, is_hook=False):
    """Guardrails determinísticos. Devolve lista de problemas (vazia = passou).

    Zero LLM — mesmo comportamento em qualquer modelo. É o piso que impede
    densidade/jargão/hook-fraco de passar, independente do que o gerador cuspiu.
    """
    problems = []
    headline = str(slide.get("headline", "") or "")
    body = str(slide.get("body_text", "") or "")
    hn, bn = _norm(headline), _norm(body)

    hmax = HOOK_HEADLINE_MAX if is_hook else HEADLINE_MAX
    if len(headline) > hmax:
        problems.append(f"manchete longa demais ({len(headline)} > {hmax} chars) — encurte, 1 ideia")

    if len(body) > BODY_MAX:
        problems.append(f"corpo denso ({len(body)} > {BODY_MAX} chars) — corte para o essencial")

    if _sentence_count(body) > BODY_MAX_SENTENCES:
        problems.append(f"corpo com muitas frases (máx {BODY_MAX_SENTENCES}) — uma ideia por slide")

    for termo in JARGAO_ABSTRATO:
        if termo in hn:
            problems.append(f"jargão abstrato na manchete ('{termo}') — fale o benefício concreto, não o mecanismo")
            break
    # jargão no corpo só é problema se ele DOMINA (2+ termos = abstração empilhada)
    hits_body = sum(1 for termo in JARGAO_ABSTRATO if termo in bn)
    if hits_body >= 2:
        problems.append("corpo empilha jargão abstrato — troque por linguagem concreta e simples")

    if is_hook:
        for pref in HOOK_FRACO_PREFIXOS:
            if hn.startswith(pref):
                problems.append(f"hook descreve o problema de forma abstrata ('{pref}...') — prometa o BENEFÍCIO: o que a pessoa aprende/ganha/evita")
                break

    # Placeholder de letra ("marca Y") — artificial, cara de robô.
    ph = PLACEHOLDER_RE.search(f"{headline} {body}")
    if ph:
        problems.append(f"placeholder artificial ('{ph.group(0)}') — troque por termo genérico natural (ex.: 'uma marca', 'o negócio')")

    # Formalidade excessiva — texto engessado não retém em rede rápida.
    texto_all = f"{hn} {bn}"
    formais = [(t, troca) for t, troca in FORMAL_PARA_COLOQUIAL.items() if t in texto_all]
    if len(formais) > FORMAL_MAX:
        exemplos = "; ".join(f"'{t}'→'{v}'" for t, v in formais[:3])
        problems.append(f"tom formal demais ({len(formais)} termos: {exemplos}) — escreva como fala (Halbert)")
    elif is_hook and formais:
        # No hook, UM termo formal já pesa — o primeiro segundo tem que ser leve.
        t, v = formais[0]
        problems.append(f"hook com termo formal ('{t}' → '{v}') — o hook precisa soar como conversa")

    return problems


def check_brief(slides):
    """Roda os guardrails em todos os slides. Devolve {slide_n: [problemas]}."""
    out = {}
    for i, s in enumerate(slides):
        is_hook = (i == 0) or str(s.get("variant", "")).upper() == "HOOK"
        probs = check_slide(s, is_hook=is_hook)
        if probs:
            out[s.get("slide_n", i + 1)] = probs
    return out


# ── Rubrica do editor-especialista ───────────────────────────────────────────
# Injetada no prompt do quality_gate quando há slides reprovados pelos
# guardrails. Traz a expertise dos auditores para a PRODUÇÃO, não só a auditoria.
RUBRICA_EDITOR = """RUBRICA DE EDIÇÃO (aplique como um trio de especialistas):

HORMOZI (valor) — o hook promete um resultado CONCRETO: o que a pessoa ganha,
aprende ou evita, rápido e sem esforço. Corte tudo que não aumenta o valor
percebido. Se não dá pra dizer "lendo isso você consegue X", o hook é fraco.

MRBEAST (retenção) — o primeiro slide cria curiosidade ou aposta ("você está
perdendo alcance por causa disso"); cada slide abre um loop que o próximo paga;
o último entrega o payoff prometido no hook. Zero palavra desperdiçada.

LADEIRA (clareza) — PT-BR de conversa, uma ideia por slide, frase curta,
concreto. Um estranho entende em 2 segundos. Sem jargão abstrato, sem
mecanismo técnico como manchete. Fala com a pessoa, não sobre o sistema.

SUGARMAN (slippery slide) — cada slide fecha um loop e abre o próximo; nada de
beco sem saída. SCHWARTZ — foque a dor que a audiência JÁ tem, não invente uma.
BENCIVENGA — toda afirmação sobrevive ao "sim, claro..." do cético; específico
vence genérico; entregue algo útil e aplicável hoje.

TOM (crítico) — escreva como você FALA com um amigo, não como relatório. PT-BR
coloquial de rede rápida. Troque burocratês por conversa: "utilizar"→"usar",
"realizar"→"fazer", "carece de"→"falta", "pré-publicação"→"antes de postar",
"critério técnico"→"regra simples", "otimização"→"melhora". Se soa a manual, reescreve.

REGRAS DURAS (não-negociáveis):
- Manchete do HOOK: no máx. ~50 caracteres, lidera pelo benefício, tom de conversa.
- Corpo: no máx. ~200 caracteres, 1 a 3 frases curtas, uma ideia.
- PROIBIDO jargão abstrato como manchete ou empilhado no corpo.
- PROIBIDO burocratês/palavra formal (o primeiro segundo tem que ser leve).
- PROIBIDO placeholder de letra ("marca Y", "empresa X"). Se a fonte cita um
  terceiro que não pode nomear, use termo genérico natural ("uma marca",
  "o negócio", "quem aparece na câmera") — nunca uma letra solta.
- PROIBIDO inventar mecanismo/conceito que não está na fonte.
- Quando a fonte tem uma frase forte e simples, PRESERVE a força dela."""


def build_editor_prompt(slides_reprovados, source_caption, central_theme):
    """Prompt do editor que REESCREVE (não só aprova) a copy reprovada.

    Recebe a copy-fonte do benchmark para reancorar na simplicidade original.
    """
    blocos = []
    for s in slides_reprovados:
        blocos.append(
            f"slide {s['slide_n']} ({'HOOK' if s.get('is_hook') else 'corpo'}):\n"
            f"  headline atual: \"{s.get('headline','')}\"\n"
            f"  body atual: \"{s.get('body_text','')}\"\n"
            f"  problemas: {'; '.join(s.get('problemas', []))}"
        )
    slides_block = "\n\n".join(blocos)

    src = (source_caption or "").strip()
    src_block = f"\nCOPY-FONTE DO BENCHMARK (a inspiração simples e forte — reancore nela):\n<<<\n{src[:600]}\n>>>\n" if src else ""

    return f"""Você é editor-chefe de copy de rede social. Reescreva os slides
abaixo para consertar os problemas apontados — mais fortes, mais simples, mais
objetivos. Tema central (não mude): "{central_theme}".

{RUBRICA_EDITOR}
{src_block}
SLIDES A REESCREVER:
{slides_block}

Para CADA slide, devolva a versão CORRIGIDA (headline curta + body enxuto),
em PT-BR, sem emoji, sem hashtag, sem @handle.

Responda APENAS com JSON válido:
{{"slides":[{{"slide_n":1,"headline":"...","body":"..."}}]}}"""


__all__ = [
    "check_slide", "check_brief", "build_editor_prompt", "RUBRICA_EDITOR",
    "HOOK_HEADLINE_MAX", "HEADLINE_MAX", "BODY_MAX",
]
