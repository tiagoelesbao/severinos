const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Fit Scorer — pontua um post coletado pela CONFLUÊNCIA com o DNA do cliente,
 * não pelo engajamento do criador.
 *
 * Motivo: o Viral Score mede o quanto o CRIADOR engaja, não o quanto o conteúdo
 * serve ao CLIENTE. Foi por isso que o top-5 por engajamento de 2026-07-11 veio
 * dominado por guru motivacional e IA-anime — o oposto do posicionamento do
 * Tiago — e a auditoria puniu criativos que nunca foram selecionados por fit.
 * Este módulo escolhe o que benchmarkar por alinhamento, antes de baixar nada.
 *
 * 100% genérico: tudo vem do brand-identity do cliente, nada hardcoded.
 */

/** Carrega e achata os sinais de fit do brand-identity do cliente. */
function loadFitProfile(brandIdentityPath) {
    const bi = yaml.load(fs.readFileSync(brandIdentityPath, 'utf8')) || {};
    const tom = bi.tom_de_voz || {};
    const lexico = tom.lexico || {};

    const pilares = (bi.pilares_de_conteudo || []).map(p => ({
        id: p.id,
        nome: p.nome,
        peso: parseFloat(String(p.frequencia_alvo || '0').replace('%', '')) / 100 || 0,
        // Keywords do pilar = tokens da descrição + nome (o sinal textual do tema).
        keywords: tokenize(`${p.nome || ''} ${p.descricao || ''}`).filter(t => t.length >= 4),
    }));

    return {
        sempreUsar: (lexico.sempre_usar || []).map(norm),
        // O léxico pode vir malformado em alguns clientes (nota conhecida na
        // virals) — degradar para lista vazia é honesto, não quebra o score.
        nuncaUsar: (lexico.nunca_usar || []).map(norm),
        frasesAssinatura: (tom.frases_chave_assinatura || []).map(norm),
        pilares,
        principios: (tom.principios || []).map(norm),
    };
}

function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(s) {
    return norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Sinal de "MOSTRAR > DIZER": números concretos no texto (%, R$, ×, mil, ROI…). */
function temEvidenciaNumerica(texto) {
    return /\d+[%x×]|\br\$|\d+\s*(mil|milh|k\b|reais)|\bcac\b|\broi\b|\bltv\b|\d{2,}/i.test(texto || '');
}

const PRIORITY_WEIGHT = { high: 12, medium: 0, low: -8 };

/**
 * Pontua um post. Devolve score 0–100 + a decomposição (para o relatório
 * explicar POR QUE — um fit sem justificativa não orienta decisão).
 *
 * @param {object} post - { text, identifier, priority, subtype/type }
 * @param {object} fit  - saída de loadFitProfile
 */
function scorePost(post, fit) {
    const texto = norm(post.text || '');
    const tokens = new Set(tokenize(post.text || ''));
    const reasons = [];
    let score = 50; // neutro; sinais empurram para os dois lados

    // 1. Léxico da marca (o vocabulário é a impressão digital da voz)
    const positivos = fit.sempreUsar.filter(w => tokens.has(w) || texto.includes(w));
    if (positivos.length) {
        const g = Math.min(positivos.length * 6, 24);
        score += g;
        reasons.push(`+${g} léxico da marca (${positivos.slice(0, 4).join(', ')})`);
    }
    const negativos = fit.nuncaUsar.filter(w => tokens.has(w) || texto.includes(w));
    if (negativos.length) {
        const p = Math.min(negativos.length * 10, 30);
        score -= p;
        reasons.push(`−${p} termos proibidos (${negativos.slice(0, 3).join(', ')})`);
    }

    // 2. Frase-assinatura literal = fortíssimo sinal de voz
    const assinaturas = fit.frasesAssinatura.filter(f => f && texto.includes(f));
    if (assinaturas.length) {
        score += 12;
        reasons.push(`+12 bordão da marca ("${assinaturas[0]}")`);
    }

    // 3. Pilar de conteúdo dominante (tema alinhado, ponderado pela frequência-alvo)
    let melhorPilar = null, melhorHits = 0;
    for (const pilar of fit.pilares) {
        const hits = pilar.keywords.filter(k => tokens.has(k)).length;
        if (hits > melhorHits) { melhorHits = hits; melhorPilar = pilar; }
    }
    if (melhorPilar && melhorHits > 0) {
        const g = Math.round(Math.min(melhorHits * 4, 16) * (0.5 + melhorPilar.peso));
        score += g;
        reasons.push(`+${g} pilar "${melhorPilar.id}" (${melhorHits} termos)`);
        post._pilar = melhorPilar.id;
    }

    // 4. Evidência numérica (princípio MOSTRAR > DIZER)
    if (temEvidenciaNumerica(post.text)) {
        score += 8;
        reasons.push('+8 evidência numérica (MOSTRAR > DIZER)');
    }

    // 5. Priority editorial do perfil (curadoria que o dono já fez à mão)
    const pw = PRIORITY_WEIGHT[String(post.priority || 'medium').toLowerCase()] ?? 0;
    if (pw) {
        score += pw;
        reasons.push(`${pw > 0 ? '+' : ''}${pw} perfil ${post.priority}`);
    }

    // Sem texto, o fit é indeterminado — não fingir precisão.
    const semTexto = !post.text || tokenize(post.text).length < 3;
    if (semTexto) reasons.push('⚠️ sem caption — fit por sinais estruturais apenas (baixa confiança)');

    return {
        fitScore: Math.max(0, Math.min(100, Math.round(score))),
        reasons,
        confidence: semTexto ? 'baixa' : (positivos.length || melhorHits ? 'alta' : 'média'),
        pilar: post._pilar || null,
    };
}

module.exports = { loadFitProfile, scorePost, temEvidenciaNumerica, tokenize, norm };
