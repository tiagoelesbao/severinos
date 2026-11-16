/**
 * Benchmark Status: deriva o status REAL de um item do benchmark.
 *
 * O bug que originou este módulo (VEX-14): run-creative-benchmark.js devolvia
 * `status: 'ok'` fixo, sem olhar o download_status gravado 9 linhas acima. O
 * summary de 2026-07-11 declarou "10 ok / 0 failed" com ZERO vídeos baixados —
 * e o marketing-chief sintetizou estratégia em cima de thumbnails.
 *
 * Regra: o status nunca é afirmado, é derivado das evidências.
 */

const crypto = require('crypto');
const fs = require('fs');

const OK = 'ok';
const DEGRADED = 'degraded';
const FAILED = 'failed';

/**
 * Marcadores de que a etapa de visão/transcrição não produziu análise e
 * escreveu o próprio erro dentro do markdown entregue. O texto vira "conteúdo"
 * e o item passa como sucesso — mesmo antipadrão dos assets contados sem serem
 * olhados, uma camada acima.
 */
const MARCADORES_DE_FALHA = [
    'Erro Final na Visão',
    'Erro na Visão',
    'No endpoints found',
    'exceeded your current quota',
    'Vídeo indisponível para download',
    'Vídeo não disponível para transcrição',
    'Nenhum conteúdo textual extraído',
    'Análise não disponível'
];

/**
 * Audita o PRODUTO da análise (Transcrição.md), não só os assets.
 * @returns {{ok: boolean, reason: string|null}}
 */
function auditAnalysis(transcriptPath) {
    if (!transcriptPath) return { ok: true, reason: null };
    let texto;
    try {
        if (!fs.existsSync(transcriptPath)) return { ok: false, reason: 'Transcrição.md não foi gerada' };
        texto = fs.readFileSync(transcriptPath, 'utf8');
    } catch (e) {
        return { ok: false, reason: `Transcrição.md ilegível: ${e.message}` };
    }

    const achado = MARCADORES_DE_FALHA.find(m => texto.includes(m));
    if (achado) {
        return { ok: false, reason: `análise não produzida — o arquivo entrega o erro no lugar do conteúdo ("${achado}")` };
    }
    return { ok: true, reason: null };
}

/**
 * Auditoria dos assets capturados. Contar screenshots não prova nada: o
 * benchmark de 2026-07-16 gerou 15 prints de um modal de login do Instagram —
 * todos byte a byte idênticos — e o item passou como `ok` porque "tinha 15
 * screenshots". Asset que existe mas não presta é degradação.
 *
 * @returns {{ok: boolean, reason: string|null}}
 */
function auditAssets(screenshotPaths = []) {
    // Os analyzers devolvem {time, label, path}; o downloader devolve strings.
    // Aceitar as duas formas: um guard que reprova por formato de entrada vira
    // gerador de falso positivo — e um guard em que ninguém confia é pior que
    // guard nenhum.
    const caminhos = screenshotPaths
        .map(p => (p && typeof p === 'object' ? p.path : p))
        .filter(p => typeof p === 'string' && p.length > 0);

    const existentes = caminhos.filter(p => { try { return fs.existsSync(p); } catch { return false; } });

    if (caminhos.length === 0) return { ok: true, reason: null };

    if (existentes.length === 0) {
        return { ok: false, reason: 'screenshots referenciados não existem no disco' };
    }

    // Slides idênticos = a captura não avançou (modal bloqueando a seta do
    // carrossel, por exemplo). Um carrossel real tem slides diferentes.
    if (existentes.length > 1) {
        const hashes = new Set();
        for (const p of existentes) {
            try {
                hashes.add(crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'));
            } catch { /* ilegível entra como distinto; o check de existência acima cobre */ }
        }
        if (hashes.size === 1) {
            return {
                ok: false,
                reason: `${existentes.length} slides IDÊNTICOS — a captura não avançou (provável modal/login wall sobreposto)`
            };
        }
    }

    // Print vazio/minúsculo não carrega criativo nenhum.
    const suspeitos = existentes.filter(p => { try { return fs.statSync(p).size < 5000; } catch { return false; } });
    if (existentes.length > 0 && suspeitos.length === existentes.length) {
        return { ok: false, reason: 'todos os screenshots são vazios ou truncados (< 5KB)' };
    }

    return { ok: true, reason: null };
}

/**
 * @param {object} evidence
 * @param {string} evidence.downloadStatus - 'success' | 'metadata_only' | 'download_failed' | 'unknown'
 * @param {object} evidence.classification - saída do ContentClassifier (pode ter degraded: true)
 * @param {string} [evidence.expectedType] - 'video' | 'post', vindo do probe da URL
 * @param {string} [evidence.analyzerStatus]
 * @param {number} [evidence.screenshots]
 * @param {string[]} [evidence.screenshotPaths] - auditados por conteúdo, não só contados
 * @param {string} [evidence.transcriptPath] - o produto da análise, auditado por conteúdo
 * @returns {{status: string, reason: string|null}}
 */
function deriveItemStatus({ downloadStatus, classification = {}, expectedType, analyzerStatus, screenshots = 0, screenshotPaths = null, transcriptPath = null }) {
    if (downloadStatus === 'download_failed' || downloadStatus === 'unknown') {
        return { status: FAILED, reason: `download falhou (${downloadStatus})` };
    }

    if (classification.type === 'unknown') {
        return { status: FAILED, reason: 'conteúdo não classificável' };
    }

    // O caso de 2026-07-11: o download entregou só metadados, mas o item era
    // reportado como sucesso pleno.
    if (downloadStatus === 'metadata_only') {
        return { status: DEGRADED, reason: 'apenas metadados — sem vídeo/imagem para analisar' };
    }

    // O caso mais traiçoeiro de 2026-07-11: a URL era um /reel/, o scraper
    // resgatou a thumbnail e o classifier viu "1 imagem = post estático" — sem
    // marcar degraded. Download 'success', 1 screenshot, tudo verde, e a
    // auditoria acabou lendo a CAPA do reel. Só a promessa da URL denuncia.
    if (expectedType === 'video' && !String(classification.type).startsWith('video')) {
        return {
            status: DEGRADED,
            reason: `URL de vídeo analisada como ${classification.type} — o criativo não foi baixado, isto é a capa`
        };
    }

    // Reel classificado sem vídeo: a análise é da capa, não do criativo.
    if (classification.degraded) {
        return { status: DEGRADED, reason: `classificação degradada (${classification.type}/${classification.subtype})` };
    }

    if (analyzerStatus && analyzerStatus !== 'ok' && analyzerStatus !== 'success') {
        return { status: DEGRADED, reason: `analyzer: ${analyzerStatus}` };
    }

    if (screenshots === 0) {
        return { status: DEGRADED, reason: 'nenhum frame capturado' };
    }

    // Os assets prestam? Contar não basta.
    if (screenshotPaths && screenshotPaths.length > 0) {
        const audit = auditAssets(screenshotPaths);
        if (!audit.ok) return { status: DEGRADED, reason: audit.reason };
    }

    // E a ANÁLISE saiu? Asset perfeito com visão fora do ar entrega uma
    // Transcrição.md que diz "Erro Final na Visão" — e isso não é benchmark.
    if (transcriptPath) {
        const audit = auditAnalysis(transcriptPath);
        if (!audit.ok) return { status: DEGRADED, reason: audit.reason };
    }

    return { status: OK, reason: null };
}

/**
 * Consolida os itens. `exitCode` != 0 quando há degradado/falha — um pipeline
 * que sai 0 com dado ruim é um pipeline que mente.
 */
function summarize(items) {
    const counts = { ok: 0, degraded: 0, failed: 0, timeout: 0, skipped: 0 };

    for (const item of items) {
        const s = item.status;
        if (counts[s] === undefined) counts[s] = 0;
        counts[s]++;
    }

    const unhealthy = counts.degraded + counts.failed + counts.timeout;
    return {
        counts,
        total: items.length,
        healthy: counts.ok,
        unhealthy,
        exitCode: unhealthy > 0 ? 1 : 0,
        verdict: unhealthy === 0
            ? 'Todos os criativos processados com assets reais.'
            : `⚠️ ${unhealthy}/${items.length} criativo(s) SEM assets reais — a análise destes é de metadados/capa, não do criativo.`
    };
}

/** Bloco markdown dos degradados. Vazio quando está tudo certo. */
function renderDegradedSection(items) {
    const bad = items.filter(i => i.status === DEGRADED || i.status === FAILED || i.status === 'timeout');
    if (bad.length === 0) return '';

    const lines = [
        '',
        '## ⚠️ Criativos degradados (NÃO usar para decisão)',
        '',
        '_Estes itens não tiveram o criativo real baixado. A análise reflete metadados ou capa — descarte-os antes de tirar conclusões._',
        '',
        '| # | Plataforma | Criador | Status | Motivo |',
        '| ---: | :--- | :--- | :--- | :--- |'
    ];
    for (const i of bad) {
        lines.push(`| ${i.rank ?? '—'} | ${i.platform ?? '—'} | ${i.creator ?? '—'} | \`${i.status}\` | ${i.status_reason || '—'} |`);
    }
    lines.push('');
    return lines.join('\n');
}

module.exports = { deriveItemStatus, auditAssets, auditAnalysis, summarize, renderDegradedSection, OK, DEGRADED, FAILED };
