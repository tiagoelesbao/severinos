/**
 * generate-outreach-batch.js — Outreach Script Generator
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-closer (Brittany)
 * 
 * Usage:
 *   node generate-outreach-batch.js --scorecards ./data/scorecards/batch-scores.json --client "Marca X"
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.join(__dirname, '..');
const SEQUENCES_CONFIG = path.join(SQUAD_ROOT, 'config/outreach-sequences.yaml');
const OUTREACH_DIR = path.join(SQUAD_ROOT, 'data/outreach');

if (!fs.existsSync(OUTREACH_DIR)) fs.mkdirSync(OUTREACH_DIR, { recursive: true });

function loadSequences() {
    return yaml.load(fs.readFileSync(SEQUENCES_CONFIG, 'utf8'));
}

function selectVariation(creator) {
    // Gold tier or high engagement → Escassez (urgency)
    if (creator.tier === 'gold') return 'variacao_escassez';
    // Low followers but high engagement → Ganho (opportunity)
    if (creator.profile_summary?.followers < 10000) return 'variacao_ganho';
    // Default → Social Proof
    return 'variacao_social_proof';
}

function personalizeScript(template, creator, client) {
    return template
        .replace(/{nome}/g, creator.handle.replace('@', ''))
        .replace(/{nicho}/g, creator.profile_summary?.niche || 'seu nicho')
        .replace(/{referencia_post_especifico}/g, '[PERSONALIZAR: mencionar post específico]')
        .replace(/{creator_referencia}/g, '@sendyqueiroz')
        .replace(/{qtd_creators}/g, '20')
        .replace(/{marca_parceira}/g, client || '[MARCA]')
        .replace(/{vagas_restantes}/g, '5')
        .replace(/{data_limite}/g, getDeadline())
        .replace(/{hunter_nome}/g, '[SEU NOME]');
}

function getDeadline() {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString('pt-BR');
}

function generateBatch(scorecardsPath, client) {
    const config = loadSequences();
    const data = JSON.parse(fs.readFileSync(scorecardsPath, 'utf8'));
    const scorecards = data.scorecards || data;
    const qualified = Array.isArray(scorecards) ? scorecards.filter(s => s.qualified) : [];

    console.log(`💬 Generating outreach for ${qualified.length} qualified creators...`);

    const batch = qualified.map(creator => {
        const variation = selectVariation(creator);
        const seqData = config.sequences[variation];
        const script = personalizeScript(seqData?.template || '', creator, client);
        const followups = config.sequences.follow_up;

        return {
            handle: creator.handle,
            score: creator.score_final,
            tier: creator.tier,
            variation,
            variation_name: seqData?.name || variation,
            dm_script: script,
            follow_up_d1: personalizeScript(followups?.d_plus_1?.template || '', creator, client),
            follow_up_d3: personalizeScript(followups?.d_plus_3?.template || '', creator, client),
            follow_up_d7: personalizeScript(followups?.d_plus_7?.template || '', creator, client),
            generated_at: new Date().toISOString(),
            status: 'pending_send',
            note: '⚠️ PERSONALIZAR antes de enviar — mencionar post específico!'
        };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTREACH_DIR, `outreach-batch-${dateStr}.json`);
    const output = {
        metadata: { date: dateStr, client, total: batch.length, source: scorecardsPath },
        scripts: batch
    };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`📁 Saved ${batch.length} scripts to: ${outputFile}`);
    return output;
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
    if (!params.scorecards) {
        console.log('Usage: node generate-outreach-batch.js --scorecards ./path/batch-scores.json --client "Marca"');
        process.exit(0);
    }
    generateBatch(params.scorecards, params.client || 'Virals');
}

module.exports = { generateBatch };
