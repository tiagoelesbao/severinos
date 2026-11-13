/**
 * adapters/image/gemini.js — Tier A · Gemini 2.5 Flash Image ("Nano Banana") + Imagen (predict).
 *
 * PORQUÊ dois fluxos num arquivo só: config/ai-providers.yaml declara DOIS providers de
 * tier A apontando para este MESMO adapter — `gemini-image` (chat com saída de imagem,
 * verbo `generateContent`) e `gemini-imagen` (família Imagen, verbo `predict`). São APIs
 * de forma diferente por trás do mesmo domínio. farm-images.js informa qual variante
 * quer via `req.providerId` (campo extra ao contrato documentado em
 * tools/ai-provider-cascade.md — generate() ignora esse campo se ausente e assume a
 * variante 'gemini-image'). Nada aqui é hardcoded: o nome exato do modelo muda com o
 * catálogo do Google (confirmado ao vivo em 2026-07-26: gemini-2.5-flash-image,
 * gemini-3-pro-image, gemini-3.1-flash-image(-lite)-preview, imagen-4.0-*), então
 * `check()`/`generate()` sempre descobrem via `GET /v1beta/models`.
 */

const fs = require('fs');
const path = require('path');

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
const CACHE_TTL_MS = 10 * 60 * 1000;

let modelsCache = null; // { at, generateContentModel, predictModel }

async function listModels(key) {
    const res = await fetch(`${API_ROOT}/models?key=${key}`);
    if (!res.ok) throw new Error(`ListModels HTTP ${res.status}`);
    const json = await res.json();
    return json.models || [];
}

/** Estável antes de "preview"; dentro do mesmo grupo, ordem de declaração da API. */
function pickBest(candidates) {
    if (candidates.length === 0) return null;
    const stable = candidates.filter((m) => !/preview/i.test(m.name));
    return (stable[0] || candidates[0]).name.replace(/^models\//, '');
}

async function discover(key) {
    if (modelsCache && Date.now() - modelsCache.at < CACHE_TTL_MS) return modelsCache;

    const models = await listModels(key);
    const generateContentImage = models.filter(
        (m) => /image/i.test(m.name) && !/imagen/i.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')
    );
    const predictImage = models.filter(
        (m) => /imagen/i.test(m.name) && (m.supportedGenerationMethods || []).includes('predict')
    );

    modelsCache = {
        at: Date.now(),
        generateContentModel: pickBest(generateContentImage),
        predictModel: pickBest(predictImage),
    };
    return modelsCache;
}

function guessMime(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
}

/** O texto carrega os negativos — a API de imagem do Gemini não tem campo separado. */
function buildPromptText(req) {
    let t = req.prompt || '';
    if (req.negative) t += `\n\nEvite completamente: ${req.negative}.`;
    return t;
}

/** 429/RESOURCE_EXHAUSTED é cota (rebaixa tier); qualquer outro 4xx/5xx é erro transitório. */
function classifyHttpError(status, bodyText) {
    const text = String(bodyText || '');
    if (status === 429 || /resource_exhausted|quota/i.test(text)) {
        return { ok: false, quotaExceeded: true };
    }
    return { ok: false, reason: text.slice(0, 300) || `HTTP ${status}` };
}

async function generateContentFlow(key, model, req) {
    const parts = [{ text: buildPromptText(req) }];
    if (req.referenceImage && fs.existsSync(req.referenceImage)) {
        const data = fs.readFileSync(req.referenceImage).toString('base64');
        // Imagem de referência é o diferencial do tier A: mostra o enquadramento em vez de descrevê-lo.
        parts.push({ inlineData: { mimeType: guessMime(req.referenceImage), data } });
    }

    const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '9:16' },
            ...(req.seed !== undefined && req.seed !== null ? { seed: req.seed } : {}),
        },
    };

    const res = await fetch(`${API_ROOT}/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return classifyHttpError(res.status, text);

    let json;
    try {
        json = JSON.parse(text);
    } catch (_) {
        return { ok: false, reason: 'resposta não é JSON válido' };
    }

    const cand = json.candidates && json.candidates[0];
    const cparts = cand && cand.content && cand.content.parts;
    const imgPart = (cparts || []).find((p) => p.inlineData && p.inlineData.data);
    if (!imgPart) {
        const feedback = (cand && cand.finishReason) || (json.promptFeedback && JSON.stringify(json.promptFeedback)) || 'nenhuma imagem retornada';
        return { ok: false, reason: String(feedback).slice(0, 300) };
    }

    fs.writeFileSync(req.outputPath, Buffer.from(imgPart.inlineData.data, 'base64'));
    return { ok: true, outputPath: req.outputPath };
}

async function predictFlow(key, model, req, includeSeed = true) {
    const wantsSeed = includeSeed && req.seed !== undefined && req.seed !== null;
    const body = {
        instances: [{ prompt: buildPromptText(req) }],
        parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
            ...(wantsSeed ? { seed: req.seed } : {}),
        },
    };

    const res = await fetch(`${API_ROOT}/models/${model}:predict?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
        // Observado ao vivo: alguns modelos Imagen rejeitam `seed` explícito (400,
        // "Setting seed is not supported") mesmo quando o modelo em si está acessível.
        // Perder a consistência de seed é melhor do que falhar o take inteiro por causa
        // de um parâmetro opcional — tenta de novo sem seed antes de desistir.
        if (wantsSeed && res.status === 400 && /seed/i.test(text)) {
            return predictFlow(key, model, req, false);
        }
        return classifyHttpError(res.status, text);
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (_) {
        return { ok: false, reason: 'resposta não é JSON válido' };
    }

    const pred = json.predictions && json.predictions[0];
    const b64 = pred && (pred.bytesBase64Encoded || pred.image);
    if (!b64) return { ok: false, reason: 'predict sem bytesBase64Encoded na resposta' };

    fs.writeFileSync(req.outputPath, Buffer.from(b64, 'base64'));
    return { ok: true, outputPath: req.outputPath };
}

module.exports = {
    id: 'gemini-image',
    tier: 'A',
    kind: 'image',
    supportsReferenceImage: true,
    requiresAuth: 'GEMINI_API_KEY',

    async check() {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return { available: false, reason: 'GEMINI_API_KEY ausente' };
        try {
            const info = await discover(key);
            if (!info.generateContentModel && !info.predictModel) {
                return { available: false, reason: 'ListModels não retornou nenhum modelo de imagem (generateContent nem predict)' };
            }
            return { available: true };
        } catch (e) {
            return { available: false, reason: `descoberta de modelo falhou: ${e.message}` };
        }
    },

    async generate(req) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return { ok: false, reason: 'GEMINI_API_KEY ausente' };

        // req.providerId é extra ao contrato documentado — permite diferenciar as duas
        // entradas de tier A do YAML (gemini-image vs gemini-imagen) sem duplicar arquivo.
        const wantsImagen = req.providerId === 'gemini-imagen';

        try {
            const info = await discover(key);
            if (wantsImagen) {
                if (!info.predictModel) return { ok: false, reason: 'nenhum modelo Imagen (predict) disponível para esta chave' };
                return await predictFlow(key, info.predictModel, req);
            }
            if (!info.generateContentModel) return { ok: false, reason: 'nenhum modelo de imagem via generateContent disponível para esta chave' };
            return await generateContentFlow(key, info.generateContentModel, req);
        } catch (e) {
            return { ok: false, reason: e.message };
        }
    },
};
