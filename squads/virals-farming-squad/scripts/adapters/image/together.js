/**
 * adapters/image/together.js — Tier B · FLUX.1-schnell via Together AI (endpoint free).
 *
 * Sem imagem de referência (supportsReferenceImage: false) — Together/FLUX.1-schnell não
 * aceita image-to-image no plano free, só text-to-image.
 */

const fs = require('fs');

const ENDPOINT = 'https://api.together.xyz/v1/images/generations';
const MODEL = 'black-forest-labs/FLUX.1-schnell-Free';

/** FLUX.1-schnell é um modelo destilado (few-step) e não aceita negative_prompt de
 *  verdade — o jeito que funciona na prática é embutir a restrição no próprio texto. */
function buildPrompt(req) {
    let t = req.prompt || '';
    if (req.negative) t += ` (evite: ${req.negative})`;
    return t;
}

/** 429 é cota; 402 (Together cobra por crédito, não por assinatura) é a mesma coisa na
 *  prática — sem saldo, o provider está fora da rotação até o próximo dia. */
function isQuotaSignal(status, bodyText) {
    return status === 429 || status === 402 || /quota|credit limit|rate limit/i.test(String(bodyText || ''));
}

module.exports = {
    id: 'together-flux',
    tier: 'B',
    kind: 'image',
    supportsReferenceImage: false,
    requiresAuth: 'TOGETHER_API_KEY',

    async check() {
        if (!process.env.TOGETHER_API_KEY) return { available: false, reason: 'TOGETHER_API_KEY ausente' };
        return { available: true };
    },

    async generate(req) {
        const key = process.env.TOGETHER_API_KEY;
        if (!key) return { ok: false, reason: 'TOGETHER_API_KEY ausente' };

        const body = {
            model: MODEL,
            prompt: buildPrompt(req),
            width: req.width || 1080,
            height: req.height || 1920,
            n: 1,
            steps: 4,
            ...(req.seed !== undefined && req.seed !== null ? { seed: req.seed } : {}),
        };

        let res;
        try {
            res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
                body: JSON.stringify(body),
            });
        } catch (e) {
            return { ok: false, reason: `rede: ${e.message}` };
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

        const item = json.data && json.data[0];
        if (!item) return { ok: false, reason: 'resposta sem data[0]' };

        if (item.b64_json) {
            fs.writeFileSync(req.outputPath, Buffer.from(item.b64_json, 'base64'));
            return { ok: true, outputPath: req.outputPath };
        }

        if (item.url) {
            let imgRes;
            try {
                imgRes = await fetch(item.url);
            } catch (e) {
                return { ok: false, reason: `download da URL retornada falhou: ${e.message}` };
            }
            if (!imgRes.ok) return { ok: false, reason: `download da URL retornada falhou: HTTP ${imgRes.status}` };
            fs.writeFileSync(req.outputPath, Buffer.from(await imgRes.arrayBuffer()));
            return { ok: true, outputPath: req.outputPath };
        }

        return { ok: false, reason: 'resposta sem b64_json nem url' };
    },
};
