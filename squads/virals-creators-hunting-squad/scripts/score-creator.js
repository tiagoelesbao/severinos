/**
 * score-creator.js — Motor de Scoring Proprietário
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-analyst (Gil)
 * 
 * Applies Creator Score (7 dimensions, scale 1-10) from scoring-weights.yaml
 * 
 * Usage:
 *   node score-creator.js --profile ./data/profiles/profile-sendyqueiroz.json
 *   node score-creator.js --batch ./data/discoveries/discovery-hashtag-2026-04-01.json
 *   node score-creator.js --test
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const SCORING_CONFIG = path.join(SQUAD_ROOT, 'config/scoring-weights.yaml');
const SCORECARDS_DIR = path.join(SQUAD_ROOT, 'data/scorecards');

// Ensure output dir
if (!fs.existsSync(SCORECARDS_DIR)) {
    fs.mkdirSync(SCORECARDS_DIR, { recursive: true });
}

/**
 * Load scoring weights configuration
 */
function loadScoringConfig() {
    const content = fs.readFileSync(SCORING_CONFIG, 'utf8');
    return yaml.load(content);
}

/**
 * Score engagement rate dimension
 */
function scoreEngagementRate(engagementRate) {
    if (engagementRate >= 8) return 10;
    if (engagementRate >= 5) return 8;
    if (engagementRate >= 3) return 6;
    if (engagementRate >= 1) return 4;
    return 2;
}

/**
 * Score posting frequency dimension
 */
function scorePostingFrequency(postsPerWeek) {
    if (postsPerWeek >= 5) return 10;
    if (postsPerWeek >= 3) return 8;
    if (postsPerWeek >= 1) return 5;
    if (postsPerWeek >= 0.5) return 3;
    return 0;
}

/**
 * Score follower count within ICP range (micro/nano preference)
 */
function scoreFollowerFit(followers, minFollowers = 1000, maxFollowers = 50000) {
    if (followers < minFollowers || followers > maxFollowers) return 2;
    // Sweet spot: 5K-20K for micro-creators
    if (followers >= 5000 && followers <= 20000) return 10;
    if (followers >= 2000 && followers <= 30000) return 8;
    return 6;
}

/**
 * Estimate content authenticity from ratio of branded posts
 */
function scoreContentAuthenticity(brandedPostRatio) {
    if (brandedPostRatio <= 0.1) return 10;    // 90%+ orgânico
    if (brandedPostRatio <= 0.3) return 8;     // 70%+ orgânico
    if (brandedPostRatio <= 0.5) return 6;     // mix
    if (brandedPostRatio <= 0.7) return 4;     // maioria branded
    return 2;                                    // full branded
}

/**
 * Score a single creator profile
 */
function scoreCreator(profile, icpCriteria = {}) {
    const config = loadScoringConfig();
    const dimensions = config.dimensions;
    
    // Extract metrics from profile
    const engagementRate = profile.engagement_metrics?.engagement_rate || 
                           profile.engagement_rate || 0;
    const postsPerWeek = profile.posting_frequency || 
                         estimatePostingFrequency(profile);
    const followers = profile.followers || 0;
    const brandedRatio = profile.branded_post_ratio || 0.3; // Default estimate
    const facePresence = profile.face_presence_score || 5;  // Default mid
    const nicheAlignment = profile.niche_alignment_score || 5;
    const audienceScore = profile.audience_demographics_score || 3; // Unknown default
    const growthTrend = profile.growth_trend_score || 5;
    
    // Calculate each dimension
    const scores = {
        engagement_rate: {
            raw_value: engagementRate,
            score: scoreEngagementRate(engagementRate),
            weight: dimensions.engagement_rate.weight
        },
        content_authenticity: {
            raw_value: `${Math.round((1 - brandedRatio) * 100)}% orgânico`,
            score: scoreContentAuthenticity(brandedRatio),
            weight: dimensions.content_authenticity.weight
        },
        face_presence: {
            raw_value: `${facePresence}/10`,
            score: facePresence,
            weight: dimensions.face_presence.weight
        },
        niche_alignment: {
            raw_value: `${nicheAlignment}/10`,
            score: nicheAlignment,
            weight: dimensions.niche_alignment.weight
        },
        posting_frequency: {
            raw_value: `${postsPerWeek}x/semana`,
            score: scorePostingFrequency(postsPerWeek),
            weight: dimensions.posting_frequency.weight
        },
        audience_demographics: {
            raw_value: `${audienceScore}/10`,
            score: audienceScore,
            weight: dimensions.audience_demographics.weight
        },
        growth_trend: {
            raw_value: `${growthTrend}/10`,
            score: growthTrend,
            weight: dimensions.growth_trend.weight
        }
    };
    
    // Calculate weighted total
    let totalScore = 0;
    for (const [key, dim] of Object.entries(scores)) {
        dim.weighted = Math.round(dim.score * dim.weight * 100) / 100;
        totalScore += dim.weighted;
    }
    totalScore = Math.round(totalScore * 100) / 100;
    
    // Determine tier
    let tier, tierLabel, action;
    if (totalScore >= 9) {
        tier = 'gold';
        tierLabel = 'Creator Premium';
        action = 'Abordagem prioritária — indicar para Growth';
    } else if (totalScore >= 7) {
        tier = 'silver';
        tierLabel = 'Creator Qualificada';
        action = 'Abordagem padrão — Viral Starter';
    } else if (totalScore >= 5) {
        tier = 'bronze';
        tierLabel = 'Creator Potencial';
        action = 'Monitorar — reavaliar em 30 dias';
    } else {
        tier = 'rejected';
        tierLabel = 'Não Qualificada';
        action = 'Descarte — não abordar';
    }
    
    return {
        handle: profile.handle,
        platform: profile.platform,
        scored_at: new Date().toISOString(),
        score_final: totalScore,
        tier,
        tier_label: tierLabel,
        action,
        qualified: totalScore >= 7,
        dimensions: scores,
        profile_summary: {
            followers: profile.followers,
            engagement_rate: engagementRate,
            niche: profile.niche || icpCriteria.niche || 'unknown'
        }
    };
}

/**
 * Estimate posting frequency from profile data
 */
function estimatePostingFrequency(profile) {
    if (profile.recent_posts && profile.recent_posts.length > 0) {
        // Estimate based on date range of recent posts
        const posts = profile.recent_posts;
        if (posts.length >= 2) {
            const latest = new Date(posts[0].date || Date.now());
            const oldest = new Date(posts[posts.length - 1].date || Date.now());
            const daySpan = Math.max(1, (latest - oldest) / (1000 * 60 * 60 * 24));
            return Math.round((posts.length / daySpan) * 7 * 10) / 10;
        }
    }
    return 3; // Default: 3x/week
}

/**
 * Score a batch of creators
 */
function scoreBatch(creators, icpCriteria = {}) {
    const results = {
        metadata: {
            scored_at: new Date().toISOString(),
            total: creators.length,
            qualified: 0,
            monitor: 0,
            rejected: 0
        },
        scorecards: []
    };
    
    for (const creator of creators) {
        const scorecard = scoreCreator(creator, icpCriteria);
        results.scorecards.push(scorecard);
        
        if (scorecard.tier === 'gold' || scorecard.tier === 'silver') {
            results.metadata.qualified++;
        } else if (scorecard.tier === 'bronze') {
            results.metadata.monitor++;
        } else {
            results.metadata.rejected++;
        }
    }
    
    // Sort by score descending
    results.scorecards.sort((a, b) => b.score_final - a.score_final);
    
    return results;
}

/**
 * Generate test data for scoring validation
 */
function runTest() {
    console.log('📊 Score Creator — Test Mode');
    console.log('   Testing with reference creators from POP...\n');
    
    const testCreators = [
        {
            handle: '@sendyqueiroz',
            platform: 'instagram',
            followers: 15000,
            engagement_rate: 6.5,
            branded_post_ratio: 0.15,
            face_presence_score: 9,
            niche_alignment_score: 9,
            posting_frequency: 5,
            audience_demographics_score: 7,
            growth_trend_score: 7,
            niche: 'fitness'
        },
        {
            handle: '@thai.neri',
            platform: 'instagram',
            followers: 8000,
            engagement_rate: 8.2,
            branded_post_ratio: 0.1,
            face_presence_score: 10,
            niche_alignment_score: 8,
            posting_frequency: 4,
            audience_demographics_score: 8,
            growth_trend_score: 8,
            niche: 'fitness'
        },
        {
            handle: '@fake_creator_test',
            platform: 'tiktok',
            followers: 100000,
            engagement_rate: 0.5,
            branded_post_ratio: 0.8,
            face_presence_score: 2,
            niche_alignment_score: 3,
            posting_frequency: 0.5,
            audience_demographics_score: 2,
            growth_trend_score: 2,
            niche: 'general'
        }
    ];
    
    const results = scoreBatch(testCreators);
    
    for (const sc of results.scorecards) {
        const emoji = sc.qualified ? '✅' : '❌';
        console.log(`${emoji} ${sc.handle}: ${sc.score_final}/10 — ${sc.tier_label} (${sc.tier})`);
        console.log(`   Action: ${sc.action}`);
        
        for (const [key, dim] of Object.entries(sc.dimensions)) {
            console.log(`   ${key}: ${dim.score}/10 × ${dim.weight} = ${dim.weighted}`);
        }
        console.log('');
    }
    
    console.log(`📊 Summary: ${results.metadata.qualified} qualified, ${results.metadata.monitor} monitor, ${results.metadata.rejected} rejected`);
    
    // Validate expectations
    const sendy = results.scorecards.find(s => s.handle === '@sendyqueiroz');
    const fake = results.scorecards.find(s => s.handle === '@fake_creator_test');
    
    if (sendy && sendy.qualified) {
        console.log('\n✅ PASS: @sendyqueiroz correctly qualified (reference creator)');
    } else {
        console.log('\n❌ FAIL: @sendyqueiroz should be qualified');
    }
    
    if (fake && !fake.qualified) {
        console.log('✅ PASS: @fake_creator_test correctly rejected');
    } else {
        console.log('❌ FAIL: @fake_creator_test should be rejected');
    }
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

    if (params.test) {
        runTest();
    } else if (params.profile) {
        const profile = JSON.parse(fs.readFileSync(params.profile, 'utf8'));
        const scorecard = scoreCreator(profile);
        console.log(JSON.stringify(scorecard, null, 2));
        
        // Save scorecard
        const outputFile = path.join(SCORECARDS_DIR, `scorecard-${profile.handle.replace('@', '')}-${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(scorecard, null, 2));
        console.log(`Saved to: ${outputFile}`);
    } else if (params.batch) {
        const data = JSON.parse(fs.readFileSync(params.batch, 'utf8'));
        const creators = data.creators || data;
        const results = scoreBatch(creators);
        
        const outputFile = path.join(SCORECARDS_DIR, `batch-scores-${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`Scored ${results.metadata.total} creators. Saved to: ${outputFile}`);
        console.log(`Qualified: ${results.metadata.qualified} | Monitor: ${results.metadata.monitor} | Rejected: ${results.metadata.rejected}`);
    } else {
        console.log('Usage:');
        console.log('  node score-creator.js --test');
        console.log('  node score-creator.js --profile ./data/profiles/profile-handle.json');
        console.log('  node score-creator.js --batch ./data/discoveries/discovery-file.json');
    }
}

module.exports = { scoreCreator, scoreBatch };
