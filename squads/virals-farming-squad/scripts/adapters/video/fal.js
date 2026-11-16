/**
 * adapters/video/fal.js — Tier A de vídeo: image-to-video via fal.ai (fila assíncrona).
 *
 * fal.ai usa um padrão de FILA uniforme entre todos os modelos do catálogo:
 *   1. POST https://queue.fal.run/{model}         → { request_id, status_url?, response_url? }
 *   2. GET  {status_url}                           → polling até status === "COMPLETED"
 *   3. GET  {response_url}                          → payload final com a saída do modelo
 *
 * Quando a resposta do submit já traz `status_url`/`response_url` prontos, usamos eles
 * (é o comportamento documentado da fal). Como fallback defensivo, construímos as URLs
 * manualmente a partir do padrão `{model}/requests/{request_id}[/status]` — mas preferir
 * os campos da resposta é mais robusto porque alguns `model` têm mais de dois segmentos
 * de path (ex.: "fal-ai/kling-video/v1.6/standard/image-to-video").
 *
 * ⚠️ ESTADO REAL VERIFICADO EM 2026-07-26 (via chamadas ao vivo, não suposição):
 * - Auth com header `Authorization: Key {FAL_KEY}` é ACEITA (confirmado 2x: GET no
 *   endpoint de submit devolve 405 Method Not Allowed — não 401 — e um POST real com
 *   payload de teste chega até o controle de saldo, não é barrado na autenticação).
 * - O modelo `fal-ai/kling-video/v1.6/standard/image-to-video` (default abaixo) FOI
 *   CONFIRMADO como resolvível: um POST real com `image_url` (data URI base64) e
 *   `prompt` chegou ao controle de saldo da conta, não a um erro de modelo
 *   inexistente/schema inválido.
 * - A CONTA ESTÁ COM SALDO ZERADO: `{"detail":"User is locked. Reason: Exhausted
 *   balance. Top up your balance at fal.ai/dashboard/billing."}` (HTTP 403). Isso é
 *   um problema de billing da conta, não do adapter — reportado ao dono, não escondido.
 *   Por causa disso, o fluxo de polling (passos 2-3) NÃO foi exercitado com uma
 *   geração real completa; foi validado só até o ponto em que o saldo bloqueia.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_BASE = 'https://queue.fal.run';
// Confirmado resolvível ao vivo (ver nota acima). Ajustável por ambiente porque o
// catálogo de modelos da fal muda com frequência.
const DEFAULT_MODEL = process.env.FAL_VIDEO_MODEL || 'fal-ai/kling-video/v1.6/standard/image-to-video';

const POLL_INTERVAL_MS = 6000;
const OPERATION_TIMEOUT_MS = 6 * 60 * 1000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'image/png';
}

/** Imagem local → data URI base64. fal aceita isso diretamente no campo de imagem — sem upload extra. */
function toDataUri(filePath) {
    const buf = fs.readFileSync(filePath);
    return `data:${mimeFor(filePath)};base64,${buf.toString('base64')}`;
}

/** Busca recursiva por uma URL de vídeo na resposta final — schema de saída varia por modelo. */
function findVideoUrl(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    if (typeof obj.url === 'string' && /\.(mp4|mov|webm)(\?|$)/i.test(obj.url)) return obj.url;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val && typeof val === 'object') {
            const found = findVideoUrl(val, depth + 1);
            if (found) return found;
        }
        if (typeof val === 'string' && /\.(mp4|mov|webm)(\?|$)/i.test(val)) return val;
    }
    return null;
}

module.exports = {
    id: 'fal-i2v',
    tier: 'A',
    kind: 'video',
    label: 'Image-to-video via fal.ai',
    supportsImageInput: true,
    requiresAuth: 'FAL_KEY',
    DEFAULT_MODEL,

    /**
     * GET no endpoint de submit não é o verbo aceito (só POST) — por isso o gateway
     * SEMPRE devolve 405 aqui, exista ou não o modelo. Isso é exatamente o sinal que
     * precisamos: 401/403 de auth vs. 405 de "chave ok, verbo errado".
     */
    async check() {
        const key = process.env.FAL_KEY;
        if (!key) return { available: false, reason: 'FAL_KEY não definido no ambiente' };

        try {
            const res = await fetch(`${QUEUE_BASE}/${DEFAULT_MODEL}`, {
                method: 'GET',
                headers: { Authorization: `Key ${key}` },
            });
            if (res.status === 401 || res.status === 403) {
                const body = await res.text().catch(() => '');
                // 403 pode ser tanto chave inválida quanto saldo esgotado — diferenciamos pelo corpo.
                if (/balance|locked/i.test(body)) {
                    return { available: false, reason: `conta fal.ai sem saldo: ${body.slice(0, 200)}` };
                }
                return { available: false, reason: `FAL_KEY rejeitado (HTTP ${res.status}): ${body.slice(0, 200)}` };
            }
            // 405 (verbo errado) ou qualquer outro código != 401/403 = a chave passou pela auth.
            return { available: true };
        } catch (e) {
            return { available: false, reason: `falha ao validar FAL_KEY: ${e.message}` };
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
        const key = process.env.FAL_KEY;
        if (!key) return { ok: false, reason: 'FAL_KEY não definido no ambiente' };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }

        const body = {
            image_url: toDataUri(inputImage),
            prompt: prompt || '',
            duration: String(Math.round(durationSeconds || 5)),
        };

        // --- Submete o job na fila ---
        let submitData;
        try {
            const res = await fetch(`${QUEUE_BASE}/${DEFAULT_MODEL}`, {
                method: 'POST',
                headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

            if (res.status === 403 && /balance|locked/i.test(text)) {
                // Saldo esgotado NÃO é o mesmo que cota diária esgotada (não há reposição
                // automática), mas do ponto de vista do roteador de cascata o efeito é o
                // mesmo: este provider não pode ser usado agora — rebaixa.
                return { ok: false, quotaExceeded: true, reason: `saldo fal.ai esgotado: ${text.slice(0, 200)}` };
            }
            if (res.status === 429) return { ok: false, quotaExceeded: true };
            if (!res.ok) return { ok: false, reason: `fal submit HTTP ${res.status}: ${text.slice(0, 300)}` };
            submitData = data;
        } catch (e) {
            return { ok: false, reason: `falha ao submeter job fal.ai: ${e.message}` };
        }

        const requestId = submitData.request_id;
        if (!requestId) return { ok: false, reason: `resposta sem request_id: ${JSON.stringify(submitData).slice(0, 300)}` };

        const statusUrl = submitData.status_url || `${QUEUE_BASE}/${DEFAULT_MODEL}/requests/${requestId}/status`;
        const responseUrl = submitData.response_url || `${QUEUE_BASE}/${DEFAULT_MODEL}/requests/${requestId}`;

        // --- Polling até COMPLETED ---
        const startedAt = Date.now();
        let statusData = { status: 'IN_QUEUE' };
        while (statusData.status !== 'COMPLETED') {
            if (Date.now() - startedAt > OPERATION_TIMEOUT_MS) {
                return { ok: false, reason: `timeout aguardando job fal.ai (${OPERATION_TIMEOUT_MS / 1000}s) — request_id: ${requestId}` };
            }
            await sleep(POLL_INTERVAL_MS);
            try {
                const res = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
                if (!res.ok) return { ok: false, reason: `polling fal.ai falhou (HTTP ${res.status})` };
                statusData = await res.json();
            } catch (e) {
                return { ok: false, reason: `falha no polling fal.ai: ${e.message}` };
            }
            if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
                return { ok: false, reason: `job fal.ai falhou: ${JSON.stringify(statusData).slice(0, 300)}` };
            }
        }

        // --- Busca o resultado final ---
        let result;
        try {
            const res = await fetch(responseUrl, { headers: { Authorization: `Key ${key}` } });
            if (!res.ok) return { ok: false, reason: `busca do resultado fal.ai falhou (HTTP ${res.status})` };
            result = await res.json();
        } catch (e) {
            return { ok: false, reason: `falha ao buscar resultado fal.ai: ${e.message}` };
        }

        const videoUrl = findVideoUrl(result);
        if (!videoUrl) return { ok: false, reason: `resultado sem vídeo identificável: ${JSON.stringify(result).slice(0, 300)}` };

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            const res = await fetch(videoUrl);
            if (!res.ok) return { ok: false, reason: `download do vídeo fal.ai falhou (HTTP ${res.status})` };
            fs.writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
            return { ok: false, reason: `falha ao salvar vídeo fal.ai em disco: ${e.message}` };
        }

        return { ok: true, outputPath, meta: { model: DEFAULT_MODEL, requestId } };
    },
};
