const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { playwrightSessionToNetscape, resolveCookies, looksLikeAuthFailure } = require('./session-bridge');

function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-auth-'));
}

function sessionFixture(dir, cookies) {
    const p = path.join(dir, 'instagram_session.json');
    fs.writeFileSync(p, JSON.stringify({ cookies }));
    return p;
}

test('playwrightSessionToNetscape: converte sessionid para linha Netscape válida', () => {
    const dir = tmpDir();
    const session = sessionFixture(dir, [
        { name: 'sessionid', value: 'abc123', domain: '.instagram.com', path: '/', secure: true, expires: 1800000000 },
        { name: 'csrftoken', value: 'tok', domain: '.instagram.com', path: '/', secure: true, expires: 1800000000 }
    ]);
    const out = path.join(dir, 'out.txt');

    const r = playwrightSessionToNetscape(session, out, 'instagram');

    assert.equal(r.ok, true);
    assert.equal(r.cookieCount, 2);
    assert.equal(r.hasSessionId, true, 'sessionid é o cookie que de fato autentica');

    const content = fs.readFileSync(out, 'utf8');
    assert.match(content, /^# Netscape HTTP Cookie File/);
    // domínio TAB includeSubdomains TAB path TAB secure TAB expires TAB nome TAB valor
    assert.match(content, /\.instagram\.com\tTRUE\t\/\tTRUE\t1800000000\tsessionid\tabc123/);
});

test('playwrightSessionToNetscape: cookie de sessão (expires -1) vira 0', () => {
    const dir = tmpDir();
    const session = sessionFixture(dir, [
        { name: 'sessionid', value: 'v', domain: '.instagram.com', path: '/', secure: true, expires: -1 }
    ]);
    const out = path.join(dir, 'out.txt');

    playwrightSessionToNetscape(session, out, 'instagram');
    assert.match(fs.readFileSync(out, 'utf8'), /TRUE\t0\tsessionid\tv/);
});

test('playwrightSessionToNetscape: filtra cookies de outros domínios', () => {
    const dir = tmpDir();
    const session = sessionFixture(dir, [
        { name: 'sessionid', value: 'v', domain: '.instagram.com', path: '/', secure: true, expires: 1 },
        { name: 'fr', value: 'x', domain: '.facebook.com', path: '/', secure: true, expires: 1 }
    ]);
    const out = path.join(dir, 'out.txt');

    const r = playwrightSessionToNetscape(session, out, 'instagram');
    assert.equal(r.cookieCount, 1);
    assert.doesNotMatch(fs.readFileSync(out, 'utf8'), /facebook/);
});

test('playwrightSessionToNetscape: sessão ausente/ilegível degrada sem lançar', () => {
    const dir = tmpDir();
    assert.equal(playwrightSessionToNetscape(path.join(dir, 'nope.json'), path.join(dir, 'o.txt')).ok, false);

    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, '{ not json');
    const r = playwrightSessionToNetscape(bad, path.join(dir, 'o.txt'));
    assert.equal(r.ok, false);
    assert.match(r.reason, /ilegível/);
});

test('resolveCookies: Instagram NUNCA recebe cookie do YouTube (AC5)', () => {
    const dir = tmpDir();
    // Cenário exato do bug: só o cookie do YouTube existe no disco.
    fs.writeFileSync(path.join(dir, 'www.youtube.com_cookies.txt'), '# yt');

    assert.equal(resolveCookies('instagram', { authDir: dir }), null,
        'sem cookie de IG, o correto é null — jamais o do YouTube');
    assert.match(resolveCookies('youtube', { authDir: dir }), /www\.youtube\.com_cookies\.txt$/);
});

test('resolveCookies: cada plataforma pega o seu arquivo', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'cookies.txt'), '# ig');
    fs.writeFileSync(path.join(dir, 'www.youtube.com_cookies.txt'), '# yt');

    assert.match(resolveCookies('instagram', { authDir: dir }), /[/\\]cookies\.txt$/);
    assert.match(resolveCookies('youtube', { authDir: dir }), /www\.youtube\.com_cookies\.txt$/);
    assert.equal(resolveCookies('plataforma-inexistente', { authDir: dir }), null);
});

test('resolveCookies: preferSession gera cookies com sessionid a partir do storageState', () => {
    const dir = tmpDir();
    sessionFixture(dir, [
        { name: 'sessionid', value: 'live', domain: '.instagram.com', path: '/', secure: true, expires: 1800000000 }
    ]);

    const resolved = resolveCookies('instagram', { authDir: dir, preferSession: true });
    assert.match(fs.readFileSync(resolved, 'utf8'), /sessionid\tlive/);
});

test('resolveCookies: preferSession sem sessão cai no cookie estático', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'cookies.txt'), '# ig');

    assert.match(resolveCookies('instagram', { authDir: dir, preferSession: true }), /[/\\]cookies\.txt$/);
});

test('looksLikeAuthFailure: distingue erro de auth de erro de extractor', () => {
    assert.equal(looksLikeAuthFailure('ERROR: Instagram sent an empty media response'), true);
    assert.equal(looksLikeAuthFailure('ERROR: login required'), true);
    assert.equal(looksLikeAuthFailure('ERROR: Unable to extract player version'), false);
});
