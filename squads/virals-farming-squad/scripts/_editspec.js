/**
 * _editspec.js — Tradutor puro: modeling.json + assets → timeline.json (F6).
 *
 * Contrato de saída em `tools/video-studio-bridge.md`. Este módulo NÃO faz I/O
 * (nem de rede, nem de disco): recebe dados já lidos pelo chamador
 * (farm-assemble.js) e devolve a estrutura do timeline.json + metadados de
 * decisão (ajuste de duração, disponibilidade de legenda).
 *
 * REGRA CENTRAL — o áudio manda na duração (ver `resolveTakeDurations`):
 *   soma(takes) <  áudio  →  ESTENDE o último take
 *   soma(takes) >  áudio  →  encurta o último take
 *   soma(takes) == áudio  →  montagem direta
 * O áudio NUNCA é cortado — o fechamento sonoro é parte do que fez o
 * original performar (ver farm-studio-assembly.md).
 *
 * Testável isoladamente: `node squads/virals-farming-squad/scripts/_editspec.js`
 * roda o self-test embutido (bloco `require.main === module` no final).
 */

'use strict';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ---------------------------------------------------------------------------
// Regra central de duração — o áudio manda.
// ---------------------------------------------------------------------------

/**
 * Ajusta as durações dos takes para cobrir EXATAMENTE a duração do áudio,
 * mexendo SOMENTE no último take. O áudio nunca é cortado.
 *
 * @param {Array<{n:number, duration:number}>} takes  ordem de montagem
 * @param {number} audioDurationSeconds               duração REAL do áudio (probada em disco)
 * @param {object} opts  { minLastTakeSeconds: number, toleranceSeconds: number }
 * @returns {{durations:number[], mode:'extended'|'shrunk'|'exact', deltaSeconds:number, warnings:string[]}}
 */
function resolveTakeDurations(takes, audioDurationSeconds, opts = {}) {
    const minLast = opts.minLastTakeSeconds ?? 0.6;
    const tolerance = opts.toleranceSeconds ?? 0.05;
    const warnings = [];

    if (!Array.isArray(takes) || takes.length === 0) {
        return { durations: [], mode: 'exact', deltaSeconds: 0, warnings: ['nenhum take fornecido'] };
    }

    const durations = takes.map((t) => Number(t.duration) || 0);
    const sum = round2(durations.reduce((a, b) => a + b, 0));
    const audio = round2(Number(audioDurationSeconds) || 0);
    const delta = round2(audio - sum);

    let mode = 'exact';
    const lastIdx = durations.length - 1;

    if (delta > tolerance) {
        // soma(takes) < áudio → estende o ÚLTIMO take (nunca corta o áudio).
        durations[lastIdx] = round2(durations[lastIdx] + delta);
        mode = 'extended';
    } else if (delta < -tolerance) {
        // soma(takes) > áudio → encurta o ÚLTIMO take, com piso de segurança.
        const shrunk = round2(durations[lastIdx] + delta); // delta é negativo
        if (shrunk < minLast) {
            warnings.push(
                `último take encurtado abaixo do piso mínimo (${minLast}s) — ` +
                `soma dos takes excede o áudio em ${Math.abs(delta)}s; corte pode ficar abrupto`
            );
            durations[lastIdx] = minLast;
        } else {
            durations[lastIdx] = shrunk;
        }
        mode = 'shrunk';
    }

    return { durations, mode, deltaSeconds: delta, warnings };
}

// ---------------------------------------------------------------------------
// Efeitos por posição — reusa o procedural_preset já decidido na F3 (farm-model.js).
// ---------------------------------------------------------------------------

/**
 * Efeito visual do take, por posição no arco. O preset em si já vem calculado
 * pela F3 (slow-push-in no hook, slow-pull-out no fechamento, pan-lr/breathing
 * alternando nos takes intermediários) — aqui só empacotamos no formato da ponte.
 */
function effectsForTake(take, index, total) {
    const fallback = index === 0 ? 'slow-push-in' : index === total - 1 ? 'slow-pull-out' : 'pan-lr';
    const preset = take.procedural_preset || fallback;
    return [{ type: 'zoom', preset, intensity: 'subtle' }];
}

/**
 * Transição de SAÍDA do take (para o próximo). O último take não tem — seu
 * fechamento é o `close` global (fade-out coordenado com o fim do áudio).
 * `transition_out` do modeling.json ('cut' = beat mudou → corte seco; qualquer
 * outro valor, ex. 'soft'/'fade' entre takes do mesmo mundo → transição suave
 * de 8 frames). Hoje a F3 só emite 'cut' internamente e 'fade' no último —
 * mapeamento deixado pronto para quando a F3 diferenciar por "mundo visual".
 */
function transitionOutFor(take, isLast) {
    if (isLast) return undefined;
    const isHardCut = take.transition_out === 'cut';
    return isHardCut ? { type: 'hard', durationFrames: 1 } : { type: 'soft', durationFrames: 8 };
}

// ---------------------------------------------------------------------------
// Legendas — fonte é SEMPRE audio-description.md (transcrição real, nunca invenção).
// ---------------------------------------------------------------------------

/**
 * Extrai o texto de transcrição/letra REAL de audio-description.md (mesmo
 * contrato de seções usado por farm-benchmark.js/farm-model.js). Devolve ''
 * quando a transcrição está ausente ou é um placeholder ("_..._") — nunca
 * inventa texto.
 */
function extractCaptionSourceText(mdContent) {
    if (!mdContent) return '';
    const m = String(mdContent).match(/##+\s*(Tradução \/ conteúdo da letra|Transcrição integral)\s*\n+([\s\S]*)/i);
    if (!m) return '';
    let body = m[2].trim();
    const nextHeader = body.search(/\n##+\s/);
    if (nextHeader !== -1) body = body.slice(0, nextHeader).trim();
    if (/^_.*_$/.test(body) || /Transcrição indisponível|Não obtida nesta rodada/i.test(body)) return '';
    return body;
}

/**
 * Quebra o texto em blocos curtos de legenda (por contagem de palavras). Sem
 * timestamps reais de ASR disponíveis, a distribuição no tempo é PROPORCIONAL
 * ao número de palavras de cada bloco sobre a duração total do áudio — uma
 * aproximação honesta, não uma transcrição alinhada por fonema. Documentado
 * aqui para quem for revisar: se a F2 algum dia expuser timestamps por palavra,
 * este é o ponto a trocar.
 */
function chunkCaptionText(text, opts = {}) {
    const maxWords = opts.maxWordsPerCue || 6;
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks;
}

/**
 * Constrói os cues de legenda { start, end, text } distribuindo o texto
 * proporcionalmente à duração total do áudio (ver nota de aproximação em
 * `chunkCaptionText`). Retorna [] quando não há texto (chamador decide se isso
 * vira CONCERNS — nunca é bloqueante fora do nicho notícias).
 */
function buildCaptionCues(text, totalDurationSeconds, opts = {}) {
    const clean = String(text || '').trim();
    if (!clean) return [];

    const chunks = chunkCaptionText(clean, opts);
    const totalWords = chunks.reduce((acc, c) => acc + c.split(/\s+/).filter(Boolean).length, 0);
    if (totalWords === 0) return [];

    const total = Number(totalDurationSeconds) || 0;
    const cues = [];
    let cursor = 0;
    chunks.forEach((chunk, i) => {
        const wordCount = chunk.split(/\s+/).filter(Boolean).length;
        const isLast = i === chunks.length - 1;
        const share = wordCount / totalWords;
        const end = isLast ? total : round2(cursor + total * share);
        cues.push({ start: round2(cursor), end: round2(Math.max(end, cursor + 0.1)), text: chunk });
        cursor = end;
    });
    return cues;
}

// ---------------------------------------------------------------------------
// Montagem do timeline.json (contrato da ponte).
// ---------------------------------------------------------------------------

/**
 * @param {object} input
 *   creative            string  — id do criativo (ex.: "01-handle-abc")
 *   takes               Array<{n, role, duration, procedural_preset, transition_out}>
 *   audioDurationSeconds number — duração REAL do áudio (ffprobe), nunca de um campo de JSON
 *   captionStyle        string|null — caption_style do modeling/nicho
 *   captionSourceText   string  — texto já extraído de audio-description.md ('' = sem legenda)
 *   safeArea            {bottom, sides}
 *   fps                 number  (default 30)
 *   includeCaptions     boolean (default true) — false quando --no-captions
 *   maxWordsPerCue      number  (opcional)
 * @returns {{timeline: object, meta: {durationAdjustment, captionsAvailable}}}
 */
function buildTimeline(input) {
    const {
        creative,
        takes,
        audioDurationSeconds,
        captionStyle = null,
        captionSourceText = '',
        safeArea = { bottom: 220, sides: 60 },
        fps = 30,
        includeCaptions = true,
        maxWordsPerCue,
    } = input;

    const durationAdjustment = resolveTakeDurations(takes, audioDurationSeconds);
    const { durations } = durationAdjustment;

    let cursorFrame = 0;
    const videoTrack = takes.map((t, i) => {
        const durationSeconds = round2(durations[i]);
        const durationFrames = Math.round(durationSeconds * fps);
        const isLast = i === takes.length - 1;
        const clip = {
            take: t.n,
            file: `takes/take-${t.n}.mp4`,
            role: t.role,
            durationSeconds,
            startFrame: cursorFrame,
            effects: effectsForTake(t, i, takes.length),
        };
        const tOut = transitionOutFor(t, isLast);
        if (tOut) clip.transitionOut = tOut;
        cursorFrame += durationFrames;
        return clip;
    });

    const totalDurationSeconds = round2(Number(audioDurationSeconds) || 0);
    const durationInFrames = Math.round(totalDurationSeconds * fps);

    let cues = [];
    if (includeCaptions && captionSourceText) {
        cues = buildCaptionCues(captionSourceText, totalDurationSeconds, { maxWordsPerCue });
    }
    const captionsAvailable = cues.length > 0;

    const timeline = {
        creative,
        format: { width: 1080, height: 1920, fps },
        audioTrack: { file: 'audio.mp3', role: 'bed', durationSeconds: totalDurationSeconds },
        videoTrack,
        captions: {
            burnIn: captionsAvailable,
            style: captionStyle,
            source: 'audio-description.md',
            safeArea,
            cues,
        },
        open: { type: 'fade-in', durationFrames: 10 },
        close: { type: 'fade-out', durationFrames: 14 },
        durationInFrames,
    };

    return { timeline, meta: { durationAdjustment, captionsAvailable } };
}

module.exports = {
    resolveTakeDurations,
    effectsForTake,
    transitionOutFor,
    extractCaptionSourceText,
    chunkCaptionText,
    buildCaptionCues,
    buildTimeline,
};

// ---------------------------------------------------------------------------
// Self-test — `node squads/virals-farming-squad/scripts/_editspec.js`
// Sem framework de teste no projeto para scripts de squad; asserts simples.
// ---------------------------------------------------------------------------
if (require.main === module) {
    const assert = require('assert');
    let passed = 0;
    const t = (label, fn) => {
        fn();
        passed++;
        console.log(`  ✓ ${label}`);
    };

    console.log('=== _editspec.js — self-test ===\n');

    // --- Caso 1: soma(takes) < áudio → ESTENDE o último take ---
    t('estende o último take quando a soma é menor que o áudio', () => {
        const takes = [{ n: 1, duration: 3 }, { n: 2, duration: 3 }, { n: 3, duration: 3 }]; // soma = 9
        const r = resolveTakeDurations(takes, 12); // áudio = 12
        assert.strictEqual(r.mode, 'extended');
        assert.strictEqual(r.durations[0], 3);
        assert.strictEqual(r.durations[1], 3);
        assert.strictEqual(r.durations[2], 6); // 3 + (12-9)
        assert.strictEqual(round2(r.durations.reduce((a, b) => a + b, 0)), 12);
    });

    // --- Caso 2: soma(takes) > áudio → encurta o último take ---
    t('encurta o último take quando a soma é maior que o áudio', () => {
        const takes = [{ n: 1, duration: 4 }, { n: 2, duration: 4 }, { n: 3, duration: 4 }]; // soma = 12
        const r = resolveTakeDurations(takes, 9); // áudio = 9
        assert.strictEqual(r.mode, 'shrunk');
        assert.strictEqual(r.durations[0], 4);
        assert.strictEqual(r.durations[1], 4);
        assert.strictEqual(r.durations[2], 1); // 4 - 3
        assert.strictEqual(round2(r.durations.reduce((a, b) => a + b, 0)), 9);
    });

    // --- Caso 3: soma(takes) == áudio → montagem direta, nada muda ---
    t('não altera nada quando a soma já cobre o áudio (dentro da tolerância)', () => {
        const takes = [{ n: 1, duration: 5 }, { n: 2, duration: 5 }]; // soma = 10
        const r = resolveTakeDurations(takes, 10.02); // dentro da tolerância de 0.05s
        assert.strictEqual(r.mode, 'exact');
        assert.strictEqual(r.durations[0], 5);
        assert.strictEqual(r.durations[1], 5);
    });

    // --- Caso extra: piso de segurança quando o encurtamento seria drástico ---
    t('aplica piso mínimo e avisa quando o encurtamento é drástico demais', () => {
        const takes = [{ n: 1, duration: 4 }, { n: 2, duration: 4 }]; // soma = 8
        const r = resolveTakeDurations(takes, 2); // áudio bem menor — encurtaria para -2s
        assert.strictEqual(r.mode, 'shrunk');
        assert.strictEqual(r.durations[1], 0.6); // piso mínimo default
        assert.ok(r.warnings.length > 0);
    });

    // --- Cues de legenda: distribuição proporcional cobre a duração total ---
    t('buildCaptionCues cobre a duração total sem exceder', () => {
        const cues = buildCaptionCues('isso é um teste de legenda gerada automaticamente aqui', 10, { maxWordsPerCue: 3 });
        assert.ok(cues.length > 0);
        assert.strictEqual(cues[0].start, 0);
        assert.strictEqual(cues[cues.length - 1].end, 10);
        for (let i = 1; i < cues.length; i++) assert.ok(cues[i].start >= cues[i - 1].start);
    });

    t('buildCaptionCues devolve vazio sem texto (nunca inventa legenda)', () => {
        assert.deepStrictEqual(buildCaptionCues('', 10), []);
        assert.deepStrictEqual(buildCaptionCues(null, 10), []);
    });

    // --- extractCaptionSourceText: nunca extrai placeholder como se fosse real ---
    t('extractCaptionSourceText ignora placeholder de transcrição indisponível', () => {
        const md = '# Descrição do Áudio\n\n## Transcrição integral\n\n_Transcrição indisponível._ **Este criativo está degradado.**\n';
        assert.strictEqual(extractCaptionSourceText(md), '');
    });

    t('extractCaptionSourceText extrai transcrição real', () => {
        const md = '# Descrição do Áudio\n\n## Transcrição integral\n\nEsta é a fala real do criativo original.\n';
        assert.strictEqual(extractCaptionSourceText(md), 'Esta é a fala real do criativo original.');
    });

    // --- buildTimeline: smoke test do contrato completo ---
    t('buildTimeline monta o contrato da ponte com startFrame cumulativo', () => {
        const takes = [
            { n: 1, role: 'hook', duration: 3, procedural_preset: 'slow-push-in', transition_out: 'cut' },
            { n: 2, role: 'desenvolvimento', duration: 3, procedural_preset: 'pan-lr', transition_out: 'cut' },
            { n: 3, role: 'fechamento', duration: 3, procedural_preset: 'slow-pull-out', transition_out: 'fade' },
        ];
        const { timeline, meta } = buildTimeline({
            creative: '01-teste-abc123',
            takes,
            audioDurationSeconds: 10,
            captionStyle: 'montserrat-bold-outline',
            captionSourceText: 'uma legenda de teste com algumas palavras a mais',
            fps: 30,
        });
        assert.strictEqual(timeline.creative, '01-teste-abc123');
        assert.strictEqual(timeline.format.width, 1080);
        assert.strictEqual(timeline.format.height, 1920);
        assert.strictEqual(timeline.videoTrack.length, 3);
        assert.strictEqual(timeline.videoTrack[0].startFrame, 0);
        assert.strictEqual(timeline.videoTrack[1].startFrame, 90); // 3s @ 30fps
        assert.strictEqual(timeline.videoTrack[2].transitionOut, undefined); // último não tem
        assert.strictEqual(timeline.captions.burnIn, true);
        assert.strictEqual(timeline.durationInFrames, 300); // 10s @ 30fps
        assert.ok(meta.captionsAvailable);
    });

    console.log(`\n${passed} teste(s) passaram.\n`);
}
