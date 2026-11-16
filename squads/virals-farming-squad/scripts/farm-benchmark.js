#!/usr/bin/env node
/**
 * farm-benchmark.js — F2 Benchmark ETL · Virals Farming Squad
 *
 * Consome o ranking da F1 e produz, para cada criativo aprovado, um pack completo:
 * vídeo, frames-chave nos cortes reais, áudio, descrição do áudio (música ou
 * transcrição), metadados, descrição e hashtags do autor.
 *
 * REUSO (IDS): VideoProcessor e LocalTranscriber vêm do services/ETL compartilhado.
 * A CAPTURA usa a cascata de _tiktok-fetch.js (yt-dlp → cookies → navegador+CDN),
 * porque as rotas de vídeo do yt-dlp estão bloqueadas pelo TikTok hoje.
 *
 * PRINCÍPIO: nada é reportado como completo sem o arquivo em disco. Itens que
 * falham vão para _degraded.md com o motivo técnico real.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=religioso --top=8
 *   node ... --session=2026-07-26-pet-90b1cb --top=5
 *   node ... --niche=pet --url=https://www.tiktok.com/@x/video/123   (avulso)
 *
 * Flags:
 *   --niche=ID        nicho (obrigatório, salvo com --session)
 *   --session=ID      sessão da F1; default: a mais recente do nicho na data
 *   --top=N           quantos criativos processar        (default: 8)
 *   --ranks=1,3,5     escolhe ranks específicos do ranking
 *   --url=URL         processa uma URL avulsa, fora do ranking
 *   --date=YYYY-MM-DD data da sessão                     (default: hoje)
 *   --no-transcribe   pula a transcrição (mais rápido)
 *   --headed          navegador visível na captura
 *   --scene=0.30      threshold de detecção de corte
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const TT = require('./_tiktok-fetch.js');

const ETL = path.join(L.REPO_ROOT, 'services', 'ETL');
const VideoProcessor = require(path.join(ETL, 'Transform', 'processors', 'video-processor.js'));

function ffprobePath() {
    const local = path.join(ETL, 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}
function ffmpegPath() {
    const local = path.join(ETL, 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}

/** Duração e dimensões reais do arquivo — a fonte de verdade sobre o que foi baixado. */
function probeVideo(videoPath) {
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=width,height',
         '-of', 'default=nw=1', videoPath],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 }
    );
    const out = r.stdout || '';
    const num = (key) => {
        const m = out.match(new RegExp(`${key}=([\\d.]+)`));
        return m ? Number(m[1]) : null;
    };
    return { duration: num('duration'), width: num('width'), height: num('height'), size: num('size') };
}

/**
 * Detecta os CORTES reais de edição (ffmpeg scene-detect).
 * Frames por corte são sinal; frames por segundo são ruído.
 * Não-fatal: sem cortes, cai para marcações uniformes.
 */
function detectSceneCuts(videoPath, threshold = 0.3) {
    try {
        const r = spawnSync(
            ffmpegPath(),
            ['-hide_banner', '-nostats', '-i', videoPath,
             '-vf', `select='gt(scene,${threshold})',metadata=print`, '-an', '-f', 'null', '-'],
            { encoding: 'utf8', windowsHide: true, timeout: 120000 }
        );
        const out = `${r.stderr || ''}${r.stdout || ''}`;
        const cuts = [];
        for (const m of out.matchAll(/pts_time:([\d.]+)/g)) {
            const t = Math.round(Number(m[1]) * 100) / 100;
            if (!Number.isNaN(t)) cuts.push(t);
        }
        return [...new Set(cuts)].sort((a, b) => a - b);
    } catch (_) {
        return null;
    }
}

/** Marcações de frame: hook (0s) + cada corte. Sem cortes, divide uniformemente. */
function buildFrameMarks(duration, cuts) {
    const marks = [{ time: 0, label: 'hook' }];
    if (cuts && cuts.length > 0) {
        cuts.slice(0, 12).forEach((t, i) => {
            if (t > 0.4 && t < duration - 0.2) marks.push({ time: t, label: `corte-${i + 1}` });
        });
    }
    if (marks.length === 1 && duration > 3) {
        const n = Math.min(5, Math.max(2, Math.floor(duration / 4)));
        for (let i = 1; i < n; i++) {
            marks.push({ time: Math.round((duration * i) / n * 100) / 100, label: `plano-${i}` });
        }
    }
    return marks;
}

/** Modelabilidade completa — agora com o vídeo em disco (estágio benchmark). */
function fullModelability(ctx, signals) {
    const s = (signals && signals.benchmark_stage) || {};
    let score = 0;
    const reasons = [];

    const cutCount = ctx.cuts ? ctx.cuts.length : null;
    if (cutCount !== null) {
        if (cutCount === 0) {
            score += s.single_take_bonus || 0;
            reasons.push('take único');
            score += s.static_scene_bonus || 0;
            reasons.push('cena estática');
        } else if (cutCount <= 3) {
            score += s.single_take_bonus || 0;
            reasons.push(`poucos cortes (${cutCount})`);
        } else if (cutCount > 10) {
            score += s.heavy_editing_penalty || 0;
            reasons.push(`edição pesada (${cutCount} cortes)`);
        }
    }

    if (ctx.audioKind === 'music') {
        reasons.push('trilha musical');
    } else if (ctx.audioKind === 'original_speech') {
        score += s.original_audio_penalty || 0;
        reasons.push('fala original');
    }

    if (ctx.hasAuthorText) {
        score += s.text_overlay_bonus || 0;
        reasons.push('texto na legenda');
    }

    return { score, reasons };
}

/** Extrai hashtags da legenda do autor — asset, não metadado descartável. */
function extractHashtags(text) {
    return [...new Set((String(text || '').match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.slice(1)))];
}

function buildAudioDescription(item, audioKind, transcription, musicTitle) {
    let md = `# Descrição do Áudio\n\n`;
    md += `**Criativo:** @${item.handle} · ${item.url}\n`;
    md += `**Tipo de áudio:** ${audioKind === 'music' ? 'Música / trilha' : audioKind === 'original_speech' ? 'Áudio original (fala)' : 'Indeterminado'}\n\n---\n\n`;

    if (audioKind === 'music') {
        md += `## Trilha identificada\n\n`;
        md += `- **Título:** ${musicTitle || item.track || '(não identificado)'}\n`;
        if (item.artist) md += `- **Artista:** ${item.artist}\n`;
        md += `\n### Tradução / conteúdo da letra\n\n`;
        md += transcription
            ? `${transcription}\n`
            : `_Não obtida nesta rodada. Preencha manualmente ou rode novamente com transcrição habilitada._\n`;
    } else {
        md += `## Transcrição integral\n\n`;
        md += transcription
            ? `${transcription}\n`
            : `_Transcrição indisponível._ **Este criativo está degradado para fins de modelagem.**\n` +
              `No nicho \`noticias\`, ausência de transcrição BLOQUEIA o avanço para F3 — sem ela,\n` +
              `qualquer afirmação factual do plano seria invenção.\n`;
    }
    return md;
}

/**
 * Já existe um pack deste MESMO vídeo na sessão?
 *
 * O sufixo da pasta é o fim do id do post, então o pack é reencontrável mesmo que o rank
 * tenha mudado — e ele muda: `--url` avulso sempre entra como rank 1. Sem esta busca, a
 * recaptura de um criativo degradado criava uma pasta NOVA em `perfil/01-...`, deixando
 * o pack original (com áudio, modelagem e a organização do operador) intacto e vazio.
 * Quem quisesse juntar os dois tinha de fazer na mão — e foi assim que a duração do post
 * acabou sobrescrita pela do arquivo parcial.
 */
function acharPackExistente(session, item) {
    const sufixo = (item.id || '').slice(-6);
    if (!sufixo) return null;
    const benchDir = path.join(session.dir, 'benchmark');
    if (!fs.existsSync(benchDir)) return null;

    const pilha = [benchDir];
    while (pilha.length) {
        const dir = pilha.pop();
        let entradas;
        try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
        for (const e of entradas) {
            if (!e.isDirectory()) continue;
            const cheio = path.join(dir, e.name);
            if (e.name.endsWith(`-${sufixo}`) && fs.existsSync(path.join(cheio, 'benchmark.json'))) return cheio;
            // Só desce em pastas de organização (lote, ready, remodelar…), não dentro do pack.
            if (!fs.existsSync(path.join(cheio, 'benchmark.json'))) pilha.push(cheio);
        }
    }
    return null;
}

async function processCreative(item, rank, ctx) {
    const { niche, session, args } = ctx;
    const folder = `${String(rank).padStart(2, '0')}-${L.slug(item.handle, 24)}-${(item.id || '').slice(-6) || 'sem-id'}`;
    const originDir = item.origin === 'hashtag' ? 'hashtag' : 'perfil';
    // RECAPTURA REPARA NO LUGAR. Achou o pack deste vídeo, escreve nele — preservando
    // rank, pasta e tudo que as fases seguintes já produziram.
    const existente = args.url ? acharPackExistente(session, item) : null;
    if (existente) console.log(`   ↻ recaptura: pack existente em ${path.relative(session.dir, existente)}`);
    const packDir = existente || path.join(session.dir, 'benchmark', originDir, folder);
    const shotsDir = path.join(packDir, 'screenshots');
    fs.mkdirSync(shotsDir, { recursive: true });

    const result = { rank, handle: item.handle, url: item.url, packDir, status: 'complete', issues: [] };
    console.log(`\n[${rank}] @${item.handle} — ${item.url}`);

    // --- Captura ---
    const videoPath = path.join(packDir, 'video.mp4');
    const fetched = await TT.fetchCreative(item.url, videoPath, {
        headless: !args.headed,
        skipYtdlp: false,
        tmpDir: path.join(L.REPO_ROOT, '.aiox', 'tmp', 'farming'),
    });

    if (!fetched.ok) {
        result.status = 'degraded';
        result.issues.push(`captura falhou — ${fetched.reason}`);
        result.attempts = fetched.attempts;
        // Metadados podem ter vindo mesmo sem o vídeo: preserva o que houver.
        if (fetched.meta) result.meta = fetched.meta;
        console.log(`    ❌ captura falhou (${fetched.attempts.map((a) => a.strategy).join(' → ')})`);
        fs.writeFileSync(path.join(packDir, 'benchmark.json'), JSON.stringify(buildBenchmarkJson(item, result, {}, fetched), null, 2));
        return result;
    }

    // Tamanho medido NO DISCO, não no que a rota de captura reportou: a rota
    // `ytdlp-plain` não devolve `bytes` e o log imprimia "0 KB" para arquivos de
    // megabytes. Num pipeline cuja regra é "nada é completo sem o arquivo em disco",
    // um log que diz 0 KB destrói a confiança no relatório inteiro — e o erro
    // simétrico (arquivo vazio anunciado como ok) é o que já custou caro antes.
    const diskBytes = fs.existsSync(videoPath) ? fs.statSync(videoPath).size : 0;
    console.log(`    ✓ vídeo capturado via ${fetched.strategy} (${Math.round(diskBytes / 1024)} KB)`);
    if (diskBytes === 0) {
        result.status = 'degraded';
        result.issues.push('arquivo de vídeo tem 0 bytes em disco');
        console.log(`    ❌ arquivo vazio em disco`);
    }
    const probe = probeVideo(videoPath);
    if (!probe.duration || probe.duration < 1) {
        result.status = 'degraded';
        result.issues.push(`arquivo capturado é inválido ou curto demais (${probe.duration}s)`);
        console.log(`    ❌ arquivo inválido (${probe.duration}s)`);
    }
    console.log(`    · ${probe.width}×${probe.height} · ${probe.duration}s`);

    // Arquivo SEM stream de vídeo. Acontece quando o post é photo mode do TikTok
    // (imagem + música) ou quando a captura só conseguiu a faixa de áudio: o arquivo
    // chega com extensão .mp4 mas é um MP3. Precisa ser dito AQUI, com o nome da
    // causa: sem isso o item só falha lá na frente como "nenhum frame extraído",
    // que descreve o sintoma, parece falha transitória e convida a reprocessar —
    // gastando uma rodada inteira num item que jamais vai render frame.
    const semVideo = !probe.width || !probe.height;
    if (semVideo) {
        result.status = 'degraded';
        result.issues.push(
            'arquivo sem stream de vídeo (só áudio) — post em photo mode ou captura parcial. ' +
            'Reprocessar NÃO resolve: não há imagem em movimento a extrair.'
        );
        console.log(`    ❌ sem stream de vídeo — photo mode ou captura só de áudio`);
    }

    // --- Cortes e frames ---
    const cuts = semVideo ? null : detectSceneCuts(videoPath, parseFloat(args.scene) || 0.3);
    const marks = buildFrameMarks(probe.duration || 0, cuts);
    const processor = new VideoProcessor(path.join(L.REPO_ROOT, '.aiox', 'tmp', 'farming'));

    let frames = [];
    if (!semVideo) {
        try {
            frames = await processor.extractFramesAtTimestamps(videoPath, marks, shotsDir);
            console.log(`    ✓ ${frames.length} frame(s) em ${cuts ? cuts.length : 0} corte(s) detectado(s)`);
        } catch (e) {
            result.issues.push(`extração de frames falhou: ${e.message}`);
            console.log(`    ⚠️ frames: ${e.message}`);
        }
        if (frames.length === 0) {
            result.status = 'degraded';
            result.issues.push('nenhum frame extraído — a F3 não tem referência visual');
        }
    }

    // --- Áudio ---
    let audioPath = null;
    try {
        const tmpAudio = await processor.extractAudio(videoPath);
        audioPath = path.join(packDir, 'audio.mp3');
        fs.copyFileSync(tmpAudio, audioPath);
        try { fs.unlinkSync(tmpAudio); } catch (_) {}
        console.log(`    ✓ áudio extraído`);
    } catch (e) {
        result.issues.push(`extração de áudio falhou: ${e.message}`);
        console.log(`    ⚠️ áudio: ${e.message}`);
    }

    // --- Tipo de áudio e transcrição ---
    const meta = fetched.meta || {};
    const musicTitle = meta.music || item.track || null;
    const audioKind =
        musicTitle && !/original sound|som original/i.test(musicTitle) ? 'music' : 'original_speech';

    let transcription = null;
    if (audioPath && !args['no-transcribe']) {
        try {
            const LocalTranscriber = require(path.join(ETL, 'Transform', 'video-intelligence', 'local-transcriber.js'));
            const t = new LocalTranscriber();
            const out = await t.analyze(audioPath, 'audio');
            transcription = typeof out === 'string' ? out : out && (out.transcription || out.text || null);
            if (transcription) console.log(`    ✓ transcrição (${String(transcription).length} chars)`);
            else result.issues.push('transcrição retornou vazia');
        } catch (e) {
            result.issues.push(`transcrição indisponível: ${e.message.slice(0, 120)}`);
            console.log(`    ⚠️ transcrição: ${e.message.slice(0, 80)}`);
        }
    }

    // Gate terminal do nicho notícias: sem transcrição, o criativo não avança.
    if (niche.id === 'noticias' && !transcription) {
        result.status = 'blocked';
        result.issues.push(
            'GATE TERMINAL: nicho notícias exige transcrição. Sem ela, toda afirmação factual do plano seria invenção.'
        );
        console.log(`    🚫 BLOQUEADO — nicho notícias sem transcrição`);
    }

    fs.writeFileSync(
        path.join(packDir, 'audio-description.md'),
        buildAudioDescription(item, audioKind, transcription, musicTitle)
    );

    // --- Modelabilidade completa ---
    const authorText = meta.description || item.description || '';
    const model = fullModelability(
        { cuts, audioKind, hasAuthorText: authorText.length > 20 },
        niche.signals
    );

    const extra = {
        probe, cuts, frames: frames.map((f) => path.basename(f.path)),
        audioKind, musicTitle, transcription: !!transcription,
        modelability: item.modelability + model.score,
        modelabilityStage: 'benchmark',
        modelabilityReasons: [...(item.modelabilityReasons || []), ...model.reasons],
        authorText, hashtags: extractHashtags(authorText),
    };

    fs.writeFileSync(path.join(packDir, 'benchmark.json'), JSON.stringify(buildBenchmarkJson(item, result, extra, fetched), null, 2));

    if (result.issues.length > 0 && result.status === 'complete') result.status = 'partial';
    result.extra = extra;
    return result;
}

function buildBenchmarkJson(item, result, extra, fetched) {
    return {
        rank: result.rank,
        status: result.status,
        issues: result.issues,
        source: {
            url: item.url,
            id: item.id,
            handle: item.handle,
            origin: item.origin,
            origin_label: item.originLabel,
            capture_strategy: fetched ? fetched.strategy || null : null,
            capture_attempts: fetched ? fetched.attempts : null,
            cdn_url: fetched ? fetched.cdnUrl || null : null,
        },
        metrics: item.metrics,
        viral_score: item.score,
        engagement: item.engagement,
        published_at: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null,
        // Descrição e hashtags do autor: vão para o kit de publicação na F6.
        author_description: extra.authorText || null,
        hashtags: extra.hashtags || [],
        audio: { kind: extra.audioKind || null, music_title: extra.musicTitle || null, transcribed: !!extra.transcription },
        video: extra.probe || null,
        cuts: extra.cuts || null,
        take_count: extra.cuts ? extra.cuts.length + 1 : null,
        frames: extra.frames || [],
        modelability: {
            score: extra.modelability !== undefined ? extra.modelability : item.modelability,
            stage: extra.modelabilityStage || 'preliminary',
            reasons: extra.modelabilityReasons || item.modelabilityReasons || [],
        },
        generated_at: new Date().toISOString(),
    };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const date = args.date || L.todayISO();

    // --- Resolve sessão e itens ---
    let session;
    let niche;
    let items = [];

    if (args.url) {
        if (!args.niche) {
            console.error('❌ --url exige --niche.');
            process.exit(1);
        }
        niche = L.loadNiche(args.niche);
        session = L.resolveSessionDir(niche.id, date, args.session);
        const m = String(args.url).match(/@([^/]+)\/video\/(\d+)/);
        items = [{
            url: args.url, id: m ? m[2] : '', handle: m ? m[1] : 'desconhecido',
            origin: 'perfil', originLabel: 'avulso', metrics: {}, score: 0, engagement: 0,
            modelability: 0, modelabilityReasons: [], description: '', timestamp: null,
        }];
    } else {
        const sessionRef = args.session
            ? { id: args.session, dir: path.join(L.OUTPUT_ROOT, date, args.session) }
            : args.niche
                ? L.findLatestSession(args.niche, date)
                : null;

        if (!sessionRef || !fs.existsSync(sessionRef.dir)) {
            console.error(`❌ Sessão não encontrada. Rode a F1 primeiro:`);
            console.error(`   node squads/virals-farming-squad/scripts/farm-monitor.js --niche=${args.niche || '{nicho}'}`);
            process.exit(1);
        }
        session = sessionRef;

        const manifestPath = path.join(session.dir, 'session.json');
        const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
        niche = L.loadNiche(args.niche || manifest.niche);

        const rankingJson = path.join(session.dir, `ranking-${niche.id}-${manifest.date || date}.json`);
        if (!fs.existsSync(rankingJson)) {
            console.error(`❌ Ranking não encontrado em ${rankingJson}. Rode a F1 primeiro.`);
            process.exit(1);
        }
        const ranking = JSON.parse(fs.readFileSync(rankingJson, 'utf8'));
        items = ranking.items || [];

        if (items.length === 0) {
            console.error(`❌ O ranking não tem itens aprovados.`);
            console.error(`   Ajuste a nota de corte em data/niches/${niche.id}.yaml ou rode a F1 novamente.`);
            process.exit(1);
        }

        if (args.ranks) {
            const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
            items = wanted.map((n) => items[n - 1]).filter(Boolean);
        } else {
            const top = parseInt(args.top, 10) || 8;
            items = items.slice(0, top);
        }
    }

    const maxAllowed = niche.sessionLimits.max_creatives_per_benchmark || 20;
    if (items.length > maxAllowed) {
        console.warn(`⚠️  ${items.length} criativos excede o limite de sessão (${maxAllowed}). Truncando.`);
        items = items.slice(0, maxAllowed);
    }

    console.log(`\n=== F2 Benchmark ETL · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:     ${session.id}`);
    console.log(`Criativos:  ${items.length}`);
    console.log(`Transcrição: ${args['no-transcribe'] ? 'desabilitada' : 'habilitada'}`);
    if (niche.id === 'noticias') console.log(`⚠️  Gate terminal ativo: sem transcrição, o criativo NÃO avança para F3.`);

    const results = [];
    for (const [i, item] of items.entries()) {
        try {
            results.push(await processCreative(item, i + 1, { niche, session, args }));
        } catch (e) {
            console.log(`    ❌ exceção: ${e.message}`);
            results.push({ rank: i + 1, handle: item.handle, url: item.url, status: 'degraded', issues: [`exceção: ${e.message}`] });
        }
    }

    // --- Relatórios ---
    const complete = results.filter((r) => r.status === 'complete');
    const partial = results.filter((r) => r.status === 'partial');
    const degraded = results.filter((r) => r.status === 'degraded' || r.status === 'blocked');

    if (degraded.length > 0 || partial.length > 0) {
        let md = `# Itens Degradados · ${session.id}\n\n`;
        md += `Gerado em ${new Date().toISOString()}\n\n`;
        md += `**Completos:** ${complete.length}  ·  **Parciais:** ${partial.length}  ·  **Degradados/bloqueados:** ${degraded.length}\n\n`;
        md += `> Um pack sem os assets não é um pack. Estes itens NÃO devem avançar para F3 como se estivessem prontos.\n\n---\n\n`;
        for (const r of [...degraded, ...partial]) {
            md += `## [${r.rank}] @${r.handle} — \`${r.status}\`\n\n`;
            md += `- URL: ${r.url}\n`;
            for (const issue of r.issues) md += `- ⚠️ ${issue}\n`;
            if (r.attempts) md += `- Estratégias tentadas: ${r.attempts.map((a) => `${a.strategy} (${a.ok ? 'ok' : a.reason})`).join(' · ')}\n`;
            md += `\n`;
        }
        fs.writeFileSync(path.join(session.dir, '_degraded.md'), md);
    }

    const manifestPath = path.join(session.dir, 'session.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { phases: {} };
    manifest.phases = manifest.phases || {};
    manifest.phases.f2_benchmark = {
        completed_at: new Date().toISOString(),
        processed: results.length,
        complete: complete.length,
        partial: partial.length,
        degraded: degraded.length,
        packs: results.map((r) => ({
            rank: r.rank, handle: r.handle, status: r.status,
            dir: r.packDir ? path.relative(L.REPO_ROOT, r.packDir).replace(/\\/g, '/') : null,
        })),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`\n${'='.repeat(58)}`);
    console.log(`✅ Completos: ${complete.length}  ·  ⚠️ Parciais: ${partial.length}  ·  ❌ Degradados: ${degraded.length}`);
    if (degraded.length > 0 || partial.length > 0) {
        console.log(`📄 Detalhe: ${path.relative(L.REPO_ROOT, path.join(session.dir, '_degraded.md')).replace(/\\/g, '/')}`);
    }
    console.log(`📁 Packs:  ${path.relative(L.REPO_ROOT, path.join(session.dir, 'benchmark')).replace(/\\/g, '/')}`);
    console.log(`\n➡️  Próximo: @farming-modeler *plan all (F3)\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
