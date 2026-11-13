"""Model Router — descobre modelos de TEXTO gratuitos do OpenRouter em runtime.

Motivo (VEX-14): a lista fixa `OPENROUTER_MODELS` do recast_engine apodreceu —
3 dos 4 modelos (gpt-oss-120b, deepseek-v4-flash, glm-4.5-air) devolveram 404
(sumiram do catálogo) e a síntese estratégica do Chief falhou por esgotar a
cascata. É o mesmo padrão do yt-dlp defasado, do canário fixo do preflight e da
lista de modelos de visão: dado externo copiado para dentro do código apodrece.

Espelha o `vision-router.js` (lado JS, para visão). A correção é sempre a mesma:
perguntar à fonte, com cache e degradação honesta.
"""

import json
import os
import time
import urllib.request

_CATALOGO_URL = "https://openrouter.ai/api/v1/models"
_CACHE_TTL_S = 6 * 3600  # o catálogo muda em dias, não em minutos
_CACHE_FILE = os.path.join(os.path.dirname(__file__), ".text-models-cache.json")
_FETCH_TIMEOUT_S = 15

# Roteador oficial de modelos gratuitos do OpenRouter: escolhe sozinho um modelo
# free disponível no momento. Resolve disponibilidade na origem → vem primeiro.
ROTEADOR_OFICIAL = "openrouter/free"

# Aceitam texto mas não servem para geração de análise/síntese.
_INUTEIS = ("guard", "content-safety", "lyria", "whisper", "tts", "speech", "embed")

# Rede de segurança quando o catálogo não responde. Verificado em 2026-07-17.
_FALLBACK_ESTATICO = [
    ROTEADOR_OFICIAL,
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]


def _eh_gratuito(m):
    p = m.get("pricing") or {}
    try:
        return float(p.get("prompt", "0")) == 0 and float(p.get("completion", "0")) == 0
    except (TypeError, ValueError):
        return False


def _eh_texto(m):
    arch = m.get("architecture") or {}
    inp = arch.get("input_modalities") or []
    out = arch.get("output_modalities") or []
    return "text" in inp and "text" in out


def _util(model_id):
    return not any(tok in model_id for tok in _INUTEIS)


def _ler_cache():
    try:
        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if time.time() - raw.get("gravado_em", 0) > _CACHE_TTL_S:
            return None
        models = raw.get("models")
        return models if isinstance(models, list) and models else None
    except (OSError, ValueError):
        return None


def _gravar_cache(models):
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({"gravado_em": time.time(), "models": models}, f, indent=2)
    except OSError:
        pass  # cache é otimização, não requisito


def discover_free_text_models(force=False):
    """Modelos de texto gratuitos, em ordem de tentativa.

    NUNCA lança: sem rede, devolve cache velho ou fallback estático — a síntese
    degradar é aceitável, o pipeline quebrar por causa dela não.
    """
    if not force:
        cache = _ler_cache()
        if cache:
            return cache

    try:
        req = urllib.request.Request(_CATALOGO_URL, headers={"User-Agent": "virals-etl"})
        with urllib.request.urlopen(req, timeout=_FETCH_TIMEOUT_S) as resp:
            data = json.loads(resp.read().decode("utf-8")).get("data", [])

        descobertos = [
            m["id"] for m in sorted(
                (m for m in data if _eh_gratuito(m) and _eh_texto(m) and _util(m.get("id", ""))),
                key=lambda m: m.get("context_length", 0),
                reverse=True,
            )
        ]
        # O roteador oficial primeiro; ele já resolve disponibilidade na origem.
        lista = [ROTEADOR_OFICIAL] + [i for i in descobertos if i != ROTEADOR_OFICIAL]

        if len(lista) <= 1:
            raise RuntimeError("catálogo sem modelos de texto gratuitos")

        _gravar_cache(lista)
        print(f"  [ModelRouter] {len(lista)} modelos de texto gratuitos descobertos")
        return lista
    except Exception as e:  # noqa: BLE001 — degradação honesta, nunca propaga
        try:
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                velho = json.load(f).get("models")
            if velho:
                print(f"  [ModelRouter] catálogo indisponível ({e}) — cache expirado")
                return velho
        except (OSError, ValueError):
            pass
        print(f"  [ModelRouter] catálogo indisponível ({e}) — fallback estático")
        return list(_FALLBACK_ESTATICO)
