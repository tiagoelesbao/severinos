/**
 * Smoke test — Gemini Audio transcription via inline_data.
 * Uso: node services/ETL/Transform/video-intelligence/test-gemini-audio.js <video-or-audio-path>
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '..', '..', '.env') });
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const LocalTranscriber = require('./local-transcriber');

(async () => {
    const inputPath = process.argv[2];
    if (!inputPath) {
        console.error('Usage: node test-gemini-audio.js <video-or-audio-path>');
        process.exit(1);
    }

    const t = new LocalTranscriber();
    console.log(`Gemini key: ${t.geminiKey ? '✓' : '✗'}`);
    console.log(`Input: ${inputPath}\n`);

    // Se for vídeo, extrair áudio primeiro
    let audioPath = inputPath;
    if (/\.(mp4|mov|webm|avi|mkv)$/i.test(inputPath)) {
        const tmpDir = path.resolve(__dirname, '..', '..', '..', '..', '.aiox', 'tmp', 'etl');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        audioPath = path.join(tmpDir, `test_${Date.now()}.mp3`);
        console.log(`Extraindo áudio para ${audioPath}...`);
        execSync(`ffmpeg -i "${inputPath}" -b:a 32k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'ignore' });
    }

    const t0 = Date.now();
    const result = await t.transcribeWithGemini(audioPath);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    console.log(`\n=== RESULT (${elapsed}s) ===`);
    console.log(`Segments: ${result.segments.length}`);
    if (result.segments.length > 0) {
        console.log(`First: [${result.segments[0].start.toFixed(0)}s] ${result.segments[0].text}`);
        console.log(`Last:  [${result.segments[result.segments.length-1].start.toFixed(0)}s] ${result.segments[result.segments.length-1].text}`);
    }
    console.log(`\n--- MD PREVIEW ---`);
    console.log(result.md.substring(0, 1500));
})();
