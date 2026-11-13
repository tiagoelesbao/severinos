const fs = require('fs');
const path = require('path');

/**
 * Session Bridge: converte a sessão do Playwright (storageState JSON) para o
 * formato Netscape que o yt-dlp entende.
 *
 * Motivo (VEX-14): o `instagram_session.json` do ig-login.js carrega o
 * `sessionid` — o cookie que de fato autentica — mas o `cookies.txt` usado pelo
 * yt-dlp só tinha csrftoken/datr/ds_user_id. Os dois arquivos nunca se falaram.
 *
 * Este é o caminho de EXCEÇÃO: com o yt-dlp atualizado o Instagram público baixa
 * sem cookie algum. A ponte serve para conteúdo restrito, quando o download
 * falha com sinal de autenticação.
 */

const AUTH_DIR = __dirname;

const SESSION_FILES = {
    instagram: 'instagram_session.json',
    tiktok: 'tiktok_session.json',
    linkedin: 'linkedin_session.json'
};

/** Cookies próprios de cada plataforma — nunca cruzar (VEX-14: IG recebia cookie do YouTube). */
const COOKIE_FILES = {
    instagram: 'cookies.txt',
    youtube: 'www.youtube.com_cookies.txt'
};

const DOMAIN_MATCH = {
    instagram: 'instagram.com',
    tiktok: 'tiktok.com',
    linkedin: 'linkedin.com'
};

function netscapeLine(cookie) {
    const domain = cookie.domain || '';
    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    // expires <= 0 = cookie de sessão; o formato Netscape representa isso como 0.
    const expires = Number.isFinite(cookie.expires) && cookie.expires > 0 ? Math.floor(cookie.expires) : 0;
    return [
        domain,
        includeSubdomains,
        cookie.path || '/',
        cookie.secure ? 'TRUE' : 'FALSE',
        expires,
        cookie.name,
        cookie.value
    ].join('\t');
}

/**
 * Converte um storageState do Playwright em cookies.txt Netscape.
 * @returns {{ok: boolean, path?: string, cookieCount?: number, hasSessionId?: boolean, reason?: string}}
 */
function playwrightSessionToNetscape(sessionPath, outPath, platform = 'instagram') {
    if (!fs.existsSync(sessionPath)) {
        return { ok: false, reason: `sessão não encontrada: ${sessionPath}` };
    }

    let state;
    try {
        state = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    } catch (e) {
        return { ok: false, reason: `sessão ilegível: ${e.message}` };
    }

    const domainNeedle = DOMAIN_MATCH[platform] || platform;
    const cookies = (state.cookies || []).filter(c => (c.domain || '').includes(domainNeedle));

    if (cookies.length === 0) {
        return { ok: false, reason: `nenhum cookie de ${domainNeedle} na sessão` };
    }

    const lines = [
        '# Netscape HTTP Cookie File',
        '# Gerado por session-bridge.js a partir do storageState do Playwright (VEX-14).',
        '# NÃO editar à mão — regenerado sob demanda.',
        ''
    ];
    for (const c of cookies) lines.push(netscapeLine(c));

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

    return {
        ok: true,
        path: outPath,
        cookieCount: cookies.length,
        hasSessionId: cookies.some(c => c.name === 'sessionid')
    };
}

/**
 * Cookie file da plataforma, sem jamais cruzar credenciais.
 * `preferSession` regenera a partir do storageState (traz o sessionid).
 * @returns {string|null} caminho, ou null quando não há cookie para a plataforma
 */
function resolveCookies(platform, opts = {}) {
    const authDir = opts.authDir || AUTH_DIR;

    if (opts.preferSession && SESSION_FILES[platform]) {
        const sessionPath = path.join(authDir, SESSION_FILES[platform]);
        const bridged = path.join(authDir, `.${platform}_bridged_cookies.txt`);
        const result = playwrightSessionToNetscape(sessionPath, bridged, platform);
        if (result.ok) {
            console.log(`[SessionBridge] ${platform}: ${result.cookieCount} cookies` +
                        `${result.hasSessionId ? ' (com sessionid)' : ' (SEM sessionid — login pode falhar)'}`);
            return bridged;
        }
        console.warn(`[SessionBridge] ${platform}: ponte indisponível (${result.reason})`);
    }

    const file = COOKIE_FILES[platform];
    if (!file) return null;

    const cookiePath = path.join(authDir, file);
    return fs.existsSync(cookiePath) ? cookiePath : null;
}

/** Sinais de que a falha foi de autenticação — e não da plataforma ter mudado. */
function looksLikeAuthFailure(errorText = '') {
    const t = String(errorText).toLowerCase();
    return [
        'login required',
        'rate-limit reached',
        'requested content is not available',
        'empty media response',
        'private',
        'sign in',
        'cookies'
    ].some(sig => t.includes(sig));
}

module.exports = {
    playwrightSessionToNetscape,
    resolveCookies,
    looksLikeAuthFailure,
    SESSION_FILES,
    COOKIE_FILES
};
