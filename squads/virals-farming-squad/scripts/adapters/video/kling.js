/**
 * adapters/video/kling.js — Tier B de vídeo: Kling AI image-to-video.
 *
 * A API oficial da Kling (api-singapore.klingai.com / api.klingai.com) NÃO aceita
 * um bearer token simples. Ela exige um JWT (HS256) assinado com DUAS credenciais:
 * uma Access Key (vai no claim `iss`) e uma Secret Key (usada para assinar). Esse
 * par normalmente é emitido junto no console da Kling — a Access Key sozinha não
 * serve para nada sem a Secret Key correspondente.
 *
 * ⚠️ INVESTIGAÇÃO REAL (2026-07-26): o ambiente só expõe `KLING_API_KEY` — uma
 * única string opaca (57 chars, prefixo "api-key-kling-", sem separador `:`/`|`
 * que sugerisse um par embutido). NÃO existe `KLING_ACCESS_KEY`/`KLING_SECRET_KEY`
 * no ambiente. Isso é estruturalmente insuficiente para montar o JWT do esquema
 * oficial — por isso `check()` retorna `available:false` com o motivo específico
 * em vez de inventar um endpoint/header que nunca foi confirmado. Nenhuma chamada
 * de rede foi feita para "testar" essa chave sozinha contra o endpoint oficial,
 * porque isso não provaria nada: sem a secret key não há como assinar o JWT, e
 * mandar a string crua como Bearer só produziria um 401 sem informação nova.
 *
 * O código de `generate()` abaixo implementa o esquema oficial POR COMPLETO (JWT
 * manual via `crypto`, sem dependência nova) para o dia em que a Secret Key for
 * fornecida — mas isso NÃO foi exercitado nem contra o endpoint real, porque as
 * credenciais para isso não existem neste ambiente ainda.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KLING_BASE = process.env.KLING_API_BASE || 'https://api-singapore.klingai.com';
const DEFAULT_MODEL = process.env.KLING_VIDEO_MODEL || 'kling-v1';

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

function toBase64(filePath) {
    return fs.readFileSync(filePath).toString('base64');
}

function base64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * JWT HS256 manual (sem dependência nova) no formato documentado pela Kling:
 * header {alg:HS256, typ:JWT}, payload {iss: accessKey, exp: agora+30min, nbf: agora-5s}.
 * NÃO EXERCITADO CONTRA O ENDPOINT REAL — ver nota de topo do arquivo.
 */
function buildKlingJwt(accessKey, secretKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }));
    const signingInput = `${header}.${payload}`;
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(signingInput)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `${signingInput}.${signature}`;
}

/**
 * Resolve as credenciais necessárias. Aceita `KLING_ACCESS_KEY`+`KLING_SECRET_KEY`
 * (esquema oficial, par completo) como caminho preferencial; `KLING_API_KEY`
 * sozinha é reportada como insuficiente — não é inventado um uso alternativo pra ela.
 */
function resolveCredentials() {
    const accessKey = process.env.KLING_ACCESS_KEY || null;
    const secretKey = process.env.KLING_SECRET_KEY || process.env.KLING_SECRET || null;
    if (accessKey && secretKey) return { ok: true, accessKey, secretKey };

    const single = process.env.KLING_API_KEY || null;
    return {
        ok: false,
        hasSingleKey: !!single,
        reason: single
            ? 'a API oficial da Kling exige DUAS credenciais (Access Key + Secret Key) para assinar um JWT HS256 — ' +
              'só existe "KLING_API_KEY" no ambiente (um único valor opaco). Peça ao dono a Secret Key que normalmente ' +
              'é emitida junto com a Access Key no console da Kling, e exponha como KLING_ACCESS_KEY + KLING_SECRET_KEY. ' +
              'Se "KLING_API_KEY" na verdade veio de um agregador/proxy (ex.: PiAPI, Segmind) que aceita bearer simples, ' +
              'essa é uma integração DIFERENTE da API oficial — preciso da documentação desse proxy específico para ' +
              'implementar corretamente (endpoint e schema mudam por provedor); não vou adivinhar.'
            : 'nenhuma credencial da Kling definida no ambiente (KLING_ACCESS_KEY + KLING_SECRET_KEY, ou KLING_API_KEY).',
    };
}

module.exports = {
    id: 'kling-i2v',
    tier: 'B',
    kind: 'video',
    label: 'Kling AI image-to-video',
    supportsImageInput: true,
    requiresAuth: 'KLING_ACCESS_KEY+KLING_SECRET_KEY', // não é um único env var — ver resolveCredentials()
    _resolveCredentials: resolveCredentials, // exposto para inspeção/testes

    async check() {
        const creds = resolveCredentials();
        if (!creds.ok) return { available: false, reason: creds.reason };

        // Só chegamos aqui se algum dia existir o par completo. Uma checagem leve:
        // consultar uma tarefa inexistente com o JWT montado.
        try {
            const jwt = buildKlingJwt(creds.accessKey, creds.secretKey);
            const res = await fetch(`${KLING_BASE}/v1/videos/image2video/aiox-probe-${Date.now()}`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (res.status === 401 || res.status === 403) {
                const body = await res.text().catch(() => '');
                return { available: false, reason: `Kling rejeitou o JWT (HTTP ${res.status}): ${body.slice(0, 200)}` };
            }
            return { available: true };
        } catch (e) {
            return { available: false, reason: `falha ao validar credenciais Kling: ${e.message}` };
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
        const creds = resolveCredentials();
        if (!creds.ok) return { ok: false, reason: creds.reason };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }

        const jwt = buildKlingJwt(creds.accessKey, creds.secretKey);

        let submitData;
        try {
            const res = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_name: DEFAULT_MODEL,
                    image: toBase64(inputImage),
                    prompt: prompt || '',
                    duration: String(Math.round(durationSeconds || 5)),
                }),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

            if (res.status === 429) return { ok: false, quotaExceeded: true };
            if (!res.ok) return { ok: false, reason: `Kling submit HTTP ${res.status}: ${text.slice(0, 300)}` };
            submitData = data;
        } catch (e) {
            return { ok: false, reason: `falha ao submeter geração Kling: ${e.message}` };
        }

        const taskId = submitData.data && submitData.data.task_id;
        if (!taskId) return { ok: false, reason: `resposta sem task_id: ${JSON.stringify(submitData).slice(0, 300)}` };

        // --- Polling ---
        const startedAt = Date.now();
        let status = null;
        let videoUrl = null;
        while (status !== 'succeed') {
            if (Date.now() - startedAt > OPERATION_TIMEOUT_MS) {
                return { ok: false, reason: `timeout aguardando geração Kling (${OPERATION_TIMEOUT_MS / 1000}s) — task_id: ${taskId}` };
            }
            await sleep(POLL_INTERVAL_MS);
            let data;
            try {
                // O JWT tem validade curta (30min) — reconstruímos a cada poll para
                // não expirar em gerações demoradas.
                const pollJwt = buildKlingJwt(creds.accessKey, creds.secretKey);
                const res = await fetch(`${KLING_BASE}/v1/videos/image2video/${taskId}`, {
                    headers: { Authorization: `Bearer ${pollJwt}` },
                });
                data = await res.json();
            } catch (e) {
                return { ok: false, reason: `falha no polling Kling: ${e.message}` };
            }
            status = data.data && data.data.task_status;
            if (status === 'failed') {
                return { ok: false, reason: `geração Kling falhou: ${JSON.stringify(data).slice(0, 300)}` };
            }
            const videos = data.data && data.data.task_result && data.data.task_result.videos;
            if (videos && videos[0] && videos[0].url) videoUrl = videos[0].url;
        }

        if (!videoUrl) return { ok: false, reason: 'status succeed mas sem URL de vídeo na resposta' };

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            const res = await fetch(videoUrl);
            if (!res.ok) return { ok: false, reason: `download do vídeo Kling falhou (HTTP ${res.status})` };
            fs.writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
            return { ok: false, reason: `falha ao salvar vídeo Kling em disco: ${e.message}` };
        }

        return { ok: true, outputPath, meta: { model: DEFAULT_MODEL, taskId } };
    },
};
