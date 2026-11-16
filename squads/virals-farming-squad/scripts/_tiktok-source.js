/**
 * _tiktok-source.js — Fontes de descoberta do TikTok para o Farming Squad.
 *
 * ESTADO VERIFICADO EM 2026-07-26 (yt-dlp 2026.07.04):
 *
 *   ✅ PERFIL   `yt-dlp --flat-playlist --dump-json https://www.tiktok.com/@{handle}`
 *               Funciona e já devolve views, likes, comentários, timestamp, track e
 *               descrição. É o caminho confiável — não precisa de passe extra.
 *
 *   ❌ HASHTAG  `yt-dlp .../tag/{tag}` → "No working app info is available"
 *   ❌ VÍDEO    `yt-dlp --dump-json {url-do-video}` → "Unable to extract universal data
 *               for rehydration". Por isso NÃO existe enriquecimento por vídeo aqui:
 *               ele falharia em 100% dos casos e criaria a ilusão de cobertura.
 *
 * Consequência de arquitetura: a descoberta por hashtag roda uma CASCATA de estratégias
 * e, quando todas falham, reporta falha de captura explícita. Um item sem métrica nunca
 * é rankeado como zero — ele vai para `unranked`, porque "sem dado" não é "sem engajamento".
 *
 * A ponte que sustenta o pipeline: hashtag → HANDLES descobertos → rota de PERFIL
 * (que funciona) para obter as métricas reais. Assim, qualquer estratégia de hashtag que
 * devolva ao menos handles já alimenta o ranking completo.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TIKTOK_SESSION = path.join(REPO_ROOT, 'services', 'ETL', 'Extract', 'auth', 'tiktok_session.json');

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// yt-dlp
// ---------------------------------------------------------------------------

function resolveYtdlp() {
    const primary = path.join(REPO_ROOT, 'services', 'ETL', 'bin', 'yt-dlp.exe');
    const fallback = path.join(REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'yt-dlp.exe');
    if (fs.existsSync(primary)) return primary;
    if (fs.existsSync(fallback)) return fallback;
    return 'yt-dlp';
}

function runYtdlp(bin, args, timeoutMs = 120000) {
    const r = spawnSync(bin, args, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 64 * 1024 * 1024,
    });

    if (r.error) return { ok: false, reason: r.error.message, entries: [] };

    const entries = [];
    for (const line of (r.stdout || '').split('\n')) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        try {
            entries.push(JSON.parse(t));
        } catch (_) {
            /* linha parcial */
        }
    }

    if (entries.length === 0) {
        const stderr = (r.stderr || '')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.startsWith('ERROR') || l.startsWith('WARNING'))
            .slice(-2)
            .join(' | ');
        return { ok: false, reason: stderr || `exit ${r.status}, sem entradas`, entries: [] };
    }
    return { ok: true, entries };
}

function normalizeYtdlpEntry(raw, origin, originLabel) {
    const metrics = {
        views: Number(raw.view_count) || 0,
        likes: Number(raw.like_count) || 0,
        comments: Number(raw.comment_count) || 0,
        shares: Number(raw.repost_count) || 0,
        // Salvamentos. O TikTok devolve `save_count` no flat-playlist e é o sinal mais
        // subestimado do conjunto: em nicho de status/reflexão, salvar é a intenção de
        // REPOSTAR — ou seja, é a métrica que mais se aproxima de "este formato é
        // replicável". Nenhum consumidor é obrigado a usá-la; quem não usa, ignora.
        saves: Number(raw.save_count) || 0,
    };
    const handle = String(raw.uploader || raw.uploader_id || raw.channel || 'desconhecido').replace(/^@/, '');

    return {
        id: String(raw.id || ''),
        url: raw.webpage_url || raw.url || (raw.id ? `https://www.tiktok.com/@${handle}/video/${raw.id}` : null),
        handle,
        title: raw.title || '',
        description: raw.description || raw.title || '',
        duration: Number(raw.duration) || 0,
        timestamp: raw.timestamp ? Number(raw.timestamp) : null,
        track: raw.track || null,
        artist: raw.artist || null,
        metrics,
        origin,
        originLabel,
        source: 'ytdlp:profile',
        hasMetrics: metrics.views > 0 || metrics.likes > 0,
    };
}

/**
 * Rota de PERFIL — o caminho confiável.
 * @returns {{ok: boolean, items: object[], reason?: string}}
 */
function discoverByProfile(bin, handle, itemsPerTarget, origin = 'perfil', originLabel = null) {
    const clean = String(handle).replace(/^@/, '');
    const url = `https://www.tiktok.com/@${clean}`;
    const r = runYtdlp(bin, [
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
        '--playlist-items',
        `1-${itemsPerTarget}`,
        url,
    ]);

    if (!r.ok) return { ok: false, items: [], reason: r.reason };
    return {
        ok: true,
        items: r.entries.map((e) => normalizeYtdlpEntry(e, origin, originLabel || `@${clean}`)),
    };
}

// ---------------------------------------------------------------------------
// Hashtag — cascata de estratégias
// ---------------------------------------------------------------------------

async function loadPlaywright() {
    try {
        return require('playwright');
    } catch (_) {
        return null;
    }
}

async function openTikTokContext(playwright, headless) {
    const browser = await playwright.chromium.launch({
        headless,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
        userAgent: UA,
        viewport: { width: 1440, height: 1200 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });

    let sessionInjected = false;
    if (fs.existsSync(TIKTOK_SESSION)) {
        try {
            const state = JSON.parse(fs.readFileSync(TIKTOK_SESSION, 'utf8'));
            if (state.cookies && state.cookies.length) {
                await context.addCookies(state.cookies);
                sessionInjected = true;
            }
        } catch (_) {
            /* sessão ilegível — segue anônimo */
        }
    }

    await context.addInitScript(() => {
        delete Object.getPrototypeOf(navigator).webdriver;
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    return { browser, context, sessionInjected };
}

/**
 * Estratégias de extração da página de hashtag, aplicadas em ordem sobre a MESMA
 * navegação. Cada uma devolve handles e ids de vídeo; a primeira que produzir
 * resultado encerra a cascata.
 */
const HASHTAG_STRATEGIES = [
    {
        id: 'api-item-list',
        label: 'interceptação de /api/challenge/item_list/',
        // Preenchida pelo listener de resposta durante a navegação.
        extract: (ctxData) => ctxData.apiItems,
    },
    {
        id: 'rehydration-json',
        label: '__UNIVERSAL_DATA_FOR_REHYDRATION__ embutido no HTML',
        extract: (ctxData) => ctxData.rehydrationItems,
    },
    {
        id: 'dom-anchors',
        label: 'âncoras <a href="/video/"> no grid',
        extract: (ctxData) => ctxData.domItems,
    },
];

/**
 * Rota de HASHTAG. Devolve handles descobertos — as MÉTRICAS vêm depois, pela rota
 * de perfil, que é a que funciona.
 *
 * @returns {{ok: boolean, handles: string[], videoIds: string[], strategy?: string, reason?: string}}
 */
async function discoverByHashtag(tag, options = {}) {
    const { headless = true, scrolls = 5, waitMs = 4000 } = options;
    const playwright = await loadPlaywright();
    if (!playwright) {
        return { ok: false, handles: [], videoIds: [], reason: 'playwright não instalado' };
    }

    const cleanTag = String(tag).replace(/^#/, '');
    const url = `https://www.tiktok.com/tag/${encodeURIComponent(cleanTag)}`;

    let browser;
    try {
        const opened = await openTikTokContext(playwright, headless);
        browser = opened.browser;
        const { context } = opened;

        const apiItems = [];
        context.on('response', async (res) => {
            if (!res.url().includes('/api/challenge/item_list/')) return;
            try {
                const txt = await res.text();
                if (!txt) return; // corpo vazio = resposta de anti-bot
                const json = JSON.parse(txt);
                for (const it of json.itemList || []) {
                    apiItems.push({
                        id: String(it.id || ''),
                        handle: (it.author && it.author.uniqueId) || null,
                        description: it.desc || '',
                        createTime: it.createTime || null,
                        duration: (it.video && it.video.duration) || 0,
                        track: (it.music && it.music.title) || null,
                        stats: it.stats || null,
                    });
                }
            } catch (_) {
                /* corpo não-JSON ou vazio */
            }
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        for (let i = 0; i < scrolls; i++) {
            await page.waitForTimeout(waitMs);
            await page.mouse.wheel(0, 2500);
        }
        await page.waitForTimeout(waitMs);

        const scraped = await page.evaluate(() => {
            const out = { domItems: [], rehydrationItems: [] };

            for (const a of document.querySelectorAll('a[href*="/video/"]')) {
                const m = a.getAttribute('href').match(/@([^/]+)\/video\/(\d+)/);
                if (m) out.domItems.push({ handle: m[1], id: m[2] });
            }

            const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
            if (el && el.textContent) {
                try {
                    const data = JSON.parse(el.textContent);
                    const scan = (node, depth) => {
                        if (!node || depth > 6 || typeof node !== 'object') return;
                        if (Array.isArray(node)) {
                            for (const v of node) scan(v, depth + 1);
                            return;
                        }
                        if (node.id && node.author && node.author.uniqueId) {
                            out.rehydrationItems.push({
                                id: String(node.id),
                                handle: node.author.uniqueId,
                                description: node.desc || '',
                                createTime: node.createTime || null,
                                stats: node.stats || null,
                            });
                        }
                        for (const v of Object.values(node)) scan(v, depth + 1);
                    };
                    scan(data, 0);
                } catch (_) {
                    /* payload não parseável */
                }
            }
            return out;
        });

        const ctxData = { apiItems, ...scraped };

        for (const strategy of HASHTAG_STRATEGIES) {
            const items = strategy.extract(ctxData) || [];
            const handles = [...new Set(items.map((i) => i.handle).filter(Boolean))];
            if (handles.length > 0) {
                return {
                    ok: true,
                    handles,
                    videoIds: [...new Set(items.map((i) => i.id).filter(Boolean))],
                    strategy: strategy.id,
                    strategyLabel: strategy.label,
                    rawItems: items,
                };
            }
        }

        return {
            ok: false,
            handles: [],
            videoIds: [],
            reason:
                'todas as estratégias de hashtag vieram vazias ' +
                '(api item_list com corpo vazio, rehydration sem itens, grid sem âncoras) — ' +
                'anti-bot do TikTok. Use --source=profiles ou popule anchor_profiles.',
        };
    } catch (e) {
        return { ok: false, handles: [], videoIds: [], reason: `exceção: ${e.message}` };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (_) {
                /* ignore */
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Descoberta por TERMO via buscador — a via que de fato funciona
// ---------------------------------------------------------------------------

/**
 * VERIFICADO EM 2026-07-27. Depois que a rota de hashtag do TikTok caiu inteira
 * (yt-dlp, DOM, API do challenge e Creative Center — todos barrados), esta é a
 * única fonte que devolve handles REALMENTE do nicho.
 *
 * A ideia: buscadores indexam páginas do tiktok.com. Buscar `site:tiktok.com "oração"`
 * devolve perfis e vídeos daquele assunto. Colhemos os HANDLES e passamos a rota de
 * perfil (que funciona e traz métricas completas) por cima.
 *
 * Isto conserta o problema de fundo do F1: sem ele, um nicho sem anchor_profiles
 * não tinha o que varrer, e o operador acabava injetando handles à mão que não
 * tinham relação nenhuma com o nicho.
 */
const SEARCH_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

/** Handles que nunca são candidatos: contas institucionais e ruído do buscador. */
const HANDLE_DENYLIST = new Set(['tiktok', 'foryou', 'discover', 'explore', 'live', 'search', 'music', 'tag', 'about', 'legal', 'upload']);

function extractHandles(html) {
    const out = new Set();
    // O DDG devolve as URLs percent-encoded dentro do redirecionador.
    const patterns = [/tiktok\.com%2F%40([a-zA-Z0-9._]{2,30})/g, /tiktok\.com\/@([a-zA-Z0-9._]{2,30})/g];
    for (const re of patterns) {
        for (const m of String(html).matchAll(re)) {
            const h = m[1].replace(/\.$/, '').toLowerCase();
            if (h && !HANDLE_DENYLIST.has(h) && !/^\d+$/.test(h)) out.add(h);
        }
    }
    return [...out];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Busca handles do TikTok por termo, via buscador público (sem chave).
 *
 * ⚠️ FALLBACK APENAS — não sustenta varredura de nicho. Em consulta ISOLADA o DDG
 * responde 200 e entrega handles bons; em RAJADA devolve 202 em todas as tentativas
 * (medido 2026-07-27: 0 de 6 termos do nicho religioso, 363s). Use `discoverHandlesViaSerper`
 * como rota primária e esta só quando não houver SERPER_API_KEY.
 *
 * @returns {{ok, handles: string[], attempts: Array}}
 */
async function discoverHandlesByTerm(term, options = {}) {
    // O DDG limita agressivamente em rajada: no probe isolado 2 termos passaram e o
    // 3º já voltou 202. Rodando os 10 termos de um nicho em sequência, TODOS caíam.
    // Espera base bem maior + backoff — descoberta é fase de abertura, não tem pressa.
    const { retries = 3, delayMs = 6000 } = options;
    const attempts = [];
    const found = new Set();

    // O DDG devolve 202 quando está limitando — não é erro permanente, é ritmo.
    for (let attempt = 0; attempt <= retries; attempt++) {
        // Espera ANTES da 1ª tentativa também: chamadas consecutivas entre termos
        // diferentes são o que dispara o limitador, não a repetição do mesmo termo.
        await sleep(attempt === 0 ? delayMs : delayMs * (attempt + 1));
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:tiktok.com "${term}"`)}`;
        try {
            const r = await fetch(url, { headers: { 'User-Agent': SEARCH_UA }, signal: AbortSignal.timeout(45000) });
            const html = await r.text();
            const handles = extractHandles(html);
            attempts.push({ engine: 'duckduckgo', status: r.status, found: handles.length });
            handles.forEach((h) => found.add(h));
            if (handles.length > 0) break;
        } catch (e) {
            attempts.push({ engine: 'duckduckgo', status: 'erro', reason: e.message.slice(0, 80) });
        }
    }

    return { ok: found.size > 0, handles: [...found], attempts };
}

/**
 * ⚠️ NÃO CONFIÁVEL — mantida apenas como referência do que NÃO funciona.
 *
 * VERIFICADO 2026-07-27: a página de busca do TikTok NÃO renderiza os resultados
 * para automação (mesmo anti-bot da página de hashtag). O que o DOM devolve são os
 * links da BARRA LATERAL "Contas que você segue" da sessão logada — incluindo o
 * handle do próprio dono da sessão.
 *
 * Isso é pior que devolver vazio: parece sucesso, entrega 20 handles plausíveis, e
 * contamina o nicho com as contas que o operador segue. Um teste anterior quase
 * promoveu essas contas a âncoras do nicho religioso.
 *
 * Por isso a função agora FILTRA contra a lista de seguidos e, se o resultado ficar
 * indistinguível da barra lateral, devolve falha explícita em vez de handles.
 */
async function discoverHandlesByTikTokSearch(term, options = {}) {
    const { headless = true } = options;
    const playwright = await loadPlaywright();
    if (!playwright) return { ok: false, handles: [], reason: 'playwright não instalado' };

    let browser;
    try {
        const opened = await openTikTokContext(playwright, headless);
        browser = opened.browser;
        const page = await opened.context.newPage();
        await page.goto(`https://www.tiktok.com/search?q=${encodeURIComponent(term)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
        });
        await page.waitForTimeout(9000);
        await page.mouse.wheel(0, 2500);
        await page.waitForTimeout(4000);

        // Separa o que está DENTRO da área de resultados do que está na barra lateral.
        // Sem essa separação, o retorno é a lista de seguidos da sessão.
        const scraped = await page.evaluate(() => {
            const grab = (root) =>
                [...new Set(
                    [...root.querySelectorAll('a[href*="/@"]')]
                        .map((a) => (a.getAttribute('href').match(/@([^/?]+)/) || [])[1])
                        .filter(Boolean)
                )];
            const sidebar = document.querySelector('[class*="SideNav"], nav, aside');
            const main = document.querySelector('[data-e2e*="search"], main, #main-content');
            return {
                sidebar: sidebar ? grab(sidebar) : [],
                results: main ? grab(main) : [],
                all: grab(document),
            };
        });

        const sidebarSet = new Set(scraped.sidebar.map((h) => String(h).toLowerCase()));
        const clean = (scraped.results.length ? scraped.results : scraped.all)
            .map((h) => String(h).toLowerCase())
            .filter((h) => h && !HANDLE_DENYLIST.has(h) && !/^\d+$/.test(h))
            .filter((h) => !sidebarSet.has(h)); // tira os seguidos da sessão

        if (clean.length === 0) {
            return {
                ok: false,
                handles: [],
                reason:
                    'a busca do TikTok não renderizou resultados para automação — o DOM só ' +
                    'trouxe a barra lateral de contas seguidas, que NÃO é resultado de busca',
            };
        }
        return { ok: true, handles: clean };
    } catch (e) {
        return { ok: false, handles: [], reason: `exceção: ${e.message.slice(0, 120)}` };
    } finally {
        if (browser) { try { await browser.close(); } catch (_) { /* ignore */ } }
    }
}

/**
 * ⛔ REMOVIDA 2026-07-27 — discoverHandlesViaGoogleCSE (Google Custom Search JSON API).
 *
 * NÃO TENTE RESSUSCITAR. A API está FECHADA a novos clientes e é desligada em
 * 2027-01-01 (doc oficial: developers.google.com/custom-search/v1/overview —
 * "The Custom Search JSON API is closed to new customers").
 *
 * O que confunde: o Cloud Console deixa "ativar" a API, as requisições CHEGAM e são
 * contadas no painel — e todas voltam 403 `PERMISSION_DENIED` com
 * "This project does not have the access to Custom Search JSON API". Isso NÃO é
 * chave errada, restrição de chave nem API desativada; é o projeto que nunca recebe
 * acesso. Uma sessão inteira foi gasta caçando configuração inexistente.
 *
 * Para diferenciar os 403 do Google (as mensagens NÃO são idênticas):
 *   "This project does not have the access to X" → projeto sem acesso (insolúvel)
 *   "Requests to this API X method Y are blocked" → restrição de API na chave (solúvel)
 *   cx/parâmetro inválido → 400 INVALID_ARGUMENT, não 403
 */

/**
 * Descoberta via Serper — SERP API do Google, sucessora do CSE.
 *
 * POR QUE ESTA: todas as rotas gratuitas morreram. yt-dlp marca tag/sound/effect como
 * CURRENTLY BROKEN; a página de hashtag e a busca do TikTok não renderizam para
 * automação; Creative Center exige login; Mojeek/Bing devolvem 403 ou zero handle; e o
 * DuckDuckGo — que ainda funciona em consulta ISOLADA — devolve 202 em rajada (teste
 * real 2026-07-27: 0 de 6 termos do nicho religioso, 363s gastos). Buscador grátis não
 * sustenta varredura de nicho.
 *
 * O Serper é uma API de verdade: 2.500 consultas grátis, depois ~US$1/1k. O filtro
 * `site:tiktok.com` garante que todo resultado já é do domínio certo.
 *
 * Continua valendo a regra de sempre: daqui saem HANDLES, nunca métricas. As métricas
 * vêm da rota de perfil (yt-dlp), que é a única fonte confiável delas.
 *
 * @returns {{ok, handles: string[], quotaExceeded?: boolean, reason?: string}}
 */
async function discoverHandlesViaSerper(term, options = {}) {
    const key = String(process.env.SERPER_API_KEY || '').trim();
    if (!key) return { ok: false, handles: [], reason: 'SERPER_API_KEY ausente' };

    const { pages = 2, lang = 'pt-br', country = 'br' } = options;
    const found = new Set();
    let lastReason = null;

    // 10 resultados por página é o padrão; 2 páginas = 20 resultados por termo,
    // gastando 2 créditos. Um nicho de 11 hashtags custa 22 créditos por varredura.
    for (let page = 1; page <= pages; page++) {
        try {
            const res = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: `site:tiktok.com ${term}`, gl: country, hl: lang, num: 10, page }),
                signal: AbortSignal.timeout(30000),
            });

            if (res.status === 429) {
                return { ok: found.size > 0, handles: [...found], quotaExceeded: true, reason: 'cota do Serper esgotada' };
            }
            if (!res.ok) {
                const body = await res.text();
                // 403 aqui é crédito acabado, não configuração — a mensagem do Serper diz qual.
                lastReason = `Serper ${res.status}: ${body.slice(0, 160).replace(/\s+/g, ' ')}`;
                break;
            }

            const json = await res.json();
            const items = json.organic || [];
            for (const it of items) {
                // O handle pode estar no link OU no snippet (ex.: perfis citados no texto).
                for (const src of [it.link, it.title, it.snippet]) {
                    for (const m of String(src || '').matchAll(/tiktok\.com\/@([a-zA-Z0-9._]{2,30})/g)) {
                        const h = m[1].replace(/\.$/, '').toLowerCase();
                        if (h && !HANDLE_DENYLIST.has(h) && !/^\d+$/.test(h)) found.add(h);
                    }
                }
            }
            if (items.length < 10) break; // acabaram os resultados
        } catch (e) {
            lastReason = `rede: ${e.message.slice(0, 120)}`;
            break;
        }
    }

    return found.size > 0
        ? { ok: true, handles: [...found] }
        : { ok: false, handles: [], reason: lastReason || 'nenhum handle nos resultados' };
}

/**
 * Filtro de ATIVIDADE — separa conta viva de acervo parado.
 *
 * POR QUE EXISTE: em 2026-07-27 o F1 rodou com 3 âncoras religiosas reais, de
 * engajamento alto (12–16%) e posts de 150k a 500k de score, e aprovou ZERO. Todas
 * reprovaram por idade: o post mais recente tinha 440h e a maioria passava de
 * 11.000h (~1,4 ano). Eram contas boas que PARARAM DE POSTAR.
 *
 * Handle sem post recente é anti-âncora: gasta uma varredura inteira para devolver
 * um ranking vazio, e o vazio parece "nicho sem conteúdo" em vez de "âncora morta".
 *
 * @returns {{active: [], inactive: [], failed: []}}
 */
function filterActiveHandles(bin, handles, maxAgeHours = 168, probeItems = 3) {
    const active = [];
    const inactive = [];
    const failed = [];
    const nowSec = Math.floor(Date.now() / 1000);

    for (const handle of handles) {
        const r = discoverByProfile(bin, handle, probeItems);
        if (!r.ok || r.items.length === 0) {
            failed.push({ handle, reason: r.reason || 'sem itens' });
            continue;
        }
        const newest = r.items
            .map((i) => i.timestamp)
            .filter(Boolean)
            .sort((a, b) => b - a)[0];

        if (!newest) {
            failed.push({ handle, reason: 'posts sem data' });
            continue;
        }
        const ageHours = Math.round((nowSec - newest) / 3600);
        const entry = { handle, ageHours, lastPost: new Date(newest * 1000).toISOString().split('T')[0] };
        if (ageHours <= maxAgeHours) active.push(entry);
        else inactive.push(entry);
    }

    return { active, inactive, failed };
}

module.exports = {
    resolveYtdlp,
    runYtdlp,
    normalizeYtdlpEntry,
    discoverByProfile,
    discoverByHashtag,
    discoverHandlesByTerm,
    discoverHandlesByTikTokSearch,
    discoverHandlesViaSerper,
    filterActiveHandles,
    HASHTAG_STRATEGIES,
    TIKTOK_SESSION,
};
