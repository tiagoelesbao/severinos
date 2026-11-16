/**
 * _publication.js — publicacao.md: como o autor PUBLICOU o criativo.
 *
 * O pack descrevia o vídeo em detalhe e não dizia nada sobre a publicação: legenda,
 * hashtags e trilha ficavam só como campos soltos no benchmark.json. Mas o criativo
 * não é só o vídeo — quem posta precisa reproduzir também a embalagem, e ela é metade
 * do desempenho: a legenda ancora o comentário, as hashtags entregam a distribuição
 * inicial.
 *
 * Vive num módulo próprio porque tem DOIS consumidores e nenhuma dependência de visão:
 * a F3 o gera junto do plano de modelagem, e `farm-publication.js` o gera sozinho, em
 * lote, sem chamar nenhuma API — tudo que ele precisa já está no benchmark.json.
 *
 * Article IV (No Invention): a legenda modelada NÃO é gerada aqui. O documento registra
 * o que o autor fez, extrai a ESTRUTURA observável e deixa o campo autoral explicitamente
 * em aberto — inventar uma legenda "no estilo de" seria exatamente o tipo de invenção que
 * a Constitution proíbe.
 */

function oneLine(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Rótulo legível do tipo de áudio + tratamento definido pelo nicho. */
function buildAudioInfo(benchmark, niche) {
    const audio = (benchmark && benchmark.audio) || {};
    const kindLabel = audio.kind === 'music' ? 'Música / trilha'
        : audio.kind === 'original_speech' ? 'Fala original'
            : 'Indeterminado';
    return {
        kind: audio.kind || 'indeterminado',
        kindLabel,
        treatment: oneLine(niche && niche.modeling && niche.modeling.audio_treatment)
            || '(não definido no nicho — preserva original por padrão)',
    };
}

/**
 * @param {object} ctx
 * @param {string} ctx.handle
 * @param {number|string} ctx.rank
 * @param {string} [ctx.url]
 * @param {object} ctx.benchmark  conteúdo de benchmark.json
 * @param {object} ctx.niche
 */
function buildPublicationDoc({ handle, rank, url, benchmark, niche }) {
    const b = benchmark || {};
    const src = b.source || {};
    const audioInfo = buildAudioInfo(b, niche);
    const legenda = String(b.author_description || '').trim();
    const hashtags = Array.isArray(b.hashtags) ? b.hashtags : [];

    // A legenda vem do TikTok com as hashtags embutidas no fim. Separar as duas partes
    // é o que revela a estrutura real: texto âncora + bloco de distribuição.
    const semTags = legenda.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
    const tagsNaLegenda = (legenda.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1));
    // Dedupe preservando ordem: o campo `hashtags` do benchmark normalmente já é a
    // extração da própria legenda, então unir sem deduplicar dobraria a lista inteira.
    const todasTags = [...new Set([...hashtags, ...tagsNaLegenda])];

    let md = `# Publicação original · @${handle} · rank ${rank}\n\n`;
    md += `**Fonte:** <${src.url || url || 'sem URL'}>\n`;
    if (b.published_at) md += `**Publicado em:** ${b.published_at}\n`;
    if (niche) md += `**Nicho:** ${niche.icon} ${niche.label}\n`;
    md += `\n> Registro fiel do que o autor publicou. É a referência para modelar a EMBALAGEM do\n`;
    md += `> criativo — legenda e hashtags —, não só o vídeo. Nada aqui é sugestão: é o que está no ar.\n\n---\n\n`;

    md += `## Legenda como publicada\n\n`;
    md += legenda ? '```text\n' + legenda + '\n```\n\n' : `_O autor publicou sem legenda._\n\n`;

    if (semTags && tagsNaLegenda.length) {
        md += `**Texto sem as hashtags:**\n\n\`\`\`text\n${semTags}\n\`\`\`\n\n`;
    }

    md += `## Hashtags (${todasTags.length})\n\n`;
    if (todasTags.length === 0) {
        md += `_Nenhuma._ Vale registrar: publicar sem hashtag é uma escolha, e neste acervo ela\n`;
        md += `aparece justamente em perfis de alta mediana — não presuma que a tag é obrigatória.\n\n`;
    } else {
        md += todasTags.map((t) => `\`#${t}\``).join(' · ') + '\n\n';
        md += `Para colar:\n\n\`\`\`text\n${todasTags.map((t) => '#' + t).join(' ')}\n\`\`\`\n\n`;
    }

    md += `## Áudio\n\n`;
    md += `| Campo | Valor |\n| :--- | :--- |\n`;
    md += `| Tipo | ${audioInfo.kindLabel} |\n`;
    md += `| Trilha declarada | ${(b.audio && b.audio.music_title) || '—'} |\n`;
    md += `| Tratamento no nicho | ${audioInfo.treatment} |\n\n`;

    md += `---\n\n## Estrutura observada\n\n`;
    md += `| Elemento | O que o autor fez |\n| :--- | :--- |\n`;
    md += `| Comprimento da legenda | ${legenda ? legenda.length + ' caracteres' : 'sem legenda'} |\n`;
    md += `| Texto antes das hashtags | ${semTags ? 'sim — ' + semTags.length + ' caracteres' : 'não'} |\n`;
    md += `| Quantidade de hashtags | ${todasTags.length} |\n`;
    md += `| Hashtags no corpo da legenda | ${tagsNaLegenda.length} |\n\n`;

    md += `## Publicação modelada\n\n`;
    md += `> ⚠️ **A preencher pelo autor.** Reproduza a ESTRUTURA acima com conteúdo próprio.\n`;
    md += `> Copiar a legenda original publica o texto de outra pessoa; o que se modela é a forma.\n\n`;
    md += `**Legenda:**\n\n\`\`\`text\n[escrever aqui — mesma estrutura, conteúdo autoral]\n\`\`\`\n\n`;
    md += `**Hashtags:**\n\n\`\`\`text\n[escrever aqui — ver hashtags-{data}.md da sessão para as convenções do nicho]\n\`\`\`\n`;

    return md;
}

/** Resumo estruturado da publicação — usado pelo índice de lote. */
function summarize(benchmark) {
    const b = benchmark || {};
    const legenda = String(b.author_description || '').trim();
    const tagsNaLegenda = (legenda.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1));
    const todasTags = [...new Set([...(Array.isArray(b.hashtags) ? b.hashtags : []), ...tagsNaLegenda])];
    return {
        legenda,
        semTags: legenda.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim(),
        hashtags: todasTags,
        track: (b.audio && b.audio.music_title) || null,
        published_at: b.published_at || null,
    };
}

module.exports = { buildPublicationDoc, buildAudioInfo, summarize, oneLine };
