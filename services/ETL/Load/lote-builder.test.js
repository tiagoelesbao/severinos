const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    parseCheckedRows, dedupeByUrl, inferTaskType, reconcileTaskType, nextLoteNumber,
    buildLoteName, buildSubtaskName, urlHash, TASK_TYPE_IDS,
} = require('./lote-builder');
const { buildGeneralRanking, buildFitRanking } = require('../Transform/analyzers/ranking-builders');
const { loadFitProfile } = require('../Transform/analyzers/fit-scorer');

const POSTS = [
    { platform: 'instagram', identifier: '@reel1', score: 9000, metrics: { likes: 8000, comments: 200, views: 0 }, url: 'https://instagram.com/x/reel/AAA/', description: 'Automação de IA processando dados em tempo real na tela' },
    { platform: 'instagram', identifier: '@post1', score: 500, metrics: { likes: 480, comments: 4, views: 0 }, url: 'https://instagram.com/x/p/BBB/', text: 'texto' },
    { platform: 'youtube', identifier: '@yt1', score: 3000, metrics: { likes: 2000, comments: 20, views: 50000 }, url: 'https://youtube.com/watch?v=CCC', text: 'texto' },
];

// ── parseCheckedRows / dedupeByUrl ──────────────────────────────────────────
test('parseCheckedRows: ignora [ ] desmarcado, pega só [x]', () => {
    const md = buildGeneralRanking(POSTS, '2026-08-17', 48, ['instagram', 'youtube']);
    // Marca manualmente a 1ª linha (simula o humano marcando no arquivo real).
    const marked = md.replace('| [ ] | 1 |', '| [x] | 1 |');
    const rows = parseCheckedRows(marked);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].identifier, '@reel1');
    assert.equal(rows[0].url, 'https://instagram.com/x/reel/AAA/');
    assert.match(rows[0].description, /Automação de IA/);
});

test('parseCheckedRows: descrição "—" (sem caption capturada) vira null, não a string travessão', () => {
    const semCaption = [{ platform: 'instagram', identifier: '@semcaption', score: 100, metrics: {}, url: 'https://instagram.com/x/reel/ZZZ/' }];
    const md = buildGeneralRanking(semCaption, '2026-08-17', 48, ['instagram']);
    const marked = md.replace('| [ ] | 1 |', '| [x] | 1 |');
    const rows = parseCheckedRows(marked);
    assert.equal(rows[0].description, null);
});

test('parseCheckedRows: aceita [X] maiúsculo também', () => {
    const md = buildGeneralRanking(POSTS, '2026-08-17', 48, ['instagram', 'youtube']);
    const line = md.split('\n').find((l) => l.startsWith('| [ ] |') && l.includes('@post1'));
    const marked = md.replace(line, line.replace('[ ]', '[X]'));
    const rows = parseCheckedRows(marked);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].identifier, '@post1');
});

test('parseCheckedRows: nenhum marcado -> lista vazia, não quebra', () => {
    const md = buildGeneralRanking(POSTS, '2026-08-17', 48, ['instagram', 'youtube']);
    assert.deepEqual(parseCheckedRows(md), []);
});

test('parseCheckedRows: funciona igual no ranking de fit (colunas diferentes)', () => {
    const client = { slug: 'tiago-elesbao', nomeExibicao: 'Tiago' };
    const fit = loadFitProfile(require('path').resolve(__dirname, '../../../squads/virals-marketing-squad/data/clients/tiago-elesbao/brand-identity.yaml'));
    const md = buildFitRanking(POSTS, fit, client, '2026-08-17');
    const firstDataLine = md.split('\n').find((l) => l.startsWith('| [ ] | 1 |'));
    const marked = md.replace(firstDataLine, firstDataLine.replace('[ ]', '[x]'));
    const rows = parseCheckedRows(marked);
    assert.equal(rows.length, 1);
});

test('dedupeByUrl: mesma URL marcada nos dois rankings conta 1x', () => {
    const rows = [
        { url: 'https://instagram.com/x/reel/AAA/', identifier: '@a' },
        { url: 'https://instagram.com/x/reel/AAA/', identifier: '@a' },
        { url: 'https://instagram.com/x/p/BBB/', identifier: '@b' },
    ];
    assert.equal(dedupeByUrl(rows).length, 2);
});

// ── inferTaskType ────────────────────────────────────────────────────────────
test('inferTaskType: /reel/ -> Vídeo Curto, confiante', () => {
    const t = inferTaskType('https://instagram.com/x/reel/AAA/', 'instagram');
    assert.equal(t.typeId, TASK_TYPE_IDS.videoCurto);
    assert.equal(t.confident, true);
});

test('inferTaskType: tiktok sempre Vídeo Curto', () => {
    const t = inferTaskType('https://tiktok.com/@x/video/123', 'tiktok');
    assert.equal(t.typeId, TASK_TYPE_IDS.videoCurto);
});

test('inferTaskType: watch?v= -> Vídeo Longo', () => {
    const t = inferTaskType('https://youtube.com/watch?v=CCC', 'youtube');
    assert.equal(t.typeId, TASK_TYPE_IDS.videoLongo);
});

test('inferTaskType: /p/ -> Post, mas SEM confiança (pode ser carrossel)', () => {
    const t = inferTaskType('https://instagram.com/x/p/BBB/', 'instagram');
    assert.equal(t.typeId, TASK_TYPE_IDS.post);
    assert.equal(t.confident, false);
});

// ── reconcileTaskType ────────────────────────────────────────────────────────
test('reconcileTaskType: carousel real corrige o palpite "Post" do inferTaskType (caso real 2026-08-17)', () => {
    const t = reconcileTaskType('carousel');
    assert.equal(t.typeId, TASK_TYPE_IDS.carrossel);
    assert.equal(t.typeName, 'Carrocel');
});

test('reconcileTaskType: image-single confirma Post', () => {
    assert.equal(reconcileTaskType('image-single').typeId, TASK_TYPE_IDS.post);
});

test('reconcileTaskType: video-short/video-long mapeiam certo', () => {
    assert.equal(reconcileTaskType('video-short').typeId, TASK_TYPE_IDS.videoCurto);
    assert.equal(reconcileTaskType('video-long').typeId, TASK_TYPE_IDS.videoLongo);
});

test('reconcileTaskType: tipo desconhecido -> null (não reconcilia, mantém palpite)', () => {
    assert.equal(reconcileTaskType('unknown'), null);
    assert.equal(reconcileTaskType(undefined), null);
});

// ── nextLoteNumber ───────────────────────────────────────────────────────────
test('nextLoteNumber: pega o maior número entre listas diferentes', () => {
    const names = ['Lote de Conteúdos 01', 'Lote de Conteúdos 02', 'Outra Task Qualquer'];
    assert.equal(nextLoteNumber(names), '03');
});

test('nextLoteNumber: lista vazia -> 01', () => {
    assert.equal(nextLoteNumber([]), '01');
});

test('nextLoteNumber: ignora nomes parecidos mas não numéricos', () => {
    assert.equal(nextLoteNumber(['Lote de Conteúdos Especial', 'Lote de Conteúdos 05']), '06');
});

test('nextLoteNumber: reconhece o formato NOVO ("Lote LNN - data") junto do legado', () => {
    assert.equal(nextLoteNumber(['Lote de Conteúdos 01', 'Lote de Conteúdos 02', 'Lote L03 - 2026-08-15']), '04');
});

// ── buildLoteName / buildSubtaskName / urlHash ──────────────────────────────
test('buildLoteName: tag + data (calibração 2026-08-17)', () => {
    assert.equal(buildLoteName('04', '2026-08-17'), 'Lote L04 - 2026-08-17');
});

test('urlHash: 6 hex chars, determinístico (mesmo algoritmo do run-creative-benchmark.js)', () => {
    const h = urlHash('https://instagram.com/x/reel/AAA/');
    assert.match(h, /^[0-9a-f]{6}$/);
    assert.equal(h, urlHash('https://instagram.com/x/reel/AAA/'));
});

test('buildSubtaskName: hash + identifier + descrição — não só "@handle · plataforma"', () => {
    const row = { url: 'https://instagram.com/x/reel/AAA/', identifier: '@aitrendz.xyz', description: 'Automação de IA em tempo real' };
    const name = buildSubtaskName(row);
    assert.match(name, /^[0-9a-f]{6} · @aitrendz\.xyz · Automação de IA/);
});

test('buildSubtaskName: sem descrição não quebra, fica marcado explicitamente', () => {
    const name = buildSubtaskName({ url: 'https://instagram.com/x/reel/AAA/', identifier: '@x', description: null });
    assert.match(name, /sem descrição/);
});
