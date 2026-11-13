/**
 * adapters/image/huggingface.js — Tier B · FLUX.1-schnell via HuggingFace (HF_TOKEN).
 *
 * PORQUÊ não usamos `api-inference.huggingface.co` (o endpoint clássico documentado na
 * task): esse domínio SAIU DO AR — confirmado ao vivo em 2026-07-26, `ENOTFOUND` no DNS.
 * A HF migrou toda a Inference API "serverless" para o roteador de Inference Providers
 * (`router.huggingface.co`), que reencaminha para provedores terceiros usando o MESMO
 * HF_TOKEN (é o que o SDK oficial @huggingface/inference faz por baixo do capô).
 *
 * Em vez de fixar um provider às cegas, descobrimos QUAL provider está "live" para este
 * modelo consultando `huggingface.co/api/models/.../inferenceProviderMapping` — mapeamento
 * ao vivo (fal-ai, nscale, replicate, wavespeed, together...) muda sem aviso.
 *
 * Só validamos de verdade o formato de corpo do provider `fal-ai` (200 OK ao vivo com
 * este HF_TOKEN). Os demais provedores do mapeamento usam esquemas de request PRÓPRIOS
 * e diferentes — tentar adivinhá-los sem testar reportaria "provider indisponível" por um
 * bug de esquema, não por falta real de cota. Por isso a lista de tentativa fica restrita
 * a fal-ai; se ele sair do ar, o adapter falha honestamente e o roteador (farm-images.js)
 * desce para o tier C (Pollinations), que nunca falha.
 */

const fs = require('fs');

const ROUTER_ROOT = 'https://router.huggingface.co';
const MODEL_INFO_URL = 'https://huggingface.co/api/models/black-forest-labs/FLUX.1-schnell?expand[]=inferenceProviderMapping';
const CACHE_TTL_MS = 10 * 60 * 1000;
const TESTED_PROVIDER = 'fal-ai';

let providerCache = null; // { at, providerId }

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discoverProvider() {
    if (providerCache && Date.now() - providerCache.at < CACHE_TTL_MS) return providerCache;

    const res = await fetch(MODEL_INFO_URL);
    if (!res.ok) throw new Error(`consulta de inferenceProviderMapping HTTP ${res.status}`);
    const json = await res.json();
    const mapping = json.inferenceProviderMapping || {};
    const entry = mapping[TESTED_PROVIDER];
    if (!entry || entry.status !== 'live') {
        throw new Error(`provider "${TESTED_PROVIDER}" não está "live" para FLUX.1-schnell no momento`);
    }

    providerCache = { at: Date.now(), providerId: entry.providerId };
    return providerCache;
}

/** FLUX.1-schnell é destilado e não tem conditioning negativo real — embutimos no texto. */
function buildPrompt(req) {
    let t = req.prompt || '';
    if (req.negative) t += `. Avoid: ${req.negative}`;
    return t;
}

function isQuotaSignal(status, bodyText) {
    return status === 429 || status === 402 || /quota|credit limit|rate limit/i.test(String(bodyText || ''));
}

async function callFal(key, providerId, req, attempt) {
    const url = `${ROUTER_ROOT}/fal-ai/${providerId}`;
    const body = {
        prompt: buildPrompt(req),
        image_size: { width: req.width || 1080, height: req.height || 1920 },
        ...(req.seed !== undefined && req.seed !== null ? { seed: req.seed } : {}),
    };

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
        });
    } catch (e) {
        return { ok: false, reason: `rede: ${e.message}` };
    }

    // Modelo "frio" no provider roteado — espera curta e tenta de novo, dentro do próprio
    // adapter (comportamento explicitamente pedido para o caso 503 de HF).
    if (res.status === 503 && attempt === 0) {
        await sleep(4000);
        return callFal(key, providerId, req, 1);
    }

    const text = await res.text();
    if (!res.ok) {
        if (isQuotaSignal(res.status, text)) return { ok: false, quotaExceeded: true };
        return { ok: false, reason: text.slice(0, 300) || `HTTP ${res.status}` };
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (_) {
        return { ok: false, reason: 'resposta não é JSON válido' };
    }

    const img = json.images && json.images[0];
    if (!img || !img.url) return { ok: false, reason: 'resposta sem images[0].url' };

    let imgRes;
    try {
        imgRes = await fetch(img.url);
    } catch (e) {
        return { ok: false, reason: `download da imagem falhou: ${e.message}` };
    }
    if (!imgRes.ok) return { ok: false, reason: `download da imagem falhou: HTTP ${imgRes.status}` };

    fs.writeFileSync(req.outputPath, Buffer.from(await imgRes.arrayBuffer()));
    return { ok: true, outputPath: req.outputPath };
}

module.exports = {
    id: 'hf-flux',
    tier: 'B',
    kind: 'image',
    supportsReferenceImage: false,
    requiresAuth: 'HF_TOKEN',

    async check() {
        if (!process.env.HF_TOKEN) return { available: false, reason: 'HF_TOKEN ausente' };
        try {
            await discoverProvider();
            return { available: true };
        } catch (e) {
            return { available: false, reason: e.message };
        }
    },

    async generate(req) {
        const key = process.env.HF_TOKEN;
        if (!key) return { ok: false, reason: 'HF_TOKEN ausente' };
        try {
            const { providerId } = await discoverProvider();
            return await callFal(key, providerId, req, 0);
        } catch (e) {
            return { ok: false, reason: e.message };
        }
    },
};
