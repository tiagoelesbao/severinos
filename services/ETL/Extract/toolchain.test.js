const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ensureYtDlpFresh, toolAgeDays } = require('./toolchain');

function fakeBin(ageDays = 0) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vex14-'));
    const bin = path.join(dir, 'yt-dlp.exe');
    fs.writeFileSync(bin, 'fake');
    if (ageDays > 0) {
        const past = new Date(Date.now() - ageDays * 86400000);
        fs.utimesSync(bin, past, past);
    }
    return bin;
}

test('toolAgeDays: binário recém-criado ~0 dias; ausente = Infinity', () => {
    assert.ok(toolAgeDays(fakeBin(0)) < 0.01);
    assert.equal(toolAgeDays(path.join(os.tmpdir(), 'nao-existe-vex14.exe')), Infinity);
});

test('toolAgeDays: mtime antigo é refletido', () => {
    assert.ok(Math.abs(toolAgeDays(fakeBin(30)) - 30) < 0.1);
});

test('ensureYtDlpFresh: binário novo NÃO dispara update', () => {
    let chamou = false;
    const r = ensureYtDlpFresh(fakeBin(1), { maxAgeDays: 7, exec: () => { chamou = true; } });

    assert.equal(r.updated, false);
    assert.equal(r.reason, 'fresh');
    assert.equal(chamou, false, 'não deve gastar rede com binário novo');
});

test('ensureYtDlpFresh: binário velho dispara -U e registra versão', () => {
    const args = [];
    const r = ensureYtDlpFresh(fakeBin(30), {
        maxAgeDays: 7,
        exec: (bin, argv) => {
            args.push(argv[0]);
            return Buffer.from(argv[0] === '--version' ? '2026.07.04' : 'Updated yt-dlp');
        }
    });

    assert.equal(r.updated, true);
    assert.equal(r.version, '2026.07.04');
    assert.deepEqual(args, ['-U', '--version']);
});

test('ensureYtDlpFresh: update que falha é NÃO-FATAL (contrato AC1)', () => {
    const r = ensureYtDlpFresh(fakeBin(30), {
        maxAgeDays: 7,
        exec: () => { throw new Error('getaddrinfo ENOTFOUND github.com'); }
    });

    assert.equal(r.updated, false);
    assert.equal(r.reason, 'update-failed');
    assert.match(r.warning, /E1/);
    assert.match(r.warning, /seguindo com a versão atual/);
});

test('ensureYtDlpFresh: binário ausente avisa sem lançar', () => {
    const r = ensureYtDlpFresh(path.join(os.tmpdir(), 'nao-existe-vex14.exe'), { exec: () => {} });
    assert.equal(r.updated, false);
    assert.equal(r.reason, 'binary-missing');
    assert.match(r.warning, /não encontrado/);
});

test('ensureYtDlpFresh: backup é criado antes do update (permite reverter)', () => {
    const bin = fakeBin(30);
    ensureYtDlpFresh(bin, { maxAgeDays: 7, exec: () => Buffer.from('2026.07.04') });
    assert.ok(fs.existsSync(`${bin}.bak`), 'backup deve existir para o rollback do preflight');
});

test('ensureYtDlpFresh: stamp evita reconferir binário velho porém atual', () => {
    const bin = fakeBin(30);
    ensureYtDlpFresh(bin, { maxAgeDays: 7, exec: () => Buffer.from('2026.07.04') });

    // "already up to date" não toca o mtime — sem o stamp, o próximo run
    // tentaria atualizar de novo.
    let chamou = false;
    const segundo = ensureYtDlpFresh(bin, { maxAgeDays: 7, exec: () => { chamou = true; } });
    assert.equal(segundo.reason, 'fresh');
    assert.equal(chamou, false);
});
