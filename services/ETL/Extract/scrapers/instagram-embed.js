const fs = require('fs');
const path = require('path');

/**
 * Instagram Embed Extractor — posts e carrosséis SEM sessão (VEX-14).
 *
 * Por que existe: o CarouselScraper depende de sessão logada no Playwright, e o
 * Instagram derruba sessão de automação via Set-Cookie (confirmado: a API
 * responde 200 e expira o sessionid na mesma resposta). Resultado prático: o
 * scraper fotografava o modal "Sign up / Log in" — 15 prints idênticos que o
 * pipeline aceitava como carrossel. Renovar sessão à mão a cada benchmark é o
 * problema que a VEX-14 existe para eliminar.
 *
 * Como resolve: `/p/{shortcode}/embed/captioned/` é público POR DESIGN — é o
 * endpoint que sites usam para incorporar posts. Não tem login wall. O HTML
 * embute os dados do post (`edge_sidecar_to_children`) com `display_url` de
 * cada slide, `is_video` e `video_url`.
 *
 * E, principalmente: BAIXA a imagem do CDN em vez de FOTOGRAFAR a tela. Um
 * download não sofre com modal sobreposto, e vem em resolução original.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function shortcodeFrom(url) {
    const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
}

/** O blob do embed vem com escapes empilhados (JSON dentro de string JSON). */
function desescapar(s) {
    return s
        .replace(/\\\\u0026/gi, '&').replace(/\\u0026/gi, '&')
        .replace(/\\\\u002F/gi, '/').replace(/\\u002F/gi, '/')
        .replace(/\\\\\//g, '/').replace(/\\\//g, '/')
        .replace(/\\\\"/g, '"').replace(/\\"/g, '"')
        .replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
}

function decodificarUnicode(s) {
    return String(s || '').replace(/\\+u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Extrai os slides do blob do embed.
 * O primeiro `display_url` é o do post pai e repete o slide 1 — por isso
 * usamos a contagem de `is_video` para alinhar, e deduplicamos por asset id.
 */
function parseSlides(blobLimpo) {
    const displayUrls = [...blobLimpo.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
    const isVideoFlags = [...blobLimpo.matchAll(/"is_video"\s*:\s*(true|false)/g)].map(m => m[1] === 'true');
    const videoUrls = [...blobLimpo.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)].map(m => m[1]);

    const assetId = (u) => (u.match(/\/(\d{6,}_\d+_\d+_n)\./) || [])[1] || u;

    const vistos = new Set();
    const slides = [];
    displayUrls.forEach((url, i) => {
        const id = assetId(url);
        if (vistos.has(id)) return; // o pai duplica o primeiro filho
        vistos.add(id);
        slides.push({ displayUrl: url, isVideo: isVideoFlags[i] === true, index: slides.length + 1 });
    });

    return { slides, videoUrls };
}

function parseCaption(blobLimpo) {
    const m = blobLimpo.match(/"edge_media_to_caption"\s*:\s*\{\s*"edges"\s*:\s*\[\s*\{\s*"node"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return m ? decodificarUnicode(m[1].replace(/\\n/g, '\n')) : '';
}

function parseAutor(blobLimpo) {
    const m = blobLimpo.match(/"owner"\s*:\s*\{[^}]*?"username"\s*:\s*"([^"]+)"/) ||
              blobLimpo.match(/"username"\s*:\s*"([^"]+)"/);
    return m ? m[1] : 'Unknown';
}

function parseContadores(blobLimpo) {
    const likes = blobLimpo.match(/"edge_media_preview_like"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
    const comments = blobLimpo.match(/"edge_media_(?:to_parent_comment|preview_comment)"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
    return {
        like_count: likes ? parseInt(likes[1], 10) : null,
        comment_count: comments ? parseInt(comments[1], 10) : null
    };
}

async function baixarArquivo(url, destino) {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'referer': 'https://www.instagram.com/' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    // Um "asset" de 1KB é página de erro, não criativo.
    if (buf.length < 5000) throw new Error(`asset suspeito (${buf.length} bytes)`);
    fs.writeFileSync(destino, buf);
    return buf.length;
}

class InstagramEmbedScraper {
    constructor(options = {}) {
        this.options = { headless: true, ...options };
    }

    async init() {
        const { chromium } = require('playwright');
        this.browser = await chromium.launch({ headless: this.options.headless });
        // Sem storageState: o embed é público. Não depender de sessão é o ponto.
        this.context = await this.browser.newContext({
            viewport: { width: 800, height: 1200 },
            userAgent: UA
        });
    }

    async close() {
        try { if (this.browser) await this.browser.close(); } catch (_) {}
    }

    /**
     * @returns {{status, images: string[], videoUrls: string[], description, author, ...}}
     */
    async extract(url, downloadDir) {
        const shortcode = shortcodeFrom(url);
        const results = {
            url, shortcode,
            title: 'Instagram Post',
            description: '',
            author: 'Unknown',
            like_count: null,
            comment_count: null,
            images: [],
            videoUrls: [],
            status: 'error'
        };

        if (!shortcode) {
            results.error = `shortcode não extraível de ${url}`;
            return results;
        }

        const page = await this.context.newPage();
        try {
            const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
            console.log(`[EmbedScraper] ${embedUrl}`);
            await page.goto(embedUrl, { waitUntil: 'networkidle', timeout: 45000 });
            await page.waitForTimeout(1500);

            const blob = await page.evaluate(() => {
                const s = Array.from(document.querySelectorAll('script'))
                    .map(x => x.textContent || '')
                    .find(t => /edge_sidecar_to_children|image_versions2|display_url/.test(t));
                return s || null;
            });

            if (!blob) {
                results.status = 'no_data';
                results.error = 'embed não trouxe dados do post (post removido/privado?)';
                return results;
            }

            const limpo = desescapar(blob);
            const { slides, videoUrls } = parseSlides(limpo);
            results.description = parseCaption(limpo);
            results.author = parseAutor(limpo);
            Object.assign(results, parseContadores(limpo));
            results.videoUrls = videoUrls;

            if (slides.length === 0) {
                results.status = 'no_data';
                results.error = 'nenhum slide encontrado no embed';
                return results;
            }

            console.log(`[EmbedScraper] ${slides.length} slide(s) · @${results.author}`);

            fs.mkdirSync(downloadDir, { recursive: true });
            for (const slide of slides) {
                if (slide.isVideo) {
                    // Vídeo dentro de carrossel: o yt-dlp cuida (e é melhor nisso).
                    console.log(`  ⏭️  slide ${slide.index}: vídeo (delegado ao yt-dlp)`);
                    continue;
                }
                const destino = path.join(downloadDir, `slide_${String(slide.index).padStart(2, '0')}.jpg`);
                try {
                    const bytes = await baixarArquivo(slide.displayUrl, destino);
                    results.images.push(destino);
                    console.log(`  ✅ slide ${slide.index}: ${(bytes / 1024).toFixed(0)} KB`);
                } catch (e) {
                    console.warn(`  ⚠️ slide ${slide.index} falhou: ${e.message}`);
                }
            }

            results.title = results.description ? results.description.split('\n')[0].slice(0, 80) : 'Instagram Post';
            results.status = results.images.length > 0 ? 'success' : 'no_assets';
            return results;
        } catch (e) {
            results.error = e.message;
            return results;
        } finally {
            await page.close().catch(() => {});
        }
    }
}

module.exports = InstagramEmbedScraper;
module.exports.shortcodeFrom = shortcodeFrom;
module.exports.parseSlides = parseSlides;
module.exports.parseCaption = parseCaption;
module.exports.desescapar = desescapar;
