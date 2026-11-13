#!/usr/bin/env node
/**
 * Sync Benchmark → ClickUp — Fase 2 da integração Squad de Marketing ↔ ClickUp.
 *
 * Lê o pack completo que *creative-benchmark + *audit-benchmark já geraram em
 * daily-monitoring/{date}/benchmark/{platform}/{rank}-{slug}-{hash}/ e espelha
 * no ClickUp, casando cada pasta com a subtask certa via
 * _lote-clickup-map-{date}.json (gerado por create-lote-de-conteudos.js).
 *
 * Por criativo:
 *   1. Cria UM Google Doc (pasta do Lote dentro da pasta do cliente no Drive)
 *      com o pack inteiro renderizado (metadata + Análise.md + Transcrição.md,
 *      headings/tabelas NATIVOS via createAdvancedDoc). Trocado de ClickUp Doc
 *      → Google Doc por feedback do fundador (2026-08-16): abrir o Doc do
 *      ClickUp em nova janela quebrava o fluxo de revisão; Drive é onde ele já
 *      revisa outros documentos do cliente.
 *   2. Sobe os Screenshots/ como anexo NATIVO da task no ClickUp — thumbnail
 *      visual sem sair da task, isso continua no ClickUp (não é o que quebrava
 *      o fluxo — só o Doc de texto longo era o problema).
 *   3. Seta o custom field "Pack de Análise" (url) apontando pro Google Doc.
 *   4. Reconcilia o Tipo de Tarefa com a classificação REAL do ContentClassifier
 *      (o palpite do create-lote-de-conteudos.js por padrão de URL não distingue
 *      Post de Carrossel — o benchmark sabe com certeza). custom_item_id só
 *      aplica de fato via PUT pós-criação (ClickUp ignora no create — gotcha
 *      confirmado em produção 2026-08-17).
 *   5. Acrescenta 1 linha de changelog na descrição (não reescreve — nota do
 *      fundador 2026-08-17: description = changelog, não repositório).
 *   6. Move o status: item_status 'ok' → "em aprovação" (pronto pra decisão);
 *      qualquer outro (degraded/failed/timeout) → "aguardando informações"
 *      (precisa recaptura, não é decisão que o founder deve tomar agora).
 *
 * No fim, se todas as subtasks mapeadas saíram de para fazer/fazendo, o Lote
 * (parent) também vai para "em aprovação" — é o sinal de "pack pronto, decida".
 *
 * Requer GOOGLE_REFRESH_TOKEN válido no .env (services/google-drive/get-token.js
 * reautoriza — fluxo interativo, precisa rodar manualmente).
 *
 * Uso:
 *   node sync-benchmark-to-clickup.js <client> <date> [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const client = require('../../clickup/client');
const { drive } = require('../../google-drive/client');
const { createAdvancedDoc } = require('../../google-drive/advanced_docs');
const { buildPackTitle, buildPackSections } = require('./pack-builder');
const { reconcileTaskType } = require('./lote-builder');
const { PACK_FIELD_ID, CLIENT_DRIVE_FOLDER } = require('./_clickup_config');

const DAILY_MONITORING_DIR = (clientSlug) =>
    path.join(__dirname, '../../../workspaces/businesses', clientSlug, 'marketing/daily-monitoring');

function loadMap(clientSlug, date) {
    const p = path.join(DAILY_MONITORING_DIR(clientSlug), date, `_lote-clickup-map-${date}.json`);
    if (!fs.existsSync(p)) throw new Error(`Mapa não encontrado: ${p}. Rode create-lote-de-conteudos.js primeiro.`);
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/** Varre benchmark/{platform}/*\/Benchmark.json e devolve { url -> { dir, benchmark } }. */
function scanBenchmarkFolders(clientSlug, date) {
    const benchmarkBaseDir = path.join(DAILY_MONITORING_DIR(clientSlug), date, 'benchmark');
    const byUrl = {};
    if (!fs.existsSync(benchmarkBaseDir)) return byUrl;
    for (const platform of fs.readdirSync(benchmarkBaseDir)) {
        const platDir = path.join(benchmarkBaseDir, platform);
        if (!fs.statSync(platDir).isDirectory()) continue;
        for (const folder of fs.readdirSync(platDir)) {
            const dir = path.join(platDir, folder);
            const bPath = path.join(dir, 'Benchmark.json');
            if (!fs.existsSync(bPath)) continue;
            const benchmark = JSON.parse(fs.readFileSync(bPath, 'utf-8'));
            if (benchmark.url) byUrl[benchmark.url] = { dir, benchmark };
        }
    }
    return byUrl;
}

function readIfExists(p) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function listScreenshots(dir) {
    const shotsDir = path.join(dir, 'Screenshots');
    if (!fs.existsSync(shotsDir)) return [];
    return fs.readdirSync(shotsDir)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .map((f) => path.join(shotsDir, f));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry em rate limit (429) e erro transitório do servidor (5xx) — visto em
 * produção 2026-08-18 num lote de aprovação (429 "SHARD_035" e 500 "context
 * deadline exceeded"), sem retry cada um derrubava o script inteiro no meio
 * de um lote de vários criativos. */
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; ; attempt++) {
        const res = await fetch(url, options);
        if (res.ok) return res;
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        if (!retryable || attempt >= maxRetries) return res;
        const retryAfter = res.headers.get('retry-after');
        const delayMs = retryAfter ? Number(retryAfter) * 1000 : 800 * 3 ** attempt;
        await sleep(delayMs);
    }
}

async function uploadAttachment(taskId, filePath) {
    const buf = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('attachment', new Blob([buf]), path.basename(filePath));
    const res = await fetchWithRetry(`https://api.clickup.com/api/v2/task/${taskId}/attachment`, {
        method: 'POST',
        headers: { Authorization: process.env.CLICKUP_API_KEY },
        body: form,
    });
    if (!res.ok) throw new Error(`upload de anexo falhou (${res.status}): ${await res.text()}`);
    return res.json();
}

async function appendChangelog(taskId, line) {
    const task = await client.get(`/task/${taskId}`);
    const current = task.data.description || '';
    const updated = `${current}\n- [pack] ${line}`.trim();
    await client.put(`/task/${taskId}`, { description: updated });
}

async function setStatus(taskId, status) {
    await client.put(`/task/${taskId}`, { status });
}

/** Acha (idempotente) ou cria a subpasta do Lote dentro da pasta do cliente
 * no Drive — reruns não duplicam pasta. */
async function ensureLoteFolder(clientSlug, loteName, cache) {
    if (cache[loteName]) return cache[loteName];
    const rootId = CLIENT_DRIVE_FOLDER[clientSlug];
    if (!rootId) throw new Error(`Sem pasta do Drive mapeada pra "${clientSlug}" (CLIENT_DRIVE_FOLDER).`);

    const safeName = loteName.replace(/'/g, "\\'");
    const q = `'${rootId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const found = await drive.files.list({ q, fields: 'files(id,name)' });
    if (found.data.files.length > 0) {
        cache[loteName] = found.data.files[0].id;
        return cache[loteName];
    }
    const created = await drive.files.create({
        requestBody: { name: loteName, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] },
        fields: 'id',
    });
    cache[loteName] = created.data.id;
    return cache[loteName];
}

async function run(clientSlug, date, dryRun) {
    console.log(`\n=== Sync Benchmark → ClickUp — ${clientSlug} · ${date} ${dryRun ? '(DRY RUN)' : ''} ===\n`);

    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);

    const withBenchmark = map.filter((r) => byUrl[r.url]);
    const missing = map.filter((r) => !byUrl[r.url]);
    console.log(`${withBenchmark.length}/${map.length} criativo(s) com pasta de benchmark encontrada.`);
    if (missing.length) {
        console.log(`⚠ ${missing.length} sem benchmark ainda (pulados nesta rodada):`);
        missing.forEach((r) => console.log(`  - ${r.identifier} (${r.url})`));
    }

    // Idempotência: só reprocessa quem ainda está "fazendo" — quem já saiu
    // (em aprovação / aguardando informações) já tem Doc+anexos feitos; rodar
    // de novo criaria um Google Doc DUPLICADO pro mesmo criativo. ClickUp é a
    // fonte de verdade de "já foi sincronizado", não um arquivo local.
    const statuses = await Promise.all(withBenchmark.map((r) => client.get(`/task/${r.subtaskId}`).then((t) => t.data.status.status)));
    const PENDING_STATUSES = ['para fazer', 'fazendo'];
    const matched = withBenchmark.filter((_, i) => PENDING_STATUSES.includes(statuses[i]));
    const alreadySynced = withBenchmark.filter((_, i) => !PENDING_STATUSES.includes(statuses[i]));
    if (alreadySynced.length) {
        console.log(`⏭  ${alreadySynced.length} já sincronizado(s) antes (status != "fazendo"), pulando:`);
        alreadySynced.forEach((r) => console.log(`  - ${r.identifier}`));
    }
    if (matched.length === 0) {
        console.log('\nNada novo a sincronizar.');
        return;
    }

    if (dryRun) {
        console.log('\n[DRY RUN] Para cada um seria feito: Google Doc na pasta do Lote (Drive) + anexos no ClickUp + custom field + changelog + mudança de status.');
        matched.forEach((r) => {
            const { benchmark } = byUrl[r.url];
            const nextStatus = benchmark.item_status === 'ok' ? 'em aprovação' : 'aguardando informações';
            console.log(`  - ${r.identifier}: item_status=${benchmark.item_status} -> status ClickUp="${nextStatus}"`);
        });
        return;
    }

    const loteId = map[0].loteId;
    const loteName = map[0].loteName;
    const folderCache = {};

    const results = [];
    const syncFailures = [];
    for (const row of matched) {
        const { dir, benchmark } = byUrl[row.url];
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`${row.identifier} · subtask ${row.subtaskId} · item_status=${benchmark.item_status}`);

        // Isolado por criativo — igual creative-benchmark/audit-benchmark: 1
        // falha (ex.: bug do Google Docs API num Doc específico) não pode
        // derrubar o resto do batch nem deixar o Lote inteiro travado.
        try {
            const analiseMd = readIfExists(path.join(dir, 'Análise.md'));
            const transcricaoMd = readIfExists(path.join(dir, 'Transcrição.md'));

            const folderId = await ensureLoteFolder(clientSlug, loteName, folderCache);
            const doc = await createAdvancedDoc(buildPackTitle(benchmark), buildPackSections(benchmark, analiseMd, transcricaoMd), folderId);
            console.log(`  📄 Google Doc criado: ${doc.url}`);

            await client.post(`/task/${row.subtaskId}/field/${PACK_FIELD_ID}`, { value: doc.url });
            console.log(`  🔗 custom field "Pack de Análise" setado`);

            const reconciled = reconcileTaskType(benchmark.type);
            if (reconciled) {
                await client.put(`/task/${row.subtaskId}`, { custom_item_id: reconciled.typeId });
                console.log(`  🏷️  tipo de tarefa -> "${reconciled.typeName}" (classificação real do benchmark)`);
            }

            const shots = listScreenshots(dir);
            for (const shot of shots) {
                await uploadAttachment(row.subtaskId, shot);
            }
            if (shots.length) console.log(`  🖼️  ${shots.length} screenshot(s) anexado(s)`);

            const ok = benchmark.item_status === 'ok';
            const nextStatus = ok ? 'em aprovação' : 'aguardando informações';
            const changelogLine = ok
                ? `análise pronta — ${doc.url}`
                : `análise DEGRADADA (${benchmark.status_reason || benchmark.item_status}) — ${doc.url}`;
            await appendChangelog(row.subtaskId, changelogLine);
            await setStatus(row.subtaskId, nextStatus);
            console.log(`  ✅ status -> "${nextStatus}"`);

            results.push({ ...row, item_status: benchmark.item_status, docUrl: doc.url, nextStatus });
        } catch (e) {
            console.log(`  ❌ FALHA no sync deste criativo: ${e.message}`);
            syncFailures.push({ ...row, error: e.message });
        }
    }

    // Lote inteiro processado (todas as subtasks mapeadas saíram de "fazendo",
    // nesta rodada ou numa anterior, e nenhuma falhou agora) → sinaliza pronto
    // pra decisão do founder. Falha de sync mantém a subtask em "fazendo" de
    // propósito — não é "aguardando informações" (isso é veredito do
    // benchmark), é "o script quebrou, precisa rodar de novo".
    if (missing.length === 0 && syncFailures.length === 0) {
        await setStatus(loteId, 'em aprovação');
        console.log(`\n🏁 Todas as subtasks do ${loteName} processadas — Lote movido para "em aprovação".`);
    } else if (missing.length > 0) {
        console.log(`\n⏳ ${missing.length} subtask(s) ainda sem benchmark — Lote permanece no status atual.`);
    } else {
        console.log(`\n⚠ ${syncFailures.length} subtask(s) falharam no sync — Lote permanece no status atual, rode de novo depois de investigar.`);
    }

    const ok = results.filter((r) => r.item_status === 'ok').length;
    const degraded = results.length - ok;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✓ Sincronizado: ${results.length} (${ok} em aprovação, ${degraded} aguardando informações)`);
    if (syncFailures.length) {
        console.log(`❌ Falha no sync: ${syncFailures.length} — ${syncFailures.map((r) => r.identifier).join(', ')}`);
    }
    console.log(`${'═'.repeat(60)}\n`);
}

if (require.main === module) {
    const [, , clientSlug, date, ...rest] = process.argv;
    const dryRun = rest.includes('--dry-run');
    if (!clientSlug || !date) {
        console.error('Uso: node sync-benchmark-to-clickup.js <client> <date> [--dry-run]');
        process.exit(1);
    }
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    run(clientSlug, date, dryRun).catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { run, scanBenchmarkFolders, loadMap };
