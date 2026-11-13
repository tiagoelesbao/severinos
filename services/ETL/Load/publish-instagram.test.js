const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildPublishPlan, buildTaskXml, toLocalIsoNoTz, scheduledTaskName } = require('./publish-instagram');
const { PACK_CRIATIVOS_APROVADOS_FIELD_ID, CAPTION_FIELD_ID } = require('./_clickup_config');

function fields({ pack, caption }) {
    return [
        { id: PACK_CRIATIVOS_APROVADOS_FIELD_ID, value: pack },
        { id: CAPTION_FIELD_ID, value: caption },
    ];
}

test('buildPublishPlan: 1 imagem -> kind "single"', () => {
    const plan = buildPublishPlan(fields({
        pack: [{ url: 'https://x/a.png', title: 'slide_01.png', mimetype: 'image/png' }],
        caption: 'legenda',
    }));
    assert.equal(plan.kind, 'single');
    assert.deepEqual(plan.assets, [{ url: 'https://x/a.png', title: 'slide_01.png', type: 'image' }]);
    assert.equal(plan.caption, 'legenda');
});

test('buildPublishPlan: 1 vídeo -> tipo "video", ainda "single"', () => {
    const plan = buildPublishPlan(fields({
        pack: [{ url: 'https://x/a.mp4', title: 'Video Project 1.mp4', mimetype: 'video/mp4' }],
        caption: '',
    }));
    assert.equal(plan.kind, 'single');
    assert.equal(plan.assets[0].type, 'video');
});

test('buildPublishPlan: 3 arquivos misturados -> kind "carousel", ordem preservada', () => {
    const plan = buildPublishPlan(fields({
        pack: [
            { url: 'https://x/1.png', title: 'slide_01.png', mimetype: 'image/png' },
            { url: 'https://x/2.mp4', title: 'slide_02.mp4', mimetype: 'video/mp4' },
            { url: 'https://x/3.png', title: 'slide_03.png', mimetype: 'image/png' },
        ],
        caption: 'legenda longa',
    }));
    assert.equal(plan.kind, 'carousel');
    assert.deepEqual(plan.assets.map((a) => a.type), ['image', 'video', 'image']);
    assert.deepEqual(plan.assets.map((a) => a.title), ['slide_01.png', 'slide_02.mp4', 'slide_03.png']);
});

test('buildPublishPlan: sem campo de pack -> kind "none", não quebra', () => {
    const plan = buildPublishPlan([{ id: CAPTION_FIELD_ID, value: 'legenda' }]);
    assert.equal(plan.kind, 'none');
    assert.deepEqual(plan.assets, []);
    assert.equal(plan.caption, 'legenda');
});

test('buildPublishPlan: campo de pack presente mas vazio -> kind "none"', () => {
    const plan = buildPublishPlan(fields({ pack: [], caption: '' }));
    assert.equal(plan.kind, 'none');
});

test('buildPublishPlan: sem legenda -> string vazia, não undefined/null', () => {
    const plan = buildPublishPlan(fields({
        pack: [{ url: 'https://x/a.png', title: 'a.png', mimetype: 'image/png' }],
    }));
    assert.equal(plan.caption, '');
});

test('toLocalIsoNoTz: formata sem timezone, campos com zero à esquerda', () => {
    assert.equal(toLocalIsoNoTz(new Date(2026, 0, 5, 9, 3, 7)), '2026-01-05T09:03:07');
});

test('scheduledTaskName: determinístico por task+horário, sem espaço/caractere especial', () => {
    const d = new Date(2026, 7, 18, 22, 15, 0);
    const name = scheduledTaskName('86ak1ebr9', d);
    assert.equal(name, `IGPublish_86ak1ebr9_${d.getTime()}`);
    assert.doesNotMatch(name, /[\s&<>"']/);
});

test('buildTaskXml: escapa "&" e outros especiais — regressão do bug real de produção (2026-08-18, "XML mal construído")', () => {
    const xml = buildTaskXml({
        description: 'Cliente A & B <teste>',
        startBoundaryLocalIso: '2026-08-25T14:30:05',
        command: 'C:\\node.exe',
        args: '"arg com & e <tag>"',
        workingDirectory: 'C:\\a & b',
    });
    // todo "&" no XML final tem que abrir uma entidade válida — nenhum "&" cru
    const bareAmpersand = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    assert.equal(bareAmpersand, null, `encontrou "&" cru: ${bareAmpersand}`);
    assert.match(xml, /Cliente A &amp; B &lt;teste&gt;/);
    assert.match(xml, /C:\\a &amp; b/);
});
