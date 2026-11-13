/**
 * Pack Builder — monta o conteúdo do Google Doc que espelha o pack de
 * benchmark de UM criativo (Benchmark.json + Análise.md + Transcrição.md).
 *
 * Puro/testável: recebe os 3 documentos já carregados (JSON parseado + strings
 * markdown), devolve `sections[]` no formato que createAdvancedDoc() (Google
 * Docs API) consome — headings e tabelas NATIVOS, não texto com `##`/`|` cru.
 * Não fala com Drive nem com filesystem — isso é do orquestrador
 * (sync-benchmark-to-clickup.js).
 *
 * Trocado de ClickUp Doc → Google Doc por feedback do fundador (2026-08-16):
 * abrir o Doc do ClickUp em nova janela quebrava o fluxo de revisão; Drive já
 * tem pasta por cliente e é onde ele efetivamente relê os packs.
 *
 * Screenshots NÃO entram aqui — sobem como anexo nativo da task no ClickUp
 * (thumbnail visual, zero navegação), não faz sentido embutir binário no doc.
 */

/** Análise.md/Transcrição.md são markdown real (##/### + tabelas |...|) — a
 * Google Docs API não interpreta markdown, então isso vira sections com
 * heading/table NATIVOS (createAdvancedDoc), e o resto vira parágrafo puro
 * com a pontuação de markdown que não dá pra renderizar (**bold**, `code`)
 * removida — melhor texto limpo do que asteriscos literais na tela.
 */
function stripInlineMd(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^#{1,6}\s*/, '')
        .trim();
}

function parseMarkdownTable(lines) {
    // lines: ["| A | B |", "| :-- | --: |", "| 1 | 2 |", ...]
    const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => stripInlineMd(c.trim()));
    const headers = cellsOf(lines[0]);
    const rows = lines.slice(2).map(cellsOf); // lines[1] é o separador ---
    return { headers, rows };
}

/** Converte um markdown (Análise.md ou Transcrição.md) em sections[] pro
 * createAdvancedDoc, preservando os 2 níveis reais que a Análise.md usa:
 * '## ' vira section top-level (HEADING_1), '### ' aninhado por baixo do
 * '## ' corrente vira subsection (HEADING_2) — é assim que "🧠 Espaço para
 * Auditorias" + "### @mrbeast-mk"/"### @garyvee-mk"/... já vêm estruturados.
 * Tabela logo após um '## ' (antes de qualquer '###') vira section.table
 * nativa; fora disso vira uma table-section própria. */
function markdownToSections(md) {
    // Análise.md/Transcrição.md são gerados no Windows (CRLF). O Google Docs
    // API descarta o \r silenciosamente ao inserir texto, então um cálculo de
    // índice cumulativo do lado JS (que conta o \r) desalinha e estoura o
    // índice real do doc a partir de um certo tamanho (bug real visto em
    // produção 2026-08-16: "Index N must be less than the end index..." no
    // createAdvancedDoc). Normalizar aqui, na origem, é mais correto do que
    // remendar a contagem de índice no lado do Google Docs helper.
    const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
    const sections = [];
    let topSection = null;
    let subSection = null;
    let buffer = [];

    const activeTarget = () => subSection || topSection;

    const flushParagraph = () => {
        const text = buffer.join('\n').trim();
        buffer = [];
        if (!text) return;
        const target = activeTarget();
        if (target) target.content = target.content ? `${target.content}\n\n${text}` : text;
        else sections.push({ content: text });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:-]+\|/.test(lines[i + 1])) {
            flushParagraph();
            const tableLines = [line];
            let j = i + 1;
            while (j < lines.length && /^\s*\|/.test(lines[j])) { tableLines.push(lines[j]); j++; }
            const table = parseMarkdownTable(tableLines);
            if (topSection && !subSection && !topSection.table) topSection.table = table;
            else sections.push({ table });
            i = j - 1;
            continue;
        }

        if (/^##\s+/.test(line)) {
            flushParagraph();
            topSection = { header: stripInlineMd(line), content: '', subsections: [] };
            subSection = null;
            sections.push(topSection);
            continue;
        }
        if (/^###\s+/.test(line)) {
            flushParagraph();
            subSection = { header: stripInlineMd(line), content: '' };
            if (topSection) topSection.subsections.push(subSection);
            else sections.push(subSection);
            continue;
        }
        if (/^#\s+/.test(line) || /^---+\s*$/.test(line)) continue; // título (já vai no doc) / hr

        buffer.push(stripInlineMd(line));
    }
    flushParagraph();
    return sections;
}

function fmtNumber(n) {
    return n == null ? '—' : Number(n).toLocaleString('pt-BR');
}

function statusBadge(itemStatus) {
    const map = {
        ok: '🟢 OK — assets reais',
        degraded: '🟠 DEGRADADO — não usar para decisão',
        failed: '🔴 FALHA',
        timeout: '⏱️ TIMEOUT',
        skipped_unknown: '⚪ NÃO CLASSIFICADO',
    };
    return map[itemStatus] || `⚪ ${itemStatus || 'desconhecido'}`;
}

function buildPackTitle(benchmark) {
    const platform = benchmark.platform || '?';
    const creator = benchmark.author || benchmark.creator || '?';
    return `#${benchmark.rank ?? '?'} · ${platform} · ${creator}`;
}

/** Monta o sections[] completo pro createAdvancedDoc: metadata (tabela nativa)
 * + Análise.md (parseado, com auditorias já aninhadas) + Transcrição.md. */
function buildPackSections(benchmark, analiseMd, transcricaoMd) {
    const b = benchmark || {};
    const statusLine = `${statusBadge(b.item_status)}${b.status_reason ? ` — ${b.status_reason}` : ''}`;

    const metadata = {
        header: 'Metadata',
        content: statusLine,
        table: {
            headers: ['Campo', 'Valor'],
            rows: [
                ['Plataforma', b.platform || '—'],
                ['Criador', b.author || b.creator || '—'],
                ['Tipo', `${b.type || '—'}${b.subtype ? ` / ${b.subtype}` : ''}`],
                ['Link original', b.url || '—'],
                ['Views', fmtNumber(b.view_count)],
                ['Likes', fmtNumber(b.like_count)],
                ['Comentários', fmtNumber(b.comment_count)],
                ['Duração', b.duration_seconds ? `${Math.round(b.duration_seconds)}s` : '—'],
                ['Frames capturados', `${b.screenshots_count ?? 0} (anexados na task do ClickUp)`],
                ['Processado em', b.processed_at || '—'],
            ],
        },
    };

    const analiseSections = analiseMd && analiseMd.trim()
        ? [{ header: 'Análise' }, ...markdownToSections(analiseMd)]
        : [{ header: 'Análise', content: 'Análise ainda não gerada.' }];

    const transcricaoSections = transcricaoMd && transcricaoMd.trim()
        ? [{ header: 'Transcrição' }, ...markdownToSections(transcricaoMd)]
        : [{ header: 'Transcrição', content: 'Transcrição não disponível.' }];

    return [metadata, ...analiseSections, ...transcricaoSections];
}

module.exports = { buildPackTitle, buildPackSections, markdownToSections, statusBadge };
