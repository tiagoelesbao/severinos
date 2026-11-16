/**
 * clickup-pipeline-sync.js — ClickUp CRM Sync
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-manager (Jason)
 * 
 * Syncs pipeline data with ClickUp (Prospecção + CRM Hunter lists).
 * Uses: services/clickup/client.js + tasks.js
 * 
 * Usage:
 *   node clickup-pipeline-sync.js --push-prospects ./data/scorecards/batch-scores.json
 *   node clickup-pipeline-sync.js --pull-pipeline
 *   node clickup-pipeline-sync.js --dry-run
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.join(__dirname, '..');
const CLICKUP_IDS_PATH = path.join(SQUAD_ROOT, 'config/clickup-ids.yaml');

// ClickUp service
const CLICKUP_SERVICE = path.join(__dirname, '../../../services/clickup');

let clickupTasks, clickupClient;
try {
    clickupTasks = require(path.join(CLICKUP_SERVICE, 'tasks'));
    clickupClient = require(path.join(CLICKUP_SERVICE, 'client'));
} catch (err) {
    console.warn('⚠️ ClickUp service not available:', err.message);
}

function loadClickUpIds() {
    return yaml.load(fs.readFileSync(CLICKUP_IDS_PATH, 'utf8'));
}

/**
 * Push scored prospects to ClickUp Prospecção list
 */
async function pushProspects(scorecardsPath, dryRun = false) {
    const config = loadClickUpIds();
    const listId = config.clickup.prospection.list.id;
    const data = JSON.parse(fs.readFileSync(scorecardsPath, 'utf8'));
    const scorecards = data.scorecards || data;
    
    console.log(`📤 Pushing ${scorecards.length} prospects to ClickUp (List: ${listId})...`);
    
    if (dryRun) {
        console.log('   DRY RUN — no changes made');
        scorecards.forEach(sc => {
            console.log(`   Would create: "${sc.handle}" — Score: ${sc.score_final} (${sc.tier})`);
        });
        return;
    }
    
    if (!clickupTasks) {
        console.error('❌ ClickUp service not available. Run from project root.');
        return;
    }
    
    let created = 0, skipped = 0;
    
    for (const sc of scorecards) {
        try {
            const taskName = `${sc.handle} — ${sc.tier_label} (${sc.score_final}/10)`;
            const description = [
                `**Handle:** ${sc.handle}`,
                `**Platform:** ${sc.platform}`,
                `**Score:** ${sc.score_final}/10`,
                `**Tier:** ${sc.tier_label}`,
                `**Niche:** ${sc.profile_summary?.niche || 'unknown'}`,
                `**Followers:** ${sc.profile_summary?.followers || 'N/A'}`,
                `**Engagement:** ${sc.profile_summary?.engagement_rate || 'N/A'}%`,
                `**Action:** ${sc.action}`,
                `**Scored at:** ${sc.scored_at}`
            ].join('\n');
            
            const status = sc.qualified ? 'qualified' : 'discovered';
            
            await clickupTasks.createTask(listId, taskName, description, status);
            created++;
            console.log(`   ✅ Created: ${sc.handle}`);
        } catch (err) {
            console.error(`   ❌ Failed: ${sc.handle} — ${err.message}`);
            skipped++;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`\n📊 Results: ${created} created, ${skipped} skipped`);
}

/**
 * Pull current pipeline from ClickUp
 */
async function pullPipeline() {
    const config = loadClickUpIds();
    
    if (!clickupTasks) {
        console.error('❌ ClickUp service not available');
        return;
    }
    
    console.log('📥 Pulling pipeline from ClickUp...');
    
    // Prospecção
    const prospListId = config.clickup.prospection.list.id;
    const prospResult = await clickupTasks.getTasks(prospListId);
    const prospects = prospResult.tasks || [];
    
    // CRM Hunter
    const crmListId = config.clickup.crm.list.id;
    const crmResult = await clickupTasks.getTasks(crmListId);
    const crmCreators = crmResult.tasks || [];
    
    const summary = {
        pulled_at: new Date().toISOString(),
        prospection: { list_id: prospListId, total: prospects.length, by_status: {} },
        crm: { list_id: crmListId, total: crmCreators.length, by_status: {} }
    };
    
    // Count by status
    prospects.forEach(t => {
        const s = t.status?.status || 'unknown';
        summary.prospection.by_status[s] = (summary.prospection.by_status[s] || 0) + 1;
    });
    crmCreators.forEach(t => {
        const s = t.status?.status || 'unknown';
        summary.crm.by_status[s] = (summary.crm.by_status[s] || 0) + 1;
    });
    
    console.log('\n📊 Pipeline Status:');
    console.log(`   Prospecção (${prospects.length} total):`);
    Object.entries(summary.prospection.by_status).forEach(([s, c]) => console.log(`     ${s}: ${c}`));
    console.log(`   CRM Hunter (${crmCreators.length} total):`);
    Object.entries(summary.crm.by_status).forEach(([s, c]) => console.log(`     ${s}: ${c}`));
    
    return summary;
}

// ── CLI ──────────────────────────────────────────────────
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

    (async () => {
        if (params['push-prospects']) {
            await pushProspects(params['push-prospects'], params['dry-run'] === true);
        } else if (params['pull-pipeline'] === true) {
            await pullPipeline();
        } else {
            console.log('Usage:');
            console.log('  node clickup-pipeline-sync.js --push-prospects ./path/batch-scores.json');
            console.log('  node clickup-pipeline-sync.js --pull-pipeline');
            console.log('  node clickup-pipeline-sync.js --push-prospects ./path --dry-run');
        }
    })().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { pushProspects, pullPipeline };
