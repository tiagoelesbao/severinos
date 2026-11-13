/**
 * _studio-mirror.js — Espelha no video-studio o criativo EXATO que a F6 exportou.
 *
 * A tentativa anterior falhou porque publicava as peças e deixava o editor montar. Este
 * módulo faz o oposto: traduz o `timeline.json` e o `captions.ass` da F6 no modelo do
 * editor, campo a campo, e desliga tudo que ele aplicaria por conta própria.
 *
 * LIMITES DO EDITOR (mapeados lendo o código do app) E COMO SÃO CONTORNADOS:
 *
 *  · CROP NÃO EXISTE. `TimelineClip` não tem recorte — só `frameMode:"cover"` centrado
 *    e `kenBurns` (que cresce ao longo do clipe). Como a remoção da marca d'água é um
 *    corte de 7% da base, ela é aplicada NO ARQUIVO publicado: o take vai para
 *    `Materiais Brutos/` já recortado e em 1080×1920. O editor recebe pronto.
 *
 *  · TIPOGRAFIA (resolvido no app, 2026-08): o elemento de texto ignorava as quebras,
 *    fixava `fontWeight:800` e desenhava SOMBRA no lugar do contorno — o export sai com
 *    o bold real da família e um contorno preto de 4px. Na tela ficava outra fonte,
 *    outro peso e sem contorno. Hoje o clipe carrega família, corpo, peso, contorno,
 *    sombra e entrelinha, e o texto vai INTEIRO (um elemento por cue do .ass), com as
 *    quebras e os parágrafos que o gerador decidiu.
 *
 *  · FADE GLOBAL NÃO EXISTE, mas `fadeIn`/`fadeOut` por clipe sim: entram no primeiro
 *    e no último clipe, com os valores do `open`/`close` da F6.
 *
 * O QUE O RENDERER APLICA SOZINHO, mesmo com save persistido — e como é desligado:
 *   dissolve de 6 frames em todo clipe idx>0  → `transitionIn:{type:"none",...}` explícito
 *   HookFx no clipe 0                          → `hookRenderer:"hard-cut"`
 *   painel com moldura e blur                  → `frameMode:"cover"` em todos
 *   barra de progresso                         → `motionRenderers: []`
 *   overlay de legendas                        → `fxPlan.captions: []`
 *
 * DIVERGÊNCIA CONHECIDA E ACEITA: o editor aplica um fade-out de áudio de 12 frames
 * (hardcoded, `audioEnvelopes.ts`). Não há como desligar sem tocar no app.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FPS = 30;
const W = 1080;
const H = 1920;

// TIPOGRAFIA DO LIBASS — duas conversões que não são óbvias e foram MEDIDAS no
// material real (mesma frase, mesma família, frame a frame):
//
//  · O `Fontsize` do .ass NÃO é o corpo em px. Por compatibilidade com o VSFilter,
//    o libass trata esse número como a ALTURA DA CÉLULA da fonte (ascendente +
//    descendente das métricas Windows), e o em fica menor. Medido no criativo 02:
//    a mesma linha saiu com 689px no export e 946px no editor a 76px — o editor
//    desenhando 37% maior. O corpo equivalente em CSS é 0,728 × Fontsize.
//
//  · O PASSO ENTRE LINHAS é o próprio Fontsize em px — coerente com o item acima:
//    se o número é a altura da célula, empilhar células é avançar esse tanto.
//    Medido por autocorrelação do perfil de linhas no criativo 01: 76,03px para
//    Fontsize 76. Em CSS, com o corpo já convertido, isso é 1/0,728 = 1,3736.
//
//    (Medir pelo topo da tinta de duas linhas NÃO funciona: acento e ascendente
//    mudam o topo em ~10px e o erro fica maior que o efeito. Foi assim que uma
//    primeira calibragem chegou a 1,219 — plausível, porque bate com as métricas
//    da fonte, e errada. A autocorrelação usa o perfil inteiro e não se ilude.)
//
// Os fatores dependem das métricas da família. Estão calibrados para a Montserrat,
// que é a fonte dos criativos; outras famílias herdam o mesmo valor até serem
// medidas (o desvio é de escala, não de desenho).
const FATOR_CORPO_LIBASS = 0.728;
const ENTRELINHA_LIBASS = Number((1 / FATOR_CORPO_LIBASS).toFixed(4));

// Altura tipográfica da Montserrat (ascendente + descendente, 968 + 251 por 1000 de em).
// É MENOR que o passo entre linhas, e a sobra vira "meia entrelinha" — espaço que o CSS
// distribui acima da primeira linha e abaixo da última, e que o libass não põe. Sem
// compensar, o bloco do editor sobe ~4px em relação ao do export (medido em dois
// criativos). A correção vale metade da sobra e acompanha o corpo da fonte.
const ALTURA_TIPOGRAFICA = 1.219;

function ffmpegBin(repoRoot) {
    const local = path.join(repoRoot, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}

/**
 * Publica o take já NORMALIZADO: dewatermark + 9:16 + fps fixo.
 * O editor não sabe recortar, então recebe o quadro final.
 */
function bakeTake(repoRoot, src, dest, { dewatermark }) {
    const filtros = [];
    if (dewatermark && dewatermark.enabled) {
        const z = Math.min(Math.max(Number(dewatermark.zoom) || 0.07, 0.01), 0.3);
        const keep = (1 - z).toFixed(4);
        const y = /^t/i.test(String(dewatermark.corner || 'br')) ? `ih-ih*${keep}` : '0';
        filtros.push(`crop=iw*${keep}:ih*${keep}:(iw-iw*${keep})/2:${y}`);
    }
    filtros.push(`scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, `fps=${FPS}`, 'setsar=1');

    const r = spawnSync(ffmpegBin(repoRoot), [
        '-y', '-i', src, '-vf', filtros.join(','),
        '-an',                       // o áudio vem da trilha do benchmark, não do take
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        // Um keyframe por segundo. O GOP default do x264 (250 frames) é maior que estes
        // clipes, e o arquivo sairia com keyframe só no tempo zero — o que obriga o
        // compositor do editor a redecodificar desde o início a cada seek e, sob
        // concorrência, faz a extração de frame falhar. O app também foi corrigido,
        // mas publicar já com keyframes frequentes evita depender disso.
        '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
        '-movflags', '+faststart', dest,
    ], { encoding: 'utf8', windowsHide: true, timeout: 5 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });

    if (r.status !== 0 || !fs.existsSync(dest)) {
        return { ok: false, reason: `ffmpeg falhou: ${(r.stderr || '').slice(-300)}` };
    }
    return { ok: true };
}

/**
 * Duração REAL do arquivo publicado, em frames.
 *
 * O clipe quase sempre é mais longo que o take: a montagem estende o último quadro
 * (`tpad=clone`) para casar com o áudio. O editor precisa saber onde a mídia acaba —
 * sem isso o `<video>` passa do fim do arquivo e o preview pisca preto na virada.
 */
function framesDaMidia(repoRoot, file) {
    const local = path.join(repoRoot, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    const bin = fs.existsSync(local) ? local : 'ffprobe';
    const r = spawnSync(bin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    const d = Number(String(r.stdout || '').trim());
    return Number.isFinite(d) && d > 0 ? Math.floor(d * FPS) : 0;
}

/** Cues do .ass da F6 — a referência exata de texto, posição e tempo. */
function parseAssCues(assPath) {
    if (!fs.existsSync(assPath)) return [];
    const out = [];
    for (const linha of fs.readFileSync(assPath, 'utf8').split(/\r?\n/)) {
        if (!linha.startsWith('Dialogue:')) continue;
        const p = linha.slice('Dialogue:'.length).split(',');
        if (p.length < 10) continue;
        const toSec = (t) => {
            const m = String(t).trim().match(/(\d+):(\d+):(\d+)[.,](\d+)/);
            return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 100 : 0;
        };
        const bruto = p.slice(9).join(',');
        const pos = bruto.match(/\\pos\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)/);
        // `\N` é a quebra do ASS. As linhas VAZIAS são conteúdo — separam parágrafos
        // no criativo original — e por isso não são filtradas: o texto vai inteiro
        // para o editor, que agora respeita quebras (`pre`).
        const partes = bruto.replace(/\{[^}]*\}/g, '').split('\\N').map((s) => s.trim());
        out.push({
            start: toSec(p[1]),
            end: toSec(p[2]),
            texto: partes.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
            linhas: partes.filter(Boolean),
            x: pos ? Number(pos[1]) : W / 2,
            y: pos ? Number(pos[2]) : H * 0.42,
        });
    }
    return out;
}

/** &HAABBGGRR (ordem invertida do ASS) → #RRGGBB. */
function assColorToHex(v, fallback) {
    const m = String(v || '').match(/&H([0-9A-Fa-f]{2})?([0-9A-Fa-f]{6})/);
    if (!m) return fallback;
    const bgr = m[2];
    return `#${bgr.slice(4, 6)}${bgr.slice(2, 4)}${bgr.slice(0, 2)}`.toUpperCase();
}

// Famílias registradas no app (fontData/FontFace). Uma fonte fora desta lista cai
// em system-ui e muda o desenho — daí o mapeamento explícito para a mais próxima.
const FAMILIA_POR_FONTE_ASS = {
    'montserrat': 'Montserrat',
    'poppins': 'Poppins',
    'inter': 'Inter',
    'anton': 'Anton',
    'bebas neue': 'Bebas Neue',
    'arial': 'Inter',
    'arial black': 'Anton',
    'georgia': 'Playfair Display',
    'playfair display': 'Playfair Display',
};

/**
 * Estilo `Default` do .ass — a fonte da verdade tipográfica do export.
 *
 * Ordem do cabeçalho V4+: Name, Fontname, Fontsize, Primary, Secondary, Outline,
 * Back, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
 * BorderStyle, Outline(px), Shadow(px), Alignment, MarginL, MarginR, MarginV.
 */
function parseAssStyle(assPath, fallbackFontSize = 64) {
    const padrao = {
        fontname: 'Montserrat', family: 'Montserrat', fontSize: fallbackFontSize,
        bold: true, fontWeight: 700, color: '#FFFFFF',
        strokeWidth: 0, strokeColor: '#000000', shadowOffset: 0, marginLR: 60,
    };
    if (!fs.existsSync(assPath)) return padrao;
    const linha = fs.readFileSync(assPath, 'utf8').split(/\r?\n/).find((l) => /^Style:\s*Default,/.test(l));
    if (!linha) return padrao;
    const c = linha.slice(linha.indexOf(':') + 1).split(',').map((s) => s.trim());
    const fontname = c[1] || padrao.fontname;
    const bold = Number(c[7]) !== 0;
    return {
        fontname,
        family: FAMILIA_POR_FONTE_ASS[fontname.toLowerCase()] || 'Montserrat',
        fontSize: Number(c[2]) || fallbackFontSize,
        bold,
        // ASS só tem liga/desliga; o bold real da família é 700. Fixar 800 (como o
        // renderer fazia) engrossa o traço e alarga a linha — some a fidelidade.
        fontWeight: bold ? 700 : 400,
        color: assColorToHex(c[3], '#FFFFFF'),
        // Outline do ASS cresce PARA FORA da letra; o render do editor usa a mesma
        // convenção (dobra a espessura numa cópia atrás).
        strokeWidth: Number(c[16]) || 0,
        strokeColor: assColorToHex(c[5], '#000000'),
        shadowOffset: Number(c[17]) || 0,
        marginLR: Number(c[19]) || 60,
    };
}

/** Compat: continua exportando só o corpo da fonte. */
function parseAssFontSize(assPath, fallback = 64) {
    return parseAssStyle(assPath, fallback).fontSize;
}

/**
 * Monta o `studio-edit.json` espelhando a montagem da F6.
 *
 * @param {object} ctx
 * @param {string} ctx.client
 * @param {string} ctx.creative
 * @param {string} ctx.repoRoot     raiz do monorepo (para achar o ffprobe)
 * @param {string} ctx.materialsDir
 * @param {object} ctx.f6          conteúdo do timeline.json da F6
 * @param {Array}  ctx.assCues     cues do captions.ass
 * @param {number} ctx.fontSize   (compat) corpo da fonte quando não vier `assStyle`
 * @param {object} ctx.assStyle   estilo Default do .ass (parseAssStyle)
 * @param {string} ctx.audioFile
 */
function buildMirrorEdit({ client, creative, repoRoot, materialsDir, f6, assCues, fontSize, assStyle, audioFile }) {
    const toFrames = (s) => Math.max(1, Math.round((Number(s) || 0) * FPS));
    const openFrames = (f6.open && f6.open.durationFrames) || 0;
    const closeFrames = (f6.close && f6.close.durationFrames) || 0;

    // Duração real de cada arquivo publicado, medida uma vez por nome.
    const framesPorArquivo = new Map();
    const midiaFrames = (nome) => {
        if (!framesPorArquivo.has(nome)) {
            framesPorArquivo.set(nome, framesDaMidia(repoRoot, path.join(materialsDir, nome)));
        }
        return framesPorArquivo.get(nome);
    };

    let cursor = 0;
    const videoTrack = (f6.videoTrack || []).map((c, i, arr) => {
        const dur = toFrames(c.durationSeconds);
        const nome = path.basename(c.file);
        const clip = {
            file: nome,
            absPath: path.join(materialsDir, nome),
            // `hook` mantém o clipe fora do tratamento de "insert" (painel/moldura) e
            // do reenquadramento por papel; a moldura ainda é desligada por frameMode.
            role: 'hook',
            durationSeconds: Number((dur / FPS).toFixed(3)),
            durationInFrames: dur,
            // Onde a MÍDIA acaba (pode ser antes do clipe — ver framesDaMidia).
            nativeDurationInFrames: midiaFrames(nome) || dur,
            playbackRate: 1,
            width: W,
            height: H,
            startFrame: cursor,
            // O áudio do criativo é a trilha do benchmark, em camada própria. Take com
            // áudio próprio ligado somaria duas fontes.
            audioEnabled: false,
            // Sem isto o renderer aplica dissolve de 6 frames em todo clipe idx>0.
            transitionIn: { type: 'none', durationInFrames: 0 },
            // Sem isto, papéis não-hook ganham painel com fundo desfocado e borda.
            frameMode: 'cover',
            kenBurns: 0,
            ...(i === 0 && openFrames ? { fadeIn: openFrames } : {}),
            ...(i === arr.length - 1 && closeFrames ? { fadeOut: closeFrames } : {}),
        };
        cursor += dur;
        return clip;
    });

    const totalFrames = Math.max(cursor, 1);

    // --- Camada de áudio: a trilha do benchmark ---
    const extraLayers = [{
        id: 'L-trilha-benchmark',
        kind: 'audio',
        name: 'Trilha (benchmark)',
        clips: [{
            id: 'trilha-0',
            type: 'media-audio',
            file: audioFile,
            label: 'áudio original do benchmark',
            startFrame: 0,
            durationInFrames: totalFrames,
            volume: 1,
            // Sem narração para abaixar; com ducking o volume oscilaria sem motivo.
            ducking: false,
        }],
    }];

    // --- Camada de texto: um BLOCO por cue, com a tipografia do .ass ---
    //
    // Antes cada LINHA virava um elemento com `y` calculado à mão, porque o editor
    // não interpretava `\n` e re-quebrava o texto na sua própria largura. Com o
    // render de texto espelhando o libass (`pre`, contorno real, peso por clipe),
    // o bloco inteiro vai num elemento só: mesmas quebras, mesmos parágrafos,
    // mesmo corpo de fonte do export — e a entrelinha é o que distribui as linhas,
    // exatamente como o Alignment=5 faz em torno do `\pos`.
    const st = assStyle || {};
    // Corpo em px de CSS = Fontsize do .ass convertido (ver FATOR_CORPO_LIBASS).
    // Fração preservada: arredondar para inteiro já desloca a linha em ~0,5%.
    const corpo = Number(((Number(st.fontSize) || fontSize || 64) * FATOR_CORPO_LIBASS).toFixed(2));
    // Meia entrelinha: desce o bloco para o mesmo lugar em que o libass o desenha.
    const meiaEntrelinha = (corpo * ENTRELINHA_LIBASS - corpo * ALTURA_TIPOGRAFICA) / 2;
    const clipsTexto = [];
    assCues.forEach((cue, ci) => {
        const texto = cue.texto || cue.linhas.join('\n');
        if (!texto) return;
        clipsTexto.push({
            id: `txt-${ci}`,
            type: 'text',
            text: texto,
            label: (cue.linhas[0] || texto).slice(0, 28),
            startFrame: Math.round(cue.start * FPS),
            durationInFrames: Math.max(1, Math.round((cue.end - cue.start) * FPS)),
            // x/y são PERCENTUAIS do frame, 50/50 = centro. O bloco é centrado
            // verticalmente em `cue.y` — o mesmo ponto que o `\pos` mira.
            x: Number(((cue.x / W) * 100).toFixed(2)),
            y: Number((((cue.y + meiaEntrelinha) / H) * 100).toFixed(3)),
            fontSize: corpo,
            fontFamily: st.family || 'Montserrat',
            fontWeight: st.fontWeight || 700,
            color: st.color || '#FFFFFF',
            strokeWidth: Number(st.strokeWidth) || 0,
            strokeColor: st.strokeColor || '#000000',
            shadowOffset: Number(st.shadowOffset) || 0,
            // Entrelinha tal que o passo em px seja o Fontsize do .ass (ver acima).
            // Fora disso o bloco fica mais alto ou mais baixo que o do export e as
            // linhas do meio desalinham progressivamente.
            lineHeight: ENTRELINHA_LIBASS,
            // Quem decidiu a quebra foi o gerador do .ass; o editor não re-quebra.
            noWrap: true,
            opacity: 1,
        });
    });
    if (clipsTexto.length) {
        extraLayers.push({ id: 'L-copy', kind: 'video', name: 'Texto do criativo', clips: clipsTexto });
    }

    return {
        _doc: 'Espelho do export da F6, montado por _studio-mirror.js. Os takes já vêm '
            + 'recortados (o editor não tem crop) e cada cue do .ass é UM elemento de '
            + 'texto, com as quebras, o corpo, o peso e o contorno do export. Transições, '
            + 'hook, moldura, barra de progresso e overlay de legenda estão desligados '
            + 'para não somar nada ao que foi exportado.',
        timeline: {
            fps: FPS, width: W, height: H,
            durationInFrames: totalFrames,
            videoTrack,
            videoMuted: false,
            audioTrack: null,      // trilha vive em extraLayers; audioTrack é narração
            captionTrack: [],
            extraLayers,
            markers: [],
            meta: {
                client, creative,
                videoSeconds: Number((totalFrames / FPS).toFixed(2)),
                audioSeconds: Number((totalFrames / FPS).toFixed(2)),
                rhythmGapSeconds: null,
                gaps: [],
            },
        },
        fxPlan: {
            brand: {
                accent: '#FF5B3F',
                primary: '#0C0A1F',
                displayName: 'Virals Farming',
                // Família do .ass, já mapeada para uma das registradas no app; o
                // default "Outfit" não está registrado e cairia em system-ui.
                // (Cada elemento de texto também carrega a sua — isto é o fallback.)
                fontFamily: st.family || 'Montserrat',
            },
            hookRenderer: 'hard-cut',   // qualquer outro adiciona movimento no clipe 0
            captionRenderer: 'clean',
            motionRenderers: [],        // sem barra de progresso
            captions: [],               // o texto é elemento, não legenda do editor
        },
        captionSource: 'script',
    };
}

module.exports = {
    bakeTake, parseAssCues, parseAssFontSize, parseAssStyle, buildMirrorEdit,
    FPS, W, H, FATOR_CORPO_LIBASS, ENTRELINHA_LIBASS,
};
