const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { buildVideoModelingSections, buildDesignModelingSections } = require('./modeling-plan-builder');

test('buildVideoModelingSections: reaproveita o parser de markdown do pack-builder', () => {
    const md = '## Storyboard\n\n### Cena 1\n\nAbre com...\n';
    const sections = buildVideoModelingSections(md);
    const s = sections.find((x) => x.header && x.header.includes('Storyboard'));
    assert.ok(s);
    assert.equal(s.subsections[0].header, 'Cena 1');
});

test('buildDesignModelingSections: com brief real do repo (brief-v5-02-garyvee-337571.yaml)', () => {
    const p = path.resolve(__dirname, '../../../squads/virals-marketing-squad/data/brief-v5-02-garyvee-337571.yaml');
    const brief = yaml.load(fs.readFileSync(p, 'utf-8'));
    const sections = buildDesignModelingSections(brief);

    const analise = sections.find((s) => s.header === 'Análise do Benchmark');
    assert.ok(analise.content.length > 0);

    const plano = sections.find((s) => s.header === 'Plano de Modelagem');
    assert.match(plano.content, /quote|Arquétipo/);
    assert.ok(plano.subsections.length >= 1);
    assert.match(plano.subsections[0].header, /^Slide 1/);
    assert.match(plano.subsections[0].content, /Papel:|Direção/);
});

test('buildDesignModelingSections: brief sem content_plan/benchmark_analysis não quebra', () => {
    const sections = buildDesignModelingSections({});
    assert.equal(sections.length, 2);
    assert.match(sections[0].content, /ainda não dispon/);
    assert.equal(sections[1].subsections.length, 0);
});
