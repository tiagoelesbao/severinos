/**
 * Sutherland Milestone Creator v3.0
 *
 * Cria a hierarquia Epic -> Story (Setup/Execução/QA & Entrega) -> Checklist
 * no ClickUp a partir de dados de marcos versionados no repositório
 * (data/project-milestones.js), não mais de um Google Doc externo.
 *
 * v2.0 (legado) parseava um "Termo de Abertura" no Google Docs, hardcoded
 * pra Virals (DOC_ID/FOLDER_ID/MAPPING fixos). Generalizado em 2026-08-16
 * pra suportar múltiplas empresas (Virals + Oraclum) e ser idempotente
 * (não duplica epic/story já existente com o mesmo nome).
 *
 * Uso:
 *   node create_milestones.js virals [--dry-run]
 *   node create_milestones.js oraclum [--dry-run]
 */

const { tasks, client } = require('../../../services/clickup/index');
const { VIRALS_MILESTONES, ORACLUM_MILESTONES } = require('../data/project-milestones');

const COMPANIES = { virals: VIRALS_MILESTONES, oraclum: ORACLUM_MILESTONES };

let _taskCache = {};
async function findExistingTask(listId, name, parent) {
    // getTasks() por padrão NÃO retorna subtasks — precisa do param explícito
    // e paginação (a API v2 pagina em blocos de 100). Cacheado por list.
    if (!_taskCache[listId]) {
        let page = 0, all = [];
        while (true) {
            const res = await client.get(`/list/${listId}/task`, {
                params: { include_closed: true, subtasks: true, page }
            });
            all = all.concat(res.data.tasks);
            if (res.data.last_page || res.data.tasks.length === 0) break;
            page++;
        }
        _taskCache[listId] = all;
    }
    return _taskCache[listId].find(t => t.name === name && (t.parent || null) === (parent || null));
}

async function run(companyKey, dryRun = false) {
    const config = COMPANIES[companyKey];
    if (!config) {
        console.error(`❌ Empresa desconhecida: "${companyKey}". Use "virals" ou "oraclum".`);
        process.exitCode = 1;
        return;
    }

    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  SUTHERLAND MILESTONE CREATOR v3.0            ║');
    console.log(`║  Empresa: ${config.company.padEnd(35)}║`);
    if (dryRun) console.log('║  (DRY RUN - No ClickUp tasks created)         ║');
    console.log('╚══════════════════════════════════════════════╝');

    let created = 0, skipped = 0;

    for (const phase of config.phases) {
        const listId = config.listMapping[phase.name] || config.listMapping['Fase 2'];
        console.log(`\n  📂 [${phase.name}] -> List: ${listId}`);

        for (const milestone of phase.milestones) {
            const epicName = `[${milestone.dept}] Marco: ${milestone.name}`;
            console.log(`    💎 Marco (Epic): [${milestone.dept}] ${milestone.name}`);

            const description = `**Responsável:** ${milestone.owner}\n**Outcome:** ${milestone.kpi}\n\n**Origem:** Planejamento Estratégico ${config.company === 'virals' ? 'Virals' : 'Oraclum'} (Doc nativo ClickUp)\n**Project ID:** ${config.projectTaskId}`;

            if (dryRun) {
                console.log(`      ✓ [DRY RUN] Epic + ${milestone.stories?.length || 3} Stories para "${milestone.name}"`);
                continue;
            }

            let epicId;
            const existingEpic = await findExistingTask(listId, epicName, null);
            if (existingEpic) {
                console.log(`      ↻ Epic já existe (${existingEpic.id}) — pulando criação, mantendo`);
                epicId = existingEpic.id;
                skipped++;
            } else {
                const res = await client.post(`/list/${listId}/task`, {
                    name: epicName, description, status: 'backlog'
                });
                epicId = res.data.id;
                console.log(`      ✓ Epic criado (${epicId})`);
                created++;
            }

            const stories = milestone.stories || [
                { name: `[Setup] ${milestone.name}` },
                { name: `[Execução] ${milestone.name}` },
                { name: `[QA & Entrega] ${milestone.name}` }
            ];

            for (const story of stories) {
                const existingStory = await findExistingTask(listId, story.name, epicId);
                if (existingStory) {
                    console.log(`      ↻ Story já existe: ${story.name}`);
                    skipped++;
                    continue;
                }
                console.log(`      📜 Story: ${story.name}`);
                const subRes = await client.post(`/list/${listId}/task`, {
                    name: story.name, parent: epicId, status: 'backlog'
                });
                created++;

                if (story.checklist && story.checklist.length > 0) {
                    const ckRes = await client.post(`/task/${subRes.data.id}/checklist`, { name: 'Acceptance Criteria' });
                    const ckId = ckRes.data.checklist.id;
                    for (const item of story.checklist) {
                        await client.post(`/checklist/${ckId}/checklist_item`, { name: item });
                    }
                }
            }
        }
    }

    console.log(`\n  RESUMO: ${created} criados, ${skipped} já existentes (pulados)`);
}

// CLI
if (require.main === module) {
    const companyKey = (process.argv[2] || '').toLowerCase();
    const dryRun = process.argv.includes('--dry-run');
    if (!companyKey || !COMPANIES[companyKey]) {
        console.error('Uso: node create_milestones.js <virals|oraclum> [--dry-run]');
        process.exit(1);
    }
    run(companyKey, dryRun);
}

module.exports = { run };
