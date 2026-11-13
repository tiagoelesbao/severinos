const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { scanBenchmarkFolders, loadMap } = require('./sync-benchmark-to-clickup');

/** Monta uma árvore workspaces/businesses/{client}/marketing/daily-monitoring/{date}/...
 * igual à real, num tmpdir, e aponta __dirname-relative via override não é possível
 * (o módulo resolve path fixo relativo a services/ETL/Load) — então os testes aqui
 * validam a FORMA das funções puras usando o layout real do repo (fixture descartável
 * dentro de workspaces/businesses/_test-fixture/, removida no fim de cada teste). */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FIXTURE_CLIENT = '_test-fixture-sync';
const FIXTURE_DATE = '2099-01-02';
const FIXTURE_DIR = path.join(REPO_ROOT, 'workspaces/businesses', FIXTURE_CLIENT, 'marketing/daily-monitoring', FIXTURE_DATE);

function cleanup() {
    const base = path.join(REPO_ROOT, 'workspaces/businesses', FIXTURE_CLIENT);
    if (fs.existsSync(base)) fs.rmSync(base, { recursive: true, force: true });
}

test('scanBenchmarkFolders + loadMap: casa Benchmark.json com o mapa via URL', () => {
    cleanup();
    try {
        fs.mkdirSync(path.join(FIXTURE_DIR, 'benchmark', 'instagram', '01-fulano-abc123'), { recursive: true });
        fs.writeFileSync(
            path.join(FIXTURE_DIR, 'benchmark', 'instagram', '01-fulano-abc123', 'Benchmark.json'),
            JSON.stringify({ url: 'https://instagram.com/x/reel/AAA/', item_status: 'ok', platform: 'instagram', creator: '@fulano' })
        );
        fs.writeFileSync(
            path.join(FIXTURE_DIR, `_lote-clickup-map-${FIXTURE_DATE}.json`),
            JSON.stringify([{ url: 'https://instagram.com/x/reel/AAA/', identifier: '@fulano', platform: 'instagram', loteId: 'L1', loteName: 'Lote de Conteúdos 99', subtaskId: 'S1' }])
        );

        const byUrl = scanBenchmarkFolders(FIXTURE_CLIENT, FIXTURE_DATE);
        assert.ok(byUrl['https://instagram.com/x/reel/AAA/']);
        assert.equal(byUrl['https://instagram.com/x/reel/AAA/'].benchmark.item_status, 'ok');

        const map = loadMap(FIXTURE_CLIENT, FIXTURE_DATE);
        assert.equal(map.length, 1);
        assert.equal(map[0].subtaskId, 'S1');
    } finally {
        cleanup();
    }
});

test('scanBenchmarkFolders: pasta benchmark/ inexistente devolve objeto vazio, não quebra', () => {
    cleanup();
    try {
        fs.mkdirSync(FIXTURE_DIR, { recursive: true });
        const byUrl = scanBenchmarkFolders(FIXTURE_CLIENT, FIXTURE_DATE);
        assert.deepEqual(byUrl, {});
    } finally {
        cleanup();
    }
});

test('loadMap: sem arquivo de mapa lança erro claro (dependência do create-lote não rodou)', () => {
    cleanup();
    try {
        fs.mkdirSync(FIXTURE_DIR, { recursive: true });
        assert.throws(() => loadMap(FIXTURE_CLIENT, FIXTURE_DATE), /Mapa não encontrado/);
    } finally {
        cleanup();
    }
});
