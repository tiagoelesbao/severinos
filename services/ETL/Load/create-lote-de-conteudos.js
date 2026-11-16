#!/usr/bin/env node
/**
 * Create Lote de Conteúdos — Fase 1 da integração Squad de Marketing ↔ ClickUp.
 *
 * Lê os rankings do daily-monitor de um dia (coluna "Sondagem" marcada pelo
 * fundador em `[x]`), cria UM "Lote L{NN} - {data}" em Máquina de Idéias
 * (Marketing > Produção de Conteúdo) + uma subtask por criativo aprovado,
 * nomeada "{hash} · @handle · descrição" (calibração 2026-08-17: tag+data no
 * Lote, id único+descrição na subtask — "@handle · plataforma" sozinho não
 * dizia qual criativo era).
 *
 * Escopo desta etapa (deliberado, ver conversa 2026-08-17): só cria e deixa em
 * "Para Fazer" — NÃO roda benchmark, NÃO enriquece com transcrição/análise.
 * Isso é a próxima etapa do pipeline (Para Fazer → Fazendo), fora daqui.
 *
 * A descrição da subtask fica ENXUTA de propósito (link + score + gancho) —
 * não é o lugar pra dump de análise. Quando o benchmark rodar, o enriquecimento
 * entra por custom field/anexo dedicado, não por aqui (nota do fundador
 * 2026-08-17: description = changelog, não repositório de documento).
 *
 * Persiste `_lote-clickup-map-{date}.json` ao lado dos rankings — é o elo
 * entre URL (o que o benchmark conhece) e subtaskId (o que o ClickUp conhece),
 * consumido depois por sync-benchmark-to-clickup.js.
 *
 * Uso:
 *   node create-lote-de-conteudos.js <client> <date> [--dry-run]
 *   node create-lote-de-conteudos.js oraclum 2026-08-15 --dry-run
 */

const fs = require('fs');
const path = require('path');
const client = require('../../clickup/client');
const { parseCheckedRows, dedupeByUrl, inferTaskType, nextLoteNumber, buildLoteName, buildSubtaskName } = require('./lote-builder');
const { MAQUINA_DE_IDEIAS_LIST, PLANEJAMENTOS_LIST, EMPRESA_FIELD_ID, EMPRESA_OPTION } = require('./_clickup_config');

const DAILY_MONITORING_DIR = (clientSlug) =>
    path.join(__dirname, '../../../workspaces/businesses', clientSlug, 'marketing/daily-monitoring');

function readRankingFiles(clientSlug, date) {
    const dir = path.join(DAILY_MONITORING_DIR(clientSlug), date);
    const files = [`_ranking-geral-${date}.md`, `_fit-ranking-${date}.md`];
    let combined = [];
    for (const f of files) {
        const p = path.join(dir, f);
        if (!fs.existsSync(p)) { console.warn(`  ⚠ não encontrado: ${f}`); continue; }
        const md = fs.readFileSync(p, 'utf-8');
        combined = combined.concat(parseCheckedRows(md));
    }
    return dedupeByUrl(combined);
}

/** Busca tasks (com subtasks) em uma lista — paginado, igual ao padrão já usado
 * em create_milestones.js. Necessário pra numeração de Lote não colidir. */
async function fetchAllTaskNames(listId) {
    let page = 0, names = [];
    while (true) {
        const res = await client.get(`/list/${listId}/task`, {
            params: { include_closed: true, subtasks: true, page },
        });
        names = names.concat(res.data.tasks.map((t) => t.name));
        if (res.data.last_page || res.data.tasks.length === 0) break;
        page++;
    }
    return names;
}

/** Mapa url→subtask persistido ao lado dos rankings — é o que permite ao
 * sync-benchmark-to-clickup.js casar um Benchmark.json (que só tem URL) com a
 * subtask certa depois, sem precisar re-varrer nomes/descrições. */
function writeClickupMap(clientSlug, date, loteId, loteName, rows) {
    const dir = path.join(DAILY_MONITORING_DIR(clientSlug), date);
    const mapPath = path.join(dir, `_lote-clickup-map-${date}.json`);
    const existing = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf-8')) : [];
    const merged = existing.concat(rows.map((r) => ({
        url: r.url, platform: r.platform, identifier: r.identifier,
        loteId, loteName, subtaskId: r._subtaskId,
    })));
    fs.writeFileSync(mapPath, JSON.stringify(merged, null, 2), 'utf-8');
    return mapPath;
}

/** ClickUp IGNORA custom_item_id silenciosamente no POST de criação de task
 * (a task nasce com tipo 0/"Task" padrão, sem erro) — confirmado em produção
 * 2026-08-17 (Lote 03 inteiro nasceu sem tipo, founder reportou pelo ícone
 * genérico no board). Só aplica de fato via PUT /task/{id} depois de criada. */
async function setTaskType(taskId, customItemId) {
    await client.put(`/task/${taskId}`, { custom_item_id: customItemId });
}

function buildSubtaskDescription(row) {
    const lines = [];
    lines.push(`**Origem:** sondagem do dia (daily-monitor)`);
    if (row.platform) lines.push(`**Plataforma:** ${row.platform}`);
    if (row.identifier) lines.push(`**Criador:** ${row.identifier}`);
    if (row.url) lines.push(`**Link:** ${row.url}`);
    lines.push('', '---', '', '_Changelog:_', `- [ideia] adicionada ao lote via sondagem`);
    return lines.join('\n');
}

async function run(clientSlug, date, dryRun) {
    console.log(`\n=== Lote de Conteúdos — ${clientSlug} · ${date} ${dryRun ? '(DRY RUN)' : ''} ===\n`);

    const approved = readRankingFiles(clientSlug, date);
    if (approved.length === 0) {
        console.log('Nenhum item marcado com [x] na coluna Sondagem. Nada a fazer.');
        return;
    }
    console.log(`${approved.length} criativo(s) aprovado(s) na sondagem:`);
    approved.forEach((r) => console.log(`  - ${r.identifier || '?'} (${r.platform || '?'}) — ${r.url || 'sem link'}`));

    const empresaOption = EMPRESA_OPTION[clientSlug];
    if (!empresaOption) {
        console.error(`Cliente desconhecido "${clientSlug}" — sem opção de Empresa mapeada.`);
        process.exitCode = 1;
        return;
    }

    console.log('\nCalculando próximo número de Lote...');
    const [namesMaquina, namesPlanejamentos] = await Promise.all([
        fetchAllTaskNames(MAQUINA_DE_IDEIAS_LIST),
        fetchAllTaskNames(PLANEJAMENTOS_LIST),
    ]);
    const loteNumber = nextLoteNumber([...namesMaquina, ...namesPlanejamentos]);
    const loteName = buildLoteName(loteNumber, date);
    console.log(`  -> ${loteName}`);

    const ambiguous = approved.filter((r) => !inferTaskType(r.url, r.platform).confident);

    if (dryRun) {
        console.log(`\n[DRY RUN] Criaria "${loteName}" em Máquina de Idéias com ${approved.length} subtask(s):`);
        approved.forEach((r) => {
            const t = inferTaskType(r.url, r.platform);
            console.log(`  - "${buildSubtaskName(r)}" -> tipo "${t.typeName}"${t.confident ? '' : ' (⚠ incerto, confirmar após benchmark)'}`);
        });
        if (ambiguous.length) {
            console.log(`\n⚠ ${ambiguous.length} item(ns) com tipo incerto (Post vs Carrossel) — confirmar manualmente ou aguardar benchmark.`);
        }
        return;
    }

    console.log(`\nCriando "${loteName}"...`);
    const loteRes = await client.post(`/list/${MAQUINA_DE_IDEIAS_LIST}/task`, {
        name: loteName,
        status: 'para fazer',
        custom_item_id: 1007, // Planejamento — ignorado no create (ver setTaskType), mantido por clareza
        custom_fields: [{ id: EMPRESA_FIELD_ID, value: empresaOption }],
        description: `**Origem:** sondagem de ${date} (daily-monitor · ${clientSlug})\n**Itens:** ${approved.length}\n\n---\n\n_Changelog:_\n- [criado] lote gerado a partir da sondagem aprovada`,
    });
    const loteId = loteRes.data.id;
    await setTaskType(loteId, 1007);
    console.log(`  -> criado: ${loteId}`);

    for (const row of approved) {
        const t = inferTaskType(row.url, row.platform);
        const subRes = await client.post(`/list/${MAQUINA_DE_IDEIAS_LIST}/task`, {
            name: buildSubtaskName(row),
            parent: loteId,
            status: 'para fazer',
            custom_item_id: t.typeId,
            custom_fields: [{ id: EMPRESA_FIELD_ID, value: empresaOption }],
            description: buildSubtaskDescription(row),
        });
        row._subtaskId = subRes.data.id;
        await setTaskType(subRes.data.id, t.typeId);
        console.log(`    - subtask "${row.identifier}" -> ${subRes.data.id} (tipo: ${t.typeName}${t.confident ? '' : ' ⚠ incerto'})`);
    }

    const mapPath = writeClickupMap(clientSlug, date, loteId, loteName, approved);
    console.log(`  -> mapa url→subtask salvo em: ${mapPath}`);

    console.log(`\n✓ Concluído. ${loteName} criado com ${approved.length} subtask(s) em "Para Fazer".`);
    if (ambiguous.length) {
        console.log(`⚠ ${ambiguous.length} subtask(s) com tipo "Post" por palpite — confirmar se é Carrossel após o benchmark.`);
    }
}

if (require.main === module) {
    const [, , clientSlug, date, ...rest] = process.argv;
    const dryRun = rest.includes('--dry-run');
    if (!clientSlug || !date) {
        console.error('Uso: node create-lote-de-conteudos.js <client> <date> [--dry-run]');
        process.exit(1);
    }
    run(clientSlug, date, dryRun).catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { run, readRankingFiles };
