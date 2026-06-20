#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
recast_engine.py — Etapa 1.5 do pipeline *design-creative.

Transforma um brief modelado de benchmark (deep_modeler v5) em criativo
AUTÊNTICO da Virals: reescreve headline/body de cada slide na voz, oferta e
avatar da Virals, PRESERVANDO a estrutura vencedora do benchmark.

Insumos:
  - brief v5  (squads/virals-marketing-squad/data/brief-v5-*.yaml)
  - clients/<slug>/brand-identity.yaml (oferta, avatar, voz, restrições, léxico —
    resolvido em runtime via --client; default `virals`)

Saída: o MESMO brief, com headline/body recastados e
personalization.status = DONE. O conteúdo do benchmark é preservado em
reference_headline / reference_body.

Pipeline: deep_modeler → [recast_engine] → orchestrate_carousel
"""

import os
import re
import sys
import json
import time
import datetime

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"ERRO: dependência ausente ({e}). Rode: pip install pyyaml requests python-dotenv",
          file=sys.stderr)
    sys.exit(1)

# Reusa o cálculo de métricas de texto do deep_modeler (mesma pasta).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from deep_modeler import text_metrics  # noqa: E402
from _client_resolver import (  # noqa: E402
    extract_client_arg,
    resolve_from_argv_or_brief,
)

load_dotenv()

# Mantido como fallback legado quando o resolver não é injetado.
LEGACY_IDENTITY_PATH = "squads/virals-marketing-squad/data/clients/virals/brand-identity.yaml"
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)
# Modelos gratuitos do OpenRouter (sufixo :free) — tentados em ordem;
# se um estiver rate-limited, o próximo assume.
OPENROUTER_MODELS = [
    "openai/gpt-oss-120b:free",
    "deepseek/deepseek-v4-flash:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"


# ---------------------------------------------------------------------------
def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_prompt(brief, identity):
    """Monta o prompt de recast — MODELAGEM: mesmo tema, voz Virals.

    O assunto vem do benchmark; a identidade Virals entra só como filtro de
    VOZ e ESTILO — nunca substitui o tema.
    """
    slides = brief.get("content_data", [])
    tema = brief.get("carousel_brief", {}).get("tema", "")

    # Só ESTILO e VOZ entram no prompt — não a oferta (o assunto é do benchmark).
    voz = yaml.dump(
        {"tom_de_voz": identity.get("tom_de_voz", {}),
         "restricoes": identity.get("restricoes", {})},
        allow_unicode=True, sort_keys=False,
    )

    slide_lines = []
    for s in slides:
        slide_lines.append(
            f"Slide {s['slide_n']} [{s['variant']}]\n"
            f"  headline original: \"{s.get('reference_headline','')}\"\n"
            f"  body original: \"{s.get('reference_body','')}\""
        )
    slides_block = "\n\n".join(slide_lines)

    return f"""Você é o Master Copywriter da Virals (arquétipo Mago, DNA GaryVee).

CONTEXTO: A Virals modela os melhores criativos do momento para não perder
tempo pesquisando publicações. Você recebe um carrossel de um benchmark de
ALTA PERFORMANCE.

SUA TAREFA: re-craftar o carrossel MANTENDO o mesmo tema, as mesmas notícias e
os mesmos fatos — porém OTIMIZANDO os hooks, apertando os textos e ADAPTANDO
tudo ao tom de voz da Virals.

ISTO É MODELAGEM — o ponto de equilíbrio entre copiar e reinventar:
- NÃO copie o texto literalmente.
- NÃO troque o assunto: NÃO transforme isto em propaganda da Virals.
- MANTENHA: o tema, as notícias, as marcas citadas, os fatos e os números.
- OTIMIZE: hook mais forte, texto mais limpo, mais clareza e retenção.
- ADAPTE: reescreva na VOZ da Virals (definida abaixo).

A identidade abaixo guia APENAS o ESTILO e a VOZ — jamais o assunto.

VOZ DA VIRALS:
<<<
{voz}
>>>

CARROSSEL DO BENCHMARK — manter tema e fatos · otimizar hook · adaptar a voz:
tema: "{tema}"

{slides_block}

Primeiro, CLASSIFIQUE o arquétipo geral deste conteúdo em UM destes:
- "quote": frase/citação motivacional ou inspiracional (pouco texto, foco no impacto).
- "single": post único de UMA notícia/insight (uma imagem, sem sequência).
- "news": carrossel de notícias, digest ou conteúdo educativo de vários slides.

Depois, para CADA slide, sobre a MESMA notícia/tema do slide original, escreva:
- "headline": o mesmo fato, com hook otimizado e na voz Virals.
- "body": o mesmo conteúdo, mais limpo e na voz Virals (1 a 3 frases).
- "pexels_query": termo de busca para BANCO DE IMAGENS (Pexels), em inglês,
  2-4 palavras. Descreva a CENA VISUAL concreta e fotografável que representa
  o tema — NÃO o título literal. Regras:
  * Nome de marca SÓ se for marca global icônica que existe em foto de banco
    (ex.: "coca cola", "burger king", "mcdonalds"). NUNCA marcas de nicho
    (figurinhas, desodorante, varejo regional) — o banco não as tem e confunde
    com palavras comuns (ex.: "panini" = sanduíche, não a empresa).
  * Evite palavras ambíguas. Pergunte-se: "que foto genérica ilustraria isso?"
  * Exemplos: álbum de figurinhas da Copa -> "soccer sticker album";
    perfume dourado -> "gold luxury perfume"; collab de roupa de torcida ->
    "soccer fan jersey".
  * No slide HOOK/capa: conceito de curiosidade/criatividade
    (ex.: "creative ideas brainstorm").
- Mantenha o comprimento próximo ao texto original (precisa caber no layout).

headline/body em PT-BR. Use o léxico Virals quando couber naturalmente.
Proibido: promessa vazia, corporativês, linguagem genérica, ego-driven, mistério.

Responda APENAS com JSON válido, sem markdown, no formato:
{{"archetype":"quote|single|news","slides":[{{"slide_n":1,"headline":"...","body":"...","pexels_query":"..."}}]}}"""


def _call_openai(prompt):
    """Chama a OpenAI. Retorna o texto ou None se sem chave."""
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
    }
    resp = requests.post(OPENAI_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _call_openrouter(prompt, model):
    """Chama o OpenRouter com o modelo dado. Texto, ou None se sem chave."""
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return None
    headers = {
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "https://virals.com.br",
        "X-Title": "Virals Recast Engine",
        "Content-Type": "application/json",
    }
    # Sem response_format: modelos :free nem sempre o suportam — o prompt já
    # exige JSON e parse_recast tolera cercas/texto ao redor.
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _call_gemini(prompt):
    """Chama o Gemini. Retorna o texto ou None se sem chave."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return None
    url = GEMINI_URL.format(model=GEMINI_MODEL, key=key)
    resp = requests.post(url, headers={"Content-Type": "application/json"},
                         json={"contents": [{"parts": [{"text": prompt}]}]},
                         timeout=120)
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


def call_llm(prompt, max_retries=2):
    """Tenta vários modelos free do OpenRouter → Gemini → OpenAI.

    Devolve (texto, rótulo_do_modelo). Em 401/403/429 pula para o próximo.
    """
    providers = [
        (f"openrouter:{m}", (lambda p, mdl=m: _call_openrouter(p, mdl)))
        for m in OPENROUTER_MODELS
    ]
    providers.append((f"gemini:{GEMINI_MODEL}", _call_gemini))
    providers.append((f"openai:{OPENAI_MODEL}", _call_openai))

    last_err = None
    for label, fn in providers:
        for attempt in range(1, max_retries + 1):
            try:
                print(f"  > {label} — tentativa {attempt}...")
                out = fn(prompt)
                if out is None:
                    print(f"  - {label}: sem chave, pulando provedor.")
                    break
                return out, label
            except Exception as e:  # noqa: BLE001
                last_err = e
                status = getattr(getattr(e, "response", None), "status_code", None)
                print(f"  ! {label} falhou: {e}")
                if status in (401, 403, 429):
                    print("    indisponível — próximo provedor.")
                    break
                if attempt < max_retries:
                    wait = 15 * attempt
                    print(f"    backoff {wait}s...")
                    time.sleep(wait)
    raise RuntimeError(f"Todos os provedores de LLM falharam. Último erro: {last_err}")


def call_llm_json(prompt, parser, max_retries=2):
    """call_llm + parser, re-tentando quando o JSON volta malformado (MCI-06).

    Os modelos `:free` às vezes devolvem JSON quebrado (vírgula faltando, aspas
    não escapadas). Em vez de abortar no primeiro erro, re-chama o LLM até
    `max_retries`. `parser` recebe o texto cru e devolve a estrutura parseada
    (pode levantar json.JSONDecodeError/ValueError).

    Retorna (parsed, model_label). Levanta RuntimeError se esgotar as tentativas.
    """
    last_err = None
    for attempt in range(1, max_retries + 1):
        raw, label = call_llm(prompt)
        try:
            return parser(raw), label
        except (json.JSONDecodeError, ValueError) as e:
            last_err = e
            print(f"  ! JSON inválido (tentativa {attempt}/{max_retries}): {e}")
    raise RuntimeError(
        f"LLM não devolveu JSON válido após {max_retries} tentativas: {last_err}")


def parse_recast(text):
    """Extrai o JSON do recast da resposta do LLM, tolerando ruído ao redor."""
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        # Sem cercas: recorta do primeiro '{' ao último '}'.
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    data = json.loads(cleaned)
    archetype = str(data.get("archetype", "")).strip().lower()
    if archetype not in ("quote", "single", "news"):
        archetype = ""
    slides = {int(s["slide_n"]): s for s in data.get("slides", [])}
    return archetype, slides


def apply_recast(brief, recast, model_label, archetype=""):
    """Aplica o recast ao brief, preservando o conteúdo de referência."""
    now = datetime.datetime.now().isoformat(timespec="seconds")
    applied, missing = 0, []

    for slide in brief.get("content_data", []):
        n = slide["slide_n"]
        r = recast.get(n)
        if not r or not r.get("headline"):
            missing.append(n)
            continue

        new_headline = str(r["headline"]).strip()
        new_body = str(r.get("body", "")).strip()

        slide["headline"] = new_headline.upper()
        slide["body_text"] = new_body
        slide["pexels_query"] = str(r.get("pexels_query", "")).strip()
        slide["text_metrics"] = text_metrics(new_headline, new_body)
        slide["personalization"] = {
            "status": "DONE",
            "directive": slide.get("personalization", {}).get("directive", ""),
            "recast_model": model_label,
            "recast_at": now,
        }
        applied += 1

    # Atualiza o bloco de validação.
    v = brief.setdefault("_validation", {})
    v["personalization_pending"] = len(missing)
    # Arquétipo classificado pelo LLM sobrepõe o default heurístico do modeler.
    if archetype:
        brief["archetype"] = archetype
    brief["recast"] = {
        "engine": "recast_engine",
        "model": model_label,
        "recast_at": now,
        "slides_recast": applied,
        "slides_missing": missing,
    }
    return applied, missing


# ─────────────────────────────────────────────────────────────────────────────
# MODO PLAN-AWARE (MCI-04) — a produção executa o content_plan.
# ─────────────────────────────────────────────────────────────────────────────
def build_plan_execution_prompt(brief, identity):
    """Prompt de execução do content_plan — ancorado no TEMA CENTRAL."""
    plan = brief.get("content_plan", {}) or {}
    analysis = brief.get("benchmark_analysis", {}) or {}
    tema = plan.get("tema") or analysis.get("tema_central", "")
    ref_by_n = {s["slide_n"]: s for s in brief.get("content_data", [])}

    voz = yaml.dump(
        {"tom_de_voz": identity.get("tom_de_voz", {}),
         "restricoes": identity.get("restricoes", {})},
        allow_unicode=True, sort_keys=False,
    )

    plan_lines = []
    for ps in plan.get("slides", []):
        srcs = [n for n in (ps.get("source_slides") or []) if n in ref_by_n]
        ref_txt = " || ".join(
            f"\"{ref_by_n[n].get('reference_headline', '')}\": "
            f"{(ref_by_n[n].get('reference_body') or '')[:160]}"
            for n in srcs
        )
        plan_lines.append(
            f"Slide {ps.get('slide_n')} — papel: {ps.get('role', '')}\n"
            f"  kicker: {ps.get('kicker', '')}\n"
            f"  direção de copy: {ps.get('copy_direction', '')}\n"
            f"  fonte (benchmark): {ref_txt or '(n/a)'}"
        )
    plan_block = "\n\n".join(plan_lines)

    return f"""Você é o Master Copywriter da Virals. Execute o PLANO DE CONTEÚDO
abaixo, escrevendo o copy real de cada slide.

TEMA CENTRAL — ESCOPO OBRIGATÓRIO DO CRIATIVO:
"{tema}"
TODO slide deve servir e permanecer DENTRO desse tema. É o tema do benchmark e
NÃO pode ser trocado nem diluído.

PLANO DE CONTEÚDO (siga à risca: nº de slides, papel e direção de cada um):
{plan_block}

VOZ DA VIRALS (guia de estilo — não troca o assunto):
{voz}

FIDELIDADE AOS FATOS (INEGOCIÁVEL):
- Use SOMENTE números, percentuais, datas e quantidades que apareçam no texto
  de referência (benchmark) de cada slide. NÃO INVENTE estatística, "X%",
  "1,8× mais", "+1,2 mi", "subiu 34%", nem "pesquisa interna/estudo mostrou".
- Se o slide de referência NÃO tem número, NÃO crie um. Em vez disso, ancore o
  slide num FATO CONCRETO já presente na fonte (marca citada, evento, lugar,
  bastidor, mecanismo) — concretude vem do fato real, não de dado fabricado.
- Afirmação factual sem lastro na fonte é PROIBIDA. Na dúvida, escreva
  qualitativo e honesto em vez de quantitativo e inventado.

Para CADA slide do plano, escreva:
- "headline": REESCRITA em PT-BR na voz Virals, cumprindo a direção de copy.
  NUNCA copie o texto de referência literalmente. NUNCA escreva em inglês.
  NUNCA inclua @arroba, assinatura ou marca d'água do autor original —
  este é um post da VIRALS, não do autor do benchmark.
  NUNCA nomeie nem trate o autor do benchmark como personagem, especialista,
  entrevistado ou narrador. Se a fonte é o autor falando, escreva como
  observação do próprio criativo (sem sujeito-terceiro): ex. "A reação não
  deixa dúvidas" em vez de "Fulano, especialista, afirma que...".
- "body": 1 a 3 frases, PT-BR, voz Virals.
- "pexels_query": 2-4 palavras em inglês — conceito visual concreto do slide.

Proibido: promessa vazia, corporativês, linguagem genérica, ego-driven,
mistério, texto em inglês no headline/body, @handle de terceiros, NÚMERO OU
ESTATÍSTICA INVENTADOS (sem lastro na fonte) — e SOBRETUDO fugir do tema central.

Responda APENAS JSON válido, sem markdown:
{{"slides":[{{"slide_n":1,"headline":"...","body":"...","pexels_query":"..."}}]}}"""


def apply_plan_execution(brief, recast, model_label):
    """Reconstrói content_data conforme o content_plan executado."""
    now = datetime.datetime.now().isoformat(timespec="seconds")
    plan = brief.get("content_plan", {}) or {}
    analysis = brief.get("benchmark_analysis", {}) or {}
    ref_by_n = {s["slide_n"]: s for s in brief.get("content_data", [])}
    accent = (brief.get("brand_tokens", {}) or {}).get("accent", "#E94560")
    central_theme = plan.get("tema") or analysis.get("tema_central", "")

    new_content, missing = [], []
    plan_slides = plan.get("slides", [])
    last_idx = len(plan_slides) - 1
    for i, ps in enumerate(plan_slides):
        n = ps.get("slide_n", i + 1)
        r = recast.get(n, {})
        headline = str(r.get("headline", "")).strip()
        body = str(r.get("body", "")).strip()
        if not headline:
            missing.append(n)

        srcs = [s for s in (ps.get("source_slides") or []) if s in ref_by_n]
        triggers = []
        for s in srcs:
            triggers += ref_by_n[s].get("design_triggers", []) or []

        # MCI-V2-03: variant mapping respeita o role/kicker do plano.
        # Bug anterior: hardcode "HOOK if i==0 else CONTENT" suprimia CTA_THINK
        # mesmo quando o plano indicava CTA explicitamente.
        role_l = (ps.get("role", "") or "").lower()
        kicker_l = (ps.get("kicker", "") or "").lower()
        is_cta = (
            "cta" in role_l or "cta" in kicker_l
            or "desafio" in role_l or "call" in role_l or "provoca" in role_l
            or "pergunta" in role_l or "reflex" in role_l
        )
        if i == 0:
            variant_resolved = "HOOK"
        elif is_cta or i == last_idx:
            # Último slide sempre vira CTA_THINK (cumpre cta_estilo do brand-identity);
            # OU qualquer slide com role/kicker explicitamente de CTA.
            variant_resolved = "CTA"
        else:
            variant_resolved = "CONTENT"

        new_content.append({
            "slide_n": i + 1,
            "variant": variant_resolved,
            "role": ps.get("role", ""),
            "screenshot_ref": (ref_by_n[srcs[0]].get("screenshot_ref")
                               if srcs else None),
            "reference_headline": " / ".join(
                ref_by_n[s].get("reference_headline", "") for s in srcs),
            "reference_body": " ".join(
                ref_by_n[s].get("reference_body", "") for s in srcs),
            "headline": (headline or "[RECAST PENDENTE]").upper(),
            "sub_headline": (ps.get("kicker", "") or "INSIGHT").upper(),
            "body_text": body,
            "design_triggers": triggers[:8],
            "text_metrics": text_metrics(headline, body),
            "pexels_query": str(r.get("pexels_query", "")).strip(),
            "accent_color": accent,
            "source_slides": srcs,
            "personalization": {
                "status": "DONE",
                "directive": ps.get("copy_direction", ""),
                "recast_model": model_label,
                "recast_at": now,
            },
        })

    brief["content_data"] = new_content
    brief["central_theme"] = central_theme
    if plan.get("archetype"):
        brief["archetype"] = plan["archetype"]
    if isinstance(brief.get("carousel_brief"), dict):
        brief["carousel_brief"]["slide_count"] = len(new_content)

    v = brief.setdefault("_validation", {})
    v["status"] = "WARN" if missing else "PASS"
    v["personalization_pending"] = 0
    brief["recast"] = {
        "engine": "recast_engine/plan-aware",
        "model": model_label,
        "recast_at": now,
        "slides": len(new_content),
        "central_theme": central_theme,
        "slides_missing": missing,
    }
    return len(new_content) - len(missing), missing


# MCI-V2-02: blacklist de clichês motivacionais genéricos detectados via regex.
# Disparadores universais — vão além de qualquer brand-identity individual.
# Quando match, o recast é re-executado com diretiva específica de remoção.
CLICHE_BLACKLIST = [
    r"\bzona de conforto\b",
    r"\bextraordin[áa]rio\b",
    r"\btransforme sua vida\b",
    r"\bmude sua mentalidade\b",
    r"\bcomente?\s+['\"]?\w+['\"]?\b",   # "comente X", "comenta SAI"
    r"\bmanda no dm\b",
    r"\blink na bio\b",
    r"\bgaranta o seu\b",
    r"\bsegredo do\b",
    r"\bf[óo]rmula m[áa]gica\b",
    r"\bpasso a passo simples\b",
    r"\bacredite\b.*\bsonhe\b",
    r"\beu vou te ensinar\b",
]


def detect_cliches(text):
    """Retorna lista de clichês encontrados no texto (case-insensitive)."""
    if not text:
        return []
    found = []
    low = text.lower()
    for pattern in CLICHE_BLACKLIST:
        if re.search(pattern, low):
            found.append(pattern)
    return found


# ─────────────────────────────────────────────────────────────────────────────
# GUARD DETERMINÍSTICO DE FIDELIDADE AOS FATOS (anti-fabricação de números)
# ─────────────────────────────────────────────────────────────────────────────
# O modelo costuma ignorar a instrução textual e injetar estatísticas inventadas
# (%, ×, "+1,2 mi", "subiu 34%", "pesquisa interna"). Este guard DETECTA números
# sem lastro na fonte e dispara um reparo via LLM — prompt sozinho não basta.

# Frases que denunciam fabricação de evidência (qualitativa) — sempre suspeitas.
_FAKE_EVIDENCE_RE = re.compile(
    r"\b(pesquisa|estudo|dados?|levantamento|proje[çc][õo]es?)\s+intern[ao]s?\b"
    r"|\bsegundo\s+(?:pesquisa|estudo|dados)\b",
    re.IGNORECASE,
)
# Números com cara de ESTATÍSTICA (não meras contagens "4 marcas"):
#   percentuais, multiplicadores (1,8×), magnitudes (1,2 mi / 300 mil).
_STAT_NUM_RE = re.compile(
    r"\d+(?:[.,]\d+)?\s*%"
    r"|\d+(?:[.,]\d+)?\s*[×xX](?=\s|$|[a-zA-Z])"
    r"|\d+(?:[.,]\d+)?\s*(?:mi|mil|milh[õo]es?|milh[ãa]o|bilh[õo]es?|bi|k)\b",
    re.IGNORECASE,
)


# Token numérico genérico (com separador de milhar/decimal): "1.200", "1,8", "46".
_ANY_NUM_RE = re.compile(r"\d[\d.,]*\d|\d")
_YEAR_RE = re.compile(r"(?:19|20)\d{2}")


def _norm_num(frag):
    """Normaliza um fragmento numérico ao seu núcleo de dígitos (sem separadores)."""
    return re.sub(r"[.,]", "", "".join(re.findall(r"\d+", frag)))


def _reference_numbers(slide):
    """Núcleos de dígitos presentes na FONTE do slide (sem separadores)."""
    ref = f"{slide.get('reference_headline', '')} {slide.get('reference_body', '')}"
    return {_norm_num(m) for m in _ANY_NUM_RE.findall(ref)}


def detect_fabricated_numbers(slide):
    """Retorna fragmentos numéricos/evidências SEM lastro na fonte (MCI-06).

    Pega: percentuais, multiplicadores, magnitudes (%, ×, mi/mil/milhões) E
    inteiros multi-dígito (ex.: "1.200", "500") ausentes da fonte. NÃO pega:
    contagem de 1 dígito ("4 marcas") nem anos (1900-2099) — baixo risco.
    """
    text = f"{slide.get('headline', '')}  {slide.get('body_text', '')}"
    grounded = _reference_numbers(slide)
    flagged, seen_cores = [], set()

    # 1) Números com cara de estatística (%, ×, magnitude) — sempre suspeitos.
    for m in _STAT_NUM_RE.finditer(text):
        frag = m.group(0).strip()
        core = _norm_num(frag)
        if core and core not in grounded:
            flagged.append(frag)
            seen_cores.add(core)

    # 2) Inteiros multi-dígito sem lastro (contagens grandes fabricadas).
    for m in _ANY_NUM_RE.finditer(text):
        frag = m.group(0).strip()
        core = _norm_num(frag)
        if len(core) < 2:               # 1 dígito = contagem legítima ("4 marcas")
            continue
        if _YEAR_RE.fullmatch(core):     # ano → baixo risco, ignora
            continue
        if core in grounded or core in seen_cores:
            continue
        flagged.append(frag)
        seen_cores.add(core)

    # 3) "Pesquisa/dados/projeções internas" — fabricação de evidência.
    for m in _FAKE_EVIDENCE_RE.finditer(text):
        flagged.append(m.group(0).strip())
    return flagged


def build_fidelity_repair_prompt(flagged_slides, identity):
    """Prompt de reparo: reescreve headline/body removendo números fabricados."""
    voz = yaml.dump({"tom_de_voz": identity.get("tom_de_voz", {})},
                    allow_unicode=True, sort_keys=False)
    blocks = []
    for s, frags in flagged_slides:
        ref = f"{s.get('reference_headline', '')} {s.get('reference_body', '')}".strip()
        blocks.append(
            f"Slide {s['slide_n']}:\n"
            f"  headline atual: \"{s.get('headline', '')}\"\n"
            f"  body atual: \"{s.get('body_text', '')}\"\n"
            f"  FONTE (única origem permitida de número/fato): \"{ref or '(sem dados)'}\"\n"
            f"  NÚMEROS/EVIDÊNCIAS INVENTADOS A REMOVER: {frags}"
        )
    block = "\n\n".join(blocks)
    return f"""Você é editor de fidelidade factual da Virals. Os slides abaixo
contêm NÚMEROS e EVIDÊNCIAS que NÃO existem na fonte — foram alucinados.

TAREFA: reescreva headline e body de cada slide REMOVENDO todo número,
percentual, multiplicador, projeção e "pesquisa/dados internos" que não esteja
na FONTE. Mantenha o MESMO sentido, o tema e a voz — apenas troque a falsa
precisão por afirmação qualitativa honesta e concreta (use fatos reais da fonte:
marcas, evento, mecanismo). NÃO introduza NENHUM número novo.

VOZ (estilo):
{voz}

SLIDES A REPARAR:
{block}

Responda APENAS JSON válido, sem markdown:
{{"slides":[{{"slide_n":1,"headline":"...","body":"..."}}]}}"""


def enforce_fact_fidelity(brief, identity, model_label, max_iters=2):
    """Loop de reparo: detecta números fabricados e reescreve até limpar."""
    for it in range(1, max_iters + 1):
        flagged = []
        for s in brief.get("content_data", []):
            frags = detect_fabricated_numbers(s)
            if frags:
                flagged.append((s, frags))
        if not flagged:
            if it > 1:
                print("  ✓ Fidelidade factual: nenhum número fabricado restante.")
            return
        report = {s["slide_n"]: frags for s, frags in flagged}
        print(f"  ! Fidelidade (iter {it}): números sem lastro → {report}")
        prompt = build_fidelity_repair_prompt(flagged, identity)
        try:
            (_, fixed), _ = call_llm_json(prompt, parse_recast)
        except (RuntimeError, json.JSONDecodeError) as e:
            print(f"    reparo falhou ({e}); mantendo texto atual.")
            return
        for s in brief.get("content_data", []):
            r = fixed.get(s["slide_n"])
            if not r:
                continue
            if r.get("headline"):
                s["headline"] = str(r["headline"]).strip().upper()
            if "body" in r:
                s["body_text"] = str(r.get("body", "")).strip()
            s["text_metrics"] = text_metrics(s["headline"], s.get("body_text", ""))
        brief.setdefault("_validation", {})["fact_fidelity_repaired"] = report
    # Último passe: o que sobrar é registrado para o quality_gate.
    residual = {s["slide_n"]: f for s, f in
                [(s, detect_fabricated_numbers(s)) for s in brief.get("content_data", [])] if f}
    if residual:
        print(f"  ! AVISO: números fabricados persistentes após {max_iters} reparos → {residual}")
        brief.setdefault("_validation", {})["fact_fidelity_unresolved"] = residual


# ─────────────────────────────────────────────────────────────────────────────
# MCI-07/B: FIDELIDADE QUALITATIVA — fabricação de marca/data/instituição/citação.
# O guard numérico não pega invenção qualitativa (ex.: "entrevista à ESPN",
# "coleção 2022-2023", "especialistas da Nike"). Aqui um passe LLM-grounding
# detecta afirmações específicas SEM lastro na fonte e as reescreve em versão
# honesta. Uma allowlist determinística de entidades da fonte reduz falso-positivo.
# ─────────────────────────────────────────────────────────────────────────────
_CAP_SEQ_RE = re.compile(r"[A-ZÀ-Ý][\wÀ-ÿ]{2,}(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]{2,})*")


def source_entities(brief):
    """Conjunto (lowercase) de entidades/números JÁ presentes na fonte do brief.

    Usado como allowlist do guard qualitativo: marcas/lugares/anos citados no
    benchmark são permitidos; o resto específico é suspeito de fabricação.
    """
    blob = (brief.get("benchmark_caption", "") or "") + " " + (brief.get("central_theme", "") or "")
    for s in brief.get("content_data", []):
        blob += f" {s.get('reference_headline', '')} {s.get('reference_body', '')}"
    ents = set()
    for seq in _CAP_SEQ_RE.findall(blob):
        for w in seq.split():
            if len(w) >= 3:
                ents.add(w.lower())
    for n in re.findall(r"\d+", blob):
        ents.add(n)
    return ents


# Sinais de fabricação QUALITATIVA — atribuições/evidências sem lastro. PRECISO
# (não dispara em paráfrase legítima da fonte) → o loop de reparo converge.
# Cobre o que apareceu na validação: "campanhas oficiais", "menções online",
# "análises de mídia", "relatórios de mercado", "estudo/pesquisa ... mostram",
# "segundo ... apontam", "entrevista", veículos de mídia.
_FAKE_CLAIM_RE = re.compile(
    r"an[áa]lises?\s+de\s+m[íi]dia"
    r"|relat[óo]rios?\s+de\s+mercado"
    r"|men[çc][õo]es\s+online"
    r"|campanhas?\s+(?:publicit[áa]rias?\s+)?oficiais?"
    r"|testes?\s+de\s+laborat[óo]rio"
    r"|\b(?:estudos?|pesquisas?|levantamentos?|relat[óo]rios?|dados)\b[^.;:]{0,40}?"
    r"\b(?:most|apont|indic|revel|confirm|comprov)"
    # Atribuição por PAPEL (terceiro inventado) + verbo de evidência.
    r"|\b(?:treinadores?|t[ée]cnicos?|diretores?|especialistas?|analistas?|executivos?)\b"
    r"[^.;:]{0,60}?\b(?:confirm|afirm|declar|garant|apont|revel|most)"
    r"|\bsegundo\b[^.;:]{0,40}?\b(?:most|apont|indic|revel|confirm)"
    r"|\bentrevistas?\b"
    r"|\b(?:ESPN|Globo|CNN|UOL|Reuters|Bloomberg|Forbes)\b",
    re.IGNORECASE,
)


def detect_fabricated_claims(slide):
    """Fragmentos de ATRIBUIÇÃO/EVIDÊNCIA fabricada (qualitativa) na copy do slide."""
    text = f"{slide.get('headline', '')}  {slide.get('body_text', '')}"
    return [m.group(0).strip() for m in _FAKE_CLAIM_RE.finditer(text)]


def build_claim_repair_prompt(flagged_slides, identity):
    """Prompt de reparo: remove atribuições/evidências inventadas (qualitativas)."""
    voz = yaml.dump({"tom_de_voz": (identity or {}).get("tom_de_voz", {})},
                    allow_unicode=True, sort_keys=False)
    blocks = []
    for s, frags in flagged_slides:
        ref = f"{s.get('reference_headline', '')} {s.get('reference_body', '')}".strip()
        blocks.append(
            f"Slide {s['slide_n']}:\n"
            f"  headline atual: \"{s.get('headline', '')}\"\n"
            f"  body atual: \"{s.get('body_text', '')}\"\n"
            f"  FONTE (única origem permitida de fato): \"{ref or '(sem dados)'}\"\n"
            f"  ATRIBUIÇÕES/EVIDÊNCIAS INVENTADAS A REMOVER: {frags}"
        )
    block = "\n\n".join(blocks)
    return f"""Você é editor de fidelidade factual da Virals. Os slides abaixo
citam EVIDÊNCIAS ou ATRIBUIÇÕES que NÃO existem na fonte (foram inventadas):
"análises de mídia", "relatórios de mercado", "campanhas oficiais", "menções
online", "estudos/pesquisas mostram", "segundo X apontam", "entrevista", veículos.

TAREFA: reescreva headline e body REMOVENDO essas atribuições inventadas,
mantendo o MESMO sentido, tema e voz — troque a falsa evidência por afirmação
qualitativa honesta ancorada SÓ na fonte. NÃO introduza novas especificidades,
números, marcas, datas, veículos ou citações.

VOZ:
{voz}

SLIDES A REPARAR:
{block}

Responda APENAS JSON, sem markdown:
{{"slides":[{{"slide_n":1,"headline":"...","body":"..."}}]}}"""


def enforce_qualitative_fidelity(brief, identity, model_label, max_iters=2):
    """Detecção determinística (sinais de fabricação) + reparo LLM, em loop (MCI-07/B).

    Diferente do grounding aberto (ruidoso, não-convergente): aqui só atribuições
    fabricadas são marcadas → não dispara em paráfrase legítima da fonte e converge.
    """
    for it in range(1, max_iters + 1):
        flagged = [(s, detect_fabricated_claims(s)) for s in brief.get("content_data", [])]
        flagged = [(s, f) for s, f in flagged if f]
        if not flagged:
            if it > 1:
                print("  ✓ Fidelidade qualitativa: sem fabricação remanescente.")
            return
        report = {s["slide_n"]: f for s, f in flagged}
        print(f"  ! Fidelidade qualitativa (iter {it}): atribuições sem lastro → {report}")
        prompt = build_claim_repair_prompt(flagged, identity)
        try:
            (_, fixed), _ = call_llm_json(prompt, parse_recast)
        except (RuntimeError, json.JSONDecodeError) as e:
            print(f"    reparo qualitativo falhou ({e}); mantendo texto.")
            return
        for s in brief.get("content_data", []):
            r = fixed.get(s["slide_n"])
            if not r:
                continue
            if r.get("headline"):
                s["headline"] = str(r["headline"]).strip().upper()
            if "body" in r:
                s["body_text"] = str(r.get("body", "")).strip()
            s["text_metrics"] = text_metrics(s["headline"], s.get("body_text", ""))
    residual = {s["slide_n"]: f for s, f in
                [(s, detect_fabricated_claims(s)) for s in brief.get("content_data", [])] if f}
    if residual:
        print(f"  ! AVISO: fabricação qualitativa persistente após {max_iters} → {residual}")
        brief.setdefault("_validation", {})["qualitative_unresolved"] = residual


_HANDLE_RE = re.compile(r"@[\w.]+")
_URL_HANDLE_RE = re.compile(
    r"(?:instagram\.com|tiktok\.com/@|youtube\.com/@|twitter\.com|x\.com)/?@?([\w.]+)",
    re.IGNORECASE,
)


def _author_tokens(brief):
    """Deriva handles e nomes de exibição do AUTOR do benchmark (determinístico).

    Fontes: source_url, benchmark_caption e os @handles + nomes que aparecem no
    texto de REFERÊNCIA (ex.: padrão OCR "João Branco @falajoaobranco").
    """
    handles, names = set(), set()
    cb = brief.get("carousel_brief", {}) or brief.get("post_brief", {}) or {}
    url = str(cb.get("source_url", ""))
    m = _URL_HANDLE_RE.search(url)
    if m:
        handles.add(m.group(1).lower())

    ref_blob = brief.get("benchmark_caption", "") or ""
    for s in brief.get("content_data", []):
        ref_blob += f"  {s.get('reference_headline', '')}  {s.get('reference_body', '')}"
    # @handles soltos no texto de referência.
    for h in _HANDLE_RE.findall(ref_blob):
        handles.add(h.lstrip("@").lower())
    # Nome de exibição: 2-3 palavras Capitalizadas imediatamente antes de "@handle".
    for nm in re.findall(
        r"([A-ZÀ-Ý][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]+){1,2})\s+@[\w.]+", ref_blob):
        names.add(nm.strip())
    return handles, names


# MCI-07/A2: detecção de fragmento gramaticalmente quebrado pós-remoção do autor.
_ORPHAN_START_RE = re.compile(r"^(que|e|mas|porque|pois|tamb[ée]m|ent[ãa]o|assim)\b",
                              re.IGNORECASE)


def _looks_broken(text):
    """True se a frase parece um fragmento órfão (sujeito/terceiro removido)."""
    t = (text or "").strip()
    if not t:
        return False  # vazio é tratado pela regra de "não-esvaziar"
    if t[0].islower():            # começa minúsculo → continuação órfã (ex.: "garante que...")
        return True
    if _ORPHAN_START_RE.match(t):  # começa com conjunção/relativo solto
        return True
    return False


def _parse_text_json(raw):
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    obj = json.loads(m.group(0) if m else raw)
    return str(obj.get("text", "")).strip()


def _repair_fragment(text, ref, identity, upper=False):
    """Reescreve, via LLM, uma frase quebrada numa afirmação completa e coerente."""
    voz = yaml.dump({"tom_de_voz": (identity or {}).get("tom_de_voz", {})},
                    allow_unicode=True, sort_keys=False)
    prompt = f"""A frase abaixo ficou gramaticalmente quebrada após remover a menção
ao AUTOR de um benchmark (o sujeito/terceiro foi excisado). Reescreva-a como uma
afirmação COMPLETA e coerente em PT-BR, na voz do cliente, mantendo o MESMO
sentido. NÃO cite autor nem terceiros. NÃO invente fatos novos (números, marcas,
datas, entrevistas) que não estejam na FONTE.

VOZ:
{voz}
FRASE QUEBRADA: "{text}"
FONTE (apenas para preservar o sentido): "{ref or '(sem dados)'}"

Responda APENAS JSON, sem markdown: {{"text":"..."}}"""
    try:
        fixed, _ = call_llm_json(prompt, _parse_text_json)
    except (RuntimeError, json.JSONDecodeError):
        return None
    fixed = (fixed or "").strip()
    if not fixed:
        return None
    return fixed.upper() if upper else fixed


def sanitize_author_refs(brief, identity=None):
    """Remove @handles/nome do autor do benchmark de headline/body (MCI-06) e,
    quando a remoção deixa a frase QUEBRADA, dispara re-recast dirigido (MCI-07/A2).

    NÃO remove marcas citadas no corpo (só @handles e o nome do autor). Sem
    `identity` (ou se o reparo falhar), registra o slide em
    `_validation.sanitization_artifacts` para revisão.
    """
    handles, names = _author_tokens(brief)
    cleaned = 0

    def _scrub(text):
        if not text:
            return text, False
        original = text
        text = _HANDLE_RE.sub("", text)                       # qualquer @mention
        for h in handles:                                     # token do handle, ex.: "falajoaobranco"
            if h:
                text = re.sub(rf"\b{re.escape(h)}\b", "", text, flags=re.IGNORECASE)
        for nm in names:                                      # nome de exibição (≥2 palavras)
            text = re.sub(rf"\b{re.escape(nm)}\b", "", text, flags=re.IGNORECASE)
        # Limpeza de resíduos: espaços duplos e pontuação solta no início.
        text = re.sub(r"\s{2,}", " ", text)
        text = re.sub(r"^[\s:;,.\-—|]+", "", text).strip()
        # Nunca esvazia um campo que tinha conteúdo (evitaria headline em branco,
        # já que a sanitização roda depois do checklist e não seria revalidada).
        if not text and original.strip():
            return original, False
        return text, (text != original)

    def _flag(n):
        brief.setdefault("_validation", {}).setdefault("sanitization_artifacts", [])
        if n not in brief["_validation"]["sanitization_artifacts"]:
            brief["_validation"]["sanitization_artifacts"].append(n)

    for s in brief.get("content_data", []):
        ref = f"{s.get('reference_headline', '')} {s.get('reference_body', '')}".strip()
        h2, ch = _scrub(s.get("headline", ""))
        b2, cb2 = _scrub(s.get("body_text", ""))
        if ch:
            if _looks_broken(h2):
                rep = _repair_fragment(h2, ref, identity, upper=True) if identity is not None else None
                if rep:
                    h2 = rep
                else:
                    _flag(s["slide_n"])
            s["headline"] = h2.upper()   # headline é sempre caixa-alta neste pipeline
        if cb2:
            if _looks_broken(b2):
                rep = _repair_fragment(b2, ref, identity, upper=False) if identity is not None else None
                if rep:
                    b2 = rep
                else:
                    _flag(s["slide_n"])
            s["body_text"] = b2
        if ch or cb2:
            cleaned += 1
            s["text_metrics"] = text_metrics(s.get("headline", ""), s.get("body_text", ""))
    if cleaned:
        print(f"  ✓ Sanitização de autor: {cleaned} slide(s) limpos de @handle/nome.")
    return cleaned


def recast_brief(brief_path, client_slug=None):
    brief_path = brief_path.strip()
    print(f"=== Recast Engine — {os.path.basename(brief_path)} ===")

    if not os.path.exists(brief_path):
        raise FileNotFoundError(f"Brief não encontrado: {brief_path}")

    brief = _load_yaml(brief_path)
    client = resolve_from_argv_or_brief(client_slug, brief)
    print(f"Cliente  : {client.nome_exibicao} ({client.slug})")
    identity = _load_yaml(client.brand_identity)

    slides = brief.get("content_data", [])
    if not slides:
        raise ValueError("Brief sem content_data.")

    plan = brief.get("content_plan", {}) or {}
    if plan.get("slides"):
        # MODO PLAN-AWARE — a produção executa o content_plan (MCI-04).
        print(f"Modo plan-aware: executando o plano "
              f"({len(plan['slides'])} slides; benchmark tinha {len(slides)}).")
        prompt = build_plan_execution_prompt(brief, identity)
        (_, recast), model_label = call_llm_json(prompt, parse_recast)
        applied, missing = apply_plan_execution(brief, recast, model_label)
    else:
        # MODO LEGADO — recast 1:1 dos slides do benchmark.
        print(f"Modo legado: recast 1:1 ({len(slides)} slides).")
        prompt = build_prompt(brief, identity)
        (archetype, recast), model_label = call_llm_json(prompt, parse_recast)
        applied, missing = apply_recast(brief, recast, model_label, archetype)

    # Guard determinístico: remove números/evidências fabricados (sem lastro
    # na fonte). Roda ANTES da varredura de clichês para que o texto final
    # já esteja factualmente íntegro.
    print("Verificando fidelidade aos fatos (anti-fabricação)...")
    enforce_fact_fidelity(brief, identity, model_label)

    # MCI-06: remove @handle/nome do autor; MCI-07/A2: repara frase quebrada.
    sanitize_author_refs(brief, identity)

    # MCI-V2-02: varredura de clichês pós-recast. Slides com match são
    # marcados em _validation.cliches_detected para o quality_gate atacar.
    cliche_report = {}
    for s in brief.get("content_data", []):
        matches = detect_cliches(s.get("headline", "")) + detect_cliches(s.get("body_text", ""))
        if matches:
            cliche_report[s["slide_n"]] = list(set(matches))
    if cliche_report:
        print(f"AVISO: clichês detectados → {cliche_report} "
              f"(serão atacados pelo quality_gate C8)")
        brief.setdefault("_validation", {})["cliches_detected"] = cliche_report

    with open(brief_path, "w", encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)

    final = brief.get("content_data", [])
    print("-" * 60)
    print(f"Slides produzidos : {applied}/{len(final)}")
    if missing:
        print(f"Slides sem recast : {missing}")
    if brief.get("central_theme"):
        print(f"Tema central      : {brief['central_theme']}")
    print(f"Brief atualizado  : {brief_path}")
    print("-" * 60)
    for s in final:
        print(f"  s{s['slide_n']} [{s.get('variant', '')}] {s['headline'][:60]}")
    return applied, missing


if __name__ == "__main__":
    client_slug, _argv_rest = extract_client_arg(sys.argv[1:])
    if len(_argv_rest) < 1:
        print(
            "Uso: python squads/virals-marketing-squad/scripts/recast_engine.py "
            "<brief-v5-*.yaml> [--client=<slug>]"
        )
        sys.exit(1)
    try:
        applied, missing = recast_brief(_argv_rest[0], client_slug=client_slug)
    except (FileNotFoundError, ValueError, RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    sys.exit(0 if not missing else 3)
