const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Downloader = require('./downloader');

function tmpDownloader() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-dl-'));
    return { dir, downloader: new Downloader(dir) };
}

test('probe: reconhece reel do IG como vídeo (base do guard de degradação)', async () => {
    const { downloader } = tmpDownloader();
    const reel = await downloader.probe('https://www.instagram.com/pablomarcal1/reel/DaoHRljTgIo/');
    assert.equal(reel.platform, 'instagram');
    assert.equal(reel.type, 'video');

    const post = await downloader.probe('https://www.instagram.com/pablomarcal1/p/DanGlfeSLMx/');
    assert.equal(post.type, 'post');
});

test('createRunDir: isola cada execução em diretório próprio', () => {
    const { downloader } = tmpDownloader();
    const a = downloader.createRunDir();
    const b = downloader.createRunDir();

    assert.notEqual(a, b, 'duas execuções não podem compartilhar diretório');
    assert.ok(fs.existsSync(a) && fs.existsSync(b));
});

test('collectRunFiles: enxerga só os arquivos da própria execução', () => {
    const { dir, downloader } = tmpDownloader();
    const runA = downloader.createRunDir();
    const runB = downloader.createRunDir();

    fs.writeFileSync(path.join(runA, 'content_AAA.mp4'), 'a');
    fs.writeFileSync(path.join(runA, 'content_AAA.info.json'), '{}');
    fs.writeFileSync(path.join(runB, 'content_BBB.mp4'), 'b');
    // Lixo histórico na raiz do outputDir: o filtro antigo por mtime podia adotá-lo.
    fs.writeFileSync(path.join(dir, 'content_ANTIGO.mp4'), 'velho');

    const a = downloader.collectRunFiles(runA);
    assert.equal(a.videoFile, 'content_AAA.mp4');
    assert.equal(a.infoJsonFile, 'content_AAA.info.json');

    assert.equal(downloader.collectRunFiles(runB).videoFile, 'content_BBB.mp4');
});

test('collectRunFiles: diretório inexistente devolve vazio sem lançar', () => {
    const { downloader } = tmpDownloader();
    const r = downloader.collectRunFiles(path.join(os.tmpdir(), 'nao-existe-vex14'));
    assert.deepEqual(r, { videoFile: null, imageFiles: [], infoJsonFile: null });
});

test('buildResult: lê info.json, monta metadata e consome o arquivo', () => {
    const { downloader } = tmpDownloader();
    const runDir = downloader.createRunDir();
    fs.writeFileSync(path.join(runDir, 'v.mp4'), 'x');
    fs.writeFileSync(path.join(runDir, 'v.info.json'), JSON.stringify({
        title: 'Reel de teste', uploader: 'fulano', duration: 42, view_count: 100
    }));

    const r = downloader.buildResult(downloader.collectRunFiles(runDir), runDir);

    assert.equal(r.status, 'success');
    assert.equal(r.metadata.title, 'Reel de teste');
    assert.equal(r.metadata.author, 'fulano');
    assert.equal(r.metadata.duration, 42);
    assert.ok(r.videoPath.endsWith('v.mp4'));
    assert.equal(fs.existsSync(path.join(runDir, 'v.info.json')), false, 'info.json é consumido');
});

test('sweepStaleRunDirs: remove runDir velho, preserva recente e o que não é nosso', () => {
    const { dir, downloader } = tmpDownloader();

    const velho = path.join(dir, 'run_velho');
    fs.mkdirSync(velho);
    const passado = new Date(Date.now() - 7 * 3600000);
    fs.utimesSync(velho, passado, passado);

    const recente = path.join(dir, 'run_recente');
    fs.mkdirSync(recente);
    // Isolar por execução sem limpar trocaria colisão de arquivo por vazamento
    // de disco — mas a limpeza não pode passar por cima do que não criamos.
    const alheio = path.join(dir, 'downloads-do-usuario');
    fs.mkdirSync(alheio);
    fs.utimesSync(alheio, passado, passado);
    const solto = path.join(dir, 'video.mp4');
    fs.writeFileSync(solto, 'x');

    downloader.sweepStaleRunDirs(6);

    assert.equal(fs.existsSync(velho), false, 'runDir velho deve ser removido');
    assert.equal(fs.existsSync(recente), true, 'runDir recente pode estar em uso');
    assert.equal(fs.existsSync(alheio), true, 'pasta que não criamos é intocável');
    assert.equal(fs.existsSync(solto), true, 'arquivo solto é intocável');
});
