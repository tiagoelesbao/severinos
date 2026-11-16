const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { findRenderedSlides, buildFinalCopyText, slugFromBrief } = require('./run-design-creative');

test('slugFromBrief: lê de post_brief.slug (post único) — NÃO é o nome da pasta de benchmark', () => {
    assert.equal(slugFromBrief({ post_brief: { slug: 'v5-single-abc-123' } }), 'v5-single-abc-123');
});

test('slugFromBrief: lê de carousel_brief.slug quando post_brief ausente', () => {
    assert.equal(slugFromBrief({ carousel_brief: { slug: 'v5-carousel-xyz' } }), 'v5-carousel-xyz');
});

test('slugFromBrief: nenhum dos dois -> null (caller cai pro fallback)', () => {
    assert.equal(slugFromBrief({}), null);
});

test('buildFinalCopyText: junta headline/sub_headline/body por slide', () => {
    const brief = { content_data: [{ headline: 'H1', body_text: 'B1' }, { headline: 'H2', sub_headline: 'S2' }] };
    const text = buildFinalCopyText(brief);
    assert.match(text, /Headline: H1/);
    assert.match(text, /Body: B1/);
    assert.match(text, /Sub-headline: S2/);
});

test('buildFinalCopyText: sem content_data não quebra', () => {
    assert.equal(buildFinalCopyText({}), '');
});

test('findRenderedSlides: post único acha "single.png" (não slide_NN.png)', () => {
    const REPO_ROOT = path.resolve(__dirname, '../../..');
    const baseDir = path.join(REPO_ROOT, 'outputs', '_test-fixture-design', 'posts', 'fixture-slug');
    const runDir = path.join(baseDir, 'single-post__20990101T000000');
    try {
        fs.mkdirSync(runDir, { recursive: true });
        fs.writeFileSync(path.join(runDir, 'single.png'), 'x');
        fs.writeFileSync(path.join(runDir, 'single.webp'), 'x');
        fs.writeFileSync(path.join(baseDir, '_latest.txt'), 'single-post__20990101T000000');

        const { slides } = findRenderedSlides('_test-fixture-design', 'single', 'fixture-slug');
        assert.equal(slides.length, 1);
        assert.match(slides[0], /single\.png$/);
    } finally {
        fs.rmSync(path.join(REPO_ROOT, 'outputs', '_test-fixture-design'), { recursive: true, force: true });
    }
});

test('findRenderedSlides: carrossel acha múltiplos slide_NN.png em ordem, ignora .webp', () => {
    const REPO_ROOT = path.resolve(__dirname, '../../..');
    const baseDir = path.join(REPO_ROOT, 'outputs', '_test-fixture-design', 'carousels', 'fixture-slug');
    const runDir = path.join(baseDir, 'carousel-slide__20990101T000000');
    try {
        fs.mkdirSync(runDir, { recursive: true });
        fs.writeFileSync(path.join(runDir, 'slide_01.png'), 'x');
        fs.writeFileSync(path.join(runDir, 'slide_02.png'), 'x');
        fs.writeFileSync(path.join(runDir, 'slide_01.webp'), 'x');
        fs.writeFileSync(path.join(baseDir, '_latest.txt'), 'carousel-slide__20990101T000000');

        const { slides } = findRenderedSlides('_test-fixture-design', 'carousel', 'fixture-slug');
        assert.equal(slides.length, 2);
        assert.match(slides[0], /slide_01\.png$/);
        assert.match(slides[1], /slide_02\.png$/);
    } finally {
        fs.rmSync(path.join(REPO_ROOT, 'outputs', '_test-fixture-design'), { recursive: true, force: true });
    }
});

test('findRenderedSlides: pasta inexistente -> lista vazia, não quebra', () => {
    const { slides, runDir } = findRenderedSlides('_test-fixture-design', 'single', 'nao-existe');
    assert.deepEqual(slides, []);
    assert.equal(runDir, null);
});
