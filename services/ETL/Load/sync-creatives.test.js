const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    buildVersionCommentPayload, slugFromBrief, findLatestRenderAnyKind, pickDeliverables,
} = require('./sync-creatives');

test('buildVersionCommentPayload: 1 bullet com link por arquivo enviado', () => {
    const payload = buildVersionCommentPayload({
        uploadedFiles: [{ name: 'single.png', url: 'https://x.clickup-attachments.com/a.png' }],
        runDir: 'outputs/oraclum/posts/slug/run__ts',
        timestamp: '2026-08-17T18:00:00.000Z',
    });
    assert.equal(payload.notify_all, false);
    const linked = payload.comment.find((c) => c.attributes && c.attributes.link);
    assert.equal(linked.text, 'single.png');
    assert.equal(linked.attributes.link, 'https://x.clickup-attachments.com/a.png');
    // o "\n" logo depois carrega o attributes.list (formato específico do ClickUp)
    const idx = payload.comment.indexOf(linked);
    assert.deepEqual(payload.comment[idx + 1].attributes.list, { list: 'bullet' });
});

test('buildVersionCommentPayload: múltiplos arquivos viram múltiplos bullets, na ordem', () => {
    const payload = buildVersionCommentPayload({
        uploadedFiles: [
            { name: 'slide_01.png', url: 'https://x/1.png' },
            { name: 'slide_02.png', url: 'https://x/2.png' },
        ],
        runDir: 'outputs/oraclum/carousels/slug/run__ts',
        timestamp: '2026-08-17T18:00:00.000Z',
    });
    const links = payload.comment.filter((c) => c.attributes && c.attributes.link).map((c) => c.text);
    assert.deepEqual(links, ['slide_01.png', 'slide_02.png']);
});

test('buildVersionCommentPayload: cabeçalho leva o timestamp e a pasta do run', () => {
    const payload = buildVersionCommentPayload({
        uploadedFiles: [{ name: 'a.png', url: 'https://x/a.png' }],
        runDir: 'outputs/oraclum/posts/slug/run__ts',
        timestamp: '2026-08-17T18:00:00.000Z',
    });
    const header = payload.comment.map((c) => c.text).join('');
    assert.match(header, /2026-08-17T18:00:00\.000Z/);
    assert.match(header, /outputs\/oraclum\/posts\/slug\/run__ts/);
});

test('slugFromBrief: lê de post_brief.slug', () => {
    assert.equal(slugFromBrief({ post_brief: { slug: 'v5-single-x' } }), 'v5-single-x');
});

test('findLatestRenderAnyKind: pasta inexistente -> vazio, não quebra', () => {
    const res = findLatestRenderAnyKind('_test-fixture-sync-creatives', 'nao-existe');
    assert.deepEqual(res.assets, []);
    assert.equal(res.runDir, null);
});

test('pickDeliverables: vídeo substituindo um slide vence o png/webp do mesmo basename', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-creatives-'));
    try {
        fs.writeFileSync(path.join(dir, 'slide_01.png'), 'x');
        fs.writeFileSync(path.join(dir, 'slide_01.webp'), 'x');
        fs.writeFileSync(path.join(dir, 'slide_02.mp4'), 'x'); // slide trocado por vídeo
        fs.writeFileSync(path.join(dir, 'slide_03.png'), 'x');
        fs.writeFileSync(path.join(dir, 'slide_03.webp'), 'x');
        fs.writeFileSync(path.join(dir, 'carousel_manifest.json'), '{}');
        fs.writeFileSync(path.join(dir, 'carousel_x.zip'), 'x');
        const picked = pickDeliverables(dir).map((p) => path.basename(p));
        assert.deepEqual(picked, ['slide_01.png', 'slide_02.mp4', 'slide_03.png']);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('pickDeliverables: arquivo sem convenção slide_NN (export manual) ainda é pego', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-creatives-'));
    try {
        fs.writeFileSync(path.join(dir, 'Video Project 1.mp4'), 'x');
        fs.writeFileSync(path.join(dir, 'carousel_manifest.json'), '{}');
        fs.writeFileSync(path.join(dir, 'carousel_x.zip'), 'x');
        const picked = pickDeliverables(dir).map((p) => path.basename(p));
        assert.deepEqual(picked, ['Video Project 1.mp4']);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
