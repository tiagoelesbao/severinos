const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildCaptionPrompt, parseCaptionResponse } = require('./caption-generator');

test('buildCaptionPrompt: inclui copy final, legenda original e a regra de não inventar', () => {
    const prompt = buildCaptionPrompt({
        clientName: 'Oraclum',
        finalCopyText: 'Headline: Automatize processos\nBody: economize 5h/semana',
        originalDescription: 'Legenda original com #ia #automacao',
    });
    assert.match(prompt, /Oraclum/);
    assert.match(prompt, /Automatize processos/);
    assert.match(prompt, /#ia #automacao/);
    assert.match(prompt, /não\s+invente/);
});

test('buildCaptionPrompt: sem copy final avisa explicitamente (não silencia a ausência)', () => {
    const prompt = buildCaptionPrompt({ clientName: 'Oraclum', finalCopyText: '', originalDescription: 'x' });
    assert.match(prompt, /sem copy — não gerar legenda sem isso/);
});

test('parseCaptionResponse: remove aspas envolvendo o texto todo e espaços nas pontas', () => {
    assert.equal(parseCaptionResponse('  "Automatize processos #ia"  '), 'Automatize processos #ia');
});

test('parseCaptionResponse: null/vazio -> null, não string vazia', () => {
    assert.equal(parseCaptionResponse(''), null);
    assert.equal(parseCaptionResponse(null), null);
});
