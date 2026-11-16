const { test } = require('node:test');
const assert = require('node:assert/strict');

const fs = require('fs');
const os = require('os');
const path = require('path');

const { deriveItemStatus, auditAssets, auditAnalysis, summarize, renderDegradedSection } = require('./benchmark-status');

function tmpSlides(conteudos) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-assets-'));
    return conteudos.map((c, i) => {
        const p = path.join(dir, `slide_${String(i + 1).padStart(2, '0')}.png`);
        fs.writeFileSync(p, c);
        return p;
    });
}

/** Um PNG "de verdade" precisa passar do piso de 5KB do audit. */
const bloco = (semente) => Buffer.alloc(20000, semente);

test('regressão VEX-14/carrossel: 15 prints IDÊNTICOS de login wall NÃO são sucesso', () => {
    // O caso real de 2026-07-16: o modal "Sign up / Log in" do Instagram cobriu
    // o post, a seta do carrossel ficou bloqueada e o scraper fotografou o
    // mesmo modal 15 vezes. Tinha download success, classificação carousel e
    // "15 screenshots" — passou como ok e foi para auditoria como se fosse o
    // criativo do GaryVee.
    const slides = tmpSlides(Array.from({ length: 15 }, () => bloco('M')));

    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'post',
        classification: { type: 'carousel', subtype: 'ig-carousel', engine: 'ImageAnalyzer' },
        analyzerStatus: 'ok',
        screenshots: slides.length,
        screenshotPaths: slides
    });

    assert.equal(r.status, 'degraded', 'prints idênticos não podem passar como ok');
    assert.match(r.reason, /IDÊNTICOS/);
});

test('auditAssets: carrossel real (slides diferentes) passa', () => {
    const slides = tmpSlides([bloco('A'), bloco('B'), bloco('C')]);
    assert.equal(auditAssets(slides).ok, true);
});

test('auditAssets: slide único não é comparado consigo mesmo', () => {
    assert.equal(auditAssets(tmpSlides([bloco('A')])).ok, true);
});

test('auditAssets: prints truncados são degradação (distintos, para isolar do guard de duplicata)', () => {
    // Conteúdos DIFERENTES e minúsculos: se fossem iguais, o guard de duplicata
    // dispararia primeiro e este teste não provaria nada sobre o de tamanho.
    const r = auditAssets(tmpSlides(['a', 'bb']));
    assert.equal(r.ok, false);
    assert.match(r.reason, /vazios ou truncados/);
});

test('auditAssets: prints vazios idênticos também são degradação (por qualquer guard)', () => {
    assert.equal(auditAssets(tmpSlides(['', ''])).ok, false);
});

test('auditAssets: paths inexistentes são degradação', () => {
    const r = auditAssets([path.join(os.tmpdir(), 'nao-existe-vex14.png')]);
    assert.equal(r.ok, false);
    assert.match(r.reason, /não existem/);
});

test('auditAssets: sem screenshots não inventa falha (vídeo já é coberto por outro guard)', () => {
    assert.equal(auditAssets([]).ok, true);
});

test('auditAnalysis: erro da visão dentro do markdown NÃO é análise', () => {
    // Caso real de 2026-07-16: assets perfeitos (5 slides distintos do CDN), mas
    // Gemini com quota estourada e os 4 modelos :free do OpenRouter
    // descontinuados. A Transcrição.md saiu com "Erro Final na Visão" no lugar
    // da análise — e o item passou como ok. Terceira encarnação do mesmo bug.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-tr-'));
    const p = path.join(dir, 'Transcricao.md');
    fs.writeFileSync(p, `# Transcrição\n\n## Slide 01\n\n_Erro Final na Visão: No endpoints found for mistralai/pixtral-12b:free._\n`);

    const r = auditAnalysis(p);
    assert.equal(r.ok, false);
    assert.match(r.reason, /análise não produzida/);
});

test('auditAnalysis: análise de verdade passa', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-tr-'));
    const p = path.join(dir, 'Transcricao.md');
    fs.writeFileSync(p, '# Transcrição\n\n## Slide 01\n\nHook em caixa alta sobre fundo azul; sneaker centralizado.\n');
    assert.equal(auditAnalysis(p).ok, true);
});

test('auditAnalysis: arquivo ausente é degradação', () => {
    const r = auditAnalysis(path.join(os.tmpdir(), 'nao-existe-vex14.md'));
    assert.equal(r.ok, false);
    assert.match(r.reason, /não foi gerada/);
});

test('auditAnalysis: sem path não inventa falha', () => {
    assert.equal(auditAnalysis(null).ok, true);
});

test('deriveItemStatus: assets ótimos + visão fora do ar = degradado', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-full-'));
    const tr = path.join(dir, 'Transcricao.md');
    fs.writeFileSync(tr, '_Erro Final na Visão: No endpoints found._');
    const slides = tmpSlides([bloco('A'), bloco('B'), bloco('C')]);

    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'post',
        classification: { type: 'carousel', subtype: 'ig-carousel' },
        analyzerStatus: 'ok',
        screenshots: 3,
        screenshotPaths: slides,
        transcriptPath: tr
    });

    assert.equal(r.status, 'degraded', 'baixar o criativo não basta: sem análise não há benchmark');
});

test('auditAssets: aceita a forma {path} dos analyzers, não só strings', () => {
    // Bug real: os analyzers devolvem {time, label, path} e o guard recebia os
    // objetos crus → fs.existsSync(objeto) = false → TODO carrossel bom foi
    // reprovado como "screenshots não existem". Guard que reprova por formato
    // de entrada é falso positivo, e falso positivo destrói a confiança no guard.
    const slides = tmpSlides([bloco('A'), bloco('B')]);
    const comoAnalyzer = slides.map((p, i) => ({ time: null, label: `slide ${i + 1}`, path: p }));

    assert.equal(auditAssets(comoAnalyzer).ok, true);
    assert.equal(auditAssets(slides).ok, true, 'strings continuam valendo');
});

test('regressão-âncora VEX-14: o estado de 2026-07-11 é impossível', () => {
    // Reprodução fiel do benchmark quebrado: 5 reels do IG que viraram
    // image-single (thumbnail) + 5 vídeos do YouTube só com metadados.
    // O summary real declarou: total 10, ok 10, failed 0.
    const igReelsComoThumbnail = Array.from({ length: 5 }, () => deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'video', // as URLs eram /reel/ — é isto que denuncia a capa
        classification: { type: 'image-single', subtype: 'ig-image', engine: 'ImageAnalyzer' },
        screenshots: 1
    }));
    const ytSoMetadados = Array.from({ length: 5 }, () => deriveItemStatus({
        downloadStatus: 'metadata_only',
        classification: { type: 'video-short', subtype: 'video', engine: 'VideoAnalyzer', degraded: true },
        screenshots: 0
    }));

    const items = [...igReelsComoThumbnail, ...ytSoMetadados];
    const summary = summarize(items);

    assert.equal(summary.counts.ok, 0, 'nenhum item degradado pode contar como ok');
    assert.equal(summary.counts.degraded, 10);
    assert.equal(summary.exitCode, 1, 'benchmark degradado DEVE sair com código != 0');
    assert.match(summary.verdict, /SEM assets reais/);
});

test('deriveItemStatus: vídeo real baixado e analisado → ok', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'video',
        classification: { type: 'video-short', subtype: 'ig-reel', engine: 'VideoAnalyzer' },
        analyzerStatus: 'ok',
        screenshots: 5
    });
    assert.equal(r.status, 'ok');
    assert.equal(r.reason, null);
});

test('deriveItemStatus: reel entregue como imagem → degraded (capa, não criativo)', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'video',
        classification: { type: 'image-single', subtype: 'ig-image', engine: 'ImageAnalyzer' },
        screenshots: 1
    });
    assert.equal(r.status, 'degraded');
    assert.match(r.reason, /isto é a capa/);
});

test('deriveItemStatus: post estático de verdade continua ok', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'post',
        classification: { type: 'image-single', subtype: 'ig-image', engine: 'ImageAnalyzer' },
        analyzerStatus: 'ok',
        screenshots: 1
    });
    assert.equal(r.status, 'ok');
});

test('deriveItemStatus: carrossel de verdade continua ok', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        expectedType: 'post',
        classification: { type: 'carousel', subtype: 'ig-carousel', engine: 'ImageAnalyzer' },
        analyzerStatus: 'ok',
        screenshots: 4
    });
    assert.equal(r.status, 'ok');
});

test('deriveItemStatus: metadata_only → degraded (o caso do YouTube)', () => {
    const r = deriveItemStatus({
        downloadStatus: 'metadata_only',
        classification: { type: 'video-short', subtype: 'video', degraded: true }
    });
    assert.equal(r.status, 'degraded');
    assert.match(r.reason, /apenas metadados/);
});

test('deriveItemStatus: download_failed → failed', () => {
    const r = deriveItemStatus({ downloadStatus: 'download_failed', classification: {} });
    assert.equal(r.status, 'failed');
});

test('deriveItemStatus: classificação degradada → degraded mesmo com download success', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        classification: { type: 'video-short', subtype: 'ig-reel', degraded: true },
        screenshots: 1
    });
    assert.equal(r.status, 'degraded');
    assert.match(r.reason, /classificação degradada/);
});

test('deriveItemStatus: sem frames → degraded', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        classification: { type: 'video-short', subtype: 'ig-reel' },
        analyzerStatus: 'ok',
        screenshots: 0
    });
    assert.equal(r.status, 'degraded');
    assert.match(r.reason, /nenhum frame/);
});

test('deriveItemStatus: tipo unknown → failed', () => {
    const r = deriveItemStatus({
        downloadStatus: 'success',
        classification: { type: 'unknown', engine: 'NoneAnalyzer', degraded: true }
    });
    assert.equal(r.status, 'failed');
});

test('summarize: tudo ok → exitCode 0', () => {
    const s = summarize([{ status: 'ok' }, { status: 'ok' }]);
    assert.equal(s.exitCode, 0);
    assert.equal(s.unhealthy, 0);
    assert.match(s.verdict, /assets reais/);
});

test('summarize: um único degradado já contamina o exit code', () => {
    const s = summarize([{ status: 'ok' }, { status: 'degraded' }]);
    assert.equal(s.exitCode, 1);
    assert.equal(s.healthy, 1);
    assert.equal(s.unhealthy, 1);
});

test('renderDegradedSection: lista degradados; vazio quando tudo ok', () => {
    assert.equal(renderDegradedSection([{ status: 'ok' }]), '');

    const md = renderDegradedSection([
        { status: 'degraded', rank: 1, platform: 'instagram', creator: '@x', status_reason: 'apenas metadados' }
    ]);
    assert.match(md, /Criativos degradados/);
    assert.match(md, /@x/);
    assert.match(md, /apenas metadados/);
});
