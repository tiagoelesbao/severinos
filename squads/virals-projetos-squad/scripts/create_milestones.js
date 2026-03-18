/**
 * Sutherland Milestone Creator v2.0
 * 
 * 1. Read Google Doc
 * 2. Parse Section 7 (Fases e Marcos)
 * 3. Create Tasks/Milestones in ClickUp (Virals Starter & Growth folder)
 */

const { ensureAuthenticated, docs } = require('../../../services/google-drive/client');
const { tasks, client } = require('../../../services/clickup/index');

const CONFIG = {
    DOC_ID: '1i5gHeoSe-UVU995lPccR6yDHHbBCIsndyg7pOWwEBUo', // Extract from CF later
    FOLDER_ID: '901316668857', // Virals Starter & Growth (Correct Folder)
    MAPPING: {
        'Fase 1': '901324798948', // Planejamento & Preparação
        'Fase 2': '901324798949', // Execução & Monitoramento
        'Fase 3': '901324798947'  // Finalização & Encerramento
    }
};

async function run(taskId, dryRun = false) {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  SUTHERLAND MILESTONE CREATOR v2.0           ║');
    if (dryRun) console.log('║  (DRY RUN - No ClickUp tasks created)        ║');
    console.log('╚══════════════════════════════════════════════╝');

    try {
        await ensureAuthenticated();

        // 1. Get Doc
        console.log(`\n═══ 1. READING GOOGLE DOC ═══`);
        const doc = await docs.documents.get({ documentId: CONFIG.DOC_ID });
        console.log(`  ✓ Doc: ${doc.data.title}`);

        // 2. Parse Tables
        console.log(`\n═══ 2. PARSING MILESTONES ═══`);
        const projectStages = parseTables(doc.data.body.content);
        console.log(`  ✓ Found ${projectStages.length} phases with milestones`);

        // 3. Create ClickUp Tasks
        console.log(`\n═══ 3. CREATING CLICKUP MILESTONES ═══`);
        for (const stage of projectStages) {
            const listId = CONFIG.MAPPING[stage.phase];
            if (!listId) {
                console.warn(`  ⚠️ No mapping for ${stage.phase}, skipping.`);
                continue;
            }

            console.log(`\n  📂 [${stage.phase}] -> List: ${listId}`);
            for (const milestone of stage.milestones) {
                console.log(`    🔨 Criando: [${milestone.dept}] ${milestone.name}`);
                
                const taskData = {
                    name: `[${milestone.dept}] Marco: ${milestone.name}`,
                    description: `**Responsável:** ${milestone.owner}\n**KPI de Sucesso:** ${milestone.kpi}\n\n**Origem:** [Termo de Abertura](https://docs.google.com/document/d/${doc.data.documentId}/edit)\n**Task Pai:** ${taskId}`,
                    assignees: [], // Dynamic selection later
                    status: 'BACKLOG',
                    priority: 3,
                    tags: ['milestone', milestone.dept.toLowerCase()],
                    // parent: taskId // Sutherland v2.0 doesn't strictly need subtasks if moved to other lists
                };

                if (!dryRun) {
                    await client.post(`/list/${listId}/task`, taskData);
                    console.log(`      ✓ Criado.`);
                } else {
                    console.log(`      ✓ [DRY RUN] Task ready for ${listId}`);
                }
            }
        }

        console.log('\n╔══════════════════════════════════════════════╗');
        console.log('║  ✅ MARCOS CRIADOS COM SUCESSO               ║');
        console.log('╚══════════════════════════════════════════════╝');

    } catch (e) {
        console.error(`\n❌ FATAL: ${e.message}`);
        console.error(e.stack);
    }
}

function parseTables(content) {
    const stages = [];
    let currentPhase = null;

    for (const el of content) {
        // Detect Phase Header (Heading 2)
        if (el.paragraph && el.paragraph.paragraphStyle && el.paragraph.paragraphStyle.namedStyleType === 'HEADING_2') {
            const text = el.paragraph.elements.map(e => e.textRun?.content || '').join('').trim();
            if (text.includes('Fase 1')) currentPhase = 'Fase 1';
            else if (text.includes('Fase 2')) currentPhase = 'Fase 2';
            else if (text.includes('Fase 3')) currentPhase = 'Fase 3';
        }

        // Parse Table if under a Phase
        if (el.table && currentPhase) {
            const milestones = [];
            const rows = el.table.tableRows;
            
            // Skip Header (rows[0])
            for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].tableCells;
                const mData = {
                    name: getCellText(cells[0]),
                    dept: getCellText(cells[1]),
                    owner: getCellText(cells[2]),
                    kpi: getCellText(cells[3])
                };
                if (mData.name) milestones.push(mData);
            }

            if (milestones.length > 0) {
                stages.push({ phase: currentPhase, milestones });
                currentPhase = null; // Reset for next table
            }
        }
    }
    return stages;
}

function getCellText(cell) {
    if (!cell.content) return '';
    return cell.content.map(c => {
        if (!c.paragraph) return '';
        return c.paragraph.elements.map(e => e.textRun?.content || '').join('');
    }).join('').trim();
}

// CLI
if (require.main === module) {
    const taskId = process.argv[2] || '86ag692nm';
    const dryRun = process.argv.includes('--dry-run');
    run(taskId, dryRun);
}

module.exports = { run };
