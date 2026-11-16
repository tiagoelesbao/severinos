#!/usr/bin/env node
/**
 * farm-doctor.js — Diagnóstico do Virals Farming Squad.
 *
 * Valida estrutura, contratos entre fases, ambiente e ferramentas externas.
 * É o "não há pendências" verificável: enquanto isto passa, o squad está íntegro.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-doctor.js
 *   node ... --verbose       detalha cada verificação
 *   node ... --session=ID    audita também os artefatos de uma sessão
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SQUAD_ROOT, '..', '..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });

const results = [];
let verbose = false;

function check(group, label, fn, opts = {}) {
    let ok = false;
    let detail = '';
    try {
        const r = fn();
        if (typeof r === 'object' && r !== null && 'ok' in r) {
            ok = r.ok;
            detail = r.detail || '';
        } else {
            ok = !!r;
        }
    } catch (e) {
        ok = false;
        detail = e.message;
    }
    results.push({ group, label, ok, detail, severity: opts.severity || 'blocking' });
    return ok;
}

function exists(rel) {
    return fs.existsSync(path.join(SQUAD_ROOT, rel));
}

function readYaml(rel) {
    return yaml.load(fs.readFileSync(path.join(SQUAD_ROOT, rel), 'utf8'));
}

// ---------------------------------------------------------------------------
// 1. Estrutura
// ---------------------------------------------------------------------------
function checkStructure() {
    const dirs = ['agents', 'tasks', 'workflows', 'templates', 'checklists', 'data', 'docs', 'scripts', 'config', 'tools'];
    for (const d of dirs) check('Estrutura', `diretório ${d}/`, () => exists(d));

    for (const f of ['squad.yaml', 'README.md', 'CHANGELOG.md']) {
        check('Estrutura', f, () => exists(f));
    }
}

// ---------------------------------------------------------------------------
// 2. Manifest e referências
// ---------------------------------------------------------------------------
function checkManifest() {
    let manifest;
    const loaded = check('Manifest', 'squad.yaml é YAML válido', () => {
        manifest = readYaml('squad.yaml');
        return !!manifest;
    });
    if (!loaded) return null;

    for (const k of ['name', 'version', 'author', 'entry_agent', 'slashPrefix']) {
        check('Manifest', `squad.${k}`, () => !!manifest.squad[k]);
    }
    check('Manifest', 'nome kebab-case', () => /^[a-z]+(-[a-z]+)*$/.test(manifest.squad.name));
    check('Manifest', 'slashPrefix camelCase', () => /^[a-z]+([A-Z][a-z]+)*$/.test(manifest.squad.slashPrefix));
    check('Manifest', 'workspace_integration.level canônico', () =>
        ['none', 'read_only', 'read_write', 'workspace_first'].includes(manifest.workspace_integration.level));
    check('Manifest', 'contrato de workspace completo', () =>
        !!(manifest.workspace_integration.rationale && manifest.workspace_integration.read_paths && manifest.workspace_integration.write_paths));

    for (const a of manifest.agents) {
        check('Manifest', `agente ${a.id}`, () => exists(a.file));
    }
    for (const ph of manifest.farming_pipeline.phases) {
        for (const t of ph.tasks || []) check('Manifest', `task ${ph.id}`, () => exists(t));
        for (const s of ph.scripts || []) check('Manifest', `script ${ph.id}`, () => exists(s));
        if (ph.checklist) check('Manifest', `checklist ${ph.id}`, () => exists(ph.checklist));
    }
    for (const w of manifest.farming_pipeline.workflows) check('Manifest', `workflow ${path.basename(w)}`, () => exists(w));
    for (const n of manifest.niches.available) check('Manifest', `nicho ${n.id}`, () => exists(n.file));

    if (manifest.farming_pipeline.orchestrator) {
        check('Manifest', 'orquestrador', () => exists(manifest.farming_pipeline.orchestrator.script));
    }
    for (const m of (manifest.phase_contracts && manifest.phase_contracts.shared_modules) || []) {
        check('Manifest', `módulo compartilhado ${path.basename(m)}`, () => exists(m));
    }
    return manifest;
}

// ---------------------------------------------------------------------------
// 3. Agentes
// ---------------------------------------------------------------------------
function checkAgents(manifest) {
    if (!manifest) return;
    const DIRS = { tasks: 'tasks', checklists: 'checklists', templates: 'templates', scripts: 'scripts', config: 'config', data: 'data', tools: 'tools' };

    for (const a of manifest.agents) {
        const body = fs.readFileSync(path.join(SQUAD_ROOT, a.file), 'utf8');
        const m = body.match(/```yaml\n([\s\S]*?)\n```/);
        if (!check('Agentes', `${a.id}: bloco YAML`, () => !!m)) continue;

        let doc;
        if (!check('Agentes', `${a.id}: YAML parseável`, () => { doc = yaml.load(m[1]); return !!doc; })) continue;

        const cmds = (doc.commands || []).map((c) => c.name);
        check('Agentes', `${a.id}: comandos help/guide/exit`, () =>
            ['help', 'guide', 'exit'].every((c) => cmds.includes(c)));
        check('Agentes', `${a.id}: persona e activation`, () =>
            !!(doc.persona && doc.persona_profile && doc['activation-instructions']));

        const broken = [];
        for (const [kind, list] of Object.entries(doc.dependencies || {})) {
            if (!DIRS[kind] || !Array.isArray(list)) continue;
            for (const f of list) if (!exists(path.join(DIRS[kind], f))) broken.push(`${kind}/${f}`);
        }
        check('Agentes', `${a.id}: dependências resolvem`, () =>
            ({ ok: broken.length === 0, detail: broken.join(', ') }));
    }
}

// ---------------------------------------------------------------------------
// 4. Scripts — sintaxe e módulos carregáveis
// ---------------------------------------------------------------------------
function checkScripts() {
    const scriptsDir = path.join(SQUAD_ROOT, 'scripts');
    const files = [];
    (function walk(d) {
        if (!fs.existsSync(d)) return;
        for (const f of fs.readdirSync(d)) {
            const p = path.join(d, f);
            if (fs.statSync(p).isDirectory()) walk(p);
            else if (f.endsWith('.js')) files.push(p);
        }
    })(scriptsDir);

    for (const f of files) {
        const rel = path.relative(SQUAD_ROOT, f).replace(/\\/g, '/');
        check('Scripts', `${rel}: sintaxe`, () => {
            const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8', windowsHide: true });
            return { ok: r.status === 0, detail: (r.stderr || '').split('\n')[0] };
        });
    }

    // Módulos compartilhados precisam carregar e expor a API que as fases usam.
    const api = {
        '_niche-loader.js': ['parseArgs', 'todayISO', 'loadNiche', 'listNiches', 'slug', 'resolveSessionDir', 'findLatestSession'],
        '_pack.js': ['resolveSession', 'listPacks', 'packPaths', 'writeSlots', 'verifySlots', 'saveManifest'],
        '_quota-ledger.js': ['resolveProviderChain', 'recordSuccess', 'recordExhausted', 'preferredTierForNiche'],
        '_tiktok-source.js': ['discoverByProfile', 'discoverByHashtag', 'resolveYtdlp'],
        '_tiktok-fetch.js': ['fetchCreative', 'captureViaBrowser'],
        '_vision.js': ['analyze', 'callOpenRouter', 'status'],
        '_editspec.js': ['buildTimeline'],
    };
    for (const [file, fns] of Object.entries(api)) {
        if (!exists(path.join('scripts', file))) continue;
        check('Scripts', `${file}: API exportada`, () => {
            const mod = require(path.join(SQUAD_ROOT, 'scripts', file));
            const missing = fns.filter((fn) => typeof mod[fn] !== 'function');
            return { ok: missing.length === 0, detail: missing.length ? `faltam: ${missing.join(', ')}` : '' };
        });
    }
}

// ---------------------------------------------------------------------------
// 5. Motores das fases
// ---------------------------------------------------------------------------
function checkEngines() {
    const engines = [
        ['F1 garimpo', 'farm-monitor.js'],
        ['F2 benchmark', 'farm-benchmark.js'],
        ['F3 modelagem', 'farm-model.js'],
        ['F4 imagens', 'farm-images.js'],
        ['F5 takes', 'farm-takes.js'],
        ['F6 montagem', 'farm-assemble.js'],
        ['orquestrador', 'farm-run.js'],
    ];
    for (const [label, file] of engines) {
        check('Motores', `${label} (${file})`, () => exists(path.join('scripts', file)));
    }
}

// ---------------------------------------------------------------------------
// 6. Nichos
// ---------------------------------------------------------------------------
function checkNiches() {
    const dir = path.join(SQUAD_ROOT, 'data', 'niches');
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.yaml'))) {
        const id = path.basename(f, '.yaml');
        check('Nichos', `${id}: YAML válido`, () => !!readYaml(path.join('data', 'niches', f)));
        const doc = readYaml(path.join('data', 'niches', f));
        check('Nichos', `${id}: hashtags seed`, () => (doc.discovery.hashtags || []).length > 0);
        check('Nichos', `${id}: cutoff próprio`, () => !!doc.cutoff);
        check('Nichos', `${id}: guardrails com regras`, () => (doc.guardrails.rules || []).length > 0);
        check('Nichos', `${id}: estilo de legenda`, () => !!doc.modeling.caption_style);
        check('Nichos', `${id}: visual_style`, () => !!doc.modeling.visual_style);
    }
}

// ---------------------------------------------------------------------------
// 7. Ambiente e ferramentas externas
// ---------------------------------------------------------------------------
function checkEnvironment() {
    const ytdlp = [
        path.join(REPO_ROOT, 'services/ETL/bin/yt-dlp.exe'),
        path.join(REPO_ROOT, 'services/ETL/yt-dlp_win/yt-dlp.exe'),
    ].find((p) => fs.existsSync(p));
    check('Ambiente', 'yt-dlp disponível', () => ({ ok: !!ytdlp, detail: ytdlp || 'não encontrado' }));

    if (ytdlp) {
        check('Ambiente', 'yt-dlp responde', () => {
            const r = spawnSync(ytdlp, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
            return { ok: r.status === 0, detail: (r.stdout || '').trim() };
        });
    }

    for (const [label, rel] of [['ffmpeg', 'services/ETL/yt-dlp_win/ffmpeg.exe'], ['ffprobe', 'services/ETL/yt-dlp_win/ffprobe.exe']]) {
        const p = path.join(REPO_ROOT, rel);
        check('Ambiente', `${label} disponível`, () => {
            if (fs.existsSync(p)) return { ok: true, detail: 'local' };
            const r = spawnSync(label, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
            return { ok: r.status === 0, detail: 'PATH' };
        });
    }

    check('Ambiente', 'playwright instalado', () => {
        try { require.resolve('playwright'); return true; } catch (_) { return false; }
    });

    check('Ambiente', 'sessão TikTok presente', () => {
        const p = path.join(REPO_ROOT, 'services/ETL/Extract/auth/tiktok_session.json');
        if (!fs.existsSync(p)) return { ok: false, detail: 'rode services/ETL/Extract/scrapers/tt-login.js' };
        const s = JSON.parse(fs.readFileSync(p, 'utf8'));
        const n = (s.cookies || []).length;
        return { ok: n > 0, detail: `${n} cookies` };
    }, { severity: 'warning' });

    // Credenciais: ausência NÃO é falha — a cascata cai para o degrau sem chave.
    const cfg = readYaml('config/ai-providers.yaml');
    const envs = new Set();
    for (const kind of ['image', 'video']) {
        for (const tier of cfg[kind].tiers) for (const p of tier.providers) if (p.auth_env) envs.add(p.auth_env);
    }
    for (const e of envs) {
        check('Ambiente', `credencial ${e}`, () => ({
            ok: !!String(process.env[e] || '').trim(),
            detail: String(process.env[e] || '').trim() ? 'presente' : 'ausente (cascata rebaixa)',
        }), { severity: 'warning' });
    }

    check('Ambiente', 'degrau final de imagem sem chave', () => {
        const c = readYaml('config/ai-providers.yaml');
        const last = c.image.tiers[c.image.tiers.length - 1];
        return last.providers.some((p) => !p.auth_env);
    });
    check('Ambiente', 'degrau final de vídeo sem chave', () => {
        const c = readYaml('config/ai-providers.yaml');
        const last = c.video.tiers[c.video.tiers.length - 1];
        return last.providers.some((p) => !p.auth_env);
    });
}

// ---------------------------------------------------------------------------
// 8. Auditoria opcional de uma sessão
// ---------------------------------------------------------------------------
function checkSession(sessionId, date) {
    const L = require(path.join(SQUAD_ROOT, 'scripts', '_niche-loader.js'));
    const dir = path.join(L.OUTPUT_ROOT, date, sessionId);
    if (!check('Sessão', `${sessionId} existe`, () => fs.existsSync(dir))) return;

    const P = require(path.join(SQUAD_ROOT, 'scripts', '_pack.js'));
    const session = { id: sessionId, dir, manifestPath: path.join(dir, 'session.json') };
    const packs = P.listPacks(session);

    check('Sessão', 'tem packs de benchmark', () => ({ ok: packs.length > 0, detail: `${packs.length} pack(s)` }));

    for (const p of packs) {
        const label = `rank ${p.rank} @${p.handle}`;
        check('Sessão', `${label}: assets em disco`, () => ({
            ok: p.diskComplete,
            detail: [
                p.hasVideo ? null : 'sem vídeo',
                p.hasAudio ? null : 'sem áudio',
                p.frames.length ? null : 'sem frames',
                p.hasAudioDescription ? null : 'sem descrição de áudio',
            ].filter(Boolean).join(', '),
        }));
        // Status declarado x realidade do disco: a divergência é o bug clássico.
        check('Sessão', `${label}: status bate com o disco`, () => ({
            ok: !(p.status === 'complete' && !p.diskComplete),
            detail: p.status === 'complete' && !p.diskComplete ? 'declara complete mas faltam assets' : '',
        }));
    }
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
function report() {
    const groups = [...new Set(results.map((r) => r.group))];
    let blockingFail = 0;
    let warnFail = 0;

    console.log(`\n${'═'.repeat(66)}`);
    console.log(`  🩺 FARM DOCTOR · Virals Farming Squad`);
    console.log(`${'═'.repeat(66)}`);

    for (const g of groups) {
        const rows = results.filter((r) => r.group === g);
        const bad = rows.filter((r) => !r.ok);
        const icon = bad.length === 0 ? '✅' : bad.every((r) => r.severity === 'warning') ? '⚠️ ' : '❌';
        console.log(`\n${icon} ${g}  (${rows.length - bad.length}/${rows.length})`);

        for (const r of rows) {
            if (r.ok && !verbose) continue;
            const mark = r.ok ? '  ✓' : r.severity === 'warning' ? '  ⚠' : '  ✗';
            console.log(`${mark} ${r.label}${r.detail ? `  — ${r.detail}` : ''}`);
        }
        blockingFail += bad.filter((r) => r.severity === 'blocking').length;
        warnFail += bad.filter((r) => r.severity === 'warning').length;
    }

    console.log(`\n${'═'.repeat(66)}`);
    const total = results.length;
    const passed = results.filter((r) => r.ok).length;
    console.log(`  ${passed}/${total} verificações passaram`);
    if (blockingFail > 0) console.log(`  ❌ ${blockingFail} falha(s) bloqueante(s)`);
    if (warnFail > 0) console.log(`  ⚠️  ${warnFail} aviso(s) — não impedem o pipeline`);
    if (blockingFail === 0) console.log(`  ✅ Squad íntegro.`);
    console.log(`${'═'.repeat(66)}\n`);

    return blockingFail;
}

// ---------------------------------------------------------------------------
(function main() {
    const args = process.argv.slice(2);
    verbose = args.includes('--verbose');
    const sessionArg = args.find((a) => a.startsWith('--session='));
    const dateArg = args.find((a) => a.startsWith('--date='));

    checkStructure();
    const manifest = checkManifest();
    checkAgents(manifest);
    checkScripts();
    checkEngines();
    checkNiches();
    checkEnvironment();

    if (sessionArg) {
        const date = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
        checkSession(sessionArg.split('=')[1], date);
    }

    process.exit(report() > 0 ? 1 : 0);
})();
