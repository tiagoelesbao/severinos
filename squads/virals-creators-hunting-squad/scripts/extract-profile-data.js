/**
 * extract-profile-data.js — Profile Data Extraction (Playwright)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae) / @hunter-analyst (Gil)
 * 
 * Extracts detailed profile data and metrics for scoring
 * 
 * Usage:
 *   node extract-profile-data.js --handle @sendyqueiroz --platform instagram
 *   node extract-profile-data.js --batch ./data/discoveries/discovery-hashtag-2026-04-01.json
 */

const path = require('path');
const fs = require('fs');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const PROFILES_DIR = path.join(SQUAD_ROOT, 'data/profiles');

if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

/**
 * Extract Instagram profile data via Playwright
 */
async function extractInstagramProfile(handle, browser) {
    const cleanHandle = handle.replace('@', '');
    const url = `https://www.instagram.com/${cleanHandle}/`;
    
    console.log(`   Extracting IG profile: ${cleanHandle}...`);
    
    const page = await browser.newPage();
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Extract profile data from meta tags and page content
        const profileData = await page.evaluate(() => {
            const getMeta = (prop) => {
                const el = document.querySelector(`meta[property="${prop}"]`) ||
                           document.querySelector(`meta[name="${prop}"]`);
                return el ? el.getAttribute('content') : '';
            };
            
            const description = getMeta('og:description') || '';
            
            // Parse followers/following from description
            // Format: "X Followers, Y Following, Z Posts - ..."
            const followerMatch = description.match(/([\d,.]+[KkMm]?)\s*Follower/i);
            const followingMatch = description.match(/([\d,.]+[KkMm]?)\s*Following/i);
            const postsMatch = description.match(/([\d,.]+[KkMm]?)\s*Post/i);
            
            const parseCount = (str) => {
                if (!str) return 0;
                str = str.replace(/,/g, '');
                if (str.match(/[Kk]$/)) return parseFloat(str) * 1000;
                if (str.match(/[Mm]$/)) return parseFloat(str) * 1000000;
                return parseInt(str) || 0;
            };
            
            return {
                name: getMeta('og:title') || '',
                bio: description.split(' - ').slice(1).join(' - ').trim(),
                followers: parseCount(followerMatch?.[1]),
                following: parseCount(followingMatch?.[1]),
                posts_count: parseCount(postsMatch?.[1]),
                profile_url: window.location.href,
                profile_pic: getMeta('og:image') || ''
            };
        });
        
        // Extract recent post metrics (top 12 visible posts)
        const recentPosts = await page.evaluate(() => {
            const posts = [];
            const articleLinks = document.querySelectorAll('article a[href*="/p/"]');
            
            articleLinks.forEach((link, i) => {
                if (i >= 12) return;
                const img = link.querySelector('img');
                posts.push({
                    url: link.href,
                    alt: img?.alt || '',
                    index: i
                });
            });
            
            return posts;
        });
        
        await page.close();
        
        return {
            handle: `@${cleanHandle}`,
            platform: 'instagram',
            ...profileData,
            recent_posts: recentPosts,
            extracted_at: new Date().toISOString()
        };
    } catch (err) {
        await page.close();
        console.error(`   ❌ Failed to extract ${cleanHandle}:`, err.message);
        return null;
    }
}

/**
 * Extract TikTok profile data via Playwright
 */
async function extractTikTokProfile(handle, browser) {
    const cleanHandle = handle.replace('@', '');
    const url = `https://www.tiktok.com/@${cleanHandle}`;
    
    console.log(`   Extracting TT profile: ${cleanHandle}...`);
    
    const page = await browser.newPage();
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        const profileData = await page.evaluate(() => {
            const parseCount = (str) => {
                if (!str) return 0;
                str = str.trim().replace(/,/g, '');
                if (str.match(/[Kk]$/)) return parseFloat(str) * 1000;
                if (str.match(/[Mm]$/)) return parseFloat(str) * 1000000;
                if (str.match(/[Bb]$/)) return parseFloat(str) * 1000000000;
                return parseInt(str) || 0;
            };
            
            // Try multiple selectors for data extraction
            const followingEl = document.querySelector('[data-e2e="following-count"]');
            const followersEl = document.querySelector('[data-e2e="followers-count"]');
            const likesEl = document.querySelector('[data-e2e="likes-count"]');
            const bioEl = document.querySelector('[data-e2e="user-bio"]');
            const nameEl = document.querySelector('[data-e2e="user-title"]') || 
                           document.querySelector('h1');
            
            return {
                name: nameEl?.textContent?.trim() || '',
                bio: bioEl?.textContent?.trim() || '',
                followers: parseCount(followersEl?.textContent),
                following: parseCount(followingEl?.textContent),
                total_likes: parseCount(likesEl?.textContent),
                profile_url: window.location.href
            };
        });
        
        await page.close();
        
        return {
            handle: `@${cleanHandle}`,
            platform: 'tiktok',
            ...profileData,
            extracted_at: new Date().toISOString()
        };
    } catch (err) {
        await page.close();
        console.error(`   ❌ Failed to extract ${cleanHandle}:`, err.message);
        return null;
    }
}

/**
 * Calculate engagement metrics from extracted data
 */
function enrichProfile(profile) {
    if (!profile) return null;
    
    const followers = profile.followers || 1;
    
    // Estimate engagement rate
    if (profile.recent_posts && profile.recent_posts.length > 0) {
        const avgLikes = profile.recent_posts.reduce((sum, p) => sum + (p.likes || 0), 0) / profile.recent_posts.length;
        const avgComments = profile.recent_posts.reduce((sum, p) => sum + (p.comments || 0), 0) / profile.recent_posts.length;
        profile.engagement_metrics = {
            avg_likes: Math.round(avgLikes),
            avg_comments: Math.round(avgComments),
            engagement_rate: Math.round(((avgLikes + avgComments) / followers) * 10000) / 100
        };
    }
    
    // Estimate posting frequency
    if (profile.posts_count && profile.posts_count > 0) {
        // Rough estimate: assume account is 6 months old minimum
        const estimatedWeeks = 26;
        profile.posting_frequency = Math.round((profile.posts_count / estimatedWeeks) * 10) / 10;
    }
    
    return profile;
}

/**
 * Save profile to disk
 */
function saveProfile(profile) {
    if (!profile) return;
    
    const cleanHandle = profile.handle.replace('@', '');
    const dateStr = new Date().toISOString().split('T')[0];
    const outputFile = path.join(PROFILES_DIR, `profile-${cleanHandle}-${dateStr}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(profile, null, 2));
    console.log(`   💾 Saved: ${outputFile}`);
    
    return outputFile;
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

    if (!params.handle && !params.batch) {
        console.log('Usage:');
        console.log('  node extract-profile-data.js --handle @sendyqueiroz --platform instagram');
        console.log('  node extract-profile-data.js --batch ./data/discoveries/discovery.json');
        process.exit(0);
    }

    (async () => {
        let browser;
        try {
            const { chromium } = require('playwright');
            browser = await chromium.launch({ headless: true });
            
            if (params.handle) {
                const platform = params.platform || 'instagram';
                let profile;
                
                if (platform === 'instagram') {
                    profile = await extractInstagramProfile(params.handle, browser);
                } else {
                    profile = await extractTikTokProfile(params.handle, browser);
                }
                
                profile = enrichProfile(profile);
                saveProfile(profile);
                console.log(JSON.stringify(profile, null, 2));
            } else if (params.batch) {
                const data = JSON.parse(fs.readFileSync(params.batch, 'utf8'));
                const creators = data.creators || data;
                
                console.log(`📋 Extracting ${creators.length} profiles...`);
                
                for (const creator of creators) {
                    const platform = creator.platform || 'instagram';
                    let profile;
                    
                    if (platform === 'instagram') {
                        profile = await extractInstagramProfile(creator.handle, browser);
                    } else {
                        profile = await extractTikTokProfile(creator.handle, browser);
                    }
                    
                    profile = enrichProfile(profile);
                    saveProfile(profile);
                    
                    // Rate limiting
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } catch (err) {
            console.error('Error:', err.message);
        } finally {
            if (browser) await browser.close();
        }
    })();
}

module.exports = { extractInstagramProfile, extractTikTokProfile, enrichProfile };
