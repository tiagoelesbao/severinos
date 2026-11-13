#!/usr/bin/env node
/**
 * Run Copywriting — *copywriting.
 *
 * Terceira etapa extraída do funil (depois de *planning-modeling): produz a
 * COPY FINAL adaptada ao formato, em cima do Plano de Modelagem já aprovado.
 * Roda depois que approve-planning.js migra os criativos, um a um, de
 * Planejamento & Cronogramas pra Processo de Copywriting (a separação do
 * Lote aqui é intencional — ver approve-planning.js).
 *
 * Por criativo (subtask "para fazer" que também está no
 * _lote-clickup-map-{date}.json do cliente/data original):
 *   1. Reconcilia custom_item_id via Benchmark.json (mesmo gotcha do
 *      run-planning-modeling.js — a automação de migração reseta o tipo).
 *   2. Status: "para fazer" -> "fazendo".
 *   3. Roteia por formato — mas os dois formatos NÃO fazem o mesmo trabalho,
 *      porque a copy já nasce em estágios diferentes em cada engine:
 *        Vídeo Curto/Longo → plan_video_creative.py (rodado na etapa
 *          ANTERIOR) já escreveu hook×3 + roteiro FINAL — não existe um
 *          "recast de vídeo" separado no pipeline real. Aqui só reempacota
 *          o Plano-de-Criativo.md já existente como Copy & Direcionamento —
 *          fabricar uma chamada de LLM extra aqui seria trabalho fantasma.
 *        Carrocel/Post/Post de Texto → o content_plan da etapa anterior só
 *          tem DIREÇÃO (copy_direction), não o texto final. Aqui SIM roda
 *          recast_engine.py (escreve headline/sub_headline/body_text na voz
 *          do cliente) + quality_gate.py (guardrails determinísticos +
 *          rubrica de editor) — é onde a copy de fato nasce pra esses formatos.
 *   4. Espelha em Google Doc (mesma pasta do Lote no Drive — a separação da
 *      hierarquia no ClickUp não apaga de onde o criativo veio) + custom
 *      field "Copy & Direcionamento" + changelog.
 *   5. Status: "fazendo" -> "em aprovação".
 *
 * Isolado por criativo — igual às etapas anteriores.
 *
 * Uso:
 *   node run-copywriting.js <client> <date> [--dry-run] [--pick=@identificador]
 * (o <date> é a data do Lote/sondagem ORIGINAL — mesma usada em
 *  create-lote-de-conteudos.js / run-planning-modeling.js)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
const client = require('../../clickup/client');
const { createAdvancedDoc } = require('../../google-drive/advanced_docs');
const { loadMap, scanBenchmarkFolders } = require('./sync-benchmark-to-clickup');
const { reconcileTaskType } = require('./lote-builder');
const { buildVideoCopySections, buildDesignCopySections } = require('./copy-plan-builder');
const { COPY_FIELD_ID, CLIENT_DRIVE_FOLDER } = require('./_clickup_config');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const VIDEO_TYPES = new Set([1005, 1006]); // Vídeo Curto, Vídeo Longo
const DESIGN_TYPES = { 1020: 'carousel', 1021: 'single', 1022: 'single' }; // Carrocel, Post, Post de Texto

async function setStatus(taskId, status) {
    await client.put(`/task/${taskId}`, { status });
}

async function appendChangelog(taskId, line) {
    const task = await client.get(`/task/${taskId}`);
    const current = task.data.description || '';
    await client.put(`/task/${taskId}`, { description: `${current}\n- [copy] ${line}`.trim() });
}

function runPython(args, timeoutMs) {
    const res = spawnSync('python', args, { cwd: REPO_ROOT, encoding: 'utf8', timeout: timeoutMs });
    return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

async function ensureLoteFolder(clientSlug, loteName, cache) {
    if (cache[loteName]) return cache[loteName];
    const rootId = CLIENT_DRIVE_FOLDER[clientSlug];
    if (!rootId) throw new Error(`Sem pasta do Drive mapeada pra "${clientSlug}".`);
    const { drive } = require('../../google-drive/client');
    const safeName = loteName.replace(/'/g, "\\'");
    const q = `'${rootId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const found = await drive.files.list({ q, fields: 'files(id,name)' });
    if (found.data.files.length > 0) { cache[loteName] = found.data.files[0].id; return cache[loteName]; }
    const created = await drive.files.create({
        requestBody: { name: loteName, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] },
        fields: 'id',
    });
    cache[loteName] = created.data.id;
    return cache[loteName];
}

/** Vídeo: sem chamada nova — reempacota o Plano-de-Criativo.md já gerado na
 * etapa anterior (*planning-modeling). Ver header do arquivo. */
function copyVideo(clientSlug, benchmarkDir) {
    const slug = path.basename(benchmarkDir);
    const mdPath = path.join(REPO_ROOT, 'outputs', clientSlug, 'video-plans', slug, 'Plano-de-Criativo.md');
    if (!fs.existsSync(mdPath)) return { ok: false, reason: `Plano-de-Criativo.md não encontrado em ${mdPath} — rode *planning-modeling primeiro pra este criativo` };
    const md = fs.readFileSync(mdPath, 'utf-8');
    return { ok: true, sections: buildVideoCopySections(md), sourcePath: mdPath };
}

/** Carrocel/Post: recast_engine.py (copy final) + quality_gate.py (guardrails). */
function copyDesign(clientSlug, benchmarkDir, ctype) {
    const slug = path.basename(benchmarkDir);
    const prefix = ctype === 'single' ? 'brief-v5-single' : 'brief-v5';
    const briefPath = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data', `${prefix}-${slug}.yaml`);
    if (!fs.existsSync(briefPath)) {
        return { ok: false, reason: `brief não encontrado em ${briefPath} — rode *planning-modeling primeiro pra este criativo` };
    }

    const recast = runPython(['squads/virals-marketing-squad/scripts/recast_engine.py', briefPath.replace(`${REPO_ROOT}${path.sep}`, ''), `--client=${clientSlug}`], 20 * 60 * 1000);
    if (recast.status !== 0) {
        return { ok: false, reason: `recast_engine.py exit ${recast.status}: ${recast.stderr.slice(-500)}` };
    }

    const gate = runPython(['squads/virals-marketing-squad/scripts/quality_gate.py', briefPath.replace(`${REPO_ROOT}${path.sep}`, '')], 10 * 60 * 1000);
    if (gate.status !== 0) {
        return { ok: false, reason: `quality_gate.py exit ${gate.status}: ${gate.stderr.slice(-500)}` };
    }

    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    return { ok: true, sections: buildDesignCopySections(brief), sourcePath: briefPath };
}

async function run(clientSlug, date, dryRun, pick) {
    console.log(`\n=== Copywriting — ${clientSlug} · ${date} ${dryRun ? '(DRY RUN)' : ''} ===\n`);

    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);

    const statuses = await Promise.all(map.map((r) => client.get(`/task/${r.subtaskId}`).then((t) => t.data.status.status).catch(() => null)));
    let candidates = map.filter((_, i) => statuses[i] === 'para fazer');
    if (pick) candidates = candidates.filter((r) => r.identifier.includes(pick) || r.subtaskId === pick);
    console.log(`${candidates.length}/${map.length} criativo(s) em "para fazer" em Processo de Copywriting${pick ? ` (filtrado por --pick=${pick})` : ''}.`);
    if (candidates.length === 0) { console.log('\nNada a fazer.'); return; }

    if (dryRun) {
        candidates.forEach((r) => {
            const b = byUrl[r.url] && byUrl[r.url].benchmark;
            const t = b ? reconcileTaskType(b.type) : null;
            console.log(`  - ${r.identifier}: ${t ? t.typeName : '(sem benchmark/tipo desconhecido)'}`);
        });
        return;
    }

    const loteName = map[0].loteName;
    const folderCache = {};
    const results = [];

    for (const row of candidates) {
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

        try {
            await setStatus(row.subtaskId, 'fazendo');

            let copyResult;
            if (VIDEO_TYPES.has(typeId)) {
                console.log('  🎬 reempacotando script já pronto (sem chamada nova — vídeo não tem recast separado)...');
                copyResult = copyVideo(clientSlug, entry.dir);
            } else if (DESIGN_TYPES[typeId]) {
                console.log(`  ✍️  rodando recast_engine.py + quality_gate.py (${DESIGN_TYPES[typeId]})...`);
                copyResult = copyDesign(clientSlug, entry.dir, DESIGN_TYPES[typeId]);
            } else {
                copyResult = { ok: false, reason: `tipo "${t ? t.typeName : typeId}" sem engine de copy mapeado ainda` };
            }

            if (!copyResult.ok) {
                console.log(`  ❌ FALHA: ${copyResult.reason}`);
                results.push({ ...row, ok: false, reason: copyResult.reason });
                continue; // fica em "fazendo" — precisa de intervenção
            }

            const folderId = await ensureLoteFolder(clientSlug, loteName, folderCache);
            const title = `COPY · ${row.identifier} · ${row.platform}`;
            const doc = await createAdvancedDoc(title, copyResult.sections, folderId);
            console.log(`  📄 Copy & Direcionamento: ${doc.url}`);

            await client.post(`/task/${row.subtaskId}/field/${COPY_FIELD_ID}`, { value: doc.url });
            await appendChangelog(row.subtaskId, `copy pronta — ${doc.url}`);
            await setStatus(row.subtaskId, 'em aprovação');
            console.log('  ✅ status -> "em aprovação"');

            results.push({ ...row, ok: true, docUrl: doc.url });
        } catch (e) {
            console.log(`  ❌ ERRO: ${e.message}`);
            results.push({ ...row, ok: false, reason: e.message });
        }
    }

    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✓ Copy concluída: ${ok}/${results.length}`);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
        console.log(`⚠ Ficaram em "fazendo" (precisam de atenção): ${failed.map((r) => `${r.identifier} (${r.reason})`).join('; ')}`);
    }
    console.log(`${'═'.repeat(60)}\n`);
}

if (require.main === module) {
    const [, , clientSlug, date, ...rest] = process.argv;
    const dryRun = rest.includes('--dry-run');
    const pickArg = rest.find((a) => a.startsWith('--pick='));
    const pick = pickArg ? pickArg.replace('--pick=', '') : null;
    if (!clientSlug || !date) {
        console.error('Uso: node run-copywriting.js <client> <date> [--dry-run] [--pick=@identificador]');
        process.exit(1);
    }
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    run(clientSlug, date, dryRun, pick).catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { run, copyVideo, copyDesign };
