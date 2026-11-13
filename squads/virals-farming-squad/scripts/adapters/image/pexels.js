/**
 * adapters/image/pexels.js — Tier C · Banco de imagens Pexels (fallback de acervo).
 *
 * NÃO é um gerador: é um BUSCADOR. Quando toda a cascata de geração falha (cota,
 * indisponibilidade, chave ausente), o take ainda precisa de uma imagem 9:16 real —
 * e uma foto de acervo semanticamente próxima da cena descrita é infinitamente mais
 * útil para a F5 do que um placeholder ou um degradê procedural.
 *
 * O QUE ALIMENTA A BUSCA: o mesmo prompt que alimentaria o gerador — ou seja, a
 * "tradução da imagem para até cego ver" produzida pela visão na F3, já sem texto
 * e sem interface. É isso que dá semelhança: buscar pela CENA descrita (sujeito +
 * ambiente + luz), não pelo tema do nicho.
 *
 * POR QUE UMA QUERY DERIVADA, E NÃO O PROMPT INTEIRO: prompt de difusão é uma lista
 * longa de qualificadores ("fotorrealista, luz volumétrica dourada, 9:16, sem bordas,
 * sem texto"). Busca textual em banco de imagens degrada com ruído — quanto mais
 * termos, menos resultados e piores. Por isso `deriveQuery()` extrai só os núcleos
 * visuais e descarta o vocabulário de renderização, que não descreve nada fotografável.
 *
 * LICENÇA: a Pexels License permite uso comercial sem atribuição obrigatória, mas o
 * adapter grava autor e URL em `attribution` de qualquer forma — quem publica precisa
 * saber a procedência de cada asset, e um pack sem procedência é um risco silencioso.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('../../_niche-loader.js');

function ffmpegPath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}
function ffprobePath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

function probeImage(filePath) {
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 20000 }
    );
    const [w, h] = (r.stdout || '').trim().split(',').map((n) => parseInt(n, 10));
    return { width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null };
}

/** Crop centralizado para 9:16 + scale exato. Foto de acervo quase nunca vem 9:16. */
function forceVertical916(filePath, targetW, targetH) {
    const tmp = `${filePath}.tmp.jpg`;
    const vf = `crop='min(iw,ih*${targetW}/${targetH})':'min(ih,iw*${targetH}/${targetW})',scale=${targetW}:${targetH}`;
    const r = spawnSync(ffmpegPath(), ['-y', '-i', filePath, '-vf', vf, '-q:v', '2', tmp], {
        windowsHide: true,
        timeout: 45000,
    });
    if (r.status !== 0 || !fs.existsSync(tmp)) return false;
    fs.unlinkSync(filePath);
    fs.renameSync(tmp, filePath);
    return true;
}

// Vocabulário de RENDERIZAÇÃO — descreve como a imagem seria sintetizada, não o que
// ela mostra. Nada disto é fotografável, então só polui a busca em banco de imagens.
const RENDER_NOISE = new Set([
    'fotorrealista', 'fotorealista', 'realista', 'cinematográfico', 'cinematografico', 'cinematic',
    'render', 'renderizado', 'ultra', 'detalhado', 'detalhada', 'alta', 'resolução', 'resolucao', '4k', '8k', 'hd',
    'qualidade', 'nítido', 'nitido', 'nítida', 'nitida', 'profissional', 'premiado',
    'vertical', 'bordas', 'borda', 'moldura', 'molduras', 'formato', 'proporção', 'proporcao',
    'texto', 'textos', 'legenda', 'legendas', 'letra', 'letras', 'tipografia', 'watermark', 'logo', 'logotipo',
    'interface', 'botão', 'botao', 'botões', 'botoes', 'ícone', 'icone', 'ícones', 'icones',
    'plano', 'enquadramento', 'lente', 'câmera', 'camera', 'foco', 'profundidade', 'campo',
    'estilo', 'estética', 'estetica', 'paleta', 'contraste', 'saturação', 'saturacao', 'exposição', 'exposicao',
]);

// Stopwords de português. Curtas e comuns — não carregam conteúdo visual.
const STOP = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'por', 'para', 'com', 'sem', 'sob', 'sobre', 'entre', 'ao', 'aos', 'à', 'às', 'e', 'ou', 'que', 'se', 'ser',
    'é', 'são', 'está', 'estão', 'ha', 'há', 'muito', 'muita', 'mais', 'menos', 'bem', 'mal', 'como', 'onde',
    'seu', 'sua', 'seus', 'suas', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'isso', 'isto',
    'todo', 'toda', 'todos', 'todas', 'algum', 'alguma', 'nenhum', 'nenhuma', 'apenas', 'somente', 'também', 'tambem',
]);

/**
 * Deriva a query de busca a partir do prompt de imagem.
 *
 * Mantém a ORDEM do prompt de propósito: a descrição de cena da F3 começa pelo
 * enquadramento e pelo sujeito, que é justamente o que mais importa para achar uma
 * foto parecida. Cortar pelos primeiros termos preserva o núcleo e descarta a cauda
 * de qualificadores.
 */
function deriveQuery(promptText, maxTerms = 6) {
    const base = String(promptText || '')
        // Trechos negativos ("sem texto", "sem bordas") não são o que buscamos — a
        // busca não tem conditioning negativo, e manter a palavra faria o banco
        // devolver justamente imagens COM aquilo.
        .replace(/\bsem\s+[^,.;]+/gi, ' ')
        .replace(/\bnão\s+[^,.;]+/gi, ' ')
        .replace(/\d+\s*:\s*\d+/g, ' ')
        .toLowerCase();

    const termos = [];
    for (const raw of base.split(/[^\p{L}\p{N}]+/u)) {
        const t = raw.trim();
        if (t.length < 3) continue;
        if (STOP.has(t) || RENDER_NOISE.has(t)) continue;
        if (termos.includes(t)) continue;
        termos.push(t);
        if (termos.length >= maxTerms) break;
    }
    return termos.join(' ');
}

/**
 * Pontua o resultado pela sobreposição entre a descrição da foto (`alt`) e a query.
 * Simples de propósito: sem isto, a ordem do Pexels manda e o primeiro resultado de
 * uma query genérica costuma ser o mais popular, não o mais parecido.
 */
function scorePhoto(photo, queryTerms) {
    const alt = String(photo.alt || '').toLowerCase();
    let hits = 0;
    for (const t of queryTerms) if (alt.includes(t)) hits += 1;

    // Preferência por retrato: a foto que já nasce vertical perde muito menos cena
    // no crop 9:16 do que uma paisagem, onde o corte joga fora dois terços do quadro.
    const ratio = photo.width && photo.height ? photo.width / photo.height : 1;
    const verticalBonus = ratio < 0.8 ? 2 : ratio < 1 ? 1 : 0;

    return hits * 3 + verticalBonus;
}

async function searchPexels(query, { perPage = 15, locale = 'pt-BR' } = {}) {
    const key = String(process.env.PEXELS_API_KEY || '').trim();
    if (!key) return { ok: false, reason: 'PEXELS_API_KEY ausente' };

    const url =
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
        `&orientation=portrait&size=large&per_page=${perPage}&locale=${encodeURIComponent(locale)}`;

    let res;
    try {
        res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
        return { ok: false, reason: `rede: ${e.message.slice(0, 120)}` };
    }

    if (res.status === 429) return { ok: false, quotaExceeded: true, reason: 'cota do Pexels esgotada (429)' };
    if (!res.ok) {
        const body = await res.text();
        return { ok: false, reason: `Pexels ${res.status}: ${body.slice(0, 160).replace(/\s+/g, ' ')}` };
    }

    let json;
    try {
        json = await res.json();
    } catch (_) {
        return { ok: false, reason: 'resposta do Pexels não é JSON' };
    }
    return { ok: true, photos: json.photos || [] };
}

async function download(url, destPath) {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { ok: false, reason: `download HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) return { ok: false, reason: `arquivo suspeito (${buf.length} bytes)` };
    fs.writeFileSync(destPath, buf);
    return { ok: true, bytes: buf.length };
}

async function fetchStock(req) {
    const width = req.width || 1080;
    const height = req.height || 1920;

    // `req.stockQuery` permite que a F4 mande uma query melhor que a derivada — por
    // exemplo montada dos campos `sujeito` + `fundo` da visão, que são mais limpos
    // que o prompt final. Sem ela, deriva do próprio prompt.
    const query = String(req.stockQuery || '').trim() || deriveQuery(req.prompt);
    if (!query) return { ok: false, reason: 'não foi possível derivar query de busca do prompt' };

    const queryTerms = query.split(/\s+/).filter(Boolean);
    let r = await searchPexels(query);

    // Query longa sem resultado é o caso comum: banco de imagens não tem foto para
    // uma descrição de 6 termos. Encurtar progressivamente troca precisão por
    // cobertura — melhor uma foto do sujeito certo que nenhuma foto.
    const fallbackQueries = [];
    if (queryTerms.length > 3) fallbackQueries.push(queryTerms.slice(0, 3).join(' '));
    if (queryTerms.length > 1) fallbackQueries.push(queryTerms.slice(0, 2).join(' '));

    let usedQuery = query;
    for (const fq of fallbackQueries) {
        if (r.ok && r.photos.length > 0) break;
        if (r.quotaExceeded) break;
        r = await searchPexels(fq);
        usedQuery = fq;
    }

    if (!r.ok) return { ok: false, reason: r.reason, quotaExceeded: r.quotaExceeded };
    if (!r.photos.length) return { ok: false, reason: `Pexels não devolveu foto para "${query}"` };

    const ranked = [...r.photos].sort((a, b) => scorePhoto(b, queryTerms) - scorePhoto(a, queryTerms));

    // Tenta em ordem de pontuação: um download que falha não deve descartar a busca.
    for (const photo of ranked.slice(0, 3)) {
        const src = (photo.src && (photo.src.portrait || photo.src.large2x || photo.src.original)) || null;
        if (!src) continue;
        const dl = await download(src, req.outputPath);
        if (!dl.ok) continue;

        const probe = probeImage(req.outputPath);
        const ratio = probe.width && probe.height ? probe.width / probe.height : 0;
        if (Math.abs(ratio - 9 / 16) / (9 / 16) > 0.02) {
            if (!forceVertical916(req.outputPath, width, height)) {
                return { ok: false, reason: `foto baixada não pôde ser ajustada para 9:16 (${probe.width}x${probe.height})` };
            }
        }

        return {
            ok: true,
            outputPath: req.outputPath,
            // Procedência: quem publica precisa saber que este take é acervo, não
            // geração — e de onde veio. Sem isso o pack mente sobre a própria origem.
            attribution: {
                source: 'pexels',
                query: usedQuery,
                derived_from_prompt: !req.stockQuery,
                photographer: photo.photographer || null,
                photographer_url: photo.photographer_url || null,
                photo_url: photo.url || null,
                photo_id: photo.id || null,
                alt: photo.alt || null,
                license: 'Pexels License — uso comercial livre, atribuição não obrigatória',
            },
        };
    }

    return { ok: false, reason: 'nenhuma das fotos candidatas pôde ser baixada' };
}

module.exports = {
    id: 'pexels-stock',
    tier: 'C',
    kind: 'stock', // NÃO é 'image': o take não foi gerado, foi buscado. A F4 marca isso no slot.
    supportsReferenceImage: false,
    requiresAuth: 'PEXELS_API_KEY',
    deriveQuery, // exportado para teste e para a F4 montar a query a partir da visão

    async check() {
        if (!String(process.env.PEXELS_API_KEY || '').trim()) {
            return { available: false, reason: 'PEXELS_API_KEY ausente' };
        }
        return { available: true };
    },

    async generate(req) {
        try {
            return await fetchStock(req);
        } catch (e) {
            return { ok: false, reason: `exceção no adapter Pexels: ${e.message}` };
        }
    },
};
