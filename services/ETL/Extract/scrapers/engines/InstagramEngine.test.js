const { test } = require('node:test');
const assert = require('node:assert/strict');

const InstagramEngine = require('./InstagramEngine');

function fakeEngine() {
    // parent mínimo (só logDiagnostic); a janela de lookback é setada direto.
    const eng = new InstagramEngine({ logDiagnostic: () => {}, context: null });
    eng.now = new Date('2026-07-19T12:00:00Z');
    eng.lookbackLimit = new Date('2026-07-01T12:00:00Z');
    return eng;
}

test('_usernameFrom: extrai o handle da URL do perfil', () => {
    const eng = fakeEngine();
    assert.equal(eng._usernameFrom('https://www.instagram.com/community_ca/', '@x'), 'community_ca');
    assert.equal(eng._usernameFrom('https://instagram.com/uana_amorim', '@uana_amorim'), 'uana_amorim');
    // sem URL utilizável → cai no identifier
    assert.equal(eng._usernameFrom('', '@fallback'), 'fallback');
});

test('_usernameFrom: não confunde /p/ ou /reel/ com username', () => {
    const eng = fakeEngine();
    assert.equal(eng._usernameFrom('https://www.instagram.com/p/ABC/', '@real'), 'real');
});

test('score é derivado das métricas (views×0,1 + likes + comments×5)', () => {
    const eng = fakeEngine();
    assert.equal(eng.calculateScore({ views: 0, likes: 20, comments: 0 }), 20);
    assert.equal(eng.calculateScore({ views: 100, likes: 10, comments: 2 }), 0.1 * 100 + 10 + 5 * 2);
});
