/**
 * adapters/video/minimax.js — Tier A de vídeo: MiniMax / Hailuo image-to-video.
 *
 * Documentação oficial: https://platform.minimax.io/docs/api-reference
 * (não foi possível abrir a página ao vivo neste ambiente — este adapter foi
 * construído a partir de chamadas REAIS de descoberta contra a API, descritas
 * abaixo, não a partir de suposição sobre o schema.)
 *
 * Fluxo (padrão MiniMax de vídeo assíncrono):
 *   1. POST /v1/video_generation           → { task_id, base_resp }
 *   2. GET  /v1/query/video_generation?task_id=...  → polling até status="Success"
 *   3. GET  /v1/files/retrieve?file_id=...  → { file: { download_url } }
 *   4. GET  download_url                    → bytes do mp4
 *
 * ⚠️ ESTADO REAL VERIFICADO EM 2026-07-26 (chamadas ao vivo contra api.minimax.io):
 * - Auth com `Authorization: Bearer {MINIMAX_API_KEY}` é ACEITA — confirmado com
 *   `GET /v1/query/video_generation?task_id=probe-inexistente` devolvendo HTTP 200
 *   com `base_resp.status_code=2013` ("this task_id does not exist"), não um erro
 *   de autenticação.
 * - O MODELO CORRETO para image-to-video é a família `I2V-01` (`I2V-01`,
 *   `I2V-01-live`, `I2V-01-Director` todos resolvidos e cobraram
 *   "first_frame_image is required" quando chamados sem imagem — ou seja, o nome
 *   do modelo é válido e o campo obrigatório é exatamente `first_frame_image`).
 *   Modelos testados e rejeitados por nome inválido: nenhum destes; `hailuo-02`
 *   (minúsculo) foi rejeitado como nome incorreto, mas `MiniMax-Hailuo-02` e
 *   `video-01`/`T2V-01` SÃO reconhecidos (não são i2v — não usados aqui).
 * - UMA GERAÇÃO REAL foi tentada com `I2V-01` + `first_frame_image` (data URI da
 *   imagem de teste) + prompt — passou por TODA a validação de parâmetros e foi
 *   barrada em `base_resp.status_code=1008` ("insufficient balance"). Ou seja: a
 *   CONTA ESTÁ SEM SALDO para gerar vídeo agora — isso é um problema de billing
 *   da conta, não do adapter. Por causa disso, o polling (passos 2-4) não foi
 *   exercitado com uma geração completa de verdade.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.minimax.io/v1';
const DEFAULT_MODEL = process.env.MINIMAX_VIDEO_MODEL || 'I2V-01';

const POLL_INTERVAL_MS = 8000;
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

function toDataUri(filePath) {
    const buf = fs.readFileSync(filePath);
    return `data:${mimeFor(filePath)};base64,${buf.toString('base64')}`;
}

/**
 * Códigos conhecidos de `base_resp.status_code` que indicam problema de
 * AUTENTICAÇÃO (não de parâmetro nem de saldo). A família 100x costuma ser auth
 * na documentação pública do MiniMax; tratamos com heurística na mensagem como
 * reforço, já que não confirmamos a lista completa ao vivo.
 */
function isAuthError(statusCode, statusMsg) {
    const msg = String(statusMsg || '').toLowerCase();
    return [1002, 1004, 1027].includes(statusCode) || /invalid api key|unauthorized|token/i.test(msg);
}

function isBalanceError(statusCode, statusMsg) {
    return statusCode === 1008 || /insufficient balance/i.test(String(statusMsg || ''));
}

module.exports = {
    id: 'minimax-hailuo',
    tier: 'A',
    kind: 'video',
    label: 'MiniMax / Hailuo image-to-video',
    supportsImageInput: true,
    requiresAuth: 'MINIMAX_API_KEY',
    DEFAULT_MODEL,

    /**
     * Reproduz EXATAMENTE a checagem já validada ao vivo: uma consulta de status
     * com um task_id inexistente. `status_code=2013` ("task_id não existe") prova
     * que a auth passou — um erro de auth teria um código diferente e chegaria
     * antes de sequer olhar o task_id.
     */
    async check() {
        const key = process.env.MINIMAX_API_KEY;
        if (!key) return { available: false, reason: 'MINIMAX_API_KEY não definido no ambiente' };

        try {
            const res = await fetch(`${API_BASE}/query/video_generation?task_id=aiox-probe-${Date.now()}`, {
                headers: { Authorization: `Bearer ${key}` },
            });
            if (res.status === 401 || res.status === 403) {
                return { available: false, reason: `MINIMAX_API_KEY rejeitado no transporte HTTP (${res.status})` };
            }
            const data = await res.json().catch(() => ({}));
            const br = data.base_resp || {};
            if (isAuthError(br.status_code, br.status_msg)) {
                return { available: false, reason: `MiniMax rejeitou a chave: base_resp ${br.status_code} — ${br.status_msg}` };
            }
            // status_code=2013 (task não existe) é o resultado ESPERADO e confirmado ao vivo.
            return { available: true };
        } catch (e) {
            return { available: false, reason: `falha ao validar MINIMAX_API_KEY: ${e.message}` };
        }
    },

    /**
     * @param {object} req
     * @param {string} req.inputImage
     * @param {string} [req.prompt]
     * @param {number} [req.durationSeconds]  informativo — I2V-01 tende a gerar clipe de duração fixa
     * @param {string} req.outputPath
     */
    async generate({ inputImage, prompt, outputPath }) {
        const key = process.env.MINIMAX_API_KEY;
        if (!key) return { ok: false, reason: 'MINIMAX_API_KEY não definido no ambiente' };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }

        // --- Dispara a geração ---
        let submitData;
        try {
            const res = await fetch(`${API_BASE}/video_generation`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    prompt: prompt || '',
                    first_frame_image: toDataUri(inputImage),
                }),
            });
            submitData = await res.json();
        } catch (e) {
            return { ok: false, reason: `falha ao submeter geração MiniMax: ${e.message}` };
        }

        const br = submitData.base_resp || {};
        if (br.status_code && br.status_code !== 0) {
            if (isBalanceError(br.status_code, br.status_msg)) {
                // Saldo esgotado: mesmo tratamento de "rebaixar" que quota estourada —
                // o roteador não precisa distinguir "sem cota" de "sem saldo".
                return { ok: false, quotaExceeded: true, reason: `MiniMax sem saldo: ${br.status_msg}` };
            }
            if (isAuthError(br.status_code, br.status_msg)) {
                return { ok: false, reason: `MiniMax rejeitou a chave: ${br.status_msg}` };
            }
            return { ok: false, reason: `MiniMax submit falhou: base_resp ${br.status_code} — ${br.status_msg}` };
        }

        const taskId = submitData.task_id;
        if (!taskId) return { ok: false, reason: `resposta sem task_id: ${JSON.stringify(submitData).slice(0, 300)}` };

        // --- Polling até Success/Fail ---
        const startedAt = Date.now();
        let status = 'Queueing';
        let fileId = null;
        while (status !== 'Success') {
            if (Date.now() - startedAt > OPERATION_TIMEOUT_MS) {
                return { ok: false, reason: `timeout aguardando geração MiniMax (${OPERATION_TIMEOUT_MS / 1000}s) — task_id: ${taskId}` };
            }
            await sleep(POLL_INTERVAL_MS);
            let data;
            try {
                const res = await fetch(`${API_BASE}/query/video_generation?task_id=${encodeURIComponent(taskId)}`, {
                    headers: { Authorization: `Bearer ${key}` },
                });
                data = await res.json();
            } catch (e) {
                return { ok: false, reason: `falha no polling MiniMax: ${e.message}` };
            }
            status = data.status;
            fileId = data.file_id || fileId;
            if (status === 'Fail') {
                return { ok: false, reason: `geração MiniMax falhou: ${JSON.stringify(data).slice(0, 300)}` };
            }
        }

        if (!fileId) return { ok: false, reason: 'status Success mas sem file_id — não há como buscar o arquivo' };

        // --- Recupera a URL de download ---
        let fileData;
        try {
            const res = await fetch(`${API_BASE}/files/retrieve?file_id=${encodeURIComponent(fileId)}`, {
                headers: { Authorization: `Bearer ${key}` },
            });
            fileData = await res.json();
        } catch (e) {
            return { ok: false, reason: `falha ao recuperar arquivo MiniMax: ${e.message}` };
        }

        const downloadUrl = fileData.file && fileData.file.download_url;
        if (!downloadUrl) return { ok: false, reason: `files/retrieve sem download_url: ${JSON.stringify(fileData).slice(0, 300)}` };

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            const res = await fetch(downloadUrl);
            if (!res.ok) return { ok: false, reason: `download do vídeo MiniMax falhou (HTTP ${res.status})` };
            fs.writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
            return { ok: false, reason: `falha ao salvar vídeo MiniMax em disco: ${e.message}` };
        }

        return { ok: true, outputPath, meta: { model: DEFAULT_MODEL, taskId, fileId } };
    },
};
