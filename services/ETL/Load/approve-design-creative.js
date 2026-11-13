#!/usr/bin/env node
/**
 * Approve Design Creative — fecha o ciclo de "Em Aprovação" em Processo de
 * Design e Criação, avançando criativos pra Agendamento, Publicações &
 * Disparos.
 *
 * Confirmado via screenshot 2026-08-18 (automações reais da list): o
 * gatilho "status -> criação finalizada" tem 2 automações concorrentes no
 * campo "Gestor de Tráfego" (users), MESMO padrão de
 * [[feedback_clickup_automation_hidden_branching]]:
 *   Automation #1 — SE "Gestor de Tráfego" NÃO ESTÁ CONFIGURADO → move pra
 *     Agendamento, Publicações & Disparos, status "para agendar" (o caminho
 *     usado hoje, sem tráfego pago ativo).
 *   Automation #2 — SE "Gestor de Tráfego" É IGUAL A alguém → PULA
 *     agendamento e vai pra uma lista privada de teste de tráfego pago.
 * Diferente de approve-copywriting.js/approve-planning.js, aqui o campo
 * gatilho é DELIBERADAMENTE deixado vazio — ver GESTOR_TRAFEGO_FIELD_ID em
 * _clickup_config.js. `apply` não seta esse campo.
 *
 * `apply` TAMBÉM sobe o pack mais recente de outputs/ (ver
 * findLatestRenderAnyKind em sync-creatives.js, que já lida com slide
 * trocado por vídeo e nomes fora do padrão slide_NN) pro campo attachment
 * "Pack de Criativos Aprovados" — populado só neste momento, não a cada
 * resync, porque o campo representa o que foi APROVADO, não o rascunho mais
 * recente (decisão do founder 2026-08-18). Se não achar pack, NÃO bloqueia
 * a aprovação — avisa e segue (o founder pode rodar o resync manualmente
 * depois).
 *
 * Uso:
 *   node approve-design-creative.js list <client>
 *   node approve-design-creative.js apply <client> --approve=subtaskId1,subtaskId2,...
 */

const client = require('../../clickup/client');
const {
    DESIGN_CRIACAO_LIST, COPY_FIELD_ID, CAPTION_FIELD_ID,
    EMPRESA_FIELD_ID, EMPRESA_OPTION, TASK_TYPE_NAMES, PACK_CRIATIVOS_APROVADOS_FIELD_ID,
} = require('./_clickup_config');
const { syncApprovedPackField } = require('./sync-creatives');

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
 * Ver [[reference_clickup_field_space_scoped]]. */
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

/** Criativos "em aprovação" em Processo de Design e Criação — já chegam
 * DETACHED de Lote (approve-planning.js já fez essa separação lá atrás). */
async function listPending(clientSlug) {
    const all = await fetchAllTasks(DESIGN_CRIACAO_LIST);
    const pending = all.filter((t) => t.status.status === 'em aprovação' && belongsToClient(t, clientSlug));
    return pending.map((t) => ({
        subtaskId: t.id,
        name: t.name,
        typeName: TASK_TYPE_NAMES[t.custom_item_id] || `tipo ${t.custom_item_id}`,
        copyUrl: fieldValueOf(t, COPY_FIELD_ID),
        caption: fieldValueOf(t, CAPTION_FIELD_ID),
    }));
}

/** Sobe o pack aprovado (campo attachment) e SÓ DEPOIS muda status pra
 * "criação finalizada" — NÃO seta "Gestor de Tráfego" de propósito
 * (Automation #1, não #2 — ver header). Falha ao achar o pack não bloqueia
 * a migração de status, só avisa. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyApprovals(clientSlug, approveIds) {
    for (const id of approveIds) {
        const pack = await syncApprovedPackField(clientSlug, id, PACK_CRIATIVOS_APROVADOS_FIELD_ID);
        if (pack.ok) console.log(`  📎 ${id} -> ${pack.count} arquivo(s) no Pack de Criativos Aprovados`);
        else console.log(`  ⚠ ${id} -> pack não sincronizado (${pack.reason}) — aprovando mesmo assim`);

        await client.put(`/task/${id}`, { status: 'criação finalizada' });
        console.log(`  ✅ ${id} -> "criação finalizada" (migra pra Agendamento, Publicações & Disparos)`);
        await sleep(500);
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
                console.error('Uso: node approve-design-creative.js apply <client> --approve=subtaskId1,subtaskId2,...');
                process.exit(1);
            }
            console.log(`\n=== Aprovando ${ids.length} criativo(s) pra Agendamento, Publicações & Disparos ===\n`);
            await applyApprovals(clientSlug, ids);
        } else {
            console.error('Uso: node approve-design-creative.js list <client>');
            console.error('     node approve-design-creative.js apply <client> --approve=subtaskId1,subtaskId2,...');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { listPending, applyApprovals };
