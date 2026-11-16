const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Video Processor: Viral ETL
 * Usa FFmpeg para otimizar análise (extração de áudio e visual strip).
 * 0-cost, local-first.
 */
class VideoProcessor {
    constructor(tempDir = '.aiox/tmp/etl') {
        this.tempDir = path.resolve(tempDir);
        if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
    }

    /**
     * Extrai áudio acelerado para transcrição se desejado (sugerido manter 1x para precisão).
     * Otimiza para Gemini que aceita áudio direto.
     */
    async extractAudio(videoPath) {
        const audioPath = path.join(this.tempDir, `${path.basename(videoPath, path.extname(videoPath))}.mp3`);
        console.log(`[VideoProcessor] Extracting audio to ${audioPath}`);
        
        // Extrai áudio em 128k mono para economizar espaço e manter fidelidade
        const cmd = `ffmpeg -i "${videoPath}" -b:a 32k -map a -ar 16000 -ac 1 "${audioPath}" -y`;
        execSync(cmd, { stdio: 'ignore' });
        
        return audioPath;
    }

    /**
     * Tira screenshots em intervalos regulares para contexto visual.
     * Gera uma colagem (filmstrip) para análise de IA de baixo custo.
     */
    async extractScreenshots(videoPath, intervalSeconds = 5) {
        const outputPattern = path.join(this.tempDir, `${path.basename(videoPath, path.extname(videoPath))}_thumb_%03d.jpg`);
        console.log(`[VideoProcessor] Extracting frames every ${intervalSeconds}s`);
        
        const cmd = `ffmpeg -i "${videoPath}" -vf "fps=1/${intervalSeconds},scale=640:-1" "${outputPattern}" -y`;
        execSync(cmd, { stdio: 'ignore' });

        return fs.readdirSync(this.tempDir)
                 .filter(f => f.includes('_thumb_'))
                 .map(f => path.join(this.tempDir, f));
    }

    /**
     * Captura frames em timestamps específicos (em segundos).
     * Útil quando há transcrição: capturamos o momento exato da fala-chave.
     *
     * @param {string} videoPath
     * @param {Array<{time: number, label?: string}>} marks — Lista de momentos
     * @param {string} outputDir — Pasta destino (default this.tempDir)
     * @returns {Promise<Array<{time: number, label: string, path: string}>>}
     */
    async extractFramesAtTimestamps(videoPath, marks, outputDir = null) {
        const dest = outputDir || this.tempDir;
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        const results = [];
        for (let i = 0; i < marks.length; i++) {
            const mark = marks[i];
            const time = Math.max(0, Number(mark.time) || 0);
            const mm = String(Math.floor(time / 60)).padStart(2, '0');
            const ss = String(Math.floor(time % 60)).padStart(2, '0');
            const label = (mark.label || `key-${i + 1}`).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
            const fileName = `frame_${String(i + 1).padStart(2, '0')}_at_${mm}-${ss}_${label}.jpg`;
            const outPath = path.join(dest, fileName);
            try {
                const cmd = `ffmpeg -ss ${time} -i "${videoPath}" -vframes 1 -vf "scale=720:-1" -q:v 3 "${outPath}" -y`;
                execSync(cmd, { stdio: 'ignore' });
                if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
                    results.push({ time, label, path: outPath });
                }
            } catch (e) {
                console.warn(`[VideoProcessor] Falha ao capturar frame em ${time}s: ${e.message}`);
            }
        }
        return results;
    }

    /**
     * Limpa arquivos temporários.
     */
    cleanup() {
        if (fs.existsSync(this.tempDir)) {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) fs.unlinkSync(path.join(this.tempDir, file));
        }
    }
}

module.exports = VideoProcessor;
