#!/usr/bin/env node
/**
 * Run Planning Modeling — *planning-modeling.
 *
 * Extrai a FASE DE MODELAGEM que já existia embutida dentro de
 * *industrialize-video (Fase A) e *design-creative (Etapas 1-3) como um
 * estágio próprio do pipeline ClickUp, acionado depois que um Lote é
 * aprovado em Máquina de Idéias e a automação nativa do ClickUp migra os
 * cards pra Planejamento & Cronogramas em "Para Fazer".
 *
 * Por criativo (subtask "para fazer" que também está no
 * _lote-clickup-map-{date}.json do cliente/data):
 *   1. Reconcilia custom_item_id via Benchmark.json — a automação de
 *      migração do ClickUp RESETA o tipo pro default da lista
 *      ("Planejamento") ao mover o card (gotcha confirmado 2026-08-17).
 *      Sem isso, o roteamento por formato abaixo rotearia tudo errado.
 *   2. Status: "para fazer" -> "fazendo".
 *   3. Roteia por formato (o benchmark é a bússola, não é copiado — vira
 *      referência de estrutura/hook/gancho pra uma peça autoral):
 *        Vídeo Curto/Longo -> video_plan.py (Fase A, já existente e testada
 *          em produção via *industrialize-video)         -> Plano-de-Criativo.md
 *        Carrocel/Post/Post de Texto -> design_creative.py --plan-only (NOVO,
 *          para depois da Etapa 3/plan_creative)          -> brief-v5-*.yaml
 *   4. Espelha o plano num Google Doc (pasta do Lote no Drive do cliente,
 *      mesmo padrão do sync-benchmark-to-clickup.js) + custom field
 *      "Plano de Modelagem" (url) + changelog na descrição.
 *   5. Status: "fazendo" -> "em aprovação" — founder decide os próximos
 *      passos (handoff pra Copywriting é a etapa seguinte, ainda não
 *      implementada aqui de propósito).
 *
 * Isolado por criativo — um plano bloqueado pelo gate de fidelidade (vídeo)
 * ou uma falha do design_creative NÃO derruba o resto do batch.
 *
 * Uso:
 *   node run-planning-modeling.js <client> <date> [--dry-run]
 * (o <date> é a data do Lote/sondagem original — de onde vem o
 *  _lote-clickup-map-{date}.json e a pasta benchmark/ correspondente)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
const client = require('../../clickup/client');
const { createAdvancedDoc } = require('../../google-drive/advanced_docs');
const { loadMap, scanBenchmarkFolders } = require('./sync-benchmark-to-clickup');
const { reconcileTaskType } = require('./lote-builder');
const { buildVideoModelingSections, buildDesignModelingSections } = require('./modeling-plan-builder');
const { PLANO_MODELAGEM_FIELD_ID, CLIENT_DRIVE_FOLDER } = require('./_clickup_config');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const VIDEO_TYPES = new Set([1005, 1006]); // Vídeo Curto, Vídeo Longo
const DESIGN_TYPES = { 1020: 'carousel', 1021: 'single', 1022: 'single' }; // Carrocel, Post, Post de Texto

async function setStatus(taskId, status) {
    await client.put(`/task/${taskId}`, { status });
}

async function appendChangelog(taskId, line) {
    const task = await client.get(`/task/${taskId}`);
    const current = task.data.description || '';
    await client.put(`/task/${taskId}`, { description: `${current}\n- [plano] ${line}`.trim() });
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

/** Vídeo Curto/Longo: video_plan.py (Fase A do *industrialize-video). */
function planVideo(benchmarkDir, clientSlug, platform) {
    const slug = path.basename(benchmarkDir);
    const args = [
        'squads/virals-marketing-squad/scripts/video_plan.py', benchmarkDir,
        `--client=${clientSlug}`, `--bench-platform=${platform}`,
    ];
    const res = runPython(args, 30 * 60 * 1000);
    if (res.status === 2) {
        return { ok: false, blocked: true, reason: 'gate de fidelidade/vídeo reprovou (ver stdout)', stdout: res.stdout };
    }
    if (res.status !== 0) {
        return { ok: false, blocked: false, reason: `exit ${res.status}: ${res.stderr.slice(-500)}`, stdout: res.stdout };
    }
    const mdPath = path.join(REPO_ROOT, 'outputs', clientSlug, 'video-plans', slug, 'Plano-de-Criativo.md');
    if (!fs.existsSync(mdPath)) return { ok: false, blocked: false, reason: 'exit 0 mas Plano-de-Criativo.md não foi encontrado', stdout: res.stdout };
    const md = fs.readFileSync(mdPath, 'utf-8');
    return { ok: true, sections: buildVideoModelingSections(md), sourcePath: mdPath };
}

/** Carrocel/Post: design_creative.py --plan-only (novo, para na Etapa 3). */
function planDesign(benchmarkDir, clientSlug, platform, ctype) {
    const args = [
        'squads/virals-marketing-squad/scripts/design_creative.py', benchmarkDir, ctype,
        `--client=${clientSlug}`, `--bench-platform=${platform}`, '--plan-only',
    ];
    const res = runPython(args, 20 * 60 * 1000);
    if (res.status !== 0) {
        return { ok: false, blocked: false, reason: `exit ${res.status}: ${res.stderr.slice(-500)}`, stdout: res.stdout };
    }
    const m = res.stdout.match(/BRIEF_PATH=(.+)/);
    if (!m) return { ok: false, blocked: false, reason: 'exit 0 mas BRIEF_PATH não apareceu no stdout', stdout: res.stdout };
    const briefPath = path.join(REPO_ROOT, m[1].trim());
    if (!fs.existsSync(briefPath)) return { ok: false, blocked: false, reason: `brief não encontrado em ${briefPath}`, stdout: res.stdout };
    const brief = yaml.load(fs.readFileSync(briefPath, 'utf-8'));
    return { ok: true, sections: buildDesignModelingSections(brief), sourcePath: briefPath };
}

async function run(clientSlug, date, dryRun, pick) {
    console.log(`\n=== Planning Modeling — ${clientSlug} · ${date} ${dryRun ? '(DRY RUN)' : ''} ===\n`);

    const map = loadMap(clientSlug, date);
    const byUrl = scanBenchmarkFolders(clientSlug, date);

    // Só processa quem ainda NÃO tem plano em Planejamento & Cronogramas
    // AGORA. A automação de migração do approve-lote preserva o status
    // (chegam em "em aprovação", não "para fazer"), então o candidato é
    // "para fazer" OU "em aprovação" SEM o campo "Plano de Modelagem" ainda
    // preenchido — esse campo é o marcador de idempotência real (quem já
    // passou por aqui está em "fazendo"/"em aprovação" COM plano).
    const tasks = await Promise.all(map.map((r) => client.get(`/task/${r.subtaskId}`).then((t) => t.data).catch(() => null)));
    let candidates = map.filter((_, i) => {
        const t = tasks[i];
        if (!t) return false;
        if (!['para fazer', 'em aprovação'].includes(t.status.status)) return false;
        const plano = (t.custom_fields || []).find((f) => f.id === PLANO_MODELAGEM_FIELD_ID);
        return !plano || !plano.value;
    });
    if (pick) candidates = candidates.filter((r) => r.identifier.includes(pick) || r.subtaskId === pick);
    console.log(`${candidates.length}/${map.length} criativo(s) em Planejamento & Cronogramas sem plano de modelagem${pick ? ` (filtrado por --pick=${pick})` : ''}.`);
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

            let planResult;
            if (VIDEO_TYPES.has(typeId)) {
                console.log('  🎬 rodando video_plan.py (Fase A)...');
                planResult = planVideo(entry.dir, clientSlug, row.platform);
            } else if (DESIGN_TYPES[typeId]) {
                console.log(`  🎨 rodando design_creative.py --plan-only (${DESIGN_TYPES[typeId]})...`);
                planResult = planDesign(entry.dir, clientSlug, row.platform, DESIGN_TYPES[typeId]);
            } else {
                planResult = { ok: false, blocked: false, reason: `tipo "${t ? t.typeName : typeId}" sem engine de modelagem mapeado ainda` };
            }

            if (!planResult.ok) {
                console.log(`  ❌ ${planResult.blocked ? 'BLOQUEADO' : 'FALHA'}: ${planResult.reason}`);
                results.push({ ...row, ok: false, reason: planResult.reason });
                continue; // fica em "fazendo" — precisa de intervenção, não é "em aprovação"
            }

            const folderId = await ensureLoteFolder(clientSlug, loteName, folderCache);
            const title = `PLANO · ${row.identifier} · ${row.platform}`;
            const doc = await createAdvancedDoc(title, planResult.sections, folderId);
            console.log(`  📄 Plano de Modelagem: ${doc.url}`);

            await client.post(`/task/${row.subtaskId}/field/${PLANO_MODELAGEM_FIELD_ID}`, { value: doc.url });
            await appendChangelog(row.subtaskId, `plano de modelagem pronto — ${doc.url}`);
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
    console.log(`✓ Planos concluídos: ${ok}/${results.length}`);
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
        console.error('Uso: node run-planning-modeling.js <client> <date> [--dry-run] [--pick=@identifier]');
        process.exit(1);
    }
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    run(clientSlug, date, dryRun, pick).catch((e) => {
        console.error('ERRO:', e.message, e.response && e.response.data);
        process.exitCode = 1;
    });
}

module.exports = { run, planVideo, planDesign };
