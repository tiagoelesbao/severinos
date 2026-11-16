const BaseEngine = require('./BaseEngine');
const { readIgSession, cookieHeader } = require('../../auth/ig-session');

const _IG_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const _IG_APP_ID = '936619743392459';

// Pacing sustentável: o IG soft-bloqueia o IP em rajada (400→401). Espaçar as
// chamadas evita o bloqueio. Configurável via env para ajustar sem editar código.
const _IG_THROTTLE_MS = parseInt(process.env.IG_THROTTLE_MS, 10) || 5000;
const _IG_COOLDOWN_MS = parseInt(process.env.IG_COOLDOWN_MS, 10) || 30000;

// Tentativas por tier de API. Com o fallback Playwright ATIVO, insistir na API
// contra um IP bloqueado é desperdício: o browser é o caminho. Fail-fast.
const _IG_API_ATTEMPTS = parseInt(process.env.IG_API_ATTEMPTS, 10) || 2;

// Circuit breaker: quando o IP está bloqueado, TODO perfil paga a escada de
// cooldown à toa. Após N bloqueios seguidos a API é desligada para o resto da
// run (indo direto ao Playwright), com sondagem periódica para religar.
const _IG_CIRCUIT_THRESHOLD = parseInt(process.env.IG_CIRCUIT_THRESHOLD, 10) || 3;
const _IG_CIRCUIT_PROBE_EVERY = parseInt(process.env.IG_CIRCUIT_PROBE_EVERY, 10) || 10;

class InstagramEngine extends BaseEngine {
    constructor(parent) {
        super(parent);
        this._apiBlockStreak = 0;
        this._apiCircuitOpen = false;
        this._sinceProbe = 0;
    }

    /** A API deve ser tentada para este perfil? (respeita o circuit breaker) */
    _apiEnabled() {
        if (!this._apiCircuitOpen) return true;
        if (++this._sinceProbe >= _IG_CIRCUIT_PROBE_EVERY) {
            this._sinceProbe = 0;
            this.logDiagnostic(`   🔌 Sondando a API IG novamente (circuito aberto há ${_IG_CIRCUIT_PROBE_EVERY} perfis).`);
            return true;
        }
        return false;
    }

    /** Contabiliza o resultado da API para abrir/fechar o circuito. */
    _recordApiOutcome(blocked) {
        if (!blocked) {
            if (this._apiCircuitOpen) this.logDiagnostic(`   🔌 API IG respondeu — circuito fechado.`);
            this._apiBlockStreak = 0;
            this._apiCircuitOpen = false;
            return;
        }
        this._apiBlockStreak++;
        if (!this._apiCircuitOpen && this._apiBlockStreak >= _IG_CIRCUIT_THRESHOLD) {
            this._apiCircuitOpen = true;
            this._sinceProbe = 0;
            this.logDiagnostic(`   🔌 ${_IG_CIRCUIT_THRESHOLD} bloqueios seguidos: IP limitado pelo IG. API desligada — usando Playwright direto.`);
        }
    }

    /** Extrai o @handle da URL do perfil (ou usa o identifier). */
    _usernameFrom(profileUrl, identifier) {
        const m = String(profileUrl || '').match(/instagram\.com\/([^/?#]+)/i);
        if (m && m[1] && !['p', 'reel', 'reels'].includes(m[1].toLowerCase())) return m[1];
        return String(identifier || '').replace(/^@/, '').trim();
    }

    /**
     * Coleta via API `web_profile_info` — sem navegar post-a-post.
     *
     * Dois modos:
     *   - anônimo (default): sem cookie. Imune ao login wall, mas é o primeiro
     *     alvo do rate limit por IP.
     *   - autenticado (`useSession`): manda os cookies do `instagram_session.json`.
     *     Cobre perfis que a chamada anônima não devolve — desde que a sessão
     *     esteja viva (checar com `node services/ETL/Extract/auth/ig-session.js`).
     *
     * Devolve null quando a API falha (→ próximo tier da cascata).
     */
    async _discoverViaApi(profileUrl, identifier, { useSession = false } = {}) {
        const username = this._usernameFrom(profileUrl, identifier);
        if (!username) return null;

        const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
        const headers = {
            'x-ig-app-id': _IG_APP_ID,
            'user-agent': _IG_UA,
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://www.instagram.com/',
            'accept': '*/*',
        };

        if (useSession) {
            const session = readIgSession();
            if (!session.ok) return null;
            headers.cookie = cookieHeader(session.cookies);
            const csrf = session.cookies.find(c => c.name === 'csrftoken');
            if (csrf) headers['x-csrftoken'] = csrf.value;
        }

        // Retry curto. O IG rate-limita o IP em rajada (400/401/429); com o
        // Playwright ativo, o certo é ceder rápido em vez de insistir no IP sujo.
        // `_lastApiBlocked` alimenta o circuit breaker.
        const tag = useSession ? 'API IG (sessão)' : 'API IG';
        const maxAtt = useSession ? 1 : _IG_API_ATTEMPTS;
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        this._lastApiBlocked = false;
        let data = null;
        for (let att = 1; att <= maxAtt; att++) {
            try {
                const r = await fetch(url, { headers });
                if (r.ok) { data = await r.json(); break; }
                if ([400, 401, 429].includes(r.status)) {
                    this._lastApiBlocked = true;
                    if (att === maxAtt) { this.logDiagnostic(`   ⚠️ ${tag} bloqueada (HTTP ${r.status}) para @${username}.`); return null; }
                    const wait = _IG_COOLDOWN_MS * att;
                    this.logDiagnostic(`   ⏳ ${tag} HTTP ${r.status} (rate limit) para @${username} — cooldown ${wait / 1000}s (tentativa ${att}/${maxAtt}).`);
                    await sleep(wait);
                    continue;
                }
                this.logDiagnostic(`   ℹ️ ${tag} HTTP ${r.status} para @${username}.`);
                return null;
            } catch (e) {
                this._lastApiBlocked = true;
                if (att === maxAtt) { this.logDiagnostic(`   ⚠️ ${tag} falhou para @${username}: ${e.message}`); return null; }
                await sleep(3000 * att);
            }
        }
        if (!data) return null;

        const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges;
        if (!Array.isArray(edges) || edges.length === 0) return null;

        const results = [];
        for (const { node } of edges) {
            if (!node || !node.shortcode) continue;
            const isVideo = !!node.is_video;
            const slug = isVideo ? 'reel' : 'p';
            const postUrl = `https://www.instagram.com/${username}/${slug}/${node.shortcode}/`;

            const metrics = {
                likes: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
                comments: node.edge_media_to_comment?.count ?? 0,
                views: node.video_view_count ?? 0,  // web_profile_info raramente traz views
            };
            const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
            const pubDate = node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000) : null;

            if (!this.isWithinWindow(pubDate)) continue;

            results.push({
                url: postUrl, platform: 'instagram', identifier,
                metrics, score: this.calculateScore(metrics), pubDate,
                text: caption.slice(0, 500),
            });
        }
        this.logDiagnostic(`   ✅ ${tag}: ${results.length} post(s) na janela (de ${edges.length} recentes) para @${username}.`);
        return results;
    }

    /** Detecta o login wall (sessão morta) antes de gastar tempo varrendo a grade. */
    async _isLoginWall(page) {
        try {
            if (/\/accounts\/login/i.test(page.url())) return true;
            return await page.evaluate(() => {
                if (document.querySelector('input[name="username"], form[id="loginForm"]')) return true;
                // Tela "one-tap" (Continuar como @user): o IG reconhece a conta mas
                // NÃO autentica a navegação. Some da URL do perfil e serve a home.
                const t = document.body.innerText || '';
                return /Usar outro perfil|Use another profile|Criar nova conta/i.test(t);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Verifica UMA VEZ por run se o browser está de fato logado no IG.
     *
     * A sessão do browser e a da API são coisas diferentes: um `sessionid` velho
     * ainda pode responder 200 na API e mesmo assim a navegação cair na tela
     * "Continuar como @user" (provado em 2026-07-21, sessão de 37d). Sem este
     * gate, cada perfil pagaria ~30s de browser para achar 0 posts.
     *
     * `IG_PLAYWRIGHT_FALLBACK=1` força o fallback mesmo com o gate reprovando.
     */
    async _ensureBrowserSession() {
        if (this._browserSessionOk !== undefined) return this._browserSessionOk;

        const page = await this.parent.context.newPage();
        try {
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(6000);
            this._browserSessionOk = await page.evaluate(() => !!document.querySelector(
                'svg[aria-label="Home"], svg[aria-label="Página inicial"], a[href="/direct/inbox/"], a[href="/explore/"]'
            ));
        } catch (e) {
            this.logDiagnostic(`   ⚠️ Não foi possível validar a sessão do browser: ${e.message}`);
            this._browserSessionOk = false;
        } finally {
            await page.close().catch(() => {});
        }

        this.logDiagnostic(this._browserSessionOk
            ? `   🔓 Sessão do browser AUTENTICADA — fallback Playwright operante.`
            : `   🚧 Sessão do browser NÃO autenticada (tela "Continuar como…"). Renove: node services/ETL/Extract/scrapers/ig-login.js`);
        return this._browserSessionOk;
    }

    async discover(profileUrl, identifier) {
        this.logDiagnostic(`   🧐 Buscando INSTAGRAM: ${identifier}`);

        // Throttle proativo: espaça as chamadas entre perfis para não bater no
        // rate limit do IG (que soft-bloqueia o IP em rajada).
        await new Promise(r => setTimeout(r, _IG_THROTTLE_MS));

        const session = readIgSession();

        if (this._apiEnabled()) {
            // TIER 1 — API pública (sem cookie, imune ao login wall).
            const viaApi = await this._discoverViaApi(profileUrl, identifier);
            if (viaApi !== null) { this._recordApiOutcome(false); return viaApi; }
            const blockedAnon = this._lastApiBlocked;

            // TIER 2 — API autenticada. Barata (sem browser) e cobre perfis que a
            // chamada anônima não devolve. Só tenta se há sessão com `sessionid`.
            let blockedAuth = blockedAnon;
            if (session.ok) {
                const viaApiAuth = await this._discoverViaApi(profileUrl, identifier, { useSession: true });
                if (viaApiAuth !== null) { this._recordApiOutcome(false); return viaApiAuth; }
                blockedAuth = this._lastApiBlocked;
            }
            this._recordApiOutcome(blockedAnon && blockedAuth);
        }

        // TIER 3 — Fallback Playwright. ATIVO por padrão (desligar com
        // IG_PLAYWRIGHT_FALLBACK=0). Depende de sessão viva: sem ela o IG serve
        // o login wall e a varredura acha 0 posts — por isso a checagem abaixo
        // é explícita e o motivo entra no relatório de falhas.
        if (process.env.IG_PLAYWRIGHT_FALLBACK === '0' || !this.parent.context) {
            const why = this.parent.context ? 'fallback Playwright desligado (IG_PLAYWRIGHT_FALLBACK=0)' : 'sem contexto de browser';
            this.logDiagnostic(`   ⏭️ ${identifier}: API indisponível e ${why} — pulando.`);
            this.noteFailure(identifier, 'instagram', `API indisponível; ${why}`);
            return [];
        }
        if (!session.ok) {
            this.logDiagnostic(`   ⏭️ ${identifier}: API indisponível e ${session.reason} — fallback Playwright bateria no login wall.`);
            this.noteFailure(identifier, 'instagram', `API indisponível e sessão IG inválida (${session.reason}) → renovar com ig-login.js`);
            return [];
        }

        // Gate de sessão do browser (uma vez por run). Sem ele, cada perfil
        // pagaria ~30s de navegação para colher 0 posts atrás do login wall.
        const forced = process.env.IG_PLAYWRIGHT_FALLBACK === '1';
        if (!forced && !(await this._ensureBrowserSession())) {
            this.noteFailure(identifier, 'instagram', 'API bloqueada e sessão do browser expirada → renovar: node services/ETL/Extract/scrapers/ig-login.js');
            return [];
        }

        this.logDiagnostic(`   🔁 Fallback Playwright para ${identifier} (sessão de ${session.ageDays}d).`);
        const page = await this.parent.context.newPage();
        const results = [];

        try {
            await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(8000);

            // Login wall = sessão morta. Falhar aqui com o motivo certo evita o
            // diagnóstico errado de "perfil sem posts na janela".
            if (await this._isLoginWall(page)) {
                this.logDiagnostic(`   🚧 ${identifier}: login wall — a sessão do IG expirou.`);
                this.noteFailure(identifier, 'instagram', 'login wall no fallback Playwright → renovar sessão: node services/ETL/Extract/scrapers/ig-login.js');
                return [];
            }

            // Scroll para carregar grade
            for (let i = 0; i < 3; i++) {
                await page.mouse.wheel(0, 1500);
                await page.waitForTimeout(2000);
            }

            const candidates = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
                return [...new Set(links.map(a => a.href))].slice(0, 8);
            });

            this.logDiagnostic(`   🔎 Analisando ${candidates.length} posts do Instagram...`);

            // Grade vazia sem login wall: a página carregou mas não entregou
            // conteúdo. Silenciar isso é o que fazia o perfil "sumir" do ranking.
            if (candidates.length === 0) {
                this.noteFailure(identifier, 'instagram', 'fallback Playwright: grade vazia (perfil não renderizou posts)');
            }

            for (const url of candidates) {
                const postPage = await this.parent.context.newPage();
                try {
                    await postPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
                    await postPage.waitForTimeout(6000);

                    const meta = await postPage.evaluate(() => {
                        const res = { dt: null, likes: 0, comments: 0, views: 0, source: 'none', caption: '' };

                        // 0. Caption — sinal textual para o fit-scorer (VEX-14).
                        // A og:description do IG traz "X likes, Y comments - @user on
                        // DATA: caption...". Extraímos o texto após o primeiro ": ".
                        // Barato: a og:description já é lida abaixo para métricas.
                        const ogDescCap = (document.querySelector('meta[property="og:description"]') || {}).content || '';
                        const capMatch = ogDescCap.match(/:\s*["“]?(.+?)["”]?\s*$/s);
                        if (capMatch && capMatch[1]) {
                            res.caption = capMatch[1].replace(/\s+/g, ' ').trim().slice(0, 500);
                        }
                        // Fallback: og:title costuma trazer "@user on Instagram: caption"
                        if (!res.caption) {
                            const ogTitle = (document.querySelector('meta[property="og:title"]') || {}).content || '';
                            const tM = ogTitle.match(/:\s*["“]?(.+?)["”]?\s*$/s);
                            if (tM && tM[1] && tM[1].length > 8) res.caption = tM[1].replace(/\s+/g, ' ').trim().slice(0, 500);
                        }

                        // 1. ld+json — fonte primária estruturada
                        const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                        for (const script of ldScripts) {
                            try {
                                const data = JSON.parse(script.innerText);
                                if (data.uploadDate && !res.dt) res.dt = data.uploadDate;
                                if (data.datePublished && !res.dt) res.dt = data.datePublished;

                                const stats = data.interactionStatistic
                                    ? (Array.isArray(data.interactionStatistic) ? data.interactionStatistic : [data.interactionStatistic])
                                    : [];
                                for (const s of stats) {
                                    const t = (s.interactionType && (s.interactionType['@type'] || s.interactionType)) || '';
                                    const count = s.userInteractionCount;
                                    if (count == null) continue;
                                    if (typeof t === 'string' && t.includes('LikeAction')) res.likes = count;
                                    else if (typeof t === 'string' && t.includes('CommentAction')) res.comments = count;
                                    else if (typeof t === 'string' && (t.includes('WatchAction') || t.includes('ViewAction'))) res.views = count;
                                }
                                if (res.likes || res.comments || res.views) res.source = 'ld+json';
                            } catch (e) {}
                        }

                        // 2. og:description — fallback rico ("X likes, Y comments - @user on...")
                        if (!res.likes && !res.comments && !res.views) {
                            const ogDesc = (document.querySelector('meta[property="og:description"]') || {}).content || '';
                            const likeM = ogDesc.match(/([\d\.,]+[kmb]?)\s+(?:likes|curtidas)/i);
                            if (likeM) res.likes = likeM[1];
                            const commentM = ogDesc.match(/([\d\.,]+[kmb]?)\s+(?:comments|comentários)/i);
                            if (commentM) res.comments = commentM[1];
                            const viewM = ogDesc.match(/([\d\.,]+[kmb]?)\s+(?:views|visualizações|reproduções|plays)/i);
                            if (viewM) res.views = viewM[1];
                            if (res.likes || res.comments || res.views) res.source = 'og:description';
                        }

                        // 3. DOM time fallback
                        if (!res.dt) {
                            const timeEl = document.querySelector('time');
                            if (timeEl) res.dt = timeEl.getAttribute('datetime');
                        }

                        // 4. innerText regex — fallback final (último recurso)
                        if (!res.likes && !res.comments && !res.views) {
                            const text = document.body.innerText;
                            const likeMatch = text.match(/([\d\.,]+\s*[kmb]?)\s*(curtidas|likes)/i);
                            if (likeMatch) res.likes = likeMatch[1];
                            const commentMatch = text.match(/([\d\.,]+\s*[kmb]?)\s*(comentários|comments)/i);
                            if (commentMatch) res.comments = commentMatch[1];
                            const viewMatch = text.match(/([\d\.,]+\s*[kmb]?)\s*(visualizações|views|reproduções|plays)/i);
                            if (viewMatch) res.views = viewMatch[1];
                            if (res.likes || res.comments || res.views) res.source = 'innerText';
                        }

                        return res;
                    });

                    const pubDate = meta.dt ? new Date(meta.dt) : null;
                    const isNew = this.isWithinWindow(pubDate);

                    // A URL termina em '/', então pop() devolveria string vazia.
                    const shortcode = url.split('/').filter(Boolean).pop();
                    this.logDiagnostic(`      📄 Post [${shortcode}]: Data="${meta.dt}" -> ${pubDate ? pubDate.toLocaleString() : 'NULA'} (${isNew ? 'NOVO' : 'ANTIGO'}) [src=${meta.source}]`);

                    if (isNew) {
                        const metrics = {
                            likes: this.parseViralMetric(meta.likes),
                            comments: this.parseViralMetric(meta.comments),
                            views: this.parseViralMetric(meta.views)
                        };
                        const score = this.calculateScore(metrics);
                        results.push({ url, platform: 'instagram', identifier, metrics, score, pubDate, text: meta.caption || '' });
                    }
                } catch (e) {
                    this.logDiagnostic(`      ❌ Instagram: Erro no post ${url}: ${e.message}`);
                } finally { await postPage.close(); }
            }
        } catch (e) {
            this.logDiagnostic(`   ❌ Instagram ERRO: ${e.message}`);
        } finally {
            await page.close();
        }
        return results;
    }
}

module.exports = InstagramEngine;
