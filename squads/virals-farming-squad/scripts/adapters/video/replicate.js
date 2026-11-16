/**
 * adapters/video/replicate.js — Tier B de vídeo: image-to-video via Replicate.
 *
 * ⚠️ REPLICATE É PAGO POR USO. O `daily_limit` baixo em config/ai-providers.yaml é
 * proposital — este tier existe para cobrir o intervalo entre "tier A esgotado" e
 * "cair para o procedural", não para uso liberal. Por isso este adapter foi
 * validado apenas em `check()` (uma chamada leve e gratuita à API de conta) e na
 * montagem do request de `generate()` — a chamada real de predição (que gera custo)
 * NÃO foi exercitada neste desenvolvimento.
 *
 * O modelo alvo é configurável via `REPLICATE_VIDEO_MODEL` (formato `owner/name`,
 * endpoint de "modelos oficiais" do Replicate, sem precisar de version hash). O
 * default abaixo é uma escolha razoável para image-to-video, mas o schema exato de
 * `input` VARIA por modelo — confirme os nomes de campo na página do modelo no
 * Replicate antes da primeira geração real em produção.
 */

const fs = require('fs');
const path = require('path');

const REPLICATE_API = 'https://api.replicate.com/v1';
// owner/name de um modelo oficial de image-to-video. Ajustável por ambiente porque
// o catálogo de modelos do Replicate muda com frequência.
const DEFAULT_MODEL = process.env.REPLICATE_VIDEO_MODEL || 'minimax/video-01';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'image/png';
}

/**
 * Upload da imagem local para o storage do Replicate. Preferido a mandar a imagem
 * como data: URI inline — mais robusto para PNGs de alguns MB (limite de tamanho
 * de request em base64 inline é mais apertado que o de upload dedicado).
 */
async function uploadImage(filePath, token) {
    const buf = fs.readFileSync(filePath);
    const blob = new Blob([buf], { type: mimeFor(filePath) });
    const form = new FormData();
    form.append('content', blob, path.basename(filePath));

    const res = await fetch(`${REPLICATE_API}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`upload HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const url = data.urls && data.urls.get;
    if (!url) throw new Error(`upload sem urls.get na resposta: ${JSON.stringify(data).slice(0, 200)}`);
    return url;
}

module.exports = {
    id: 'replicate-i2v',
    tier: 'B',
    kind: 'video',
    label: 'Image-to-video via Replicate',
    supportsImageInput: true,
    requiresAuth: 'REPLICATE_API_TOKEN',
    DEFAULT_MODEL,

    /**
     * GET /account é uma chamada leve e SEM CUSTO — apenas confirma que o token é
     * válido. Nunca dispara uma predição aqui (isso teria custo).
     */
    async check() {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return { available: false, reason: 'REPLICATE_API_TOKEN não definido no ambiente' };

        try {
            const res = await fetch(`${REPLICATE_API}/account`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) return { available: false, reason: 'REPLICATE_API_TOKEN inválido (HTTP 401)' };
            if (!res.ok) return { available: false, reason: `Replicate /account respondeu HTTP ${res.status}` };
            return { available: true };
        } catch (e) {
            return { available: false, reason: `falha ao validar token Replicate: ${e.message}` };
        }
    },

    /**
     * @param {object} req
     * @param {string} req.inputImage
     * @param {string} [req.prompt]
     * @param {number} [req.durationSeconds]
     * @param {string} req.outputPath
     */
    async generate({ inputImage, prompt, durationSeconds, outputPath }) {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return { ok: false, reason: 'REPLICATE_API_TOKEN não definido no ambiente' };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }

        let imageUrl;
        try {
            imageUrl = await uploadImage(inputImage, token);
        } catch (e) {
            return { ok: false, reason: `upload da imagem para Replicate falhou: ${e.message}` };
        }

        // ⚠️ Nomes de campo dependem do modelo em DEFAULT_MODEL. `image` e `prompt`
        // são os nomes mais comuns entre modelos de image-to-video no Replicate,
        // mas confirme no schema do modelo escolhido antes de usar em produção.
        const body = {
            input: {
                image: imageUrl,
                prompt: prompt || '',
                duration: Math.round(durationSeconds || 5),
            },
        };

        let prediction;
        try {
            const res = await fetch(`${REPLICATE_API}/models/${DEFAULT_MODEL}/predictions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Prefer: 'wait=1', // pede pro Replicate segurar a resposta se a predição for rápida
                },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 429) return { ok: false, quotaExceeded: true };
            if (!res.ok) return { ok: false, reason: `Replicate predictions HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}` };
            prediction = data;
        } catch (e) {
            return { ok: false, reason: `falha ao criar prediction Replicate: ${e.message}` };
        }

        // --- Polling até succeeded/failed/canceled ---
        const startedAt = Date.now();
        const TIMEOUT_MS = 5 * 60 * 1000;
        while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
            if (Date.now() - startedAt > TIMEOUT_MS) {
                return { ok: false, reason: `timeout aguardando prediction Replicate (${TIMEOUT_MS / 1000}s) — id: ${prediction.id}` };
            }
            await sleep(4000);
            try {
                const res = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return { ok: false, reason: `polling da prediction Replicate falhou (HTTP ${res.status})` };
                prediction = await res.json();
            } catch (e) {
                return { ok: false, reason: `falha no polling da prediction Replicate: ${e.message}` };
            }
        }

        if (prediction.status !== 'succeeded') {
            const errMsg = prediction.error ? String(prediction.error) : `status=${prediction.status}`;
            const quotaExceeded = /quota|rate.?limit|insufficient credit|billing/i.test(errMsg);
            if (quotaExceeded) return { ok: false, quotaExceeded: true };
            return { ok: false, reason: `Replicate prediction falhou: ${errMsg}` };
        }

        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        if (!outputUrl) return { ok: false, reason: 'prediction succeeded mas sem output utilizável' };

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            const res = await fetch(outputUrl);
            if (!res.ok) return { ok: false, reason: `download do vídeo Replicate falhou (HTTP ${res.status})` };
            fs.writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
            return { ok: false, reason: `falha ao salvar vídeo Replicate em disco: ${e.message}` };
        }

        return { ok: true, outputPath, meta: { model: DEFAULT_MODEL, predictionId: prediction.id } };
    },
};
