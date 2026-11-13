/**
 * adapters/video/veo.js — Tier A de vídeo: Google Veo via Gemini API.
 *
 * Geração de vídeo por Veo é uma operação de LONGA DURAÇÃO (LRO): o POST inicial
 * devolve um `operation.name`, e o resultado real só existe depois de fazer polling
 * até `done: true`. Isso pode levar de dezenas de segundos a poucos minutos.
 *
 * O modelo de vídeo disponível DEPENDE da chave/tier da API — não existe um nome
 * fixo confiável entre contas. Por isso `check()` consulta `GET /v1beta/models`
 * e filtra os que suportam geração de vídeo. Se nenhum aparecer, isso é um
 * resultado LEGÍTIMO (`available:false` com motivo claro), não um erro do adapter —
 * o roteador de cascata simplesmente pula este provider e desce para o tier B.
 *
 * A forma exata do payload de resposta da operação varia entre versões da API
 * (generateVideoResponse.generatedSamples[].video.uri, videoBytes inline, etc.).
 * Em vez de assumir um único schema, `findVideoRef()` busca recursivamente por
 * uma referência de vídeo (uri ou bytes base64) na resposta.
 */

const fs = require('fs');
const path = require('path');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Operação de longa duração: tempos generosos porque geração de vídeo é lenta.
const POLL_INTERVAL_MS = 10000;
const OPERATION_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutos

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
 * Busca recursivamente uma referência de vídeo (uri de download ou bytes inline)
 * dentro do payload de resposta da operação. Defensivo por design: a Gemini API
 * já mudou o formato de resposta de geração de vídeo entre versões.
 */
function findVideoRef(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return null;
    if (typeof obj.bytesBase64Encoded === 'string') return { bytesBase64: obj.bytesBase64Encoded };
    if (typeof obj.videoBytes === 'string') return { bytesBase64: obj.videoBytes };
    if (typeof obj.uri === 'string' && /video|download|files\//i.test(obj.uri)) return { uri: obj.uri };
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val && typeof val === 'object') {
            const found = findVideoRef(val, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Descobre o(s) modelo(s) de geração de vídeo disponíveis para esta API key.
 * Filtra por nome contendo "veo" OU por métodos suportados que indiquem geração
 * de vídeo assíncrona — cobre variações de naming entre versões do catálogo.
 */
async function discoverVideoModel(apiKey) {
    let res;
    try {
        res = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}`);
    } catch (e) {
        return { ok: false, reason: `falha de rede ao listar modelos Gemini: ${e.message}` };
    }
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, reason: `GET /models respondeu HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({}));
    const models = data.models || [];

    const videoModels = models.filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        const name = (m.name || '').toLowerCase();
        return name.includes('veo') || methods.includes('predictLongRunning') || methods.includes('generateVideo');
    });

    if (videoModels.length === 0) {
        return {
            ok: false,
            reason: `nenhum modelo de geração de vídeo (Veo) disponível para esta API key (${models.length} modelo(s) listado(s) no total). Verifique o tier de acesso da conta.`,
        };
    }

    // Sem uma ordem oficial de "melhor modelo" na listagem — ordena por nome
    // decrescente como heurística simples (versões mais novas costumam vir depois
    // alfabeticamente: veo-3 > veo-2).
    videoModels.sort((a, b) => b.name.localeCompare(a.name));
    return { ok: true, model: videoModels[0].name, allModels: videoModels.map((m) => m.name) };
}

module.exports = {
    id: 'veo',
    tier: 'A',
    kind: 'video',
    label: 'Google Veo (via Gemini API)',
    supportsImageInput: true,
    requiresAuth: 'GEMINI_API_KEY',
    _discoverVideoModel: discoverVideoModel, // exposto para inspeção/testes sem gerar vídeo real
    _findVideoRef: findVideoRef,

    async check() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { available: false, reason: 'GEMINI_API_KEY não definido no ambiente' };

        try {
            const disc = await discoverVideoModel(apiKey);
            if (!disc.ok) return { available: false, reason: disc.reason };
            return { available: true, model: disc.model };
        } catch (e) {
            return { available: false, reason: `falha ao consultar modelos Gemini: ${e.message}` };
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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { ok: false, reason: 'GEMINI_API_KEY não definido no ambiente' };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }

        let model;
        try {
            const disc = await discoverVideoModel(apiKey);
            if (!disc.ok) return { ok: false, reason: disc.reason };
            model = disc.model;
        } catch (e) {
            return { ok: false, reason: `descoberta de modelo Veo falhou: ${e.message}` };
        }

        const imageBuffer = fs.readFileSync(inputImage);
        const body = {
            instances: [
                {
                    prompt: prompt || '',
                    image: { bytesBase64Encoded: imageBuffer.toString('base64'), mimeType: mimeFor(inputImage) },
                },
            ],
            parameters: {
                aspectRatio: '9:16',
                // O Veo aceita SOMENTE 4..8s (verificado ao vivo: HTTP 400
                // "out of bound. Please provide a value between 4 and 8"). Takes de
                // farming vão de 1s a 20s+, então o valor precisa ser fixado na faixa —
                // a F5 corta/estende o clipe para a duração do plano depois.
                durationSeconds: Math.min(8, Math.max(4, Math.round(durationSeconds || 5))),
            },
        };

        // --- Dispara a operação de longa duração ---
        let op;
        try {
            const res = await fetch(`${GEMINI_BASE}/${model}:predictLongRunning?key=${encodeURIComponent(apiKey)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const asText = JSON.stringify(data);
                const quotaExceeded = res.status === 429 || /quota|resource_exhausted/i.test(asText);
                if (quotaExceeded) return { ok: false, quotaExceeded: true };
                return { ok: false, reason: `Veo predictLongRunning HTTP ${res.status}: ${asText.slice(0, 300)}` };
            }
            op = data;
        } catch (e) {
            return { ok: false, reason: `falha ao iniciar geração Veo: ${e.message}` };
        }

        if (!op.name) return { ok: false, reason: `resposta sem operation name: ${JSON.stringify(op).slice(0, 300)}` };

        // --- Polling até done:true ---
        const startedAt = Date.now();
        let finalOp = op;
        while (!finalOp.done) {
            if (Date.now() - startedAt > OPERATION_TIMEOUT_MS) {
                return { ok: false, reason: `timeout aguardando operação Veo (${OPERATION_TIMEOUT_MS / 1000}s) — operation: ${op.name}` };
            }
            await sleep(POLL_INTERVAL_MS);
            try {
                const res = await fetch(`${GEMINI_BASE}/${finalOp.name}?key=${encodeURIComponent(apiKey)}`);
                if (!res.ok) return { ok: false, reason: `polling da operação Veo falhou (HTTP ${res.status})` };
                finalOp = await res.json();
            } catch (e) {
                return { ok: false, reason: `falha no polling da operação Veo: ${e.message}` };
            }
        }

        if (finalOp.error) {
            const msg = finalOp.error.message || JSON.stringify(finalOp.error);
            const quotaExceeded = finalOp.error.code === 429 || /quota|resource_exhausted/i.test(msg);
            if (quotaExceeded) return { ok: false, quotaExceeded: true };
            return { ok: false, reason: `Veo retornou erro: ${msg}` };
        }

        const videoRef = findVideoRef(finalOp.response || {});
        if (!videoRef) {
            return { ok: false, reason: `operação concluída mas sem vídeo identificável na resposta: ${JSON.stringify(finalOp).slice(0, 300)}` };
        }

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            if (videoRef.bytesBase64) {
                fs.writeFileSync(outputPath, Buffer.from(videoRef.bytesBase64, 'base64'));
            } else {
                const dlUrl = videoRef.uri.includes('key=')
                    ? videoRef.uri
                    : `${videoRef.uri}${videoRef.uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
                const res = await fetch(dlUrl);
                if (!res.ok) return { ok: false, reason: `download do vídeo Veo falhou (HTTP ${res.status})` };
                fs.writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
            }
        } catch (e) {
            return { ok: false, reason: `falha ao salvar vídeo Veo em disco: ${e.message}` };
        }

        return { ok: true, outputPath, meta: { model } };
    },
};
