const path = require('path');
const fs = require('fs');
const BaseAnalyzer = require('./BaseAnalyzer');

/**
 * ImageAnalyzer — cobre IG post estático, IG carrossel, TikTok carrossel.
 *
 * Fluxo:
 *  1. Para cada imagem, chama OpenRouter Vision (transcrição estruturada do conteúdo visual)
 *  2. Move imagens para pasta Screenshots/
 *  3. Gera Transcrição.md com Caption + análise por slide
 *  4. Gera Análise.md base referenciando cada slide
 */
class ImageAnalyzer extends BaseAnalyzer {
    async run({ contentDir, url, classification, metadata, images = [], clientContext = null }) {
        const screenshotsDir = path.join(contentDir, 'Screenshots');
        if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

        const result = {
            type: classification.type,
            subtype: classification.subtype,
            transcriptionMd: '',
            baseAnalysisMd: '',
            screenshots: [],
            keyMoments: [],
            status: 'ok'
        };

        // Move imagens para Screenshots/
        const moved = [];
        for (let i = 0; i < images.length; i++) {
            const src = images[i];
            if (!fs.existsSync(src)) continue;
            const ext = path.extname(src) || '.jpg';
            const dest = path.join(screenshotsDir, `slide_${String(i + 1).padStart(2, '0')}${ext}`);
            try {
                if (src !== dest) fs.renameSync(src, dest);
                moved.push({ index: i + 1, path: dest });
            } catch (e) {
                console.warn(`[ImageAnalyzer] Falha ao mover ${src}: ${e.message}`);
            }
        }
        result.screenshots = moved.map(m => ({ time: null, label: `slide ${m.index}`, path: m.path }));

        // Análise visual por slide
        const slides = [];
        for (const m of moved) {
            try {
                const visual = await this.transcriber.analyze(m.path, 'image', clientContext);
                slides.push({ index: m.index, file: path.basename(m.path), analysis: visual || '_Falha na análise visual._' });
            } catch (e) {
                slides.push({ index: m.index, file: path.basename(m.path), analysis: `_Erro: ${e.message}_` });
            }
        }

        // Transcrição.md
        const isCarousel = classification.type === 'carousel';
        const title = metadata.title || classification.subtype;
        let trMd = `# ${isCarousel ? 'Transcrição Estruturada (Carrossel)' : 'Transcrição Estruturada (Imagem)'} — ${title}\n\n`;
        trMd += `**Plataforma:** ${classification.subtype}  ·  **Slides:** ${slides.length}\n\n`;
        trMd += `## 📝 Caption / Descrição original\n\n${metadata.description || '_Nenhuma legenda disponível._'}\n\n---\n\n`;

        if (slides.length === 0) {
            trMd += `_Nenhuma imagem extraída para análise._\n`;
        } else {
            slides.forEach(s => {
                trMd += `## 🖼️ Slide ${String(s.index).padStart(2, '0')}\n\n`;
                trMd += `**Arquivo:** \`Screenshots/${s.file}\`\n\n`;
                trMd += `${s.analysis}\n\n---\n\n`;
            });
        }
        result.transcriptionMd = trMd;

        // Análise.md base
        result.baseAnalysisMd = this.buildAnalysisMd({ classification, metadata, slides, url });

        return result;
    }

    buildAnalysisMd({ classification, metadata, slides, url }) {
        const isCarousel = classification.type === 'carousel';
        let md = `# Análise Base — ${metadata.title || classification.subtype}\n\n`;
        md += `**URL:** ${url}\n`;
        md += `**Tipo:** ${classification.type} · **Subtipo:** ${classification.subtype}\n`;
        md += `**Autor:** ${metadata.author || '—'}  ·  **Likes:** ${metadata.like_count || '—'}\n\n---\n\n`;

        md += `## 📊 Estrutura\n\n`;
        md += `| Item | Valor |\n| :--- | ---: |\n`;
        md += `| Slides | ${slides.length} |\n`;
        md += `| Caption (chars) | ${(metadata.description || '').length} |\n`;
        md += `| Formato | ${isCarousel ? 'Sequência narrativa (carrossel)' : 'Single image'} |\n\n`;

        if (slides.length > 0) {
            md += `## 🖼️ Mapa de Slides\n\n`;
            md += `| # | Arquivo | Resumo da análise |\n| :- | :--- | :--- |\n`;
            slides.forEach(s => {
                const summary = (s.analysis || '').replace(/\n/g, ' ').slice(0, 120).replace(/\|/g, '\\|');
                md += `| ${s.index} | \`Screenshots/${s.file}\` | ${summary}${(s.analysis || '').length > 120 ? '…' : ''} |\n`;
            });
            md += `\n`;
        }

        md += `## 🧠 Espaço para Auditorias Especializadas\n\n`;
        md += `Os agentes especializados devem preencher abaixo cruzando a Caption (Transcrição.md) com os slides acima:\n\n`;
        md += `### @mrbeast-mk — Retenção & Open Loop entre slides\n\n_Pendente. Score: __/10_\n\n`;
        md += `### @garyvee-mk — Vibe & Brand Fit\n\n_Pendente. Score: __/10_\n\n`;
        md += `### @ladeira — Copy & Gatilhos da Caption + texto sobreposto\n\n_Pendente. Score: __/10_\n\n`;
        md += `### Síntese Final (marketing-chief)\n\n_Pendente._\n`;
        return md;
    }
}

module.exports = ImageAnalyzer;
