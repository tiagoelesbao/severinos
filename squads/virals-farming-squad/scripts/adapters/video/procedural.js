/**
 * adapters/video/procedural.js — Tier C de vídeo: Ken Burns / parallax 2.5D via ffmpeg.
 *
 * ESTE É O DEGRAU GARANTIDO. Ilimitado, custo zero, e — nos nichos religioso e
 * cartomante — a ESTÉTICA NATIVA do formato "imagem animada + áudio", não um
 * fallback de pior qualidade. Ele NUNCA pode falhar silenciosamente: se ffmpeg
 * não está disponível no ambiente, isso é reportado alto (não engolido).
 *
 * Técnica: `zoompan` do ffmpeg sobre uma imagem estática (`-loop 1 -i`).
 *
 * ARMADILHA CONHECIDA (documentada no farm-video-takes.md): aplicar `zoompan`
 * direto numa imagem do mesmo tamanho do output produz jitter/tremor, porque o
 * filtro calcula a janela de corte em pixels inteiros sobre o frame de entrada —
 * se a entrada não é MUITO maior que a saída, incrementos de zoom sub-pixel viram
 * ou "nenhuma mudança" (soluço/freeze) ou saltos perceptíveis. A correção é fazer
 * upscale da imagem (aqui, 4x) ANTES do zoompan, dando resolução suficiente para
 * que o deslocamento da janela de corte mapeie para posições de pixel distintas
 * em cada frame de saída — movimento suave em vez de tremido.
 *
 * As expressões de zoom/x/y são calculadas em função de `on` (número do frame de
 * SAÍDA, 0-indexado) de forma direta — não recursiva sobre `zoom` — para que o
 * movimento termine EXATAMENTE no frame final do take, sem acúmulo de erro de
 * arredondamento ao longo da geração.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('../../_niche-loader.js');

const FPS = 30;
// Fator de upscale antes do zoompan. 4x é o mínimo confortável para 1080x1920 →
// 4320x7680 sem introduzir jitter perceptível nos presets mais lentos (breathing).
const UPSCALE = 4;

const MOTION_PRESETS = [
    'slow-push-in',
    'slow-pull-out',
    'pan-lr',
    'pan-ud',
    'parallax-2p5d',
    'breathing',
];

function ffmpegBin() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}
function ffprobeBin() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

/** Confirma que o binário ffmpeg responde — o degrau garantido não pode assumir sem checar. */
function ffmpegWorks() {
    try {
        const r = spawnSync(ffmpegBin(), ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
        return r.status === 0;
    } catch (_) {
        return false;
    }
}

/** Lê duração/dimensões/codec do mp4 gerado — validação real, não confiança cega no ffmpeg exit code. */
function probeOutput(outputPath) {
    try {
        const r = spawnSync(
            ffprobeBin(),
            [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-show_entries', 'stream=width,height,codec_name',
                '-of', 'default=nw=1',
                outputPath,
            ],
            { encoding: 'utf8', windowsHide: true, timeout: 30000 }
        );
        const out = r.stdout || '';
        const num = (key) => {
            const m = out.match(new RegExp(`${key}=([\\d.]+)`));
            return m ? Number(m[1]) : null;
        };
        const strMatch = out.match(/codec_name=(\S+)/);
        return {
            duration: num('duration'),
            width: num('width'),
            height: num('height'),
            codec: strMatch ? strMatch[1] : null,
        };
    } catch (_) {
        return null;
    }
}

/**
 * Constrói o filtro `scale,zoompan` para um preset de movimento.
 * `frames` já é fps*duração (calculado pelo chamador) — a expressão de zoom usa
 * `on` (0..frames-1) para chegar no valor-alvo exatamente no último frame.
 */
function buildFilter(preset, frames, width, height, intensity = 'strong') {
    const upW = width * UPSCALE;
    const upH = height * UPSCALE;
    // Evita divisão por zero em takes degenerados de 1 frame (não deveria ocorrer
    // com durações reais de 3-6s, mas a expressão não pode quebrar se ocorrer).
    const maxOn = Math.max(frames - 1, 1);

    // Zoom centrado no meio do quadro — mantém o sujeito enquadrado ao dar zoom.
    const centerX = 'iw/2-(iw/zoom/2)';
    const centerY = 'ih/2-(ih/zoom/2)';

    let zoomExpr;
    let xExpr;
    let yExpr;

    // AMPLITUDE DO MOVIMENTO — recalibrada em 2026-07-27.
    //
    // A primeira calibração (push-in até 1.25, pan com folga de 1.15, respiração de
    // 0.035) foi desenhada para ser discreta e, vista no criativo montado, ficou
    // fraca demais: o vídeo lia como imagem parada. Em conteúdo vertical de
    // aquecimento o movimento precisa ser PERCEPTÍVEL nos primeiros segundos, senão
    // o espectador rola antes do beat. Amplitudes praticamente dobradas.
    //
    // `intensity` permite voltar atrás por take/nicho sem tocar no código:
    //   subtle = a calibração antiga · medium = intermediária · strong = padrão atual
    const AMP = { subtle: 0.5, medium: 0.75, strong: 1.0 }[intensity || 'strong'] || 1.0;
    const lerp = (base, full) => base + (full - base) * AMP;

    switch (preset) {
        case 'slow-push-in': {
            // Zoom in linear até ~1.55 no modo strong — hook: puxa para dentro da cena.
            const zEnd = lerp(1.25, 1.55);
            const inc = (zEnd - 1.0) / maxOn;
            zoomExpr = `min(1.0+${inc.toFixed(10)}*on,${zEnd.toFixed(4)})`;
            xExpr = centerX;
            yExpr = centerY;
            break;
        }
        case 'slow-pull-out': {
            // Zoom out até 1.0 — fechamento: abre e revela a cena inteira.
            const zStart = lerp(1.25, 1.55);
            const inc = (zStart - 1.0) / maxOn;
            zoomExpr = `max(${zStart.toFixed(4)}-${inc.toFixed(10)}*on,1.0)`;
            xExpr = centerX;
            yExpr = centerY;
            break;
        }
        case 'pan-lr': {
            // Zoom constante > 1 abre "folga" horizontal para o pan varrer sem expor
            // bordas. Folga maior = trajeto maior = movimento visível.
            const z = lerp(1.15, 1.40);
            zoomExpr = `${z.toFixed(4)}`;
            xExpr = `(iw-iw/zoom)*on/${maxOn}`;
            yExpr = centerY;
            break;
        }
        case 'pan-ud': {
            const z = lerp(1.15, 1.40);
            zoomExpr = `${z.toFixed(4)}`;
            xExpr = centerX;
            yExpr = `(ih-ih/zoom)*on/${maxOn}`;
            break;
        }
        case 'parallax-2p5d': {
            // Sem segmentação real de profundidade — aproximação 2.5D: zoom + deslocamento
            // diagonal em taxas DIFERENTES em x e y, o que sugere separação figura/fundo.
            // Com amplitude maior o efeito finalmente lê como parallax, não como drift.
            const zStart = lerp(1.05, 1.08);
            const zEnd = lerp(1.18, 1.45);
            const inc = (zEnd - zStart) / maxOn;
            const dx = lerp(0.02, 0.06);
            const dy = lerp(0.015, 0.045);
            zoomExpr = `min(${zStart.toFixed(4)}+${inc.toFixed(10)}*on,${zEnd.toFixed(4)})`;
            xExpr = `(${centerX})+(iw*${dx.toFixed(4)})*(on/${maxOn})`;
            yExpr = `(${centerY})+(ih*${dy.toFixed(4)})*(on/${maxOn})`;
            break;
        }
        case 'breathing': {
            // Zoom pulsante via seno. Ciclo mais curto (~1,6s) e amplitude bem maior:
            // com 0.035 o efeito era invisível em tela de celular.
            const cycleFrames = Math.round(FPS * lerp(2.0, 1.6));
            const base = lerp(1.05, 1.10);
            const amp = lerp(0.035, 0.09);
            zoomExpr = `${base.toFixed(4)}+${amp.toFixed(4)}*sin(2*PI*on/${cycleFrames})`;
            xExpr = centerX;
            yExpr = centerY;
            break;
        }
        default:
            throw new Error(`preset de movimento desconhecido: "${preset}". Válidos: ${MOTION_PRESETS.join(', ')}`);
    }

    return `scale=${upW}:${upH},zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${FPS}`;
}

module.exports = {
    id: 'procedural-motion',
    tier: 'C',
    kind: 'video',
    label: 'Ken Burns / parallax 2.5D (ffmpeg)',
    supportsImageInput: true,
    requiresAuth: null,
    MOTION_PRESETS,

    /**
     * Sempre disponível em princípio — mas confirmamos que o binário responde de
     * verdade em vez de assumir. Reportar `available:false` aqui é legítimo (ex.:
     * ffmpeg não instalado neste ambiente), não um erro do adapter.
     */
    async check() {
        if (!ffmpegWorks()) {
            return {
                available: false,
                reason: `ffmpeg não respondeu (binário: ${ffmpegBin()}). Instale/verifique o PATH — este é o degrau que nunca deveria faltar.`,
            };
        }
        return { available: true };
    },

    /**
     * @param {object} req
     * @param {string} req.inputImage        PNG 9:16 de entrada
     * @param {string} [req.prompt]           ignorado (procedural não usa linguagem natural)
     * @param {string} req.preset             um de MOTION_PRESETS
     * @param {number} req.durationSeconds
     * @param {string} req.outputPath
     * @param {number} [req.width]            default 1080
     * @param {number} [req.height]           default 1920
     */
    async generate({ inputImage, preset, durationSeconds, outputPath, width, height, intensity }) {
        const W = width || 1080;
        const H = height || 1920;

        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada não encontrada: ${inputImage}` };
        }
        if (!MOTION_PRESETS.includes(preset)) {
            return { ok: false, reason: `preset de movimento desconhecido: "${preset}". Válidos: ${MOTION_PRESETS.join(', ')}` };
        }
        if (!ffmpegWorks()) {
            return { ok: false, reason: `ffmpeg não respondeu (binário: ${ffmpegBin()})` };
        }

        const duration = Math.max(0.5, Number(durationSeconds) || 5);
        const frames = Math.max(1, Math.round(duration * FPS));

        let vf;
        try {
            vf = buildFilter(preset, frames, W, H, intensity || 'strong');
        } catch (e) {
            return { ok: false, reason: e.message };
        }

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        // Arquivo temporário: nunca deixamos um mp4 corrompido no caminho final se
        // o processo ffmpeg for interrompido no meio.
        const tmpOut = `${outputPath}.tmp.mp4`;
        try { fs.unlinkSync(tmpOut); } catch (_) {}

        const args = [
            '-y',
            '-loop', '1',
            '-i', inputImage,
            '-vf', vf,
            '-t', String(duration),
            '-pix_fmt', 'yuv420p',
            '-c:v', 'libx264',
            '-profile:v', 'high',
            '-movflags', '+faststart',
            '-an',
            tmpOut,
        ];

        const r = spawnSync(ffmpegBin(), args, { encoding: 'utf8', windowsHide: true, timeout: 120000 });
        if (r.status !== 0 || !fs.existsSync(tmpOut)) {
            try { fs.unlinkSync(tmpOut); } catch (_) {}
            return {
                ok: false,
                reason: `ffmpeg falhou (preset=${preset}, duração=${duration}s): ${(r.stderr || '').slice(-500)}`,
            };
        }

        const probe = probeOutput(tmpOut);
        if (!probe || !probe.duration) {
            try { fs.unlinkSync(tmpOut); } catch (_) {}
            return { ok: false, reason: `mp4 gerado é ilegível pelo ffprobe (preset=${preset}): ${tmpOut}` };
        }
        // Tolerância generosa aqui (validação estrita ±0.15s é responsabilidade de
        // farm-takes.js, que valida TODOS os tiers com o mesmo critério). Este check
        // interno só pega desvios grosseiros (ex.: filtro mal montado truncando cedo).
        if (Math.abs(probe.duration - duration) > 0.6) {
            try { fs.unlinkSync(tmpOut); } catch (_) {}
            return {
                ok: false,
                reason: `duração muito fora do esperado (preset=${preset}): gerado ${probe.duration}s, esperado ${duration}s`,
            };
        }
        if (probe.codec && probe.codec !== 'h264') {
            try { fs.unlinkSync(tmpOut); } catch (_) {}
            return { ok: false, reason: `codec inesperado: ${probe.codec} (esperado h264)` };
        }

        fs.renameSync(tmpOut, outputPath);

        return {
            ok: true,
            outputPath,
            meta: {
                preset,
                duration: probe.duration,
                width: probe.width,
                height: probe.height,
                codec: probe.codec,
                upscale: `${W * UPSCALE}x${H * UPSCALE}`,
            },
        };
    },
};
