#!/usr/bin/env node
/**
 * Run Design Creative — *design-creative (etapa de Processo de Design e
 * Criação). Só carrossel/post — vídeo fica manual por pedido do founder
 * 2026-08-17 ("industrialize video é um pouco mais complexo... por hora vou
 * fazer manualmente"). Os vídeos ficam parados em "para fazer" pra ele
 * puxar de lá quando for editar.
 *
 * DIFERENTE de run-planning-modeling.js/run-copywriting.js: aqui NÃO
 * processa tudo que está "para fazer" automaticamente — o founder ESCOLHE
 * quais renderizar agora (`list` devolve candidatos, o agente apresenta via
 * AskUserQuestion — mesmo padrão dos approve-*.js — e `run --pick=` recebe
 * só os escolhidos).
 *
 * Por criativo escolhido:
 *   1. Reconcilia custom_item_id via Benchmark.json (mesmo gotcha de sempre).
 *   2. Status: "para fazer" -> "fazendo".
 *   3. Roda o render de verdade — Etapa 6 do *design-creative original —
 *      em cima do MESMO brief-v5-*.yaml das etapas anteriores (já com
 *      content_plan + recast + quality_gate prontos):
 *        Carrocel     -> orchestrate_carousel.py <brief>
 *        Post/Post de Texto -> orchestrate_post_single.py <brief>
 *      Lê outputs/{client}/{carousels|posts}/{slug}/_latest.txt (fallback
 *      Windows do symlink _latest) pra achar a pasta do run e os slide_NN.png.
 *   4. Sobe cada slide como anexo NATIVO da task (thumbnail visual — é o
 *      "criativo final dentro do card" pedido pelo founder).
 *   5. Gera a legenda + hashtags (caption-generator.js — grounded na copy
 *      final + legenda do post original só como referência de estilo) e
 *      seta no custom field "Descrição & Hashtags".
 *   6. Status: "fazendo" -> "em revisão".
 *
 * Isolado por criativo — igual às etapas anteriores.
 *
 * Uso:
 *   node run-design-creative.js list <client> <date>
 *   node run-design-creative.js run <client> <date> --pick=subtaskId1,subtaskId2,...
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
const client = require('../../clickup/client');
const { loadMap, scanBenchmarkFolders } = require('./sync-benchmark-to-clickup');
const { reconcileTaskType } = require('./lote-builder');
const { generateCaption } = require('./caption-generator');
const { CAPTION_FIELD_ID } = require('./_clickup_config');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const DESIGN_TYPES = { 1020: 'carousel', 1021: 'single', 1022: 'single' }; // Carrocel, Post, Post de Texto
const VIDEO_TYPES = new Set([1005, 1006]);

// orchestrate_*.py esperam o serviço de render (apps/creative-design) em
// RENDER_BASE_URL (default http://localhost:3001) — se já tiver uma
// instância do dev server rodando noutra porta, aponta pra ela em vez de
// tentar subir uma 2ª (o Next dev recusa 2 instâncias na mesma pasta).
const RENDER_BASE_URL = process.env.RENDER_BASE_URL || 'http://localhost:3000';

function runPython(args, timeoutMs) {
    const res = spawnSync('python', args, {
        cwd: REPO_ROOT, encoding: 'utf8', timeout: timeoutMs,
        env: { ...process.env, RENDER_BASE_URL },
    });
    return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

async function setStatus(taskId, status) {
    await client.put(`/task/${taskId}`, { status });
}

async function appendChangelog(taskId, line) {
    const task = await client.get(`/task/${taskId}`);
    const current = task.data.description || '';
    await client.put(`/task/${taskId}`, { description: `${current}\n- [design] ${line}`.trim() });
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

/** Lê outputs/{client}/{carousels|posts}/{slug}/_latest.txt (fallback do
 * symlink _latest, que não funciona sem privilégio no Windows) e devolve os
 * PNGs do run mais recente. `slug` tem que ser o MESMO que o orquestrador
 * Python usou — vem de brief["post_brief"|"carousel_brief"]["slug"], gerado
 * pelo deep_modeler.py na etapa de planning-modeling — NÃO é
 * path.basename(benchmark_dir) (confirmado divergente em produção
 * 2026-08-17: pasta de benchmark "14-artificialintelligence-co-5756c5", slug
 * real do brief "v5-single-14-artificialintelligence-co-5756c5"). Nome do
 * arquivo também difere por formato: carrossel usa slide_NN.png (um por
 * slide), post único usa um `single.png` só. */
function findRenderedSlides(clientSlug, ctype, slug) {
    const kind = ctype === 'carousel' ? 'carousels' : 'posts';
    const baseDir = path.join(REPO_ROOT, 'outputs', clientSlug, kind, slug);
    const latestTxt = path.join(baseDir, '_latest.txt');
    let runFolder = null;
    if (fs.existsSync(latestTxt)) {
        runFolder = fs.readFileSync(latestTxt, 'utf-8').trim();
    } else if (fs.existsSync(path.join(baseDir, '_latest'))) {
        runFolder = fs.readFileSync(path.join(baseDir, '_latest'), 'utf-8').trim();
    } else if (fs.existsSync(baseDir)) {
        // fallback: pega a pasta com timestamp mais recente por ordenação de nome
        const dirs = fs.readdirSync(baseDir).filter((d) => d.includes('__') && fs.statSync(path.join(baseDir, d)).isDirectory());
        runFolder = dirs.sort().pop();
    }
    if (!runFolder) return { runDir: null, slides: [] };
    const runDir = path.join(baseDir, runFolder);
    const pattern = ctype === 'carousel' ? /^slide_\d+\.png$/ : /^single\.png$/;
    const slides = fs.readdirSync(runDir).filter((f) => pattern.test(f)).sort().map((f) => path.join(runDir, f));
    return { runDir, slides };
}

/** slug real usado pelos orquestradores Python — vem de dentro do brief, não
 * do nome da pasta de benchmark. Ver findRenderedSlides(). */
function slugFromBrief(brief) {
    const sub = brief.post_brief || brief.carousel_brief || {};
    return sub.slug || null;
}

function buildFinalCopyText(brief) {
    return (brief.content_data || []).map((s) => {
        const parts = [s.headline && `Headline: ${s.headline}`, s.sub_headline && `Sub-headline: ${s.sub_headline}`, s.body_text && `Body: ${s.body_text}`];
        return parts.filter(Boolean).join(' | ');
    }).filter(Boolean).join('\n');
}

async function listCandidates(clientSlug, date) {
    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);
    const statuses = await Promise.all(map.map((r) => client.get(`/task/${r.subtaskId}`).then((t) => t.data.status.status).catch(() => null)));
    const pending = map.filter((_, i) => statuses[i] === 'para fazer');

    const result = [];
    for (const row of pending) {
        const entry = byUrl[row.url];
        const t = entry ? reconcileTaskType(entry.benchmark.type) : null;
        result.push({
            subtaskId: row.subtaskId,
            identifier: row.identifier,
            typeName: t ? t.typeName : '(tipo desconhecido — sem benchmark casado)',
            isVideo: t ? VIDEO_TYPES.has(t.typeId) : false,
            renderable: t ? !!DESIGN_TYPES[t.typeId] : false,
        });
    }
    return result;
}

async function processOne(clientSlug, row, entry, typeId) {
    const ctype = DESIGN_TYPES[typeId];
    // Nome do arquivo do brief usa o slug da PASTA de benchmark — convenção
    // fixada em create-lote-de-conteudos.js/planning-modeling. O slug usado
    // pelo ORQUESTRADOR pra nomear a pasta de output é outro (vem de dentro
    // do brief) — ver slugFromBrief().
    const benchmarkSlug = path.basename(entry.dir);
    const prefix = ctype === 'single' ? 'brief-v5-single' : 'brief-v5';
    const briefPath = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `${prefix}-${benchmarkSlug}.yaml`);
    if (!fs.existsSync(briefPath)) return { ok: false, reason: `brief não encontrado em ${briefPath}` };

    const orchestrator = ctype === 'single' ? 'orchestrate_post_single.py' : 'orchestrate_carousel.py';
    const relBrief = briefPath.replace(`${REPO_ROOT}${path.sep}`, '');
    const render = runPython([`squads/virals-marketing-squad/scripts/${orchestrator}`, relBrief], 15 * 60 * 1000);
    if (render.status !== 0) return { ok: false, reason: `${orchestrator} exit ${render.status}: ${render.stderr.slice(-500)}` };

    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    const outputSlug = slugFromBrief(brief) || benchmarkSlug;
    const { slides } = findRenderedSlides(clientSlug, ctype, outputSlug);
    if (slides.length === 0) return { ok: false, reason: `render terminou (exit 0) mas nenhum PNG foi encontrado em outputs/${clientSlug}/${ctype === 'carousel' ? 'carousels' : 'posts'}/${outputSlug}/` };

    for (const slidePath of slides) {
        await uploadAttachment(row.subtaskId, slidePath);
    }

    const finalCopyText = buildFinalCopyText(brief);
    const caption = await generateCaption({
        clientName: clientSlug,
        finalCopyText,
        originalDescription: entry.benchmark.description || '',
    });

    return { ok: true, slidesCount: slides.length, caption };
}

async function run(clientSlug, date, pickIds) {
    console.log(`\n=== Design Creative — ${clientSlug} · ${date} ===\n`);

    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);
    const rows = map.filter((r) => pickIds.includes(r.subtaskId));
    if (rows.length === 0) { console.log('Nenhum dos --pick informados está no mapa deste cliente/data.'); return; }

    const results = [];
    for (const row of rows) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`${row.identifier} · subtask ${row.subtaskId}`);
        const entry = byUrl[row.url];
        if (!entry) { console.log('  ⚠ sem pasta de benchmark — pulando.'); continue; }

        const t = reconcileTaskType(entry.benchmark.type);
        if (t) {
            await client.put(`/task/${row.subtaskId}`, { custom_item_id: t.typeId });
            console.log(`  🏷️  tipo reconciliado -> "${t.typeName}"`);
        }
        const typeId = t ? t.typeId : null;

        if (VIDEO_TYPES.has(typeId)) {
            console.log('  🎬 é vídeo — fora de escopo aqui (fica em "para fazer" pra edição manual).');
            continue;
        }
        if (!DESIGN_TYPES[typeId]) {
            console.log(`  ⚠ tipo "${t ? t.typeName : typeId}" sem engine de render mapeado — pulando.`);
            continue;
        }

        try {
            await setStatus(row.subtaskId, 'fazendo');
            console.log(`  🎨 renderizando (${DESIGN_TYPES[typeId]})...`);
            const res = await processOne(clientSlug, row, entry, typeId);

            if (!res.ok) {
                console.log(`  ❌ FALHA: ${res.reason}`);
                results.push({ ...row, ok: false, reason: res.reason });
                continue;
            }
            console.log(`  🖼️  ${res.slidesCount} slide(s) anexado(s)`);

            if (res.caption) {
                await client.post(`/task/${row.subtaskId}/field/${CAPTION_FIELD_ID}`, { value: res.caption });
                console.log(`  ✍️  legenda + hashtags setadas`);
            } else {
                console.log('  ⚠ legenda não gerada (Gemini indisponível?) — campo ficou vazio, preencher manualmente.');
            }

            await appendChangelog(row.subtaskId, `render concluído — ${res.slidesCount} slide(s) anexado(s)${res.caption ? ' + legenda gerada' : ' (legenda pendente)'}`);
            await setStatus(row.subtaskId, 'em revisão');
            console.log('  ✅ status -> "em revisão"');
            results.push({ ...row, ok: true });
        } catch (e) {
            console.log(`  ❌ ERRO: ${e.message}`);
            results.push({ ...row, ok: false, reason: e.message });
        }
    }

    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✓ Design concluído: ${ok}/${results.length}`);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) console.log(`⚠ Precisam de atenção: ${failed.map((r) => `${r.identifier} (${r.reason})`).join('; ')}`);
    console.log(`${'═'.repeat(60)}\n`);
}

if (require.main === module) {
    const [, , cmd, clientSlug, date, ...rest] = process.argv;
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

    (async () => {
        if (cmd === 'list') {
            if (!clientSlug || !date) { console.error('Uso: node run-design-creative.js list <client> <date>'); process.exit(1); }
            const candidates = await listCandidates(clientSlug, date);
            console.log(JSON.stringify(candidates, null, 2));
        } else if (cmd === 'run') {
            const pickArg = rest.find((a) => a.startsWith('--pick='));
            const pickIds = pickArg ? pickArg.replace('--pick=', '').split(',').filter(Boolean) : [];
            if (!clientSlug || !date || pickIds.length === 0) {
                console.error('Uso: node run-design-creative.js run <client> <date> --pick=subtaskId1,subtaskId2,...');
                process.exit(1);
            }
            await run(clientSlug, date, pickIds);
        } else {
            console.error('Uso: node run-design-creative.js list <client> <date>');
            console.error('     node run-design-creative.js run <client> <date> --pick=subtaskId1,subtaskId2,...');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { listCandidates, run, findRenderedSlides, buildFinalCopyText, slugFromBrief };
