/**
 * _motion.js — Direção de movimento e prompts I2V (uso MANUAL).
 *
 * MUDANÇA DE PREMISSA (2026-07-28): o motor automático de vídeo saiu do pipeline até
 * haver API paga ou hardware para modelo local. O alvo destes prompts é o operador
 * colando à mão em Hailuo/MiniMax, BytePlus/Seedance, Kling, Symphony ou RunningHub.
 *
 * O QUE ESTAVA ERRADO NA PRIMEIRA VERSÃO (corrigido 2026-07-28, com take real na mão):
 *
 *  1. PROMPT EM PORTUGUÊS DESCREVENDO CÂMERA DE FFMPEG. Estes modelos são treinados
 *     sobretudo em inglês, e em image-to-video a imagem JÁ é a cena — redescrevê-la faz
 *     o modelo recriar o que já está lá, origem do morphing. O prompt diz o que se MOVE.
 *
 *  2. TAKES PENSADOS ISOLADAMENTE. Cada take recebia sua câmera pelo papel narrativo,
 *     sem olhar para o vizinho. Num criativo de 2 takes isso produzia push-in seguido de
 *     pull-out — sanfona: o olho entra e é imediatamente expulso. Agora a sequência é
 *     PLANEJADA em conjunto (`planCameraSequence`), com regra explícita de não reverter.
 *
 *  3. CUE DE MOVIMENTO SEM DIREÇÃO SEGURA. "vehicle headlights sliding past" numa imagem
 *     que tinha um ônibus DE FRENTE para a câmera fez o modelo trazer o veículo para cima
 *     da lente — o take virou uma ambulância em rota de colisão. Cues que envolvem objeto
 *     móvel agora declaram explicitamente que ele permanece distante e não se aproxima.
 *
 *  4. ÁUDIO GERADO. Motores novos (Hailuo, Veo) produzem trilha própria — no caso real,
 *     uma sirene. O criativo usa o áudio do benchmark; áudio gerado colide na montagem.
 *     O documento agora manda desligar/ignorar o áudio do motor.
 */

/**
 * Elementos móveis detectáveis na descrição de cena (que vem em pt-BR da visão) e a
 * frase de movimento em inglês correspondente.
 *
 * `safe: false` marca cue que envolve OBJETO capaz de se deslocar em direção à câmera.
 * Nesses, a frase precisa fixar a distância — sem isso o modelo escolhe a interpretação
 * mais dramática, que é vir para cima da lente.
 */
const MOTION_CUES = [
    { match: /\bchuva|chuvos[ao]|chovendo|gotas?\b/i, en: 'fine rain falling steadily through the frame', safe: true },
    { match: /\bmolhad[ao]|poça|poças|úmid[ao]\b/i, en: 'reflections shimmering on the wet ground', safe: true },
    { match: /\bneve|nevando\b/i, en: 'snow drifting slowly downward', safe: true },
    { match: /\bnuvens?|céu\b/i, en: 'clouds drifting slowly across the sky', safe: true },
    { match: /\bnévoa|neblina|bruma|fumaça|vapor\b/i, en: 'thin mist rolling softly in the background', safe: true },
    { match: /\bárvores?|folhas?|folhagem|mata|floresta|palmeiras?\b/i, en: 'foliage swaying gently in a light breeze', safe: true },
    { match: /\bgrama|campo|trigo|planta[çc]ão\b/i, en: 'grass rippling in a soft wind', safe: true },
    { match: /\bmar|onda|ondas|oceano|praia|rio|cachoeira|água\b/i, en: 'water moving continuously, small waves catching the light', safe: true },
    { match: /\bvela|chama|fogo|fogueira|lareira\b/i, en: 'flame flickering warmly', safe: true },
    // ⚠️ Objetos que podem "vir para cima da câmera". A distância é declarada na frase.
    {
        match: /\bveículos?|carros?|ônibus|onibus|tráfego|trânsito|faróis?|motos?|caminhão\b/i,
        en: 'distant vehicles holding their position far down the road, headlights glowing steadily, none approaching the camera',
        safe: false,
    },
    { match: /\bpessoas?|pedestres?|multidão|gente\b/i, en: 'a few distant pedestrians moving slowly far in the background', safe: false },
    { match: /\bpostes?|luzes?|luminos[ao]|neon|letreiros?\b/i, en: 'city lights glowing with a subtle flicker', safe: true },
    { match: /\bsol|amanhecer|entardecer|pôr do sol|raios\b/i, en: 'light rays shifting slowly across the scene', safe: true },
    { match: /\bcabelo|cabelos\b/i, en: 'hair moving slightly in the wind', safe: true },
    { match: /\btecido|manto|véu|cortina|bandeira|roupas?\b/i, en: 'fabric rippling softly', safe: true },
    { match: /\bpoeira|partículas|fagulhas?\b/i, en: 'dust particles floating in the air', safe: true },
    { match: /\bpássaros?|aves?|borboletas?\b/i, en: 'birds gliding far in the background', safe: true },
    { match: /\bmãos?|orando|oração|rezando\b/i, en: 'hands remaining still, only a subtle breathing motion', safe: true },
];

/**
 * Vocabulário de câmera. `minimax` é a sintaxe de colchetes que o Hailuo/MiniMax lê como
 * comando literal — a diferença entre pedir e obter.
 */
const CAMERA_MOVES = {
    push_in: {
        minimax: '[Push in]',
        natural: 'very slow dolly push-in, barely perceptible',
        label: 'entrada',
        why: 'puxa o olho para dentro da cena no primeiro segundo',
    },
    drift_left: {
        minimax: '[Truck left]',
        natural: 'very slow lateral drift to the left, steady and even',
        label: 'deriva à esquerda',
        why: 'mantém a cena viva sem competir com a leitura',
    },
    drift_right: {
        minimax: '[Truck right]',
        natural: 'very slow lateral drift to the right, steady and even',
        label: 'deriva à direita',
        why: 'mantém a cena viva sem competir com a leitura',
    },
    settle: {
        minimax: '[Static shot]',
        natural: 'static shot with an almost imperceptible drift, the frame simply breathes',
        label: 'assenta',
        why: 'o quadro para para a frase ser lida — movimento aqui rouba a leitura',
    },
    pull_out: {
        minimax: '[Pull out]',
        natural: 'very slow dolly pull-out, gradually opening the frame',
        label: 'abertura final',
        why: 'abre e conclui, dando espaço ao encerramento',
    },
};

/**
 * PLANEJA A SEQUÊNCIA INTEIRA — o coração da correção.
 *
 * Duas regras de continuidade, ambas vindas de erro observado em take real:
 *
 *  · NÃO REVERTER. Push-in seguido de pull-out é sanfona: o espectador é puxado para
 *    dentro e imediatamente empurrado para fora. Num criativo de 2 takes de ~3s isso é
 *    a coisa mais visível do vídeo. Pull-out só entra se o take anterior NÃO for push-in.
 *
 *  · O ÚLTIMO ASSENTA. Nestes formatos a frase na tela é o conteúdo; movimento no
 *    fechamento disputa com a leitura. O take final é `settle`, salvo quando há takes
 *    suficientes para um pull-out preparado por um take de descanso.
 *
 * Derivas laterais alternam de lado a cada uso, para não repetir o mesmo gesto.
 */
function planCameraSequence(takes) {
    const n = takes.length;
    if (n === 0) return [];
    if (n === 1) return ['settle'];

    const seq = ['push_in'];
    let lastDrift = 'drift_right';

    for (let i = 1; i < n; i++) {
        const isLast = i === n - 1;
        const prev = seq[i - 1];

        if (isLast) {
            // Pull-out só depois de um take que não seja entrada — senão vira sanfona.
            seq.push(prev !== 'push_in' && n >= 4 ? 'pull_out' : 'settle');
            continue;
        }
        // Alterna deriva e descanso no miolo: movimento contínuo em todos os takes
        // cansa e some com a diferença entre eles.
        if (prev === 'push_in' || prev.startsWith('drift')) {
            seq.push('settle');
        } else {
            lastDrift = lastDrift === 'drift_right' ? 'drift_left' : 'drift_right';
            seq.push(lastDrift);
        }
    }
    return seq;
}

/**
 * Negativos. Focados nos modos de falha REAIS de I2V a partir de imagem fixa.
 * O bloco de aproximação/colisão veio direto do take que saiu com um veículo em rota
 * de colisão com a câmera; o de áudio, da sirene que o motor inventou.
 */
const NEGATIVE_EN = [
    // identidade da cena
    'morphing faces', 'distorted hands', 'warping architecture', 'changing scene',
    'new objects appearing', 'style change', 'color shift',
    // aproximação e colisão — o erro mais destrutivo em cena com veículo
    'vehicle driving toward the camera', 'object approaching the lens', 'collision',
    'emergency vehicle', 'flashing emergency lights', 'sudden movement', 'zoom burst',
    // câmera
    'fast camera movement', 'shaky camera', 'cuts', 'scene transition', 'camera rotation',
    // gráficos e áudio
    'text appearing', 'watermark', 'logo', 'subtitles',
    'sirens', 'generated audio', 'speech', 'music',
    // qualidade
    'oversaturated', 'blurry', 'low quality',
];

/** Extrai as frases de movimento ambiente a partir da cena traduzida (pt-BR). */
function ambientMotion(cena, max = 3) {
    const texto = [cena && cena.sujeito, cena && cena.fundo, cena && cena.textura, cena && cena.cor, cena && cena.luz]
        .filter(Boolean).join(' ');
    const out = [];
    for (const cue of MOTION_CUES) {
        if (cue.match.test(texto) && !out.some((o) => o.en === cue.en)) out.push(cue);
        if (out.length >= max) break;
    }
    // Sem pista nenhuma, o movimento mais seguro que existe em I2V é deixar a cena
    // parada e só respirar. Inventar movimento que a cena não sugere é o caminho mais
    // curto para o modelo alucinar elemento novo.
    if (out.length === 0) out.push({ en: 'subtle ambient movement only, the scene stays intact', safe: true });
    return out;
}

/**
 * Monta o prompt de UM take, já ciente do lugar dele na sequência.
 *
 * @param {object} take
 * @param {object} ctx  { move, index, total, continuity }
 */
function buildMotionPrompt(take, ctx = {}) {
    const move = CAMERA_MOVES[ctx.move] || CAMERA_MOVES.settle;
    const cues = ambientMotion(take.cena || {}, ctx.maxCues || 3);
    const seconds = Math.max(3, Math.min(6, Math.round(Number(take.duration) || 5)));
    const hasRisky = cues.some((c) => c.safe === false);

    const parts = [];
    parts.push(cues.map((c) => c.en).join(', ') + '.');
    parts.push(`Camera: ${move.natural}.`);
    // Continuidade explícita a partir do 2º take: sem isto cada take vira um mundo,
    // com clima e paleta próprios, e a montagem parece colagem.
    if (ctx.index > 0 && ctx.continuity) parts.push(`${ctx.continuity}.`);
    parts.push('Keep the original composition, subject, colors and lighting exactly as in the input image.');
    // Reforço só quando a cena tem objeto capaz de avançar — poluir todo prompt com
    // isto gastaria atenção do modelo onde não há risco.
    if (hasRisky) parts.push('Everything stays at its original distance; nothing moves toward the camera.');
    parts.push(`Cinematic, photorealistic, smooth continuous motion, ${seconds} seconds, vertical 9:16.`);

    return {
        prompt: parts.join(' '),
        negative: NEGATIVE_EN.join(', '),
        camera: move,
        ambient: cues.map((c) => c.en),
        seconds,
        hasRisky,
    };
}

/**
 * Frase de continuidade do criativo — a mesma para todos os takes, derivada do primeiro.
 * É o que faz os takes "conversarem": mesma noite, mesmo clima, mesma paleta.
 */
function continuityAnchor(takes) {
    const c = (takes[0] && takes[0].cena) || {};
    const bits = [c.luz, c.cor].filter(Boolean).map((s) => String(s).split(/[,.]/)[0].trim()).filter(Boolean);
    const base = 'Same location, same time of day and same color palette as the previous shot, continuous scene';
    return bits.length ? `${base}` : base;
}

/** Notas de direção para o documento — explica a sequência escolhida ao operador. */
function directionNotes(takes, sequence) {
    return sequence.map((k, i) => ({
        take: takes[i] ? takes[i].n : i + 1,
        move: k,
        label: (CAMERA_MOVES[k] || {}).label || k,
        why: (CAMERA_MOVES[k] || {}).why || '',
    }));
}

const ENGINES = [
    {
        id: 'minimax',
        label: 'Hailuo / MiniMax',
        url: 'https://hailuoai.video',
        note: 'Lê comandos entre colchetes como instrução literal de câmera — mantenha no INÍCIO. Desligue a geração de áudio.',
        format: (m) => `${m.camera.minimax} ${m.prompt}`,
        negativeSupported: false,
    },
    {
        id: 'seedance',
        label: 'BytePlus / Seedance',
        url: 'https://www.byteplus.com',
        note: 'Responde bem a movimento ambiente + câmera em linguagem natural.',
        format: (m) => m.prompt,
        negativeSupported: true,
    },
    {
        id: 'kling',
        label: 'Kling',
        url: 'https://klingai.com',
        note: 'Tem campo de negative prompt separado — preencha, é o que segura o morphing e a aproximação.',
        format: (m) => m.prompt,
        negativeSupported: true,
    },
    {
        id: 'generic',
        label: 'Symphony (TikTok) · RunningHub · outros',
        url: '',
        note: 'Formato neutro, sem sintaxe específica.',
        format: (m) => m.prompt,
        negativeSupported: true,
    },
];

module.exports = {
    buildMotionPrompt, planCameraSequence, continuityAnchor, directionNotes,
    ambientMotion, CAMERA_MOVES, MOTION_CUES, NEGATIVE_EN, ENGINES,
};
