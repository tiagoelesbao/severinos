/**
 * hunt-creators.js — Motor de Mineração de Creators
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae)
 * 
 * Extends: services/ETL/Extract/scrapers/social-discovery.js
 * Purpose: Discover new creators by hashtag mining on TikTok/Instagram
 * 
 * Usage:
 *   node hunt-creators.js --hashtags "#fitness,#treino" --platform tiktok --min-followers 1000 --max-followers 50000
 *   node hunt-creators.js --criteria ./data/search-criteria-marca-2026-04-01.json
 *   node hunt-creators.js --dry-run --niche fitness
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const ETL_PATH = path.join(__dirname, '../../../services/ETL/Extract/scrapers/social-discovery.js');
const NICHES_CATALOG = path.join(SQUAD_ROOT, 'data/niches-catalog.yaml');
const DISCOVERIES_DIR = path.join(SQUAD_ROOT, 'data/discoveries');

// Ensure output dir exists
if (!fs.existsSync(DISCOVERIES_DIR)) {
    fs.mkdirSync(DISCOVERIES_DIR, { recursive: true });
}

/**
 * Load niches catalog for hashtag expansion
 */
function loadNichesCatalog() {
    try {
        const content = fs.readFileSync(NICHES_CATALOG, 'utf8');
        return yaml.load(content);
    } catch (err) {
        console.error('Warning: Could not load niches-catalog.yaml:', err.message);
        return { niches: {} };
    }
}

/**
 * Load search criteria from ICP-C transformed JSON
 */
function loadSearchCriteria(criteriaPath) {
    const content = fs.readFileSync(criteriaPath, 'utf8');
    return JSON.parse(content);
}

/**
 * Expand hashtags using niches catalog
 */
function expandHashtags(hashtags, niche, platform, catalog) {
    const expanded = new Set(hashtags);
    
    if (niche && catalog.niches && catalog.niches[niche]) {
        const nicheData = catalog.niches[niche];
        const platformHashtags = nicheData.hashtags?.[platform] || [];
        platformHashtags.forEach(tag => expanded.add(tag));
    }
    
    return Array.from(expanded);
}

/**
 * Parse creator data from social discovery results
 */
function parseCreatorFromResult(result, source, platform) {
    return {
        handle: result.handle || result.username || 'unknown',
        platform: platform,
        bio: result.bio || '',
        followers: result.followers || 0,
        following: result.following || 0,
        posts_count: result.posts_count || 0,
        engagement_metrics: {
            avg_likes: result.avg_likes || 0,
            avg_comments: result.avg_comments || 0,
            avg_views: result.avg_views || 0,
            engagement_rate: result.engagement_rate || 0
        },
        source: source,
        discovered_at: new Date().toISOString(),
        profile_url: result.profile_url || '',
        recent_posts: result.recent_posts || []
    };
}

/**
 * Deduplicate against existing discoveries
 */
function deduplicateCreators(newCreators, existingHandles) {
    return newCreators.filter(c => !existingHandles.has(c.handle.toLowerCase()));
}

/**
 * Load existing handles from all discovery files
 */
function loadExistingHandles() {
    const handles = new Set();
    
    if (!fs.existsSync(DISCOVERIES_DIR)) return handles;
    
    const files = fs.readdirSync(DISCOVERIES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(DISCOVERIES_DIR, file), 'utf8');
            const data = JSON.parse(content);
            const creators = data.creators || data;
            if (Array.isArray(creators)) {
                creators.forEach(c => handles.add((c.handle || '').toLowerCase()));
            }
        } catch (e) {
            // Skip malformed files
        }
    }
    
    return handles;
}

/**
 * Main hunting function
 */
async function huntCreators(options) {
    const {
        hashtags = [],
        platform = 'tiktok',
        minFollowers = 1000,
        maxFollowers = 50000,
        niche = null,
        criteriaPath = null,
        dryRun = false
    } = options;

    console.log('🔍 Hunt Creators — Starting...');
    console.log(`   Platform: ${platform}`);
    console.log(`   Follower range: ${minFollowers}-${maxFollowers}`);
    
    // Load catalog for hashtag expansion
    const catalog = loadNichesCatalog();
    
    // Determine hashtags to use
    let searchHashtags = hashtags;
    let searchCriteria = null;
    
    if (criteriaPath) {
        searchCriteria = loadSearchCriteria(criteriaPath);
        searchHashtags = searchCriteria.search_criteria?.hashtags || hashtags;
        console.log(`   Loaded criteria from: ${criteriaPath}`);
    }
    
    // Expand hashtags with catalog
    searchHashtags = expandHashtags(searchHashtags, niche, platform, catalog);
    console.log(`   Hashtags (${searchHashtags.length}): ${searchHashtags.join(', ')}`);
    
    if (dryRun) {
        console.log('\n🏁 DRY RUN — Would search for:');
        console.log(JSON.stringify({
            platform,
            hashtags: searchHashtags,
            follower_range: { min: minFollowers, max: maxFollowers },
            niche
        }, null, 2));
        return;
    }

    // Load existing handles for dedup
    const existingHandles = loadExistingHandles();
    console.log(`   Existing handles in pipeline: ${existingHandles.size}`);

    const allDiscoveries = [];

    // Try to use Social Discovery Engine
    let SocialDiscovery;
    try {
        SocialDiscovery = require(ETL_PATH);
    } catch (err) {
        console.error('⚠️ Could not load Social Discovery Engine:', err.message);
        console.log('   Falling back to mock mode...');
        
        // Generate mock result for testing
        const mockCreator = {
            handle: `@mock_creator_${Date.now()}`,
            platform,
            bio: `Mock creator for ${niche || 'general'} niche`,
            followers: Math.floor(Math.random() * (maxFollowers - minFollowers) + minFollowers),
            engagement_rate: Math.random() * 8 + 1,
            source: 'mock',
            discovered_at: new Date().toISOString()
        };
        allDiscoveries.push(mockCreator);
    }

    if (SocialDiscovery) {
        const discovery = new SocialDiscovery({ headless: true });
        
        try {
            await discovery.init();
            
            for (const hashtag of searchHashtags) {
                console.log(`\n   Mining: ${hashtag}...`);
                
                try {
                    let results = [];
                    if (platform === 'tiktok') {
                        // Use specialized TikTok Search script
                        const tiktokSearch = require('./tiktok-creator-search.js');
                        results = await tiktokSearch.searchTikTokByHashtag(hashtag, { 
                            maxResults: 20
                        });
                    } else if (platform === 'instagram') {
                        // Fallback to SocialDiscovery (needs valid URL normally, but here we try tag URL)
                        const tagUrl = `https://www.instagram.com/explore/tags/${hashtag.replace('#', '')}/`;
                        results = await discovery.discoverInstagram(tagUrl, `tag:${hashtag}`);
                    }
                    
                    if (results && results.length > 0) {
                        const parsed = results.map(r => parseCreatorFromResult(r, `hashtag:${hashtag}`, platform));
                        const deduped = deduplicateCreators(parsed, existingHandles);
                        allDiscoveries.push(...deduped);
                        
                        // Add to existing handles for cross-hashtag dedup
                        deduped.forEach(c => existingHandles.add(c.handle.toLowerCase()));
                        
                        console.log(`   ✅ Found ${results.length}, new: ${deduped.length}`);
                    } else {
                        console.log(`   ⚠️ No results for ${hashtag}`);
                    }
                } catch (err) {
                    console.error(`   ❌ Error mining ${hashtag}:`, err.message);
                }
            }
        } finally {
            await discovery.close();
        }
    }

    // Filter by follower range
    const filtered = allDiscoveries.filter(c => 
        c.followers >= minFollowers && c.followers <= maxFollowers
    );

    // Save discoveries
    const dateStr = new Date().toISOString().split('T')[0];
    const outputFile = path.join(DISCOVERIES_DIR, `discovery-hashtag-${dateStr}.json`);
    
    const output = {
        metadata: {
            date: dateStr,
            platform,
            hashtags: searchHashtags,
            niche,
            follower_range: { min: minFollowers, max: maxFollowers },
            total_discovered: filtered.length,
            source: criteriaPath || 'direct'
        },
        creators: filtered
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    console.log(`\n🎯 Results:`);
    console.log(`   Total discovered: ${allDiscoveries.length}`);
    console.log(`   After follower filter: ${filtered.length}`);
    console.log(`   Saved to: ${outputFile}`);
    
    return output;
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

    const options = {
        hashtags: params.hashtags ? params.hashtags.split(',') : [],
        platform: params.platform || 'tiktok',
        minFollowers: parseInt(params['min-followers']) || 1000,
        maxFollowers: parseInt(params['max-followers']) || 50000,
        niche: params.niche || null,
        criteriaPath: params.criteria || null,
        dryRun: params['dry-run'] === true
    };

    huntCreators(options).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { huntCreators };
