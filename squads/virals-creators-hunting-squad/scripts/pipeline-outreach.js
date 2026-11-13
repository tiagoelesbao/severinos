/**
 * pipeline-outreach.js — Orquestrador de Outreach & Closing (Fase 3)
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-closer (Brittany)
 *
 * Fluxo completo:
 *   1. Lê dossier de qualificação e extrai creators marcadas com [x]
 *   2. Usa OpenRouter (free) para personalizar scripts DM TikTok + WhatsApp + follow-ups
 *   3. Gera dossier de outreach (MD) + batch JSON
 *   4. Cria cards no ClickUp (Space Comercial → Hunter ADS System → Prospecção)
 *
 * Usage:
 *   node scripts/pipeline-outreach.js {cliente}
 *   node scripts/pipeline-outreach.js {cliente} --dry-run
 *   node scripts/pipeline-outreach.js {cliente} --skip-clickup
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Load .env from project root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length && !key.startsWith('#')) {
            process.env[key.trim()] = vals.join('=').trim();
        }
    });
}

/**
 * Seleciona a melhor chave OpenRouter disponível.
 * Prefere MANAGEMENT_KEY (pode ter créditos) se a API_KEY falhar.
 */
function getBestOpenRouterKey() {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const mgmtKey = process.env.OPENROUTER_MANAGEMENT_KEY || '';
    // Usa a chave mais longa/ativa — management key geralmente tem créditos
    if (mgmtKey && mgmtKey.length > apiKey.length) return mgmtKey;
    return apiKey;
}

// ── Paths ──────────────────────────────────────────────────────────────
const SQUAD_ROOT = path.join(__dirname, '..');
const SCORECARDS_DIR = path.join(SQUAD_ROOT, 'data/scorecards');
const OUTREACH_DIR = path.join(SQUAD_ROOT, 'data/outreach');
const SEQUENCES_CONFIG = path.join(SQUAD_ROOT, 'config/outreach-sequences.yaml');
const CLICKUP_IDS_PATH = path.join(SQUAD_ROOT, 'config/clickup-ids.yaml');

if (!fs.existsSync(OUTREACH_DIR)) fs.mkdirSync(OUTREACH_DIR, { recursive: true });

// ── ClickUp Service ────────────────────────────────────────────────────
const CLICKUP_SERVICE = path.join(__dirname, '../../../services/clickup');
let clickupTasks;
try {
    clickupTasks = require(path.join(CLICKUP_SERVICE, 'tasks'));
} catch (err) {
    console.warn('⚠️  ClickUp service não disponível:', err.message);
}

// ── OpenRouter ─────────────────────────────────────────────────────────
const OPENROUTER_KEY = getBestOpenRouterKey();
const OPENROUTER_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',        // Llama 3.3 70B (free, robusto)
    'google/gemini-2.5-flash-preview:free',          // Gemini Flash 2.5 (free)
    'mistralai/mistral-7b-instruct:free',            // Mistral 7B (free, leve)
    'nousresearch/hermes-3-llama-3.1-405b:free',     // Hermes (free, alternativo)
    'openrouter/free',                               // Roteamento automático free-only
];

async function callOpenRouter(prompt, retries = 1) {
    if (!OPENROUTER_KEY) {
        console.warn('⚠️  OPENROUTER_API_KEY não configurada. Usando template base sem personalização IA.');
        return null;
    }

    for (const model of OPENROUTER_MODELS) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_KEY}`,
                        'HTTP-Referer': 'https://github.com/virals/hunting-squad',
                        'X-Title': 'Virals Hunter Closer',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 400,
                        temperature: 0.7,
                    }),
                });

                const data = await response.json();
                if (response.ok && data.choices?.[0]?.message?.content) {
                    return data.choices[0].message.content.trim();
                }

                const errMsg = data.error?.message || response.statusText;
                console.warn(`   ⚠️  Modelo ${model} (tentativa ${attempt + 1}): ${errMsg}`);
                await sleep(1000 * (attempt + 1));
            } catch (e) {
                console.warn(`   ⚠️  Erro de rede com ${model}: ${e.message}`);
                await sleep(1000);
            }
        }
    }

    console.warn('⚠️  OpenRouter falhou em todos os modelos. Usando template base.');
    return null;
}

// ── Helpers ────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDateStr() {
    return new Date().toISOString().split('T')[0];
}

function getDeadline(daysFromNow = 5) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toLocaleDateString('pt-BR');
}

function loadConfig() {
    const sequences = yaml.load(fs.readFileSync(SEQUENCES_CONFIG, 'utf8'));
    const clickupIds = yaml.load(fs.readFileSync(CLICKUP_IDS_PATH, 'utf8'));
    return { sequences, clickupIds };
}

// ── Step 1: Parse dossier e extrair creators marcadas [x] ──────────────
function loadLatestDossier(clientName) {
    if (!fs.existsSync(SCORECARDS_DIR)) {
        console.error(`❌ Dir não encontrado: ${SCORECARDS_DIR}`);
        return null;
    }

    const files = fs.readdirSync(SCORECARDS_DIR).filter(f =>
        f.includes(clientName) && f.endsWith('.md')
    );

    if (files.length === 0) {
        console.error(`❌ Nenhum dossier encontrado para cliente: ${clientName}`);
        console.error(`   Diretório: ${SCORECARDS_DIR}`);
        return null;
    }

    files.sort().reverse();
    const filePath = path.join(SCORECARDS_DIR, files[0]);
    console.log(`📄 Dossier carregado: ${files[0]}`);
    return { content: fs.readFileSync(filePath, 'utf8'), filePath };
}

function parseMarkedCreators(dossierContent) {
    const lines = dossierContent.split('\n');
    const marked = [];
    const seen = new Set();

    for (const line of lines) {
        // Detecta linhas com `- [x]` na tabela
        if (!line.includes('- [x]')) continue;

        // Parse da linha de tabela markdown:
        // | - [x] | **7.8** | @handle | [Ver Perfil](url) | Tier | Eng% | Nicho | Ação |
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length < 4) continue;

        // Extrai handle (col 2, ex: @luzucoloto)
        const handleRaw = cols[2] || '';
        const handle = handleRaw.startsWith('@') ? handleRaw : `@${handleRaw}`;
        if (!handle || handle === '@') continue;

        // Deduplicar por handle
        const key = handle.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        // Score (col 1, ex: **7.8**)
        const scoreRaw = cols[1] || '';
        const score = parseFloat(scoreRaw.replace(/\*/g, '')) || 7.8;

        // Tier (col 4)
        const tier = cols[4] || 'Creator Qualificada';

        // Engagement (col 5)
        const engRaw = cols[5] || 'N/A';
        const engagement = engRaw;

        // Nicho (col 6)
        const nicho = cols[6] || 'beauty/saúde';

        marked.push({ handle, score, tier, engagement, nicho });
    }

    return marked;
}

// ── Step 2: Selecionar variação Walker ─────────────────────────────────
function selectVariation(creator) {
    if (creator.score >= 8.5) return 'variacao_escassez';
    const followers = parseInt(creator.followers || '5000');
    if (followers < 10000) return 'variacao_ganho';
    return 'variacao_social_proof';
}

// ── Step 3: Personalizar script via OpenRouter ─────────────────────────
function buildBaseScript(template, creator, client) {
    return (template || '')
        .replace(/{nome}/g, creator.handle.replace('@', ''))
        .replace(/{nicho}/g, creator.nicho || 'seu nicho')
        .replace(/{referencia_post_especifico}/g, '[PERSONALIZAR: mencionar post específico da creator]')
        .replace(/{creator_referencia}/g, '@sendyqueiroz')
        .replace(/{qtd_creators}/g, '20')
        .replace(/{marca_parceira}/g, client || 'parceira')
        .replace(/{vagas_restantes}/g, '5')
        .replace(/{data_limite}/g, getDeadline())
        .replace(/{hunter_nome}/g, '[SEU NOME]');
}

async function personalizeWithAI(creator, variationName, baseScript, client) {
    const prompt = `Você é Brittany Hennessy, especialista em influencer outreach para TikTok.

Personalize este script de DM para a creator ${creator.handle} do nicho "${creator.nicho}" no TikTok.
Variação Walker: ${variationName}.
Cliente/Marca: ${client}.

Script base:
${baseScript}

Regras CRÍTICAS:
- Adapte para soar natural no TikTok DM (não Instagram)
- Referencie um tipo de post que ela provavelmente posta com base no nicho "${creator.nicho}" (ex: review de produto, rotina diária, tutorial)
- Mantenha tom amigável e direto — máximo 5 linhas
- Marque com [PERSONALIZAR: ...] qualquer referência que precisa ser verificada manualmente
- Escreva em português brasileiro
- Retorne APENAS o script final, sem explicações, sem aspas externas

Retorne somente o texto da mensagem.`;

    const aiResult = await callOpenRouter(prompt);
    return aiResult || baseScript;
}

// ── Step 4: Gerar follow-ups ───────────────────────────────────────────
function buildFollowUps(creator, sequences, client) {
    const fu = sequences.sequences?.follow_up || {};
    const base = (t) => buildBaseScript(t, creator, client)
        .replace(/{nicho}/g, creator.nicho || 'seu nicho');

    return {
        d1: base(fu.d_plus_1?.template || `Oi ${creator.handle.replace('@', '')}! Vi que não li minha mensagem ainda — coincidência ou DM sumiu? 😅`),
        d3: base(fu.d_plus_3?.template || `${creator.handle.replace('@', '')}, só passando rápido! As vagas de ${creator.nicho} tão voando esse mês 🏃`),
        d7: base(fu.d_plus_7?.template || `Última passagem, prometo! 🙏 Caso mude de ideia, tô por aqui. Boa sorte nos vídeos!`),
    };
}

// ── Step 5: Closing Guide ──────────────────────────────────────────────
function buildClosingGuide(creator, client) {
    return `### Closing Guide — ${creator.handle}

**Quando ela responder com interesse:**

1. **Qualificar no DM (2 perguntas max):**
   - "Você já fez publi antes ou seria a primeira vez?"
   - "Você tem TikTok comercial/Creator Marketplace ativado?"

2. **Mover para WhatsApp:**
   - "Posso te mandar os detalhes por WhatsApp? Fica mais fácil pra explicar tudo direitinho!"

3. **No WhatsApp — enviar WhatsApp Pitch:**
   - Enviar o script WhatsApp gerado abaixo
   - Aguardar resposta antes de enviar PDF da Jornada Viral

4. **Negociação:**
   - Fixo sugerido: R$300-400/mês (Starter) → R$500-600/mês se tiver histórico
   - Comissão: 20-25% (padrão) → 30-35% se quiser mais variável
   - Teto de bônus: R$100 (5 contratos/dia) | R$300 (10 contratos/dia)

5. **Fechar:**
   - Enviar link do formulário de onboarding
   - Marcar no ClickUp como "negotiating" → "contracted"

**Se ela pedir para pensar:**
   - "Claro! Quando posso te dar um follow-up? 3 dias?"
   - Registrar data no ClickUp > campo Notas

**Red Flags — Não contratar se:**
   - Pede pagamento adiantado
   - Quer postar sem usa produto
   - Feed 100% brandado sem conteúdo orgânico`;
}

// ── Step 6: Gerar dossier MD ───────────────────────────────────────────
function generateOutreachDossier(client, scripts, dateStr) {
    let md = `# 💬 Dossier de Outreach (Brittany) — ${client.toUpperCase()}\n`;
    md += `**Data:** ${dateStr} | **Creators Selecionadas:** ${scripts.length} | **Canal Primário:** TikTok DM\n\n`;
    md += `> ⚠️ **Execução é HUMANA** — este dossier gera os scripts, o hunter executa as DMs.\n`;
    md += `> 📋 Regra: Máximo 3 follow-ups por creator (D+1, D+3, D+7). Se respondeu NÃO → parar imediatamente.\n\n`;
    md += `---\n\n`;

    md += `## 📋 Índice de Creators\n\n`;
    md += `| # | Creator | Score | Variação | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    scripts.forEach((s, i) => {
        const tiktokUrl = `https://www.tiktok.com/${s.handle.replace('@', '@')}`;
        md += `| ${i + 1} | [${s.handle}](${tiktokUrl}) | ${s.score}/10 | ${s.variation_name} | ⏳ Pendente |\n`;
    });
    md += `\n---\n\n`;

    scripts.forEach((s, i) => {
        const tiktokUrl = `https://www.tiktok.com/${s.handle.replace('@', '@')}`;
        md += `## ${i + 1}. ${s.handle}\n\n`;
        md += `**TikTok:** [${tiktokUrl}](${tiktokUrl})\n`;
        md += `**Score:** ${s.score}/10 | **Tier:** ${s.tier} | **Nicho:** ${s.nicho}\n`;
        md += `**Variação Walker:** ${s.variation_name}\n\n`;

        md += `### 📱 DM TikTok (Abordagem Inicial)\n`;
        md += `> ⚠️ Checar e personalizar antes de enviar — substituir \`[PERSONALIZAR]\` por referência real.\n\n`;
        md += `\`\`\`\n${s.dm_script}\n\`\`\`\n\n`;

        md += `### 💬 Pitch WhatsApp (Após Resposta Positiva)\n\n`;
        md += `\`\`\`\n${s.whatsapp_script}\n\`\`\`\n\n`;

        md += `### 🔄 Sequência de Follow-Up\n\n`;
        md += `**D+1** *(se não respondeu)*\n\`\`\`\n${s.followup.d1}\n\`\`\`\n\n`;
        md += `**D+3** *(se não respondeu no D+1)*\n\`\`\`\n${s.followup.d3}\n\`\`\`\n\n`;
        md += `**D+7** *(última mensagem)*\n\`\`\`\n${s.followup.d7}\n\`\`\`\n\n`;

        md += `### 🤝 Guia de Fechamento\n\n`;
        md += `${s.closing_guide}\n\n`;
        md += `---\n\n`;
    });

    md += `## 📊 Resumo Executivo\n\n`;
    md += `| Variação | Qtd |\n`;
    md += `| :--- | :--- |\n`;
    const byVariation = {};
    scripts.forEach(s => { byVariation[s.variation_name] = (byVariation[s.variation_name] || 0) + 1; });
    Object.entries(byVariation).forEach(([v, c]) => { md += `| ${v} | ${c} |\n`; });
    md += `\n**Total:** ${scripts.length} creators para abordar\n`;
    md += `**Melhor horário:** Segunda a Quarta, 10h-12h ou 18h-20h\n`;
    md += `**Se taxa de resposta < 10%:** Acionar @walker-launch para revisar scripts na L10 Meeting\n\n`;
    md += `---\n_Gerado por: Virals Hunter Closer Pipeline v1.0_\n_Agent: @hunter-closer (Brittany Hennessy)_\n_Data: ${dateStr}_\n`;

    return md;
}

// ── Step 7: Push para ClickUp ──────────────────────────────────────────
async function pushToClickUp(scripts, config, client, dryRun = false) {
    const listId = config.clickupIds.clickup.prospection.list.id;
    const clienteFieldId = config.clickupIds.clickup.prospection.custom_fields?.existing?.cliente?.id;

    console.log(`\n📤 Sincronizando ${scripts.length} creators com ClickUp...`);
    console.log(`   📋 Lista: Prospecção (${listId})`);

    if (dryRun) {
        console.log('   🧪 DRY RUN — nenhuma mudança será feita no ClickUp\n');
        scripts.forEach(s => {
            console.log(`   Would create: "${s.handle}" — Score: ${s.score} (${s.variation_name})`);
        });
        return { created: 0, skipped: scripts.length, dryRun: true };
    }

    if (!clickupTasks) {
        console.error('❌ ClickUp service não disponível. Use --skip-clickup ou rode do diretório raiz.');
        return { created: 0, skipped: scripts.length, error: 'service_unavailable' };
    }

    let created = 0, skipped = 0;

    for (const s of scripts) {
        try {
            const taskName = `${s.handle} — ${s.tier} (${s.score}/10) 📱 TikTok`;
            const tiktokUrl = `https://www.tiktok.com/${s.handle.replace('@', '@')}`;

            const description = [
                `**Handle:** ${s.handle}`,
                `**TikTok:** ${tiktokUrl}`,
                `**Score:** ${s.score}/10`,
                `**Tier:** ${s.tier}`,
                `**Nicho:** ${s.nicho}`,
                `**Variação Walker:** ${s.variation_name}`,
                `**Outreach Gerado:** ${s.generated_at}`,
                `**Cliente:** ${client}`,
                ``,
                `---`,
                ``,
                `**📱 Script DM TikTok:**`,
                s.dm_script,
                ``,
                `**🔄 Follow-up D+1:**`,
                s.followup.d1,
            ].join('\n');

            await clickupTasks.createTask(listId, taskName, description, 'to do');
            created++;
            console.log(`   ✅ Created: ${s.handle}`);
        } catch (err) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
                console.log(`   ⚠️  Já existe: ${s.handle} — pulando`);
            } else {
                console.error(`   ❌ Falha: ${s.handle} — ${msg}`);
            }
            skipped++;
        }

        await sleep(600); // Rate limit ClickUp
    }

    console.log(`\n📊 ClickUp: ${created} criados | ${skipped} pulados`);
    return { created, skipped };
}

// ── Main Pipeline ──────────────────────────────────────────────────────
async function runOutreachPipeline(clientName, options = {}) {
    const { dryRun = false, skipClickUp = false, skipAI = false } = options;

    console.log('\n' + '═'.repeat(62));
    console.log('💬 [hunter-closer] Outreach & Closing Pipeline — Fase 3');
    if (dryRun) console.log('   🧪 MODO: DRY RUN');
    console.log('═'.repeat(62));
    console.log(`📌 Cliente: ${clientName}`);
    console.log(`⚡ OpenRouter: ${OPENROUTER_KEY ? 'Configurado ✅' : 'Não configurado ⚠️'}${skipAI ? ' [--skip-ai: desativado]' : ''}`);
    console.log('─'.repeat(62));

    // 1. Carregar configs
    const config = loadConfig();
    const sequences = config.sequences;

    // 2. Carregar dossier e extrair creators marcadas
    const dossier = loadLatestDossier(clientName);
    if (!dossier) return;

    const creators = parseMarkedCreators(dossier.content);
    if (creators.length === 0) {
        console.log('⚠️  Nenhuma creator marcada com [x] encontrada no dossier.');
        console.log('   Marque creators no dossier com `- [x]` para incluir no outreach.');
        return;
    }

    console.log(`\n🎯 Creators selecionadas [x]: ${creators.length}`);
    creators.forEach((c, i) => console.log(`   ${i + 1}. ${c.handle} (Score: ${c.score} | ${c.nicho})`));

    // 3. Gerar scripts para cada creator
    console.log('\n✍️  Gerando scripts de outreach...');
    const scripts = [];

    for (let i = 0; i < creators.length; i++) {
        const creator = creators[i];
        const variation = selectVariation(creator);
        const seqData = sequences.sequences?.[variation] || {};
        const variationName = seqData.name || variation;

        console.log(`\n   [${i + 1}/${creators.length}] ${creator.handle} → ${variationName}`);

        // DM TikTok base
        const baseScript = buildBaseScript(seqData.template || '', creator, clientName);

        // Personalizar via IA (se disponível e não pulado)
        let dmScript = baseScript;
        if (OPENROUTER_KEY && !skipAI) {
            process.stdout.write('     🤖 Personalizando via OpenRouter... ');
            dmScript = await personalizeWithAI(creator, variationName, baseScript, clientName);
            console.log('✅');
            await sleep(350); // Rate limit OpenRouter
        } else if (skipAI) {
            console.log('     ⏭️  IA pulada (--skip-ai)');
        }

        // WhatsApp script (sem IA — template estruturado)
        const wpData = sequences.sequences?.whatsapp_conversion || {};
        const whatsappScript = buildBaseScript(wpData.template || '', creator, clientName)
            .replace(/{hunter_nome}/g, '[SEU NOME]');

        // Follow-ups
        const followup = buildFollowUps(creator, sequences, clientName);

        // Closing guide
        const closingGuide = buildClosingGuide(creator, clientName);

        scripts.push({
            handle: creator.handle,
            score: creator.score,
            tier: creator.tier,
            nicho: creator.nicho,
            variation,
            variation_name: variationName,
            dm_script: dmScript,
            whatsapp_script: whatsappScript,
            followup,
            closing_guide: closingGuide,
            generated_at: new Date().toISOString(),
            status: 'pending_send',
            note: '⚠️ PERSONALIZAR antes de enviar — substituir [PERSONALIZAR] por referência real!',
        });
    }

    // 4. Salvar dossier MD
    const dateStr = getDateStr();
    const dossierMd = generateOutreachDossier(clientName, scripts, dateStr);
    const dossierPath = path.join(OUTREACH_DIR, `dossier-outreach-${clientName}-${dateStr}.md`);

    if (!dryRun) {
        fs.writeFileSync(dossierPath, dossierMd);
        console.log(`\n📝 Dossier de Outreach: ${dossierPath}`);
    } else {
        console.log(`\n📝 [DRY RUN] Dossier seria salvo: ${dossierPath}`);
    }

    // 5. Salvar JSON batch
    const batchJson = {
        metadata: {
            date: dateStr,
            client: clientName,
            total: scripts.length,
            source_dossier: dossier.filePath,
            pipeline: 'pipeline-outreach.js v1.0',
            agent: '@hunter-closer (Brittany)',
        },
        scripts,
    };
    const jsonPath = path.join(OUTREACH_DIR, `outreach-batch-${clientName}-${dateStr}.json`);

    if (!dryRun) {
        fs.writeFileSync(jsonPath, JSON.stringify(batchJson, null, 2));
        console.log(`📦 Batch JSON: ${jsonPath}`);
    }

    // 6. Push para ClickUp
    if (!skipClickUp) {
        const clickupResult = await pushToClickUp(scripts, config, clientName, dryRun);
        batchJson.metadata.clickup = clickupResult;
    } else {
        console.log('\n⏭️  ClickUp sync pulado (--skip-clickup)');
    }

    // 7. Summary
    console.log('\n' + '═'.repeat(62));
    console.log('🏁 OUTREACH PIPELINE CONCLUÍDO!');
    console.log('═'.repeat(62));
    console.log(`✅ Scripts gerados: ${scripts.length}`);
    if (!dryRun) {
        console.log(`📝 Dossier: ${path.basename(dossierPath)}`);
        console.log(`📦 JSON: ${path.basename(jsonPath)}`);
    }
    console.log(`\n💬 Próximos passos:`);
    console.log(`   1. Abrir dossier de outreach e revisar cada script`);
    console.log(`   2. Substituir [PERSONALIZAR] por referência real do perfil`);
    console.log(`   3. Enviar DMs no horário ideal (Seg-Qua, 10h-12h ou 18h-20h)`);
    console.log(`   4. Atualizar status no ClickUp conforme respostas chegam`);
    console.log(`   5. Se taxa de resposta < 10% → acionar @walker-launch`);
    console.log('═'.repeat(62));
}

// ── CLI ────────────────────────────────────────────────────────────────
if (require.main === module) {
    const args = process.argv.slice(2);
    const clientName = args.find(a => !a.startsWith('--')) || 'juvelina-organics';
    const dryRun = args.includes('--dry-run');
    const skipClickUp = args.includes('--skip-clickup');
    const skipAI = args.includes('--skip-ai');

    if (!args.find(a => !a.startsWith('--'))) {
        console.log('Usage: node pipeline-outreach.js {cliente} [--dry-run] [--skip-clickup] [--skip-ai]');
        console.log('Example: node pipeline-outreach.js juvelina-organics');
        console.log('         node pipeline-outreach.js juvelina-organics --dry-run');
        console.log('         node pipeline-outreach.js juvelina-organics --skip-ai   # usa templates base sem IA');
    }

    runOutreachPipeline(clientName, { dryRun, skipClickUp, skipAI }).catch(err => {
        console.error('❌ Pipeline falhou:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
}

module.exports = { runOutreachPipeline };
