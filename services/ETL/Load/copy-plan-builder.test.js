const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { buildVideoCopySections, buildDesignCopySections } = require('./copy-plan-builder');

test('buildVideoCopySections: reaproveita o parser de markdown (vídeo não tem recast separado)', () => {
    const md = '## Storyboard\n\n### Cena 1\n\nAbre com...\n';
    const sections = buildVideoCopySections(md);
    assert.ok(sections.find((s) => s.header && s.header.includes('Storyboard')));
});

test('buildDesignCopySections: com brief real do repo já com recast+quality_gate (brief-v5-02-garyvee-337571.yaml)', () => {
    const p = path.resolve(__dirname, '../../../squads/virals-marketing-squad/data/brief-v5-02-garyvee-337571.yaml');
    const brief = yaml.load(fs.readFileSync(p, 'utf-8'));
    const sections = buildDesignCopySections(brief);

    const gate = sections.find((s) => s.header === 'Quality Gate');
    assert.ok(gate);
    assert.match(gate.content, /Status:/);

    const copy = sections.find((s) => s.header === 'Copy Final por Slide');
    assert.ok(copy.subsections.length >= 1);
    assert.match(copy.subsections[0].header, /^Slide 1/);
    assert.match(copy.subsections[0].content, /Headline:/);
});

test('buildDesignCopySections: sem quality_gate/content_data não quebra', () => {
    const sections = buildDesignCopySections({});
    assert.equal(sections[0].content, 'Quality gate não rodou.');
    assert.equal(sections[1].subsections.length, 0);
});

test('buildDesignCopySections: quality_gate diferente de PASS carrega aviso', () => {
    const sections = buildDesignCopySections({ quality_gate: { status: 'CONCERNS_COPY', iterations: 2 } });
    assert.match(sections[0].content, /CONCERNS_COPY/);
    assert.match(sections[0].content, /revisar antes de produzir/);
});
