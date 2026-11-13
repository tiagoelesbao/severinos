const { test } = require('node:test');
const assert = require('node:assert/strict');

const { shortcodeFrom, parseSlides, parseCaption, desescapar } = require('./instagram-embed');

test('shortcodeFrom: extrai de todas as formas de URL do IG', () => {
    assert.equal(shortcodeFrom('https://www.instagram.com/garyvee/p/DanKfWZDrmE/'), 'DanKfWZDrmE');
    assert.equal(shortcodeFrom('https://www.instagram.com/p/DanKfWZDrmE/'), 'DanKfWZDrmE');
    assert.equal(shortcodeFrom('https://www.instagram.com/pablomarcal1/reel/DaoHRljTgIo/'), 'DaoHRljTgIo');
    assert.equal(shortcodeFrom('https://www.instagram.com/p/DanKfWZDrmE/?igsh=abc'), 'DanKfWZDrmE');
    assert.equal(shortcodeFrom('https://www.youtube.com/watch?v=abc'), null);
});

test('desescapar: desfaz os escapes empilhados do blob do embed', () => {
    // O embed serve JSON dentro de string JSON: as barras chegam duplamente escapadas.
    assert.equal(desescapar('https:\\\\/\\\\/cdn.com\\\\/img.jpg'), 'https://cdn.com/img.jpg');
    assert.equal(desescapar('a\\u0026b'), 'a&b');
});

test('parseSlides: carrossel real — pai duplicado é descartado', () => {
    // Estrutura fiel ao embed: o post pai repete o display_url do 1º filho.
    const blob = `
      "display_url":"https://cdn.com/v/t51/111111_1_1_n.jpg","is_video":false,
      "edge_sidecar_to_children":{"edges":[
        {"node":{"display_url":"https://cdn.com/v/t51/111111_1_1_n.jpg","is_video":false}},
        {"node":{"display_url":"https://cdn.com/v/t51/222222_2_2_n.jpg","is_video":false}},
        {"node":{"display_url":"https://cdn.com/v/t51/333333_3_3_n.jpg","is_video":true,"video_url":"https://cdn.com/v.mp4"}}
      ]}`;

    const { slides, videoUrls } = parseSlides(blob);

    assert.equal(slides.length, 3, 'pai duplicado não pode virar slide extra');
    assert.equal(slides[0].displayUrl.includes('111111'), true);
    assert.equal(slides[1].displayUrl.includes('222222'), true);
    assert.equal(slides[2].isVideo, true, 'slide de vídeo é marcado para o yt-dlp');
    assert.equal(videoUrls.length, 1);
});

test('parseSlides: post de imagem única', () => {
    const blob = `"display_url":"https://cdn.com/v/t51/999999_9_9_n.jpg","is_video":false`;
    const { slides } = parseSlides(blob);
    assert.equal(slides.length, 1);
    assert.equal(slides[0].isVideo, false);
});

test('parseSlides: blob vazio não inventa slides', () => {
    assert.equal(parseSlides('{}').slides.length, 0);
});

test('parseCaption: extrai texto e decodifica unicode', () => {
    const blob = '"edge_media_to_caption":{"edges":[{"node":{"text":"Sneakers de edi\\u00e7\\u00e3o limitada"}}]}';
    assert.equal(parseCaption(blob), 'Sneakers de edição limitada');
});

test('parseCaption: sem caption devolve vazio', () => {
    assert.equal(parseCaption('{"outra_coisa":1}'), '');
});
