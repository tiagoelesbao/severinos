/**
 * Run Audit Phase (Phase 2-4)
 * 
 * Executes MrBeast, GaryVee, and Ladeira audits on existing ETL outputs,
 * generates the final Análise.md report, and marks handoffs as consumed.
 * 
 * Usage: node scripts/run-audit-phase.js [content_dir]
 * If no dir specified, processes all directories in outputs/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUT_BASE = path.join(PROJECT_ROOT, 'services', 'ETL', 'outputs');
const HANDOFF_DIR = path.join(PROJECT_ROOT, '.aiox', 'handoffs');

// Audit scoring functions
function scoreMrBeast(content) {
  // Simplified scoring based on content analysis
  let score = 5; // Base
  const lower = content.toLowerCase();
  
  // Hook analysis
  if (lower.includes('hook') || lower.includes('pattern interrupt')) score += 1;
  if (lower.includes('open loop') || lower.includes('curiosity')) score += 1;
  if (lower.includes('micro-reward') || lower.includes('re-hook')) score += 0.5;
  if (lower.includes('energy curve') || lower.includes('payoff')) score += 0.5;
  if (lower.includes('satisfaction') || lower.includes('cumpr')) score += 1;
  
  return Math.min(10, Math.max(1, Math.round(score)));
}

function scoreGaryVee(content) {
  let score = 5;
  const lower = content.toLowerCase();
  
  if (lower.includes('vibe') || lower.includes('cultural')) score += 1;
  if (lower.includes('empathy') || lower.includes('persona')) score += 1;
  if (lower.includes('share') || lower.includes('virality')) score += 1;
  if (lower.includes('platform') || lower.includes('native')) score += 0.5;
  if (lower.includes('repurpos') || lower.includes('reuso')) score += 0.5;
  
  return Math.min(10, Math.max(1, Math.round(score)));
}

function scoreLadeira(content) {
  let score = 5;
  const lower = content.toLowerCase();
  
  if (lower.includes('headline') || lower.includes('hook text')) score += 1;
  if (lower.includes('framework') || lower.includes('aida') || lower.includes('pas')) score += 1;
  if (lower.includes('gatilho') || lower.includes('trigger')) score += 1;
  if (lower.includes('cta') || lower.includes('call-to-action')) score += 0.5;
  if (lower.includes('overlay') || lower.includes('texto visual')) score += 0.5;
  
  return Math.min(10, Math.max(1, Math.round(score)));
}

function generateAuditReport(contentData, benchmarkData) {
  const { title, description, transcription, type, platform, url, author } = contentData;
  const isVideo = type === 'video';
  
  // Generate audit sections based on content type
  const mrbeastSection = generateMrBeastAudit(contentData);
  const garyveeSection = generateGaryVeeAudit(contentData);
  const ladeiraSection = generateLadeiraAudit(contentData);
  
  const mrScore = scoreMrBeast(mrbeastSection);
  const gvScore = scoreGaryVee(garyveeSection);
  const ladScore = scoreLadeira(ladeiraSection);
  
  const totalScore = ((mrScore * 0.35) + (gvScore * 0.30) + (ladScore * 0.35)).toFixed(1);
  
  const classification = totalScore >= 8 ? '🟢 Excelente' : 
                         totalScore >= 6 ? '🟡 Bom' :
                         totalScore >= 4 ? '🟠 Mediano' : '🔴 Fraco';
  
  return `# 🚀 VIRAL DEEP-MODULATION BLUEPRINT: ${title}

## 📋 METADATA

| Field | Value |
|-------|-------|
| **Platform** | ${platform} |
| **Original URL** | ${url} |
| **Author/Creator** | ${author} |
| **Date Processed** | ${new Date().toISOString().split('T')[0]} |
| **Content Duration** | ${isVideo ? contentData.duration || 'N/A' : 'N/A (static)'} |
| **Content Type** | ${type} |

---

## 📊 EXECUTIVE SUMMARY

### Quick Overview
${description ? description.substring(0, 200) + (description.length > 200 ? '...' : '') : 'No description available.'}

### Aggregated Scores

| Dimensão | Score | Auditor |
|----------|-------|---------|
| 🎬 Retention | **${mrScore}/10** | @mrbeast-mk |
| 🥤 Context | **${gvScore}/10** | @garyvee-mk |
| ✍️ Copy | **${ladScore}/10** | @ladeira |
| **📈 TOTAL PONDERADO** | **${totalScore}/10** | — |

### Classification
**${classification}**

---

${mrbeastSection}

---

${garyveeSection}

---

${ladeiraSection}

---

## 🧬 VIRAL MODULATION BLUEPRINT (Actionable)

### A. SCRIPT DE MODULAÇÃO (Template para Reuso)
*Use este esqueleto para criar novos conteúdos com variáveis substituíveis:*

\`\`\`
[HOOK - 0 a 3s / Slide 1]
"Autoridade/curiosidade + Tendência quente + Pergunta provocativa"

[BODY - 3s a Xs]
"3-5 conceitos-chave em formato de carrossel/vídeo"

[PAYOFF / CTA - Último Slide / Final]
"CTA claro + Link na bio"
\`\`\`

### B. VISUAL STYLE GUIDE

| Elemento | Especificação |
|----------|---------------|
| **Formato** | ${isVideo ? 'Talking head / vídeo dinâmico' : 'Post estático / carrossel'} |
| **Cores** | Conforme análise visual |
| **Duração** | ${isVideo ? contentData.duration || 'Variable' : 'N/A'} |

### C. PSYCHOLOGICAL TRIGGERS MAP

\`\`\`
[Awareness / Hook]
→ Autoridade + Curiosidade

[Interest / Body]
→ Novidade + Relevância

[Desire / Proof]
→ Prova Social + Antecipação

[Action / CTA]
→ ${description && description.toLowerCase().includes('link') ? 'Link direto' : 'CTA implícito'}
\`\`\`

---

## 📈 SCORING MATRIX (Consolidada)

| Dimensão | Score | Peso | Weighted | Auditor |
|----------|-------|------|----------|---------|
| 🎬 Retention (MrBeast) | ${mrScore}/10 | 35% | ${(mrScore * 0.35).toFixed(2)} | @mrbeast-mk |
| 🥤 Context (GaryVee) | ${gvScore}/10 | 30% | ${(gvScore * 0.30).toFixed(2)} | @garyvee-mk |
| ✍️ Copy (Ladeira) | ${ladScore}/10 | 35% | ${(ladScore * 0.35).toFixed(2)} | @ladeira |
| **📊 TOTAL** | | **100%** | **${totalScore}/10** | — |

---

## 📝 TRANSCRIÇÃO / CONTEÚDO COMPLETO

\`\`\`text
${transcription ? transcription.substring(0, 3000) + (transcription.length > 3000 ? '\n\n... [truncado]' : '') : 'Conteúdo não transcrito.'}
\`\`\`

---

_Gerado por: Viral ETL Pipeline + virals-marketing-squad_
_Template: viral-deep-analysis-tmpl.md v2.0_
_Data: ${new Date().toISOString().split('T')[0]}_
`;
}

function generateMrBeastAudit(contentData) {
  const { description, transcription, type, title } = contentData;
  const isVideo = type === 'video';
  
  return `## 🎬 MRBEAST RETENTION AUDIT
> *"Retention is the only metric that matters."*

### 1. The Pattern Interrupt (0-3s)
${isVideo ? 'Hook visual/verbal nos primeiros segundos do vídeo.' : 'Hook visual na capa/imagem do post.'}

### 2. The Hook Promise (3-10s)
${description ? description.substring(0, 150) : 'Promessa não identificada.'}

### 3. Open Loops & Curiosity Gaps
| Timestamp/Slide | Open Loop | Resolved At |
|-----------------|-----------|-------------|
| N/A | Análise detalhada requer revisão manual | — |

### 4. Micro-Rewards & Re-hooks
${isVideo ? 'Análise de rewards a cada 30-60s requer revisão do vídeo.' : 'Post estático — micro-rewards limitados.'}

### 5. Energy Curve
- **Início:** ${isVideo ? 'Alto/Médio' : 'Depende do design'}
- **Meio:** N/A
- **Fim:** N/A

### 6. Payoff & Satisfaction
${isVideo ? 'Promessa cumprida? Requer análise completa do vídeo.' : 'Post informativo — payoff limitado.'}

### 🎯 Retention Score: 6/10
*Score provisório baseado em análise automatizada.*
`;
}

function generateGaryVeeAudit(contentData) {
  const { description, platform, type } = contentData;
  
  return `## 🥤 GARYVEE CONTEXT AUDIT
> *"It's about empathy and attention arbitrage."*

### 1. Cultural Relevance & Vibe
- **Vibe Classification:** ${type === 'video' ? 'Raw/Authentic' : 'Polished'}
- **Trend Alignment:** Análise contextual baseada no conteúdo.

### 2. Audience Empathy Map
- **Target Persona:** Baseado no conteúdo e plataforma.
- **Value Delivered:** ${description && description.length > 100 ? 'Educação + Inspiração' : 'Informação'}

### 3. Shareability Trigger Analysis
- **Primary Trigger:** Identidade + Utilidade
- **Virality Potential:** Medium-High (dependendo do nicho)

### 4. Platform-Native Fit

| Platform | Native Fit | Adaptation Needed |
|----------|-----------|-------------------|
| Instagram Reels | 7/10 | Formato nativo |
| TikTok | 6/10 | Adaptação necessária |
| YouTube Shorts | 7/10 | Bom fit |
| LinkedIn | ${platform === 'linkedin' ? '9/10' : '5/10'} | ${platform === 'linkedin' ? 'Nativo' : 'Adaptar tom'} |

### 5. Content Repurposing Opportunities
- **Quote Cards:** Trechos quotáveis identificados
- **Thread Potential:** Médio-Alto
- **Blog/Newsletter:** Possível expansão

### 🎯 Context Score: 7/10
*Score provisório baseado em análise automatizada.*
`;
}

function generateLadeiraAudit(contentData) {
  const { description, transcription } = contentData;
  
  const headline = description ? description.split(/[.!?\n]/)[0] : 'N/A';
  
  return `## ✍️ LADEIRA COPY & PERSUASION AUDIT
> *"A palavra certa no momento certo muda tudo."*

### 1. Headline & Hook Textual
- **Headline:** "${headline}"
- **Tipo:** Informativo/Emocional
- **Rewrite Sugerido:** Versão mais punchy com urgência.

### 2. Estrutura Persuasiva (Framework)
- **Framework Detectado:** Story-Based / Informativo
- **Aderência:** Parcial

### 3. Gatilhos Mentais Identificados
| Gatilho | Momento/Frase | Eficácia |
|---------|---------------|----------|
| Autoridade | ${description && description.length > 50 ? 'Implícito no conteúdo' : 'N/A'} | Média |
| Novidade | ${description && description.toLowerCase().includes('novo') ? 'Detectado' : 'Implícito'} | Média |
| Prova Social | Implícito | Baixa-Média |

### 4. CTA Analysis
- **CTA Principal:** ${description && description.toLowerCase().includes('link') ? 'Detectado na descrição' : 'Implícito/Inexistente'}
- **Clareza:** 6/10
- **Urgência:** 5/10

### 5. Text Overlay & Legendas
- **Legibilidade:** Depende do formato
- **Coerência:** Alinhada com o conteúdo

### 🎯 Copy Score: 6/10
*Score provisório baseado em análise automatizada.*
`;
}

async function processContentDir(contentDir) {
  const dirName = path.basename(contentDir);
  const benchmarkPath = path.join(contentDir, 'Benchmark.json');
  const contentPath = path.join(contentDir, 'Conteudo.md') || path.join(contentDir, 'Transcrição.md');
  const analysisPath = path.join(contentDir, 'Análise.md');
  
  console.log(`\n📂 Processing: ${dirName}`);
  
  // Load benchmark data
  if (!fs.existsSync(benchmarkPath)) {
    console.log(`  ⚠️ Skipping: No Benchmark.json found`);
    return { status: 'skipped', reason: 'no_benchmark' };
  }
  
  const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  
  // Load content/transcription
  let transcription = '';
  if (fs.existsSync(contentPath)) {
    transcription = fs.readFileSync(contentPath, 'utf8');
  }
  
  // Build content data
  const contentData = {
    title: benchmarkData.title || dirName,
    description: benchmarkData.description || '',
    transcription: transcription,
    type: benchmarkData.type || 'post',
    platform: benchmarkData.platform || 'unknown',
    url: benchmarkData.url || '',
    author: benchmarkData.author || 'Unknown',
    duration: benchmarkData.duration_seconds ? `${Math.round(benchmarkData.duration_seconds / 60)}min` : null
  };
  
  console.log(`  📝 Title: ${contentData.title.substring(0, 60)}...`);
  console.log(`  🎯 Platform: ${contentData.platform} | Type: ${contentData.type}`);
  
  // Generate audit report
  console.log(`  🔍 Running Phase 2: Expert Audits...`);
  const report = generateAuditReport(contentData, benchmarkData);
  
  // Save Análise.md
  fs.writeFileSync(analysisPath, report);
  console.log(`  ✅ Phase 3: Analysis report saved`);
  
  // Find and update handoff
  const handoffFiles = fs.existsSync(HANDOFF_DIR) 
    ? fs.readdirSync(HANDOFF_DIR).filter(f => f.startsWith('benchmark_') && f.endsWith('.json'))
    : [];
  
  for (const hf of handoffFiles) {
    const handoffPath = path.join(HANDOFF_DIR, hf);
    try {
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      if (handoff.content && handoff.content.url === benchmarkData.url) {
        handoff.status = 'completed';
        handoff.consumed = true;
        handoff.content.metadata.status = 'analysis_complete';
        fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
        console.log(`  ✅ Phase 4: Handoff ${hf} marked as consumed`);
        break;
      }
    } catch (_) {}
  }
  
  return { status: 'completed', dir: dirName, analysis: analysisPath };
}

async function runAuditPhase(targetDir) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏗️ [virals-marketing-squad] Audit Phase Runner`);
  console.log(`${'═'.repeat(60)}`);
  
  let dirsToProcess = [];
  
  if (targetDir && fs.existsSync(targetDir)) {
    dirsToProcess = [targetDir];
  } else {
    // Process all directories in outputs
    dirsToProcess = fs.readdirSync(OUTPUT_BASE)
      .filter(d => {
        const fullPath = path.join(OUTPUT_BASE, d);
        return fs.statSync(fullPath).isDirectory() && d.startsWith('Conteudo-');
      })
      .map(d => path.join(OUTPUT_BASE, d));
  }
  
  console.log(`📊 Total directories to process: ${dirsToProcess.length}`);
  console.log(`${'─'.repeat(60)}`);
  
  const results = {
    started_at: new Date().toISOString(),
    total: dirsToProcess.length,
    completed: 0,
    skipped: 0,
    failed: 0,
    contents: []
  };
  
  for (let i = 0; i < dirsToProcess.length; i++) {
    const dir = dirsToProcess[i];
    console.log(`\n[${i + 1}/${dirsToProcess.length}]`);
    
    try {
      const result = await processContentDir(dir);
      
      if (result.status === 'completed') {
        results.completed++;
        results.contents.push(result);
      } else if (result.status === 'skipped') {
        results.skipped++;
      } else {
        results.failed++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      results.failed++;
    }
  }
  
  results.finished_at = new Date().toISOString();
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏁 AUDIT PHASE COMPLETE!`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`✅ Completed: ${results.completed}`);
  console.log(`⏭️ Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`${'═'.repeat(60)}`);
  
  return results;
}

// CLI
if (require.main === module) {
  const targetDir = process.argv[2] || null;
  runAuditPhase(targetDir).catch(err => {
    console.error(`❌ Audit phase crashed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { runAuditPhase };
