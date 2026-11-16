#!/usr/bin/env node
/**
 * farm-model.js — F3 Modelagem Autoral · Virals Farming Squad
 *
 * Consome o pack de benchmark (F2) e produz o criativo MODELADO: mesma estrutura
 * que fez o original performar (ritmo, enquadramento, progressão emocional),
 * conteúdo 100% autoral (sujeito, cena, falas trocados).
 *
 * O PASSO QUE DECIDE TUDO: descarte de camadas. Um screenshot do TikTok não é a
 * imagem — é a imagem MAIS sobreposições (legenda, UI, watermark, contadores).
 * A visão (Gemini) é instruída a separar as duas coisas e, quando uma sobreposição
 * cobre a cena, a área ocluída é DECLARADA, nunca inventada (Article IV).
 *
 * REUSO (IDS): a visão vem de LocalTranscriber.analyzeImageWithGemini, já
 * compartilhado com o resto do ETL — nenhum cliente HTTP novo é escrito aqui.
 *
 * PRINCÍPIO: nenhum documento é reportado como pronto sem existir em disco.
 * Um pack ruim (visão falhou, gate bloqueou) nunca derruba o lote inteiro.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-model.js --niche=religioso --top=5
 *   node ... --session=2026-07-26-pet-90b1cb --ranks=1,3
 *   node ... --niche=pet --dry-run
 *   node ... --niche=pet --no-vision            (testa o fluxo sem gastar cota)
 *
 * Flags:
 *   --niche=ID        nicho em data/niches/ (obrigatório, salvo com --session)
 *   --session=ID      sessão da F1/F2; default: a mais recente do nicho na data
 *   --ranks=1,3       escolhe ranks específicos do pack
 *   --top=N           quantos packs processar                (default: 5)
 *   --date=YYYY-MM-DD data da sessão                          (default: hoje)
 *   --dry-run         mostra packs e takes encontrados, sem chamar a visão nem escrever nada
 *   --no-vision       gera os 3 documentos com placeholders explícitos, sem chamar a visão
 *   --skip-existing   pula packs já modelados no padrão atual (retomada de lote longo)
 *   --origin=X        recorta pela pasta sob benchmark/ (perfil, teste...)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// signalstats do ffmpeg: descarta frame degenerado antes de gastar visão com ele.
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
// Cascata de visão: Gemini → modelos gratuitos do OpenRouter. Ver _vision.js para
// o estado medido de cada provider e a armadilha de alucinação de sobreposições.
const Vision = require('./_vision.js');
// publicacao.md mora em módulo próprio: `farm-publication.js` gera o mesmo documento
// em lote, sem visão, e duplicar o gerador faria as duas versões divergirem.
const Pub = require('./_publication.js');
// Prompts de animação para motores I2V comerciais, usados MANUALMENTE — ver _motion.js
// para o porquê de serem em inglês e focados em movimento, não em descrição de cena.
const Motion = require('./_motion.js');

// Carrega GEMINI_API_KEY do .env da raiz do monorepo — LocalTranscriber lê de
// process.env, então isto precisa acontecer ANTES de instanciá-lo.
require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

// ---------------------------------------------------------------------------
// Constantes de composição — mantidas aqui (não no nicho) porque são regras
// de EXECUTABILIDADE do prompt, não de estética de nicho.
// ---------------------------------------------------------------------------

const NEGATIVE_BASE = [
    'texto', 'letras', 'tipografia', 'legenda', "marca d'água", 'logotipo',
    'interface', 'botões', 'rosto de pessoa real', 'anatomia distorcida',
];

// Palavras que não podem aparecer no PROMPT DE IMAGEM (só no negativo). Rede de
// segurança: a composição já não pede texto, isto pega o que escapar.
const TEXT_REQUEST_WORDS = [
    'texto', 'letra', 'letras', 'tipografia', 'legenda', 'caption',
    'palavra escrita', 'escrita', 'escrito', 'watermark', "marca d'água", 'logotipo',
];

const FALLBACK_CENA = {
    enquadramento: '[VISÃO INDISPONÍVEL]',
    sujeito: '[VISÃO INDISPONÍVEL]',
    fundo: '[VISÃO INDISPONÍVEL]',
    luz: '[VISÃO INDISPONÍVEL]',
    cor: '[VISÃO INDISPONÍVEL]',
    textura: '[VISÃO INDISPONÍVEL]',
    lente: '[VISÃO INDISPONÍVEL]',
    movimento_congelado: '[VISÃO INDISPONÍVEL]',
};

const MOTION_BY_ROLE = {
    hook: 'Câmera avança lentamente em direção ao sujeito principal, leve zoom-in contínuo, sem cortes bruscos.',
    desenvolvimento_pan: 'Câmera desliza lateralmente de forma suave, mantendo a cena viva sem distrair do sujeito.',
    desenvolvimento_breathing: 'Cena quase estática com respiração sutil de escala (zoom mínimo oscilante), como se o quadro respirasse.',
    fechamento: 'Câmera recua lentamente, abrindo o quadro para concluir a cena com espaço ao redor do sujeito.',
};

// ---------------------------------------------------------------------------
// Helpers puros — nada de I/O aqui, só transformação de dados.
// ---------------------------------------------------------------------------

function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Campos de nicho vêm de blocos YAML `>` (folded scalar), que preserva a
 * quebra de linha final. Embutido cru numa célula de tabela Markdown, isso
 * quebra a tabela. Achata para uma linha só, sem alterar o conteúdo real.
 */
function oneLine(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Seed determinística: o MESMO criativo sempre recebe a MESMA seed, entre execuções. */
function deriveSeed(sourceId) {
    const hash = crypto.createHash('sha1').update(String(sourceId || 'sem-id')).digest('hex');
    return (parseInt(hash.slice(0, 8), 16) % 900000) + 100000;
}

// Duração mínima de um take. Abaixo disso não há o que modelar: o ffmpeg não
// produz clipe confiável (~0,5s é o piso prático) e, mais importante, um plano de
// 0,3s não carrega intenção narrativa nenhuma. Cortes mais próximos que isto são
// tremidas de câmera ou flashes de edição, não planos distintos.
const MIN_TAKE_SECONDS = 1.0;

// Teto de duração por take. Vem do limite REAL dos motores de image-to-video:
// Veo aceita 4–8s, Wan gera ~5s, Hailuo/Kling ficam na mesma faixa. Pedir um take
// de 64s é pedir algo que nenhuma ferramenta — nem a automática, nem a manual do
// modo híbrido — consegue entregar.
const MAX_TAKE_SECONDS = 6.0;

/**
 * Janelas de tempo por take, a partir dos cortes REAIS detectados na F2.
 *
 * Duas regras que a versão ingênua não tinha, ambas descobertas rodando o pipeline
 * completo num criativo real de montagem rápida:
 *
 *  1. FUNDIR cortes muito próximos. Um vídeo com corte a cada 0,3s gerava takes de
 *     0,3s que a F5 não conseguia renderizar — e o criativo inteiro travava na F6.
 *  2. RESPEITAR max_takes_per_creative. Sem isso, um vídeo de montagem virava 22
 *     takes = 22 imagens + 22 vídeos, queimando cota à toa para um formato de
 *     aquecimento que precisa de 3 a 6 planos.
 */
/**
 * Descarta frames DEGENERADOS antes de gastar visão e imagem com eles.
 *
 * Vídeo que abre ou fecha em fade produz frames pretos, e a F2 os extrai como qualquer
 * outro. A visão então descreve fielmente o nada — `sujeito: "ausente", fundo: "fundo
 * sólido preto", luz: "ausente"` — e esse texto vira prompt de imagem. O gerador entrega
 * exatamente o que foi pedido: um retângulo preto. Tudo "correto" em cada etapa, e o
 * resultado é lixo garantido.
 *
 * Medido no lote real: 4 imagens quase pretas (luminância 3 a 11) num lote de 10 packs.
 *
 * A checagem é a mesma do gate de imagem (signalstats), aplicada uma etapa antes: aqui
 * ela economiza a chamada de visão E a geração; lá ela só constata o desperdício.
 */
function frameIsUsable(framePath) {
    try {
        const r = spawnSync(
            ffmpegBin(),
            ['-hide_banner', '-nostats', '-i', framePath, '-vf', 'signalstats,metadata=print', '-f', 'null', '-'],
            { encoding: 'utf8', windowsHide: true, timeout: 20000 }
        );
        const out = `${r.stderr || ''}${r.stdout || ''}`;
        const num = (k) => {
            const m = out.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.\\-]+)`));
            return m ? Number(m[1]) : null;
        };
        const yavg = num('YAVG');
        const ystd = num('YSTD');
        // Cada métrica é avaliada por si. O ffmpeg NEM SEMPRE emite as duas — nestes
        // JPGs ele devolve YAVG e omite YSTD —, e um early-return exigindo ambas
        // deixava passar frame com YAVG=1.17 (preto puro).
        //
        // ⚠️ LIMIAR DELIBERADAMENTE BAIXO (3, não 12). O nicho é noturno: um criativo
        // real de interior de carro à noite, com a frase legível em amarelo, mede
        // YAVG ≈ 6,9. Um corte em 12 descartava conteúdo legítimo — exatamente o
        // formato que se quer modelar. Aqui só cai o preto praticamente puro; cena
        // escura porém válida é julgada depois, pela descrição da visão (`cenaVazia`),
        // que é onde a diferença entre "escuro" e "vazio" realmente aparece.
        if (yavg !== null && (yavg < 3 || yavg > 250)) return false;
        if (ystd !== null && ystd < 3) return false;
        return true;
    } catch (_) {
        return true;
    }
}

/**
 * Cena VAZIA — a visão olhou e não havia o que descrever.
 *
 * Vem de frame de fade ou cartela preta: a visão devolve, corretamente, `sujeito:
 * "ausente"`, `luz: "ausente"`, `fundo: "fundo sólido preto"`. Modelar isso produz o
 * prompt "plano geral, ausente, fundo sólido preto, ausente, preto" — e o gerador
 * entrega um retângulo preto, fielmente. Cada etapa acerta e o resultado é lixo.
 *
 * A distinção é semântica, não de pixel: cena NOTURNA (interior de carro à noite, com
 * a frase legível) mede luminância tão baixa quanto uma cartela preta, mas a visão a
 * descreve com sujeito e ambiente. Por isso o julgamento mora aqui, depois da visão.
 */
function cenaVazia(cena) {
    if (!cena) return true;
    const vazio = (v) => !String(v || '').trim() || /^(ausente|nenhum[ao]?|n\/a|não aplicável|nao aplicavel|indefinid[ao])$/i.test(String(v).trim());
    const sujeitoVazio = vazio(cena.sujeito);
    const luzVazia = vazio(cena.luz);
    const fundoChapado = /^(fundo\s+)?(sólido\s+|solido\s+)?(preto|negro|branco|escuro total)$/i.test(String(cena.fundo || '').trim());
    // Sujeito ausente sozinho não basta (paisagem não tem sujeito). O que caracteriza
    // vazio é não haver sujeito E não haver luz — ou o fundo ser uma chapada lisa.
    return (sujeitoVazio && luzVazia) || (sujeitoVazio && fundoChapado);
}

function ffmpegBin() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}

function buildTakeWindows(benchmark, maxTakes = 6) {
    const totalDuration = (benchmark.video && Number(benchmark.video.duration)) || 0;
    const cuts = Array.isArray(benchmark.cuts) ? benchmark.cuts.filter((c) => typeof c === 'number') : [];

    // 1 — fusão: só vira novo take o corte que abre um plano de duração utilizável.
    const starts = [0];
    for (const c of cuts.slice().sort((a, b) => a - b)) {
        if (c - starts[starts.length - 1] >= MIN_TAKE_SECONDS && totalDuration - c >= MIN_TAKE_SECONDS) {
            starts.push(c);
        }
    }

    // 2 — teto de takes: mantém os cortes mais espaçados (planos mais substanciais)
    // e descarta os demais, preservando sempre o início.
    let kept = starts;
    if (starts.length > maxTakes) {
        const spans = starts.slice(1).map((s, i) => {
            const end = i + 2 < starts.length ? starts[i + 2] : totalDuration;
            return { start: s, span: end - s };
        });
        spans.sort((a, b) => b.span - a.span);
        const survivors = spans.slice(0, maxTakes - 1).map((x) => x.start);
        kept = [0, ...survivors].sort((a, b) => a - b);
    }

    const raw = kept.map((start, i) => {
        const end = i + 1 < kept.length ? kept[i + 1] : (totalDuration > start ? totalDuration : start);
        return { start: round2(start), end: round2(end), duration: round2(Math.max(end - start, 0)) };
    });

    // 3 — FATIAMENTO. Um vídeo de fala em close tem quase nenhum corte: 85s com 1
    // corte virava takes de 20s e 64s. Nenhum motor de image-to-video gera isso
    // (todos param entre 4 e 10s), e o modo híbrido pedia ao operador um clipe de
    // 64s que ele também não consegue produzir. Toda janela acima de MAX vira N
    // takes de duração uniforme dentro da faixa.
    const out = [];
    for (const w of raw) {
        if (w.duration <= MAX_TAKE_SECONDS) {
            out.push(w);
            continue;
        }
        const parts = Math.ceil(w.duration / MAX_TAKE_SECONDS);
        const step = w.duration / parts;
        for (let i = 0; i < parts; i++) {
            const s = w.start + step * i;
            out.push({ start: round2(s), end: round2(s + step), duration: round2(step) });
        }
    }

    // O fatiamento pode estourar o teto de takes — corta mantendo a ordem temporal.
    return out.slice(0, maxTakes);
}

function roleForIndex(i, total) {
    if (i === 0) return 'hook';
    if (i === total - 1) return 'fechamento';
    return 'desenvolvimento';
}

function labelRole(role) {
    return { hook: 'hook', desenvolvimento: 'desenvolvimento', fechamento: 'fechamento' }[role] || role;
}

/** Alterna pan-lr/breathing entre os takes de desenvolvimento — evita repetição monótona. */
function proceduralPresetFor(role, devIndex) {
    if (role === 'hook') return 'slow-push-in';
    if (role === 'fechamento') return 'slow-pull-out';
    return devIndex % 2 === 0 ? 'pan-lr' : 'breathing';
}

function motionPromptFor(role, devIndex, cena) {
    const base = role === 'hook'
        ? MOTION_BY_ROLE.hook
        : role === 'fechamento'
            ? MOTION_BY_ROLE.fechamento
            : (devIndex % 2 === 0 ? MOTION_BY_ROLE.desenvolvimento_pan : MOTION_BY_ROLE.desenvolvimento_breathing);
    const sujeito = cena.sujeito || 'sujeito principal';
    return `${base} O que NÃO muda: enquadramento geral, paleta de cor e identidade da cena (${sujeito}).`;
}

/** Parsing robusto: a visão às vezes envolve o JSON em ```json ... ``` ou adiciona texto solto ao redor. */
function parseVisionJson(raw) {
    if (!raw) return null;
    let s = String(raw).trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    try {
        return JSON.parse(s.slice(first, last + 1));
    } catch (_) {
        return null;
    }
}

function buildVisionPrompt() {
    return `Você é um analista visual de criativos verticais de vídeo curto (TikTok/Reels).

Esta imagem é um FRAME extraído do ARQUIVO DE VÍDEO original, não uma captura de tela do
aplicativo. Na prática isso significa que a interface do TikTok (botões, avatar, contadores,
barra de busca, marca d'água) quase sempre NÃO ESTÁ presente — ela é desenhada pelo app por
cima do vídeo e não fica gravada no arquivo. O que PODE estar gravado são elementos que o
próprio criador queimou na edição: legenda, texto na tela, stickers, molduras.

Sua resposta tem DUAS partes, que devem ficar SEPARADAS.

(a) INVENTARIAR sobreposições REALMENTE VISÍVEIS — tudo que não faz parte da cena filmada:
legenda queimada, texto na tela, stickers, moldura de repost, e (se por acaso aparecerem)
@handle, contadores, avatar, botão de seguir, marca d'água ou ícone de música.

⚠️ REGRA ANTI-INVENÇÃO: relate APENAS o que você consegue ver com clareza nesta imagem.
NÃO presuma que existe interface só porque é um frame de TikTok. Se a imagem for uma cena
limpa, sem nenhum texto ou elemento gráfico sobreposto, devolva "overlays": [] e
"oclusoes": []. Lista vazia é a resposta CORRETA e ESPERADA nesse caso — inventar
sobreposições inexistentes corrompe o prompt de imagem gerado a partir daqui.

(b) DESCREVER apenas a camada de CENA — o que a câmera realmente filmou — IGNORANDO tudo
listado em (a). REGRA CRÍTICA: se uma sobreposição cobre parte da cena (ex.: uma cartela de
texto cobrindo o terço inferior do quadro), você NÃO PODE inventar o que estaria atrás dela.
Declare a área como oclusão em "oclusoes" e descreva em "cena" apenas o que é visível.

Responda em JSON estrito, SEM comentários fora do JSON e SEM cercas de código, exatamente
neste formato:
{
  "overlays": [{"tipo":"legenda queimada","posicao":"centro inferior","ocupa_area_da_cena":true}],
  "texto_na_tela": "transcreva AQUI, literalmente, toda frase legível queimada no quadro",
  "oclusoes": ["cartela de texto cobre o terço inferior — conteúdo atrás NÃO observável"],
  "cena": {
    "enquadramento":"...", "sujeito":"...", "fundo":"...", "luz":"...",
    "cor":"...", "textura":"...", "lente":"...", "movimento_congelado":"..."
  }
}

Sobre "texto_na_tela": este campo é o CONTEÚDO da frase, não a descrição dela. Se o quadro
traz "Deus está no controle", escreva exatamente isso — transcrever, não resumir nem
traduzir. É esta frase que dá a estrutura da mensagem a ser modelada depois; sem ela, só
sobra saber que "havia um texto", o que não permite modelar nada.
Se não houver NENHUMA letra legível, devolva "" (string vazia). Não invente frase e não
descreva a tipografia aqui.

Se não houver sobreposições visíveis, "overlays" e "oclusoes" podem ser arrays vazios — mas
NUNCA omita os dois campos.`;
}

async function analyzeFrame(transcriber, framePath, noVision) {
    if (noVision) return { ok: false, skipped: true };
    const prompt = buildVisionPrompt();
    let lastReason = 'sem resposta da visão';

    // Cascata de visão: Gemini primeiro, depois os modelos GRATUITOS do OpenRouter.
    // Cota do Gemini estourada deixou de travar a F3 — antes ela degradava o pack
    // inteiro para placeholders, que é o pior desfecho possível para a modelagem.
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const r = await Vision.analyze({
                imagePath: framePath,
                prompt,
                transcriber,
                // Na 2ª tentativa pula o Gemini: se ele falhou uma vez, quase sempre
                // é cota, e insistir só custa tempo.
                skipGemini: attempt > 1,
            });
            if (!r.ok) { lastReason = r.reason || 'visão indisponível'; continue; }

            const parsed = parseVisionJson(r.text);
            if (parsed) return { ok: true, data: parsed, provider: r.provider };
            lastReason = `visão (${r.provider}) não retornou JSON válido`;
        } catch (e) {
            lastReason = e.message;
        }
    }
    return { ok: false, skipped: false, reason: lastReason };
}

/** Extrai o texto de transcrição REAL de audio-description.md — nunca inventa fala. */
function extractTranscriptionText(mdContent) {
    if (!mdContent) return '';
    const m = mdContent.match(/##+\s*(Tradução \/ conteúdo da letra|Transcrição integral)\s*\n+([\s\S]*)/i);
    if (!m) return '';
    let body = m[2].trim();
    const nextHeader = body.search(/\n##+\s/);
    if (nextHeader !== -1) body = body.slice(0, nextHeader).trim();
    if (/^_.*_$/.test(body) || /Transcrição indisponível|Não obtida nesta rodada/i.test(body)) return '';
    return body;
}

/** Divide a transcrição REAL em N pedaços — rascunho para revisão do dono, nunca invenção. */
function splitTranscriptionAcrossTakes(text, n) {
    const clean = String(text || '').trim();
    if (!clean) return Array(n).fill('[SEM TRANSCRIÇÃO — revisar manualmente em audio-description.md]');
    const words = clean.split(/\s+/);
    const perTake = Math.max(1, Math.ceil(words.length / n));
    const chunks = [];
    for (let i = 0; i < n; i++) {
        const chunk = words.slice(i * perTake, (i + 1) * perTake).join(' ');
        chunks.push(chunk || '[trecho vazio — revisar]');
    }
    return chunks;
}

function buildAudioInfo(pack, niche) {
    const audio = (pack.benchmark && pack.benchmark.audio) || {};
    const kindLabel = audio.kind === 'music' ? 'Música / trilha'
        : audio.kind === 'original_speech' ? 'Fala original'
            : 'Indeterminado';
    return {
        kind: audio.kind || 'indeterminado',
        kindLabel,
        treatment: oneLine(niche.modeling && niche.modeling.audio_treatment) || '(não definido no nicho — preserva original por padrão)',
    };
}

function composeImagePrompt(cena, visualStyleSuffix, opts = {}) {
    const partes = [cena.enquadramento, cena.sujeito, cena.fundo, cena.luz, cena.cor, cena.textura, cena.lente]
        .filter(Boolean);
    const temCena = partes.length > 0 && !opts.visionFailed;

    let prompt = `${partes.join(', ')}. Vertical 9:16, sem bordas, sem molduras.`;

    const acabamento = oneLine(opts.grading);
    if (temCena && acabamento) {
        prompt += ` Acabamento: ${acabamento.replace(/\.$/, '')}.`;
    } else if (!temCena && visualStyleSuffix) {
        prompt += ` ${String(visualStyleSuffix).trim()}`;
    }
    return prompt;
}

function composeNegativePrompt(niche) {
    const extra = (niche.modeling && niche.modeling.avoid_in_prompt) || [];
    return [...new Set([...NEGATIVE_BASE, ...extra])].join(', ');
}

/**
 * Query de busca em banco de imagens, para o fallback de acervo da F4 (Pexels).
 *
 * Usa SUJEITO + FUNDO + LUZ, nessa ordem, e ignora o resto da cena. Enquadramento,
 * lente e textura descrevem COMO a foto foi feita — não ajudam a achar uma foto que
 * mostre a mesma coisa, e cada termo a mais estreita o resultado da busca até zero.
 * Fica no modeling.json para ser auditável: dá para ler o que foi buscado sem
 * reconstruir a derivação, e para corrigir à mão quando a busca errar o alvo.
 */
function buildStockQuery(cena) {
    const base = [cena.sujeito, cena.fundo, cena.luz].filter(Boolean).join(', ');
    if (!base.trim()) return null;
    try {
        // Reusa a derivação do próprio adapter — a regra de limpeza mora onde a busca
        // acontece, e duplicá-la aqui faria as duas versões divergirem com o tempo.
        return require('./adapters/image/pexels.js').deriveQuery(base);
    } catch (_) {
        return base.split(/[,.]/)[0].trim() || null;
    }
}

// Marcadores de NEGAÇÃO. "sem letras" e "nenhum texto" são proibições, não pedidos —
// tratá-los como violação fazia o saneador reprovar o próprio resultado que acabara
// de produzir, e o prompt saía marcado como contaminado sem estar.
const NEGATION_MARKERS = ['sem', 'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'não', 'nao', 'livre de', 'ausência de', 'ausencia de'];

/**
 * Detecta PEDIDOS de texto no prompt de imagem, ignorando negações.
 * A janela de 24 caracteres antes da ocorrência cobre "sem X", "nenhum X" e
 * "livre de X" sem alcançar a oração anterior.
 */
function findTextRequestHits(promptText) {
    const lower = String(promptText || '').toLowerCase();
    const hits = [];

    for (const word of TEXT_REQUEST_WORDS) {
        let from = 0;
        while (true) {
            const idx = lower.indexOf(word, from);
            if (idx === -1) break;
            from = idx + word.length;

            // Só conta ocorrência como palavra inteira.
            const prevCh = idx > 0 ? lower[idx - 1] : ' ';
            const nextCh = lower[idx + word.length] || ' ';
            if (/[a-zà-ú]/.test(prevCh) || /[a-zà-ú]/.test(nextCh)) continue;

            const window = lower.slice(Math.max(0, idx - 24), idx);
            const negated = NEGATION_MARKERS.some((n) => new RegExp(`\\b${n}\\b[^,.;]{0,12}$`).test(window));
            if (!negated) {
                hits.push(word);
                break; // uma ocorrência não-negada já basta para sinalizar a palavra
            }
        }
    }
    return [...new Set(hits)];
}

/**
 * Saneia o prompt de imagem removendo referências a texto renderizado.
 *
 * POR QUE ISTO EXISTE: a visão descreve a cena com fidelidade — e cenas reais têm
 * placas, faixas, logos e legendas. Essa descrição fiel, colocada crua no prompt,
 * faz o modelo de imagem TENTAR desenhar texto — e modelo de imagem erra tipografia
 * de forma escancarada. Detectar e só avisar não bastava: a F4 seguia gerando com o
 * prompt contaminado.
 *
 * A solução não é apagar o elemento visual (isso mutila a composição), e sim
 * reescrevê-lo como FORMA GRÁFICA SEM TEXTO LEGÍVEL. A placa continua na cena; ela
 * só deixa de ter letras.
 */
const TEXT_REWRITES = [
    // ordem importa: expressões compostas antes das palavras soltas
    [/\bcom (?:o )?(?:texto|a palavra|as palavras|a frase|os dizeres)[^,.;]*/gi, 'sem texto legível'],
    [/\b(?:com|exibindo|contendo|mostrando) (?:um |uma |o |a )?(?:logotipo|logomarca|marca d'água|watermark)[^,.;]*/gi, 'com marca gráfica abstrata, sem letras'],
    [/\b(?:legenda|caption)s? queimadas?[^,.;]*/gi, 'sem legenda'],
    [/\b(?:placas?|faixas?|banners?|cartazes?|letreiros?) (?:com|de) (?:texto|letras|dizeres|publicidade)[^,.;]*/gi, 'placas com superfícies de cor sólida, sem letras'],
    [/\btipografia[^,.;]*/gi, 'formas gráficas sem letras'],
    [/\b(?:palavra escrita|escrita|texto escrito|texto)\b/gi, 'grafismo sem letras'],
    [/\b(?:letras|letra)\b/gi, 'formas abstratas'],
    [/\b(?:logotipos?|logomarcas?)\b/gi, 'emblema abstrato sem letras'],
    [/\b(?:marca d'água|watermark)\b/gi, 'superfície limpa'],
    [/\b(?:legenda|caption)s?\b/gi, 'sem legenda'],
];

// Sufixo negativo. Ele CONTÉM as palavras proibidas de propósito ("nenhum texto",
// "nenhuma letra") — são instruções de ausência, não pedidos. Por isso a checagem
// de resíduo roda no corpo, antes de anexá-lo.
const NO_TEXT_REINFORCEMENT =
    'Nenhum texto legível, nenhuma letra, nenhum símbolo tipográfico em parte alguma da imagem';

function sanitizeImagePrompt(promptText) {
    const original = String(promptText || '');
    const before = findTextRequestHits(original);
    if (before.length === 0) {
        return { prompt: original, sanitized: false, removed: [], residual: [] };
    }

    // Substituição com TOKENS: sem isto, o resultado de uma regra é reprocessado
    // pela regra seguinte e vira lixo ("sem letras" → "sem formas abstratas",
    // "com legenda queimada" → "com sem sem legenda").
    const slots = [];
    let body = original;
    for (const [re, replacement] of TEXT_REWRITES) {
        body = body.replace(re, () => {
            slots.push(replacement);
            return `«SLOT${slots.length - 1}»`;
        });
    }
    body = body.replace(/«SLOT(\d+)»/g, (_, i) => slots[Number(i)]);

    // Limpa as costuras que a reescrita deixa: preposição órfã e duplicação.
    body = body
        .replace(/\b(com|de|em|exibindo|contendo|mostrando)\s+sem\b/gi, 'sem')
        .replace(/\bsem\s+sem\b/gi, 'sem')
        .replace(/,\s*,/g, ',')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;])/g, '$1')
        .trim();

    // Resíduo é medido NO CORPO — o sufixo negativo não conta como pedido de texto.
    const residual = findTextRequestHits(body);

    const prompt = `${body.replace(/[\s.]+$/, '')}. ${NO_TEXT_REINFORCEMENT}`;
    return { prompt, sanitized: true, removed: before, residual };
}

function checkBlockedTerms(text, blockedTerms) {
    const lower = String(text || '').toLowerCase();
    return (blockedTerms || []).filter((term) => lower.includes(String(term).toLowerCase()));
}

function transitionLabel(t) {
    return { cut: 'corte seco', soft: 'transição suave', fade: 'fade' }[t] || t;
}

function describeSceneShort(cena) {
    const parts = [cena.sujeito, cena.fundo].filter((p) => p && p !== '[VISÃO INDISPONÍVEL]');
    if (parts.length) return parts.join(' — ');
    return cena.sujeito === '[VISÃO INDISPONÍVEL]' ? '[VISÃO INDISPONÍVEL]' : '(sem descrição de cena)';
}

function describeStructure(b) {
    const n = b.take_count || (b.cuts ? b.cuts.length + 1 : null);
    if (n === 1) return 'take único, sem cortes';
    if (n && n <= 3) return `poucos cortes (${n} takes)`;
    if (n) return `montagem com ${n} takes`;
    return 'não determinado (sem contagem de cortes no benchmark.json)';
}

/** Leitura de gatilho SEMPRE ancorada nas reasons reais do benchmark — nunca um rótulo inventado. */
function inferStepps(b) {
    const reasons = (b.modelability && b.modelability.reasons) || [];
    const text = reasons.join(', ');
    if (/trilha musical|música/i.test(text)) return `Emotion — a trilha carrega a carga emocional (sinal: "${text}")`;
    if (/fala original/i.test(text)) return `Practical Value — a fala original entrega informação direta (sinal: "${text}")`;
    if (/take único|cena estática/i.test(text)) return `Simplicity — poucos cortes concentram a atenção num único gesto (sinal: "${text}")`;
    return `Não inferido automaticamente a partir dos sinais disponíveis (${text || 'sem sinais registrados'}) — revisar manualmente.`;
}

/** Agrega overlays únicos (tipo+posição) entre os takes, para o cabeçalho de prompts-imagem.md. */
function aggregateOverlays(visionByTake) {
    const seen = new Map();
    for (const v of visionByTake) {
        for (const o of (v && v.overlays) || []) {
            const key = `${o.tipo || '?'}|${o.posicao || '?'}`;
            if (!seen.has(key)) seen.set(key, o);
        }
    }
    return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Montagem dos documentos
// ---------------------------------------------------------------------------

function buildPlanoCriativoMd(ctx) {
    const { pack, niche, session, takes, audioInfo, guardrails, totalDuration } = ctx;
    const b = pack.benchmark;
    const views = (b.metrics && b.metrics.views) || 0;
    const engajamento = ((b.engagement || 0) * 100).toFixed(1);

    let md = `# Plano de Criativo Modelado · ${pack.handle} · rank ${pack.rank}\n\n`;
    md += `**Benchmark de origem:** ${pack.url || '(sem URL registrada)'}\n`;
    md += `**Nicho:** ${niche.icon} ${niche.label} · **Sessão:** \`${session.id}\`\n`;
    md += `**Duração alvo:** ${totalDuration}s · **Takes:** ${takes.length} · **Formato:** 9:16\n\n---\n\n`;

    md += `## 1. Por que este criativo performou\n\n`;
    md += `| Sinal | Leitura |\n|:---|:---|\n`;
    md += `| Viral Score | ${b.viral_score ?? '—'} (${L.fmtNumber(views)} views · ${engajamento}% engaj.) |\n`;
    md += `| Modelabilidade | ${b.modelability ? b.modelability.score : '—'} — ${(b.modelability && b.modelability.reasons || []).join(', ') || 'sem sinais registrados'} |\n`;
    md += `| Gatilho (STEPPS) | ${inferStepps(b)} |\n`;
    md += `| Estrutura | ${describeStructure(b)} |\n\n`;
    md += `**Âncoras:** cada afirmação acima aponta para um campo de \`benchmark.json\` ou um trecho de \`audio-description.md\`. Nada aqui é impressão.\n\n---\n\n`;

    md += `## 2. O que se preserva e o que se troca\n\n`;
    md += `> Modelagem é reproduzir a **estrutura** que fez performar e trocar o **conteúdo específico**.\n\n`;
    md += `| Preservar (estrutura) | Trocar (conteúdo) |\n|:---|:---|\n`;
    md += `| Ritmo e duração dos takes | Sujeito em cena |\n`;
    md += `| Enquadramento e direção de luz | Cenário específico |\n`;
    md += `| Progressão emocional | Falas e frases literais |\n`;
    md += `| Tratamento do áudio | Texto na tela |\n`;
    md += `| Gatilho de retenção | Identidade visível |\n\n---\n\n`;

    md += `## 3. Estrutura take a take\n\n`;
    for (const t of takes) {
        md += `### Take ${t.n} — ${labelRole(t.role)}\n\n`;
        md += `| Campo | Valor |\n|:---|:---|\n`;
        md += `| Entrada → saída | ${t.window.start}s → ${t.window.end}s (${t.duration}s) |\n`;
        md += `| O que aparece | ${describeSceneShort(t.cena)} |\n`;
        md += `| Texto na tela | \`${t.on_screen_text}\` — entra no video-studio, **não** na imagem |\n`;
        md += `| Movimento | ${t.procedural_preset} |\n`;
        md += `| Transição para o próximo | ${transitionLabel(t.transition_out)} |\n`;
        md += `| Frame de referência | \`screenshots/${t.source_frame || '(ausente)'}\` |\n\n`;
        if ((t.occlusions || []).length) {
            md += `> ⚠️ Oclusões declaradas neste frame: ${t.occlusions.join('; ')}\n\n`;
        }
    }
    md += `---\n\n`;

    md += `## 4. Áudio\n\n`;
    md += `| Campo | Valor |\n|:---|:---|\n`;
    md += `| Tipo | ${audioInfo.kindLabel} |\n`;
    md += `| Tratamento | ${audioInfo.treatment} |\n`;
    md += `| Fonte | \`audio.mp3\` do pack |\n`;
    md += `| Duração | ${totalDuration}s — **manda na duração total do criativo** |\n\n`;
    md += `> Se a soma dos takes não cobre o áudio, o **último take é estendido**. O áudio nunca é cortado.\n\n---\n\n`;

    md += `## 5. Legendas\n\n`;
    md += `| Campo | Valor |\n|:---|:---|\n`;
    md += `| Estilo | \`${(niche.modeling && niche.modeling.caption_style) || '(não definido no nicho)'}\` |\n`;
    md += `| Fonte do texto | transcrição de \`audio-description.md\` |\n`;
    md += `| Queimada | sim, sempre — vertical é consumido sem som |\n\n---\n\n`;

    md += `## 6. Gate de guardrails do nicho\n\n`;
    md += `| Regra do nicho | Status |\n|:---|:---:|\n`;
    for (const rule of (niche.guardrails && niche.guardrails.rules) || []) {
        md += `| ${oneLine(rule)} | ⚠️ revisão humana |\n`;
    }
    md += `\n**Termos bloqueados verificados:** ${(niche.guardrails && niche.guardrails.blocked_terms || []).join(', ') || '(nenhum termo configurado)'}\n`;
    md += `**Veredito:** \`${guardrails.passed ? 'APROVADO' : `REPROVADO — ${guardrails.violations.join('; ')}`}\`\n\n`;

    if (niche.id === 'noticias') {
        md += `### ⚠️ Gate de fidelidade factual (TERMINAL)\n\n`;
        md += `| Afirmação no plano | Âncora na transcrição |\n|:---|:---|\n`;
        md += `| _preencher manualmente, afirmação a afirmação_ | \`"trecho literal de audio-description.md"\` |\n\n`;
        md += `Afirmação sem âncora **reprova o criativo**. Este gate não é degradado nem contornado pelo modo automatizado.\n\n`;
    }

    md += `---\n\n## 7. Handoff\n\n`;
    md += `- \`prompts-imagem.md\` → **@farming-imager** (F4)\n`;
    md += `- \`prompts-animacao.md\` → **@farming-animator** (F5)\n`;
    md += `- este documento → **@farming-producer** (F6)\n`;
    return md;
}

function buildPromptsImagemMd(ctx) {
    const { pack, niche, takes, seed, overlayRows, occlusionsText, overlaysVerified } = ctx;

    let md = `# Prompts de Imagem · ${pack.handle} · rank ${pack.rank}\n\n`;
    md += `**Criativo modelado:** ${pack.url || '(sem URL registrada)'}\n`;
    md += `**Nicho:** ${niche.label} · **Takes:** ${takes.length} · **Formato:** 9:16 (1080×1920)\n`;
    md += `**Seed travada:** \`${seed}\` — a mesma em todos os takes, para que pareçam o mesmo mundo.\n\n---\n\n`;

    md += `## 🧹 Camadas descartadas antes da tradução\n\n`;
    md += `> Um screenshot do TikTok não é a imagem: é a imagem **mais** sobreposições. Traduzir\n`;
    md += `> tudo junto faz o prompt pedir legenda, watermark e botão de curtir dentro da arte.\n`;
    md += `> Esta seção declara o que foi ignorado — ela existe para você **auditar** a tradução.\n\n`;
    md += `| Camada encontrada | Onde | Descartada? |\n|:---|:---|:---:|\n`;
    for (const row of overlayRows) {
        md += `| ${row.tipo} | ${row.posicao} | ${overlaysVerified ? '✅' : '⚠️ não verificado (visão indisponível)'} |\n`;
    }
    md += `\n**Oclusões registradas:** ${occlusionsText}\n`;
    md += `> Quando uma sobreposição cobre parte da cena, o que está atrás **não é inventado**.\n`;
    md += `> A área ocluída é declarada aqui e o prompt descreve apenas o que estava visível.\n\n---\n\n`;

    for (const t of takes) {
        md += `## Take ${t.n} — ${labelRole(t.role)}\n\n`;
        md += `### Tradução da cena ("para até cego ver")\n\n`;
        md += `> Descrição literal da **camada de cena apenas**, sem nenhuma sobreposição.\n\n`;
        md += `| Dimensão | Descrição |\n|:---|:---|\n`;
        md += `| Enquadramento | ${t.cena.enquadramento} |\n`;
        md += `| Sujeito | ${t.cena.sujeito} |\n`;
        md += `| Fundo | ${t.cena.fundo} |\n`;
        md += `| Luz | ${t.cena.luz} |\n`;
        md += `| Cor | ${t.cena.cor} |\n`;
        md += `| Textura | ${t.cena.textura} |\n`;
        md += `| Lente | ${t.cena.lente} |\n`;
        md += `| Movimento congelado | ${t.cena.movimento_congelado} |\n\n`;
        md += `### Prompt final\n\n\`\`\`text\n${t.image_prompt}\n\`\`\`\n\n`;
        md += `**Negativos:**\n\`\`\`text\n${t.negative_prompt}\n\`\`\`\n\n`;
        md += `**Referência visual:** \`screenshots/${t.source_frame || '(ausente)'}\` — enviar junto ao prompt em providers com \`supports_reference_image: true\`. Nesses casos a referência vale mais que o texto.\n\n`;
        if (t.text_request_hits && t.text_request_hits.length) {
            md += `> ⚠️ **Revisar:** o prompt acima contém termo(s) que podem pedir texto na imagem: ${t.text_request_hits.join(', ')}.\n\n`;
        }
        md += `---\n\n`;
    }

    md += `## Regras que este documento obedece\n\n`;
    md += `1. **Nenhum prompt pede texto na imagem.** Todo texto entra na F6, no video-studio, onde é vetorial, corrigível e animável. Modelo de imagem erra tipografia.\n`;
    md += `2. **Nenhum prompt pede rosto de pessoa real** ou identificável.\n`;
    md += `3. **Seed travada** entre os takes do mesmo criativo — sem isso o criativo montado parece uma colagem de três vídeos diferentes.\n`;
    md += `4. **Sufixo de estilo do nicho** (\`modeling.visual_style\`) aplicado em todos os takes.\n`;
    md += `5. **\`avoid_in_prompt\` do nicho** respeitado antes de qualquer chamada de API.\n`;
    return md;
}

function buildPromptsAnimacaoMd(ctx) {
    const { pack, niche, takes } = ctx;

    // A sequência é planejada para o CRIATIVO INTEIRO antes de escrever qualquer prompt.
    // Take pensado isoladamente foi a causa do push-in seguido de pull-out (sanfona).
    const sequence = Motion.planCameraSequence(takes);
    const continuity = Motion.continuityAnchor(takes);
    const notes = Motion.directionNotes(takes, sequence);

    let md = `# Animation Prompts · @${pack.handle} · rank ${pack.rank}\n\n`;
    md += `**Nicho:** ${niche.label} · **Takes:** ${takes.length} · **Formato:** 9:16 vertical\n\n`;
    md += `> **Uso manual.** O motor automático de vídeo está fora do pipeline — estes prompts são\n`;
    md += `> para colar à mão em Hailuo/MiniMax, BytePlus/Seedance, Kling, Symphony (TikTok) ou\n`;
    md += `> RunningHub. Depois de gerar, salve em \`takes/take-N.mp4\` e siga para a montagem (F6).\n\n`;

    md += `## ⚠️ Antes de gerar\n\n`;
    md += `1. **Desligue a geração de áudio** no motor (ou ignore o áudio que vier). A trilha do\n`;
    md += `   criativo é o \`audio.mp3\` do benchmark; áudio gerado colide na montagem — num teste\n`;
    md += `   real o motor inventou uma sirene de ambulância.\n`;
    md += `2. **Envie a imagem** \`images/take-N.png\` como entrada (image-to-video), nunca text-to-video.\n`;
    md += `3. **Cole o negative prompt** quando o motor tiver o campo. É ele que segura morphing e\n`;
    md += `   objeto avançando para cima da câmera.\n\n`;

    md += `---\n\n## Direção do criativo\n\n`;
    md += `A sequência de câmera é planejada para o conjunto, não take a take. Duas regras:\n\n`;
    md += `- **Não reverter.** Entrada (push-in) seguida de abertura (pull-out) é sanfona: o olho é\n`;
    md += `  puxado para dentro e imediatamente empurrado para fora. Num criativo de 2 takes curtos,\n`;
    md += `  isso é a coisa mais visível do vídeo.\n`;
    md += `- **O último assenta.** A frase na tela é o conteúdo; movimento no fechamento disputa com\n`;
    md += `  a leitura.\n\n`;
    md += `| Take | Movimento | Papel na sequência |\n|---:|:---|:---|\n`;
    for (const n of notes) {
        md += `| ${n.take} | **${n.label}** | ${n.why} |\n`;
    }
    md += `\n**Âncora de continuidade** (repetida a partir do 2º take, é o que faz os takes conversarem):\n\n`;
    md += '```text\n' + continuity + '\n```\n\n---\n\n';

    for (let i = 0; i < takes.length; i++) {
        const t = takes[i];
        const m = Motion.buildMotionPrompt(t, { move: sequence[i], index: i, total: takes.length, continuity });

        md += `## Take ${t.n} — ${labelRole(t.role)} · ${m.camera.label}\n\n`;
        md += `| Campo | Valor |\n|:---|:---|\n`;
        md += `| Imagem de entrada | \`images/take-${t.n}.png\` |\n`;
        md += `| Salvar resultado em | \`takes/take-${t.n}.mp4\` |\n`;
        md += `| Duração alvo | ${m.seconds}s |\n`;
        md += `| Movimento de câmera | ${m.camera.label} — ${m.camera.why} |\n`;
        md += `| Movimento detectado na cena | ${m.ambient.join(' · ')} |\n`;
        if (m.hasRisky) {
            md += `| ⚠️ Risco | a cena tem objeto que pode avançar; o prompt fixa a distância explicitamente |\n`;
        }
        md += `\n`;

        for (const eng of Motion.ENGINES) {
            md += `### ${eng.label}${eng.url ? ` — ${eng.url}` : ''}\n\n`;
            md += `${eng.note}\n\n`;
            md += '```text\n' + eng.format(m) + '\n```\n\n';
            if (eng.negativeSupported) {
                md += `**Negative prompt:**\n\n` + '```text\n' + m.negative + '\n```\n\n';
            } else {
                md += `_Sem campo de negativo — as restrições já estão no corpo do prompt._\n\n`;
            }
        }
        md += `---\n\n`;
    }

    md += `## O que rejeitar e regerar\n\n`;
    md += `| Sintoma | Causa provável |\n|:---|:---|\n`;
    md += `| Veículo/pessoa vem para cima da câmera | negative prompt não colado, ou a imagem tem objeto frontal — reforce "nothing moves toward the camera" |\n`;
    md += `| Vídeo veio com sirene, fala ou música | geração de áudio ligada no motor |\n`;
    md += `| A cena "vira" outra coisa no meio | pediu-se movimento que a imagem não sustenta; reduza ao ambiente |\n`;
    md += `| Os dois takes parecem de vídeos diferentes | âncora de continuidade não foi colada no 2º em diante |\n`;
    md += `| Arquitetura deformando | câmera rápida demais; troque pelo comando estático |\n`;
    md += `| Cor muda ao longo do take | modelo reinterpretando a paleta; reforce "keep original colors" |\n\n`;

    md += `## Regras que este documento obedece\n\n`;
    md += `1. **A sequência é planejada junto**, nunca take a take.\n`;
    md += `2. **Movimento serve ao beat**, não ao efeito. Take frenético mata retenção.\n`;
    md += `3. **A imagem manda.** O prompt nunca pede elemento que não está nela.\n`;
    md += `4. **Sem pista de movimento na cena**, o certo é deixar quase parado — inventar movimento é\n`;
    md += `   o caminho mais curto para o modelo alucinar elemento novo.\n`;
    md += `5. **O áudio é do benchmark**, nunca do motor de vídeo.\n`;
    return md;
}

// ---------------------------------------------------------------------------
// Processamento de um pack
// ---------------------------------------------------------------------------

async function processPack(pack, ctx) {
    const { niche, session, args, transcriberFactory } = ctx;
    const paths = P.packPaths(pack.dir);
    const b = pack.benchmark;

    console.log(`\n[${pack.rank}] @${pack.handle} — ${pack.url || '(sem URL)'}`);

    // --- Gate terminal: nicho notícias sem transcrição não avança ---
    if (niche.id === 'noticias' && !(b.audio && b.audio.transcribed)) {
        const reason = 'GATE TERMINAL: nicho notícias exige transcrição. Sem ela, toda afirmação factual do plano seria invenção.';
        console.log(`    🚫 BLOQUEADO — ${reason}`);
        if (!args['dry-run']) {
            P.appendDegraded(session, { phase: 'F3', label: `[${pack.rank}] @${pack.handle}`, status: 'blocked', issues: [reason] });
            fs.mkdirSync(pack.dir, { recursive: true });
            fs.writeFileSync(paths.modelingJson, JSON.stringify({
                rank: pack.rank, handle: pack.handle, niche: niche.id,
                seed: null, total_duration: null, audio: b.audio || null,
                caption_style: (niche.modeling && niche.modeling.caption_style) || null,
                takes: [], guardrails: { passed: false, violations: [reason] },
                blocked: true, block_reason: reason,
            }, null, 2));
        }
        return { rank: pack.rank, handle: pack.handle, status: 'blocked', reason };
    }

    // O teto vem de config/scoring-weights.yaml → session_limits, via loadNiche.
    const maxTakes = (niche.sessionLimits && niche.sessionLimits.max_takes_per_creative) || 6;
    let windows = buildTakeWindows(b, maxTakes);
    if (windows.length === 0) {
        console.log(`    ⚠️ nenhum take detectável (benchmark.json sem cortes nem duração) — pulando`);
        return { rank: pack.rank, handle: pack.handle, status: 'degraded', reason: 'sem janelas de take' };
    }

    // TETO PELO NÚMERO DE FRAMES EM DISCO.
    //
    // As janelas saem dos CORTES detectados na F2, mas os frames extraídos têm teto
    // próprio (12 marcações). Quando há mais janelas que frames, os takes excedentes
    // nascem sem `source_frame` — e um take sem frame não é modelável: a visão não tem
    // o que olhar, a cena vira `[VISÃO INDISPONÍVEL]` e esse texto acaba virando prompt
    // de imagem. Medido no lote real: 7 takes assim num único lote de 10 packs, e uma
    // das imagens geradas foi uma tabela optométrica (o gerador leu "visão" como
    // eyesight). Cortar aqui é o único ponto em que isso custa zero.
    // Frames degenerados (preto de fade, estourado, chapado) saem antes da contagem:
    // eles não descrevem cena e só produziriam prompt vazio → imagem preta.
    const usableFrames = pack.frames.filter((f) => frameIsUsable(path.join(pack.framesDir, f)));
    const descartados = pack.frames.length - usableFrames.length;
    if (descartados > 0) {
        console.log(`    🗑️  ${descartados} frame(s) degenerado(s) descartado(s) (preto/chapado — não descrevem cena).`);
    }
    // A partir daqui o pack usa só os frames aproveitáveis.
    pack.frames = usableFrames;

    if (windows.length > pack.frames.length) {
        console.log(`    ✂️  ${windows.length} janela(s) mas ${pack.frames.length} frame(s) aproveitável(is) — truncando.`);
        windows = windows.slice(0, pack.frames.length);
    }
    if (windows.length === 0) {
        console.log(`    ⚠️ nenhum frame aproveitável — pulando`);
        return { rank: pack.rank, handle: pack.handle, status: 'degraded', reason: 'sem frames aproveitáveis para modelar' };
    }

    if (args['dry-run']) {
        console.log(`    · ${pack.frames.length} frame(s) em disco · ${windows.length} take(s) esperado(s)`);
        windows.forEach((w, i) => console.log(`      take ${i + 1} (${roleForIndex(i, windows.length)}): ${w.start}s → ${w.end}s (${w.duration}s)`));
        return { rank: pack.rank, handle: pack.handle, status: 'dry-run' };
    }

    const noVision = !!args['no-vision'];
    const transcriber = noVision ? null : transcriberFactory();
    const seed = deriveSeed((b.source && b.source.id) || pack.url || pack.handle);
    const totalDuration = (b.video && b.video.duration) || windows[windows.length - 1].end;
    const audioInfo = buildAudioInfo(pack, niche);

    // --- Transcrição real, para o rascunho de texto na tela ---
    let transcriptionText = '';
    try {
        if (fs.existsSync(paths.audioDescription)) {
            transcriptionText = extractTranscriptionText(fs.readFileSync(paths.audioDescription, 'utf8'));
        }
    } catch (_) { /* segue sem transcrição — vira placeholder */ }
    const onScreenChunks = splitTranscriptionAcrossTakes(transcriptionText, windows.length);

    // --- Passo 1: visão por frame (descarte de camadas) ---
    const visionByTake = [];
    const degradedTakes = [];
    for (let i = 0; i < windows.length; i++) {
        const frame = pack.frames[i] || null;
        if (!frame) {
            visionByTake.push(null);
            degradedTakes.push(`take ${i + 1}: sem frame de referência em disco`);
            continue;
        }
        const framePath = path.join(pack.framesDir, frame);
        const result = await analyzeFrame(transcriber, framePath, noVision);
        if (result.ok) {
            visionByTake.push(result.data);
            console.log(`    ✓ take ${i + 1}: visão traduziu a cena (${frame})`);
        } else if (result.skipped) {
            visionByTake.push(null);
            console.log(`    · take ${i + 1}: visão pulada (--no-vision)`);
        } else {
            visionByTake.push(null);
            degradedTakes.push(`take ${i + 1}: visão falhou após retry — ${result.reason}`);
            console.log(`    ⚠️ take ${i + 1}: visão falhou — ${result.reason}`);
        }
    }

    // --- Passo 2: montar os takes ---
    const visualStyleSuffix = oneLine(niche.modeling && niche.modeling.visual_style);
    const negativePrompt = composeNegativePrompt(niche);
    const takes = [];
    let devIndex = 0;
    for (let i = 0; i < windows.length; i++) {
        const role = roleForIndex(i, windows.length);
        if (role === 'desenvolvimento') devIndex++;
        const vision = visionByTake[i];
        const cena = { ...FALLBACK_CENA, ...((vision && vision.cena) || {}) };
        const overlaysDiscarded = (vision && vision.overlays || []).map((o) => `${o.tipo || '?'} (${o.posicao || '?'})`);
        const occlusions = (vision && vision.oclusoes) || (visionByTake[i] === null ? ['[VISÃO INDISPONÍVEL]'] : []);
        // A FRASE que estava queimada no quadro do original. O overlay era descartado
        // corretamente do prompt de imagem (a imagem tem de sair limpa), mas o TEXTO em
        // si era jogado fora junto — e ele é metade da mensagem do criativo. Guardá-lo
        // permite modelar a estrutura da frase na montagem, em vez de só saber que
        // "havia um texto ali".
        const originalOnScreen = String((vision && vision.texto_na_tela) || '').trim();
        // Cena vazia = frame de fade/cartela. Marca o take para a F4 não gerar imagem
        // de nada — sem isto o prompt vira "ausente, fundo sólido preto" e o gerador
        // devolve um retângulo preto, gastando cota para produzir refugo.
        const cenaEstaVazia = vision && cenaVazia(cena);
        if (cenaEstaVazia) console.log(`    ⛔ take ${i + 1}: cena vazia (frame de fade/cartela) — não será gerada imagem`);

        // Saneia ANTES de gravar: a F4 nunca deve receber um prompt que peça texto.
        // Detectar e apenas avisar deixava o prompt contaminado seguir para a geração.
        const rawImagePrompt = composeImagePrompt(cena, visualStyleSuffix, {
            grading: niche.modeling && niche.modeling.visual_grading,
            visionFailed: visionByTake[i] === null,
        });
        const san = sanitizeImagePrompt(rawImagePrompt);
        const imagePrompt = san.prompt;
        const textHits = san.residual || [];
        const preset = proceduralPresetFor(role, devIndex);
        const motionPrompt = motionPromptFor(role, devIndex, cena);

        takes.push({
            n: i + 1,
            role,
            window: windows[i],
            duration: windows[i].duration,
            source_frame: pack.frames[i] || null,
            cena,
            image_prompt: imagePrompt,
            stock_query: buildStockQuery(cena),
            original_on_screen_text: originalOnScreen,
            blocked_reason: cenaEstaVazia ? 'cena vazia (frame de fade/cartela) — nada a gerar' : null,
            negative_prompt: negativePrompt,
            motion_prompt: motionPrompt,
            procedural_preset: preset,
            on_screen_text: onScreenChunks[i],
            transition_out: i < windows.length - 1 ? 'cut' : 'fade',
            overlays_discarded: overlaysDiscarded.length ? overlaysDiscarded : (visionByTake[i] === null ? ['[VISÃO INDISPONÍVEL]'] : []),
            occlusions,
            text_request_hits: textHits,
            // Rastro de auditoria: o que a cena continha e foi reescrito como forma
            // gráfica. Sem isto, o saneamento seria uma edição silenciosa do prompt.
            text_sanitized: san.sanitized,
            text_sanitized_terms: san.removed || [],
        });
    }

    // --- Passo 2b: direção de câmera do CRIATIVO INTEIRO ---
    // Só dá para decidir o movimento de um take sabendo o que vem antes e depois dele.
    // Feito take a take, o resultado foi push-in seguido de pull-out num criativo de
    // dois planos — o olho entra e é imediatamente expulso. Por isso a sequência é
    // planejada aqui, depois que todos os takes existem, e só então vira prompt.
    const cameraSequence = Motion.planCameraSequence(takes);
    const continuityText = Motion.continuityAnchor(takes);
    takes.forEach((t, i) => {
        const m = Motion.buildMotionPrompt(t, {
            move: cameraSequence[i], index: i, total: takes.length, continuity: continuityText,
        });
        t.camera_move = cameraSequence[i];
        t.motion_prompt = m.prompt;              // inglês, focado em movimento
        t.motion_negative = m.negative;
        t.motion_seconds = m.seconds;
        t.motion_risky = m.hasRisky;
    });

    // --- Passo 3: gates ---
    const combinedText = takes.map((t) => `${t.on_screen_text}\n${t.image_prompt}\n${t.motion_prompt}`).join('\n');
    const blockedHits = checkBlockedTerms(combinedText, niche.guardrails && niche.guardrails.blocked_terms);
    const textHitTakes = takes.filter((t) => t.text_request_hits.length > 0);
    const violations = [
        ...blockedHits.map((term) => `termo bloqueado do nicho encontrado: "${term}"`),
        ...textHitTakes.map((t) => `take ${t.n}: prompt de imagem menciona texto/tipografia (${t.text_request_hits.join(', ')})`),
    ];
    const guardrails = { passed: violations.length === 0, violations };

    if (!guardrails.passed) {
        console.log(`    ⚠️ guardrails com pendência: ${violations.join(' | ')}`);
    }
    if (degradedTakes.length > 0) {
        P.appendDegraded(session, { phase: 'F3', label: `[${pack.rank}] @${pack.handle}`, status: 'partial', issues: degradedTakes });
    }

    // --- Passo 4: escrever os documentos ---
    const overlayRows = aggregateOverlays(visionByTake);
    const overlaysVerified = !noVision && overlayRows.length > 0 && degradedTakes.length === 0;
    const finalOverlayRows = overlayRows.length ? overlayRows : [
        { tipo: 'legenda queimada / texto na tela', posicao: '[VISÃO INDISPONÍVEL]' },
        { tipo: 'texto e @handle do autor', posicao: '[VISÃO INDISPONÍVEL]' },
        { tipo: 'contadores (curtidas, comentários, compartilhar)', posicao: '[VISÃO INDISPONÍVEL]' },
        { tipo: 'avatar e botão de seguir', posicao: '[VISÃO INDISPONÍVEL]' },
        { tipo: "marca d'água do TikTok", posicao: '[VISÃO INDISPONÍVEL]' },
        { tipo: 'ícone/disco de música', posicao: '[VISÃO INDISPONÍVEL]' },
    ];
    const occlusionsAll = [...new Set(takes.flatMap((t) => t.occlusions))].filter((o) => o !== '[VISÃO INDISPONÍVEL]');
    const occlusionsText = occlusionsAll.length ? occlusionsAll.join('; ') : (noVision ? '[VISÃO INDISPONÍVEL]' : 'nenhuma oclusão registrada neste criativo');

    const planoMd = buildPlanoCriativoMd({ pack, niche, session, takes, audioInfo, guardrails, totalDuration });
    const imagemMd = buildPromptsImagemMd({ pack, niche, takes, seed, overlayRows: finalOverlayRows, occlusionsText, overlaysVerified });
    const animacaoMd = buildPromptsAnimacaoMd({ pack, niche, takes });

    fs.mkdirSync(pack.dir, { recursive: true });
    fs.writeFileSync(paths.plan, planoMd);
    fs.writeFileSync(paths.imagePrompts, imagemMd);
    fs.writeFileSync(paths.motionPrompts, animacaoMd);
    fs.writeFileSync(paths.publication, Pub.buildPublicationDoc({
        handle: pack.handle, rank: pack.rank, url: pack.url, benchmark: b, niche,
    }));

    const modelingJson = {
        rank: pack.rank,
        handle: pack.handle,
        niche: niche.id,
        seed,
        total_duration: totalDuration,
        audio: { kind: audioInfo.kind, treatment: audioInfo.treatment },
        caption_style: (niche.modeling && niche.modeling.caption_style) || null,
        // FRASE DO CRIATIVO — o texto que vai aparecer na tela do criativo montado.
        //
        // Existe porque a F6 vinha queimando a TRANSCRIÇÃO DO ÁUDIO DO BENCHMARK como
        // legenda. Isso publica a fala de outra pessoa na tela do nosso criativo, e nos
        // formatos deste nicho (frase sobre imagem) a frase É o conteúdo, não uma
        // legenda de acessibilidade.
        //
        // `original_detectada` é o que a visão leu queimado no quadro do benchmark —
        // referência de ESTRUTURA (tamanho, tom, quebra de linha), nunca para copiar.
        // `frase` nasce vazia de propósito: preenchê-la automaticamente a partir do
        // original seria plágio, e a partir de um modelo seria invenção (Article IV).
        creative_text: {
            frase: '',
            fonte: 'pendente',
            original_detectada: takes
                .map((t) => ({ take: t.n, texto: t.original_on_screen_text || '' }))
                .filter((x) => x.texto),
            instrucao: 'Escreva em `frase` o texto autoral que vai na tela. Enquanto estiver vazio, a montagem cai para a transcrição do áudio e AVISA.',
        },
        takes: takes.map((t) => ({
            n: t.n, role: t.role, duration: t.duration,
            source_frame: t.source_frame,
            // A cena traduzida pela visão fica gravada: é a REFERÊNCIA contra a qual
            // o gate de qualidade compara a imagem gerada. Sem ela, o gate teria de
            // reconstruir o alvo a partir do prompt final, que já vem misturado com
            // acabamento e instruções de formato.
            cena: t.cena,
            image_prompt: t.image_prompt, negative_prompt: t.negative_prompt,
            // Alimenta o fallback de acervo da F4. Fica no JSON para ser corrigível
            // à mão: quando a busca erra o alvo, editar uma linha aqui é mais barato
            // que reprocessar a visão do criativo inteiro.
            stock_query: t.stock_query,
            original_on_screen_text: t.original_on_screen_text || '',
            blocked_reason: t.blocked_reason || null,
            // Prompt de animação em inglês + o movimento que a sequência atribuiu a
            // este take. `camera_move` fica gravado para que a montagem e qualquer
            // regeração saibam a direção planejada, sem recalcular a sequência.
            motion_prompt: t.motion_prompt,
            motion_negative: t.motion_negative,
            camera_move: t.camera_move,
            motion_seconds: t.motion_seconds,
            procedural_preset: t.procedural_preset,
            on_screen_text: t.on_screen_text, transition_out: t.transition_out,
            overlays_discarded: t.overlays_discarded, occlusions: t.occlusions,
        })),
        guardrails,
        blocked: false,
        block_reason: null,
    };
    fs.writeFileSync(paths.modelingJson, JSON.stringify(modelingJson, null, 2));

    console.log(`    ✓ plano-criativo.md · prompts-imagem.md · prompts-animacao.md · publicacao.md · modeling.json`);
    console.log(`    ⏳ aguardando aprovação do dono antes de liberar para F4 (checklists/modeling-authorship-checklist.md)`);

    return {
        rank: pack.rank, handle: pack.handle,
        status: degradedTakes.length > 0 ? 'partial' : (guardrails.passed ? 'ok' : 'concerns'),
        violations, degradedTakes,
        dir: path.relative(L.REPO_ROOT, pack.dir).replace(/\\/g, '/'),
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

    // NÃO usamos onlyComplete (filtro por benchmark.status) aqui: um pack `blocked`
    // pelo gate terminal da F2 (ex.: notícias sem transcrição) tem os arquivos EM
    // DISCO (vídeo, frames, áudio) mas status !== 'complete' — se filtrássemos por
    // status, o gate da F3 nunca veria esse pack para reportar o bloqueio. A
    // completude real é verificada por disco (pack.diskComplete), como manda
    // _pack.js; ranks/top são aplicados DEPOIS do filtro de disco, não antes.
    let packs = P.listPacks(session, { origin: args.origin }).filter((p) => p.diskComplete);

    // RETOMADA BARATA de lote longo. A F3 gasta uma chamada de visão por frame — num
    // lote de 234 packs são ~930 chamadas, e uma interrupção no meio (queda, limite de
    // tempo, Ctrl+C) obrigaria a refazer tudo do zero só para chegar onde parou.
    //
    // `camera_move` é o marcador de padrão ATUAL: só existe em modeling.json gerado
    // depois que a sequência de câmera passou a ser planejada em conjunto. Plano velho
    // não tem o campo e é reprocessado — que é o certo, senão a retomada consolidaria
    // o formato antigo em silêncio.
    if (args['skip-existing']) {
        const antes = packs.length;
        packs = packs.filter((p) => {
            const mj = P.packPaths(p.dir).modelingJson;
            if (!fs.existsSync(mj)) return true;
            try {
                const j = JSON.parse(fs.readFileSync(mj, 'utf8'));
                return !((j.takes || [])[0] && j.takes[0].camera_move);
            } catch (_) {
                return true; // JSON corrompido → refaz
            }
        });
        console.log(`↩️  --skip-existing: ${antes - packs.length} pack(s) já no padrão atual, ${packs.length} a processar.`);
    }

    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    } else if (args.top) {
        packs = packs.slice(0, parseInt(args.top, 10));
    }

    console.log(`\n=== F3 Modelagem Autoral · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:  ${session.id}`);
    console.log(`Packs:   ${packs.length} completo(s) em disco (status verificado por pack, não filtrado aqui)`);
    console.log(`Modo:    ${args['dry-run'] ? 'dry-run' : args['no-vision'] ? 'sem visão (placeholders)' : 'visão habilitada'}`);
    if (niche.id === 'noticias') console.log(`⚠️  Gate terminal ativo: sem transcrição, o criativo NÃO avança.`);

    if (packs.length === 0) {
        console.log(`\n⚠️  Nenhum pack completo encontrado na sessão. Rode a F2 primeiro:`);
        console.log(`    node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${session.id}`);
        process.exit(0);
    }

    // LocalTranscriber só é instanciado se algum pack de fato precisar de visão —
    // dry-run e --no-vision não pagam o custo de carregar o vision-router.
    let transcriberSingleton = null;
    const transcriberFactory = () => {
        if (!transcriberSingleton) {
            const LocalTranscriber = require(path.join(L.REPO_ROOT, 'services', 'ETL', 'Transform', 'video-intelligence', 'local-transcriber.js'));
            transcriberSingleton = new LocalTranscriber();
        }
        return transcriberSingleton;
    };

    const results = [];
    for (const pack of packs) {
        try {
            results.push(await processPack(pack, { niche, session, args, transcriberFactory }));
        } catch (e) {
            console.log(`    ❌ exceção: ${e.message}`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'degraded', reason: `exceção: ${e.message}` });
        }
    }

    const ok = results.filter((r) => r.status === 'ok');
    const concerns = results.filter((r) => r.status === 'concerns' || r.status === 'partial');
    const blocked = results.filter((r) => r.status === 'blocked');
    const degraded = results.filter((r) => r.status === 'degraded');

    if (!args['dry-run']) {
        P.saveManifest(session, 'f3_modeling', {
            processed: results.length,
            ok: ok.length,
            concerns: concerns.length,
            blocked: blocked.length,
            degraded: degraded.length,
            packs: results.map((r) => ({ rank: r.rank, handle: r.handle, status: r.status, dir: r.dir || null })),
        });
    }

    console.log(`\n${'='.repeat(58)}`);
    console.log(`✅ Com plano: ${ok.length}  ·  ⚠️ Concerns/parciais: ${concerns.length}  ·  🚫 Bloqueados: ${blocked.length}  ·  ❌ Degradados: ${degraded.length}`);
    if (!args['dry-run']) {
        console.log(`📁 Packs: ${path.relative(L.REPO_ROOT, path.join(session.dir, 'benchmark')).replace(/\\/g, '/')}`);
        console.log(`\n➡️  Após aprovação do dono: @farming-imager (F4) · @farming-animator (F5)\n`);
    }
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
