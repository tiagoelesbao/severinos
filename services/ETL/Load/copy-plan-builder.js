/**
 * Copy Plan Builder — monta o "Copy & Direcionamento" (Google Doc) a partir
 * da saída de *copywriting, por formato de conteúdo.
 *
 *  - Vídeo (Curto/Longo): plan_video_creative.py (rodado na etapa ANTERIOR,
 *    *planning-modeling) já entrega hook×3 + storyboard + ROTEIRO COMPLETO —
 *    ao contrário do carrossel/post, vídeo não tem uma etapa de "recast"
 *    separada porque a copy final já nasce pronta no plano. A etapa de
 *    copywriting pra vídeo é reempacotar o Plano-de-Criativo.md como está —
 *    não fabricar um passo extra que não existe no pipeline real.
 *  - Carrossel/Post: content_plan (da etapa anterior) só tem DIREÇÃO de copy
 *    (copy_direction), não o texto final — recast_engine.py é quem escreve
 *    headline/sub_headline/body_text de verdade na voz do cliente. É AQUI
 *    que a copy de fato é produzida.
 *
 * Puro/testável: recebe dados já carregados, devolve sections[] pro
 * createAdvancedDoc(). Não fala com filesystem nem com Python.
 */

const { buildVideoModelingSections } = require('./modeling-plan-builder');

function buildVideoCopySections(planoDeCriativoMd) {
    return buildVideoModelingSections(planoDeCriativoMd);
}

function joinNonEmpty(lines) {
    return lines.filter(Boolean).join('\n\n');
}

/** brief: objeto já parseado do brief-v5-*.yaml, DEPOIS de recast_engine.py +
 * quality_gate.py terem rodado (content_data[].headline/sub_headline/body_text
 * preenchidos, brief.quality_gate.status setado). */
function buildDesignCopySections(brief) {
    const qg = brief.quality_gate || {};
    const sections = [];

    sections.push({
        header: 'Quality Gate',
        content: qg.status ? joinNonEmpty([
            `Status: ${qg.status}${qg.iterations ? ` (${qg.iterations} iteração/ões)` : ''}`,
            qg.status !== 'PASS' ? '⚠️ Status diferente de PASS — revisar antes de produzir.' : null,
        ]) : 'Quality gate não rodou.',
    });

    const copySection = { header: 'Copy Final por Slide', subsections: [] };
    (brief.content_data || []).forEach((s) => {
        copySection.subsections.push({
            header: `Slide ${s.slide_n}${s.role ? ` — ${s.role}` : ''}`,
            content: joinNonEmpty([
                s.headline && `Headline: ${s.headline}`,
                s.sub_headline && `Sub-headline: ${s.sub_headline}`,
                s.body_text && `Body: ${s.body_text}`,
            ]) || 'Sem copy final gerada pra este slide.',
        });
    });
    sections.push(copySection);

    return sections;
}

module.exports = { buildVideoCopySections, buildDesignCopySections };
