const { scorePost } = require('./fit-scorer');

/**
 * Ranking Builders — geração dos documentos de ranking do daily-monitor.
 *
 * Extraídos do daily-monitor.js para serem testáveis sem scrape ao vivo:
 *  - buildGeneralRanking  → coletas gerais (global cross-plataforma, VEX-14)
 *  - buildFitRanking      → confluência com o cliente (fit, não engajamento)
 */

function fmtNumber(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/** Caption/legenda do post — os scrapers não são consistentes no nome do
 * campo (instagram.js usa `description`, outros podem usar `text`/`caption`/
 * `title`) — cadeia de fallback cobre todos sem precisar normalizar em cada
 * scraper. Usado tanto pro fit-scoring (linha abaixo) quanto pra coluna
 * "Descrição" da tabela e pro nome da subtask em create-lote-de-conteudos.js. */
function captionOf(post) {
    return post.description || post.text || post.caption || post.title || '';
}

/** Trunca a legenda pra uma linha curta de tabela/nome de task — sem quebra
 * de linha nem `|` (quebraria a tabela markdown), com reticências se cortou. */
function shortDescription(post, maxLen = 60) {
    const raw = captionOf(post).replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
    if (!raw) return '—';
    return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
}

/**
 * Normaliza o Viral Score em 0–100 DENTRO de cada plataforma. YouTube com views
 * infla a escala; IG raramente tem views — sem normalizar, o top global seria
 * sempre YouTube.
 */
function withNormalizedScore(posts) {
    const maxByPlat = {};
    for (const p of posts) maxByPlat[p.platform] = Math.max(maxByPlat[p.platform] || 0, p.score || 0);
    return posts.map(p => ({
        ...p,
        scoreNorm: maxByPlat[p.platform] > 0 ? Math.round(((p.score || 0) / maxByPlat[p.platform]) * 100) : 0,
    }));
}

function buildGeneralRanking(allPosts, date, lookbackHours, platformsRequested) {
    const ranked = withNormalizedScore(allPosts).sort((a, b) => b.scoreNorm - a.scoreNorm);

    let md = `# Coletas Gerais · Ranking Global · ${date}\n\n`;
    md += `**Plataformas:** ${platformsRequested.join(', ')}  ·  **Total coletado:** ${allPosts.length}  ·  **Lookback:** ${lookbackHours}h\n\n`;
    md += `> Ranking unificado cross-plataforma por **Score Normalizado** (Viral Score reescalado 0–100 dentro de cada rede).\n`;
    md += `> Viral Score bruto = views×0,1 + likes×1 + comments×5.\n\n---\n\n`;

    if (ranked.length === 0) { md += `_Nenhuma coleta na janela de ${lookbackHours}h._\n`; return md; }

    md += `> ✅ Marque a coluna **Sondagem** dos criativos que devem entrar no lote do dia — o Lote em ClickUp só puxa os marcados.\n\n`;
    md += `| Sondagem | # | Norm | Plataforma | Criador | Descrição | Viral Score | Likes | Coment. | Views | Link |\n`;
    md += `| :---: | :- | ---: | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |\n`;
    ranked.forEach((p, i) => {
        const m = p.metrics || {};
        md += `| [ ] | ${i + 1} | **${p.scoreNorm}** | ${p.platform} | ${p.identifier} | ${shortDescription(p)} | ${fmtNumber(p.score)} | ${fmtNumber(m.likes)} | ${fmtNumber(m.comments)} | ${fmtNumber(m.views)} | [Ver](${p.url}) |\n`;
    });
    return md;
}

function shortcodeFromUrl(url = '') {
    const m = url.match(/\/(?:reel|reels|p|tv|shorts)\/([A-Za-z0-9_-]+)/) || url.match(/watch\?v=([\w-]+)/);
    return m ? m[1] : url;
}

function buildFitRanking(allPosts, fitProfile, client, date) {
    const scored = allPosts.map(p => ({
        ...p,
        fit: scorePost({ text: captionOf(p), identifier: p.identifier, priority: p.priority, subtype: p.subtype }, fitProfile),
    })).sort((a, b) => b.fit.fitScore - a.fit.fitScore);

    const nome = client.nomeExibicao || client.slug;
    let md = `# Ranking por Confluência · ${nome} · ${date}\n\n`;
    md += `**Total avaliado:** ${allPosts.length}  ·  **Base:** brand-identity de \`${client.slug}\`\n\n`;
    md += `> Ordena pela **aderência ao DNA do cliente** (léxico da marca, pilares, evidência numérica, priority) — NÃO pelo engajamento. `;
    md += `Serve para escolher o que benchmarkar por fit.\n\n`;
    md += `> ⚠️ Fit de baixa confiança = post sem caption capturada (pontuado só por sinais estruturais).\n\n---\n\n`;

    if (scored.length === 0) { md += `_Nenhuma coleta para avaliar._\n`; return md; }

    md += `> ✅ Marque a coluna **Sondagem** dos criativos que devem entrar no lote do dia — o Lote em ClickUp só puxa os marcados.\n\n`;
    md += `| Sondagem | # | Fit | Conf. | Pilar | Plataforma | Criador | Descrição | Por quê | Link |\n`;
    md += `| :---: | :- | ---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    scored.forEach((p, i) => {
        const why = (p.fit.reasons.slice(0, 2).join('; ') || '—').replace(/\|/g, '/');
        md += `| [ ] | ${i + 1} | **${p.fit.fitScore}** | ${p.fit.confidence} | ${p.fit.pilar || '—'} | ${p.platform} | ${p.identifier} | ${shortDescription(p)} | ${why} | [Ver](${p.url}) |\n`;
    });

    const topFit = scored.filter(p => p.fit.fitScore >= 60).slice(0, 8);
    if (topFit.length) {
        md += `\n## 🎯 Recomendados para benchmark (fit ≥ 60)\n\n`;
        md += `Curados por confluência com ${nome}, não por engajamento:\n\n`;
        topFit.forEach(p => { md += `- **${p.fit.fitScore}** · ${p.platform}/${p.identifier} — \`${shortcodeFromUrl(p.url)}\`\n`; });
        md += `\n> Rode \`*creative-benchmark\` com estes picks para benchmarkar o que combina com o cliente.\n`;
    }
    return md;
}

module.exports = { buildGeneralRanking, buildFitRanking, withNormalizedScore, shortcodeFromUrl, captionOf, shortDescription };
