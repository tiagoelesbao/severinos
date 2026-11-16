#!/usr/bin/env node
/**
 * farm-studio-verify.js — Verifica que o criativo publicado no video-studio é o MESMO
 * que foi exportado pela F6.
 *
 * POR QUE UMA BATERIA E NÃO UMA CONFERIDA VISUAL: a tentativa anterior de espelhar o
 * criativo no editor "parecia certa" na tela e estava errada em quatro pontos — trilha
 * inventada, SFX automático, áudio do clipe mudo e legenda do editor por cima. Olho no
 * preview não pega isso; comparar campo a campo pega.
 *
 * Compara o que o EDITOR vai renderizar (resposta real de `/api/timeline`) contra o que
 * a F6 produziu (`timeline.json` + `export/captions.ass` + o mp4 em disco).
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-studio-verify.js \
 *     --niche=religioso --session=ID --origin="lote 1/ready" --client=virals-farming
 *
 * Flags:
 *   --client=SLUG    cliente no studio                  (default: virals-farming)
 *   --base=URL       base do studio        (default: http://localhost:3000)
 *   --json           saída em JSON, para uso por outros scripts
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const M = require('./_studio-mirror.js');   // parseAssStyle: a tipografia do export

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

const TOL_SEC = 0.05;

function ffprobe(file, entries) {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    const bin = fs.existsSync(local) ? local : 'ffprobe';
    const r = spawnSync(bin, ['-v', 'error', '-show_entries', entries, '-of', 'default=nw=1', file],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    return r.stdout || '';
}

/** Cues do .ass gerado pela F6 — a referência de texto. */
function parseAss(assPath) {
    if (!fs.existsSync(assPath)) return [];
    const out = [];
    for (const linha of fs.readFileSync(assPath, 'utf8').split(/\r?\n/)) {
        if (!linha.startsWith('Dialogue:')) continue;
        const partes = linha.slice('Dialogue:'.length).split(',');
        if (partes.length < 10) continue;
        const toSec = (t) => {
            const m = String(t).trim().match(/(\d+):(\d+):(\d+)[.,](\d+)/);
            return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 100 : null;
        };
        out.push({
            start: toSec(partes[1]),
            end: toSec(partes[2]),
            text: partes.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/g, ' ').trim(),
        });
    }
    return out;
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

async function verifyPack(pack, client, base) {
    const paths = P.packPaths(pack.dir);
    // Mesmo slug do publicador: nome da PASTA do pack. Rank se repete entre packs e
    // colidiria — dois criativos viravam a mesma pasta no editor.
    const creative = L.slug(pack.folder, 60);
    const checks = [];
    const add = (id, ok, detalhe) => checks.push({ id, ok, detalhe });

    // --- Referência: o que a F6 produziu ---
    const exportPath = path.join(paths.export, 'criativo.mp4');
    if (!fs.existsSync(exportPath)) {
        return { creative, ok: false, checks: [{ id: 'AC0', ok: false, detalhe: 'export/criativo.mp4 ausente — rode a F6' }] };
    }
    const durExport = Number((ffprobe(exportPath, 'format=duration').match(/duration=([\d.]+)/) || [])[1]) || 0;
    const f6 = fs.existsSync(path.join(pack.dir, 'timeline.json'))
        ? JSON.parse(fs.readFileSync(path.join(pack.dir, 'timeline.json'), 'utf8'))
        : null;
    const assCues = parseAss(path.join(paths.export, 'captions.ass'));

    // --- O que o EDITOR vai renderizar ---
    let api;
    try {
        const res = await fetch(`${base}/api/timeline?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`);
        api = await res.json();
    } catch (e) {
        return { creative, ok: false, checks: [{ id: 'AC0', ok: false, detalhe: `studio não respondeu (${e.message}) — o app está rodando?` }] };
    }
    const tl = (api && api.timeline) || {};
    const fx = (api && api.fxPlan) || {};
    const fps = Number(tl.fps) || 30;

    // AC0 — o save é autoritativo (senão o editor remonta sozinho)
    add('AC0', api.persisted === true, `persisted=${api.persisted}`);

    // AC1 — duração
    const durEditor = (Number(tl.durationInFrames) || 0) / fps;
    add('AC1', Math.abs(durEditor - durExport) <= TOL_SEC + 0.5,
        `editor ${durEditor.toFixed(2)}s vs export ${durExport.toFixed(2)}s`);

    // AC2 — sequência de clipes idêntica à da F6
    if (f6) {
        const esperados = f6.videoTrack.map((c) => ({ file: path.basename(c.file), dur: Number(c.durationSeconds) }));
        const obtidos = (tl.videoTrack || []).map((c) => ({ file: path.basename(c.file || ''), dur: Number(c.durationSeconds) }));
        const mesmaQtd = esperados.length === obtidos.length;
        const mesmaOrdem = mesmaQtd && esperados.every((e, i) => e.file === obtidos[i].file);
        const mesmasDur = mesmaQtd && esperados.every((e, i) => Math.abs(e.dur - obtidos[i].dur) <= 0.1);
        add('AC2', mesmaOrdem && mesmasDur,
            `${obtidos.length}/${esperados.length} clipes · ordem ${mesmaOrdem ? 'ok' : 'DIFERE'} · durações ${mesmasDur ? 'ok' : 'DIFEREM'}`);
    } else {
        add('AC2', false, 'timeline.json da F6 ausente');
    }

    // AC3 — áudio do benchmark, sem trilha nem SFX inventados
    const camadasAudio = (tl.extraLayers || []).filter((l) => l.kind === 'audio');
    const nomesSuspeitos = camadasAudio.filter((l) => /sfx|trilha|music/i.test(l.name || '') && !/benchmark/i.test(l.name || ''));
    const temAudio = (tl.videoTrack || []).some((c) => c.audioEnabled) || camadasAudio.length > 0 || !!tl.audioTrack;
    add('AC3', nomesSuspeitos.length === 0 && temAudio,
        `camadas de áudio: ${camadasAudio.map((l) => l.name).join(', ') || '(nenhuma)'} · inventadas: ${nomesSuspeitos.length}`);

    // AC4 — texto: mesmo conteúdo e tempos do .ass
    const textosEditor = [];
    for (const l of (tl.extraLayers || [])) {
        for (const c of (l.clips || [])) if (c.type === 'text' && c.text) {
            textosEditor.push({ start: (Number(c.startFrame) || 0) / fps, end: ((Number(c.startFrame) || 0) + (Number(c.durationInFrames) || 0)) / fps, text: c.text });
        }
    }
    for (const c of (fx.captions || [])) {
        textosEditor.push({ start: (Number(c.startMs) || 0) / 1000, end: (Number(c.endMs) || 0) / 1000, text: c.text });
    }
    if (assCues.length === 0) {
        add('AC4', textosEditor.length === 0, 'export sem texto; editor também deve estar sem');
    } else {
        // Agrupa por intervalo de tempo. Hoje o espelho emite um elemento por cue
        // (o editor já respeita as quebras), mas saves antigos — e textos criados à
        // mão — podem ter uma linha por elemento; o agrupamento compara os dois no
        // nível certo: um bloco de texto por cue.
        const grupos = new Map();
        for (const t of textosEditor) {
            const chave = `${t.start.toFixed(2)}|${t.end.toFixed(2)}`;
            if (!grupos.has(chave)) grupos.set(chave, { start: t.start, end: t.end, partes: [] });
            grupos.get(chave).partes.push(t.text);
        }
        const blocos = [...grupos.values()]
            .sort((a, b) => a.start - b.start)
            .map((g) => ({ start: g.start, end: g.end, text: g.partes.join(' ') }));

        const mesmaQtd = blocos.length === assCues.length;
        const conteudoOk = mesmaQtd && assCues.every((e, i) => norm(e.text) === norm(blocos[i].text));
        const temposOk = mesmaQtd && assCues.every((e, i) =>
            Math.abs(e.start - blocos[i].start) <= 0.15 && Math.abs(e.end - blocos[i].end) <= 0.15);
        const detalhe = mesmaQtd
            ? `${blocos.length}/${assCues.length} blocos (${textosEditor.length} elementos) · conteúdo ${conteudoOk ? 'ok' : 'DIFERE'} · tempos ${temposOk ? 'ok' : 'DIFEREM'}`
            : `${blocos.length}/${assCues.length} blocos — quantidade DIFERE`;
        add('AC4', conteudoOk && temposOk, detalhe);
    }

    // AC5/AC7 — camadas separadas e editáveis
    const camadas = (tl.extraLayers || []).map((l) => `${l.name}(${l.kind})`);
    add('AC7', (tl.videoTrack || []).length > 0 && camadas.length > 0, `camadas: ${camadas.join(' · ') || '(nenhuma)'}`);

    // AC8 — mudanças no app ficam dentro do que foi autorizado.
    //
    // A regra original era "nenhuma mudança no app". Ela caiu: o editor fixava
    // `fontWeight:800`, ignorava quebras de linha e desenhava sombra no lugar do
    // contorno — nenhum ajuste do lado do espelho corrige isso, porque o desenho é
    // do renderer. O dono autorizou tocar o app; o que resta guardar é o ESCOPO.
    //
    // O repositório já tinha `apps/video-studio` modificado antes deste trabalho
    // (alterações do dono no editor), então o marco continua sendo a data da story:
    // só entra na conta o que foi tocado depois dela.
    const AUTORIZADOS = [
        'apps/video-studio/scripts/render-export.ts',        // GOP/keyframes, concorrência, faixa/matriz de cor
        'apps/video-studio/src/remotion/fonts.ts',           // registro sob demanda + guarda do delayRender
        'apps/video-studio/src/remotion/TimelineFxComposition.tsx', // tipografia do texto
        'apps/video-studio/src/lib/timeline.ts',             // campos de tipografia do clipe
        'apps/video-studio/src/app/studio/page.tsx',         // playhead fora da cadeia de commit do Player
        'apps/video-studio/src/app/api/thumbs/route.ts',     // miniatura além do fim da mídia
        'apps/video-studio/src/remotion/fx/SmartFrame.tsx',  // pauseWhenBuffering no preview
    ];
    const marcoPath = path.join(L.REPO_ROOT, 'docs', 'stories', 'farming-studio-mirror.story.md');
    const marco = fs.existsSync(marcoPath) ? fs.statSync(marcoPath).mtimeMs : Date.now();
    const git = spawnSync('git', ['status', '--porcelain', 'apps/video-studio'],
        { cwd: L.REPO_ROOT, encoding: 'utf8', windowsHide: true });
    const foraDoEscopo = String(git.stdout || '').trim().split('\n').filter(Boolean)
        .map((l) => l.slice(3).trim().replace(/^"|"$/g, '').replace(/\\/g, '/'))
        .filter((f) => {
            const abs = path.join(L.REPO_ROOT, f);
            try { if (fs.statSync(abs).mtimeMs <= marco) return false; } catch (_) { return false; }
            return !AUTORIZADOS.includes(f);
        });
    add('AC8', foraDoEscopo.length === 0,
        foraDoEscopo.length
            ? `arquivos do app fora do escopo autorizado: ${foraDoEscopo.join(', ')}`
            : `mudanças no app restritas aos ${AUTORIZADOS.length} arquivos autorizados`);

    // AC9 — tipografia: o elemento de texto carrega o estilo REAL do .ass.
    //
    // Este é o check que faltava quando a bateria deu 6/6 com o texto na tela em
    // outro peso, outra fonte e sem contorno: conteúdo e tempo batiam, o DESENHO não.
    if (assCues.length) {
        const st = M.parseAssStyle(path.join(paths.export, 'captions.ass'));
        const textos = (tl.extraLayers || []).flatMap((l) => (l.clips || []).filter((c) => c.type === 'text' && c.text));
        const confere = (campo, esperado) => textos.every((c) => c[campo] === esperado);
        // O corpo no editor é o Fontsize do .ass CONVERTIDO (o libass mede a célula da
        // fonte, não o em) — comparar com o número cru do .ass acusaria erro onde está
        // certo. Ver FATOR_CORPO_LIBASS em _studio-mirror.js.
        const corpoEsperado = Number((st.fontSize * M.FATOR_CORPO_LIBASS).toFixed(2));
        const corpoOk = textos.every((c) => Math.abs(Number(c.fontSize) - corpoEsperado) <= 0.5);
        const pesoOk = confere('fontWeight', st.fontWeight);
        const familiaOk = confere('fontFamily', st.family) || (fx.brand || {}).fontFamily === st.family;
        const contornoOk = st.strokeWidth === 0 || confere('strokeWidth', st.strokeWidth);
        add('AC9', textos.length > 0 && corpoOk && pesoOk && familiaOk && contornoOk,
            `${st.family} ${st.fontWeight} ${st.fontSize}px do .ass → ${corpoEsperado}px no editor · contorno ${st.strokeWidth}px`
            + ` · corpo ${corpoOk ? 'ok' : 'DIFERE'} · peso ${pesoOk ? 'ok' : 'DIFERE'}`
            + ` · família ${familiaOk ? 'ok' : 'DIFERE'} · contorno ${contornoOk ? 'ok' : 'DIFERE'}`);
    }

    return { creative, ok: checks.every((c) => c.ok), checks };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const client = String(args.client || 'virals-farming');
    const base = String(args.base || 'http://localhost:3000').replace(/\/$/, '');

    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    }
    packs = packs.filter((p) => fs.existsSync(path.join(P.packPaths(p.dir).export, 'criativo.mp4')));

    if (packs.length === 0) {
        console.error('❌ Nenhum pack com export/criativo.mp4. Rode a F6 antes.');
        process.exitCode = 1;
        return;
    }

    const resultados = [];
    for (const pack of packs) resultados.push(await verifyPack(pack, client, base));

    if (args.json) {
        console.log(JSON.stringify(resultados, null, 2));
    } else {
        console.log(`\n=== Verificação de espelhamento · cliente ${client} ===\n`);
        for (const r of resultados) {
            console.log(`${r.ok ? '✅' : '❌'} ${r.creative}`);
            for (const c of r.checks) console.log(`    ${c.ok ? '✓' : '✗'} ${c.id} — ${c.detalhe}`);
        }
        const ok = resultados.filter((r) => r.ok).length;
        console.log(`\n${ok}/${resultados.length} criativo(s) espelhado(s) com fidelidade.\n`);
    }
    process.exitCode = resultados.every((r) => r.ok) ? 0 : 1;
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    process.exitCode = 1;
});
