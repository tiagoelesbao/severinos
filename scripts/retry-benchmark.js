/**
 * Retry Benchmark - Império Prêmios 10.04
 * 
 * Re-processa links com falha usando estratégias alternativas:
 * 1. Python Bot com cookies (mais confiável)
 * 2. Fallback para scraper visual se vídeo falhar
 * 
 * Usage: node scripts/retry-benchmark.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LINKS_FILE = path.join(PROJECT_ROOT, 'tmp', 'imperio-premios-retry-10-04.md');
const OUTPUT_BASE = path.join(PROJECT_ROOT, 'services', 'ETL', 'outputs');
const CLIENT_OUTPUT = path.join(PROJECT_ROOT, 'workspaces', 'businesses', 'virals', 'marketing', 'imperio_premios', 'Benchmarks 10.04');

// Content index mapping para retry (continua de onde parou)
const CONTENT_INDEX_MAP = {
    'https://www.instagram.com/heldersorteios/reel/DW6heWxk3Qu/': 1,
    'https://www.instagram.com/brayambraz/reel/DW7RwRFEexB/': 6,
    'https://www.instagram.com/diogo__032/reel/DW7Yp8VO7N0/': 10,
    'https://www.instagram.com/iflavinh0/reel/DW7AJvUCbtS/': 11,
    'https://www.instagram.com/iflavinh0/p/DW6VC2tjrw_/': 12
};

async function retryWithPythonBot(url, contentIndex) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 RETRY [${contentIndex}] ${url}`);
    console.log(`${'═'.repeat(60)}`);

    const botDir = 'C:\\Users\\Pichau\\Desktop\\Sistemas\\SaAS\\Bot_youtube';
    const cookiesFile = path.join(botDir, 'youtube.com_cookies.txt');
    const ffmpegPath = path.join(botDir, 'ffmpeg-7.1.1-essentials_build', 'bin');
    const downloadDir = path.join(PROJECT_ROOT, '.aiox', 'tmp', 'downloads');

    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    // Criar script Python temporário
    const tempScript = path.join(PROJECT_ROOT, '.aiox', 'tmp', `retry_dl_${Date.now()}.py`);
    
    const pythonScript = `
import sys, os, json, glob
sys.path.insert(0, '${botDir.replace(/\\/g, '/')}')
os.environ['PATH'] = r'${ffmpegPath.replace(/\\/g, '/')};' + os.environ.get('PATH', '')

from boyt_yt import check_ffmpeg_installed
import yt_dlp

url = '${url}'
output = r'${downloadDir.replace(/\\/g, '/')}'
cookies = r'${cookiesFile.replace(/\\/g, '/')}'

ffmpeg = check_ffmpeg_installed()
print(f"[Retry] Downloading: {url}")
print(f"[Retry] FFmpeg: {ffmpeg}")

ydl_opts = {
    'format': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[ext=mp4]/best',
    'outtmpl': os.path.join(output, 'retry_%(id)s.%(ext)s'),
    'quiet': False,
    'no_warnings': False,
    'no_check_certificate': True,
    'geo_bypass': True,
    'retries': 5,
    'fragment_retries': 5,
    'merge_output_format': 'mp4',
    'cookiefile': cookies,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if info is None:
            print(f"[Retry] ERROR: Could not get video info")
            sys.exit(1)
        
        downloaded_file = ydl.prepare_filename(info)
        title = info.get('title', 'unknown')
        duration = info.get('duration', 0)
        
        print(f"[Retry] SUCCESS: {title}")
        print(f"[Retry] File: {downloaded_file}")
        print(f"[Retry] Duration: {duration}s")
        
        info_data = {
            'title': title,
            'description': info.get('description', ''),
            'uploader': info.get('uploader', 'Unknown'),
            'channel': info.get('channel', ''),
            'duration': duration,
            'view_count': info.get('view_count'),
            'like_count': info.get('like_count'),
            'thumbnail': info.get('thumbnail')
        }
        
        info_file = downloaded_file + '.info.json'
        with open(info_file, 'w', encoding='utf-8') as f:
            f.write(json.dumps(info_data, indent=2))
        
except Exception as e:
    print(f"[Retry] ERROR: {str(e)}")
    sys.exit(1)
`;

    fs.writeFileSync(tempScript, pythonScript);

    try {
        console.log(`📥 Executando Python bot com cookies...`);
        execSync(`python "${tempScript}"`, {
            stdio: 'inherit',
            timeout: 300000
        });

        // Encontrar arquivo baixado
        const videoExtensions = /\.(mp4|webm|mkv|mov|avi|flv)$/i;
        const files = fs.readdirSync(downloadDir)
            .filter(f => f.startsWith('retry_') && videoExtensions.test(f))
            .map(f => ({
                name: f,
                path: path.join(downloadDir, f),
                time: fs.statSync(path.join(downloadDir, f)).mtimeMs,
                size: fs.statSync(path.join(downloadDir, f)).size
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 0) {
            const videoFile = files[0].path;
            const infoJsonFile = videoFile + '.info.json';
            
            let metadata = {};
            if (fs.existsSync(infoJsonFile)) {
                metadata = JSON.parse(fs.readFileSync(infoJsonFile, 'utf8'));
            }

            console.log(`✅ Download bem-sucedido: ${files[0].name} (${(files[0].size / 1024 / 1024).toFixed(1)} MB)`);
            
            return {
                videoPath: videoFile,
                metadata,
                status: 'success'
            };
        }

        throw new Error('Nenhum arquivo de vídeo encontrado');
    } catch (err) {
        console.error(`❌ Python bot falhou: ${err.message}`);
        return { status: 'error', error: err.message };
    } finally {
        try { fs.unlinkSync(tempScript); } catch(_) {}
    }
}

async function processVideo(url, contentIndex, originalFolderName) {
    console.log(`\n🎬 Processando vídeo: ${originalFolderName}`);
    
    // Tentar download com Python Bot
    const downloadResult = await retryWithPythonBot(url, contentIndex);
    
    if (downloadResult.status !== 'success') {
        console.log(`⚠️ Download falhou, usando scraper visual como fallback...`);
        // Fallback: usar scraper Instagram
        const { runSingle } = require(path.join(PROJECT_ROOT, 'squads', 'virals-marketing-squad', 'scripts', 'run-benchmark-single'));
        return await runSingle(url, contentIndex);
    }

    // Processar vídeo baixado
    const PROJECT_ROOT_RESOLVED = path.resolve(__dirname, '..');
    const ETL_SERVICE = path.join(PROJECT_ROOT_RESOLVED, 'services', 'ETL');
    const OUTPUT_BASE_RESOLVED = path.join(ETL_SERVICE, 'outputs');
    
    const VideoProcessor = require(path.join(ETL_SERVICE, 'Transform', 'processors', 'video-processor'));
    const LocalTranscriber = require(path.join(ETL_SERVICE, 'Transform', 'video-intelligence', 'local-transcriber'));
    
    const processor = new VideoProcessor();
    const transcriber = new LocalTranscriber();

    // Extrair áudio
    console.log(`\n🔊 Extraindo áudio...`);
    const audioPath = await processor.extractAudio(downloadResult.videoPath);
    console.log(`✅ Áudio: ${path.basename(audioPath)}`);

    // Capturar frames
    console.log(`\n📸 Capturando frames...`);
    const screenshots = await processor.extractScreenshots(downloadResult.videoPath, 10);
    console.log(`✅ Frames: ${screenshots.length} capturados`);

    // Transcrever
    console.log(`\n🧠 Transcrevendo áudio...`);
    const transcriptionText = await transcriber.analyze(audioPath, 'audio');
    console.log(`✅ Transcrição concluída.`);

    // Organizar output
    const folderName = originalFolderName;
    const contentDir = path.join(OUTPUT_BASE_RESOLVED, folderName);
    
    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

    // Salvar transcrição
    const transcriptionPath = path.join(contentDir, 'Transcrição.md');
    fs.writeFileSync(transcriptionPath, `# Transcrição — ${downloadResult.metadata.title || folderName}\n\n${transcriptionText}`);

    // Atualizar Benchmark.json
    const benchPath = path.join(contentDir, 'Benchmark.json');
    const benchData = {
        id: `bench-${contentIndex}`,
        url: url,
        platform: 'instagram',
        type: 'video',
        title: downloadResult.metadata.title || folderName,
        description: downloadResult.metadata.description || "",
        author: downloadResult.metadata.uploader || downloadResult.metadata.channel || "Unknown",
        thumbnail: downloadResult.metadata.thumbnail || null,
        duration_seconds: downloadResult.metadata.duration || null,
        view_count: downloadResult.metadata.view_count || null,
        like_count: downloadResult.metadata.like_count || null,
        processed_at: new Date().toISOString(),
        status: 'full_assets',
        retry: true
    };
    fs.writeFileSync(benchPath, JSON.stringify(benchData, null, 2));

    // Mover frames
    const framesDir = path.join(contentDir, 'Screenshots');
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
    for (const shot of screenshots) {
        const dest = path.join(framesDir, path.basename(shot));
        if (fs.existsSync(shot)) fs.renameSync(shot, dest);
    }

    // Mover áudio e vídeo
    const finalAudioPath = path.join(contentDir, path.basename(audioPath));
    const finalVideoPath = path.join(contentDir, path.basename(downloadResult.videoPath));
    
    if (fs.existsSync(audioPath)) fs.renameSync(audioPath, finalAudioPath);
    if (fs.existsSync(downloadResult.videoPath)) fs.renameSync(downloadResult.videoPath, finalVideoPath);

    // Criar/Atualizar Análise.md
    const analysisPath = path.join(contentDir, 'Análise.md');
    if (!fs.existsSync(analysisPath)) {
        fs.writeFileSync(analysisPath, `# Análise — ${folderName}\n\n_Aguardando execução das auditorias (@mrbeast-mk, @garyvee-mk, @ladeira) direto na CLI._\n`);
    }

    // Criar handoff dossier
    const AgentHandoff = require(path.join(ETL_SERVICE, 'Load', 'handoff', 'agent-context'));
    const handoff = new AgentHandoff();
    const dossierPath = await handoff.createDossier({
        url,
        platform: 'instagram',
        type: 'video',
        videoPath: finalVideoPath,
        audioPath: finalAudioPath,
        framesPath: framesDir,
        framesCount: screenshots.length,
        outputDir: contentDir,
        metadata: {
            timestamp: new Date().toISOString(),
            content_index: contentIndex,
            workflow_ref: 'benchmark-creative-analysis.yaml',
            status: 'ready_for_video_audit',
            retry: true
        }
    });

    processor.cleanup();

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ RETRY COMPLETO!`);
    console.log(`📂 Output: ${contentDir}`);
    console.log(`📋 Dossier: ${dossierPath}`);
    console.log(`${'═'.repeat(60)}`);

    return { status: 'success', contentDir, dossierPath, folderName };
}

async function processPost(url, contentIndex, originalFolderName) {
    console.log(`\n📝 Processando post: ${originalFolderName}`);
    
    // Posts usam scraper visual diretamente
    const { runSingle } = require(path.join(PROJECT_ROOT, 'squads', 'virals-marketing-squad', 'scripts', 'run-benchmark-single'));
    return await runSingle(url, contentIndex);
}

async function runRetry() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 [virals-marketing-squad] Retry Benchmark Processor`);
    console.log(`📄 Links: ${LINKS_FILE}`);
    console.log(`${'═'.repeat(60)}`);

    if (!fs.existsSync(LINKS_FILE)) {
        console.error(`❌ Arquivo de links não encontrado: ${LINKS_FILE}`);
        process.exit(1);
    }

    // Parse links
    const content = fs.readFileSync(LINKS_FILE, 'utf8');
    const allLinks = content.match(/https?:\/\/[^\s)]+/g) || [];
    
    // Filtrar apenas links válidos (remover comentários)
    const validLinks = allLinks.filter(l => !l.startsWith('#'));
    
    console.log(`\n📊 Links para retry: ${validLinks.length}`);
    console.log(`${'─'.repeat(60)}\n`);

    const results = {
        started_at: new Date().toISOString(),
        total: validLinks.length,
        completed: 0,
        failed: 0,
        contents: [],
        errors: []
    };

    for (let i = 0; i < validLinks.length; i++) {
        const link = validLinks[i];
        const contentIndex = CONTENT_INDEX_MAP[link] || (i + 1);
        const isPost = link.includes('/p/');
        
        // Determinar nome da pasta original
        let folderName;
        if (link.includes('heldersorteios')) {
            folderName = 'Conteudo-Instagram-133ef0-o-que-voce-faria-com-essa-grana';
        } else if (link.includes('brayambraz')) {
            folderName = 'Conteudo-Instagram-11082d-mais-um-lancamento-e-dessa-vez-ranger-raptor-na-cor-laranja';
        } else if (link.includes('diogo__032')) {
            folderName = `Conteudo-Instagram-diogo032-${Date.now().toString(36)}`;
        } else if (link.includes('iflavinh0') && link.includes('reel')) {
            folderName = `Conteudo-Instagram-iflavinh0-reel-${Date.now().toString(36)}`;
        } else if (link.includes('iflavinh0') && link.includes('/p/')) {
            folderName = `Conteudo-Instagram-iflavinh0-post-${Date.now().toString(36)}`;
        } else {
            folderName = `Conteudo-Instagram-retry-${Date.now().toString(36)}`;
        }

        let result;
        if (isPost) {
            result = await processPost(link, contentIndex, folderName);
        } else {
            result = await processVideo(link, contentIndex, folderName);
        }

        if (result.status === 'success') {
            results.completed++;
            results.contents.push({
                index: contentIndex,
                url: link,
                folder: result.folderName,
                status: 'success'
            });
        } else {
            results.failed++;
            results.errors.push({
                index: contentIndex,
                url: link,
                error: result.error || 'Unknown error',
                status: 'error'
            });
        }

        // Cooldown
        if (i < validLinks.length - 1) {
            console.log(`\n⏳ Cooldown 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Salvar resultado
    results.finished_at = new Date().toISOString();
    const retrySummaryPath = path.join(CLIENT_OUTPUT, 'retry-summary.json');
    fs.writeFileSync(retrySummaryPath, JSON.stringify(results, null, 2));

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏁 RETRY COMPLETE!`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`📊 Total: ${results.total}`);
    console.log(`✅ Completed: ${results.completed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Summary: ${retrySummaryPath}`);
    console.log(`${'═'.repeat(60)}`);

    return results;
}

// CLI
if (require.main === module) {
    runRetry().catch(err => {
        console.error(`❌ Retry processor crashed: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    });
}

module.exports = { runRetry };
