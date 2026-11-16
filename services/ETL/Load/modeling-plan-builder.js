/**
 * Modeling Plan Builder — monta o "Plano de Modelagem" (Google Doc) a partir
 * da saída de *planning-modeling, por formato de conteúdo:
 *
 *  - Vídeo (Curto/Longo): Plano-de-Criativo.md já vem pronto e legível de
 *    video_plan.py (Fase A do *industrialize-video) — só reaproveita o
 *    parser de markdown do pack-builder.js.
 *  - Carrossel/Post: o "plano" é o brief-v5-*.yaml (deep_modeler +
 *    analyze_benchmark + plan_creative, via design_creative.py --plan-only)
 *    — não tem um .md pronto, então monta sections[] direto dos campos
 *    content_plan/benchmark_analysis do brief.
 *
 * Puro/testável: recebe dados já carregados, devolve sections[] pro
 * createAdvancedDoc(). Não fala com filesystem nem com Python.
 */

const { markdownToSections } = require('./pack-builder');

function buildVideoModelingSections(planoDeCriativoMd) {
    return markdownToSections(planoDeCriativoMd);
}

function joinNonEmpty(lines) {
    return lines.filter(Boolean).join('\n\n');
}

/** brief: objeto já parseado do brief-v5-*.yaml (js-yaml). */
function buildDesignModelingSections(brief) {
    const ba = brief.benchmark_analysis || {};
    const cp = brief.content_plan || {};
    const sections = [];

    const fatores = Array.isArray(ba.fatores_de_performance)
        ? ba.fatores_de_performance.join('; ')
        : ba.fatores_de_performance;

    sections.push({
        header: 'Análise do Benchmark',
        content: joinNonEmpty([
            ba.tema_central && `Tema central: ${ba.tema_central}`,
            ba.formato && `Formato: ${ba.formato}`,
            ba.arco_narrativo && `Arco narrativo: ${ba.arco_narrativo}`,
            ba.estrutura && `Estrutura: ${ba.estrutura}`,
            ba.redundancias && `Redundâncias: ${ba.redundancias}`,
            fatores && `Fatores de performance: ${fatores}`,
            ba.recomendacao && `Recomendação: ${ba.recomendacao}`,
        ]) || 'Análise do benchmark ainda não disponível.',
    });

    const planSection = {
        header: 'Plano de Modelagem',
        content: joinNonEmpty([
            `Arquétipo: ${cp.archetype || '—'}  ·  Tema: ${cp.tema || '—'}  ·  Slides: ${cp.slide_count ?? (cp.slides || []).length}`,
            cp.rationale,
        ]),
        subsections: (cp.slides || []).map((s) => ({
            header: `Slide ${s.slide_n}${s.kicker ? ` — ${s.kicker}` : ''}`,
            content: joinNonEmpty([
                s.role && `Papel: ${s.role}`,
                s.copy_direction && `Direção de copy: ${s.copy_direction}`,
                s.image_direction && `Direção visual: ${s.image_direction}`,
            ]),
        })),
    };
    sections.push(planSection);

    return sections;
}

module.exports = { buildVideoModelingSections, buildDesignModelingSections };
