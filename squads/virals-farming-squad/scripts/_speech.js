/**
 * _speech.js — Legenda de narração com timestamps REAIS, por palavra.
 *
 * EVOLUÇÃO EM DOIS PASSOS, e vale registrar por que o primeiro não bastou:
 *
 *  1. A versão original do pipeline distribuía o texto proporcionalmente à duração do
 *     áudio, assumindo ritmo constante de fala. Fala não tem ritmo constante — há
 *     pausas, ênfase, respiração —, e o erro acumula ao longo do vídeo.
 *
 *  2. Passar a usar o SRT do Whisper corrigiu parte: os blocos passaram a ter tempo
 *     real. Mas o Whisper devolve blocos de 5–8s, e subdividi-los em partes IGUAIS
 *     reintroduz exatamente a suposição de ritmo constante, agora dentro do bloco.
 *     A legenda continuava adiantando e atrasando.
 *
 * A correção definitiva é o timestamp POR PALAVRA (`--word_timestamps True`): cada cue
 * começa quando sua primeira palavra é dita e termina na última. Não há estimativa.
 *
 * A quebra de linha também deixou de ser por contagem de palavras. Cinco palavras podem
 * dar uma linha curta ou duas desbalanceadas; o que importa é o CARACTERE, o ponto de
 * pausa e o equilíbrio entre as duas linhas — a leitura no feed é de relance.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function whisperBin() {
    const candidatos = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'Scripts', 'whisper.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'Scripts', 'whisper'),
        'whisper',
    ];
    for (const c of candidatos) if (c === 'whisper' || fs.existsSync(c)) return c;
    return 'whisper';
}

/**
 * Garante o JSON com timestamps por palavra e devolve a lista de palavras.
 * Cacheado ao lado do áudio: transcrever leva ~18s e a remontagem é frequente.
 * @returns {{ok:boolean, words?:Array<{word:string,start:number,end:number}>, reason?:string, cached?:boolean}}
 */
function ensureWordTimings(audioPath, { language = 'pt', model = 'base' } = {}) {
    if (!fs.existsSync(audioPath)) return { ok: false, reason: 'áudio ausente' };

    const dir = path.dirname(audioPath);
    const base = path.basename(audioPath, path.extname(audioPath));
    const jsonPath = path.join(dir, `${base}.json`);

    const ler = () => {
        try {
            const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const words = (j.segments || []).flatMap((s) => s.words || [])
                .map((w) => ({ word: String(w.word || '').trim(), start: Number(w.start), end: Number(w.end) }))
                .filter((w) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end));
            return words.length ? words : null;
        } catch (_) { return null; }
    };

    if (fs.existsSync(jsonPath)) {
        const w = ler();
        if (w) return { ok: true, words: w, cached: true };
    }

    const r = spawnSync(
        whisperBin(),
        [audioPath, '--model', model, '--language', language, '--word_timestamps', 'True',
         '--output_dir', dir, '--output_format', 'json'],
        { encoding: 'utf8', windowsHide: true, timeout: 10 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }
    );
    const w = ler();
    if (!w) return { ok: false, reason: `whisper não gerou timestamps (${(r.stderr || (r.error && r.error.message) || '').slice(0, 200)})` };
    return { ok: true, words: w };
}

/** Pausa longa entre palavras indica fim de ideia — bom ponto de corte. */
const PAUSA_LONGA = 0.55;
/** Pontuação que fecha ou separa oração. */
const FIM_FORTE = /[.!?…]$/;
const FIM_FRACO = /[,;:]$/;

/**
 * Agrupa palavras em cues legíveis.
 *
 * Corta quando: passaria do limite de caracteres, houve pausa longa, ou a palavra
 * fecha uma frase. O limite é de CARACTERES (não de palavras) porque é o caractere que
 * determina se cabe na largura da tela.
 */
function buildCues(words, { maxChars = 42, maxSeconds = 3.2 } = {}) {
    const cues = [];
    let atual = [];

    const fechar = () => {
        if (!atual.length) return;
        cues.push({
            start: Math.round(atual[0].start * 100) / 100,
            end: Math.round(atual[atual.length - 1].end * 100) / 100,
            text: atual.map((w) => w.word).join(' ').replace(/\s+/g, ' ').trim(),
        });
        atual = [];
    };

    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const candidato = [...atual, w];
        const chars = candidato.map((x) => x.word).join(' ').length;
        const dur = w.end - (candidato[0].start);

        atual = candidato;

        const prox = words[i + 1];
        const pausa = prox ? prox.start - w.end : Infinity;
        const estouraChars = prox && (chars + 1 + prox.word.length) > maxChars;
        const estouraTempo = prox && (prox.end - candidato[0].start) > maxSeconds;

        if (FIM_FORTE.test(w.word) || pausa >= PAUSA_LONGA || estouraChars || estouraTempo) {
            fechar();
        }
    }
    fechar();
    return cues;
}

/**
 * Quebra o texto do cue em até duas linhas EQUILIBRADAS.
 *
 * Procura o ponto de corte mais próximo do meio, preferindo quebrar depois de vírgula
 * — a leitura respeita a pausa natural. Linhas de tamanhos muito diferentes obrigam o
 * olho a varrer distâncias distintas e derrubam a leitura de relance.
 */
function balanceLines(text, maxCharsPerLine) {
    const t = String(text || '').trim();
    if (t.length <= maxCharsPerLine) return [t];

    const words = t.split(/\s+/);
    let melhor = null;
    for (let i = 1; i < words.length; i++) {
        const l1 = words.slice(0, i).join(' ');
        const l2 = words.slice(i).join(' ');
        if (l1.length > maxCharsPerLine || l2.length > maxCharsPerLine) continue;
        // Custo: desequilíbrio entre as linhas, com desconto quando a 1ª fecha em vírgula.
        const custo = Math.abs(l1.length - l2.length) - (FIM_FRACO.test(l1) ? 6 : 0);
        if (!melhor || custo < melhor.custo) melhor = { custo, linhas: [l1, l2] };
    }
    if (melhor) return melhor.linhas;

    // Não coube em duas linhas: quebra pelo limite, sem perder texto.
    const linhas = [];
    let linha = '';
    for (const w of words) {
        if (!linha) { linha = w; continue; }
        if ((linha + ' ' + w).length <= maxCharsPerLine) linha += ' ' + w;
        else { linhas.push(linha); linha = w; }
    }
    if (linha) linhas.push(linha);
    return linhas;
}

module.exports = { ensureWordTimings, buildCues, balanceLines };
