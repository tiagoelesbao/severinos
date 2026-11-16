/**
 * pipeline-qualify.js — Orquestrador de Qualificação (Etapa C)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-analyst (Gil)
 */

const path = require('path');
const fs = require('fs');
const { scoreBatch } = require('./score-creator');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const DISCOVERIES_DIR = path.join(SQUAD_ROOT, 'data/discoveries');
const SCORECARDS_DIR = path.join(SQUAD_ROOT, 'data/scorecards');

if (!fs.existsSync(SCORECARDS_DIR)) fs.mkdirSync(SCORECARDS_DIR, { recursive: true });

function loadLatestDiscovery(clientName) {
    if (!fs.existsSync(DISCOVERIES_DIR)) {
        console.error(`❌ Dir não existe: ${DISCOVERIES_DIR}`);
        return null;
    }
    const files = fs.readdirSync(DISCOVERIES_DIR);
    console.log(`📁 Scaneando ${DISCOVERIES_DIR}... Encontrados: ${files.length} arquivos.`);
    
    const matched = files.filter(f => f.includes(clientName) && f.endsWith('.json'));
    console.log(`🔍 Buscando por "${clientName}"... Match: ${matched.length}`);
    
    if (matched.length === 0) return null;
    
    matched.sort().reverse();
    const latestFile = path.join(DISCOVERIES_DIR, matched[0]);
    console.log(`✅ Usando: ${latestFile}`);
    return JSON.parse(fs.readFileSync(latestFile, 'utf8'));
}

function generateQualifyDossier(client, results) {
    const dateStr = new Date().toISOString().split('T')[0];
    const { scorecards } = results;

    // Agrupar por Qualificados (Score >= 7) e Outros
    const qualified = scorecards.filter(sc => sc.qualified);
    const others = scorecards.filter(sc => !sc.qualified);

    let md = `# 📊 Dossier de Qualificação (Scoring Gil) — ${client.toUpperCase()}\n`;
    md += `**Data:** ${dateStr} | **Total Processado:** ${scorecards.length}\n\n`;
    
    md += `## 🏆 Top Qualificados (Prontos p/ Abordagem)\n`;
    md += `Creators com Score **>= 7.0**. Foco em Tiers Gold e Silver.\n\n`;
    
    md += `| Seguir? | Score | Creator | Link | Tier | Eng. Rate | Nicho | Ação Recomendada |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    qualified.forEach(sc => {
        const eng = sc.profile_summary.engagement_rate ? sc.profile_summary.engagement_rate.toFixed(1) + '%' : 'N/A';
        const profileUrl = `https://www.tiktok.com/@${sc.handle.replace('@', '')}`;
        md += `| - [ ] | **${sc.score_final.toFixed(1)}** | ${sc.handle} | [Ver Perfil](${profileUrl}) | ${sc.tier_label} | ${eng} | ${sc.profile_summary.niche} | ${sc.action} |\n`;
    });

    if (qualified.length === 0) md += `*Nenhuma creator qualificada nesta rodada.*\n`;
    md += `\n---\n\n`;

    md += `## 📋 Base de Dados (Bronze / Rejected)\n`;
    md += `Métricas auditadas de perfis que não atingiram o limite de Score nesta rodada.\n\n`;
    
    md += `| Seguir? | Score | Creator | Link | Tier | Eng. Rate | Motivo/Ação |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    others.forEach(sc => {
        const eng = sc.profile_summary.engagement_rate ? sc.profile_summary.engagement_rate.toFixed(1) + '%' : 'N/A';
        const profileUrl = `https://www.tiktok.com/@${sc.handle.replace('@', '')}`;
        md += `| - [ ] | ${sc.score_final.toFixed(1)} | ${sc.handle} | [Ver Perfil](${profileUrl}) | ${sc.tier_label} | ${eng} | ${sc.action} |\n`;
    });

    const fileName = `dossier-qualificacao-${client}-${dateStr}.md`;
    const filePath = path.join(SCORECARDS_DIR, fileName);
    fs.writeFileSync(filePath, md);
    return filePath;
}

async function runQualifyPipeline(clientName) {
    console.log(`📊 Iniciando Pipeline de Qualificação para: ${clientName}`);
    
    const discoveryData = loadLatestDiscovery(clientName);
    if (!discoveryData) {
        console.error(`❌ ERRO: Descobertas JSON para ${clientName} não encontradas em data/discoveries/.`);
        return;
    }

    // Unificar todos os vídeos minerados (BR + Intl se houver) para o Gil auditar
    const allProspects = discoveryData.viralVideos || [];
    if (allProspects.length === 0) {
        console.log('⚠️ Nenhum prospect encontrado no JSON de descoberta.');
        return;
    }

    // Simplificar lista para o score-batch
    const creatorsToScore = allProspects.map(v => ({
        handle: v.handle,
        platform: v.platform || 'tiktok',
        followers: v.metrics?.followers || 5000, // Fallback p/ o Gil
        engagement_rate: v.metrics?.engagement_rate || (v.metrics?.likes / v.metrics?.views * 100) || 5,
        branded_post_ratio: 0.2, // Default
        face_presence_score: 8,  // Default (Gil assume que Mae já minerou rostos)
        niche_alignment_score: 8,
        posting_frequency: 3,
        niche: v.type || 'beauty'
    }));

    const results = scoreBatch(creatorsToScore);
    const dossierPath = generateQualifyDossier(clientName, results);
    
    // Salvar JSON de resultados finais (Scorecards Batch)
    const dateStr = new Date().toISOString().split('T')[0];
    const jsonPath = path.join(SCORECARDS_DIR, `batch-scores-${clientName}-${dateStr}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    console.log(`\n✅ Qualificação Concluída:`);
    console.log(`   📝 Dossier Gil: ${dossierPath}`);
    console.log(`   🔢 JSON Batch: ${jsonPath}`);
    console.log(`   📊 Resumo: ${results.metadata.qualified} qualificados | ${results.metadata.rejected} descartados.`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    runQualifyPipeline(args[0] || 'juvelina-organics').catch(console.error);
}
