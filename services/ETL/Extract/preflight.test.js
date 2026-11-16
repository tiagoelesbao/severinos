const { test } = require('node:test');
const assert = require('node:assert/strict');

const { LOGIN_SCRIPTS } = require('./preflight');

test('LOGIN_SCRIPTS: aponta para scripts de login que EXISTEM no disco', () => {
    // O bug que este teste tranca: a hint era montada com platform.slice(0,2),
    // gerando "in-login.js" para instagram — arquivo que não existe. Uma hint
    // errada num momento de falha custa mais caro que a falha.
    const fs = require('fs');
    const path = require('path');
    const repoRoot = path.resolve(__dirname, '..', '..', '..');

    for (const [platform, script] of Object.entries(LOGIN_SCRIPTS)) {
        assert.ok(fs.existsSync(path.join(repoRoot, script)),
            `hint de ${platform} aponta para ${script}, que não existe`);
    }
});

test('checkPlatform: sem URL para sondar → passa (não inventa falha)', () => {
    const { checkPlatform } = require('./preflight');
    const r = checkPlatform('instagram', 'yt-dlp.exe', null);
    assert.equal(r.ok, true);
    assert.match(r.remediation, /sem URL/);

    assert.equal(checkPlatform('instagram', 'yt-dlp.exe', []).ok, true);
});

test('MAX_PROBES: sonda mais de uma URL antes de condenar a plataforma', () => {
    const { MAX_PROBES } = require('./preflight');
    // Um link deletado é rotina; uma plataforma quebrada falha em todos. Sondar
    // só o primeiro link transformaria o preflight num gerador de falso
    // negativo — pior que não ter preflight.
    assert.ok(MAX_PROBES >= 2, 'sondar uma única URL torna o preflight frágil a link deletado');
});

test('isVideoUrl: só sonda o que o yt-dlp sabe responder', () => {
    const { isVideoUrl } = require('./preflight');

    assert.equal(isVideoUrl('https://www.instagram.com/hormozi/reel/DaokUOsuGq5/'), true);
    assert.equal(isVideoUrl('https://www.youtube.com/watch?v=j2TZMFkj71Q'), true);
    assert.equal(isVideoUrl('https://www.youtube.com/shorts/abc'), true);
    assert.equal(isVideoUrl('https://www.tiktok.com/@x/video/123'), true);

    // Post estático: yt-dlp falha por motivo legítimo (não há vídeo). Sondá-lo
    // e concluir "plataforma quebrada" abortaria um benchmark saudável — foi o
    // que quase aconteceu na fila curada, salva pelo MAX_PROBES.
    assert.equal(isVideoUrl('https://www.instagram.com/garyvee/p/DanKfWZDrmE/'), false);
});

test('preflight: fila só com estáticos não condena a plataforma', () => {
    const { preflight } = require('./preflight');
    const fila = { instagram: [
        { url: 'https://www.instagram.com/garyvee/p/AAA/' },
        { url: 'https://www.instagram.com/hormozi/p/BBB/' }
    ]};

    // Sem URL sondável, o veredito honesto é "não sei" → deixa passar.
    // Reprovar aqui seria inventar uma falha que não existe.
    const r = preflight(fila, 'yt-dlp-inexistente.exe');
    assert.equal(r.ok, true);
});
