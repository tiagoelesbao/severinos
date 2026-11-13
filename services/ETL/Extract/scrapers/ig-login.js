const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { checkIgSession } = require('../auth/ig-session');

/**
 * Renovação da sessão do Instagram (login manual, uma vez).
 *
 * O `sessionid` do IG dura ~1 ano no papel, mas o Instagram invalida sessões de
 * automação bem antes — e a sessão do BROWSER morre antes da sessão da API
 * (a API responde 200 enquanto a navegação já cai na tela "Continuar como @user").
 * O fallback Playwright do *daily-monitor depende da sessão do browser, então é
 * esta renovação que o mantém vivo.
 *
 * O salvamento é AUTOMÁTICO: assim que o feed é detectado, a sessão é gravada e
 * validada. Não depende de ENTER (que não funciona quando o script roda sem TTY).
 */

const POLL_MS = 3000;
const TIMEOUT_MS = parseInt(process.env.IG_LOGIN_TIMEOUT_MS, 10) || 15 * 60 * 1000;

/**
 * Perfil persistente + Chrome REAL (channel: 'chrome').
 *
 * O Chromium empacotado do Playwright é marcado: `navigator.webdriver`, a flag
 * `--enable-automation` e o build sem branding. O Meta detecta e serve captcha
 * que NUNCA aceita a resposta (2026-07-21). Usar o Chrome instalado, sem as
 * flags de automação e com perfil que persiste entre tentativas, remove os
 * tells mais grosseiros. Se ainda assim cair no captcha, o caminho sem browser
 * é `node services/ETL/Extract/auth/ig-import-cookies.js` (cookies do SEU Chrome).
 */
const PROFILE_DIR = path.resolve(__dirname, '..', 'auth', '.ig-browser-profile');

/** Patches que apagam as marcas de automação mais checadas. */
const STEALTH = () => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = window.chrome || { runtime: {} };
    const origQuery = window.navigator.permissions && window.navigator.permissions.query;
    if (origQuery) {
        window.navigator.permissions.query = (p) => (
            p && p.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : origQuery(p)
        );
    }
};

/** Marcadores de sessão realmente autenticada (os mesmos que a engine usa). */
const LOGGED_SELECTOR = 'svg[aria-label="Home"], svg[aria-label="Página inicial"], a[href="/direct/inbox/"], a[href="/explore/"]';

async function isLoggedIn(page) {
    try {
        return await page.evaluate(sel => !!document.querySelector(sel), LOGGED_SELECTOR);
    } catch (e) {
        return false;  // navegação em curso
    }
}

async function saveSession(context, statePath) {
    await context.storageState({ path: statePath });
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const igCookies = (state.cookies || []).filter(c => (c.domain || '').includes('instagram.com'));
    const hasSessionId = igCookies.some(c => c.name === 'sessionid' && c.value);

    console.log(`\n✅ Sessão salva em: ${statePath}`);
    console.log(`🍪 Cookies de instagram.com: ${igCookies.length}${hasSessionId ? ' (com sessionid)' : ' — ⚠️ SEM sessionid'}`);
    return hasSessionId;
}

async function runLogin() {
    const authDir = path.resolve(__dirname, '..', 'auth');
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    const statePath = path.join(authDir, 'instagram_session.json');

    console.log('🚀 [Instagram Login] Abrindo o Chrome para login manual...');
    console.log('👉 Faça login (ou clique em "Continuar" e conclua) até VER O FEED.');
    console.log('   A sessão é salva sozinha assim que o feed aparecer.\n');

    fs.mkdirSync(PROFILE_DIR, { recursive: true });

    // Chrome real quando disponível; Chromium do Playwright só como último recurso.
    const launchOpts = {
        headless: false,
        viewport: null,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
        ignoreDefaultArgs: ['--enable-automation']
    };

    let context;
    try {
        context = await chromium.launchPersistentContext(PROFILE_DIR, { ...launchOpts, channel: 'chrome' });
        console.log('🌐 Usando o Google Chrome instalado (menos detectável).');
    } catch (e) {
        console.warn(`⚠️ Chrome real indisponível (${e.message.split('\n')[0]}) — caindo para o Chromium do Playwright.`);
        console.warn('   Se o captcha travar, use: node services/ETL/Extract/auth/ig-import-cookies.js\n');
        context = await chromium.launchPersistentContext(PROFILE_DIR, launchOpts);
    }

    await context.addInitScript(STEALTH);
    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(0);

    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });

    // ENTER continua funcionando como atalho quando há terminal interativo.
    let forced = false;
    if (process.stdin.isTTY) {
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('(Opcional) Pressione [ENTER] para salvar imediatamente.\n', () => { forced = true; rl.close(); });
        rl.on('close', () => { forced = true; });
    }

    const deadline = Date.now() + TIMEOUT_MS;
    let logged = false;
    while (Date.now() < deadline) {
        if (await isLoggedIn(page)) { logged = true; break; }
        if (forced) break;
        await new Promise(r => setTimeout(r, POLL_MS));
    }

    if (!logged && !forced) {
        console.error(`\n⏱️ Timeout de ${Math.round(TIMEOUT_MS / 60000)}min sem detectar o feed. Sessão NÃO salva.`);
        console.error('   Se travou em captcha: node services/ETL/Extract/auth/ig-import-cookies.js');
        await context.close().catch(() => {});
        process.exitCode = 1;
        return;
    }

    console.log(logged ? '\n🎯 Feed detectado — salvando sessão...' : '\n💾 Salvando sessão a pedido...');
    await page.waitForTimeout(2000);  // deixa os cookies finais assentarem
    const hasSessionId = await saveSession(context, statePath);
    await context.close().catch(() => {});

    // Prova final: a sessão salva responde autenticada na API?
    const check = await checkIgSession();
    console.log(`🔎 Teste ao vivo: ${check.alive ? '✅ VIVA' : '❌ ' + check.reason}`);
    console.log(check.alive && hasSessionId
        ? '\n🏁 Pronto. O fallback Playwright do *daily-monitor está operante.\n'
        : '\n⚠️ Sessão salva mas não validada — refaça o login se o monitor continuar pulando perfis.\n');

    process.exitCode = check.alive && hasSessionId ? 0 : 1;
}

runLogin().catch(err => {
    console.error(`❌ Erro fatal: ${err.message}`);
    process.exitCode = 1;
});
