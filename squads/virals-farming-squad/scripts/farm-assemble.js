#!/usr/bin/env node
/**
 * farm-assemble.js — F6 Montagem, Edição e Export · Virals Farming Squad
 *
 * Consome o plano modelado (F3, modeling.json) + os takes gerados (F5) + o
 * áudio e a transcrição do benchmark (F2) e entrega o arquivo publicável:
 * timeline.json (contrato da ponte), export/criativo.mp4 (9:16, legenda
 * queimada) e export/publishing-kit.md (descrição + hashtags do autor).
 *
 * DUAS VIAS DE RENDER:
 *   --via=studio   emite timeline.json e TENTA a ponte do apps/video-studio.
 *                  Hoje o video-studio não tem intake compatível com o
 *                  contrato da ponte (ver `checkStudioReadiness` — gap
 *                  estrutural, documentado, não é falha desta fase). Cai
 *                  automaticamente para a via ffmpeg.
 *   --via=ffmpeg   (DEFAULT) renderiza direto com ffmpeg, ponta a ponta,
 *                  sem depender do app. Esta é a via que precisa funcionar.
 *
 * O ÁUDIO MANDA NA DURAÇÃO (delegado a _editspec.js::resolveTakeDurations):
 *   soma(takes) <  áudio  →  ESTENDE o último take
 *   soma(takes) >  áudio  →  encurta o último take
 * O áudio NUNCA é cortado.
 *
 * O GATE `checklists/creative-export-checklist.md` roda ANTES do render —
 * renderizar um criativo que viola guardrail é gastar máquina para produzir
 * o impublicável. Falha bloqueante: NÃO renderiza, registra em _degraded.md.
 *
 * PRINCÍPIO: falha de um criativo não derruba o lote. Export sem
 * publishing-kit.md ao lado é trabalho pela metade — nunca é reportado como
 * pronto.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-assemble.js --niche=religioso
 *   node ... --session=2026-07-26-pet-90b1cb --ranks=1,3
 *   node ... --niche=pet --top=3 --via=studio     (tenta a ponte, cai para ffmpeg)
 *   node ... --niche=noticias --dry-run           (monta timeline.json + roda o gate, sem renderizar)
 *   node ... --niche=cartomante --no-captions      (export sem legenda queimada)
 *
 * Flags:
 *   --niche=ID        nicho em data/niches/ (obrigatório, salvo com --session)
 *   --session=ID      sessão da F1..F5; default: a mais recente do nicho na data
 *   --ranks=1,3       escolhe ranks específicos do pack
 *   --top=N           quantos criativos processar        (default: todos completos)
 *   --date=YYYY-MM-DD data da sessão                      (default: hoje)
 *   --via=ffmpeg|studio  via de render                    (default: ffmpeg)
 *   --dry-run         monta timeline.json e roda o gate, não renderiza nem grava kit
 *   --no-captions     não queima legenda (ignora audio-description.md)
 *   --dewatermark[=z] reenquadra para cortar a marca do motor I2V (default z=0.07)
 *   --wm-corner=br    canto da marca: br|bl|tr|tl                (default: br)
 *   --caption-mode=X  block (frase inteira, centrada) | sequential  (default: block)
 *   --caption-y=0.42  altura do bloco de texto, fração de cima para baixo
 *   --fill=loop       repete os takes aprovados em ordem até cobrir o áudio
 *                     (default: estende o último take, congelando o frame)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const ES = require('./_editspec.js');
// Cues de legenda com timestamps REAIS do Whisper — ver _speech.js para o porquê
// de a distribuição proporcional não sincronizar.
const SP = require('./_speech.js');

// GEMINI_API_KEY não é usado aqui, mas o .env também carrega outras chaves
// (ex.: overrides de path) compartilhadas pelo squad — mesmo padrão das outras fases.
require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

const ETL_DIR = path.join(L.REPO_ROOT, 'services', 'ETL');
const TEMPLATES_DIR = path.join(L.SQUAD_ROOT, 'templates');
const FPS = 30;

function ffmpegPath() {
    const local = path.join(ETL_DIR, 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}
function ffprobePath() {
    const local = path.join(ETL_DIR, 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

// ---------------------------------------------------------------------------
// ffprobe — a fonte de verdade sobre o que existe em disco (nunca um campo de JSON).
// ---------------------------------------------------------------------------

/** @returns {{duration:number|null, width:number|null, height:number|null, hasAudio:boolean, hasVideo:boolean}|null} */
function probeMedia(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=width,height,codec_type',
         '-of', 'default=nw=1', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 }
    );
    if (r.status !== 0 && !r.stdout) return null;
    const out = r.stdout || '';
    const durationMatch = out.match(/duration=([\d.]+)/);
    const widths = [...out.matchAll(/width=(\d+)/g)].map((m) => Number(m[1]));
    const heights = [...out.matchAll(/height=(\d+)/g)].map((m) => Number(m[1]));
    return {
        duration: durationMatch ? Number(durationMatch[1]) : null,
        width: widths[0] || null,
        height: heights[0] || null,
        hasAudio: /codec_type=audio/.test(out),
        hasVideo: /codec_type=video/.test(out),
    };
}

// ---------------------------------------------------------------------------
// Estilos de legenda — mapeia caption_style do nicho para parâmetros ASS reais.
// Fontes assumem fontconfig/libass do sistema; sem a fonte exata instalada,
// libass faz fallback automático (degrada a estética, nunca quebra o render).
// ---------------------------------------------------------------------------

const CAPTION_STYLES = {
    'montserrat-bold-outline': {
        fontname: 'Montserrat', fontsize: 76, bold: -1, italic: 0,
        primary: '&H00FFFFFF', outline: '&H00000000', back: '&H00000000',
        borderStyle: 1, outlineWidth: 4, shadow: 1,
    },
    'clean-white-shadow': {
        fontname: 'Arial', fontsize: 68, bold: 0, italic: 0,
        primary: '&H00FFFFFF', outline: '&H00303030', back: '&H00000000',
        borderStyle: 1, outlineWidth: 1.5, shadow: 3,
    },
    'bold-news-lower-third': {
        fontname: 'Arial Black', fontsize: 72, bold: -1, italic: 0,
        primary: '&H00FFFFFF', outline: '&H00000000', back: '&HA0141414',
        borderStyle: 3, outlineWidth: 2, shadow: 0,
    },
    'elegant-serif-gold': {
        fontname: 'Georgia', fontsize: 68, bold: 0, italic: 0,
        primary: '&H0037AFD4', outline: '&H00101010', back: '&H00000000',
        borderStyle: 1, outlineWidth: 2, shadow: 1,
    },
};
const DEFAULT_CAPTION_STYLE = CAPTION_STYLES['clean-white-shadow'];

function resolveCaptionStyle(styleKey) {
    if (styleKey && CAPTION_STYLES[styleKey]) return { key: styleKey, ...CAPTION_STYLES[styleKey], known: true };
    return { key: styleKey || '(indefinido)', ...DEFAULT_CAPTION_STYLE, known: false };
}

function assTime(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.round((s - Math.floor(s)) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Escapa preservando a separação de parágrafos (linha em branco) — usada na frase
 *  do criativo, onde os blocos são parte da composição. */
function assEscapeKeepParagraphs(t) {
    return String(t || '').replace(/[{}]/g, '').replace(new RegExp(String.fromCharCode(13), 'g'), '').trim();
}

function assEscapeText(t) {
    // Chaves são tags de override em ASS — texto de legenda nunca deve usá-las.
    return String(t || '').replace(/[{}]/g, '').replace(/\r?\n/g, ' ').trim();
}

/**
 * Limpa a frase lida da tela do benchmark.
 *
 * A visão transcreve o que está no quadro — e o que está no quadro inclui a assinatura
 * do autor (`@reflexoesdaalma`, `@tyfany.editts`), que NÃO pode ir para o nosso criativo:
 * publicaria a marca de outra conta no nosso vídeo. Quebras de linha do layout original
 * também caem, porque a quebra é recalculada para a nossa largura de tela.
 */
function cleanOriginalPhrase(texto) {
    return String(texto || '')
        .replace(/@[\p{L}\p{N}._]+/gu, ' ')      // assinatura da conta de origem
        .replace(/["""]/g, '"')
        // PARÁGRAFOS PRESERVADOS. O criativo original separa blocos com linha em branco
        // — invocação, citação e referência bíblica, por exemplo — e essa separação É a
        // composição visual. Achatar tudo num parágrafo só (o que `\s+ → ' '` fazia)
        // transformava três blocos legíveis num bolo de texto.
        .split(/\n\s*\n+/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n')
        .trim();
}

/**
 * Monta os cues de texto a partir da frase REAL do criativo modelado.
 *
 * Dois formatos aparecem no acervo e precisam de tratamentos diferentes:
 *
 *  · FRASE ÚNICA — a mesma sentença fica na tela o vídeo inteiro (a maioria dos packs).
 *    Vira um cue só, do começo ao fim.
 *  · FRASE PROGRESSIVA — cada plano traz uma parte da mensagem ("sabe qual é o seu
 *    problema?" → "você tenta agradar todo mundo"). Aqui cada frase acompanha o SEU
 *    take, senão a mensagem perde a ordem que fazia o criativo funcionar.
 *
 * A distinção é feita comparando as frases entre si — não há configuração para isso,
 * porque o formato é do criativo, não do nicho.
 */
/**
 * O texto na tela é LEGENDA DA NARRAÇÃO ou COMPOSIÇÃO PRÓPRIA?
 *
 * A resposta muda o que vai para a tela do nosso criativo, e nenhum campo do
 * `benchmark.json` responde: o TikTok marca como "som original" tanto narração quanto
 * música própria — os seis packs deste lote vieram todos como `original_speech`.
 *
 * O sinal que funciona é a SOBREPOSIÇÃO: se as frases capturadas dos frames aparecem
 * dentro da transcrição do áudio, a tela está legendando a fala (e a transcrição
 * completa é a melhor fonte, porque acompanha a narração inteira). Se não aparecem,
 * a tela é uma composição autoral sobre a trilha — e aí é ela que vale.
 *
 * Exemplo real deste lote: "sabe qual é o seu problema" está na transcrição → legenda
 * de fala. "Deus, Tu és a paz que acalma o caos do meu coração" não está → composição.
 */
function telaEhLegendaDaFala(modeling, transcricao) {
    const frases = ((modeling.creative_text && modeling.creative_text.original_detectada) || [])
        .map((x) => cleanOriginalPhrase(x.texto).toLowerCase())
        .filter((t) => t.length >= 12);
    if (frases.length === 0) return true; // sem frase na tela, a fala é a única fonte

    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ');
    const alvo = norm(transcricao);
    // Compara pelos primeiros termos de cada frase: a transcrição raramente casa
    // palavra por palavra (pontuação, emoji, quebras), mas o começo da frase é estável.
    const casaram = frases.filter((f) => {
        const chave = norm(f).split(' ').slice(0, 4).join(' ');
        return chave.length >= 10 && alvo.includes(chave);
    }).length;
    return casaram >= Math.ceil(frases.length / 2);
}

function buildOriginalTextCues(orderedTakes, modeling, videoTrack) {
    const porTake = new Map();
    for (const item of (modeling.creative_text && modeling.creative_text.original_detectada) || []) {
        const limpa = cleanOriginalPhrase(item.texto);
        if (limpa) porTake.set(item.take, limpa);
    }
    if (porTake.size === 0) return { cues: [], mode: null };

    const distintas = [...new Set(porTake.values())];
    // Frase única: um cue cobrindo tudo. Repetir o mesmo texto em vários cues faria a
    // legenda "piscar" a cada corte, o que o original não faz.
    if (distintas.length === 1) {
        const total = videoTrack.reduce((s, c) => s + (Number(c.durationSeconds) || 0), 0);
        return { cues: [{ start: 0, end: round2(total), text: distintas[0] }], mode: 'unica' };
    }

    // PROGRESSIVA: a mensagem tem começo e fim, e essa ORDEM é o que faz o criativo
    // funcionar ("cheguei no nível mais difícil" … "mas tua presença me renova").
    //
    // Amarrar cada frase ao take que a originou parecia natural, mas quebra no loop:
    // com 3 ciclos, a frase de abertura reaparecia no meio e a de fecho três vezes,
    // embaralhando a narrativa. A frase pertence à POSIÇÃO no vídeo, não à repetição
    // do clipe.
    //
    // Por isso as frases são distribuídas em blocos contíguos e iguais ao longo da
    // duração total, na ordem original: a primeira abre o vídeo, a última fecha —
    // independentemente de quantas vezes os takes se repetem.
    const total = videoTrack.reduce((s, c) => s + (Number(c.durationSeconds) || 0), 0);
    const ordenadas = [...porTake.entries()].sort((a, b) => a[0] - b[0]).map(([, texto]) => texto);
    const bloco = total / ordenadas.length;
    const cues = ordenadas.map((texto, i) => ({
        start: round2(i * bloco),
        end: round2(i === ordenadas.length - 1 ? total : (i + 1) * bloco),
        text: texto,
    }));
    return { cues, mode: 'progressiva' };
}

function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Quebra o texto em linhas com `\N` (quebra literal do ASS).
 *
 * NECESSÁRIA no modo bloco: com `\pos()`, o libass IGNORA MarginL/MarginR e para de
 * quebrar linha sozinho — o texto vira uma linha só que sangra pelas duas bordas.
 * Medido: "Que a paz de Deus alcance você onde estiver." saiu cortado nos dois lados.
 *
 * A largura por caractere é estimada em 0,52 × fontsize, que é a média de uma fonte
 * bold em caixa mista. Estimativa, não medição — o objetivo é caber com folga, e errar
 * para o lado da linha mais curta não estraga nada.
 */
function wrapAssText(text, fontsize, usableWidth) {
    const maxChars = Math.max(10, Math.floor(usableWidth / (Number(fontsize) * 0.52)));
    // Cada parágrafo é quebrado por conta própria e reunido com uma LINHA EM BRANCO
    // (`\N\N`), reproduzindo o respiro do criativo original. Sem isso, os blocos
    // colariam num único parágrafo corrido.
    const paragrafos = String(text || '').split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    const wrapOne = (p) => {
        const words = p.split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (const w of words) {
            if (!line) { line = w; continue; }
            if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
            else { lines.push(line); line = w; }
        }
        if (line) lines.push(line);
        return lines.join('\\N');
    };
    return paragrafos.map(wrapOne).filter(Boolean).join('\\N\\N');
}

/**
 * Monta o .ass (formato de legenda com estilo) a partir dos cues do
 * timeline.json. `safeArea` respeita a UI do TikTok: bottom 220px, sides 60px
 * em 1080x1920 — MarginV/MarginL/MarginR abaixo do texto (Alignment=2, base-centro).
 */
function buildAssContent(cues, styleKey, safeArea, format, placement) {
    const st = { ...resolveCaptionStyle(styleKey) };
    // Placement pode sobrepor o tamanho: o estilo do nicho é calibrado para o texto
    // de composição, e legenda de fala precisa de corpo menor.
    if (placement && placement.fontSize) st.fontsize = placement.fontSize;
    const marginV = (safeArea && safeArea.bottom) || 220;
    // `sideMargin` do placement tem precedência: legenda de fala precisa de faixa
    // mais estreita que texto de composição, para não encostar na UI lateral.
    const marginLR = (placement && placement.sideMargin) || (safeArea && safeArea.sides) || 60;

    // MODO "BLOCO": a frase inteira aparece do primeiro ao último frame, centrada,
    // um pouco acima do meio — que é como o criativo de benchmark faz.
    //
    // O modo sequencial (padrão anterior) fatia o texto em cues cronometrados, como
    // legenda de acessibilidade. Nestes formatos isso descaracteriza o criativo: a
    // frase não é narração legendada, é o CONTEÚDO, e ela existe inteira desde o
    // início para ser lida de uma vez. Fatiada, o espectador nunca vê a mensagem
    // completa — vê pedaços que somem antes de fechar o sentido.
    const isBlock = placement && placement.mode === 'block';
    if (isBlock) {
        // Alignment=5 é center/middle no layout numpad do ASS: o \pos passa a mirar o
        // CENTRO do bloco de texto, e não a base — o que torna o posicionamento
        // vertical previsível mesmo quando a frase quebra em 2 ou 3 linhas.
        const yFrac = Number(placement.yFraction) || 0.42;
        const x = Math.round(format.width / 2);
        const y = Math.round(format.height * yFrac);
        const full = cues.map((c) => assEscapeKeepParagraphs(c.text)).filter(Boolean).join(' ');
        const start = 0;
        const end = cues.length ? Math.max(...cues.map((c) => Number(c.end) || 0)) : 0;

        let a = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${format.width}\nPlayResY: ${format.height}\nWrapStyle: 2\n\n`;
        a += `[V4+ Styles]\n`;
        a += `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;
        a += `Style: Default,${st.fontname},${st.fontsize},${st.primary},${st.primary},${st.outline},${st.back},${st.bold},${st.italic},0,0,100,100,0,0,${st.borderStyle},${st.outlineWidth},${st.shadow},5,${marginLR},${marginLR},0,1\n\n`;
        a += `[Events]\n`;
        a += `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
        // Frase progressiva: cada cue mantém o SEU tempo, todos na mesma posição.
        // Achatar tudo num cue só destruiria a ordem da mensagem — e é a ordem que
        // faz o criativo funcionar ("sabe qual é o seu problema?" antes da resposta).
        if (placement.perCue) {
            for (const cue of cues) {
                // Legenda de fala usa quebra EQUILIBRADA (duas linhas de tamanho
                // parecido, cortando de preferência após vírgula). A quebra gulosa do
                // `wrapAssText` enche a primeira linha e deixa a segunda com uma
                // palavra solta — ruim para leitura de relance.
                let t = placement.charsPerLine
                    ? SP.balanceLines(assEscapeKeepParagraphs(cue.text), placement.charsPerLine).join('\\N')
                    : wrapAssText(assEscapeKeepParagraphs(cue.text), st.fontsize, format.width - marginLR * 2);
                if (!t) continue;
                // NÃO trunca. O teto de 2 linhas é obtido gerando cues curtos na
                // origem (`maxWordsPerCue`), não cortando o fim da frase — cortar
                // apagaria parte da narração, que é o conteúdo.
                a += `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,{\\pos(${x},${y})}${t}\n`;
            }
            return a;
        }

        const wrapped = wrapAssText(full, st.fontsize, format.width - marginLR * 2);
        if (wrapped) a += `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,{\\pos(${x},${y})}${wrapped}\n`;
        return a;
    }

    let ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${format.width}\nPlayResY: ${format.height}\nWrapStyle: 2\n\n`;
    ass += `[V4+ Styles]\n`;
    ass += `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;
    ass += `Style: Default,${st.fontname},${st.fontsize},${st.primary},${st.primary},${st.outline},${st.back},${st.bold},${st.italic},0,0,100,100,0,0,${st.borderStyle},${st.outlineWidth},${st.shadow},2,${marginLR},${marginLR},${marginV},1\n\n`;
    ass += `[Events]\n`;
    ass += `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    for (const cue of cues) {
        const text = assEscapeText(cue.text);
        if (!text) continue;
        ass += `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${text}\n`;
    }
    return ass;
}

// ---------------------------------------------------------------------------
// Via studio — checagem estrutural (não é falta de instalação, é gap de contrato).
// ---------------------------------------------------------------------------

/**
 * DURAÇÃO ALVO DO CRIATIVO — regra única, um lugar só.
 *
 * O criativo modelado termina quando o original terminava. A referência é a duração do
 * VÍDEO, não a do mp3: o áudio extraído carrega padding do encoder e sai alguns
 * centésimos mais longo, o que viraria cauda muda no fim.
 *
 * A exceção é a CAPTURA PARCIAL: o número em `benchmark.video` é do arquivo baixado, e o
 * CDN do TikTok às vezes entrega o post em pedaço (medido: post de 57,7s salvo como
 * arquivo de 20,5s, com o áudio completo de 57,7s ao lado). Aí o arquivo não representa
 * o post e o áudio manda.
 *
 * ESTA FUNÇÃO EXISTE PORQUE A REGRA ESTAVA EM DOIS LUGARES: o laço de preenchimento
 * calculava o próprio alvo e a montagem calculava outro. Quando um dos dois ganhou a
 * defesa contra captura parcial e o outro não, o laço encheu 20,5s de um criativo de
 * 57,7s — e os 37s restantes viraram quadro congelado, sem nada acusar.
 */
function resolverDuracaoAlvo(benchmarkVideo, audioDuration) {
    const doVideo = Number(benchmarkVideo && benchmarkVideo.duration) || 0;
    const audio = Number(audioDuration) || 0;
    const parcial = doVideo > 0 && doVideo < audio * 0.8;
    const alvo = doVideo > 0 && !parcial ? Math.min(audio, doVideo) : audio;
    return {
        alvo,
        parcial,
        aviso: parcial
            ? `vídeo capturado (${doVideo.toFixed(1)}s) muito mais curto que o áudio (${audio.toFixed(1)}s) — `
              + 'captura parcial; a duração do áudio manda no alvo'
            : null,
    };
}

function checkStudioReadiness() {
    const studioRoot = path.join(L.REPO_ROOT, 'apps', 'video-studio');
    if (!fs.existsSync(studioRoot)) {
        return { ready: false, reason: 'apps/video-studio não existe neste checkout do monorepo.' };
    }
    if (!fs.existsSync(path.join(studioRoot, 'node_modules'))) {
        return { ready: false, reason: 'apps/video-studio existe mas sem node_modules instalado (npm install pendente).' };
    }
    if (!fs.existsSync(path.join(studioRoot, 'scripts', 'render-export.ts'))) {
        return { ready: false, reason: 'apps/video-studio/scripts/render-export.ts não encontrado.' };
    }
    // Verificado por leitura de código (não é suposição): render-export.ts espera
    // um job { jobId, fxPlan, timeline: <Timeline interno com absPath, durationInFrames,
    // nativeDurationInFrames, playbackRate, audioEnabled...> } e resolve os assets via
    // creativeDirFor/materialsDirFor em outputs/{client}/materials/{creative}. scripts/
    // ingest.ts monta esse MESMO tipo de Timeline a partir da mesma estrutura de cliente.
    // Nenhum dos dois lê workspaces/businesses/virals/farming/{sessão}/benchmark/{pack},
    // nem aceita o contrato simplificado de tools/video-studio-bridge.md (creative/format/
    // audioTrack/videoTrack com take,file,durationSeconds,effects). Não há adapter que
    // traduza um para o outro — gap estrutural, não uma falha de configuração local.
    // ⚠️ ATUALIZADO 2026-07-28: o diagnóstico acima continua correto sobre o RENDER —
    // render-export.ts não consome o timeline.json desta ponte. Mas a conclusão de que
    // era preciso um adapter DENTRO do app estava errada para o caso de EDIÇÃO.
    //
    // api/creatives/route.ts lista qualquer pasta em outputs/{client}/video-plans/ e a
    // considera editável assim que houver um vídeo em "Materiais Brutos/"; ordem e papéis
    // saem de um assembly.json opcional. Ou seja, o adapter cabe do lado do farming:
    // `farm-studio-publish.js` copia takes + áudio para essa estrutura e o criativo
    // aparece no frontend, sem tocar em apps/video-studio.
    return {
        ready: false,
        reason:
            'render via studio segue indisponível: render-export.ts opera sobre um Timeline interno ' +
            '(absPath/durationInFrames/fxPlan/jobId) e não consome o timeline.json desta ponte. ' +
            'Para EDITAR no frontend, use `farm-studio-publish.js --client=SLUG`, que publica os takes ' +
            'em outputs/{client}/video-plans/{creative}/Materiais Brutos/ — estrutura que o app já lê.',
    };
}

// ---------------------------------------------------------------------------
// Gate — creative-export-checklist.md, rodado ANTES do render.
// ---------------------------------------------------------------------------

function checkBlockedTermsIn(text, blockedTerms) {
    const lower = String(text || '').toLowerCase();
    return (blockedTerms || []).filter((term) => lower.includes(String(term).toLowerCase()));
}

/**
 * Roda as verificações automatizáveis do gate ANTES do render.
 * @returns {{verdict:'PASS'|'CONCERNS'|'FAIL'|'BLOCKED', blockingFailures:string[], warnings:string[], returnPhase:string|null}}
 */
function runExportGate({ pack, modeling, niche, orderedTakes, takeProbes, audioProbe, extraWarnings = [] }) {
    const blocking = [];
    const warnings = [...extraWarnings];
    let terminal = false;
    let returnPhase = null;
    const setReturnPhase = (p) => { if (!returnPhase) returnPhase = p; };

    // --- 4. Guardrails do nicho — BLOQUEANTE ---
    if (modeling.blocked) {
        blocking.push(`modeling bloqueado na F3: ${modeling.block_reason || '(sem motivo registrado)'}`);
        setReturnPhase('F3 (replanejar)');
    }
    if (modeling.guardrails && modeling.guardrails.passed === false) {
        blocking.push(`guardrails.passed=false herdado da F3: ${(modeling.guardrails.violations || []).join('; ')}`);
        setReturnPhase('F3 (replanejar)');
    }
    const kitDescription = (pack.benchmark && pack.benchmark.author_description) || '';
    const combinedText = [...orderedTakes.map((t) => t.on_screen_text || ''), kitDescription].join(' \n ');
    const blockedHits = checkBlockedTermsIn(combinedText, niche.guardrails && niche.guardrails.blocked_terms);
    if (blockedHits.length) {
        blocking.push(`termo bloqueado do nicho encontrado no criativo/descrição: "${blockedHits.join('", "')}"`);
        setReturnPhase('F3 (replanejar)');
    }

    // --- 1. Integridade técnica — arquivos dos takes + proporção 9:16 ---
    takeProbes.forEach((p, i) => {
        const n = orderedTakes[i].n;
        if (!p || !p.duration) {
            blocking.push(`take ${n}: ffprobe não conseguiu ler o arquivo (ausente/corrompido)`);
            setReturnPhase('F5');
            return;
        }
        if (p.width && p.height) {
            const ratio = p.width / p.height;
            // Proporção diferente NÃO bloqueia: o render já normaliza com
            // `scale=...:force_original_aspect_ratio=increase,crop=1080:1920`, que
            // preenche o quadro e corta o excedente. Bloquear aqui reprovava take bom
            // por um ajuste que a própria fase faz — medido: um take de 442x732 (≈3:5)
            // vindo do motor I2V barrava o criativo inteiro.
            //
            // Vira AVISO porque o crop tem custo real: quanto mais longe de 9:16, mais
            // borda se perde. Quem revisa precisa saber que houve reenquadramento.
            if (Math.abs(ratio - 9 / 16) > 0.02) {
                warnings.push(`take ${n}: ${p.width}x${p.height} não é 9:16 — será reenquadrado por crop (perde bordas)`);
            }
        }
    });

    // --- 1. Áudio presente ---
    if (!audioProbe || !audioProbe.hasAudio || !audioProbe.duration) {
        blocking.push('audio.mp3 ausente, sem trilha de áudio detectável, ou ffprobe não leu a duração');
        setReturnPhase('F6 (reprocessar áudio)');
    }

    // --- Gate terminal de fidelidade factual — nicho notícias ---
    if (niche.id === 'noticias') {
        const audioMeta = (pack.benchmark && pack.benchmark.audio) || {};
        if (!pack.hasAudioDescription || !audioMeta.transcribed) {
            blocking.push('nicho notícias sem transcrição — toda afirmação factual do plano seria invenção');
            terminal = true;
            returnPhase = 'F2 (recapturar)';
        }
    }

    const verdict = terminal ? 'BLOCKED' : blocking.length ? 'FAIL' : warnings.length ? 'CONCERNS' : 'PASS';
    return { verdict, blockingFailures: blocking, warnings, terminal, returnPhase };
}

// ---------------------------------------------------------------------------
// Render — via ffmpeg direta (DEFAULT, precisa funcionar ponta a ponta).
// ---------------------------------------------------------------------------

/**
 * Monta o filter_complex: normaliza cada take (escala/crop/fps 9:16), ajusta
 * a duração do ÚLTIMO take (estende com tpad ou encolhe com trim — nunca os
 * demais, nunca o áudio), encadeia com xfade (corte 'hard' ~1 frame ou
 * transição 'soft' 8 frames, conforme transitionOut de cada take), aplica os
 * fades globais de abertura/fechamento coordenados com o fim do áudio e, por
 * fim, queima a legenda (se houver). cwd é a pasta do pack: todos os paths
 * abaixo são RELATIVOS de propósito — evita o problema clássico do filtro
 * `subtitles` com ':' de drive letter no Windows.
 */
/**
 * Filtro de remoção de marca d'água por reenquadramento.
 *
 * Os takes passaram a vir de motores I2V gratuitos usados manualmente, e esses motores
 * queimam assinatura no quadro — medido neste pack: "AI generated" no canto inferior
 * direito, ocupando de ~94% a ~97% da altura.
 *
 * A remoção é um CROP com reescala de volta, não um blur nem um overlay: qualquer coisa
 * desenhada por cima continua sendo uma mancha visível no vídeo publicado.
 *
 * O corte sai INTEIRO do lado onde a marca está (base, para marcas inferiores) e é
 * centralizado no eixo oposto, preservando 9:16. Medido no material real: 4% ainda
 * deixava a marca legível, 6% já limpava — o default de 7% é esse mínimo com margem.
 * Cortar mais que o necessário é perder enquadramento à toa.
 */
function dewatermarkFilter(zoom, corner) {
    const z = Math.min(Math.max(Number(zoom) || 0, 0.01), 0.3);
    const keep = (1 - z).toFixed(4);
    // Marca embaixo → o corte sai da base (y=0 mantém o topo). Marca em cima → inverso.
    const y = /^t/i.test(String(corner || 'br')) ? `ih-ih*${keep}` : '0';
    return `crop=iw*${keep}:ih*${keep}:(iw-iw*${keep})/2:${y}`;
}

function buildFfmpegArgs({ orderedTakes, timeline, meta, captionsAssRelPath, audioDurationSeconds, dewatermark }) {
    const N = orderedTakes.length;
    const inputs = [];
    orderedTakes.forEach((t) => inputs.push('-i', `takes/take-${t.n}.mp4`));
    const audioInputIdx = N;
    inputs.push('-i', 'audio.mp3');

    const filters = [];
    const clipLabels = [];
    orderedTakes.forEach((t, i) => {
        const origDur = Math.max(Number(t.duration) || 0.1, 0.1);
        const base = `n${i}`;
        // O de-watermark entra ANTES do scale para 1080×1920: cortar primeiro e
        // reescalar depois recupera a resolução de saída. Na ordem inversa, o corte
        // sairia do quadro já final e entregaria um vídeo menor que o formato.
        const dw = dewatermark && dewatermark.enabled
            ? dewatermarkFilter(dewatermark.zoom, dewatermark.corner) + ','
            : '';
        // DURAÇÃO GARANTIDA POR CLIPE.
        //
        // `trim=duration=D` NÃO estende: se o arquivo tem menos que D, o clipe sai
        // curto e o vídeo inteiro encolhe. Foi a origem do congelamento — medido:
        // 34s de áudio com 12s de vídeo, o player parava no último frame e ficava
        // estático até o fim.
        //
        // `tpad` ANTES do trim clona o último frame por D segundos extras, garantindo
        // material suficiente; o trim então corta exatamente em D. Arquivo mais longo
        // que D é cortado; mais curto é completado. Nos dois casos o clipe entrega
        // exatamente a duração que a timeline planejou.
        filters.push(
            `[${i}:v]${dw}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${FPS},setsar=1,` +
            `format=yuv420p,tpad=stop_mode=clone:stop_duration=${origDur.toFixed(3)},` +
            `trim=duration=${origDur.toFixed(3)},setpts=PTS-STARTPTS[${base}]`
        );

        const isLast = i === N - 1;
        if (isLast && meta.durationAdjustment.mode === 'extended') {
            const extendBy = Math.max(timeline.videoTrack[i].durationSeconds - origDur, 0);
            const c = `c${i}`;
            // Congela o último frame pelo tempo que falta — o áudio nunca é cortado.
            filters.push(`[${base}]tpad=stop_mode=clone:stop_duration=${extendBy.toFixed(3)}[${c}]`);
            clipLabels.push(c);
        } else if (isLast && meta.durationAdjustment.mode === 'shrunk') {
            const shrinkTo = Math.max(timeline.videoTrack[i].durationSeconds, 0.1);
            const c = `c${i}`;
            filters.push(`[${base}]trim=duration=${shrinkTo.toFixed(3)},setpts=PTS-STARTPTS[${c}]`);
            clipLabels.push(c);
        } else {
            clipLabels.push(base);
        }
    });

    // CONCATENAÇÃO.
    //
    // `concat` em vez de xfade encadeado. A cadeia de xfade calcula offsets acumulados
    // e, com muitos clipes (o modo loop chega a 14), qualquer desvio se propaga e trunca
    // a saída — foi o que produziu 12s de vídeo para 34s de áudio. `concat` apenas
    // emenda: a duração final é a soma exata das partes, sem aritmética de offset.
    //
    // O corte seco é o que o formato usa entre planos; a transição suave, quando o
    // plano pedir, permanece disponível via xfade abaixo.
    let finalLabel;
    const temTransicaoSuave = timeline.videoTrack.some(
        (c, i) => i < N - 1 && c.transitionOut && c.transitionOut.type && c.transitionOut.type !== 'hard'
    );

    if (N === 1) {
        finalLabel = clipLabels[0];
    } else if (!temTransicaoSuave) {
        // `setpts=N/FRAME_RATE/TB` REGENERA os timestamps depois da emenda.
        //
        // Sem isso o concat de muitos clipes entrega PTS não-monotônicos e o encoder
        // DESCARTA os frames desalinhados — medido: `drop=1045` num criativo de 47s,
        // que saiu com 361 frames (12s de vídeo) e congelava o resto. O exit code era
        // 0 e o container declarava 47s: a falha só aparecia contando frames.
        filters.push(`${clipLabels.map((l) => `[${l}]`).join('')}concat=n=${N}:v=1:a=0,setpts=N/FRAME_RATE/TB[vcat]`);
        finalLabel = 'vcat';
    } else {
        let cumulative = timeline.videoTrack[0].durationSeconds;
        finalLabel = clipLabels[0];
        for (let i = 1; i < N; i++) {
            const tOut = timeline.videoTrack[i - 1].transitionOut || { type: 'hard', durationFrames: 1 };
            const transDur = Math.max(tOut.durationFrames / FPS, 1 / FPS);
            const offset = Math.max(cumulative - transDur, 0.01);
            const out = `x${i}`;
            filters.push(
                `[${finalLabel}][${clipLabels[i]}]xfade=transition=fade:duration=${transDur.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`
            );
            finalLabel = out;
            cumulative = cumulative + timeline.videoTrack[i].durationSeconds - transDur;
        }
    }

    // Fades globais — fade-out coordenado com o FIM REAL do áudio (probado, não o do JSON).
    const openDur = timeline.open.durationFrames / FPS;
    const closeDur = timeline.close.durationFrames / FPS;
    const fadeOutStart = Math.max(audioDurationSeconds - closeDur, 0);
    filters.push(
        `[${finalLabel}]fade=t=in:st=0:d=${openDur.toFixed(3)},fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${closeDur.toFixed(3)}[vfade]`
    );
    finalLabel = 'vfade';

    if (captionsAssRelPath) {
        filters.push(`[${finalLabel}]subtitles=filename=${captionsAssRelPath}[vout]`);
        finalLabel = 'vout';
    }

    return [
        '-y', ...inputs,
        '-filter_complex', filters.join(';'),
        '-map', `[${finalLabel}]`,
        '-map', `${audioInputIdx}:a`,
        '-r', String(FPS),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-movflags', '+faststart',
        // Corte duro no alvo: sem isto o áudio segue até o fim do mp3 e reintroduz
        // a cauda muda que o alvo existe para eliminar.
        '-t', audioDurationSeconds.toFixed(3),
        'export/criativo.mp4',
    ];
}

function renderWithFfmpeg({ pack, orderedTakes, timeline, meta, captionsAssRelPath, dewatermark }) {
    const args = buildFfmpegArgs({
        orderedTakes, timeline, meta, captionsAssRelPath, dewatermark,
        audioDurationSeconds: timeline.audioTrack.durationSeconds,
    });
    const r = spawnSync(ffmpegPath(), args, {
        cwd: pack.dir, encoding: 'utf8', windowsHide: true,
        timeout: 8 * 60 * 1000, maxBuffer: 1024 * 1024 * 50,
    });
    const outputPath = path.join(pack.dir, 'export', 'criativo.mp4');

    // Registro do comando e dos avisos do ffmpeg. Um render pode "dar certo" (exit 0)
    // e ainda produzir vídeo mais curto que o áudio — sem este rastro, o diagnóstico
    // vira adivinhação sobre uma linha de comando de 3 mil caracteres.
    try {
        fs.mkdirSync(path.join(pack.dir, 'export'), { recursive: true });
        fs.writeFileSync(
            path.join(pack.dir, 'export', '_ffmpeg-cmd.txt'),
            `# comando\nffmpeg ${args.map((a) => (/[ ;\[\]]/.test(a) ? `"${a}"` : a)).join(' ')}\n\n` +
            `# stderr (final)\n${(r.stderr || '').slice(-4000)}\n`
        );
    } catch (_) { /* diagnóstico é best-effort — nunca derruba o render */ }
    if (r.error) return { ok: false, error: `spawn falhou: ${r.error.message}` };
    if (r.status !== 0) return { ok: false, error: `ffmpeg saiu com código ${r.status}: ${(r.stderr || '').slice(-1500)}` };
    if (!P.fileOk(outputPath, 50 * 1024)) return { ok: false, error: 'ffmpeg retornou sucesso mas export/criativo.mp4 está ausente ou vazio' };
    return { ok: true, outputPath };
}

// ---------------------------------------------------------------------------
// Kit de publicação — templates/publishing-kit-tmpl.md, nunca opcional.
// ---------------------------------------------------------------------------

/**
 * Os templates do squad trazem um preâmbulo de METADADOS sobre o template
 * (bloco ```yaml``` com id/version/owner) antes do conteúdo real, separado
 * por uma linha "---" isolada — igual ao front-matter dos demais artefatos do
 * AIOX. Isso documenta o template para quem o lê; não é conteúdo do kit.
 */
function stripTemplatePreamble(tpl) {
    const marker = tpl.indexOf('\n---\n');
    return marker === -1 ? tpl : tpl.slice(marker + '\n---\n'.length);
}

/** Templating mínimo: {{#se nicho == X}}...{{/se}} + {{var}}. Sem dependência nova. */
function renderTemplate(tpl, ctx) {
    let out = stripTemplatePreamble(tpl).replace(/\{\{#se\s+nicho\s*==\s*([a-z0-9_-]+)\s*\}\}([\s\S]*?)\{\{\/se\}\}/gi, (_, nicheId, inner) =>
        ctx.nicho_id === nicheId ? inner : ''
    );
    out = out.replace(/\{\{\s*([^{}#/][^{}]*?)\s*\}\}/g, (_, key) => {
        const v = ctx[key.trim()];
        return v === undefined || v === null || v === '' ? '(não disponível)' : String(v);
    });
    return out;
}

function buildPublishingKit({ pack, niche, session, modeling, finalDurationSeconds, providersImagem, providersVideo, captionsApplied, captionStyle, captionOrigin }) {
    const tplPath = path.join(TEMPLATES_DIR, 'publishing-kit-tmpl.md');
    const tpl = fs.readFileSync(tplPath, 'utf8');
    const b = pack.benchmark || {};
    const hashtags = (b.hashtags || []).map((h) => `#${h}`).join(' ');
    const description = b.author_description
        ? b.author_description.trim()
        : '(sem descrição capturada do autor original — revisar manualmente antes de publicar)';

    const ctx = {
        nicho_id: niche.id,
        criativo: `${pack.rank}-${pack.handle}`,
        arquivo: 'criativo',
        dur: finalDurationSeconds != null ? finalDurationSeconds.toFixed(1) : '(?)',
        // O kit é o que o operador lê antes de publicar: ele precisa dizer o que o
        // arquivo REALMENTE tem. Afirmar "legenda queimada" num export sem legenda
        // fazia o kit mentir justamente no ponto de decisão.
        // A ORIGEM do texto entra no kit porque muda a decisão de publicar: texto
        // autoral pode ir ao ar; texto vindo da transcrição do benchmark é a fala de
        // outra pessoa na tela do nosso criativo, e precisa ser revisto antes.
        legenda: captionsApplied
            ? (captionOrigin === 'autoral'
                ? `texto autoral queimado (${captionStyle || 'estilo do nicho'})`
                : captionOrigin === 'original-do-benchmark'
                    ? `frase ORIGINAL do criativo modelado, queimada (${captionStyle || 'estilo do nicho'}) — modelagem exata; troque por texto próprio se for publicar em escala`
                    : `⚠️ texto queimado vindo da TRANSCRIÇÃO do benchmark (${captionStyle || 'estilo do nicho'}) — revise antes de publicar`)
            : '⚠️ SEM texto na tela — sem frase autoral e sem transcrição; revisar antes de publicar',
        estilo: captionStyle || '',
        icon: niche.icon,
        nicho: niche.label,
        session_id: session.id,
        url_original: pack.url || '(sem URL registrada)',
        handle_original: pack.handle,
        'descrição': description,
        hashtags: hashtags || '(nenhuma hashtag capturada do original)',
        pack_dir: path.relative(L.REPO_ROOT, pack.dir).replace(/\\/g, '/'),
        n: modeling.takes.length,
        providers_imagem: providersImagem || '(não rastreado)',
        providers_video: providersVideo || '(não rastreado)',
        consumo: '(não rastreado nesta fase)',
        required_framing: (niche.guardrails && niche.guardrails.required_framing) || '',
    };
    return renderTemplate(tpl, ctx);
}

/** Lê `_slots.json` de images/ ou takes/ e resume os providers usados (para o kit). */
function summarizeProviders(dir) {
    const slots = P.readSlots(dir);
    if (!slots || !Array.isArray(slots.expected)) return null;
    const providers = [...new Set(slots.expected.map((s) => s.provider).filter(Boolean))];
    return providers.length ? providers.join(', ') : null;
}

// ---------------------------------------------------------------------------
// Processamento de um criativo — falha aqui NUNCA derruba o lote.
// ---------------------------------------------------------------------------

async function processCreative(pack, ctx) {
    const { niche, session, args } = ctx;
    const paths = P.packPaths(pack.dir);
    const label = `[${pack.rank}] @${pack.handle}`;
    console.log(`\n${label}`);

    // --- Pré-condição: modeling.json (F3) ---
    if (!fs.existsSync(paths.modelingJson)) {
        console.log(`  ⏭️  sem modeling.json — rode @farming-modeler *plan (F3) primeiro`);
        return { rank: pack.rank, handle: pack.handle, status: 'skipped', reason: 'sem modeling.json' };
    }
    const modeling = JSON.parse(fs.readFileSync(paths.modelingJson, 'utf8'));
    if (!modeling.takes || modeling.takes.length === 0) {
        console.log(`  ⏭️  modeling.json sem takes — nada para montar`);
        return { rank: pack.rank, handle: pack.handle, status: 'skipped', reason: 'modeling sem takes' };
    }
    let orderedTakes = [...modeling.takes].sort((a, b) => a.n - b.n);

    // --- MODO LOOP: preenche o áudio repetindo os takes APROVADOS em ordem ---
    //
    // Nem todo take gerado é aprovado — o operador descarta os que saíram ruins do
    // motor I2V. Sobra um punhado de clipes de ~5s para um áudio que pode ter 60s.
    //
    // O comportamento padrão (`extended`) congela o último frame pelo tempo que falta,
    // o que num déficit de 30s produz meio vídeo parado. Repetir a sequência em ciclo
    // mantém a imagem viva do início ao fim e é o que o formato pede: o áudio é a
    // trilha, e o visual é um laço que a acompanha.
    //
    // A lista de clipes passa a vir dos ARQUIVOS em disco, não do plano: é o operador
    // quem decide o que foi aprovado, e o plano não sabe disso.
    if (args.fill === 'loop') {
        const disponiveis = fs.existsSync(paths.takes)
            ? fs.readdirSync(paths.takes)
                .filter((f) => /^take-\d+\.mp4$/i.test(f))
                .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))
            : [];

        if (disponiveis.length === 0) {
            P.appendDegraded(session, { phase: 'F6', label, status: 'blocked', issues: ['nenhum take em disco para o modo loop'] });
            console.log(`  🚫 nenhum take aprovado em takes/ — nada a repetir.`);
            return { rank: pack.rank, handle: pack.handle, status: 'blocked', reason: 'sem takes para loop' };
        }

        // Probe local: o `audioProbe` do fluxo principal só é lido mais abaixo, e a
        // expansão precisa da duração ANTES de montar a lista de clipes.
        const audioHere = probeMedia(paths.audio);
        // Limitado pelo vídeo ORIGINAL: repetir clipe para preencher padding de mp3
        // alongaria o criativo além do que o benchmark durava.
        const origDur = Number(pack.benchmark && pack.benchmark.video && pack.benchmark.video.duration) || 0;
        const audioSec = resolverDuracaoAlvo({ duration: origDur }, audioHere && audioHere.duration).alvo;
        const base = disponiveis.map((f) => {
            const n = parseInt(f.match(/\d+/)[0], 10);
            const p = probeMedia(path.join(paths.takes, f));
            const plano = modeling.takes.find((t) => t.n === n) || {};
            // Duração NATIVA do arquivo, não a do plano: o motor entrega o que entrega,
            // e forçar a duração planejada aceleraria ou travaria o clipe.
            return { ...plano, n, duration: Math.max(Number(p && p.duration) || 0, 0.5) };
        });

        const expandido = [];
        let acumulado = 0;
        let i = 0;
        // Teto de segurança: áudio longo com clipe curto não pode virar milhares de
        // entradas de filtro (cada repetição é um input do ffmpeg).
        const MAX_CLIPES = 60;
        // Sobra menor que isto não vira clipe novo: um take de 0,2s no fim do vídeo é
        // um flash, não um plano. Medido no lote — sem esta regra, dois criativos
        // terminavam com o último clipe espremido abaixo do piso de 0,6s e o corte
        // saía abrupto. Melhor esticar o clipe anterior e fechar limpo.
        const MIN_CAUDA = 1.2;
        while (acumulado < audioSec - 0.05 && expandido.length < MAX_CLIPES) {
            const restante = audioSec - acumulado;
            if (restante < MIN_CAUDA && expandido.length > 0) {
                expandido[expandido.length - 1].duration = Math.round((expandido[expandido.length - 1].duration + restante) * 100) / 100;
                acumulado += restante;
                break;
            }
            const src = base[i % base.length];
            // CORTE SECO entre repetições. O plano marca o ÚLTIMO take com transição
            // 'fade' — sentido narrativo de encerramento —, mas no loop esse take
            // reaparece no meio do vídeo, e a transição suave arrastava a montagem
            // para a cadeia de xfade, que trunca com muitos clipes (medido: 47s de
            // áudio com 12s de vídeo). Um laço se emenda por corte; o fecho do
            // criativo continua sendo feito pelo fade global no fim.
            expandido.push({ ...src, transition_out: 'cut', loopIndex: expandido.length });
            acumulado += src.duration;
            i++;
        }
        if (expandido.length === 0) expandido.push({ ...base[0], loopIndex: 0 });

        const ciclos = (expandido.length / base.length).toFixed(1);
        console.log(`  🔁 loop: ${base.length} take(s) aprovado(s) × ${ciclos} ciclo(s) = ${expandido.length} clipe(s) para ${audioSec.toFixed(1)}s de áudio`);
        orderedTakes = expandido;
    }

    // --- Pré-condição: takes/ completo conforme _slots.json (F5) ---
    // No modo loop a verificação de slots não se aplica: a lista vem dos arquivos que
    // existem, e a ausência de um take reprovado é justamente o motivo do loop.
    const slotCheck = args.fill === 'loop' ? { ok: true } : P.verifySlots(paths.takes);
    if (!slotCheck.ok) {
        const missing = (slotCheck.missing || []).map((s) => s.file).join(', ') || '(sem _slots.json)';
        P.appendDegraded(session, { phase: 'F6', label, status: 'blocked', issues: [`takes incompletos: ${missing}`] });
        console.log(`  🚫 takes incompletos (${missing}) — PARANDO este criativo. Rode a F5 antes.`);
        return { rank: pack.rank, handle: pack.handle, status: 'blocked', reason: `takes incompletos: ${missing}` };
    }

    // --- Áudio real (probado, nunca um campo de JSON) ---
    const audioProbe = probeMedia(paths.audio);
    if (!audioProbe || audioProbe.duration == null) {
        P.appendDegraded(session, { phase: 'F6', label, status: 'degraded', issues: ['ffprobe não conseguiu ler audio.mp3'] });
        console.log(`  ❌ ffprobe não conseguiu ler audio.mp3 — não é possível montar (o áudio manda na duração)`);
        return { rank: pack.rank, handle: pack.handle, status: 'degraded', reason: 'audio.mp3 ilegível' };
    }

    // --- Probe de cada take (para o gate técnico + normalização do ffmpeg) ---
    const takeProbes = orderedTakes.map((t) => probeMedia(path.join(paths.takes, `take-${t.n}.mp4`)));

    // --- Texto que vai na tela ---
    //
    // ORDEM DE PRECEDÊNCIA, e o porquê dela:
    //  1. `modeling.creative_text.frase` — a frase AUTORAL. Nos formatos deste nicho a
    //     frase É o conteúdo do criativo, não uma legenda de acessibilidade.
    //  2. transcrição de audio-description.md — fallback.
    //
    // A transcrição sozinha era o comportamento anterior, e ele queimava na tela do
    // NOSSO criativo a fala do vídeo de outra pessoa. Funciona como legenda; não
    // funciona como criativo modelado. Por isso o fallback agora AVISA.
    let captionSourceText = '';
    let captionOrigin = null;
    const wantCaptions = !args['no-captions'];

    // Remoção de marca d'água dos motores I2V gratuitos. Fica DESLIGADA por padrão:
    // o corte altera o enquadramento de todos os takes, e fazer isso em silêncio num
    // material que não tem marca seria perder quadro sem motivo. Quem gera à mão sabe
    // se o motor assina — e liga.
    const dewatermark = {
        enabled: args.dewatermark !== undefined && args.dewatermark !== false,
        zoom: args.dewatermark === true || args.dewatermark === '' ? 0.07 : parseFloat(args.dewatermark) || 0.07,
        corner: String(args['wm-corner'] || 'br'),
    };

    // Colocação do texto na tela. O default é BLOCO — frase inteira, do início ao fim,
    // centrada e acima do meio —, porque é assim que o criativo de benchmark faz e o
    // objetivo desta fase é modelá-lo. `--caption-mode=sequential` volta ao
    // comportamento de legenda cronometrada para quem quiser.
    const captionPlacement = {
        mode: String(args['caption-mode'] || 'block'),
        yFraction: parseFloat(args['caption-y']) || 0.42,
    };

    // ZONA SEGURA DO TIKTOK para legenda de narração.
    //
    // O app desenha por cima do vídeo: coluna de botões à direita (~180px em 1080),
    // e perfil/legenda/áudio na base (~420px). Texto que invade essas faixas fica
    // ilegível no feed, mesmo estando perfeito no arquivo.
    //
    // Posição: 58% da altura — meio-abaixo, o ponto de leitura natural do formato,
    // acima da faixa inferior da UI. Largura útil reduzida para forçar quebra em
    // duas linhas curtas (padrão de legenda de streaming), que se lê num relance.
    const speechPlacement = {
        mode: 'block',
        perCue: true,
        yFraction: parseFloat(args['caption-y']) || 0.58,
        sideMargin: 120,
        // Fonte MENOR que a do texto de composição (76px). Legenda de narração é
        // acompanhamento, não título: com 76px cabiam 19 caracteres por linha e as
        // frases quebravam em três linhas desequilibradas. Com 56px cabem ~26, e o
        // cue fecha em duas linhas limpas.
        fontSize: 56,
        maxLines: 2,
    };
    const extraWarnings = [];

    // Cues da FRASE REAL do criativo modelado, lidos da tela do benchmark pela visão.
    // Montados aqui porque dependem da timeline (tempos por take) — a decisão de usá-los
    // vem logo abaixo, na precedência.
    let originalCues = null;

    // ÁUDIO FALADO pede legenda da FALA, não a frase da tela.
    //
    // Quando o criativo tem narração (`audio.kind === 'original_speech'`), o que está
    // escrito na tela do original é a legenda do que está sendo dito — e ela acompanha
    // a fala, não fica parada. Usar a frase capturada de um frame congelaria uma linha
    // solta durante um minuto de narração. Em trilha instrumental é o oposto: a frase
    // da tela É o conteúdo, e a transcrição vira ruído (medido: "jaar").
    // `audio.kind` NÃO serve para isso: o TikTok marca como "som original" tudo que não
    // vem do catálogo — narração, música própria, áudio reaproveitado. Os seis packs
    // deste lote vieram todos como `original_speech`, inclusive os de trilha.
    //
    // O critério que funciona é o IDIOMA da transcrição. Whisper sobre música devolve
    // texto no idioma errado ou incoerente ("Es decir, voleu, se encontramen" numa
    // trilha instrumental); sobre fala em português devolve português. Só entra como
    // legenda o que passa no teste de idioma do nicho.
    const transcricao = pack.hasAudioDescription
        ? ES.extractCaptionSourceText(fs.readFileSync(paths.audioDescription, 'utf8'))
        : '';
    const transcricaoConfiavel = !!transcricao && L.matchesLanguage(transcricao, niche.language).ok;

    const autoral = String((modeling.creative_text && modeling.creative_text.frase) || '').trim();
    if (wantCaptions && autoral) {
        captionSourceText = autoral;
        captionOrigin = 'autoral';
    } else if (wantCaptions && transcricaoConfiavel && telaEhLegendaDaFala(modeling, transcricao)) {
        // A tela é LEGENDA da narração: use a transcrição inteira, que é mais completa
        // e acompanha a fala. Pegar só as frases capturadas nos frames daria pedaços
        // soltos de uma narração de um minuto.
        captionSourceText = transcricao;
        captionOrigin = 'transcricao-fala';
    } else if (wantCaptions && (modeling.creative_text && (modeling.creative_text.original_detectada || []).length)) {
        // MODELAGEM EXATA: usa a mesma frase que está na tela do criativo de origem.
        // Fica ACIMA da transcrição na precedência porque é o texto que o criativo
        // realmente mostra — a transcrição é do ÁUDIO e, em trilha instrumental,
        // produz ruído sem sentido (medido: a palavra "jaar" queimada na tela).
        captionOrigin = 'original-do-benchmark';
    } else if (wantCaptions && pack.hasAudioDescription) {
        const md = fs.readFileSync(paths.audioDescription, 'utf8');
        captionSourceText = ES.extractCaptionSourceText(md);
        if (captionSourceText) {
            captionOrigin = 'transcricao';
            extraWarnings.push(
                'texto na tela veio da TRANSCRIÇÃO do benchmark, não de frase autoral — ' +
                'preencha `creative_text.frase` no modeling.json para publicar texto próprio'
            );
        }
    }
    // `original-do-benchmark` não preenche captionSourceText: seus cues são montados
    // depois, a partir da timeline. Avisar "sem texto" aqui seria mentir sobre o export.
    if (wantCaptions && !captionSourceText && captionOrigin !== 'original-do-benchmark') {
        extraWarnings.push('sem frase autoral e sem transcrição utilizável — export seguirá SEM texto na tela');
    }

    // --- Montagem do timeline.json via _editspec (o áudio manda na duração) ---
    const captionStyle = modeling.caption_style || (niche.modeling && niche.modeling.caption_style) || null;

    // DURAÇÃO ALVO = a do vídeo ORIGINAL, não a do mp3.
    //
    // O mp3 extraído carrega padding do encoder e sai alguns centésimos mais longo que
    // o vídeo de origem. Como o áudio manda na duração, esse excedente virava uma cauda
    // muda no fim — trecho parado que quebra o loop de reexibição e come retenção.
    // O criativo modelado deve terminar quando o original terminava.
    const alvoResolvido = resolverDuracaoAlvo(pack.benchmark && pack.benchmark.video, audioProbe.duration);
    if (alvoResolvido.aviso) extraWarnings.push(alvoResolvido.aviso);
    const targetDuration = alvoResolvido.alvo;

    const { timeline, meta } = ES.buildTimeline({
        creative: `${String(pack.rank).padStart(2, '0')}-${L.slug(pack.handle, 24)}`,
        takes: orderedTakes,
        audioDurationSeconds: targetDuration,
        captionStyle,
        captionSourceText,
        includeCaptions: wantCaptions,
        // Legenda de narração usa cue curto para caber em 2 linhas dentro da zona
        // segura do TikTok; texto de composição mantém o padrão.
        maxWordsPerCue: captionOrigin === 'transcricao-fala' ? 5 : undefined,
    });
    if (meta.durationAdjustment.warnings.length) extraWarnings.push(...meta.durationAdjustment.warnings);

    // O reenquadramento anti-marca-d'água entra no contrato: quem espelha o criativo no
    // editor precisa recortar os takes IGUAL ao export. Antes isso dependia de o operador
    // repetir a mesma flag nos dois comandos — esquecer trocava o enquadramento inteiro e
    // o espelho ficava "quase igual" sem que nada acusasse.
    timeline.dewatermark = { ...dewatermark };

    fs.writeFileSync(path.join(pack.dir, 'timeline.json'), JSON.stringify(timeline, null, 2));
    console.log(`  ✓ timeline.json — ajuste de duração: ${meta.durationAdjustment.mode} (delta ${meta.durationAdjustment.deltaSeconds}s)`);

    // --- Gate ANTES do render — creative-export-checklist.md ---
    const gate = runExportGate({ pack, modeling, niche, orderedTakes, takeProbes, audioProbe, extraWarnings });
    if (gate.warnings.length) console.log(`  ⚠️ CONCERNS: ${gate.warnings.join(' | ')}`);
    if (gate.verdict === 'FAIL' || gate.verdict === 'BLOCKED') {
        P.appendDegraded(session, { phase: 'F6', label, status: gate.verdict.toLowerCase(), issues: gate.blockingFailures });
        console.log(`  🚫 ${gate.verdict} — NÃO exporta. Volta para: ${gate.returnPhase}`);
        gate.blockingFailures.forEach((f) => console.log(`     - ${f}`));
        return { rank: pack.rank, handle: pack.handle, status: gate.verdict.toLowerCase(), reason: gate.blockingFailures.join('; '), returnPhase: gate.returnPhase };
    }
    console.log(`  ✓ gate: ${gate.verdict}`);

    if (args['dry-run']) {
        console.log(`  · dry-run — parado antes do render`);
        return { rank: pack.rank, handle: pack.handle, status: 'dry-run', gate };
    }

    // --- Via studio: sempre tenta com o timeline.json já escrito; hoje sempre cai para ffmpeg ---
    const via = args.via || 'ffmpeg';
    if (via === 'studio') {
        const readiness = checkStudioReadiness();
        console.log(`  ℹ️  via=studio indisponível: ${readiness.reason}`);
        console.log(`  ↳ caindo para via=ffmpeg (gap do app, não falha desta fase)`);
    }

    // --- Render via ffmpeg (a via que precisa funcionar ponta a ponta) ---
    fs.mkdirSync(paths.export, { recursive: true });
    let captionsAssRelPath = null;
    // A frase do benchmark tem precedência sobre os cues da transcrição: quando ela
    // existe, é ELA que vai para a tela, com os tempos derivados dos takes.
    // Legenda de fala usa os tempos REAIS do Whisper, não a distribuição proporcional
    // do `_editspec` — que assume ritmo constante e sai adiantada ou atrasada.
    if (captionOrigin === 'transcricao-fala') {
        const sp = SP.ensureWordTimings(paths.audio, { language: 'pt' });
        if (sp.ok) {
            // Limite em CARACTERES, derivado da largura real disponível na tela: é o
            // caractere que decide se cabe, não a contagem de palavras.
            const fonteFala = speechPlacement.fontSize;
            const larguraUtil = 1080 - speechPlacement.sideMargin * 2;
            const charsPorLinha = Math.max(12, Math.floor(larguraUtil / (fonteFala * 0.52)));
            const cues = SP.buildCues(sp.words, { maxChars: charsPorLinha * 2 })
                .filter((c) => c.start < timeline.audioTrack.durationSeconds)
                .map((c) => ({ ...c, end: Math.min(c.end, timeline.audioTrack.durationSeconds) }));
            if (cues.length) {
                timeline.captions.cues = cues;
                timeline.captions.burnIn = true;
                speechPlacement.charsPerLine = charsPorLinha;
                console.log(`  ⏱️  legenda por palavra (${cues.length} cues · ${charsPorLinha} chars/linha${sp.cached ? ' · cache' : ''})`);
            }
        } else {
            extraWarnings.push(`sincronia por palavra indisponível (${sp.reason}) — legenda segue por distribuição proporcional`);
        }
    }

    if (captionOrigin === 'original-do-benchmark') {
        const oc = buildOriginalTextCues(orderedTakes, modeling, timeline.videoTrack);
        if (oc.cues.length) {
            originalCues = oc;
            timeline.captions.cues = oc.cues;
            timeline.captions.burnIn = true;
        }
    }
    if (timeline.captions.burnIn) {
        const assContent = buildAssContent(
            timeline.captions.cues, timeline.captions.style, timeline.captions.safeArea, timeline.format,
            captionOrigin === 'transcricao-fala'
                ? speechPlacement
                : { ...captionPlacement, perCue: !!(originalCues && originalCues.mode === 'progressiva') }
        );
        fs.writeFileSync(path.join(paths.export, 'captions.ass'), assContent, 'utf8');
        captionsAssRelPath = 'export/captions.ass';
    }

    const renderResult = renderWithFfmpeg({ pack, orderedTakes, timeline, meta, captionsAssRelPath, dewatermark });
    if (!renderResult.ok) {
        P.appendDegraded(session, { phase: 'F6', label, status: 'render-failed', issues: [renderResult.error] });
        console.log(`  ❌ render falhou: ${renderResult.error}`);
        return { rank: pack.rank, handle: pack.handle, status: 'render-failed', reason: renderResult.error };
    }

    // --- Validação pós-render — NUNCA reportar export sem isto confirmado ---
    const finalProbe = probeMedia(renderResult.outputPath);
    // CONTRA O ALVO, NÃO CONTRA O ÁUDIO CRU.
    //
    // A montagem mira `min(áudio, duração do vídeo original)` — o criativo modelado
    // termina quando o original terminava, e o mp3 extraído costuma vir alguns
    // centésimos mais longo por padding do encoder. Validar contra `audioProbe` fazia
    // o render CERTO ser reprovado sempre que o vídeo do benchmark fosse mais curto
    // que o áudio: medido no lote 2, um pack com 20,5s de vídeo e 57,7s de áudio
    // exportou os 20,5s pedidos e foi barrado por "fora da tolerância".
    const durOk = finalProbe && finalProbe.duration != null && Math.abs(finalProbe.duration - targetDuration) <= 0.6;
    const resOk = finalProbe && finalProbe.width === 1080 && finalProbe.height === 1920;
    const audioOk = finalProbe && finalProbe.hasAudio;
    const sizeOk = P.fileOk(renderResult.outputPath, 100 * 1024);
    if (!(durOk && resOk && audioOk && sizeOk)) {
        const issues = [];
        if (!sizeOk) issues.push('arquivo final < 100KB');
        if (!resOk) issues.push(`resolução inesperada (${finalProbe ? `${finalProbe.width}x${finalProbe.height}` : 'ilegível'})`);
        if (!durOk) issues.push(`duração fora da tolerância (${finalProbe ? finalProbe.duration : '?'}s vs alvo ${targetDuration.toFixed(2)}s · áudio ${audioProbe.duration}s)`);
        if (!audioOk) issues.push('sem trilha de áudio no arquivo final');
        P.appendDegraded(session, { phase: 'F6', label, status: 'validation-failed', issues });
        console.log(`  ❌ validação pós-render falhou: ${issues.join('; ')} — export NÃO confirmado`);
        return { rank: pack.rank, handle: pack.handle, status: 'validation-failed', reason: issues.join('; ') };
    }

    // --- Kit de publicação — export sem kit é trabalho pela metade ---
    const providersImagem = summarizeProviders(paths.images);
    const providersVideo = summarizeProviders(paths.takes);
    const kitMd = buildPublishingKit({
        pack, niche, session, modeling,
        finalDurationSeconds: finalProbe.duration,
        providersImagem, providersVideo,
        // Fonte de verdade é a timeline efetivamente renderizada, não a intenção.
        captionsApplied: !!(timeline.captions && timeline.captions.burnIn),
        captionOrigin,
        captionStyle: timeline.captions && timeline.captions.style,
    });
    fs.writeFileSync(path.join(paths.export, 'publishing-kit.md'), kitMd, 'utf8');

    console.log(`  ✅ export/criativo.mp4 (${finalProbe.duration.toFixed(1)}s, ${finalProbe.width}x${finalProbe.height}) + publishing-kit.md`);
    return {
        rank: pack.rank, handle: pack.handle, status: gate.verdict === 'CONCERNS' ? 'exported-concerns' : 'exported',
        gate, finalDuration: finalProbe.duration,
        outputPath: path.relative(L.REPO_ROOT, renderResult.outputPath).replace(/\\/g, '/'),
    };
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

(async () => {
    const args = L.parseArgs(process.argv);

    let session;
    try {
        session = P.resolveSession(args);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const manifest = session.manifest || {};
    const niche = L.loadNiche(args.niche || manifest.niche);

    // Mesmo padrão da F3: completude verificada por disco (diskComplete), ranks/top
    // aplicados DEPOIS — um pack pode ter status parcial na F2 e ainda assim ter
    // takes/modeling.json prontos para a F6 (a checagem real acontece por criativo).
    let packs = P.listPacks(session, { origin: args.origin }).filter((p) => p.diskComplete);
    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    } else if (args.top) {
        packs = packs.slice(0, parseInt(args.top, 10));
    }

    console.log(`\n=== F6 Montagem, Edição e Export · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão: ${session.id}`);
    console.log(`Packs:  ${packs.length} candidato(s)`);
    console.log(`Via:    ${args.via || 'ffmpeg'}${args['dry-run'] ? ' · dry-run' : ''}${args['no-captions'] ? ' · sem legenda' : ''}`);
    if (niche.id === 'noticias') console.log(`⚠️  Gate terminal ativo: sem transcrição, o criativo NÃO é exportado.`);

    if (packs.length === 0) {
        console.log(`\n⚠️  Nenhum pack completo encontrado na sessão. Rode as fases anteriores primeiro.`);
        process.exit(0);
    }

    const results = [];
    for (const pack of packs) {
        try {
            results.push(await processCreative(pack, { niche, session, args }));
        } catch (e) {
            console.log(`  ❌ exceção: ${e.message}`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'degraded', reason: `exceção: ${e.message}` });
        }
    }

    const exported = results.filter((r) => r.status === 'exported' || r.status === 'exported-concerns');
    const blockedOrFailed = results.filter((r) => ['blocked', 'fail', 'render-failed', 'validation-failed'].includes(r.status));
    const skippedOrDegraded = results.filter((r) => ['skipped', 'degraded'].includes(r.status));
    const dryRun = results.filter((r) => r.status === 'dry-run');

    if (!args['dry-run']) {
        P.saveManifest(session, 'f6_assembly', {
            processed: results.length,
            exported: exported.length,
            blocked_or_failed: blockedOrFailed.length,
            skipped_or_degraded: skippedOrDegraded.length,
            via: args.via || 'ffmpeg',
            results: results.map((r) => ({ rank: r.rank, handle: r.handle, status: r.status, reason: r.reason || null, outputPath: r.outputPath || null })),
        });
    }

    console.log(`\n${'='.repeat(58)}`);
    console.log(`✅ Exportados: ${exported.length}  ·  🚫 Bloqueados/reprovados: ${blockedOrFailed.length}  ·  ⏭️ Pulados/degradados: ${skippedOrDegraded.length}${dryRun.length ? `  ·  🧪 dry-run: ${dryRun.length}` : ''}`);
    if (blockedOrFailed.length) {
        console.log(`📄 Detalhe: ${path.relative(L.REPO_ROOT, path.join(session.dir, '_degraded.md')).replace(/\\/g, '/')}`);
    }
    console.log(`📁 Sessão: ${path.relative(L.REPO_ROOT, session.dir).replace(/\\/g, '/')}`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
