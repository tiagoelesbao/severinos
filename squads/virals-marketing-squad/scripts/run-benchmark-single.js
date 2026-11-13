/**
 * Run Benchmark Single
 * 
 * Squad wrapper script that processes a single content URL through the ETL pipeline
 * and organizes the output for agent analysis.
 * 
 * Usage: node scripts/run-benchmark-single.js <URL> [content_index]
 * Example: node scripts/run-benchmark-single.js https://instagram.com/reel/xyz 1
 * 
 * Output: services/ETL/outputs/Conteudo{index}-{titulo}/
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Resolve paths relative to project root (squad is 2 levels deep)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ETL_SERVICE = path.join(PROJECT_ROOT, 'services', 'ETL');
const OUTPUT_BASE = path.join(ETL_SERVICE, 'outputs');

async function runSingle(url, contentIndex = 1) {
    console.log(`\n🏗️ [virals-marketing-squad] Benchmark Single`);
    console.log(`📍 URL: ${url}`);
    console.log(`📊 Content Index: ${contentIndex}`);
    console.log(`${'─'.repeat(60)}`);

    // Validate URL
    const supportedPlatforms = [
        /instagram\.com.*\/reel/,
        /instagram\.com.*\/p\//,
        /tiktok\.com/,
        /youtube\.com\/watch/,
        /youtube\.com\/shorts/,
        /linkedin\.com\/posts/,
        /linkedin\.com\/feed\/update/
    ];
    const isSupported = supportedPlatforms.some(p => p.test(url));
    
    if (!isSupported) {
        console.error(`❌ Unsupported platform. Supported: ${supportedPlatforms.join(', ')}`);
        process.exit(1);
    }

    try {
        // Load ETL modules
        const Downloader = require(path.join(ETL_SERVICE, 'Extract', 'downloader'));
        const VideoProcessor = require(path.join(ETL_SERVICE, 'Transform', 'processors', 'video-processor'));
        const AgentHandoff = require(path.join(ETL_SERVICE, 'Load', 'handoff', 'agent-context'));
        const LocalTranscriber = require(path.join(ETL_SERVICE, 'Transform', 'video-intelligence', 'local-transcriber'));

        const downloader = new Downloader();
        const processor = new VideoProcessor();
        const handoff = new AgentHandoff();
        const transcriber = new LocalTranscriber();

        // Detect platform and type early
        const { platform: detectedPlatform, type: detectedType } = await downloader.probe(url);
        const isVideoLink = detectedType === 'video';

        // STEP 1: Download
        console.log(`\n📥 Step 1/5: Downloading content...`);
        const { videoPath, images = [], metadata, status } = await downloader.download(url);
        const isVideoDownloaded = status === 'success' && !!videoPath;
        
        console.log(`✅ Status: ${status}`);
        if (metadata.title) console.log(`👉 Title: ${metadata.title}`);
        if (images.length > 0) console.log(`🖼️ Images found: ${images.length} (Carousel)`);

        let audioPath = null;
        let screenshots = [];
        let transcriptionText = "";

        if (isVideoDownloaded) {
            // STEP 2: Extract Audio
            console.log(`\n🔊 Step 2/5: Extracting audio...`);
            audioPath = await processor.extractAudio(videoPath);
            console.log(`✅ Audio: ${path.basename(audioPath)}`);

            // STEP 3: Capture Frames
            console.log(`\n📸 Step 3/5: Capturing frames...`);
            screenshots = await processor.extractScreenshots(videoPath, 5);
            console.log(`✅ Frames: ${screenshots.length} captured`);

            // STEP 4: Audio Transcription
            console.log(`\n🧠 Step 4/5: Gerando transcrição de áudio via Gemini 2.5 Manager...`);
            transcriptionText = await transcriber.analyze(audioPath, 'audio');
            console.log(`✅ Transcrição concluída.`);
        } else if (images.length > 0) {

            // STEP 2-4: Visual Analysis for Carousel/Post
            console.log(`\n🖼️ Step 2-4/5: Analisando slides/post (${images.length})...`);
            let visualAnalysis = `# Análise Visual\n\n## Descrição Original (Caption)\n\n${metadata.description || "Nenhuma legenda encontrada."}\n\n---\n\n`;
            for (let i = 0; i < images.length; i++) {
                console.log(`  - Analisando frame/slide ${i+1}/${images.length}...`);
                const slideAnalysis = await transcriber.analyze(images[i], 'image');
                visualAnalysis += `## Frame/Slide ${i+1}\n\n${slideAnalysis}\n\n---\n\n`;
                // Move image to screenshots for later use
                screenshots.push(images[i]);
            }
            transcriptionText = visualAnalysis;
            console.log(`✅ Análise visual concluída.`);
        } else {
            // Metadata only — no video, no images
            console.log(`\n⏩ Video/Image processing skipped (Metadata only).`);

            // For videos that failed to download, clearly indicate no transcription available
            if (isVideoLink) {
                transcriptionText = `⚠️ **Vídeo não disponível para transcrição.**\n\nO download do vídeo falhou e apenas metadados foram capturados.\nA descrição original está abaixo para referência:\n\n---\n\n${metadata.description || "_Nenhuma descrição disponível._"}`;
            } else {
                transcriptionText = metadata.description || "_Nenhum conteúdo textual extraído._";
            }

            // If it's a video link but we only got metadata, try to use thumbnail as a screenshot
            if (isVideoLink && metadata.thumbnail) {
                console.log(`  - Using thumbnail as reference frame...`);
            }
        }

        // STEP 5: Organize Output
        console.log(`\n📂 Step 5/5: Organizing output...`);
        
        // Helper to get slug
        const getSlug = (text) => {
            if (!text) return 'unknown';
            return text.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .substring(0, 60);
        };

        // Build descriptive slug from multiple sources
        let contentSlug = 'unknown';

        // Priority 1: First 60 chars of description (usually the actual content hook)
        if (metadata.description && metadata.description.length > 10) {
            // Clean and extract first meaningful sentence
            let cleaned = metadata.description
                .replace(/^\d+[KMBkmb]?\s*likes?,?\s*\d+\s*comments?\s*[-–—]\s*/i, '') // Remove "24K likes, 456 comments - "
                .replace(/^\w+\s+on\s+\w+\s+\d+,\s*\d+\s*:\s*/i, '') // Remove "publicitarioscriativos on April 6, 2026: "
                .replace(/^[""]|[""]$/g, '') // Remove quotes
                .replace(/[#@🔥💡✅❌📌👉📍]/g, '') // Remove emojis and symbols
                .replace(/\n+/g, ' ')
                .split(/[.!?]/)[0] // First sentence
                .trim();

            // If still starts with metadata noise, skip to next sentence
            if (/^\d+[KMBkmb]?\s*likes?/i.test(cleaned)) {
                cleaned = cleaned.split(/[.!?]/).slice(1).join('.').trim();
            }

            if (cleaned.length > 10) {
                contentSlug = getSlug(cleaned.substring(0, 60));
            }
        }

        // Priority 2: Title if it's descriptive enough
        if (!contentSlug || contentSlug === 'unknown' || contentSlug.length < 5) {
            if (metadata.title && metadata.title.length > 5 &&
                !metadata.title.toLowerCase().includes('video by') &&
                !metadata.title.toLowerCase().includes('instagram post')) {
                contentSlug = getSlug(metadata.title);
            }
        }

        // Priority 3: URL ID as last resort
        if (!contentSlug || contentSlug === 'unknown' || contentSlug.length < 5) {
            const urlIdmatch = url.match(/(?:reel|p|video|shorts|posts|activity|watch\?v=|\/)([a-zA-Z0-9_-]{5,})/);
            contentSlug = urlIdmatch && urlIdmatch[1] ? getSlug(urlIdmatch[1]) : `id${contentIndex}`;
        }
        
        // Final Folder Name: Conteudo-[Platform]-[UniqueHash]-[Slug]
        // Use short URL hash for uniqueness instead of date (avoids collisions)
        const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 6);
        const folderName = `Conteudo-${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)}-${urlHash}-${contentSlug}`;
        const contentDir = path.join(OUTPUT_BASE, folderName);

        if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

        // Save Content/Transcription - ALWAYS Transcrição.md for videos to match IG pattern
        const transcriptionFileName = isVideoLink ? 'Transcrição.md' : 'Conteudo.md';
        const transcriptionPath = path.join(contentDir, transcriptionFileName);

        let transcriptHeader = isVideoLink ? `# Transcrição — ${metadata.title || contentSlug}` : `# Conteúdo — ${metadata.title || contentSlug}`;
        
        // For posts, include full description + visual analysis
        let transcriptContent = '';
        if (!isVideoLink && metadata.description && metadata.description.length > 10) {
            transcriptContent = `${transcriptHeader}

# Descrição Original (Legenda Completa)

${metadata.description}

---

${transcriptionText || "_Nenhum conteúdo visual adicional extraído._"}
`;
        } else {
            transcriptContent = `${transcriptHeader}

${transcriptionText || "_Nenhum conteúdo textual extraído._"}
`;
        }
        fs.writeFileSync(transcriptionPath, transcriptContent);
 
        // Save Benchmark JSON
        const benchData = {
            id: `bench-${contentIndex}`,
            url: url,
            platform: detectedPlatform,
            type: isVideoLink ? 'video' : 'post',
            title: metadata.title || contentSlug,
            description: metadata.description || "",
            author: metadata.author || "Unknown",
            thumbnail: metadata.thumbnail || null,
            duration_seconds: metadata.duration || null,
            view_count: metadata.view_count || null,
            like_count: metadata.like_count || null,
            processed_at: new Date().toISOString(),
            status: (isVideoDownloaded || images.length > 0) ? 'full_assets' : 'metadata_only'
        };
        const benchPath = path.join(contentDir, 'Benchmark.json');
        fs.writeFileSync(benchPath, JSON.stringify(benchData, null, 2));

        // Move Frames
        if (screenshots.length > 0) {
            const framesDir = path.join(contentDir, 'Screenshots');
            if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
            for (const shot of screenshots) {
                const dest = path.join(framesDir, path.basename(shot));
                if (fs.existsSync(shot)) fs.renameSync(shot, dest);
            }
        }

        // Move Audio and Video
        let finalAudioPath = null;
        if (audioPath && fs.existsSync(audioPath)) {
            finalAudioPath = path.join(contentDir, path.basename(audioPath));
            fs.renameSync(audioPath, finalAudioPath);
        }
        
        let finalVideoPath = null;
        if (videoPath && fs.existsSync(videoPath)) {
            finalVideoPath = path.join(contentDir, path.basename(videoPath));
            fs.renameSync(videoPath, finalVideoPath);
        }

        // Create Análise.md
        const analysisPath = path.join(contentDir, 'Análise.md');
        if (!fs.existsSync(analysisPath)) {
            fs.writeFileSync(analysisPath, `# Análise — ${folderName}\n\n_Aguardando execução das auditorias (@mrbeast-mk, @garyvee-mk, @ladeira) direto na CLI._\n`);
        }

        // Create Handoff Dossier
        const dossierPath = await handoff.createDossier({
            url,
            platform: detectedPlatform,
            type: isVideoLink ? 'video' : 'post',
            videoPath: finalVideoPath,
            audioPath: finalAudioPath,
            framesPath: screenshots.length > 0 ? path.join(contentDir, 'Screenshots') : null,
            framesCount: screenshots.length,
            outputDir: contentDir,
            metadata: {
                timestamp: new Date().toISOString(),
                content_index: contentIndex,
                workflow_ref: 'benchmark-creative-analysis.yaml',
                status: isVideoDownloaded ? 'ready_for_video_audit' : 'ready_for_text_audit'
            }
        });

        // Cleanup temp files
        processor.cleanup();

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`✅ BENCHMARK ETL COMPLETO (AIOX NATIVE MODE)!`);
        console.log(`📂 Output: ${contentDir}`);
        console.log(`📋 Dossier: ${dossierPath}`);
        console.log(`\n💡 Próximo passo no seu dia-a-dia:`);
        console.log(`   Abra um novo chat na CLI e digite:`);
        console.log(`   "@marketing-chief Inicie a coordenação do workflow usando o dossier ${path.basename(dossierPath)}"`);
        console.log(`${'═'.repeat(60)}`);

        return {
            status: 'success',
            contentDir,
            dossierPath,
            folderName,
            benchData
        };

    } catch (error) {
        console.error(`\n❌ ETL FAILED: ${error.message}`);
        console.error(error.stack);
        return { status: 'error', error: error.message };
    }
}

// CLI
if (require.main === module) {
    const url = process.argv[2];
    const index = parseInt(process.argv[3]) || 1;

    if (!url) {
        console.error('Usage: node run-benchmark-single.js <URL> [content_index]');
        console.error('Example: node run-benchmark-single.js https://instagram.com/reel/xyz 1');
        process.exit(1);
    }

    runSingle(url, index);
}

module.exports = { runSingle };
