#!/usr/bin/env node
/**
 * Approve Copywriting — fecha o ciclo de "Em Aprovação" em Processo de
 * Copywriting, avançando criativos pra Processo de Design e Criação.
 *
 * MESMO padrão de gotcha do approve-planning.js (ver
 * [[feedback_clickup_automation_hidden_branching]]): a list tem 2 automações
 * concorrentes no gatilho "status -> copy finalizada":
 *   Automation #1 — SE custom field "Designer" É IGUAL A alguém → move pra
 *     Processo de Design e Criação, status "para fazer" (o caminho CERTO).
 *   Automation #2 — SE "Designer" NÃO ESTÁ CONFIGURADO → PULA design e move
 *     direto pra Agendamento, Publicações & Disparos, status "para agendar".
 * `apply` seta "Designer" = founder ANTES de mudar o status, pelo mesmo
 * motivo do approve-planning.js: sem isso o criativo passa batido pela etapa
 * de design inteira, sem erro nenhum aparente.
 *
 * Aqui os criativos já chegam DETACHED de qualquer Lote (approve-planning.js
 * já fez essa separação) — não tem rollup de Lote pra fazer nesta etapa.
 *
 * Uso:
 *   node approve-copywriting.js list <client>
 *   node approve-copywriting.js apply <client> --approve=subtaskId1,subtaskId2,...
 */

const client = require('../../clickup/client');
const {
    COPYWRITING_LIST, COPY_FIELD_ID, PLANO_MODELAGEM_FIELD_ID,
    EMPRESA_FIELD_ID, EMPRESA_OPTION, TASK_TYPE_NAMES, DESIGNER_FIELD_ID, FOUNDER_USER_ID,
} = require('./_clickup_config');

async function fetchAllTasks(listId) {
    let page = 0, tasks = [];
    while (true) {
        const res = await client.get(`/list/${listId}/task`, {
            params: { include_closed: true, subtasks: true, page },
        });
        tasks = tasks.concat(res.data.tasks);
        if (res.data.last_page || res.data.tasks.length === 0) break;
        page++;
    }
    return tasks;
}

function fieldValueOf(task, fieldId) {
    const f = (task.custom_fields || []).find((cf) => cf.id === fieldId);
    return f && f.value != null ? f.value : null;
}

/** Campo drop_down: GRAVA por UUID da opção, mas DEVOLVE o orderindex (int).
 * Ver [[reference_clickup_field_space_scoped]] / gotcha confirmado 2026-08-17. */
function belongsToClient(task, clientSlug) {
    if (!clientSlug) return true;
    const empresaOptionId = EMPRESA_OPTION[clientSlug];
    if (!empresaOptionId) return true;
    const field = (task.custom_fields || []).find((cf) => cf.id === EMPRESA_FIELD_ID);
    if (!field || field.value == null) return false;
    const options = (field.type_config && field.type_config.options) || [];
    const selected = options.find((o) => o.orderindex === field.value);
    return !!selected && selected.id === empresaOptionId;
}

/** Criativos "em aprovação" em Processo de Copywriting — já são todos
 * top-level aqui (sem Lote), então a lista é plana, não agrupada. */
async function listPending(clientSlug) {
    const all = await fetchAllTasks(COPYWRITING_LIST);
    const pending = all.filter((t) => t.status.status === 'em aprovação' && belongsToClient(t, clientSlug));
    return pending.map((t) => ({
        subtaskId: t.id,
        name: t.name,
        typeName: TASK_TYPE_NAMES[t.custom_item_id] || `tipo ${t.custom_item_id}`,
        planoUrl: fieldValueOf(t, PLANO_MODELAGEM_FIELD_ID),
        copyUrl: fieldValueOf(t, COPY_FIELD_ID),
    }));
}

/** Seta "Designer" = founder (gatilho da Automation #1, não #2) e move cada
 * id aprovado pra "copy finalizada". */
async function applyApprovals(approveIds) {
    for (const id of approveIds) {
        await client.post(`/task/${id}/field/${DESIGNER_FIELD_ID}`, { value: { add: [FOUNDER_USER_ID], rem: [] } });
        await client.put(`/task/${id}`, { status: 'copy finalizada' });
        console.log(`  ✅ ${id} -> Designer setado + "copy finalizada" (migra pra Processo de Design e Criação)`);
    }
    return approveIds;
}

if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
    const [, , cmd, clientSlug, ...rest] = process.argv;

    (async () => {
        if (cmd === 'list') {
            const pending = await listPending(clientSlug);
            console.log(JSON.stringify(pending, null, 2));
        } else if (cmd === 'apply') {
            const approveArg = rest.find((a) => a.startsWith('--approve='));
            const ids = approveArg ? approveArg.replace('--approve=', '').split(',').filter(Boolean) : [];
            if (ids.length === 0) {
                console.error('Uso: node approve-copywriting.js apply <client> --approve=subtaskId1,subtaskId2,...');
                process.exit(1);
            }
            console.log(`\n=== Aprovando ${ids.length} criativo(s) pra Design e Criação ===\n`);
            await applyApprovals(ids);
        } else {
            console.error('Uso: node approve-copywriting.js list <client>');
            console.error('     node approve-copywriting.js apply <client> --approve=subtaskId1,subtaskId2,...');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { listPending, applyApprovals };
