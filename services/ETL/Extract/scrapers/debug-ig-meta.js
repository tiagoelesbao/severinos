/**
 * Debug helper — inspeciona meta tags e ld+json de um Reel/Post do Instagram
 * para entender onde estão likes/comments/views.
 *
 * Uso: node services/ETL/Extract/scrapers/debug-ig-meta.js <url>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const url = process.argv[2] || 'https://www.instagram.com/garyvee/reel/DX0JCNfv-Cy/';
    console.log(`\n=== Debug IG Meta: ${url} ===\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 1200 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo'
    });

    const authPath = path.resolve(__dirname, '..', 'auth', 'instagram_session.json');
    if (fs.existsSync(authPath)) {
        const state = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        if (state.cookies) await context.addCookies(state.cookies);
        console.log('✓ Cookies IG injetados');
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    const dump = await page.evaluate(() => {
        const out = { meta: {}, ldJson: [], aria: [], textSample: '' };

        // Meta tags
        ['og:description', 'og:title', 'og:type', 'og:image', 'og:video', 'description', 'twitter:description', 'twitter:title'].forEach(name => {
            const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
            if (el) out.meta[name] = el.content;
        });

        // ld+json
        document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
            try { out.ldJson.push(JSON.parse(s.innerText)); } catch (e) {}
        });

        // aria-labels que possam ter números
        document.querySelectorAll('[aria-label]').forEach(el => {
            const lbl = el.getAttribute('aria-label');
            if (lbl && /\d/.test(lbl) && lbl.length < 200) out.aria.push(lbl);
        });

        out.textSample = (document.body.innerText || '').slice(0, 2000);

        // Buscar nos scripts inline por play_count, video_play_count, view_count, etc.
        out.embedded = {};
        const scripts = Array.from(document.querySelectorAll('script'));
        const keysToFind = ['play_count', 'video_play_count', 'view_count', 'video_view_count', 'ig_play_count', 'reproducoes', 'reproductions', 'views', 'count', 'plays', 'reproductions', 'media_overlay_info', 'video_views'];
        for (const s of scripts) {
            const txt = s.textContent || '';
            for (const key of keysToFind) {
                const re = new RegExp(`"${key}":\\s*(\\d+)`, 'g');
                let m;
                while ((m = re.exec(txt)) !== null) {
                    if (!out.embedded[key]) out.embedded[key] = [];
                    out.embedded[key].push(parseInt(m[1], 10));
                }
            }
        }
        return out;
    });

    console.log('--- META TAGS ---');
    Object.entries(dump.meta).forEach(([k, v]) => console.log(`  [${k}] ${v}`));

    console.log('\n--- LD+JSON ---');
    dump.ldJson.forEach((j, i) => {
        console.log(`  [${i}] ${JSON.stringify(j, null, 2).slice(0, 1500)}`);
    });

    console.log('\n--- ARIA-LABELS (com dígitos) ---');
    dump.aria.slice(0, 30).forEach(a => console.log(`  ${a}`));

    console.log('\n--- TEXT SAMPLE (2000 chars) ---');
    console.log(dump.textSample);

    console.log('\n--- EMBEDDED COUNTS (em scripts inline) ---');
    Object.entries(dump.embedded || {}).forEach(([k, arr]) => {
        const top = arr.slice(0, 5);
        const max = Math.max(...arr);
        console.log(`  ${k}: ${arr.length} matches | top5=${top.join(',')} | MAX=${max}`);
    });

    await browser.close();
})();
