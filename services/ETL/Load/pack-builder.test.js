const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildPackTitle, buildPackSections, markdownToSections, statusBadge } = require('./pack-builder');

const OK_BENCHMARK = {
    rank: 2, creator: '@miranhastudios', author: '@miranhastudios', platform: 'instagram',
    type: 'video', subtype: 'reel', url: 'https://www.instagram.com/miranhastudios/reel/Db_z2tdM4o1/',
    view_count: 0, like_count: 43000, comment_count: 1651, duration_seconds: 27.4,
    screenshots_count: 5, item_status: 'ok', status_reason: null, processed_at: '2026-08-16T10:00:00.000Z',
};

const DEGRADED_BENCHMARK = { ...OK_BENCHMARK, item_status: 'degraded', status_reason: 'download falhou, análise só de capa' };

const REAL_ANALISE_MD = `# Análise Base — Video by miranhastudios

**URL:** https://www.instagram.com/x/reel/AAA/

---

## 📊 Métricas Quantitativas

| Métrica | Valor |
| :--- | ---: |
| Sentenças transcritas | 13 |
| Total de palavras | 78 |

## 🧠 Espaço para Auditorias Especializadas

_Auditoria automatizada via *audit-benchmark._

### @mrbeast-mk — Auditor de Retenção

**Score:** 2.5/10  ·  **Veredito:** \`ignorar\`

Texto da auditoria do mrbeast.

### @garyvee-mk — Auditor de Fit de Marca

**Score:** 7.0/10

Texto da auditoria do garyvee.
`;

test('buildPackTitle: rank + plataforma + criador', () => {
    assert.equal(buildPackTitle(OK_BENCHMARK), '#2 · instagram · @miranhastudios');
});

test('statusBadge: ok e degradado têm textos distintos e o degradado avisa pra não decidir em cima', () => {
    assert.match(statusBadge('ok'), /OK/);
    assert.match(statusBadge('degraded'), /DEGRADADO/);
    assert.match(statusBadge('degraded'), /não usar para decisão/);
});

test('markdownToSections: tabela logo após "## " vira table NATIVA da própria section (não uma section à parte)', () => {
    const sections = markdownToSections(REAL_ANALISE_MD);
    const metricas = sections.find((s) => s.header && s.header.includes('Métricas'));
    assert.ok(metricas, 'section de métricas não encontrada');
    assert.ok(metricas.table, 'tabela não anexada à section');
    assert.deepEqual(metricas.table.headers, ['Métrica', 'Valor']);
    assert.equal(metricas.table.rows.length, 2);
});

test('markdownToSections: "### " aninha como subsection dentro do "## " corrente (não section solta)', () => {
    const sections = markdownToSections(REAL_ANALISE_MD);
    const auditorias = sections.find((s) => s.header && s.header.includes('Auditorias'));
    assert.ok(auditorias);
    assert.equal(auditorias.subsections.length, 2);
    assert.match(auditorias.subsections[0].header, /@mrbeast-mk/);
    assert.match(auditorias.subsections[0].content, /Texto da auditoria do mrbeast/);
    assert.match(auditorias.subsections[1].header, /@garyvee-mk/);
});

test('markdownToSections: markdown inline (**bold**, `code`) sai limpo, sem asteriscos/crase literais', () => {
    const sections = markdownToSections(REAL_ANALISE_MD);
    const auditorias = sections.find((s) => s.header && s.header.includes('Auditorias'));
    assert.doesNotMatch(auditorias.subsections[0].content, /\*\*/);
    assert.doesNotMatch(auditorias.subsections[0].content, /`/);
});

test('markdownToSections: string vazia não quebra', () => {
    assert.deepEqual(markdownToSections(''), []);
});

test('markdownToSections: CRLF (Windows) não deixa \\r sobrando no content — Google Docs descarta e desalinha índice', () => {
    const crlf = REAL_ANALISE_MD.replace(/\n/g, '\r\n');
    const sections = markdownToSections(crlf);
    const auditorias = sections.find((s) => s.header && s.header.includes('Auditorias'));
    assert.doesNotMatch(auditorias.subsections[0].content, /\r/);
    assert.deepEqual(sections, markdownToSections(REAL_ANALISE_MD));
});

test('buildPackSections: metadata vem primeiro com tabela + status badge', () => {
    const sections = buildPackSections(OK_BENCHMARK, REAL_ANALISE_MD, 'Minuto 0: fala tal coisa');
    assert.equal(sections[0].header, 'Metadata');
    assert.match(sections[0].content, /OK — assets reais/);
    assert.ok(sections[0].table.rows.some((r) => r[0] === 'Likes' && r[1] === '43.000'));
});

test('buildPackSections: degradado carrega o aviso na section de Metadata', () => {
    const sections = buildPackSections(DEGRADED_BENCHMARK, REAL_ANALISE_MD, 'x');
    assert.match(sections[0].content, /DEGRADADO — não usar para decisão — download falhou/);
});

test('buildPackSections: análise/transcrição ausentes viram section com aviso, não quebram', () => {
    const sections = buildPackSections(OK_BENCHMARK, '', '');
    const analise = sections.find((s) => s.header === 'Análise');
    const transcricao = sections.find((s) => s.header === 'Transcrição');
    assert.equal(analise.content, 'Análise ainda não gerada.');
    assert.equal(transcricao.content, 'Transcrição não disponível.');
});
