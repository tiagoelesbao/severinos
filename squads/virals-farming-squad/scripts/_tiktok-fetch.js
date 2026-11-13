/**
 * _tiktok-fetch.js — Captura de vídeo e metadados de um post do TikTok.
 *
 * ESTADO VERIFICADO EM 2026-07-26 (yt-dlp 2026.07.04):
 *
 *   ❌ `yt-dlp {url-do-video}`                  → "No video formats found!"
 *   ❌ `yt-dlp --cookies {sessão} {url}`        → mesmo erro
 *   ❌ `Downloader` compartilhado do ETL        → degrada para metadata_only, sem arquivo
 *   ✅ Playwright + interceptação do CDN        → captura o mp4 completo
 *      (v16-webapp-prime.tiktok.com/video/tos/... · content-type video/mp4 · 200)
 *
 * Por isso a estratégia de captura é uma CASCATA: as vias baratas são tentadas
 * primeiro e, quando falham, o navegador — que é quem de fato consegue tocar o
 * vídeo — captura o mp4 direto do CDN. A mesma visita colhe descrição, hashtags
 * e métricas do autor, que a rota de vídeo do yt-dlp não devolve mais.
 *
 * Se TODAS as estratégias falham, o item é reportado como degradado com o motivo
 * técnico real. Nunca se reporta sucesso sem arquivo em disco.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TIKTOK_SESSION = path.join(REPO_ROOT, 'services', 'ETL', 'Extract', 'auth', 'tiktok_session.json');
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

// Host do CDN que serve o vídeo REAL do post.
const CDN_CONTENT = /v\d+[-\w]*\.tiktok(cdn)?\.com\/.*\/video\/tos\/|\/video\/tos\//;
// Qualquer resposta que pareça vídeo — usada só como rede de segurança.
const CDN_PATTERN = /\/video\/tos\/|\.mp4(\?|$)/;
// Hosts de asset estático da interface: contêm vídeos de UI (ex.: "playback1",
// animações de onboarding) que NÃO são o conteúdo do post. Capturá-los produz um
// mp4 válido de 2 segundos — o pior tipo de falha, porque parece sucesso.
const CDN_STATIC_HOSTS = /ttwstatic\.com|website-login|\/webapp-desktop\/|byteoversea\.com\/obj\//;

function resolveYtdlp() {
    const primary = path.join(REPO_ROOT, 'services', 'ETL', 'bin', 'yt-dlp.exe');
    const fallback = path.join(REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'yt-dlp.exe');
    if (fs.existsSync(primary)) return primary;
    if (fs.existsSync(fallback)) return fallback;
    return 'yt-dlp';
}

// ---------------------------------------------------------------------------
// Estratégia 1 — yt-dlp direto (barata; hoje falha, mas volta a funcionar
// sozinha quando o extractor for corrigido upstream)
// ---------------------------------------------------------------------------

/**
 * O arquivo baixado tem STREAM DE VÍDEO?
 *
 * Baixar não é capturar. Em post de "photo mode" — e em algumas respostas do
 * extractor — o yt-dlp entrega um arquivo legítimo de 263KB contendo só áudio. O
 * tamanho passa em qualquer checagem, a cascata dá o download por bem-sucedido e
 * NUNCA tenta o navegador, que capturaria o vídeo de verdade. O pack termina
 * degradado, sem frames, e só se descobre duas fases depois — quando a modelagem
 * não tem o que ler. Medido em dois criativos deste lote.
 */
function temStreamDeVideo(file) {
    const local = path.join(REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    const bin = fs.existsSync(local) ? local : 'ffprobe';
    const r = spawnSync(bin, ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    return /video/i.test(r.stdout || '');
}

function tryYtdlp(url, destVideoPath, cookiesFile = null) {
    const bin = resolveYtdlp();
    const args = ['--no-warnings', '-o', destVideoPath];
    if (cookiesFile && fs.existsSync(cookiesFile)) args.push('--cookies', cookiesFile);
    args.push(url);

    const r = spawnSync(bin, args, { encoding: 'utf8', windowsHide: true, timeout: 180000 });
    if (fs.existsSync(destVideoPath) && fs.statSync(destVideoPath).size > 10240) {
        if (!temStreamDeVideo(destVideoPath)) {
            // Apaga: deixar o arquivo no lugar faria a próxima estratégia "achar" que
            // já existe captura, e o pack seguiria sem vídeo.
            try { fs.unlinkSync(destVideoPath); } catch (_) { /* segue */ }
            return { ok: false, reason: 'arquivo sem stream de vídeo (photo mode ou só áudio) — segue para o navegador' };
        }
        return { ok: true, videoPath: destVideoPath };
    }
    const err = (r.stderr || '')
        .split('\n')
        .filter((l) => l.includes('ERROR'))
        .slice(-1)[0];
    return { ok: false, reason: (err || `exit ${r.status}`).slice(0, 200) };
}

/** Converte a sessão Playwright salva em cookies Netscape para o yt-dlp. */
function writeNetscapeCookies(destPath) {
    if (!fs.existsSync(TIKTOK_SESSION)) return null;
    try {
        const session = JSON.parse(fs.readFileSync(TIKTOK_SESSION, 'utf8'));
        if (!session.cookies || !session.cookies.length) return null;
        let txt = '# Netscape HTTP Cookie File\n';
        for (const c of session.cookies) {
            const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
            const expires = c.expires && c.expires > 0 ? Math.floor(c.expires) : 0;
            txt += [domain, 'TRUE', c.path || '/', c.secure ? 'TRUE' : 'FALSE', expires, c.name, c.value].join('\t') + '\n';
        }
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, txt);
        return destPath;
    } catch (_) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Estratégia 3 — Playwright + interceptação do CDN (a que funciona hoje)
// ---------------------------------------------------------------------------

async function loadPlaywright() {
    try {
        return require('playwright');
    } catch (_) {
        return null;
    }
}

/**
 * Abre o post no navegador, captura o mp4 do CDN e colhe os metadados do autor
 * na mesma visita.
 *
 * @returns {{ok, videoPath?, meta?, reason?}}
 */
async function captureViaBrowser(url, destVideoPath, options = {}) {
    const { headless = true, playSeconds = 10 } = options;
    const playwright = await loadPlaywright();
    if (!playwright) return { ok: false, reason: 'playwright não instalado' };

    let browser;
    try {
        browser = await playwright.chromium.launch({
            headless,
            args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
        });
        const ctx = await browser.newContext({
            userAgent: UA,
            viewport: { width: 500, height: 900 },
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo',
        });

        if (fs.existsSync(TIKTOK_SESSION)) {
            try {
                const s = JSON.parse(fs.readFileSync(TIKTOK_SESSION, 'utf8'));
                if (s.cookies) await ctx.addCookies(s.cookies);
            } catch (_) {
                /* sessão ilegível — segue anônimo */
            }
        }
        // NÃO se injeta script de stealth aqui. Verificado em 2026-07-26: o
        // `delete Object.getPrototypeOf(navigator).webdriver` quebra a execução de
        // JS da página do post e o vídeo deixa de tocar — sem reprodução, o CDN
        // nunca é chamado e a captura falha. A página do post carrega normalmente
        // sem stealth; a descoberta por hashtag (_tiktok-source.js) é que precisa dele.

        // Coleta as URLs de mídia do CDN. NÃO se usa res.body() aqui: o player
        // consome o stream e o corpo volta vazio. Guarda-se a URL e o
        // content-length anunciado; o arquivo é buscado depois, pelo request
        // context (que carrega os mesmos cookies da navegação).
        const mediaUrls = new Map();
        ctx.on('response', (res) => {
            const u = res.url();
            const ct = res.headers()['content-type'] || '';
            if (!ct.includes('video/') && !CDN_PATTERN.test(u)) return;
            if (CDN_STATIC_HOSTS.test(u)) return; // asset de UI, não o post
            const len = Number(res.headers()['content-length']) || 0;
            const prev = mediaUrls.get(u);
            if (!prev || len > prev.len) mediaUrls.set(u, { len, isContent: CDN_CONTENT.test(u) });
        });

        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Deixa o autoplay acontecer sozinho primeiro. Chamar play() num vídeo que
        // JÁ está tocando reinicia o elemento, aborta o stream do blob em curso e
        // o response do CDN nunca completa — ou seja, a "ajuda" impede a captura.
        await page.waitForTimeout(playSeconds * 1000);

        // Só intervém se, passado o tempo de reprodução, nada de mídia apareceu.
        for (let attempt = 0; attempt < 2 && mediaUrls.size === 0; attempt++) {
            try {
                await page.evaluate(async () => {
                    const v = document.querySelector('video');
                    if (!v || v.readyState >= 3) return; // já tem buffer: não mexer
                    v.muted = true;
                    try {
                        await v.play();
                    } catch (_) {
                        /* política de autoplay */
                    }
                });
            } catch (_) {
                /* página ainda montando */
            }
            await page.waitForTimeout(5000);
        }

        const meta = await page.evaluate(() => {
            const txt = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };
            const desc =
                txt('[data-e2e="browse-video-desc"]') ||
                txt('[data-e2e="video-desc"]') ||
                (document.querySelector('meta[property="og:description"]') || {}).content ||
                '';

            const hashtags = [...new Set((desc.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.slice(1)))];

            const music =
                txt('[data-e2e="browse-music"]') ||
                txt('[data-e2e="video-music"]') ||
                null;

            const author =
                txt('[data-e2e="browse-username"]') ||
                txt('[data-e2e="video-author-uniqueid"]') ||
                null;

            const stat = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };

            const v = document.querySelector('video');

            return {
                description: desc,
                hashtags,
                music,
                author,
                likes_text: stat('[data-e2e="like-count"]'),
                comments_text: stat('[data-e2e="comment-count"]'),
                shares_text: stat('[data-e2e="share-count"]'),
                duration: v && v.duration && isFinite(v.duration) ? Math.round(v.duration) : null,
                page_title: document.title,
            };
        });

        // Ordena: URLs do CDN de conteúdo primeiro, depois por tamanho anunciado.
        // Sem esse critério, um asset de UI de 2s ganha de um vídeo real sem
        // content-length — e o pipeline "tem sucesso" com o arquivo errado.
        const candidates = [...mediaUrls.entries()]
            .sort((a, b) => {
                if (a[1].isContent !== b[1].isContent) return a[1].isContent ? -1 : 1;
                return b[1].len - a[1].len;
            })
            .map(([u]) => u);
        if (candidates.length === 0) {
            return {
                ok: false,
                meta,
                observedMedia: [],
                reason:
                    'nenhuma URL de mídia do CDN observada durante a reprodução ' +
                    '(vídeo não tocou ou o host mudou — rode com --headed para inspecionar)',
            };
        }

        let saved = null;
        const fetchErrors = [];
        for (const candidate of candidates.slice(0, 4)) {
            try {
                const resp = await ctx.request.get(candidate, {
                    headers: { referer: 'https://www.tiktok.com/', 'user-agent': UA },
                    timeout: 60000,
                });
                if (!resp.ok()) {
                    fetchErrors.push(`${resp.status()}`);
                    continue;
                }
                const buf = await resp.body();
                if (buf && buf.length > 10240) {
                    // O CDN também serve a FAIXA DE ÁUDIO do post, e ela passa em
                    // qualquer teste de tamanho. Aceitar o primeiro corpo grande deixava
                    // o pack com um mp4 sem imagem — captura "bem-sucedida", pack
                    // degradado. Grava e confere antes de parar de procurar.
                    fs.mkdirSync(path.dirname(destVideoPath), { recursive: true });
                    fs.writeFileSync(destVideoPath, buf);
                    if (temStreamDeVideo(destVideoPath)) {
                        saved = { buffer: buf, size: buf.length, url: candidate };
                        break;
                    }
                    fetchErrors.push(`${Math.round(buf.length / 1024)}KB sem stream de vídeo`);
                    try { fs.unlinkSync(destVideoPath); } catch (_) { /* segue */ }
                    continue;
                }
                fetchErrors.push(`corpo de ${buf ? buf.length : 0} bytes`);
            } catch (e) {
                fetchErrors.push(e.message.slice(0, 60));
            }
        }

        if (!saved) {
            return {
                ok: false,
                meta,
                reason: `CDN observado (${candidates.length} url[s]) mas sem corpo utilizável: ${fetchErrors.join('; ')}`,
            };
        }

        // O arquivo já foi gravado dentro do laço (é onde a checagem de stream acontece).
        return { ok: true, videoPath: destVideoPath, bytes: saved.size, cdnUrl: saved.url, meta };
    } catch (e) {
        return { ok: false, reason: `exceção no navegador: ${e.message}` };
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

/**
 * Cascata completa de captura. Devolve sempre o registro de quais estratégias
 * foram tentadas — o relatório de degradação depende disso.
 *
 * @returns {{ok, videoPath?, meta?, strategy?, attempts: Array}}
 */
async function fetchCreative(url, destVideoPath, options = {}) {
    const attempts = [];
    const tmpDir = options.tmpDir || path.join(REPO_ROOT, '.aiox', 'tmp', 'farming');

    // 1 — yt-dlp puro
    if (!options.skipYtdlp) {
        const r1 = tryYtdlp(url, destVideoPath);
        attempts.push({ strategy: 'ytdlp-plain', ok: r1.ok, reason: r1.reason || null });
        if (r1.ok) return { ok: true, videoPath: r1.videoPath, strategy: 'ytdlp-plain', attempts };

        // 2 — yt-dlp com cookies da sessão
        const cookiesFile = writeNetscapeCookies(path.join(tmpDir, 'tt-cookies.txt'));
        if (cookiesFile) {
            const r2 = tryYtdlp(url, destVideoPath, cookiesFile);
            attempts.push({ strategy: 'ytdlp-cookies', ok: r2.ok, reason: r2.reason || null });
            if (r2.ok) return { ok: true, videoPath: r2.videoPath, strategy: 'ytdlp-cookies', attempts };
        } else {
            attempts.push({ strategy: 'ytdlp-cookies', ok: false, reason: 'sessão TikTok indisponível' });
        }
    }

    // 3 — navegador + interceptação do CDN
    const r3 = await captureViaBrowser(url, destVideoPath, options);
    attempts.push({ strategy: 'browser-cdn', ok: r3.ok, reason: r3.reason || null });
    if (r3.ok) {
        return {
            ok: true,
            videoPath: r3.videoPath,
            bytes: r3.bytes,
            cdnUrl: r3.cdnUrl,
            meta: r3.meta,
            strategy: 'browser-cdn',
            attempts,
        };
    }

    return { ok: false, meta: r3.meta || null, attempts, reason: attempts.map((a) => `${a.strategy}: ${a.reason}`).join(' | ') };
}

module.exports = { fetchCreative, captureViaBrowser, tryYtdlp, writeNetscapeCookies, resolveYtdlp, TIKTOK_SESSION };
