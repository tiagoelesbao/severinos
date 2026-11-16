#!/usr/bin/env node
/**
 * farm-takes.js — F5 Geração de Takes de Vídeo · Virals Farming Squad
 *
 * Anima cada imagem (pack/images/take-N.png) no movimento que o beat pede,
 * seguindo a cascata free-first de config/ai-providers.yaml (tier A → B → C).
 *
 * O TIER C (parallax procedural via ffmpeg) É O DEGRAU GARANTIDO: nunca falha,
 * não consome cota, e nos nichos religioso/cartomante é a estética NATIVA do
 * formato, não um fallback. Todo take termina em disco, validado por ffprobe —
 * nunca reportado como pronto só porque o adapter respondeu `ok:true`.
 *
 * PRÉ-CONDIÇÃO TERMINAL: se `images/_slots.json` acusa imagens faltando para um
 * pack, esse pack é BLOQUEADO (não avança) — gerar take sem imagem não é uma
 * opção. Outros packs do mesmo lote continuam normalmente.
 *
 * PARIDADE auto/híbrido: os dois modos produzem exatamente a mesma árvore de
 * arquivos em takes/ — a F6 não sabe (nem precisa saber) qual modo gerou os mp4s.
 *
 * Uso:
 *   node farm-takes.js --niche=religioso --top=5
 *   node farm-takes.js --niche=pet --ranks=1,3 --tier=A
 *   node farm-takes.js --niche=cartomante --procedural         (força tier C, sem cota)
 *   node farm-takes.js --niche=X --mode=hybrid                 (gera prompts-para-colar, para)
 *   node farm-takes.js --niche=X --mode=hybrid --verify         (confere o que já foi colado)
 *   node farm-takes.js --niche=X --dry-run                     (simula a cascata, não gera nada)
 *
 * Flags:
 *   --niche=ID        nicho (obrigatório, salvo com --session)
 *   --session=ID      sessão da F1; default: a mais recente do nicho na data
 *   --date=YYYY-MM-DD data da sessão                       (default: hoje)
 *   --ranks=1,3       escolhe ranks específicos do benchmark
 *   --top=N           limita aos N primeiros ranks          (default: todos)
 *   --mode=auto|hybrid                                       (default: auto)
 *   --tier=A|B|C      força o tier inicial da cascata (por cima da preferência do nicho)
 *   --procedural      força o tier C direto, sem cascata e SEM consumir cota
 *   --dry-run         resolve e loga a cascata por take, sem gerar nem gravar nada
 *   --verify          confere takes/_slots.json contra o disco, não gera nada
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const Q = require('./_quota-ledger.js');

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

// Requerido estaticamente (não dinamicamente) porque também precisamos da lista
// de presets válidos para validar modeling.json antes de entrar na cascata. O
// module cache do Node garante que é a MESMA instância usada pelo loadAdapter().
const ProceduralAdapter = require('./adapters/video/procedural.js');
const MOTION_PRESETS = ProceduralAdapter.MOTION_PRESETS;

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const DURATION_TOLERANCE_S = 0.15; // acceptance criteria: "duração conforme o plano"

function loadAdapter(relPath) {
    // relPath vem de config/ai-providers.yaml (`adapter: adapters/video/x.js`),
    // relativo a scripts/ — que é __dirname deste próprio arquivo.
    return require(path.join(__dirname, relPath));
}

function ffprobeBin() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

/**
 * Valida um mp4 gerado contra o contrato de aceite: 9:16, duração do plano
 * (±0.15s), h264. Chamado para TODOS os tiers (A, B e C) — a cascata não confia
 * cegamente no `ok:true` de nenhum adapter.
 */
function validateTake(filePath, expectedDuration) {
    if (!fs.existsSync(filePath)) return { ok: false, issues: ['arquivo não existe em disco'] };

    const r = spawnSync(
        ffprobeBin(),
        [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-show_entries', 'stream=width,height,codec_name',
            '-of', 'default=nw=1',
            filePath,
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 }
    );
    if (r.status !== 0) return { ok: false, issues: [`ffprobe falhou: ${(r.stderr || '').slice(-200)}`] };

    const out = r.stdout || '';
    const num = (key) => {
        const m = out.match(new RegExp(`${key}=([\\d.]+)`));
        return m ? Number(m[1]) : null;
    };
    const codecMatch = out.match(/codec_name=(\S+)/);
    const duration = num('duration');
    const width = num('width');
    const height = num('height');
    const codec = codecMatch ? codecMatch[1] : null;

    const issues = [];
    if (!duration) issues.push('duração ilegível pelo ffprobe');
    else if (Math.abs(duration - expectedDuration) > DURATION_TOLERANCE_S) {
        issues.push(`duração ${duration}s fora do plano (esperado ${expectedDuration}s, tolerância ±${DURATION_TOLERANCE_S}s)`);
    }
    if (width !== OUTPUT_WIDTH || height !== OUTPUT_HEIGHT) {
        issues.push(`dimensões ${width}x${height} (esperado ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT})`);
    }
    if (codec !== 'h264') issues.push(`codec "${codec}" (esperado h264)`);

    return { ok: issues.length === 0, duration, width, height, codec, issues };
}

/** Duração do take: a fonte de verdade é o plano (F3). Só cai pro default do YAML se ausente/inválida. */
function resolveDuration(take, videoCfg) {
    const d = Number(take.duration);
    if (Number.isFinite(d) && d > 0) return d;
    return (videoCfg && videoCfg.take_duration_seconds && videoCfg.take_duration_seconds.default) || 5;
}

/** Preset ausente/inválido no modeling.json: fallback por função do beat (nunca silencioso). */
function fallbackPreset(role) {
    const r = String(role || '').toLowerCase();
    if (r.includes('hook') || r.includes('abertura')) return 'slow-push-in';
    if (r.includes('fech') || r.includes('clos') || r.includes('encerr')) return 'slow-pull-out';
    if (r.includes('pan')) return 'pan-lr';
    return 'breathing';
}

/** Chama generate() e valida o resultado com ffprobe. Um `ok:true` do adapter não é aceito sem essa checagem. */
async function tryCandidate(adapter, params, outputPath, duration) {
    let res;
    try {
        res = await adapter.generate(params);
    } catch (e) {
        return { ok: false, reason: `exceção: ${e.message}` };
    }
    if (!res.ok) return res;

    const validation = validateTake(outputPath, duration);
    if (!validation.ok) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
        return { ok: false, reason: `arquivo gerado mas reprovado na validação: ${validation.issues.join('; ')}` };
    }
    return { ok: true, validation, meta: res.meta };
}

/**
 * Gera um take em modo auto: percorre a cascata A → B → C, rebaixando em
 * `quotaExceeded` e tentando 1 retry em erro transitório (contrato do tool).
 * O tier C SEMPRE resolve — se este loop chegar ao fim sem sucesso, é bug de
 * configuração (ex.: ffmpeg quebrado), reportado como falha crítica, nunca oculto.
 */
async function generateTakeAuto(take, ctx) {
    const { niche, paths, args, providersCfg } = ctx;
    const n = take.n;
    const file = `take-${n}.mp4`;
    const outputPath = path.join(paths.takes, file);
    const inputImage = path.join(paths.images, `take-${n}.png`);
    const duration = resolveDuration(take, providersCfg.video);

    let preset = take.procedural_preset;
    if (!MOTION_PRESETS.includes(preset)) {
        const fb = fallbackPreset(take.role);
        console.log(`    ⚠️  take ${n}: procedural_preset "${preset}" ausente/inválido no modeling.json — usando fallback "${fb}" pela função "${take.role || '?'}"`);
        preset = fb;
    }

    if (args['dry-run']) {
        const startTier = args.tier || Q.preferredTierForNiche('video', niche.id) || null;
        const chain = args.procedural
            ? [{ id: 'procedural-motion', tier: 'C' }]
            : Q.resolveProviderChain('video', startTier);
        const planStr = chain.map((c) => `${c.id}(${c.tier})${c._available === false ? ' [indisponível]' : ''}`).join(' → ') || '(cadeia vazia)';
        console.log(`    [dry-run] take ${n} (${take.role || '?'}, ${duration}s, preset=${preset}) → ${planStr}`);
        return { n, file, status: 'planned', preset, duration };
    }

    // --procedural: bypass total da cascata e do ledger — "sem consumir cota" (per task spec).
    if (args.procedural) {
        const adapter = loadAdapter('adapters/video/procedural.js');
        const params = { inputImage, preset, durationSeconds: duration, outputPath, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
        const res = await tryCandidate(adapter, params, outputPath, duration);
        if (res.ok) return { n, file, status: 'ok', provider: 'procedural-motion', tier: 'C', preset, duration: res.validation.duration };
        return { n, file, status: 'failed', preset, duration, reason: res.reason };
    }

    const startTier = args.tier || Q.preferredTierForNiche('video', niche.id) || null;
    const chain = Q.resolveProviderChain('video', startTier);

    if (chain.length === 0) {
        // Não deveria ocorrer — tier C não exige credencial. Se ocorrer é bug de
        // config; ainda assim caímos no degrau garantido em vez de falhar o take.
        console.log(`    🚫 take ${n}: cadeia de providers vazia (verifique config/ai-providers.yaml) — caindo direto para o procedural`);
        const adapter = loadAdapter('adapters/video/procedural.js');
        const params = { inputImage, preset, durationSeconds: duration, outputPath, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
        const res = await tryCandidate(adapter, params, outputPath, duration);
        if (res.ok) return { n, file, status: 'ok', provider: 'procedural-motion', tier: 'C', preset, duration: res.validation.duration };
        return { n, file, status: 'failed', preset, duration, reason: res.reason };
    }

    for (const candidate of chain) {
        if (candidate._available === false) {
            console.log(`    ⏭️  ${candidate.id} (tier ${candidate.tier}) indisponível: ${candidate._reason}`);
            continue;
        }

        let adapter;
        try {
            adapter = loadAdapter(candidate.adapter);
        } catch (e) {
            console.log(`    ⚠️  ${candidate.id}: falha ao carregar adapter (${e.message})`);
            continue;
        }

        let chk;
        try {
            chk = await adapter.check();
        } catch (e) {
            chk = { available: false, reason: `check() lançou exceção: ${e.message}` };
        }
        if (!chk.available) {
            console.log(`    ⏭️  ${candidate.id} (tier ${candidate.tier}) indisponível: ${chk.reason}`);
            continue;
        }

        const params = { inputImage, prompt: take.motion_prompt, durationSeconds: duration, outputPath, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
        if (candidate.tier === 'C') params.preset = preset;

        let res = await tryCandidate(adapter, params, outputPath, duration);

        if (!res.ok && !res.quotaExceeded) {
            // Erro transitório (inclui falha de validação pós-geração): 1 retry, depois rebaixa.
            console.log(`    ⚠️  ${candidate.id} (tier ${candidate.tier}): ${res.reason} — retry único`);
            Q.recordError(candidate.id, res.reason);
            res = await tryCandidate(adapter, params, outputPath, duration);
        }

        if (res.ok) {
            Q.recordSuccess(candidate.id);
            return { n, file, status: 'ok', provider: candidate.id, tier: candidate.tier, preset: candidate.tier === 'C' ? preset : undefined, duration: res.validation.duration };
        }
        if (res.quotaExceeded) {
            Q.recordExhausted(candidate.id, 'quota_exceeded');
            console.log(`    📉 ${candidate.id} (tier ${candidate.tier}): cota esgotada — rebaixando`);
            continue;
        }
        Q.recordError(candidate.id, res.reason);
        console.log(`    ❌ ${candidate.id} (tier ${candidate.tier}): retry também falhou (${res.reason}) — rebaixando`);
    }

    return {
        n, file, status: 'failed', preset, duration,
        reason: 'todos os tiers falharam, incluindo o procedural (degrau garantido) — investigar como falha crítica de infraestrutura',
    };
}

/** Modo híbrido: escreve prompts + slots, NÃO chama nenhuma API. Mesma árvore de arquivos que o auto produzirá depois. */
function buildHybridArtifacts(pack, paths, takes, providersCfg, session) {
    const hybridTargets = (providersCfg.video && providersCfg.video.hybrid_targets) || [];

    let md = `# Prompts de Animação para Colar — @${pack.handle} (rank ${pack.rank})\n\n`;
    md += `Sessão: ${session.id}\n\n`;
    if (hybridTargets.length) {
        md += `## Ferramentas sugeridas\n\n`;
        for (const t of hybridTargets) md += `- **${t.label}**: ${t.url}\n`;
        md += `\n`;
    }
    md += `---\n\n`;

    for (const take of takes) {
        md += `## Take ${take.n} — ${take.role || 'sem função definida'} (${take.duration || '?'}s)\n\n`;
        md += `**Imagem:** \`images/take-${take.n}.png\`\n\n`;
        md += `**Prompt de movimento:**\n> ${take.motion_prompt || '(sem prompt no modeling.json — preencha manualmente a partir do beat)'}\n\n`;
        const presetHint = take.procedural_preset || '(nenhum sugerido pela F3 — escolha o preset mais próximo do movimento acima)';
        md += `Preset de referência: \`${presetHint}\`\n\n`;
        md += `Salve o resultado em \`takes/take-${take.n}.mp4\` (9:16, ${take.duration || '3-6'}s).\n\n---\n\n`;
    }

    fs.mkdirSync(paths.takes, { recursive: true });
    fs.writeFileSync(path.join(paths.takes, '_prompts-para-colar.md'), md);

    const expected = takes.map((t) => ({ take: t.n, file: `take-${t.n}.mp4`, status: 'pending' }));
    P.writeSlots(paths.takes, 'hybrid', expected);

    console.log(`    📝 híbrido: prompts em takes/_prompts-para-colar.md — aguardando ${expected.length} arquivo(s) manual(is)`);
    return { rank: pack.rank, handle: pack.handle, status: 'hybrid_pending', total: takes.length };
}

async function processPack(pack, ctx) {
    const { niche, args, session, providersCfg } = ctx;
    const paths = P.packPaths(pack.dir);
    const label = `[${pack.rank}] @${pack.handle}`;

    if (!fs.existsSync(paths.modelingJson)) {
        console.log(`\n${label} — ⏭️  pulado: modeling.json ausente (rode @farming-modeler *plan primeiro — F3)`);
        return { rank: pack.rank, handle: pack.handle, status: 'skipped', reason: 'modeling.json ausente' };
    }

    let modeling;
    try {
        modeling = JSON.parse(fs.readFileSync(paths.modelingJson, 'utf8'));
    } catch (e) {
        console.log(`\n${label} — ❌ modeling.json inválido: ${e.message}`);
        return { rank: pack.rank, handle: pack.handle, status: 'blocked', reason: `modeling.json inválido: ${e.message}` };
    }

    const takes = modeling.takes || [];
    if (takes.length === 0) {
        console.log(`\n${label} — ⚠️  modeling.json não declara nenhum take`);
        return { rank: pack.rank, handle: pack.handle, status: 'skipped', reason: 'sem takes no modeling.json' };
    }

    // --- PRÉ-CONDIÇÃO TERMINAL: imagens completas conforme images/_slots.json ---
    const imgVerify = P.verifySlots(paths.images);
    if (!imgVerify.ok) {
        const missingList = (imgVerify.missing || []).map((m) => m.file).join(', ');
        const detail = imgVerify.reason || `faltando: ${missingList || '(nenhum arquivo presente)'}`;
        console.log(`\n${label} — 🚫 BLOQUEADO: imagens incompletas antes da F5 (${detail})`);
        P.appendDegraded(session, {
            phase: 'f5_takes',
            label,
            status: 'blocked',
            issues: [`pré-condição falhou — imagens incompletas: ${detail}. Rode @farming-imager (F4) antes.`],
        });
        return { rank: pack.rank, handle: pack.handle, status: 'blocked', reason: 'imagens incompletas', detail };
    }

    console.log(`\n${label} — ${takes.length} take(s)`);
    fs.mkdirSync(paths.takes, { recursive: true });

    if (args.verify) {
        const v = P.verifySlots(paths.takes);
        console.log(`    verify: ${v.present.length} presente(s), ${v.missing.length} faltando`);
        for (const m of v.missing) console.log(`      ⏳ ${m.file}`);
        return { rank: pack.rank, handle: pack.handle, status: v.ok ? 'verified_complete' : 'verified_incomplete', present: v.present.length, missing: v.missing.length };
    }

    const mode = args.mode || 'auto';
    if (mode === 'hybrid') {
        return buildHybridArtifacts(pack, paths, takes, providersCfg, session);
    }

    // --- Modo auto ---
    if (!args['dry-run']) {
        P.writeSlots(paths.takes, 'auto', takes.map((t) => ({ take: t.n, file: `take-${t.n}.mp4`, status: 'pending' })));
    }

    const takeResults = [];
    for (const take of takes) {
        const r = await generateTakeAuto(take, { niche, paths, args, providersCfg });
        takeResults.push(r);

        if (r.status === 'ok') {
            console.log(`    ✓ take ${r.n} — ${r.provider} (tier ${r.tier}) · ${r.duration}s${r.preset ? ` · ${r.preset}` : ''}`);
            if (!args['dry-run']) P.markSlotFilled(paths.takes, r.file, r.provider, r.tier);
        } else if (r.status === 'failed') {
            console.log(`    ❌ take ${r.n} — ${r.reason}`);
            P.appendDegraded(session, {
                phase: 'f5_takes',
                label: `${label} · take ${r.n}`,
                status: 'failed',
                issues: [r.reason],
            });
        }
        // status === 'planned' (dry-run) já foi logado dentro de generateTakeAuto.
    }

    const ok = takeResults.filter((r) => r.status === 'ok').length;
    const failed = takeResults.filter((r) => r.status === 'failed').length;
    const planned = takeResults.filter((r) => r.status === 'planned').length;

    let status = 'complete';
    if (planned > 0) status = 'planned';
    else if (failed > 0) status = 'degraded';

    return { rank: pack.rank, handle: pack.handle, status, takes: takeResults, ok, failed, planned, total: takes.length };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const date = args.date || L.todayISO();

    if (!args.niche && !args.session) {
        console.error('❌ Informe --niche=ID (ou --session=ID de uma sessão já existente).');
        process.exit(1);
    }

    let session;
    try {
        session = P.resolveSession({ ...args, date });
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    let niche;
    try {
        niche = L.loadNiche(args.niche || session.manifest.niche);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const providersCfg = Q.loadProvidersConfig();

    const ranks = args.ranks ? String(args.ranks).split(',').map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n)) : null;
    const top = args.top ? parseInt(args.top, 10) : null;
    const packs = P.listPacks(session, { ranks, top, origin: args.origin });

    if (packs.length === 0) {
        console.error(`❌ Nenhum pack de benchmark encontrado em ${path.join(session.dir, 'benchmark')}. Rode a F2 primeiro:`);
        console.error(`   node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${session.id}`);
        process.exit(1);
    }

    const mode = args.mode || 'auto';
    const preferredTier = Q.preferredTierForNiche('video', niche.id);
    const startTier = args.tier || preferredTier || 'A';

    console.log(`\n=== F5 Geração de Takes de Vídeo · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:        ${session.id}`);
    console.log(`Packs:         ${packs.length}`);
    console.log(`Modo:          ${mode}${args.procedural ? ' (forçado: procedural, sem cota)' : ''}${args['dry-run'] ? ' [dry-run]' : ''}${args.verify ? ' [verify]' : ''}`);
    if (!args.procedural) {
        console.log(`Tier inicial:  ${startTier}${args.tier ? ' (flag explícita)' : preferredTier ? ' (preferência do nicho)' : ' (default)'}`);
    }

    const results = [];
    for (const pack of packs) {
        try {
            results.push(await processPack(pack, { niche, args, session, providersCfg }));
        } catch (e) {
            console.log(`\n[${pack.rank}] @${pack.handle} — ❌ exceção: ${e.message}`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'exception', reason: e.message });
        }
    }

    // --- Relatório final ---
    const complete = results.filter((r) => r.status === 'complete');
    const degraded = results.filter((r) => r.status === 'degraded');
    const blocked = results.filter((r) => r.status === 'blocked');
    const skipped = results.filter((r) => r.status === 'skipped');
    const hybridPending = results.filter((r) => r.status === 'hybrid_pending');
    const verified = results.filter((r) => r.status === 'verified_complete' || r.status === 'verified_incomplete');

    console.log(`\n${'='.repeat(58)}`);
    if (args.verify) {
        const okV = results.filter((r) => r.status === 'verified_complete').length;
        console.log(`✅ Verificados completos: ${okV}  ·  ⏳ Incompletos: ${verified.length - okV}`);
    } else if (args['dry-run']) {
        console.log(`🔍 dry-run concluído para ${packs.length} pack(s) — nada foi gerado ou gravado.`);
    } else {
        console.log(`✅ Completos: ${complete.length}  ·  ⚠️ Degradados: ${degraded.length}  ·  🚫 Bloqueados: ${blocked.length}  ·  ⏭️ Pulados: ${skipped.length}`);
        if (hybridPending.length > 0) console.log(`📝 Híbrido pendente: ${hybridPending.length} pack(s) aguardando arquivos manuais`);

        P.saveManifest(session, 'f5_takes', {
            mode,
            packs: results.map((r) => ({ rank: r.rank, handle: r.handle, status: r.status })),
        });
    }

    if (!args['dry-run'] && !args.verify && blocked.length === packs.length) {
        console.error(`\n❌ Todos os packs solicitados estão BLOQUEADOS (imagens incompletas) — nenhum avançou.`);
        process.exit(1);
    }

    if (hybridPending.length > 0) {
        console.log(`\n➡️  Preencha os arquivos em takes/ e rode novamente com --mode=hybrid --verify antes de avançar.`);
    } else if (!args['dry-run'] && !args.verify) {
        console.log(`\n➡️  Próximo: @farming-producer (F6)\n`);
    }
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
