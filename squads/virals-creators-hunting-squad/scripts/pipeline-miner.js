/**
 * pipeline-miner.js — Orquestrador Avançado de Mineração (Etapa B)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-scout (Mae)
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Paths
const SQUAD_ROOT = path.join(__dirname, '..');
const ETL_PATH = path.join(__dirname, '../../../services/ETL/Extract/scrapers/social-discovery.js');
const CRITERIA_DIR = path.join(SQUAD_ROOT, 'data/search-criteria');
const MINERS_DIR = path.join(SQUAD_ROOT, 'data/miners');
const DISCOVERIES_DIR = path.join(SQUAD_ROOT, 'data/discoveries');
const ICP_STRUCTURED_DIR = path.join(SQUAD_ROOT, 'data/icp-structured');

// Blacklist de Hashtags Genéricas (Lixo)
const TRASH_HASHTAGS = new Set([
    '#fyp', '#fy', '#fyy', '#viral', '#foryou', '#foryoupage', '#paravoce', 
    '#trend', '#trending', '#explorar', '#explore', '#reels', '#tiktok'
]);

if (!fs.existsSync(MINERS_DIR)) fs.mkdirSync(MINERS_DIR, { recursive: true });
if (!fs.existsSync(DISCOVERIES_DIR)) fs.mkdirSync(DISCOVERIES_DIR, { recursive: true });

/**
 * Extrai hashtags e concorrentes do ICP-C Estruturado (.md) e SUBSTITUI no JSON de critérios.
 */
function syncWithStructuredICPC(clientName) {
    console.log(`\n🔄 [STRICT SYNC] Sincronizando com ICP-C Estruturado para: ${clientName}...`);
    
    const icpFiles = fs.readdirSync(ICP_STRUCTURED_DIR)
        .filter(f => f.includes(clientName.toLowerCase()) && f.endsWith('.md'))
        .sort().reverse();

    if (icpFiles.length === 0) {
        console.warn(`⚠️ Nenhum ICP-C Estruturado encontrado para ${clientName}.`);
        return;
    }

    const latestICP = path.join(ICP_STRUCTURED_DIR, icpFiles[0]);
    console.log(`📖 Fonte da Verdade: ${path.basename(latestICP)}`);
    const content = fs.readFileSync(latestICP, 'utf8');

    // Parsing específico da seção de Hashtags (Seção 3)
    const hashtagSection = content.match(/## 3\. Hashtags de Referência[\s\S]*?(?=## 4|$)/);
    let hashtags = [];
    if (hashtagSection) {
        hashtags = [...new Set(hashtagSection[0].match(/#[\w\u00C0-\u024FÀ-ÿ]+/g) || [])];
    } else {
        // Fallback para o arquivo todo se a seção não for encontrada, mas priorizando a estrutura
        hashtags = [...new Set(content.match(/#[\w\u00C0-\u024FÀ-ÿ]+/g) || [])];
    }

    // Extrair Concorrentes da seção ## 7. Marcas Concorrentes
    const competitorsMatch = content.match(/## 7\. Marcas Concorrentes[\s\S]*?\| Marca \|[\s\S]*?\n([\s\S]*?)(?:\n\n|##|$)/);
    const competitors = [];
    if (competitorsMatch) {
        const rows = competitorsMatch[1].trim().split('\n');
        rows.forEach(row => {
            const handleMatch = row.match(/@([\w._]+)/);
            if (handleMatch) competitors.push(handleMatch[1]);
        });
    }

    // Localizar o JSON de critérios mais recente ou criar um novo se não existir
    const criteriaFiles = fs.readdirSync(CRITERIA_DIR)
        .filter(f => f.includes(clientName.toLowerCase()) && f.endsWith('.json'))
        .sort().reverse();

    let data;
    let criteriaPath;

    if (criteriaFiles.length > 0) {
        criteriaPath = path.join(CRITERIA_DIR, criteriaFiles[0]);
        data = JSON.parse(fs.readFileSync(criteriaPath, 'utf8'));
    } else {
        console.log(`✨ Criando novo arquivo de critérios para ${clientName}...`);
        criteriaPath = path.join(CRITERIA_DIR, `search-criteria-${clientName.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`);
        data = { search_criteria: { hashtags_by_platform: {} }, brand_context: { name: clientName } };
    }
    
    // SUBSTITUIÇÃO (Strict): O que estava no JSON e não está no MD é REMOVIDO
    console.log(`   - Hashtags no MD: ${hashtags.length}`);
    data.search_criteria.hashtags = hashtags;
    data.search_criteria.hashtags_by_platform.tiktok = hashtags;
    data.search_criteria.competitor_brands = competitors;
    
    fs.writeFileSync(criteriaPath, JSON.stringify(data, null, 2));
    console.log(`✅ Sincronização Concluída: O JSON agora reflete EXATAMENTE o ICP-C Estruturado.`);
}

function loadCriteria(clientName) {
    const files = fs.readdirSync(CRITERIA_DIR).filter(f => f.includes(clientName.toLowerCase()) && f.endsWith('.json'));
    if (files.length === 0) return null;
    
    files.sort().reverse();
    const latestFile = path.join(CRITERIA_DIR, files[0]);
    const content = fs.readFileSync(latestFile, 'utf8');
    return JSON.parse(content).search_criteria || null;
}

function extractNewHashtags(description) {
    if (!description) return [];
    const found = description.match(/#[\w\u00C0-\u024FÀ-ÿ]+/g) || [];
    // Filtrar hashtags de lixo e converter para lowercase para evitar duplicatas
    return found.filter(tag => !TRASH_HASHTAGS.has(tag.toLowerCase()));
}

function generateAdvancedDossier(client, results) {
    const dateStr = new Date().toISOString().split('T')[0];
    const { viralVideos, commentators, topCreators, geoFocus } = results;

    viralVideos.sort((a, b) => b.score - a.score);

    let md = `# 🎯 Dossier de Mineração Avançada — ${client.toUpperCase()}\n`;
    md += `**Data:** ${dateStr} | **Foco:** ${geoFocus}\n\n`;
    
    md += `## 🏆 Ranking Viral (Foco Conversão)\n`;
    md += `| Score | Creator | Tipo | Views | Likes | Comentários | Salvos | Link |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    viralVideos.forEach(v => {
        const likes = v.metrics.likes ? v.metrics.likes.toLocaleString() : 'N/A';
        const comments = v.metrics.comments ? v.metrics.comments.toLocaleString() : 'N/A';
        const saves = v.metrics.saves || v.metrics.shares ? (v.metrics.saves || v.metrics.shares).toLocaleString() : 'N/A';
        md += `| **${v.score.toLocaleString()}** | ${v.handle} | ${v.type} | ${v.metrics.views.toLocaleString()} | ${likes} | ${comments} | ${saves} | [Ver](${v.url}) |\n`;
    });
    md += `\n---\n\n`;

    md += `## 🕵️ Sniper de Comentários (Concorrentes/Seeds)\n`;
    md += `Perfis que interagiram recentemente com os concorrentes informados no briefing.\n\n`;
    md += `| Concorrente | Data Post | Creator | Comentário | Link |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    commentators.forEach(c => {
        const urlLink = c.url || (c.handle !== 'N/A' ? `https://www.tiktok.com/@${c.handle.replace('@', '')}` : '#');
        md += `| ${c.source} | ${c.date || 'N/A'} | ${c.handle} | "${c.text.slice(0, 80)}..." | [Link](${urlLink}) |\n`;
    });
    md += `\n---\n\n`;

    md += `## 👥 Shortlist para Peneira (Fase 2)\n`;
    topCreators.forEach(c => {
        md += `### ${c.handle} (${c.type})\n`;
        md += `- **Score Médio:** ${c.avg_score.toLocaleString()}\n`;
        md += `- **Geo:** ${c.geo}\n`;
        md += `- [Perfil TikTok](https://www.tiktok.com/@${c.handle.replace('@', '')})\n\n`;
    });

    const fileName = `dossier-${client}-${dateStr}.md`;
    const filePath = path.join(MINERS_DIR, fileName);
    fs.writeFileSync(filePath, md);
    return filePath;
}

async function runAdvancedMining(clientName) {
    console.log(`🚀 Iniciando Pipeline Miner para: ${clientName}`);
    
    // ETAPA 0: Sincronização estrita (Substitui o antigo pelo novo do MD)
    syncWithStructuredICPC(clientName);

    const criteria = loadCriteria(clientName);
    if (!criteria) {
        console.error(`❌ ERRO: Critérios para ${clientName} não encontrados.`);
        return;
    }

    const SocialDiscovery = require(ETL_PATH);
    const discovery = new SocialDiscovery({ headless: false });
    
    const dateStr = new Date().toISOString().split('T')[0];
    const geoFocus = criteria.demographics?.location || 'BR';
    
    const results = {
        viralVideos: [],
        commentators: [],
        topCreators: [],
        geoFocus: geoFocus
    };

    const targetHashtags = criteria.hashtags || [];
    const discoveredHashtags = new Set();
    const targetCompetitors = criteria.competitor_brands && criteria.competitor_brands.length > 0 
        ? criteria.competitor_brands 
        : ['sallve', 'desincha', 'essential_nutrition'];

    try {
        await discovery.init();
        
        // 1. Mineração por Hashtags
        if (targetHashtags.length > 0) {
            console.log(`\n🔍 Mineração baseada em ${targetHashtags.length} hashtags ATUALIZADAS...`);
            // Pegar apenas as hashtags do MD (estão no início da lista agora)
            for (const tag of targetHashtags.slice(0, 15)) {
                console.log(`\t> Mining Hashtag: ${tag}...`);
                const vids = await discovery.discoverTikTokHashtag(tag, 10);
                vids.forEach(v => {
                    // Retroalimentação inteligente (sem lixo)
                    extractNewHashtags(v.description).forEach(h => discoveredHashtags.add(h));

                    v.geo = discovery.detectGeo(v.description, '');
                    if (results.geoFocus === 'BR' && v.geo !== 'US') {
                        v.geo = 'BR';
                    }
                    v.type = discovery.classifyProfile(v.handle, v.description);
                    if (v.geo === results.geoFocus) {
                        results.viralVideos.push(v);
                    }
                });
            }
        }

        // 2. Sniper de Comentários (Concorrentes do MD)
        console.log(`\n🕵️ Iniciando Sniper em ${targetCompetitors.length} marcas concorrentes...`);
        for (const comp of targetCompetitors) {
            console.log(`\t> Alvo: ${comp}...`);
            const compUrl = `https://www.tiktok.com/@${comp}`;
            let topPostUrl = '';
            let postDate = new Date().toISOString().split('T')[0];
            
            try {
                const compVids = await discovery.discoverTikTok(compUrl, comp);
                if (compVids && compVids.length > 0) {
                    topPostUrl = compVids[0].url;
                    postDate = compVids[0].date || postDate;
                }
            } catch (e) {
                console.log(`\t⚠️ Falha listando ${comp}: ${e.message}`);
            }
            
            if (topPostUrl) {
                try {
                    const comments = await discovery.discoverComments(topPostUrl, 15);
                    if (comments && comments.length > 0) {
                        results.commentators.push(...comments.map(c => ({...c, source: '@'+comp, date: postDate})));
                    }
                } catch(e) {}
            }
        }

    } catch (e) {
        console.error(`\n❌ CRITICAL MINING ERROR: ${e.message}`);
    } finally {
        if (discovery && discovery.browser) {
            await discovery.browser.close();
        }
    }

    // ETAPA FINAL: Persistir Retroalimentação (Hashtags Relevantes)
    if (discoveredHashtags.size > 0) {
        console.log(`\n♻️ Retroalimentação: ${discoveredHashtags.size} novas hashtags relevantes identificadas.`);
        const criteriaFiles = fs.readdirSync(CRITERIA_DIR)
            .filter(f => f.includes(clientName.toLowerCase()) && f.endsWith('.json'))
            .sort().reverse();
        
        if (criteriaFiles.length > 0) {
            const latestCriteria = path.join(CRITERIA_DIR, criteriaFiles[0]);
            const data = JSON.parse(fs.readFileSync(latestCriteria, 'utf8'));
            // Adicionar as novas SEM duplicar e sem trazer as velhas de volta
            const currentSet = new Set(data.search_criteria.hashtags);
            discoveredHashtags.forEach(h => currentSet.add(h));
            data.search_criteria.hashtags = Array.from(currentSet);
            fs.writeFileSync(latestCriteria, JSON.stringify(data, null, 2));
        }
    }

    console.log('\n📊 Processando dados coletados...');
    try {
        const creatorAgg = {};
        results.viralVideos.forEach(v => {
            if (!v.handle) return;
            if (!creatorAgg[v.handle]) {
                creatorAgg[v.handle] = { handle: v.handle, scores: [], geo: v.geo || 'N/A', type: v.type || 'unknown' };
            }
            creatorAgg[v.handle].scores.push(v.score || 0);
        });

        results.topCreators = Object.values(creatorAgg)
            .map(c => ({
                ...c,
                avg_score: c.scores.length > 0 ? (c.scores.reduce((a,b) => a+b, 0) / c.scores.length) : 0
            }))
            .filter(c => c.geo === geoFocus && c.avg_score >= 1000)
            .sort((a,b) => b.avg_score - a.avg_score)
            .slice(0, 15);

        const dossierPath = generateAdvancedDossier(clientName, results);
        
        console.log(`🔢 Gerando JSON de Descoberta...`);
        const jsonPath = path.join(DISCOVERIES_DIR, `discovery-${clientName}-${dateStr}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

        console.log(`\n✅ Pipeline Finalizado com Sucesso:`);
        console.log(`   📝 Dossier: ${dossierPath}`);
        console.log(`   🔢 JSON: ${jsonPath}`);
    } catch (e) {
        console.error(`\n❌ ERROR DURING GENERATION: ${e.message}`);
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    runAdvancedMining(args[0] || 'juvelina-organics').catch(console.error);
}
