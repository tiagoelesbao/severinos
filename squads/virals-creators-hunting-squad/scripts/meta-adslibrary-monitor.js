/**
 * meta-adslibrary-monitor.js — Meta Ads Library Monitor (Playwright)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae)
 * 
 * Usage:
 *   node meta-adslibrary-monitor.js --keyword "suplemento" --country BR
 *   node meta-adslibrary-monitor.js --advertiser "Growth Supplements"
 */

const path = require('path');
const fs = require('fs');

const SQUAD_ROOT = path.join(__dirname, '..');
const DISCOVERIES_DIR = path.join(SQUAD_ROOT, 'data/discoveries');

if (!fs.existsSync(DISCOVERIES_DIR)) {
    fs.mkdirSync(DISCOVERIES_DIR, { recursive: true });
}

async function searchAdsLibrary(options = {}) {
    const { keyword = '', advertiser = '', country = 'BR', maxResults = 30 } = options;
    const searchQuery = keyword || advertiser;
    console.log(`📺 Meta Ads Library — Search: "${searchQuery}" | Country: ${country}`);
    
    const params = new URLSearchParams({
        active_status: 'active', ad_type: 'all', country, q: searchQuery, media_type: 'all'
    });
    const url = `https://www.facebook.com/ads/library/?${params.toString()}`;
    
    let browser;
    try {
        const { chromium } = require('playwright');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await page.waitForTimeout(2000);
        }

        const ads = await page.evaluate((maxRes) => {
            const results = [];
            const cards = document.querySelectorAll('div[role="article"]');
            cards.forEach((card, i) => {
                if (i >= maxRes) return;
                const pageNameEl = card.querySelector('strong');
                const hasVideo = card.querySelector('video') !== null;
                results.push({
                    advertiser: pageNameEl?.textContent?.trim() || 'Unknown',
                    has_video: hasVideo,
                    is_potential_ugc: hasVideo,
                    text_preview: (card.textContent || '').substring(0, 200),
                    index: i
                });
            });
            return results;
        }, maxResults);
        
        await browser.close();
        console.log(`   Found ${ads.length} ads, UGC: ${ads.filter(a => a.is_potential_ugc).length}`);
        return ads.map(ad => ({ ...ad, search_query: searchQuery, country, scraped_at: new Date().toISOString() }));
    } catch (err) {
        console.error(`   ❌ Error:`, err.message);
        if (browser) await browser.close();
        return [];
    }
}

function analyzeForUGC(ads) {
    const byAdv = {};
    ads.filter(a => a.is_potential_ugc).forEach(ad => {
        if (!byAdv[ad.advertiser]) byAdv[ad.advertiser] = 0;
        byAdv[ad.advertiser]++;
    });
    return Object.entries(byAdv).sort((a, b) => b[1] - a[1]).map(([adv, count]) => ({
        advertiser: adv, ugc_ad_count: count,
        insight: count > 3 ? 'Heavy UGC — active creator program' : count > 1 ? 'Moderate UGC' : 'Light UGC'
    }));
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = val; if (val !== true) i++;
        }
    }
    if (!params.keyword && !params.advertiser) {
        console.log('Usage: node meta-adslibrary-monitor.js --keyword "suplemento" --country BR');
        process.exit(0);
    }
    (async () => {
        const ads = await searchAdsLibrary(params);
        const analysis = analyzeForUGC(ads);
        const dateStr = new Date().toISOString().split('T')[0];
        const outputFile = path.join(DISCOVERIES_DIR, `discovery-adslibrary-${dateStr}.json`);
        fs.writeFileSync(outputFile, JSON.stringify({ metadata: { date: dateStr, source: 'meta_ads_library', search: params.keyword || params.advertiser, total_ads: ads.length }, ads, ugc_analysis: analysis }, null, 2));
        console.log(`📁 Saved to: ${outputFile}`);
        analysis.forEach(a => console.log(`   ${a.advertiser}: ${a.ugc_ad_count} UGC ads — ${a.insight}`));
    })();
}

module.exports = { searchAdsLibrary, analyzeForUGC };
