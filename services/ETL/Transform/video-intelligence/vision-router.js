const fs = require('fs');
const path = require('path');

/**
 * Vision Router — descobre modelos de visão GRATUITOS disponíveis AGORA,
 * consultando o catálogo do OpenRouter em vez de confiar numa lista fixa.
 *
 * Motivo (VEX-14): a lista hardcoded no local-transcriber apodreceu inteira —
 * os 4 modelos (`qwen-2-vl-72b`, `llama-3.2-90b-vision`, `gemini-flash-1.5-8b`,
 * `pixtral-12b`) sumiram do catálogo e a visão passou a falhar em silêncio,
 * escrevendo "No endpoints found" dentro da Transcrição.md entregue.
 *
 * É o mesmo padrão do yt-dlp defasado e do canário fixo do preflight: dado
 * externo copiado para dentro do código apodrece. A correção é sempre a mesma —
 * perguntar à fonte, com cache e degradação honesta.
 */

const CATALOGO_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6h: o catálogo muda em dias, não em minutos
const CACHE_FILE = path.join(__dirname, '.vision-models-cache.json');
const FETCH_TIMEOUT_MS = 15000;

/**
 * O roteador oficial de modelos gratuitos do OpenRouter. Escolhe sozinho um
 * modelo free disponível no momento — resolve a disponibilidade na origem, por
 * isso vem primeiro.
 */
const ROTEADOR_OFICIAL = 'openrouter/free';

/**
 * Modelos que o catálogo marca com `input_modalities: [image]` mas que NÃO
 * descrevem imagem: aceitam imagem para outra finalidade. Sem isto, a cascata
 * gasta tentativas (e minutos) com quem nunca vai responder o que precisamos.
 */
const INUTEIS_PARA_DESCRICAO = [
    /lyria/i,           // geração de música
    /content-safety/i,  // moderação: devolve veredito, não descrição
    /guard/i,           // idem
    /whisper/i,         // áudio
    /tts|speech/i,      // voz
    /embed/i            // embeddings
];

/** Fallback usado só quando a API não responde. Verificado em 2026-07-16. */
const FALLBACK_ESTATICO = [
    ROTEADOR_OFICIAL,
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free'
];

function ehGratuito(m) {
    const p = m.pricing || {};
    return parseFloat(p.prompt || '0') === 0 && parseFloat(p.completion || '0') === 0;
}

function aceitaImagem(m) {
    return (m.architecture?.input_modalities || []).includes('image');
}

function serveParaDescricao(id) {
    return !INUTEIS_PARA_DESCRICAO.some(re => re.test(id));
}

function lerCache() {
    try {
        const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        if (Date.now() - raw.gravado_em > CACHE_TTL_MS) return null;
        if (!Array.isArray(raw.models) || raw.models.length === 0) return null;
        return raw.models;
    } catch {
        return null;
    }
}

function gravarCache(models) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ gravado_em: Date.now(), models }, null, 2));
    } catch { /* cache é otimização, não requisito */ }
}

/**
 * Modelos de visão gratuitos, em ordem de tentativa.
 * NUNCA lança: sem rede, devolve cache velho ou o fallback estático — a visão
 * degradar é aceitável, o pipeline quebrar por causa dela não.
 *
 * @returns {Promise<string[]>}
 */
async function discoverFreeVisionModels(opts = {}) {
    if (!opts.force) {
        const cache = lerCache();
        if (cache) return cache;
    }

    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        const r = await fetch(CATALOGO_URL, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const { data } = await r.json();
        const descobertos = (data || [])
            .filter(m => ehGratuito(m) && aceitaImagem(m) && serveParaDescricao(m.id))
            // Contexto maior costuma indicar modelo mais capaz; é o melhor
            // proxy disponível sem medir qualidade a cada run.
            .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
            .map(m => m.id);

        // O roteador oficial primeiro: ele já resolve disponibilidade na origem.
        const lista = [ROTEADOR_OFICIAL, ...descobertos.filter(id => id !== ROTEADOR_OFICIAL)];

        if (lista.length <= 1) throw new Error('catálogo não retornou modelos de visão gratuitos');

        gravarCache(lista);
        console.log(`[VisionRouter] ${lista.length} modelos de visão gratuitos descobertos`);
        return lista;
    } catch (e) {
        const cacheVelho = (() => { try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')).models; } catch { return null; } })();
        if (cacheVelho?.length) {
            console.warn(`[VisionRouter] catálogo indisponível (${e.message}) — usando cache expirado`);
            return cacheVelho;
        }
        console.warn(`[VisionRouter] catálogo indisponível (${e.message}) — usando fallback estático`);
        return [...FALLBACK_ESTATICO];
    }
}

module.exports = {
    discoverFreeVisionModels,
    ehGratuito,
    aceitaImagem,
    serveParaDescricao,
    ROTEADOR_OFICIAL,
    FALLBACK_ESTATICO,
    CACHE_FILE
};
