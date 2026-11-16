/**
 * adapters/image/pollinations.js — Tier C · Pollinations.ai (sem chave, degrau final).
 *
 * PORQUÊ este arquivo precisa ser o mais robusto de todos: é o degrau que "nunca falha"
 * do princípio da cascata (tools/ai-provider-cascade.md). Se A e B esgotarem ou derem
 * erro, todo take do lote cai aqui — timeout generoso e 2 tentativas com backoff.
 *
 * Nota observada ao vivo (2026-07-26): o endpoint anônimo/free devolve a imagem com o
 * lado maior limitado a ~1024px, preservando a PROPORÇÃO exata do que foi pedido (ex.:
 * pedir 1080x1920 devolve 576x1024 — mesma razão 9:16). Por isso a validação de 9:16 em
 * farm-images.js checa a PROPORÇÃO com tolerância, não o pixel exato — travar em 1080x1920
 * literal quebraria o único degrau que tem a obrigação de nunca falhar.
 */

const fs = require('fs');

const ENDPOINT_ROOT = 'https://image.pollinations.ai/prompt';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pollinations não documenta negative_prompt formal — embutimos a restrição no texto. */
function buildPrompt(req) {
    let t = req.prompt || '';
    if (req.negative) t += `. Avoid: ${req.negative}`;
    return t;
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    id: 'pollinations',
    tier: 'C',
    kind: 'image',
    supportsReferenceImage: false,
    requiresAuth: null,

    async check() {
        // Degrau final: sem chave, sempre tentável. Não fazemos ping de rede aqui —
        // qualquer falha real aparece (e é tratada com retry) dentro de generate().
        return { available: true };
    },

    async generate(req) {
        const width = req.width || 1080;
        const height = req.height || 1920;
        const params = new URLSearchParams({ width: String(width), height: String(height), nologo: 'true' });
        if (req.seed !== undefined && req.seed !== null) params.set('seed', String(req.seed));
        const url = `${ENDPOINT_ROOT}/${encodeURIComponent(buildPrompt(req))}?${params.toString()}`;

        const timeouts = [45000, 75000]; // generoso — degrau final não pode desistir cedo
        let lastReason = 'falha desconhecida';

        for (let attempt = 0; attempt < timeouts.length; attempt++) {
            try {
                const res = await fetchWithTimeout(url, timeouts[attempt]);

                if (res.status === 429) return { ok: false, quotaExceeded: true };

                if (!res.ok) {
                    lastReason = `HTTP ${res.status}`;
                } else {
                    const buf = Buffer.from(await res.arrayBuffer());
                    if (buf.length < 500) {
                        lastReason = `resposta suspeita (${buf.length} bytes)`;
                    } else {
                        fs.writeFileSync(req.outputPath, buf);
                        return { ok: true, outputPath: req.outputPath };
                    }
                }
            } catch (e) {
                lastReason = e.name === 'AbortError' ? `timeout após ${timeouts[attempt]}ms` : e.message;
            }

            if (attempt < timeouts.length - 1) await sleep(3000);
        }

        return { ok: false, reason: lastReason };
    },
};
