#!/usr/bin/env node
/**
 * Sync Creatives — empurra o render MAIS RECENTE de um criativo (local, em
 * outputs/) pro ClickUp, sem precisar rodar o pipeline de aprovação de novo.
 *
 * Pra que serve: o founder pode reabrir um criativo já renderizado no Studio
 * (apps/creative-design), editar manualmente e reexportar — o Studio já
 * dispara um novo render local (Etapa 6, orchestrate_carousel.py) via
 * /api/export, mas isso NÃO atualizava o ClickUp sozinho. Este comando fecha
 * esse elo: sobe a versão nova como anexo + registra no changelog.
 *
 * GOTCHA: a ClickUp API pública NÃO TEM endpoint de deletar anexo, nem de
 * anexar arquivo DENTRO de um comentário — então "sync" sempre ADICIONA a
 * versão nova como anexo da task (galeria acumula, não substitui — limpar é
 * manual na UI) E posta um COMENTÁRIO linkando os arquivos dessa versão,
 * com timestamp. Pedido do founder 2026-08-17: "inserir nos comentários pra
 * ficar registro histórico de timeline e separação" — o comentário é o
 * "índice" datado de cada re-export; o anexo é onde o arquivo de fato mora.
 *
 * GOTCHA #2: quando o reexport vem do Studio (não do run-design-creative.js
 * original), o render pode cair em outputs/{client}/carousels/{slug}/ MESMO
 * pra um post que originalmente foi renderizado como "single" em
 * outputs/{client}/posts/{slug}/ — orchestrate_carousel.py sempre usa
 * "carousels" como pasta-base, mesmo quando o archetype resolve pra
 * "single-post" internamente (o /api/export do Studio SEMPRE chama
 * orchestrate_carousel.py, nunca orchestrate_post_single.py). Por isso
 * findLatestRenderAnyKind() varre os dois diretórios e pega o run mais
 * recente entre eles, não assume o kind original.
 *
 * GOTCHA #3: o founder edita manualmente o pack já exportado (troca um slide
 * PNG por um vídeo real direto na pasta de outputs/, fora do Studio) e espera
 * que rodar `by-brief` de novo já reflita isso sozinho — confirmado
 * 2026-08-18 com 2 casos reais: `slide_02.mp4` sobrescrevendo um slide de
 * carrossel, e uma pasta de "single" só com um arquivo solto tipo
 * "Video Project 1.mp4" (nome de export externo, sem seguir o padrão
 * slide_NN). O filtro de asset NÃO pode depender de convenção de nome nem
 * ficar preso a .png: pega qualquer imagem/vídeo deliverable na pasta,
 * ignora .zip/.json (bundle e metadata, não são pra subir), e quando duas
 * versões do MESMO slide existem (slide_01.png + slide_01.webp) prioriza
 * vídeo > png > jpg > webp — webp é sempre o derivado leve, nunca o master.
 *
 * Dois modos:
 *   `sync <client> <date> --pick=subtaskId1,subtaskId2,...`
 *     Modo manual/batch — mesmo padrão dos outros run-*.js.
 *   `by-brief <briefId>`
 *     Resolve client (via client_slug dentro do próprio brief YAML) e o
 *     subtaskId (varrendo as datas de daily-monitoring desse cliente atrás
 *     da pasta de benchmark com o mesmo slug) sozinho — é o modo que o
 *     /api/export do Studio chama depois de um reexport manual.
 *
 * Uso:
 *   node sync-creatives.js sync <client> <date> --pick=subtaskId1,...
 *   node sync-creatives.js by-brief <briefId>
 */

const fs = require('fs');
const path = require('path');
const client = require('../../clickup/client');
const { loadMap, scanBenchmarkFolders } = require('./sync-benchmark-to-clickup');
const { WORKSPACE_ID } = require('./_clickup_config');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const MIME_BY_EXT = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry em rate limit (429) e erro transitório do servidor (5xx) — mesmo
 * motivo do interceptor em services/clickup/client.js, mas esses uploads
 * usam fetch() cru (multipart/form-data), não passam pelo axios `client`.
 * Confirmado em produção 2026-08-18: 500 "context deadline exceeded" num
 * upload de vídeo de ~21MB, reprodutível, resolvido na re-tentativa manual —
 * o Blob vem de um Buffer em memória (não é stream), então reenviar o mesmo
 * FormData em retry é seguro. */
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

/**
 * Monta o payload rico do comentário de versão — pura, testável sem rede.
 * A API pública do ClickUp NÃO tem endpoint de anexar arquivo DENTRO de um
 * comentário (confirmado 2026-08-17 — só existe anexo no nível da task, e
 * "Create an Attachment" v3 só aceita entity_type task/custom_field, não
 * comment). O jeito de ter histórico de timeline por versão é: subir o
 * arquivo normal (task-level) e postar um COMENTÁRIO linkando pra URL que
 * voltou do upload — pedido do founder 2026-08-17: "inserir nos comentários
 * pra ficar registro histórico de timeline e separação" entre re-exports.
 * Formato de rich text = array de {text, attributes} (link vira attributes.link,
 * bullet vira o "\n" seguinte carregando attributes.list — API bem específica).
 */
function buildVersionCommentPayload({ uploadedFiles, runDir, timestamp }) {
    const comment = [
        { text: '🎨 Render sincronizado', attributes: { bold: true } },
        { text: ` — ${timestamp}\n`, attributes: {} },
        { text: `${uploadedFiles.length} arquivo(s) de `, attributes: {} },
        { text: runDir, attributes: { code: true } },
        { text: ':\n', attributes: {} },
    ];
    uploadedFiles.forEach((f) => {
        comment.push({ text: f.name, attributes: { link: f.url } });
        comment.push({ text: '\n', attributes: { list: { list: 'bullet' } } });
    });
    return { comment, notify_all: false };
}

async function postVersionComment(taskId, { uploadedFiles, runDir, timestamp }) {
    const payload = buildVersionCommentPayload({ uploadedFiles, runDir, timestamp });
    await client.post(`/task/${taskId}/comment`, payload);
}

/** Sobe 1 arquivo pro campo custom type "attachment" (API v3 — diferente do
 * anexo nível-task usado por uploadAttachment). GOTCHA: vídeo exige
 * Content-Type explícito no Blob, ver header/GESTOR_TRAFEGO... não, ver
 * PACK_CRIATIVOS_APROVADOS_FIELD_ID em _clickup_config.js — sem isso a API
 * devolve 500 só pra vídeo (confirmado 2026-08-18). */
async function uploadToFieldAttachment(fieldId, filePath) {
    const buf = fs.readFileSync(filePath);
    const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const form = new FormData();
    form.append('attachment', new Blob([buf], { type: mime }), path.basename(filePath));
    const res = await fetchWithRetry(`https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/custom_fields/${fieldId}/attachments`, {
        method: 'POST',
        headers: { Authorization: process.env.CLICKUP_API_KEY },
        body: form,
    });
    if (!res.ok) throw new Error(`upload pro campo attachment falhou (${res.status}): ${await res.text()}`);
    return res.json();
}

/** Sobe os assets (na ordem) pro campo "Pack de Criativos Aprovados" e
 * associa à task — SUBSTITUI o valor anterior (rem dos ids antigos) em vez
 * de acumular, pra reaprovar/reexecutar não duplicar a galeria.
 *
 * Espaçamento de 400ms entre uploads: um lote de vários criativos (cada um
 * com 3-4 arquivos grandes) em sequência rápida bateu rate limit real da
 * API do ClickUp (429 "SHARD_035") 2026-08-18 — sem nada escrito ainda
 * (falhou no primeiro upload), mas travava o lote inteiro no meio. */
async function uploadApprovedPack(taskId, fieldId, assets) {
    const current = await client.get(`/task/${taskId}`);
    const currentField = (current.data.custom_fields || []).find((f) => f.id === fieldId);
    const existingIds = (currentField && Array.isArray(currentField.value)) ? currentField.value.map((v) => v.id) : [];

    const newIds = [];
    for (const asset of assets) {
        const res = await uploadToFieldAttachment(fieldId, asset);
        newIds.push(res.id);
        await sleep(400);
    }
    await client.post(`/task/${taskId}/field/${fieldId}`, { value: { add: newIds, rem: existingIds } });
    return newIds;
}

/** Acha o slug de output (outputs/{client}/{posts,carousels}/{slug}) de uma
 * task do ClickUp pelo caminho inverso do que syncByBrief faz: aqui já
 * temos o subtaskId (veio da list "em aprovação"), falta achar de qual
 * brief/benchmark ele é. Varre os mapas de Lote de todas as datas do
 * cliente atrás de um row com esse subtaskId. */
function resolveSlugForTask(clientSlug, taskId) {
    const dailyMonitoringDir = path.join(REPO_ROOT, 'workspaces', 'businesses', clientSlug, 'marketing', 'daily-monitoring');
    if (!fs.existsSync(dailyMonitoringDir)) return null;

    for (const date of fs.readdirSync(dailyMonitoringDir).sort().reverse()) {
        const mapPath = path.join(dailyMonitoringDir, date, `_lote-clickup-map-${date}.json`);
        if (!fs.existsSync(mapPath)) continue;
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
        const row = map.find((r) => r.subtaskId === taskId);
        if (!row) continue;
        const byUrl = scanBenchmarkFolders(clientSlug, date);
        const entry = byUrl[row.url];
        if (!entry) continue;
        return path.basename(entry.dir);
    }
    return null;
}

/** benchmarkSlug -> outputSlug, resolvendo o brief (single ou carousel) do
 * mesmo jeito que syncOne faz. */
function outputSlugFromBenchmarkSlug(benchmarkSlug) {
    const yaml = require('js-yaml');
    const briefPathSingle = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `brief-v5-single-${benchmarkSlug}.yaml`);
    const briefPathCarousel = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `brief-v5-${benchmarkSlug}.yaml`);
    const briefPath = fs.existsSync(briefPathSingle) ? briefPathSingle : briefPathCarousel;
    if (!fs.existsSync(briefPath)) return null;
    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    return slugFromBrief(brief) || benchmarkSlug;
}

/** Ponto de entrada usado por approve-design-creative.js: dado clientSlug +
 * taskId + fieldId, acha o pack mais recente em outputs/ e sobe pro campo
 * attachment. Não lança se não achar pack — devolve { ok:false, reason }
 * pra quem chama decidir se bloqueia a aprovação ou só avisa. */
async function syncApprovedPackField(clientSlug, taskId, fieldId) {
    const benchmarkSlug = resolveSlugForTask(clientSlug, taskId);
    if (!benchmarkSlug) return { ok: false, reason: `não achei benchmark/brief pra task ${taskId} em ${clientSlug}` };

    const outputSlug = outputSlugFromBenchmarkSlug(benchmarkSlug);
    if (!outputSlug) return { ok: false, reason: `não achei brief pro benchmark "${benchmarkSlug}"` };

    const { assets } = findLatestRenderAnyKind(clientSlug, outputSlug);
    if (assets.length === 0) return { ok: false, reason: `nenhum render encontrado em outputs/${clientSlug}/{posts,carousels}/${outputSlug}/` };

    // Não deixa um upload que falhe (ex.: timeout da API do ClickUp em
    // vídeo grande — visto 2026-08-18 com "context deadline exceeded" em
    // arquivo de ~21MB, reproduzido 3x) derrubar o approve inteiro. A
    // aprovação em si (mudança de status) não deve ficar refém de um
    // upload de metadado secundário.
    try {
        const ids = await uploadApprovedPack(taskId, fieldId, assets);
        return { ok: true, count: ids.length };
    } catch (e) {
        return { ok: false, reason: `upload do pack falhou: ${e.message}` };
    }
}

function slugFromBrief(brief) {
    const sub = brief.post_brief || brief.carousel_brief || {};
    return sub.slug || null;
}

function readLatestRunFolder(baseDir) {
    const latestTxt = path.join(baseDir, '_latest.txt');
    if (fs.existsSync(latestTxt)) return fs.readFileSync(latestTxt, 'utf-8').trim();
    if (fs.existsSync(path.join(baseDir, '_latest'))) return fs.readFileSync(path.join(baseDir, '_latest'), 'utf-8').trim();
    if (!fs.existsSync(baseDir)) return null;
    const dirs = fs.readdirSync(baseDir).filter((d) => d.includes('__') && fs.statSync(path.join(baseDir, d)).isDirectory());
    return dirs.sort().pop() || null;
}

const DELIVERABLE_EXT = /\.(mp4|mov|webm|png|jpe?g|webp)$/i;

/** Prioridade de formato quando o mesmo slide tem mais de um arquivo (ex.:
 * slide_01.png + slide_01.webp): vídeo > png > jpg > webp. Webp é sempre o
 * derivado leve gerado junto do PNG master, nunca a versão final a subir. */
function formatPriority(ext) {
    if (/\.(mp4|mov|webm)$/i.test(ext)) return 0;
    if (/\.png$/i.test(ext)) return 1;
    if (/\.jpe?g$/i.test(ext)) return 2;
    return 3; // webp
}

/** Pega 1 arquivo deliverable por "slide" numa pasta de run — não assume
 * convenção de nome (ver gotcha #3): um slide editado manualmente pode não
 * seguir o padrão slide_NN.ext. Agrupa por basename só quando o basename
 * bate (dois formatos do mesmo slide); arquivos sem par (ex.: um .mp4 solto
 * com nome arbitrário) entram como estão. */
function pickDeliverables(runDir) {
    const files = fs.readdirSync(runDir).filter((f) => DELIVERABLE_EXT.test(f));
    const byBase = new Map();
    for (const f of files) {
        const base = f.slice(0, -path.extname(f).length);
        const current = byBase.get(base);
        if (!current || formatPriority(path.extname(f)) < formatPriority(path.extname(current))) {
            byBase.set(base, f);
        }
    }
    return [...byBase.keys()].sort().map((base) => path.join(runDir, byBase.get(base)));
}

/** Varre outputs/{client}/{posts,carousels}/{slug}/ e devolve o run MAIS
 * RECENTE entre os dois kinds (comparando o timestamp no nome da pasta —
 * ver gotcha #2 no header). */
function findLatestRenderAnyKind(clientSlug, outputSlug) {
    const candidates = [];
    for (const kind of ['posts', 'carousels']) {
        const baseDir = path.join(REPO_ROOT, 'outputs', clientSlug, kind, outputSlug);
        const runFolder = readLatestRunFolder(baseDir);
        if (!runFolder) continue;
        const runDir = path.join(baseDir, runFolder);
        const stampMatch = runFolder.match(/__(\d{8}T\d{6})$/);
        candidates.push({ kind, runDir, stamp: stampMatch ? stampMatch[1] : '' });
    }
    if (candidates.length === 0) return { runDir: null, kind: null, assets: [] };

    candidates.sort((a, b) => (a.stamp < b.stamp ? 1 : -1)); // mais recente primeiro
    const best = candidates[0];
    const assets = pickDeliverables(best.runDir);
    return { runDir: best.runDir, kind: best.kind, assets };
}

async function syncOne(clientSlug, row, entry) {
    const benchmarkSlug = path.basename(entry.dir);
    const briefPathSingle = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `brief-v5-single-${benchmarkSlug}.yaml`);
    const briefPathCarousel = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `brief-v5-${benchmarkSlug}.yaml`);
    const briefPath = fs.existsSync(briefPathSingle) ? briefPathSingle : briefPathCarousel;
    if (!fs.existsSync(briefPath)) return { ok: false, reason: `brief não encontrado (${briefPathSingle} nem ${briefPathCarousel})` };

    const yaml = require('js-yaml');
    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    const outputSlug = slugFromBrief(brief) || benchmarkSlug;

    const { assets, runDir } = findLatestRenderAnyKind(clientSlug, outputSlug);
    if (assets.length === 0) return { ok: false, reason: `nenhum render encontrado em outputs/${clientSlug}/{posts,carousels}/${outputSlug}/` };

    const uploadedFiles = [];
    for (const asset of assets) {
        const res = await uploadAttachment(row.subtaskId, asset);
        uploadedFiles.push({ name: path.basename(asset), url: res.url });
    }
    await postVersionComment(row.subtaskId, {
        uploadedFiles,
        runDir: path.relative(REPO_ROOT, runDir).split(path.sep).join('/'),
        timestamp: new Date().toISOString(),
    });

    return { ok: true, count: assets.length, runDir };
}

async function syncBatch(clientSlug, date, pickIds) {
    console.log(`\n=== Sync Creatives — ${clientSlug} · ${date} ===\n`);
    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);
    const rows = map.filter((r) => pickIds.includes(r.subtaskId));
    if (rows.length === 0) { console.log('Nenhum dos --pick informados está no mapa deste cliente/data.'); return; }

    let ok = 0;
    for (const row of rows) {
        console.log(`\n${row.identifier} · subtask ${row.subtaskId}`);
        const entry = byUrl[row.url];
        if (!entry) { console.log('  ⚠ sem pasta de benchmark — pulando.'); continue; }
        const res = await syncOne(clientSlug, row, entry);
        if (res.ok) { console.log(`  ✅ ${res.count} arquivo(s) sincronizado(s)`); ok++; }
        else console.log(`  ❌ ${res.reason}`);
    }
    console.log(`\n✓ Sincronizado: ${ok}/${rows.length}\n`);
}

/** Modo usado pelo /api/export do Studio: resolve client (client_slug do
 * próprio brief) e subtaskId (varrendo as datas de daily-monitoring desse
 * cliente atrás da pasta de benchmark com o mesmo slug) sozinho — quem chama
 * só sabe o briefId. */
async function syncByBrief(briefId) {
    const yaml = require('js-yaml');
    const briefPath = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `${briefId}.yaml`);
    if (!fs.existsSync(briefPath)) return { ok: false, reason: `brief não encontrado: ${briefPath}` };
    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    const clientSlug = brief.client_slug;
    if (!clientSlug) return { ok: false, reason: 'brief sem client_slug — não sei de qual cliente é' };

    // benchmarkSlug = briefId sem o prefixo brief-v5[-single]-
    const benchmarkSlug = briefId.replace(/^brief-v5-single-/, '').replace(/^brief-v5-/, '');

    const dailyMonitoringDir = path.join(REPO_ROOT, 'workspaces', 'businesses', clientSlug, 'marketing', 'daily-monitoring');
    if (!fs.existsSync(dailyMonitoringDir)) return { ok: false, reason: `sem daily-monitoring pra ${clientSlug}` };

    for (const date of fs.readdirSync(dailyMonitoringDir).sort().reverse()) {
        const mapPath = path.join(dailyMonitoringDir, date, `_lote-clickup-map-${date}.json`);
        if (!fs.existsSync(mapPath)) continue;
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
        const byUrl = scanBenchmarkFolders(clientSlug, date);
        const row = map.find((r) => byUrl[r.url] && path.basename(byUrl[r.url].dir) === benchmarkSlug);
        if (!row) continue;
        const entry = byUrl[row.url];
        console.log(`Achado: ${row.identifier} (subtask ${row.subtaskId}, data ${date})`);
        return syncOne(clientSlug, row, entry);
    }
    return { ok: false, reason: `nenhuma data de ${clientSlug} tem um criativo com slug "${benchmarkSlug}" mapeado` };
}

if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    const [, , cmd, ...rest] = process.argv;

    (async () => {
        if (cmd === 'sync') {
            const [clientSlug, date, ...flags] = rest;
            const pickArg = flags.find((a) => a.startsWith('--pick='));
            const pickIds = pickArg ? pickArg.replace('--pick=', '').split(',').filter(Boolean) : [];
            if (!clientSlug || !date || pickIds.length === 0) {
                console.error('Uso: node sync-creatives.js sync <client> <date> --pick=subtaskId1,...');
                process.exit(1);
            }
            await syncBatch(clientSlug, date, pickIds);
        } else if (cmd === 'by-brief') {
            const [briefId] = rest;
            if (!briefId) { console.error('Uso: node sync-creatives.js by-brief <briefId>'); process.exit(1); }
            const res = await syncByBrief(briefId);
            console.log(JSON.stringify(res, null, 2));
            if (!res.ok) process.exitCode = 1;
        } else {
            console.error('Uso: node sync-creatives.js sync <client> <date> --pick=subtaskId1,...');
            console.error('     node sync-creatives.js by-brief <briefId>');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = {
    syncOne, syncBatch, syncByBrief, findLatestRenderAnyKind, slugFromBrief,
    buildVersionCommentPayload, pickDeliverables, syncApprovedPackField,
    resolveSlugForTask, outputSlugFromBenchmarkSlug,
};
