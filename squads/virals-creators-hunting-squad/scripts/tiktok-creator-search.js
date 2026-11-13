/**
 * tiktok-creator-search.js — TikTok Discovery (Playwright)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae)
 * 
 * Discovers creators via TikTok hashtag pages using Playwright scraping.
 * Future: migrate to TikTok Creator Marketplace API when configured.
 * 
 * Usage:
 *   node tiktok-creator-search.js --hashtag "#gymtok" --max-results 20
 *   node tiktok-creator-search.js --niche fitness
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.join(__dirname, '..');
const NICHES_CATALOG = path.join(SQUAD_ROOT, 'data/niches-catalog.yaml');
const DISCOVERIES_DIR = path.join(SQUAD_ROOT, 'data/discoveries');

if (!fs.existsSync(DISCOVERIES_DIR)) {
    fs.mkdirSync(DISCOVERIES_DIR, { recursive: true });
}

/**
 * Search TikTok by hashtag using Playwright
 */
async function searchTikTokByHashtag(hashtag, options = {}) {
    const { maxResults = 20 } = options;
    const cleanTag = hashtag.replace('#', '');
    const url = `https://www.tiktok.com/tag/${cleanTag}`;
    
    console.log(`🔍 Searching TikTok: #${cleanTag}...`);
    
    let browser;
    try {
        const { chromium } = require('playwright');
        browser = await chromium.launch({ headless: true });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Scroll to load more content
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await page.waitForTimeout(1500);
        }
        
        // Extract video cards with creator info
        const videos = await page.evaluate((maxRes) => {
            const results = [];
            const cards = document.querySelectorAll('[data-e2e="challenge-item"]') ||
                          document.querySelectorAll('div[class*="DivItemContainer"]');
            
            cards.forEach((card, i) => {
                if (i >= maxRes) return;
                
                const authorEl = card.querySelector('a[href*="/@"]');
                const viewsEl = card.querySelector('[data-e2e="video-views"]') ||
                               card.querySelector('strong');
                
                const parseViews = (str) => {
                    if (!str) return 0;
                    str = str.trim();
                    if (str.match(/[Kk]$/)) return parseFloat(str) * 1000;
                    if (str.match(/[Mm]$/)) return parseFloat(str) * 1000000;
                    return parseInt(str.replace(/\D/g, '')) || 0;
                };
                
                if (authorEl) {
                    const href = authorEl.getAttribute('href') || '';
                    const handle = href.replace('/', '').replace('https://www.tiktok.com', '');
                    
                    results.push({
                        handle: handle.startsWith('@') ? handle : `@${handle}`,
                        video_url: card.querySelector('a')?.href || '',
                        views: parseViews(viewsEl?.textContent),
                        index: i
                    });
                }
            });
            
            return results;
        }, maxResults);
        
        await browser.close();
        
        // Deduplicate by handle
        const seen = new Set();
        const unique = videos.filter(v => {
            const key = v.handle.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        console.log(`   Found ${videos.length} videos, ${unique.length} unique creators`);
        
        return unique.map(v => ({
            handle: v.handle,
            platform: 'tiktok',
            source: `hashtag:#${cleanTag}`,
            sample_views: v.views,
            video_url: v.video_url,
            discovered_at: new Date().toISOString()
        }));
        
    } catch (err) {
        console.error(`   ❌ Error searching #${cleanTag}:`, err.message);
        if (browser) await browser.close();
        return [];
    }
}

/**
 * Search by niche using catalog hashtags
 */
async function searchByNiche(niche, options = {}) {
    let catalog;
    try {
        catalog = yaml.load(fs.readFileSync(NICHES_CATALOG, 'utf8'));
    } catch (e) {
        console.error('Could not load niches catalog');
        return [];
    }
    
    const nicheData = catalog.niches?.[niche];
    if (!nicheData) {
        console.error(`Niche '${niche}' not found in catalog. Available: ${Object.keys(catalog.niches).join(', ')}`);
        return [];
    }
    
    const hashtags = nicheData.hashtags?.tiktok || [];
    console.log(`\n🎯 Niche: ${nicheData.label} — ${hashtags.length} hashtags to mine`);
    
    const allCreators = [];
    const seen = new Set();
    
    for (const tag of hashtags) {
        const results = await searchTikTokByHashtag(tag, options);
        for (const creator of results) {
            const key = creator.handle.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                allCreators.push(creator);
            }
        }
        // Rate limiting between hashtags
        await new Promise(r => setTimeout(r, 3000));
    }
    
    return allCreators;
}

// ── CLI ──────────────────────────────────────────────────
if (require.main === module) {
    const args = process.argv.slice(2);
    const params = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = value;
            if (value !== true) i++;
        }
    }

    (async () => {
        let creators = [];
        
        if (params.niche) {
            creators = await searchByNiche(params.niche, {
                maxResults: parseInt(params['max-results']) || 20
            });
        } else if (params.hashtag) {
            creators = await searchTikTokByHashtag(params.hashtag, {
                maxResults: parseInt(params['max-results']) || 20
            });
        } else {
            console.log('Usage:');
            console.log('  node tiktok-creator-search.js --hashtag "#gymtok"');
            console.log('  node tiktok-creator-search.js --niche fitness');
            process.exit(0);
        }
        
        // Save
        const dateStr = new Date().toISOString().split('T')[0];
        const outputFile = path.join(DISCOVERIES_DIR, `discovery-tiktok-${dateStr}.json`);
        
        const output = {
            metadata: {
                date: dateStr,
                platform: 'tiktok',
                source: params.niche ? `niche:${params.niche}` : `hashtag:${params.hashtag}`,
                total_discovered: creators.length
            },
            creators
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n📁 Saved ${creators.length} creators to: ${outputFile}`);
    })();
}

module.exports = { searchTikTokByHashtag, searchByNiche };
