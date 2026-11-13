/**
 * hf-i2v.js — Image-to-video via HuggingFace Inference Providers (Wan 2.2 I2V).
 *
 * ⭐ POR QUE ESTE ADAPTER EXISTE
 * Em 2026-07-26 todos os serviços dedicados de i2v testados passaram a exigir saldo:
 * fal.ai (403 exhausted balance), MiniMax (1008 insufficient balance), Replicate (401),
 * Kling (exige Access+Secret). O dono pediu para manter só o que funciona em free tier.
 *
 * Este caminho sobreviveu: o HF roteia o modelo para um provider terceiro (fal-ai) e
 * cobra do POOL DE CRÉDITO MENSAL GRATUITO da conta HuggingFace — a mesma chave que já
 * gera imagem aqui. Não precisa de saldo na fal.
 *
 * VERIFICADO AO VIVO (2026-07-26):
 *   POST https://router.huggingface.co/fal-ai/fal-ai/wan/v2.2-a14b/image-to-video
 *   → 200 em ~53s, { video: { url, file_size } }
 *   → mp4 baixado: 720x1280 (9:16), h264, 5,03s, 1,79 MB
 *
 * ⚠️ O crédito mensal do HF é FINITO. Quando acabar, este provider devolve
 * quotaExceeded e a cascata rebaixa para o tier C procedural, que é ilimitado.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const ROUTER = 'https://router.huggingface.co';

// Descoberto via `GET /api/models/{id}?expand[]=inferenceProviderMapping`.
// Não é chute: é o providerId que o HF publica para o roteamento.
const MODEL_ID = 'Wan-AI/Wan2.2-I2V-A14B';
const ROUTED_PATH = 'fal-ai/fal-ai/wan/v2.2-a14b/image-to-video';

// O Wan gera a ~16fps nativos; num_frames controla a duração aproximada.
const FPS_NATIVE = 16;

function ffmpegPath() {
    const local = path.join(REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}

function isQuotaSignal(status, bodyText) {
    return (
        status === 429 ||
        status === 402 ||
        /quota|credit|insufficient|exceeded|balance|rate limit/i.test(String(bodyText || ''))
    );
}

/**
 * Normaliza a saída do modelo para o padrão do pipeline.
 * O Wan devolve 720x1280 @32fps com duração própria; os demais takes são
 * 1080x1920 @30fps com duração exata do plano. Sem esta normalização, a
 * montagem da F6 recebe clipes heterogêneos e o concat fica instável.
 */
function normalize(inputPath, outputPath, durationSeconds, width, height) {
    const dur = Math.max(0.5, Number(durationSeconds) || 5);
    const w = width || 1080;
    const h = height || 1920;

    // scale+crop cobre o caso de o provider mudar a proporção de saída.
    const vf = [
        `scale=${w}:${h}:force_original_aspect_ratio=increase`,
        `crop=${w}:${h}`,
        `fps=30`,
    ].join(',');

    const r = spawnSync(
        ffmpegPath(),
        [
            '-hide_banner', '-nostats', '-y',
            '-stream_loop', '-1', // se o clipe for mais curto que o take, repete em loop
            '-i', inputPath,
            '-t', String(dur),
            '-vf', vf,
            '-an',
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20',
            outputPath,
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 180000 }
    );

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10240) {
        const err = (r.stderr || '').split('\n').filter(Boolean).slice(-2).join(' | ');
        return { ok: false, reason: `normalização ffmpeg falhou: ${err.slice(0, 200)}` };
    }
    return { ok: true };
}

module.exports = {
    id: 'hf-i2v',
    tier: 'B',
    kind: 'video',
    supportsImageInput: true,
    requiresAuth: 'HF_TOKEN',
    model: MODEL_ID,

    async check() {
        const key = String(process.env.HF_TOKEN || '').trim();
        if (!key) return { available: false, reason: 'HF_TOKEN ausente' };
        return { available: true };
    },

    async generate({ inputImage, prompt, durationSeconds, outputPath, width, height }) {
        const key = String(process.env.HF_TOKEN || '').trim();
        if (!key) return { ok: false, reason: 'HF_TOKEN ausente' };
        if (!inputImage || !fs.existsSync(inputImage)) {
            return { ok: false, reason: `imagem de entrada ausente: ${inputImage}` };
        }

        const dur = Math.max(1, Number(durationSeconds) || 5);
        // Teto de 81 frames: acima disso o custo em crédito sobe sem ganho para
        // takes de 3–6s, que é toda a faixa usada no farming.
        const numFrames = Math.min(81, Math.max(33, Math.round(dur * FPS_NATIVE)));

        const b64 = fs.readFileSync(inputImage).toString('base64');
        const ext = path.extname(inputImage).toLowerCase() === '.jpg' ? 'jpeg' : 'png';

        let res;
        let text;
        try {
            res = await fetch(`${ROUTER}/${ROUTED_PATH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
                body: JSON.stringify({
                    image_url: `data:image/${ext};base64,${b64}`,
                    prompt: String(prompt || 'gentle cinematic camera movement, subtle motion'),
                    num_frames: numFrames,
                }),
                signal: AbortSignal.timeout(300000), // o modelo leva ~50s; margem larga
            });
            text = await res.text();
        } catch (e) {
            return { ok: false, reason: `rede: ${e.message.slice(0, 160)}` };
        }

        if (!res.ok) {
            if (isQuotaSignal(res.status, text)) {
                return { ok: false, quotaExceeded: true, reason: `HF ${res.status}: crédito esgotado` };
            }
            return { ok: false, reason: `HF ${res.status}: ${String(text).slice(0, 180)}` };
        }

        let payload;
        try {
            payload = JSON.parse(text);
        } catch (_) {
            return { ok: false, reason: 'resposta não-JSON do router HF' };
        }

        const videoUrl = payload && payload.video && payload.video.url;
        if (!videoUrl) {
            // Crédito esgotado às vezes volta 200 com corpo de erro.
            if (isQuotaSignal(200, text)) return { ok: false, quotaExceeded: true };
            return { ok: false, reason: `sem URL de vídeo na resposta: ${text.slice(0, 160)}` };
        }

        // Baixa o mp4 gerado.
        const tmp = `${outputPath}.raw.mp4`;
        try {
            const dl = await fetch(videoUrl, { signal: AbortSignal.timeout(180000) });
            if (!dl.ok) return { ok: false, reason: `download do vídeo falhou: HTTP ${dl.status}` };
            const buf = Buffer.from(await dl.arrayBuffer());
            if (buf.length < 10240) return { ok: false, reason: `vídeo baixado é pequeno demais (${buf.length} bytes)` };
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(tmp, buf);
        } catch (e) {
            return { ok: false, reason: `download: ${e.message.slice(0, 160)}` };
        }

        const norm = normalize(tmp, outputPath, dur, width, height);
        try { fs.unlinkSync(tmp); } catch (_) { /* temp */ }
        if (!norm.ok) return { ok: false, reason: norm.reason };

        return { ok: true, outputPath };
    },
};
