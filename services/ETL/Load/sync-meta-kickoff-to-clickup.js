#!/usr/bin/env node
/**
 * Sincroniza o status de kickoff de um cliente de tráfego pago Meta Ads
 * (gates-status.yaml + brief.yaml) com a lista "Gestão de Campanhas" do
 * ClickUp (espaço Performance & Growth, workspace Oraclum).
 *
 * Idempotente: se já existe uma task com o nome do cliente nessa lista,
 * atualiza; senão, cria. Mesmo padrão `create`/`update` implícito usado
 * pelos outros scripts de services/ETL/Load/ (list/apply em approve-*.js).
 *
 * Uso: node sync-meta-kickoff-to-clickup.js <slug> [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const client = require('../../clickup/client.js');
const {
    GESTAO_DE_CAMPANHAS_LIST,
    CLIENTE_FIELD_ID,
    CLIENTE_OPTION,
    CONTA_DE_ANUNCIO_FIELD_ID,
    CONTA_DE_ANUNCIO_OPTION,
    GATE_STATUS_FIELD_ID,
    GATE_STATUS_OPTION,
    LINK_BRIEF_FIELD_ID,
} = require('./_clickup_config_performance.js');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');

function loadYaml(relPath) {
    const full = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(full)) return null;
    return yaml.load(fs.readFileSync(full, 'utf-8'));
}

function resolveClientPaths(slug) {
    const registry = loadYaml('squads/virals-marketing-squad/data/clients/_registry.yaml');
    const entry = registry && registry.clients && registry.clients[slug];
    if (!entry) throw new Error(`Cliente '${slug}' não existe no registry.`);
    if (entry.tipo !== 'cliente_trafego_pago') {
        throw new Error(`Cliente '${slug}' não é do tipo cliente_trafego_pago (é '${entry.tipo}').`);
    }
    const metaAdsDir = entry.meta_ads_dir || `squads/virals-marketing-squad/data/clients/${slug}/meta-ads/`;
    return {
        nomeExibicao: entry.nome_exibicao || slug,
        metaAdsDir,
        briefPath: path.join(metaAdsDir, 'brief.yaml'),
        gatesStatusPath: path.join(metaAdsDir, 'gates-status.yaml'),
    };
}

/** Resume os gates-status.yaml em UM status agregado pro dropdown "Gate Status". */
function summarizeGateStatus(gatesStatus) {
    const allItems = [];
    for (const [gateKey, gate] of Object.entries(gatesStatus || {})) {
        if (!gateKey.startsWith('gate_')) continue;
        for (const [itemKey, item] of Object.entries(gate.itens || {})) {
            allItems.push({ gate: gateKey, item: itemKey, status: item.status });
        }
    }
    const hasBloqueado = allItems.some((i) => i.status === 'bloqueado');
    const hasPendente = allItems.some((i) => i.status === 'pendente');
    if (hasBloqueado) return { key: 'bloqueado', items: allItems };
    if (hasPendente) return { key: 'pendente', items: allItems };
    return { key: 'liberado', items: allItems };
}

function buildDescription(slug, paths, brief, gatesStatus, summary) {
    const linhas = [
        `**Cliente:** ${paths.nomeExibicao} (\`${slug}\`)`,
        `**Última auditoria:** ${gatesStatus.ultima_atualizacao || '—'}`,
        '',
        '### Resumo dos Gates',
    ];
    for (const [gateKey, gate] of Object.entries(gatesStatus || {})) {
        if (!gateKey.startsWith('gate_')) continue;
        linhas.push(`- **${gateKey}**: ${gate.pergunta || ''}`);
        for (const [itemKey, item] of Object.entries(gate.itens || {})) {
            const emoji = { ok: '✅', pendente: '⏳', bloqueado: '🚨', nao_aplicavel: '⚪' }[item.status] || '•';
            linhas.push(`  - ${emoji} ${itemKey}${item.nota ? ` — ${item.nota}` : ''}`);
        }
    }
    if (brief && brief.pendencias_com_cliente) {
        linhas.push('', '### Pendências com o cliente');
        for (const p of brief.pendencias_com_cliente) linhas.push(`- ${p}`);
    }
    linhas.push('', `_Sincronizado automaticamente via sync-meta-kickoff-to-clickup.js_`);
    return linhas.join('\n');
}

async function findExistingTask(taskName) {
    let page = 0;
    while (true) {
        const { data } = await client.get(`/list/${GESTAO_DE_CAMPANHAS_LIST}/task`, {
            params: { page, include_closed: true },
        });
        const found = data.tasks.find((t) => t.name === taskName);
        if (found) return found;
        if (data.tasks.length === 0 || data.last_page) return null;
        page += 1;
    }
}

async function sync(slug, { dryRun } = {}) {
    const paths = resolveClientPaths(slug);
    const brief = loadYaml(paths.briefPath);
    const gatesStatus = loadYaml(paths.gatesStatusPath);
    if (!gatesStatus) throw new Error(`gates-status.yaml não encontrado: ${paths.gatesStatusPath}`);

    const summary = summarizeGateStatus(gatesStatus);
    const taskName = `${paths.nomeExibicao} — Kickoff Meta Ads`;
    const description = buildDescription(slug, paths, brief, gatesStatus, summary);

    const customFields = [];
    if (CLIENTE_FIELD_ID && CLIENTE_OPTION[slug]) {
        customFields.push({ id: CLIENTE_FIELD_ID, value: CLIENTE_OPTION[slug] });
    }
    if (CONTA_DE_ANUNCIO_FIELD_ID && CONTA_DE_ANUNCIO_OPTION[slug]) {
        customFields.push({ id: CONTA_DE_ANUNCIO_FIELD_ID, value: CONTA_DE_ANUNCIO_OPTION[slug] });
    }
    if (GATE_STATUS_FIELD_ID && GATE_STATUS_OPTION[summary.key]) {
        customFields.push({ id: GATE_STATUS_FIELD_ID, value: GATE_STATUS_OPTION[summary.key] });
    }
    if (LINK_BRIEF_FIELD_ID) {
        // Campo tipo "url" exige esquema válido — sem remoto estável (GitHub)
        // configurado ainda, usamos file:// com o path absoluto do repo.
        const absoluteBrief = path.join(REPO_ROOT, paths.briefPath).replace(/\\/g, '/');
        customFields.push({ id: LINK_BRIEF_FIELD_ID, value: `file:///${absoluteBrief}` });
    }

    const payload = { name: taskName, description, custom_fields: customFields };

    console.log(`Cliente: ${paths.nomeExibicao} (${slug})`);
    console.log(`Gate Status resumido: ${summary.key} (${summary.items.length} itens auditados)`);
    console.log(`Custom fields: ${JSON.stringify(customFields)}`);

    if (dryRun) {
        console.log('\n[dry-run] payload que seria enviado:');
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    const existing = await findExistingTask(taskName);
    if (existing) {
        await client.put(`/task/${existing.id}`, payload);
        console.log(`✅ Task atualizada: ${existing.id}`);
    } else {
        const { data: created } = await client.post(`/list/${GESTAO_DE_CAMPANHAS_LIST}/task`, {
            ...payload,
            status: 'para fazer',
        });
        console.log(`✅ Task criada: ${created.id}`);
    }
}

if (require.main === module) {
    const [, , slugArg, ...rest] = process.argv;
    const dryRun = rest.includes('--dry-run');
    if (!slugArg) {
        console.error('Uso: node sync-meta-kickoff-to-clickup.js <slug> [--dry-run]');
        process.exit(1);
    }
    sync(slugArg, { dryRun }).catch((e) => {
        console.error('ERRO:', e.response ? JSON.stringify(e.response.data) : e.message);
        process.exit(1);
    });
}

module.exports = { sync };
