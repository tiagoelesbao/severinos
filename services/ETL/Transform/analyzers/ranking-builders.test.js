const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildGeneralRanking, buildFitRanking, withNormalizedScore, shortcodeFromUrl, captionOf, shortDescription } = require('./ranking-builders');
const { loadFitProfile } = require('./fit-scorer');

const POSTS = [
    { platform: 'youtube', identifier: '@ytbig', score: 8000, metrics: { likes: 2000, comments: 100, views: 50000 }, url: 'https://youtube.com/watch?v=AAA', text: 'como escalar aquisição' },
    { platform: 'instagram', identifier: '@igmid', score: 3000, metrics: { likes: 2900, comments: 20, views: 0 }, url: 'https://instagram.com/x/reel/BBB/', text: 'olha o log do sistema rodando: benchmark com número real' },
    { platform: 'instagram', identifier: '@igguru', score: 500, metrics: { likes: 480, comments: 4, views: 0 }, url: 'https://instagram.com/x/p/CCC/', text: 'o segredo da mentoria e do empreendedorismo' },
];

// ── withNormalizedScore ──────────────────────────────────────────────────────
test('withNormalizedScore: reescala 0–100 DENTRO de cada plataforma', () => {
    const n = withNormalizedScore(POSTS);
    const yt = n.find(p => p.platform === 'youtube');
    const igTop = n.filter(p => p.platform === 'instagram').sort((a, b) => b.scoreNorm - a.scoreNorm)[0];
    // O maior de cada plataforma vira 100 — YouTube não domina só por ter views.
    assert.equal(yt.scoreNorm, 100);
    assert.equal(igTop.scoreNorm, 100);
});

test('withNormalizedScore: plataforma com score zero não quebra (div/0)', () => {
    const n = withNormalizedScore([{ platform: 'tiktok', score: 0, metrics: {} }]);
    assert.equal(n[0].scoreNorm, 0);
});

// ── buildGeneralRanking ──────────────────────────────────────────────────────
test('buildGeneralRanking: lista todas as coletas, ordenado por Norm', () => {
    const md = buildGeneralRanking(POSTS, '2026-07-17', 36, ['instagram', 'youtube']);
    assert.match(md, /Coletas Gerais/);
    assert.match(md, /Total coletado:\*\* 3/);
    // As 3 coletas aparecem
    for (const p of POSTS) assert.ok(md.includes(p.identifier), `${p.identifier} ausente`);
});

test('buildGeneralRanking: vazio não quebra', () => {
    assert.match(buildGeneralRanking([], '2026-07-17', 36, ['instagram']), /Nenhuma coleta/);
});

test('buildGeneralRanking: coluna de checkbox pra sondagem do dia', () => {
    const md = buildGeneralRanking(POSTS, '2026-07-17', 36, ['instagram', 'youtube']);
    assert.match(md, /\| Sondagem \|/);
    // 3 posts -> 3 linhas de dados, cada uma com checkbox desmarcado.
    const checkboxLines = md.split('\n').filter((l) => l.startsWith('| [ ] |'));
    assert.equal(checkboxLines.length, 3);
});

// ── buildFitRanking ──────────────────────────────────────────────────────────
function fit() {
    return loadFitProfile(require('path').resolve(__dirname, '../../../../squads/virals-marketing-squad/data/clients/tiago-elesbao/brand-identity.yaml'));
}

test('buildFitRanking: ordena por fit, NÃO por engajamento', () => {
    const client = { slug: 'tiago-elesbao', nomeExibicao: 'Tiago Elesbão' };
    const md = buildFitRanking(POSTS, fit(), client, '2026-07-17');

    // O @igmid (log/sistema/benchmark/número) deve ranquear ACIMA do @ytbig,
    // mesmo tendo MENOS engajamento — é o ponto inteiro do fit ranking.
    const posIgmid = md.indexOf('@igmid');
    const posYtbig = md.indexOf('@ytbig');
    const posGuru = md.indexOf('@igguru');
    assert.ok(posIgmid < posYtbig, 'post alinhado deve vir antes do mais engajado');
    assert.ok(posIgmid < posGuru, 'post alinhado deve vir antes do guru');
    assert.match(md, /Confluência/);
});

test('buildFitRanking: guru (termos proibidos) fica no fundo', () => {
    const client = { slug: 'tiago-elesbao', nomeExibicao: 'Tiago Elesbão' };
    const md = buildFitRanking(POSTS, fit(), client, '2026-07-17');
    // Última linha de dados menciona o guru.
    const linhas = md.split('\n').filter(l => l.startsWith('| ') && /@ig|@yt/.test(l));
    assert.match(linhas[linhas.length - 1], /@igguru/);
});

test('buildFitRanking: seção de recomendados só lista fit >= 60', () => {
    const client = { slug: 'tiago-elesbao', nomeExibicao: 'Tiago Elesbão' };
    const md = buildFitRanking(POSTS, fit(), client, '2026-07-17');
    if (md.includes('Recomendados para benchmark')) {
        const sec = md.split('Recomendados para benchmark')[1];
        assert.doesNotMatch(sec, /@igguru/, 'guru nunca pode ser recomendado');
    }
});

test('buildFitRanking: coluna de checkbox pra sondagem do dia', () => {
    const client = { slug: 'tiago-elesbao', nomeExibicao: 'Tiago Elesbão' };
    const md = buildFitRanking(POSTS, fit(), client, '2026-07-17');
    assert.match(md, /\| Sondagem \|/);
    const checkboxLines = md.split('\n').filter((l) => l.startsWith('| [ ] |'));
    assert.equal(checkboxLines.length, 3);
});

// ── captionOf / shortDescription ────────────────────────────────────────────
test('captionOf: cadeia de fallback description > text > caption > title (scrapers não são consistentes no nome do campo)', () => {
    assert.equal(captionOf({ description: 'A' }), 'A');
    assert.equal(captionOf({ text: 'B' }), 'B');
    assert.equal(captionOf({ caption: 'C' }), 'C');
    assert.equal(captionOf({ title: 'D' }), 'D');
    assert.equal(captionOf({ description: 'A', text: 'B' }), 'A');
    assert.equal(captionOf({}), '');
});

test('shortDescription: trunca, remove quebra de linha e "|" (quebraria a tabela markdown)', () => {
    assert.equal(shortDescription({ description: 'linha1\nlinha2   com | pipe' }), 'linha1 linha2 com / pipe');
    const longa = 'x'.repeat(100);
    const short = shortDescription({ description: longa }, 60);
    assert.equal(short.length, 60);
    assert.match(short, /…$/);
});

test('shortDescription: sem legenda nenhuma -> travessão, não string vazia (célula de tabela)', () => {
    assert.equal(shortDescription({}), '—');
});

test('buildGeneralRanking/buildFitRanking: coluna Descrição presente e populada', () => {
    const md = buildGeneralRanking(POSTS, '2026-07-17', 36, ['instagram', 'youtube']);
    assert.match(md, /\| Descrição \|/);
    assert.match(md, /como escalar aquisição/);
});

// ── shortcodeFromUrl ─────────────────────────────────────────────────────────
test('shortcodeFromUrl: extrai de reel/p/watch', () => {
    assert.equal(shortcodeFromUrl('https://instagram.com/x/reel/DaoHRljTgIo/'), 'DaoHRljTgIo');
    assert.equal(shortcodeFromUrl('https://instagram.com/x/p/ABC123/'), 'ABC123');
    assert.equal(shortcodeFromUrl('https://youtube.com/watch?v=xyz_789'), 'xyz_789');
});
