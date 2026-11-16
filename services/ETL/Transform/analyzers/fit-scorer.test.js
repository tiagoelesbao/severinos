const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadFitProfile, scorePost, temEvidenciaNumerica } = require('./fit-scorer');

const BI = path.resolve(__dirname, '../../../../squads/virals-marketing-squad/data/clients/tiago-elesbao/brand-identity.yaml');
const fit = loadFitProfile(BI);

test('loadFitProfile: extrai léxico, frases e pilares do brand-identity', () => {
    assert.ok(fit.sempreUsar.includes('sistema'));
    assert.ok(fit.sempreUsar.includes('prova'));
    assert.ok(fit.nuncaUsar.includes('mentoria'));
    assert.ok(fit.pilares.length >= 3);
    // O pilar de maior frequência-alvo (backstage-prova, 40%) tem o maior peso.
    const top = fit.pilares.slice().sort((a, b) => b.peso - a.peso)[0];
    assert.equal(top.id, 'backstage-prova');
});

test('scorePost: conteúdo alinhado (léxico+pilar+número) pontua alto', () => {
    const r = scorePost({ text: 'Olha o log do sistema rodando: o benchmark mediu 233 posts. Prova em movimento.', priority: 'high' }, fit);
    assert.ok(r.fitScore >= 85, `esperava >=85, veio ${r.fitScore}`);
    assert.equal(r.confidence, 'alta');
});

test('scorePost: termos proibidos derrubam o fit', () => {
    const r = scorePost({ text: 'o segredo da mentoria e do empreendedorismo para alavancar', priority: 'medium' }, fit);
    assert.ok(r.fitScore < 40, `esperava <40, veio ${r.fitScore}`);
    assert.ok(r.reasons.some(x => x.includes('proibidos')));
});

test('scorePost: sem caption → baixa confiança, não finge precisão', () => {
    const r = scorePost({ text: '', priority: 'medium' }, fit);
    assert.equal(r.confidence, 'baixa');
    assert.ok(r.reasons.some(x => x.includes('sem caption')));
});

test('scorePost: priority do perfil desloca o fit', () => {
    const base = { text: 'conteúdo neutro qualquer sobre coisas' };
    const high = scorePost({ ...base, priority: 'high' }, fit).fitScore;
    const low = scorePost({ ...base, priority: 'low' }, fit).fitScore;
    assert.ok(high > low, 'perfil high deve pontuar acima de low');
});

test('scorePost: score fica sempre em 0–100', () => {
    const guru = scorePost({ text: 'segredo mentoria empreendedorismo sinergia alavancar holisticamente venha dica', priority: 'low' }, fit);
    const santo = scorePost({ text: 'sistema prova log benchmark número founder bastidor processo evidência construir automação medir', priority: 'high' }, fit);
    assert.ok(guru.fitScore >= 0);
    assert.ok(santo.fitScore <= 100);
});

test('temEvidenciaNumerica: detecta números concretos, ignora texto puro', () => {
    assert.equal(temEvidenciaNumerica('subiu 34% no ROI'), true);
    assert.equal(temEvidenciaNumerica('R$ 2.500 por mês'), true);
    assert.equal(temEvidenciaNumerica('1,8× mais retenção'), true);
    assert.equal(temEvidenciaNumerica('conteúdo motivacional sem dado'), false);
});

test('scorePost: léxico malformado (cliente sem lexico) degrada sem quebrar', () => {
    const fitVazio = { sempreUsar: [], nuncaUsar: [], frasesAssinatura: [], pilares: [], principios: [] };
    const r = scorePost({ text: 'qualquer coisa', priority: 'medium' }, fitVazio);
    assert.ok(r.fitScore >= 0 && r.fitScore <= 100);
});
