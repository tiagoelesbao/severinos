const fs = require('fs');
const path = require('path');

/**
 * IG Session — leitura, diagnóstico e teste de vida da sessão do Instagram.
 *
 * Motivo: o `sessionid` do IG tem validade nominal de ~1 ano, mas o Instagram
 * invalida sessões de automação no servidor MUITO antes disso. Olhar o campo
 * `expires` do cookie dá falso positivo; a única prova é bater na API com os
 * cookies e ver se volta 200. Este módulo é essa prova.
 *
 * Uso como CLI (diagnóstico manual):
 *   node services/ETL/Extract/auth/ig-session.js
 *   → exit 0 = sessão viva | exit 1 = sessão morta/ausente
 *
 * Renovação: node services/ETL/Extract/scrapers/ig-login.js (login manual).
 */

const AUTH_DIR = __dirname;
const SESSION_FILE = 'instagram_session.json';
const IG_APP_ID = '936619743392459';
const IG_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Idade a partir da qual a sessão é considerada suspeita (dias). */
const STALE_AFTER_DAYS = parseInt(process.env.IG_SESSION_STALE_DAYS, 10) || 14;

/**
 * Lê o storageState do Playwright e extrai os cookies do Instagram.
 * @returns {{ok: boolean, sessionPath: string, cookies?: Array, hasSessionId?: boolean, ageDays?: number, stale?: boolean, reason?: string}}
 */
function readIgSession(authDir = AUTH_DIR) {
    const sessionPath = path.join(authDir, SESSION_FILE);
    if (!fs.existsSync(sessionPath)) {
        return { ok: false, sessionPath, reason: 'arquivo de sessão inexistente' };
    }

    let state;
    try {
        state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    } catch (e) {
        return { ok: false, sessionPath, reason: `sessão ilegível: ${e.message}` };
    }

    const cookies = (state.cookies || []).filter(c => (c.domain || '').includes('instagram.com'));
    if (cookies.length === 0) {
        return { ok: false, sessionPath, reason: 'nenhum cookie de instagram.com na sessão' };
    }

    const hasSessionId = cookies.some(c => c.name === 'sessionid' && c.value);
    const ageDays = Math.floor((Date.now() - fs.statSync(sessionPath).mtimeMs) / 86400000);

    return {
        ok: hasSessionId,
        sessionPath,
        cookies,
        hasSessionId,
        ageDays,
        stale: ageDays >= STALE_AFTER_DAYS,
        reason: hasSessionId ? undefined : 'sessão sem `sessionid` (login não foi concluído)'
    };
}

/** Monta o header `Cookie:` a partir da lista de cookies do storageState. */
function cookieHeader(cookies = []) {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/** Headers que a API web do IG exige — sem os `sec-fetch-*` volta 400 (falso negativo). */
function igApiHeaders(cookies) {
    const headers = {
        'x-ig-app-id': IG_APP_ID,
        'user-agent': IG_UA,
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://www.instagram.com/',
        'accept': '*/*'
    };
    if (cookies && cookies.length) {
        headers.cookie = cookieHeader(cookies);
        const csrf = cookies.find(c => c.name === 'csrftoken');
        if (csrf) headers['x-csrftoken'] = csrf.value;
    }
    return headers;
}

/**
 * Testa se a sessão está VIVA de verdade (200 na API autenticada).
 * Barato: uma requisição HTTP, sem browser.
 * @returns {Promise<{alive: boolean, status?: number, reason: string, ageDays?: number, stale?: boolean}>}
 */
async function checkIgSession({ authDir = AUTH_DIR, username = 'instagram' } = {}) {
    const session = readIgSession(authDir);
    if (!session.ok) {
        return { alive: false, reason: session.reason, ageDays: session.ageDays };
    }

    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    try {
        const r = await fetch(url, { headers: igApiHeaders(session.cookies) });
        if (r.ok) {
            const data = await r.json().catch(() => null);
            const alive = !!data?.data?.user;
            return {
                alive,
                status: r.status,
                reason: alive ? 'sessão autenticada respondeu 200 com dados' : 'HTTP 200 sem payload de usuário',
                ageDays: session.ageDays,
                stale: session.stale
            };
        }
        // 401 = sessão invalidada. 400/429 = rate limit de IP (a sessão pode estar boa).
        const reason = r.status === 401
            ? 'HTTP 401 — sessão invalidada pelo Instagram (renovar login)'
            : `HTTP ${r.status} — provável rate limit de IP (não é prova de sessão morta)`;
        return { alive: false, status: r.status, reason, ageDays: session.ageDays, stale: session.stale };
    } catch (e) {
        return { alive: false, reason: `falha de rede: ${e.message}`, ageDays: session.ageDays, stale: session.stale };
    }
}

/** Linha curta de status para logs de pipeline. */
function describeIgSession(session) {
    if (!session.ok) return `sessão IG indisponível (${session.reason})`;
    return `sessão IG com ${session.cookies.length} cookies, ${session.ageDays}d de idade` +
           (session.stale ? ` ⚠️ (>= ${STALE_AFTER_DAYS}d — considerar renovar)` : '');
}

module.exports = {
    readIgSession,
    checkIgSession,
    describeIgSession,
    cookieHeader,
    igApiHeaders,
    SESSION_FILE,
    STALE_AFTER_DAYS
};

if (require.main === module) {
    (async () => {
        const session = readIgSession();
        console.log(`\n=== Diagnóstico da sessão Instagram ===`);
        console.log(`Arquivo:  ${session.sessionPath}`);
        console.log(`Status:   ${describeIgSession(session)}`);

        const check = await checkIgSession();
        console.log(`Teste ao vivo: ${check.alive ? '✅ VIVA' : '❌ NÃO AUTENTICADA'} — ${check.reason}`);
        if (!check.alive) {
            console.log(`\n👉 Para renovar: node services/ETL/Extract/scrapers/ig-login.js`);
            console.log(`   (abre o navegador, você loga, a sessão é salva automaticamente)\n`);
        } else {
            console.log(`\n👉 Fallback Playwright do *daily-monitor está apto a rodar.\n`);
        }
        // exitCode (e não process.exit): o socket keep-alive do fetch ainda está
        // aberto e process.exit() aborta o libuv no Windows.
        process.exitCode = check.alive ? 0 : 1;
    })();
}
