/**
 * hashtag-miner.js — Orquestrador de Mineração por Hashtags
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae)
 * 
 * Purpose: 
 *   - Monitor hashtags incrementalmente
 *   - Rankear vídeos virais (Viral Score via ETL)
 *   - Filtrar perfis por engajamento/viralidade
 *   - Gerar Dossier completo em data/miners
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const ETL_PATH = path.join(__dirname, '../../../services/ETL/Extract/scrapers/social-discovery.js');
const REGISTRY_PATH = path.join(SQUAD_ROOT, 'data/monitored-hashtags.yaml');
const MINERS_DIR = path.join(SQUAD_ROOT, 'data/miners');

// Ensure miners dir exists
if (!fs.existsSync(MINERS_DIR)) {
    fs.mkdirSync(MINERS_DIR, { recursive: true });
}

/**
 * Load monitored hashtags for a client
 */
function loadMonitoredHashtags(client) {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = yaml.load(content);
    return registry.clients[client] || null;
}

/**
 * Generate Dossier Markdown
 */
function generateDossier(client, data) {
    const dateStr = new Date().toISOString().split('T')[0];
    const { hashtags, platform, viralVideos, topCreators } = data;

    let md = `# 🎯 Dossier de Mineração — ${client.toUpperCase()}\n`;
    md += `**Data:** ${dateStr} | **Plataforma:** ${platform}\n\n`;
    
    md += `## 📊 Pool de Hashtags Monitoradas\n`;
    hashtags.forEach(tag => md += `- ${tag}\n`);
    md += `\n---\n\n`;

    md += `## 🏆 Ranking de Vídeos Mais Virais\n`;
    md += `| Viral Score | Creator | Views | Likes | Link |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    
    viralVideos.forEach(v => {
        md += `| **${v.score.toLocaleString()}** | ${v.handle} | ${v.metrics.views.toLocaleString()} | ${v.metrics.likes.toLocaleString()} | [Ver Vídeo](${v.url}) |\n`;
    });
    md += `\n---\n\n`;

    md += `## 👥 Creators Identificados (Candidatos Fase 2)\n`;
    md += `Estes perfis demonstraram alta performance nas hashtags alvo e estão prontos para a Peneira / Scoring.\n\n`;
    
    topCreators.forEach(c => {
        md += `### ${c.handle}\n`;
        md += `- **Fonte:** ${c.source}\n`;
        md += `- **Melhor Post:** ${c.top_score.toLocaleString()} Viral Score\n`;
        md += `- **Link:** [Perfil TikTok](https://www.tiktok.com/@${c.handle.replace('@', '')})\n\n`;
    });

    md += `\n---\n`;
    md += `*Este dossier serve como input para a Etapa C: A Peneira / Scoring (Fase 2).*\n`;

    const fileName = `dossier-${client}-${dateStr}.md`;
    const filePath = path.join(MINERS_DIR, fileName);
    fs.writeFileSync(filePath, md);
    return filePath;
}

/**
 * Main Miner logic
 */
async function runMining(clientName, options = {}) {
    console.log(`🚀 Iniciando Mineração para: ${clientName}`);
    
    const clientData = loadMonitoredHashtags(clientName);
    if (!clientData) {
        console.error(`❌ Cliente '${clientName}' não encontrado no registro.`);
        return;
    }

    const hashtags = clientData.active_hashtags;
    const platform = options.platform || 'tiktok';
    
    const SocialDiscovery = require(ETL_PATH);
    const discovery = new SocialDiscovery({ headless: false });
    
    const allViralVideos = [];
    
    try {
        await discovery.init();
        
        for (const tag of hashtags) {
            console.log(`\n🔍 Analisando Hashtag: ${tag}...`);
            let results = [];
            
            if (platform === 'tiktok') {
                results = await discovery.discoverTikTokHashtag(tag, 10);
            } else if (platform === 'instagram') {
                results = await discovery.discoverInstagramHashtag(tag, 10);
            }
            
            if (results && results.length > 0) {
                allViralVideos.push(...results);
                console.log(`   ✅ Encontrados ${results.length} vídeos.`);
            } else {
                console.log(`   ⚠️ Nenhum vídeo viral encontrado para ${tag}.`);
            }
        }
    } catch (err) {
        console.error(`❌ Erro durante mineração:`, err.message);
    } finally {
        await discovery.close();
    }

    // Sort by Viral Score
    allViralVideos.sort((a, b) => b.score - a.score);

    // Group by Creator to find Top Candidates
    const creatorMap = new Map();
    allViralVideos.forEach(v => {
        if (!creatorMap.has(v.handle)) {
            creatorMap.set(v.handle, {
                handle: v.handle,
                source: `Hashtag Mining`,
                top_score: v.score,
                videos: []
            });
        }
        const c = creatorMap.get(v.handle);
        c.videos.push(v);
        if (v.score > c.top_score) c.top_score = v.score;
    });

    const topCreators = Array.from(creatorMap.values())
        .filter(c => c.top_score > (options.scoreThreshold || 500)) // Filtro base de viralidade
        .sort((a, b) => b.top_score - a.top_score)
        .slice(0, 15);

    const dossierPath = generateDossier(clientName, {
        hashtags,
        platform,
        viralVideos: allViralVideos.slice(0, 20),
        topCreators
    });

    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`🎯 MINERAÇÃO COMPLETE`);
    console.log(`   Dossier gerado: ${dossierPath}`);
    console.log(`   Total vídeos analisados: ${allViralVideos.length}`);
    console.log(`   Creators qualificados para Fase 2: ${topCreators.length}`);
    console.log(`════════════════════════════════════════════════════════════`);
}

// ── CLI ──────────────────────────────────────────────────
if (require.main === module) {
    const args = process.argv.slice(2);
    const params = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = value;
            if (value !== true) i++;
        }
    }

    if (!params.client) {
        console.log('Usage: node hashtag-miner.js --client juvelina-organics [--platform tiktok]');
        process.exit(0);
    }

    runMining(params.client, {
        platform: params.platform || 'tiktok',
        scoreThreshold: parseInt(params.threshold) || 500
    }).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
