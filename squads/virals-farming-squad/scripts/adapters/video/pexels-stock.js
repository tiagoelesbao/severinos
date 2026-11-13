/**
 * adapters/video/pexels-stock.js — Busca de TAKES PRONTOS em banco de vídeo (Pexels).
 *
 * A diferença para os outros adaptadores de `adapters/video/` é de natureza: eles GERAM
 * movimento a partir de uma imagem (I2V, parallax procedural). Este não gera nada — ele
 * PROCURA um vídeo real que já mostre a cena descrita pela modelagem.
 *
 * POR QUE ISSO MUDA O CUSTO DO PIPELINE: a rota clássica é imagem (F4) → animação (F5),
 * dois passos que consomem cota, falham por indisponibilidade e produzem movimento
 * sintético. Um clipe de acervo chega pronto, em 1080×1920, com movimento de câmera real
 * — e o pipeline só precisa recortar o trecho certo.
 *
 * LICENÇA: a Pexels License permite uso comercial sem atribuição obrigatória. O adapter
 * grava autor, URL e id de qualquer forma em `_stock.json`: um pack sem procedência é
 * um risco silencioso na hora de publicar.
 *
 * O QUE ESTE ARQUIVO **NÃO** DECIDE: a query. Quem traduz a cena em termos de busca é o
 * `farm-stock-takes.js` — aqui só se busca, pontua e baixa.
 */

const fs = require('fs');
const path = require('path');

const API = 'https://api.pexels.com/videos/search';

/**
 * Busca no Pexels. `orientation=portrait` é pedido à API, mas NÃO é garantia: a API
 * classifica pelo vídeo original e devolve arquivos em várias proporções, então a
 * verificação real acontece na pontuação.
 */
async function buscar(query, { perPage = 20, minDuration = 0 } = {}) {
    const key = String(process.env.PEXELS_API_KEY || '').trim();
    if (!key) return { ok: false, reason: 'PEXELS_API_KEY ausente' };

    const url = `${API}?query=${encodeURIComponent(query)}&orientation=portrait&per_page=${perPage}`
        + (minDuration > 0 ? `&min_duration=${Math.max(1, Math.floor(minDuration))}` : '');

    let res;
    try {
        res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
        return { ok: false, reason: `rede: ${e.message.slice(0, 120)}` };
    }
    if (res.status === 429) return { ok: false, quotaExceeded: true, reason: 'cota do Pexels esgotada (429)' };
    if (!res.ok) return { ok: false, reason: `Pexels ${res.status}` };

    let json;
    try { json = await res.json(); } catch (_) { return { ok: false, reason: 'resposta não é JSON' }; }
    return { ok: true, videos: json.videos || [], restante: res.headers.get('x-ratelimit-remaining') };
}

/**
 * Pontua um vídeo do acervo para o take pedido.
 *
 * A ordem do Pexels é por popularidade, não por semelhança — o primeiro resultado de uma
 * query genérica costuma ser o clipe mais baixado do banco, não o mais parecido com a
 * cena. Estes critérios são o que separa "achou alguma coisa" de "achou o take":
 *
 *  · VERTICAL pesa mais que tudo. Um clipe deitado perde dois terços do quadro no corte
 *    9:16 — o sujeito quase sempre sai junto.
 *  · DURAÇÃO precisa cobrir o take. Faltando, o trecho teria de repetir dentro de si.
 *  · RESOLUÇÃO: abaixo de 1080 de largura o upscale para 1080×1920 aparece.
 *  · SEMELHANÇA pelos termos da query no slug da URL (o Pexels não devolve tags na
 *    busca, mas o slug carrega o título: `/video/woman-praying-at-sunset-12345/`).
 */
function pontuar(video, termos, duracaoAlvo) {
    const alturaMaior = video.height > video.width;
    const proporcao = video.height / Math.max(1, video.width);

    let s = 0;
    if (alturaMaior) s += 40;                       // vertical nativo
    if (proporcao >= 1.6) s += 15;                  // já perto de 9:16
    else if (proporcao >= 1.2) s += 6;

    if (video.duration >= duracaoAlvo + 1) s += 20; // sobra para escolher o trecho
    else if (video.duration >= duracaoAlvo) s += 10;
    else s -= 25;                                   // curto demais: teria de repetir

    const alturaMax = Math.max(...(video.video_files || []).map((f) => f.height || 0), 0);
    if (alturaMax >= 1920) s += 12;
    else if (alturaMax >= 1280) s += 6;
    else s -= 10;

    const slug = String(video.url || '').toLowerCase();
    for (const t of termos) if (t.length > 3 && slug.includes(t)) s += 8;

    return s;
}

/** O arquivo a baixar: o menor que ainda cubra 1080×1920 — banda não é qualidade. */
function melhorArquivo(video) {
    const files = (video.video_files || []).filter((f) => f.link && /mp4/i.test(f.file_type || 'mp4'));
    if (!files.length) return null;

    const cobre = files
        .filter((f) => (f.height || 0) >= 1920 || ((f.width || 0) >= 1080 && (f.height || 0) >= (f.width || 0)))
        .sort((a, b) => (a.width * a.height) - (b.width * b.height));
    if (cobre.length) return cobre[0];

    return files.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
}

async function baixar(url, destPath) {
    let res;
    try {
        res = await fetch(url, { signal: AbortSignal.timeout(180000) });
    } catch (e) {
        return { ok: false, reason: `rede: ${e.message.slice(0, 100)}` };
    }
    if (!res.ok) return { ok: false, reason: `download HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50 * 1024) return { ok: false, reason: `arquivo suspeito (${buf.length} bytes)` };
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    return { ok: true, bytes: buf.length };
}

/**
 * Procura o melhor clipe para um take.
 *
 * @param {string[]} queries    consultas em ordem de preferência (a 1ª é a melhor aposta)
 * @param {number} duracaoAlvo  duração que o take precisa cobrir, em segundos
 * @param {Set<number>} usados  ids já usados NESTE criativo (evita o mesmo clipe 2×)
 */
async function procurarTake(queries, duracaoAlvo, usados = new Set()) {
    const tentativas = [];
    for (const q of queries) {
        const termos = String(q).toLowerCase().split(/\s+/).filter(Boolean);
        const r = await buscar(q, { minDuration: Math.max(0, Math.floor(duracaoAlvo)) });
        if (!r.ok) {
            tentativas.push({ query: q, erro: r.reason });
            if (r.quotaExceeded) break;
            continue;
        }
        const candidatos = r.videos
            .filter((v) => !usados.has(v.id))
            .map((v) => ({ v, s: pontuar(v, termos, duracaoAlvo) }))
            .sort((a, b) => b.s - a.s);

        tentativas.push({ query: q, resultados: r.videos.length, aproveitaveis: candidatos.length });

        // DUAS PORTAS, e a segunda é a que importa.
        //
        // A nota é dominada por critérios TÉCNICOS: vertical + duração + resolução já
        // somam 95 sozinhos. Ou seja, o piso de nota atesta que o clipe SERVE no formato
        // — não que ele tenha a ver com a cena. Medido no lote 2: as buscas `dark`,
        // `book` e `ocean` passaram com 95 e trouxeram clipe aleatório do tema.
        //
        // Por isso a evidência semântica é exigida à parte: ou a query descreve a cena
        // (duas palavras ou mais), ou o clipe prova a relação trazendo um termo da busca
        // no próprio slug. Uma palavra genérica sem prova nenhuma é recusada.
        const melhor = candidatos[0];
        if (melhor && melhor.s >= 40) {
            const termosUteis = termos.filter((t) => t.length > 3);
            const slug = String(melhor.v.url || '').toLowerCase();
            const provaNoSlug = termosUteis.some((t) => slug.includes(t));
            if (termosUteis.length >= 2 || provaNoSlug) {
                return { ok: true, video: melhor.v, score: melhor.s, query: q, provaNoSlug, tentativas };
            }
            tentativas[tentativas.length - 1].recusa = `query genérica ("${q}") sem prova no clipe`;
        }
    }
    return { ok: false, tentativas, reason: 'nenhum clipe vertical com nota suficiente' };
}

module.exports = { buscar, pontuar, melhorArquivo, baixar, procurarTake };
