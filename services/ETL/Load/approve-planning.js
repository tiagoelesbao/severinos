#!/usr/bin/env node
/**
 * Approve Planning — fecha o ciclo de "Em Aprovação" em Planejamento &
 * Cronogramas, avançando criativos pra Processo de Copywriting.
 *
 * DIFERENTE do approve-lote.js (Máquina de Idéias → Planejamento): aqui a
 * separação do Lote é INTENCIONAL — pedido explícito do founder 2026-08-17
 * ("já separando eles do lote, e indo direto para o pipeline de copywriting").
 * Cada criativo aprovado é migrado INDIVIDUALMENTE (não o Lote), então o
 * vínculo parent/child com o Lote se desfaz nessa transição — é o esperado
 * aqui, não um bug (contraste com [[feedback_lote_hierarchy_migration]], que
 * vale pra transição ANTERIOR, onde a hierarquia devia sobreviver).
 *
 * Mesma UX do approve-lote.js: `list` devolve os pendentes (agrupados por
 * Lote só pra contexto — a decisão é por criativo), o agente apresenta via
 * AskUserQuestion (TODOS os itens, em blocos de até 4 — confirmado em
 * [[feedback_approval_dialog_show_all]]), `apply` escreve no ClickUp.
 *
 * GOTCHA CRÍTICO (corrigido 2026-08-17, achado pelo founder via print das
 * automações nativas do ClickUp): a lista tem DUAS automações concorrentes
 * no gatilho "status -> planejamento finalizado":
 *   Automation #1 — SE custom field "Copywriter" É IGUAL A alguém → move pra
 *     Processo de Copywriting (o caminho CORRETO).
 *   Automation #2 — SE "Copywriter" NÃO ESTÁ CONFIGURADO → PULA copy e move
 *     direto pra Processo de Design e Criação.
 * A automação lê o campo NO MOMENTO do trigger — então `apply` seta
 * "Copywriter" = founder ANTES de mudar o status, senão o criativo passa
 * batido pela etapa de copy inteira sem avisar (só descobrimos porque
 * run-copywriting.js reencontra a task por ID, não por list, e processou
 * tudo "certo" mesmo com elas fisicamente na list errada).
 *
 * `apply` também fecha o Lote: se depois da aprovação ele não tiver mais
 * NENHUMA subtask (todas migraram), move o Lote (parent) pra "lote
 * finalizado" — pedido do founder 2026-08-17 (fazia isso manualmente).
 *
 * Uso:
 *   node approve-planning.js list <client>
 *   node approve-planning.js apply <client> --approve=subtaskId1,subtaskId2,...
 */

const client = require('../../clickup/client');
const {
    PLANEJAMENTOS_LIST, PACK_FIELD_ID, PLANO_MODELAGEM_FIELD_ID,
    EMPRESA_FIELD_ID, EMPRESA_OPTION, TASK_TYPE_NAMES,
    COPYWRITER_FIELD_ID, FOUNDER_USER_ID,
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

/** Criativos "em aprovação" em Planejamento & Cronogramas, agrupados por Lote
 * (contexto — o Lote em si NÃO é candidato aqui, só os filhos). */
async function listPending(clientSlug) {
    const all = await fetchAllTasks(PLANEJAMENTOS_LIST);
    const pending = all.filter((t) => t.status.status === 'em aprovação' && /^Lote(\s+de\s+Conteúdos)?\s+L?\d+/i.test((all.find((p) => p.id === t.parent) || {}).name || '') && belongsToClient(t, clientSlug));

    const byLote = {};
    for (const t of pending) {
        const lote = all.find((p) => p.id === t.parent);
        const key = lote ? lote.id : '(sem lote)';
        if (!byLote[key]) byLote[key] = { loteId: lote ? lote.id : null, loteName: lote ? lote.name : '(sem lote)', pending: [] };
        byLote[key].pending.push({
            subtaskId: t.id,
            name: t.name,
            typeName: TASK_TYPE_NAMES[t.custom_item_id] || `tipo ${t.custom_item_id}`,
            packUrl: fieldValueOf(t, PACK_FIELD_ID),
            planoUrl: fieldValueOf(t, PLANO_MODELAGEM_FIELD_ID),
        });
    }
    return Object.values(byLote);
}

/**
 * Move cada subtaskId aprovado INDIVIDUALMENTE pra "planejamento
 * finalizado" — a separação do Lote é intencional aqui (ver header).
 * Por criativo: seta "Copywriter" = founder ANTES do status (gatilho da
 * Automation #1, não #2 — ver header). Depois, fecha o(s) Lote(s) que
 * ficaram sem subtasks nenhuma.
 */
async function applyApprovals(approveIds) {
    // Parent de cada um ANTES de mover — depois de "planejamento finalizado"
    // a task já não tem mais parent (detach intencional), perderíamos a
    // referência do Lote pra fazer o rollup.
    const withParent = await Promise.all(approveIds.map(async (id) => {
        const t = await client.get(`/task/${id}`);
        return { id, loteId: t.data.parent };
    }));

    for (const { id } of withParent) {
        await client.post(`/task/${id}/field/${COPYWRITER_FIELD_ID}`, { value: { add: [FOUNDER_USER_ID], rem: [] } });
        await client.put(`/task/${id}`, { status: 'planejamento finalizado' });
        console.log(`  ✅ ${id} -> Copywriter setado + "planejamento finalizado" (migra pra Processo de Copywriting)`);
    }

    const affectedLoteIds = [...new Set(withParent.map((r) => r.loteId).filter(Boolean))];
    if (affectedLoteIds.length > 0) {
        const all = await fetchAllTasks(PLANEJAMENTOS_LIST);
        for (const loteId of affectedLoteIds) {
            const children = all.filter((t) => t.parent === loteId);
            if (children.length === 0) {
                await client.put(`/task/${loteId}`, { status: 'lote finalizado' });
                console.log(`  🏁 Lote ${loteId} -> "lote finalizado" (sem subtasks restantes)`);
            } else {
                console.log(`  ⏳ Lote ${loteId} ainda tem ${children.length} subtask(s) — não fechado.`);
            }
        }
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
                console.error('Uso: node approve-planning.js apply <client> --approve=subtaskId1,subtaskId2,...');
                process.exit(1);
            }
            console.log(`\n=== Aprovando ${ids.length} criativo(s) pra Copywriting ===\n`);
            await applyApprovals(ids);
        } else {
            console.error('Uso: node approve-planning.js list <client>');
            console.error('     node approve-planning.js apply <client> --approve=subtaskId1,subtaskId2,...');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { listPending, applyApprovals };
