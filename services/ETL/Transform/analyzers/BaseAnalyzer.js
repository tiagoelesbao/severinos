const fs = require('fs');
const path = require('path');

/**
 * BaseAnalyzer — interface comum.
 *
 * Cada analyzer concreto deve expor:
 *   async run({ contentDir, url, classification, metadata, videoPath, audioPath, images })
 *     → { transcriptionMd, baseAnalysisMd, screenshots[], type, status }
 */
class BaseAnalyzer {
    constructor({ transcriber, processor }) {
        this.transcriber = transcriber;
        this.processor = processor;
    }

    fmtTime(s) {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(Math.floor(s % 60)).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    sanitize(str, fallback = 'untitled') {
        if (!str) return fallback;
        return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .toLowerCase()
            .substring(0, 60) || fallback;
    }

    writeFile(filePath, content) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * Detecta momentos-chave a partir dos segmentos da transcrição.
     * Heurística: pega início, ~25%, ~50%, ~75%, último, e sentenças com palavras-gatilho.
     */
    pickKeyMoments(segments, maxFrames = 8) {
        if (!segments || segments.length === 0) return [];
        const triggers = /\b(você|voce|primeiro|segredo|nunca|sempre|porqu[eê]|importante|atenc[ãa]o|olh[ae]|imagina|escuta|hoje|agora|aqui|veja|cuidado|n[aã]o|sim|melhor|pior|grande|gigante|incr[ií]vel|chocante)\b/i;

        const candidates = new Set();
        // Anchors: 0%, 25%, 50%, 75%, end
        const anchors = [0, 0.25, 0.5, 0.75, 1.0];
        for (const a of anchors) {
            const idx = Math.min(segments.length - 1, Math.floor(a * (segments.length - 1)));
            candidates.add(idx);
        }

        // Trigger sentences
        const triggered = [];
        segments.forEach((s, i) => {
            if (triggers.test(s.text)) triggered.push(i);
        });
        // Spread triggers (não usar dois muito próximos)
        const usedTimes = [...candidates].map(i => segments[i].start);
        for (const i of triggered) {
            const t = segments[i].start;
            if (usedTimes.every(u => Math.abs(u - t) > 8)) {
                candidates.add(i);
                usedTimes.push(t);
                if (candidates.size >= maxFrames) break;
            }
        }

        return [...candidates]
            .map(i => ({ time: segments[i].start, label: segments[i].text.slice(0, 30) }))
            .sort((a, b) => a.time - b.time)
            .slice(0, maxFrames);
    }
}

module.exports = BaseAnalyzer;
