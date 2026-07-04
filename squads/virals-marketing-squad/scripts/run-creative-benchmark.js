#!/usr/bin/env node
/**
 * Creative Benchmark Runner — Virals Marketing Squad
 *
 * Lê os rankings gerados pelo *daily-monitor, extrai top N URLs por plataforma
 * e executa o pipeline ETL completo (download → transcrição com timestamps →
 * frames-chave → Análise.md base) para cada um, salvando tudo dentro da pasta
 * do dia em daily-monitoring/{date}/benchmark/.
 *
 * Uso:
 *   node squads/virals-marketing-squad/scripts/run-creative-benchmark.js [--date=YYYY-MM-DD] [--top=10] [--platforms=instagram,tiktok,youtube]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ETL = path.join(REPO_ROOT, 'services', 'ETL');

const Downloader = require(path.join(ETL, 'Extract', 'downloader'));
const VideoProcessor = require(path.join(ETL, 'Transform', 'processors', 'video-processor'));
const LocalTranscriber = require(path.join(ETL, 'Transform', 'video-intelligence', 'local-transcriber'));
const ContentClassifier = require(path.join(ETL, 'Transform', 'analyzers', 'ContentClassifier'));
const VideoAnalyzer = require(path.join(ETL, 'Transform', 'analyzers', 'VideoAnalyzer'));
const ImageAnalyzer = require(path.join(ETL, 'Transform', 'analyzers', 'ImageAnalyzer'));
const { parseAllRankings } = require(path.join(ETL, 'Transform', 'analyzers', 'rankings-parser'));
const { resolveClient } = require('./_client_resolver.js');

function parseArgs(argv) {
    return argv.slice(2).reduce((acc, arg) => {
        const m = arg.match(/^--([^=]+)=(.*)$/);
        if (m) acc[m[1]] = m[2];
        return acc;
    }, {});
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * VEX-04: detecta os CORTES reais de edição do vídeo (ffmpeg scene-detect).
 * Retorna timestamps em segundos (arredondados a 0,01) ou null (não-fatal).
 * Threshold 0,30 calibrado para reels (screen captures com scroll não contam).
 */
function detectSceneCuts(videoPath, threshold = 0.30) {
    try {
        const { spawnSync } = require('child_process');
        const r = spawnSync('ffmpeg', [
            '-hide_banner', '-nostats', '-i', videoPath,
            '-vf', `select='gt(scene,${threshold})',metadata=print`,
            '-an', '-f', 'null', '-',
        ], { encoding: 'utf8', windowsHide: true, timeout: 120000 });
        const out = `${r.stderr || ''}${r.stdout || ''}`;
        const cuts = [];
        for (const m of out.matchAll(/pts_time:([\d.]+)/g)) {
            const t = Math.round(parseFloat(m[1]) * 100) / 100;
            if (Number.isFinite(t)) cuts.push(t);
        }
        return cuts.length ? [...new Set(cuts)].sort((a, b) => a - b) : null;
    } catch (_) {
        return null; // sem ffmpeg/timeout → segue sem cortes (fallback honesto)
    }
}

function sanitizeSlug(str, fallback = 'untitled') {
    if (!str) return fallback;
    return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        .toLowerCase().substring(0, 50) || fallback;
}

function urlHash(url) {
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 6);
}

const PLATFORM_TIMEOUTS = {
    youtube: 1800000,    // 30 min
    tiktok: 300000,      // 5 min
    instagram: 300000,   // 5 min
    linkedin: 180000,    // 3 min
    default: 300000
};

function timeoutPromise(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout(${label}) after ${ms / 1000}s`)), ms))
    ]);
}

async function processOne({ url, rank, creator, platform, contentDir, downloader, processor, transcriber }) {
    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

    // 1. Probe + Download
    const probe = await downloader.probe(url);
    let downloadResult = { videoPath: null, images: [], metadata: {}, status: 'unknown' };
    try {
        downloadResult = await downloader.download(url);
    } catch (e) {
        console.warn(`  ⚠️ Download falhou: ${e.message}`);
        downloadResult = { videoPath: null, images: [], metadata: { description: '' }, status: 'download_failed' };
    }

    const { videoPath, images = [], metadata = {}, status } = downloadResult;

    // 2. Classify
    const classification = ContentClassifier.classify({
        url, platform, downloaderType: probe.type, videoPath, images, metadata
    });
    console.log(`  🎯 Classified as: ${classification.type} / ${classification.subtype}`);

    // 3. Pick analyzer
    let analyzer;
    if (classification.engine === 'VideoAnalyzer') {
        analyzer = new VideoAnalyzer({ transcriber, processor });
    } else if (classification.engine === 'ImageAnalyzer') {
        analyzer = new ImageAnalyzer({ transcriber, processor });
    } else {
        // unknown — gera só metadata
        const md = `# Conteúdo não-classificado\n\n**URL:** ${url}\n\n_Análise não disponível para este tipo de conteúdo._\n`;
        fs.writeFileSync(path.join(contentDir, 'Transcrição.md'), md);
        fs.writeFileSync(path.join(contentDir, 'Análise.md'), md);
        return { status: 'skipped_unknown', classification };
    }

    // 4. Run analyzer
    const result = await analyzer.run({
        contentDir, url, classification, metadata,
        videoPath, audioPath: null, images
    });

    // 5. Persist
    fs.writeFileSync(path.join(contentDir, 'Transcrição.md'), result.transcriptionMd, 'utf8');
    fs.writeFileSync(path.join(contentDir, 'Análise.md'), result.baseAnalysisMd, 'utf8');

    // VEX-04: cortes REAIS de edição (scene-detect) — precisa rodar AQUI,
    // enquanto o vídeo ainda existe (é apagado logo abaixo). Não-fatal.
    let cutTimestamps = null;
    if (classification.engine === 'VideoAnalyzer' && videoPath && fs.existsSync(videoPath)) {
        cutTimestamps = detectSceneCuts(videoPath);
        if (cutTimestamps) {
            console.log(`  ✂️  Scene-detect: ${cutTimestamps.length} cortes reais detectados`);
        }
    }

    const benchmark = {
        rank, creator, url, platform,
        type: classification.type,
        subtype: classification.subtype,
        engine: classification.engine,
        title: metadata.title || null,
        description: metadata.description || null,
        author: metadata.author || creator,
        view_count: metadata.view_count || null,
        like_count: metadata.like_count || null,
        comment_count: metadata.comment_count || null,
        duration_seconds: metadata.duration || null,
        thumbnail: metadata.thumbnail || null,
        screenshots_count: result.screenshots.length,
        key_moments: result.keyMoments,
        // Cortes reais (s) — a Fase A usa para a cadência VERDADEIRA (VEX-04).
        cut_timestamps: cutTimestamps,
        download_status: status,
        analyzer_status: result.status,
        processed_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(contentDir, 'Benchmark.json'), JSON.stringify(benchmark, null, 2), 'utf8');

    // Cleanup video
    try { if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (_) {}

    return { status: 'ok', classification, screenshots: result.screenshots.length };
}

async function buildSummary(date, outputBaseDir, results) {
    const total = results.length;
    const ok = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped_unknown' || r.status === 'timeout').length;

    let md = `# Creative Benchmark Summary · ${date}\n\n`;
    md += `**Total processados:** ${total}  ·  **Sucesso:** ${ok}  ·  **Falha:** ${failed}  ·  **Pulados/Timeout:** ${skipped}\n\n---\n\n`;

    const byPlatform = {};
    for (const r of results) {
        if (!byPlatform[r.platform]) byPlatform[r.platform] = [];
        byPlatform[r.platform].push(r);
    }

    for (const [plat, items] of Object.entries(byPlatform)) {
        md += `## ${plat.toUpperCase()}\n\n`;
        md += `| Rank | Criador | Tipo | Status | Frames | Pasta |\n`;
        md += `| ---: | :--- | :--- | :--- | ---: | :--- |\n`;
        items.forEach(r => {
            const folderRel = r.folder ? path.relative(outputBaseDir, r.folder).replace(/\\/g, '/') : '—';
            const tipo = r.classification ? `${r.classification.type}/${r.classification.subtype}` : '—';
            md += `| ${r.rank} | ${r.creator} | ${tipo} | ${r.status} | ${r.screenshots ?? 0} | \`${folderRel}\` |\n`;
        });
        md += `\n`;
    }
    return md;
}

(async () => {
    const args = parseArgs(process.argv);
    const date = args.date || todayISO();
    const topN = parseInt(args.top, 10) || 10;
    const requestedPlatforms = (args.platforms || 'instagram,tiktok,youtube,linkedin')
        .split(',').map(p => p.trim().toLowerCase()).filter(Boolean);

    // Resolução de cliente (MKT-MC2-03).
    let client;
    try {
        client = resolveClient(args.client);
    } catch (e) {
        console.error(`ERRO ao resolver cliente: ${e.message}`);
        process.exit(1);
    }

    const dailyDir = path.join(REPO_ROOT, client.workspaceDir, 'daily-monitoring', date);
    if (!fs.existsSync(dailyDir)) {
        console.error(`❌ Pasta do dia não existe para cliente ${client.slug}: ${dailyDir}`);
        console.error(`   Rode antes: *daily-monitor --client=${client.slug} (gera os rankings).`);
        process.exit(1);
    }

    const benchmarkBaseDir = path.join(dailyDir, 'benchmark');
    if (!fs.existsSync(benchmarkBaseDir)) fs.mkdirSync(benchmarkBaseDir, { recursive: true });

    console.log(`\n=== Creative Benchmark Runner ===`);
    console.log(`Client:     ${client.nomeExibicao} (${client.slug})`);
    console.log(`Date:       ${date}`);
    console.log(`Top N:      ${topN}`);
    console.log(`Platforms:  ${requestedPlatforms.join(', ')}`);
    console.log(`Source:     ${dailyDir}`);
    console.log(`Output:     ${benchmarkBaseDir}\n`);

    const allRankings = parseAllRankings(dailyDir, topN);
    const filtered = {};
    for (const plat of requestedPlatforms) {
        if (allRankings[plat] && allRankings[plat].length > 0) filtered[plat] = allRankings[plat];
        else console.log(`⚠️ Sem ranking para ${plat} em ${date} — pulando.`);
    }

    const totalLinks = Object.values(filtered).reduce((acc, arr) => acc + arr.length, 0);
    if (totalLinks === 0) {
        console.error(`❌ Nenhum link encontrado nos rankings.`);
        process.exit(1);
    }
    console.log(`📦 Total de criativos a processar: ${totalLinks}\n`);

    const downloader = new Downloader();
    const processor = new VideoProcessor();
    const transcriber = new LocalTranscriber();

    const results = [];
    let cursor = 0;
    const startedAt = Date.now();

    for (const [platform, rows] of Object.entries(filtered)) {
        const platDir = path.join(benchmarkBaseDir, platform);
        if (!fs.existsSync(platDir)) fs.mkdirSync(platDir, { recursive: true });

        for (const row of rows) {
            cursor++;
            const folderName = `${String(row.rank).padStart(2, '0')}-${sanitizeSlug(row.creator)}-${urlHash(row.url)}`;
            const contentDir = path.join(platDir, folderName);
            const timeout = PLATFORM_TIMEOUTS[platform] || PLATFORM_TIMEOUTS.default;

            console.log(`\n${'─'.repeat(60)}`);
            console.log(`[${cursor}/${totalLinks}] ${platform.toUpperCase()} · #${row.rank} · ${row.creator}`);
            console.log(`URL:    ${row.url}`);
            console.log(`Folder: ${folderName}`);
            console.log(`Timeout: ${timeout / 1000}s`);

            const ctx = { url: row.url, rank: row.rank, creator: row.creator, platform, contentDir, downloader, processor, transcriber };

            let outcome = { status: 'failed', error: null };
            const t0 = Date.now();
            try {
                const r = await timeoutPromise(processOne(ctx), timeout, `${platform} #${row.rank}`);
                outcome = { ...r };
                console.log(`  ✅ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${r.classification.type}/${r.classification.subtype}`);
            } catch (e) {
                const isTimeout = /Timeout/.test(e.message);
                outcome = { status: isTimeout ? 'timeout' : 'failed', error: e.message };
                console.log(`  ❌ ${isTimeout ? 'TIMEOUT' : 'FAILED'}: ${e.message}`);
                // Persiste erro para análise posterior
                try {
                    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
                    fs.writeFileSync(path.join(contentDir, 'error.log'), `${e.stack || e.message}\n`);
                } catch (_) {}
            }

            results.push({
                rank: row.rank, creator: row.creator, url: row.url, platform,
                folder: contentDir,
                ...outcome
            });

            // Cleanup processor temp entre runs
            try { processor.cleanup(); } catch (_) {}

            // Cooldown
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    // Final summary
    const summaryMd = await buildSummary(date, benchmarkBaseDir, results);
    const summaryPath = path.join(benchmarkBaseDir, `_creative-benchmark-summary-${date}.md`);
    fs.writeFileSync(summaryPath, summaryMd, 'utf8');

    const summaryJson = {
        date, topN, platforms: requestedPlatforms,
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        total: results.length,
        ok: results.filter(r => r.status === 'ok').length,
        failed: results.filter(r => r.status === 'failed').length,
        timeout: results.filter(r => r.status === 'timeout').length,
        skipped: results.filter(r => r.status === 'skipped_unknown').length,
        results
    };
    fs.writeFileSync(path.join(benchmarkBaseDir, `_creative-benchmark-summary-${date}.json`), JSON.stringify(summaryJson, null, 2), 'utf8');

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏁 BENCHMARK COMPLETO`);
    console.log(`✅ Sucesso: ${summaryJson.ok}/${summaryJson.total}`);
    console.log(`❌ Falha:   ${summaryJson.failed}`);
    console.log(`⏱️ Timeout: ${summaryJson.timeout}`);
    console.log(`📂 Output:  ${benchmarkBaseDir}`);
    console.log(`📄 Summary: ${summaryPath}`);
    console.log(`${'═'.repeat(60)}\n`);
})().catch(e => {
    console.error(`❌ Fatal: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
