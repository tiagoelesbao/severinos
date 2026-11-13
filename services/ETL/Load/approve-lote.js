#!/usr/bin/env node
/**
 * Approve Lote — fecha o ciclo de "Em Aprovação" em Máquina de Idéias.
 *
 * Não tem UI própria de checkbox — a lista de pendentes é lida por este
 * script (`list`) e apresentada pelo agente via AskUserQuestion (multiSelect)
 * dentro do Claude Code, que já roda no terminal do founder. A decisão volta
 * pra cá via `apply`.
 *
 * IMPORTANTE (corrigido 2026-08-17, feedback do founder após o Lote 03 migrar
 * "achatado" — subtasks viraram tasks soltas em Planejamento & Cronogramas,
 * perdendo o vínculo com o Lote): a aprovação move SÓ O LOTE (parent) pra
 * "ideação finalizada" — NUNCA as subtasks individualmente. Mover cada
 * subtask dispara a automação de migração do ClickUp EM CADA UMA
 * separadamente, o que desfaz o parent/child. Movendo só o parent, as
 * subtasks aprovadas (que não tiveram status tocado) migram JUNTO, ainda
 * como subtasks do Lote — a separação delas (virarem itens independentes)
 * só acontece na PRÓXIMA etapa (handoff Planejamento → Processo de
 * Copywriting), fora do escopo deste script.
 *
 * `list`  — GET: lista Lotes com subtasks pendentes ("em aprovação") de um
 *           cliente, agrupado por Lote, com contexto (tipo, link do pack).
 * `apply` — WRITE: move o Lote (--lote) pra "ideação finalizada". Criativos
 *           listados em --reject vão pra "descartado" ANTES (status sem
 *           automação de migração — ficam presos em Máquina de Idéias,
 *           não seguem o Lote). Os demais (aprovados/pendentes) não são
 *           tocados — migram junto do Lote como estão.
 *
 * Uso:
 *   node approve-lote.js list <client>
 *   node approve-lote.js apply <client> --lote=loteTaskId [--reject=subtaskId1,subtaskId2,...]
 */

const client = require('../../clickup/client');
const { MAQUINA_DE_IDEIAS_LIST, PACK_FIELD_ID, EMPRESA_FIELD_ID, EMPRESA_OPTION, TASK_TYPE_NAMES } = require('./_clickup_config');

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

/** Campo drop_down: GRAVA por UUID da opção, mas DEVOLVE o orderindex (int) —
 * não o UUID (gotcha real, confirmado 2026-08-17 lendo o campo "Empresa" de
 * volta). Resolve via type_config.options do próprio field, não hardcoded. */
function belongsToClient(task, clientSlug) {
    if (!clientSlug) return true;
    const empresaOptionId = EMPRESA_OPTION[clientSlug];
    if (!empresaOptionId) return true; // cliente sem opção mapeada — não filtra, melhor mostrar de mais que esconder
    const field = (task.custom_fields || []).find((cf) => cf.id === EMPRESA_FIELD_ID);
    if (!field || field.value == null) return false;
    const options = (field.type_config && field.type_config.options) || [];
    const selected = options.find((o) => o.orderindex === field.value);
    return !!selected && selected.id === empresaOptionId;
}

/** Lotes (sem parent) com pelo menos 1 subtask "em aprovação", cada um com a
 * lista de subtasks pendentes daquele Lote especificamente. Filtra por
 * cliente via o custom field "Empresa" quando clientSlug é passado. */
async function listPending(clientSlug) {
    const all = await fetchAllTasks(MAQUINA_DE_IDEIAS_LIST);
    const lotes = all.filter((t) => !t.parent && /^Lote(\s+de\s+Conteúdos)?\s+L?\d+/i.test(t.name) && belongsToClient(t, clientSlug));

    const result = [];
    for (const lote of lotes) {
        const subtasks = all.filter((t) => t.parent === lote.id);
        const pending = subtasks.filter((t) => t.status.status === 'em aprovação');
        if (pending.length === 0) continue;
        result.push({
            loteId: lote.id,
            loteName: lote.name,
            loteStatus: lote.status.status,
            totalSubtasks: subtasks.length,
            pending: pending.map((t) => ({
                subtaskId: t.id,
                name: t.name,
                typeName: TASK_TYPE_NAMES[t.custom_item_id] || `tipo ${t.custom_item_id}`,
                packUrl: fieldValueOf(t, PACK_FIELD_ID),
            })),
        });
    }
    return result;
}

/** Move SÓ o Lote pra "ideação finalizada" — as subtasks aprovadas migram
 * junto (sem terem o status tocado). rejectIds vão pra "descartado" ANTES,
 * pra ficarem de fora da migração. */
async function applyApprovals(loteId, rejectIds = []) {
    for (const id of rejectIds) {
        await client.put(`/task/${id}`, { status: 'descartado' });
        console.log(`  🗑️  ${id} -> "descartado" (excluído do lote antes da migração)`);
    }

    await client.put(`/task/${loteId}`, { status: 'ideação finalizada' });
    console.log(`  🏁 Lote ${loteId} -> "ideação finalizada" (subtasks aprovadas migram juntas, ainda como subtasks do Lote)`);

    return { loteId, rejected: rejectIds };
}

if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
    const [, , cmd, clientSlug, ...rest] = process.argv;

    (async () => {
        if (cmd === 'list') {
            const pending = await listPending(clientSlug);
            console.log(JSON.stringify(pending, null, 2));
        } else if (cmd === 'apply') {
            const loteArg = rest.find((a) => a.startsWith('--lote='));
            const rejectArg = rest.find((a) => a.startsWith('--reject='));
            const loteId = loteArg ? loteArg.replace('--lote=', '') : null;
            const rejectIds = rejectArg ? rejectArg.replace('--reject=', '').split(',').filter(Boolean) : [];
            if (!loteId) {
                console.error('Uso: node approve-lote.js apply <client> --lote=loteTaskId [--reject=subtaskId1,subtaskId2,...]');
                process.exit(1);
            }
            console.log(`\n=== Aprovando Lote ${loteId}${rejectIds.length ? ` (${rejectIds.length} rejeitado(s))` : ''} ===\n`);
            await applyApprovals(loteId, rejectIds);
        } else {
            console.error('Uso: node approve-lote.js list <client>');
            console.error('     node approve-lote.js apply <client> --lote=loteTaskId [--reject=subtaskId1,subtaskId2,...]');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { listPending, applyApprovals };
