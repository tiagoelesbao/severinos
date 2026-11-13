const fs = require('fs');
const path = require('path');
const { checkIgSession } = require('./ig-session');

/**
 * Importa cookies do SEU navegador para a sessão do pipeline — sem automação.
 *
 * Motivo (2026-07-21): o Instagram detecta o browser do Playwright (mesmo com o
 * Chrome real e stealth) e serve um captcha que nunca aceita a resposta. Como o
 * dono já está logado no próprio Chrome, o caminho confiável é copiar os cookies
 * de lá — zero fingerprint de automação, zero captcha.
 *
 * Dois modos:
 *
 *   1. Colar valores do DevTools (mais rápido):
 *      Chrome → instagram.com logado → F12 → Application → Cookies → instagram.com
 *      node services/ETL/Extract/auth/ig-import-cookies.js \
 *        --sessionid=... --csrftoken=... --ds_user_id=... [--mid=... --ig_did=... --datr=...]
 *
 *   2. Arquivo Netscape exportado por extensão (ex.: "Get cookies.txt LOCALLY"):
 *      node services/ETL/Extract/auth/ig-import-cookies.js --from=C:\caminho\cookies.txt
 *
 * `sessionid` é o único obrigatório — é ele que autentica. `csrftoken` e
 * `ds_user_id` são fortemente recomendados (algumas rotas exigem).
 */

const AUTH_DIR = __dirname;
const STATE_PATH = path.join(AUTH_DIR, 'instagram_session.json');
const ONE_YEAR = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

/** Cookies que fazem diferença na sessão web do IG. */
const KNOWN = ['sessionid', 'csrftoken', 'ds_user_id', 'mid', 'ig_did', 'datr', 'rur', 'shbid', 'shbts'];
const HTTP_ONLY = new Set(['sessionid', 'rur', 'shbid', 'shbts']);

function parseArgs(argv) {
    return argv.slice(2).reduce((acc, arg) => {
        const m = arg.match(/^--([^=]+)=([\s\S]*)$/);
        if (m) acc[m[1]] = m[2].trim();
        return acc;
    }, {});
}

function makeCookie(name, value) {
    return {
        name,
        // O DevTools às vezes copia o sessionid com aspas ou %3A já escapado —
        // manter o valor CRU é o certo; só tiramos aspas de colagem.
        value: String(value).replace(/^["']|["']$/g, ''),
        domain: '.instagram.com',
        path: '/',
        expires: ONE_YEAR,
        httpOnly: HTTP_ONLY.has(name),
        secure: true,
        sameSite: 'Lax'
    };
}

/** Lê um cookies.txt Netscape e devolve só os cookies de instagram.com. */
function fromNetscape(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const cookies = [];
    for (const line of raw.split(/\r?\n/)) {
        if (!line || line.startsWith('#')) continue;
        const parts = line.split('\t');
        if (parts.length < 7) continue;
        const [domain, , cookiePath, secure, expires, name, value] = parts;
        if (!domain.includes('instagram.com')) continue;
        cookies.push({
            name,
            value,
            domain: domain.startsWith('.') ? domain : `.${domain}`,
            path: cookiePath || '/',
            expires: parseInt(expires, 10) > 0 ? parseInt(expires, 10) : ONE_YEAR,
            httpOnly: HTTP_ONLY.has(name),
            secure: String(secure).toUpperCase() === 'TRUE',
            sameSite: 'Lax'
        });
    }
    return cookies;
}

function usage() {
    console.log(`
Uso — importar cookies do seu navegador (sem automação, sem captcha):

  MODO 1 — colar do DevTools (Chrome logado → F12 → Application → Cookies → instagram.com):
    node services/ETL/Extract/auth/ig-import-cookies.js --sessionid=VALOR --csrftoken=VALOR --ds_user_id=VALOR

  MODO 2 — arquivo Netscape de extensão de export:
    node services/ETL/Extract/auth/ig-import-cookies.js --from=C:\\caminho\\cookies.txt

Obrigatório: sessionid.  Recomendados: csrftoken, ds_user_id.
`);
}

(async () => {
    const args = parseArgs(process.argv);
    let cookies = [];

    if (args.from) {
        if (!fs.existsSync(args.from)) {
            console.error(`❌ Arquivo não encontrado: ${args.from}`);
            process.exitCode = 1;
            return;
        }
        cookies = fromNetscape(args.from);
        console.log(`📄 ${cookies.length} cookie(s) de instagram.com lidos de ${args.from}`);
    } else {
        for (const name of KNOWN) {
            if (args[name]) cookies.push(makeCookie(name, args[name]));
        }
    }

    if (cookies.length === 0) { usage(); process.exitCode = 1; return; }

    const hasSessionId = cookies.some(c => c.name === 'sessionid' && c.value);
    if (!hasSessionId) {
        console.error('❌ Sem `sessionid` — é ele que autentica. Importação abortada.');
        usage();
        process.exitCode = 1;
        return;
    }

    // Preserva cookies de outros domínios se já houver storageState no disco.
    let state = { cookies: [], origins: [] };
    if (fs.existsSync(STATE_PATH)) {
        try {
            const prev = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
            state.origins = prev.origins || [];
            state.cookies = (prev.cookies || []).filter(c => !(c.domain || '').includes('instagram.com'));
        } catch (e) { /* arquivo corrompido: começa limpo */ }
    }
    state.cookies.push(...cookies);

    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    console.log(`✅ Sessão gravada em: ${STATE_PATH}`);
    console.log(`🍪 Cookies de instagram.com: ${cookies.length} (${cookies.map(c => c.name).join(', ')})`);

    const check = await checkIgSession();
    console.log(`🔎 Teste ao vivo: ${check.alive ? '✅ VIVA' : '❌ ' + check.reason}`);
    console.log(check.alive
        ? '\n🏁 Pronto. Rode o *daily-monitor.\n'
        : '\n⚠️ Os cookies não autenticaram. Confira se copiou o `sessionid` inteiro (é longo e tem %3A).\n');

    process.exitCode = check.alive ? 0 : 1;
})();
