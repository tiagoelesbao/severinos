/**
 * adapters/image/cloudflare.js — Tier B · Cloudflare Workers AI (FLUX.1-schnell + SDXL).
 *
 * Dois providers de tier B compartilham este arquivo — `cloudflare-flux` (resposta JSON
 * com a imagem em `result.image`, base64) e `cloudflare-sdxl` (PNG binário direto no
 * corpo). A mesma convenção usada em adapters/image/gemini.js resolve qual variante
 * rodar: farm-images.js repassa `req.model` e `req.response`, lidos direto das colunas
 * `model`/`response` de cada entrada do YAML — este adapter não hardcoda nenhum dos
 * dois nomes de modelo.
 *
 * DESCOBERTA AO VIVO (2026-07-26): o teste inicial do dono (só `prompt` + `steps`) saiu
 * 1024×1024 — o default quadrado de ambos os modelos quando width/height não são
 * enviados. Testado aqui mandando `width: 1080, height: 1920` explícitos no corpo: AMBOS
 * os modelos respeitam exatamente o que é pedido — FLUX devolveu 1080×1920 pixel a
 * pixel, SDXL idem (confirmado com ffprobe, sem nenhum crop/resize). Ou seja, o "cavalo
 * de batalha" de tier B não precisa de pós-processamento na prática — mas a rede de
 * segurança via ffmpeg (crop centralizado + scale) continua ativa abaixo, para o caso de
 * a Cloudflare mudar o comportamento do modelo (parar de aceitar dimensão, ou voltar a
 * arredondar pra um bucket quadrado): melhor entregar 9:16 corrigido do que reprovar o
 * take na validação de farm-images.js.
 *
 * `extra_env: CLOUDFLARE_ACCOUNT_ID` é uma coluna do YAML que `_quota-ledger.js` não
 * enxerga — `resolveProviderChain()` só filtra por `auth_env`. Por isso a ausência da
 * account ID é tratada aqui dentro de `check()`/`generate()`, não no roteador.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('../../_niche-loader.js');

function ffmpegPath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}
function ffprobePath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

function probeImage(filePath) {
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 20000 }
    );
    const out = (r.stdout || '').trim();
    const [w, h] = out.split(',').map((n) => parseInt(n, 10));
    return { width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null };
}

/** Mesma tolerância de 2% usada em farm-images.js — arredondamento de provider não é falha. */
function isVertical916(probe, tolerance = 0.02) {
    if (!probe.width || !probe.height) return false;
    const ratio = probe.width / probe.height;
    return Math.abs(ratio - 9 / 16) / (9 / 16) <= tolerance;
}

/**
 * Rede de segurança: crop centralizado para a razão 9:16 e depois scale exato para
 * targetW×targetH. Só é acionada se a validação de proporção falhar — não roda no
 * caminho feliz (que, na prática observada, é sempre o caso aqui).
 */
function forceVertical916(filePath, targetW, targetH) {
    const tmp = `${filePath}.tmp.png`;
    const vf = `crop='min(iw,ih*${targetW}/${targetH})':'min(ih,iw*${targetH}/${targetW})',scale=${targetW}:${targetH}`;
    const r = spawnSync(ffmpegPath(), ['-y', '-i', filePath, '-vf', vf, tmp], { windowsHide: true, timeout: 30000 });
    if (r.status !== 0 || !fs.existsSync(tmp)) return false;
    fs.unlinkSync(filePath);
    fs.renameSync(tmp, filePath);
    return true;
}

function isQuotaSignal(status, bodyText) {
    return status === 429 || /quota|rate limit exceeded|too many requests/i.test(String(bodyText || ''));
}

async function callModel(req) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const model = req.model;
    const responseKind = req.response || 'base64_json';
    const width = req.width || 1080;
    const height = req.height || 1920;

    const body = { prompt: req.prompt || '', width, height };
    if (req.seed !== undefined && req.seed !== null) body.seed = req.seed;
    // SDXL aceita negative_prompt de verdade; FLUX-schnell é destilado e não tem
    // conditioning negativo real — enviar o campo pra ele não quebra nada, mas também
    // não faz efeito, então só mandamos quando o modelo é a família SDXL.
    if (req.negative && /stable-diffusion/i.test(model || '')) body.negative_prompt = req.negative;
    if (/flux/i.test(model || '')) body.steps = 4; // teto documentado do schnell na Cloudflare

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });
    } catch (e) {
        return { ok: false, reason: `rede: ${e.message}` };
    }

    if (responseKind === 'binary') {
        if (!res.ok) {
            const text = await res.text();
            if (isQuotaSignal(res.status, text)) return { ok: false, quotaExceeded: true };
            return { ok: false, reason: text.slice(0, 300) || `HTTP ${res.status}` };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 512) return { ok: false, reason: `resposta binária suspeita (${buf.length} bytes)` };
        fs.writeFileSync(req.outputPath, buf);
    } else {
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

        if (json.success === false) {
            const errs = (json.errors || []).map((e) => e.message).join('; ');
            if (isQuotaSignal(res.status, errs)) return { ok: false, quotaExceeded: true };
            return { ok: false, reason: errs || 'Cloudflare retornou success:false' };
        }

        const b64 = json.result && json.result.image;
        if (!b64) return { ok: false, reason: 'resposta sem result.image' };
        fs.writeFileSync(req.outputPath, Buffer.from(b64, 'base64'));
    }

    // Verificado ao vivo que ambos os modelos respeitam width/height — isto é rede de
    // segurança, não o caminho esperado. Só corrige se realmente vier fora de 9:16.
    const probe = probeImage(req.outputPath);
    if (!isVertical916(probe)) {
        const fixed = forceVertical916(req.outputPath, width, height);
        if (!fixed) {
            return { ok: false, reason: `imagem fora de 9:16 (${probe.width || '?'}x${probe.height || '?'}) e o ajuste via ffmpeg falhou` };
        }
    }

    return { ok: true, outputPath: req.outputPath };
}

module.exports = {
    // id "informativo" — a variante real de fato usada em cada chamada vem de
    // req.model/req.response, repassados pelo YAML via farm-images.js.
    id: 'cloudflare-flux',
    tier: 'B',
    kind: 'image',
    supportsReferenceImage: false,
    requiresAuth: 'CLOUDFLARE_API_TOKEN',

    async check() {
        if (!process.env.CLOUDFLARE_API_TOKEN) return { available: false, reason: 'CLOUDFLARE_API_TOKEN ausente' };
        // extra_env do YAML — o roteador (_quota-ledger.js) só filtra por auth_env, então
        // a ausência da account ID precisa ser pega aqui dentro, não lá.
        if (!process.env.CLOUDFLARE_ACCOUNT_ID) return { available: false, reason: 'CLOUDFLARE_ACCOUNT_ID ausente (extra_env não coberto pelo roteador)' };
        return { available: true };
    },

    async generate(req) {
        if (!process.env.CLOUDFLARE_API_TOKEN) return { ok: false, reason: 'CLOUDFLARE_API_TOKEN ausente' };
        if (!process.env.CLOUDFLARE_ACCOUNT_ID) return { ok: false, reason: 'CLOUDFLARE_ACCOUNT_ID ausente' };
        if (!req.model) return { ok: false, reason: 'req.model ausente — farm-images.js deve repassar provider.model do YAML' };
        try {
            return await callModel(req);
        } catch (e) {
            return { ok: false, reason: e.message };
        }
    },
};
