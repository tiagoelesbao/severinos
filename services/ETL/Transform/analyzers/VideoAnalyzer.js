const path = require('path');
const fs = require('fs');
const BaseAnalyzer = require('./BaseAnalyzer');

/**
 * VideoAnalyzer — cobre Reels (IG), TikTok video, YouTube Shorts e YouTube longo.
 *
 * Fluxo:
 *  1. Extrai áudio
 *  2. Transcreve com timestamps (Whisper SRT → md formatado por minuto)
 *  3. Identifica momentos-chave da fala
 *  4. Captura frames nesses timestamps específicos
 *  5. Gera Análise.md base cruzando transcrição + frames
 */
class VideoAnalyzer extends BaseAnalyzer {
    async run({ contentDir, url, classification, metadata, videoPath }) {
        const screenshotsDir = path.join(contentDir, 'Screenshots');
        if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

        const result = {
            type: classification.type,
            subtype: classification.subtype,
            transcriptionMd: '',
            baseAnalysisMd: '',
            screenshots: [],
            keyMoments: [],
            status: 'ok'
        };

        if (!videoPath || !fs.existsSync(videoPath)) {
            result.status = 'no_video';
            result.transcriptionMd = `# Transcrição\n\n_Vídeo indisponível para download. Apenas metadados._\n\n## Descrição original\n${metadata.description || '_n/a_'}`;
            result.baseAnalysisMd = this.buildAnalysisMd({ classification, metadata, screenshots: [], segments: [], degraded: true, url });
            return result;
        }

        // 1. Áudio
        let audioPath = null;
        try {
            audioPath = await this.processor.extractAudio(videoPath);
        } catch (e) {
            console.warn(`[VideoAnalyzer] extractAudio falhou: ${e.message}`);
        }

        // 2. Transcrição com timestamps
        let transcript = { md: '', segments: [] };
        if (audioPath && fs.existsSync(audioPath)) {
            try {
                transcript = await this.transcriber.transcribeWithTimestamps(audioPath);
            } catch (e) {
                console.warn(`[VideoAnalyzer] transcribeWithTimestamps falhou: ${e.message}`);
            }
        }

        // 3. Key moments
        const moments = this.pickKeyMoments(transcript.segments, 8);
        result.keyMoments = moments;

        // 4. Screenshots
        let frames = [];
        if (moments.length > 0) {
            try {
                frames = await this.processor.extractFramesAtTimestamps(videoPath, moments, screenshotsDir);
            } catch (e) {
                console.warn(`[VideoAnalyzer] extractFramesAtTimestamps falhou: ${e.message}`);
            }
        }

        // Fallback: sem transcrição → captura ~8 frames distribuídos uniformemente pela duração.
        if (frames.length === 0) {
            try {
                const dur = Number(metadata.duration) || null;
                if (dur && dur > 0) {
                    // Distribui 8 frames ao longo do vídeo (10%, 20%, 30%, ..., 90%)
                    const distributed = Array.from({ length: 8 }, (_, i) => ({
                        time: Math.floor(dur * (0.1 + i * 0.1)),
                        label: `auto-${i + 1}`
                    }));
                    frames = await this.processor.extractFramesAtTimestamps(videoPath, distributed, screenshotsDir);
                } else {
                    // Sem duração conhecida → 5 frames a cada 5s, mas no MAX 8 totais
                    const fallbackPaths = await this.processor.extractScreenshots(videoPath, 5);
                    for (const p of fallbackPaths.slice(0, 8)) {
                        const dest = path.join(screenshotsDir, path.basename(p));
                        if (fs.existsSync(p) && p !== dest) fs.renameSync(p, dest);
                        frames.push({ time: null, label: 'auto', path: dest });
                    }
                    // Limpa o excesso (cleanup do processor faz isso, mas garantimos aqui)
                    for (const p of fallbackPaths.slice(8)) {
                        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
                    }
                }
            } catch (e) {
                console.warn(`[VideoAnalyzer] fallback frames falhou: ${e.message}`);
            }
        }
        result.screenshots = frames;

        // 5. Transcription markdown
        const dur = metadata.duration ? `${Math.floor(metadata.duration / 60)}m${Math.floor(metadata.duration % 60)}s` : '?';
        result.transcriptionMd = `# Transcrição — ${metadata.title || classification.subtype}\n\n` +
            `**Plataforma:** ${classification.subtype}  ·  **Duração:** ${dur}  ·  **Idioma:** auto\n\n` +
            `> Formatação: \`[mm:ss]\` por sentença, agrupado por minuto.\n\n---\n\n` +
            (transcript.md || '_Transcrição indisponível._');

        // 6. Análise base
        result.baseAnalysisMd = this.buildAnalysisMd({
            classification, metadata, screenshots: frames, segments: transcript.segments, degraded: !transcript.segments.length, url
        });

        // Cleanup audio (mantém video por enquanto)
        try { if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch (_) {}

        return result;
    }

    buildAnalysisMd({ classification, metadata, screenshots, segments, degraded, url }) {
        const dur = metadata.duration ? `${Math.floor(metadata.duration / 60)}m${Math.floor(metadata.duration % 60)}s` : '—';
        const totalWords = segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
        const wpm = (segments.length && metadata.duration) ? Math.round(totalWords / (metadata.duration / 60)) : '—';

        let md = `# Análise Base — ${metadata.title || classification.subtype}\n\n`;
        md += `**URL:** ${url}\n`;
        md += `**Tipo:** ${classification.type} · **Subtipo:** ${classification.subtype}\n`;
        md += `**Autor:** ${metadata.author || '—'}  ·  **Duração:** ${dur}  ·  **Views:** ${metadata.view_count || '—'}  ·  **Likes:** ${metadata.like_count || '—'}\n`;
        if (degraded) md += `\n> ⚠️ Análise degradada (sem áudio/transcrição). Auditorias devem partir de metadata + screenshots.\n`;
        md += `\n---\n\n`;

        md += `## 📊 Métricas Quantitativas\n\n`;
        md += `| Métrica | Valor |\n| :--- | ---: |\n`;
        md += `| Sentenças transcritas | ${segments.length} |\n`;
        md += `| Total de palavras | ${totalWords} |\n`;
        md += `| Palavras por minuto (ritmo) | ${wpm} |\n`;
        md += `| Frames capturados (key moments) | ${screenshots.length} |\n\n`;

        if (screenshots.length > 0) {
            md += `## 📸 Frames-chave (capturados em momentos relevantes da fala)\n\n`;
            md += `| # | Timestamp | Trecho da fala | Arquivo |\n| :- | :--- | :--- | :--- |\n`;
            screenshots.forEach((s, i) => {
                const ts = s.time != null ? this.fmtTime(s.time) : '—';
                const label = (s.label || '').replace(/\|/g, '\\|');
                md += `| ${i + 1} | \`${ts}\` | ${label} | \`Screenshots/${path.basename(s.path)}\` |\n`;
            });
            md += `\n`;
        }

        if (segments.length > 0) {
            md += `## 🎯 Hooks Detectados (primeiros 10s)\n\n`;
            const hooks = segments.filter(s => s.start <= 10);
            if (hooks.length) {
                hooks.forEach(h => { md += `- **[${this.fmtTime(h.start)}]** ${h.text}\n`; });
            } else {
                md += `_Nenhuma sentença detectada nos primeiros 10s._\n`;
            }
            md += `\n`;
        }

        md += `## 🧠 Espaço para Auditorias Especializadas\n\n`;
        md += `Os agentes especializados devem preencher abaixo cruzando a transcrição (timestamps) com os frames-chave acima:\n\n`;
        md += `### @mrbeast-mk — Retenção & Hook\n\n_Pendente. Score: __/10_\n\n`;
        md += `### @garyvee-mk — Contexto & Vibe\n\n_Pendente. Score: __/10_\n\n`;
        md += `### @ladeira — Copy & Gatilhos\n\n_Pendente. Score: __/10_\n\n`;
        md += `### Síntese Final (marketing-chief)\n\n_Pendente._\n`;
        return md;
    }
}

module.exports = VideoAnalyzer;
