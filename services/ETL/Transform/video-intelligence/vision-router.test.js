const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ehGratuito, aceitaImagem, serveParaDescricao, ROTEADOR_OFICIAL, FALLBACK_ESTATICO } = require('./vision-router');

test('ehGratuito: só passa quem cobra zero nas duas pontas', () => {
    assert.equal(ehGratuito({ pricing: { prompt: '0', completion: '0' } }), true);
    assert.equal(ehGratuito({ pricing: { prompt: '0', completion: '0.0000012' } }), false);
    assert.equal(ehGratuito({ pricing: { prompt: '0.0000005', completion: '0' } }), false);
    assert.equal(ehGratuito({}), true, 'sem pricing = 0 (o catálogo omite em modelos free)');
});

test('aceitaImagem: exige a modalidade image declarada', () => {
    assert.equal(aceitaImagem({ architecture: { input_modalities: ['text', 'image'] } }), true);
    assert.equal(aceitaImagem({ architecture: { input_modalities: ['text'] } }), false);
    assert.equal(aceitaImagem({}), false);
});

test('serveParaDescricao: exclui quem aceita imagem para OUTRA finalidade', () => {
    // O catálogo marca estes com input_modalities:[image], mas nenhum descreve
    // criativo: lyria gera música, content-safety devolve veredito de moderação.
    // Sem o filtro, a cascata gasta tentativas (e minutos) com quem nunca serve.
    assert.equal(serveParaDescricao('google/lyria-3-pro-preview'), false);
    assert.equal(serveParaDescricao('nvidia/nemotron-3.5-content-safety:free'), false);
    assert.equal(serveParaDescricao('meta-llama/llama-guard-4:free'), false);

    // Os que de fato descreveram o criativo no teste real de 2026-07-16:
    assert.equal(serveParaDescricao('google/gemma-4-31b-it:free'), true);
    assert.equal(serveParaDescricao('google/gemma-4-26b-a4b-it:free'), true);
    assert.equal(serveParaDescricao(ROTEADOR_OFICIAL), true);
});

test('FALLBACK_ESTATICO: existe, começa pelo roteador oficial e só tem modelos úteis', () => {
    // Rede de segurança para quando o catálogo não responder. Se o fallback
    // apodrecer como a lista antiga, voltamos ao bug — por isso ele é curto e
    // encabeçado pelo roteador, que resolve disponibilidade na origem.
    assert.ok(FALLBACK_ESTATICO.length > 0);
    assert.equal(FALLBACK_ESTATICO[0], ROTEADOR_OFICIAL);
    FALLBACK_ESTATICO.forEach(id => assert.equal(serveParaDescricao(id), true, `${id} não serve para descrição`));
});

test('discoverFreeVisionModels: nunca lança e sempre devolve lista utilizável', async () => {
    const { discoverFreeVisionModels } = require('./vision-router');
    const lista = await discoverFreeVisionModels();

    assert.ok(Array.isArray(lista) && lista.length > 0, 'visão pode degradar; o pipeline não pode quebrar por ela');
    assert.equal(lista[0], ROTEADOR_OFICIAL, 'o roteador oficial deve ser a primeira tentativa');
    lista.forEach(id => assert.equal(typeof id, 'string'));
});
