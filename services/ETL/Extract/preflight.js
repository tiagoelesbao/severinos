const { execFileSync } = require('child_process');

const { ensureYtDlpFresh, restoreYtDlpBackup } = require('./toolchain');
const { looksLikeAuthFailure, SESSION_FILES } = require('./auth/session-bridge');

/**
 * Preflight: valida cada plataforma ANTES de processar a fila.
 *
 * Em 2026-07-11 o benchmark rodou 11 minutos para produzir 10 análises de
 * thumbnail. Um --simulate de 5s por plataforma teria detectado a quebra antes
 * do primeiro download (VEX-14).
 *
 * A sonda usa a PRIMEIRA URL REAL da fila de cada plataforma, não um canário
 * fixo: um link hardcoded apodrece (é deletado, vira privado) e passa a abortar
 * benchmarks perfeitamente saudáveis — falso negativo é pior que não ter
 * preflight. A URL da fila é o que vamos processar de qualquer forma.
 */

const PROBE_TIMEOUT_MS = 30000;
/** Quantas URLs da fila sondar antes de condenar a plataforma. */
const MAX_PROBES = 3;

/**
 * O yt-dlp só sabe responder sobre VÍDEO. Sondar um post estático (`/p/` sem
 * vídeo) devolve erro por motivo legítimo — e tomar isso por "plataforma
 * quebrada" abortaria um benchmark saudável. Só sondamos o que é sondável.
 */
function isVideoUrl(url = '') {
    return ['/reel/', '/reels/', '/watch', '/shorts/', 'tiktok.com'].some(p => url.includes(p));
}

/** Script de renovação de sessão por plataforma (o prefixo não é derivável do nome). */
const LOGIN_SCRIPTS = {
    instagram: 'services/ETL/Extract/scrapers/ig-login.js',
    tiktok: 'services/ETL/Extract/scrapers/tt-login.js',
    linkedin: 'services/ETL/Extract/scrapers/li-login.js'
};

function simulate(binPath, url, cookiesPath) {
    const args = ['--simulate', '--no-warnings', '--no-check-certificates'];
    if (cookiesPath) args.push('--cookies', cookiesPath);
    args.push(url);

    try {
        execFileSync(binPath, args, { timeout: PROBE_TIMEOUT_MS, windowsHide: true, stdio: 'pipe' });
        return { ok: true };
    } catch (e) {
        const stderr = (e.stderr && e.stderr.toString()) || e.message || '';
        const lastLine = stderr.trim().split('\n').filter(Boolean).slice(-1)[0] || 'erro desconhecido';
        return { ok: false, error: lastLine };
    }
}

/**
 * Checa uma plataforma sondando URLs reais da fila, remediando o que der.
 *
 * Sonda até `maxProbes` URLs e só condena a plataforma se TODAS falharem: um
 * link deletado é rotina (e bloquear o benchmark por causa dele seria pior que
 * não ter preflight), enquanto uma plataforma quebrada falha em todos.
 *
 * @param {string} platform
 * @param {string} binPath
 * @param {string[]} probeUrls - URLs reais da fila, em ordem
 * @returns {{platform: string, ok: boolean, remediation?: string, error?: string, hint?: string}}
 */
function checkPlatform(platform, binPath, probeUrls, opts = {}) {
    const urls = (Array.isArray(probeUrls) ? probeUrls : [probeUrls]).filter(Boolean);
    if (urls.length === 0) return { platform, ok: true, remediation: 'sem URL para sondar — pulado' };

    const resolveCookies = opts.resolveCookies || require('./auth/session-bridge').resolveCookies;

    // Caminho feliz: qualquer URL que passe já prova que a plataforma responde.
    let attempt;
    for (let i = 0; i < urls.length; i++) {
        attempt = simulate(binPath, urls[i], null);
        if (attempt.ok) {
            return {
                platform,
                ok: true,
                remediation: i > 0 ? `sonda ${i + 1}/${urls.length} (as anteriores estão indisponíveis)` : undefined
            };
        }
    }

    // Todas falharam — agora vale investigar, usando a última como cobaia.
    const probeUrl = urls[urls.length - 1];

    // Remediação 1 — binário defasado. Causa nº 1 na VEX-14: com o yt-dlp de 4
    // meses o IG falhava até com sessionid válido; atualizado, baixa sem cookie.
    // Sem forçar: se o toolchain já atualizou no início do run, isto é no-op.
    const fresh = ensureYtDlpFresh(binPath);
    if (fresh.updated) {
        attempt = simulate(binPath, probeUrl, null);
        if (attempt.ok) return { platform, ok: true, remediation: `yt-dlp atualizado → ${fresh.version}` };

        // A versão nova não ajudou e pode ter quebrado outra coisa: reverte para
        // não deixar o pipeline pior do que estava.
        if (restoreYtDlpBackup(binPath)) {
            attempt = simulate(binPath, probeUrl, null);
            if (attempt.ok) {
                return { platform, ok: true, remediation: 'update revertido (versão nova quebrou o extractor)' };
            }
        }
    }

    // Remediação 2 — autenticação. Só agora: cookie era o suspeito errado.
    if (looksLikeAuthFailure(attempt.error) && SESSION_FILES[platform]) {
        const cookies = resolveCookies(platform, { preferSession: true });
        if (cookies) {
            const withCookies = simulate(binPath, probeUrl, cookies);
            if (withCookies.ok) return { platform, ok: true, remediation: 'sessão aplicada via ponte de cookies' };
            attempt = withCookies;
        }
    }

    const loginScript = LOGIN_SCRIPTS[platform];
    return {
        platform,
        ok: false,
        probed: urls.length,
        error: attempt.error,
        hint: looksLikeAuthFailure(attempt.error) && loginScript
            ? `Conteúdo pode exigir login. Renove a sessão: node ${loginScript}`
            : `Extractor do ${platform} pode ter quebrado — ${urls.length} URL(s) da fila falharam. ` +
              `Cheque https://github.com/yt-dlp/yt-dlp/issues`
    };
}

/**
 * Roda o preflight nas plataformas da fila.
 *
 * @param {Object<string, Array<{url: string}>>} queueByPlatform - a fila real
 * @param {string} binPath
 * @returns {{ok: boolean, results: Array, failed: Array}}
 */
function preflight(queueByPlatform, binPath, opts = {}) {
    const platforms = Object.keys(queueByPlatform);
    const maxProbes = opts.maxProbes ?? MAX_PROBES;
    console.log(`\n🛫 Preflight: ${platforms.join(', ')}`);
    const results = [];

    for (const platform of platforms) {
        const rows = queueByPlatform[platform] || [];
        // Só URLs de vídeo: um post estático faz o --simulate falhar por motivo
        // legítimo, e condenar a plataforma por isso seria um falso negativo.
        const probeUrls = rows.map(r => r.url).filter(isVideoUrl).slice(0, maxProbes);
        const result = checkPlatform(platform, binPath, probeUrls, opts);
        results.push(result);

        if (result.ok) {
            const nota = probeUrls.length === 0 ? ' — fila só tem conteúdo estático (nada a sondar)' : '';
            console.log(`  ✅ ${platform}${result.remediation ? ` — ${result.remediation}` : nota}`);
        } else {
            console.log(`  ❌ ${platform} — ${result.error}`);
            console.log(`     💡 ${result.hint}`);
        }
    }

    const failed = results.filter(r => !r.ok);
    return { ok: failed.length === 0, results, failed };
}

module.exports = { preflight, checkPlatform, isVideoUrl, LOGIN_SCRIPTS, MAX_PROBES };
