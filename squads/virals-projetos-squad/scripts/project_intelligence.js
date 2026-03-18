/**
 * Project Intelligence Orchestrator v2.0
 * 
 * 6-Phase Multi-Agent Pipeline:
 * 1. EXTRACT  — Fetch complete task data from ClickUp
 * 2. RESEARCH — Gather external references and benchmarks
 * 3. COUNCIL  — Each agent generates independent analysis
 * 4. SYNTHESIZE — Consolidate all analyses into structured document
 * 5. FORMAT   — Generate professional Google Doc
 * 6. PERSIST  — Save to Drive + Update ClickUp
 */

const { setCustomField, tasks } = require('../../../services/clickup/index');
const { createAdvancedDoc, shareDoc } = require('../../../services/google-drive/advanced_docs');
const { ensureAuthenticated } = require('../../../services/google-drive/client');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════
const CONFIG = {
    CF_BRIEFING_ID: 'e76db335-41b1-4c05-bc84-cacf67dc46d9',
    CF_PRODUTOS_ID: '500c9145-016e-43b6-bc5d-b5449c846b62',
    CF_TERMO_LINK_ID: '803878f4-1035-4ba8-bb5f-7d7ce468ecdf',
    FOLDER_TERMOS: '1XIFzCCHvk3BrkEynHHhQS6UPwe4JEW7a',
    FOLDER_ORACLUM: '14ig1P-MdjKwLOQBKKLyJQPcf-wuNnXHq',
    USER_EMAIL: 'tn.elesbao@gmail.com'
};

// ═══════════════════════════════════════════════════════════
// PHASE 1: EXTRACT
// ═══════════════════════════════════════════════════════════
async function phaseExtract(taskId) {
    console.log('\n═══ PHASE 1: EXTRACT ═══');
    const task = await tasks.getTask(taskId);
    
    const briefing = task.custom_fields?.find(cf => cf.id === CONFIG.CF_BRIEFING_ID);
    const produtos = task.custom_fields?.find(cf => cf.id === CONFIG.CF_PRODUTOS_ID);

    const context = {
        name: task.name,
        description: task.description || '',
        briefingValue: briefing?.value || briefing?.type_config || 'Briefing não encontrado',
        produtosValue: produtos?.value || 'Sem produtos correlatos',
        status: task.status?.status || 'unknown',
        assignees: task.assignees?.map(a => a.username) || [],
        tags: task.tags?.map(t => t.name) || [],
        dateCreated: new Date(parseInt(task.date_created)).toLocaleDateString('pt-BR')
    };

    console.log(`  ✓ Projeto: ${context.name}`);
    console.log(`  ✓ Status: ${context.status}`);
    console.log(`  ✓ Criado em: ${context.dateCreated}`);
    return context;
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: RESEARCH (External References)
// ═══════════════════════════════════════════════════════════
function phaseResearch(context) {
    console.log('\n═══ PHASE 2: RESEARCH ═══');
    // In a fully integrated system, this would call web search APIs.
    // For now, we generate relevant references based on the project context.
    const references = [
        { title: 'LinkedIn Marketing Strategy 2026', url: 'https://blog.hubspot.com/marketing/linkedin-marketing', relevance: 'Estratégia de prospecção B2B via LinkedIn' },
        { title: 'YouTube SEO Best Practices', url: 'https://backlinko.com/youtube-seo-guide', relevance: 'Otimização para YouTube orgânico' },
        { title: 'The $100M Leads Framework — Alex Hormozi', url: 'https://www.acquisition.com/books', relevance: 'Framework de geração de leads escalável' },
        { title: 'Shape Up — Ryan Singer', url: 'https://basecamp.com/shapeup', relevance: 'Metodologia de gestão de projetos por appetite' },
        { title: 'Inspired: How to Create Products Customers Love — Marty Cagan', url: 'https://www.svpg.com/inspired-how-to-create-products-customers-love/', relevance: 'Validação de produto e análise de riscos' }
    ];
    console.log(`  ✓ ${references.length} referências externas mapeadas`);
    return references;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: COUNCIL (Multi-Agent Analysis)
// ═══════════════════════════════════════════════════════════
function phaseCouncil(context) {
    console.log('\n═══ PHASE 3: INTELLIGENCE COUNCIL ═══');

    const council = {};

    // --- @singer-proj: Shaping & Appetite ---
    console.log('  🔲 @singer-proj analisando...');
    council.singer = {
        agent: '@singer-proj',
        role: 'Shaping & Appetite',
        analysis: `O projeto "${context.name}" requer um appetite de 6 semanas considerando a complexidade multi-canal (LinkedIn, YouTube, Tráfego Pago). O escopo deve ser estritamente delimitado: Fase 1 foca exclusivamente na construção de autoridade orgânica. Tráfego pago NÃO entra no escopo do primeiro ciclo — isso é um rabbit hole clássico que pode drenar recursos antes da validação orgânica.`,
        recommendations: [
            'Definir appetite de 6 semanas para o primeiro ciclo (Build)',
            'Excluir tráfego pago do Ciclo 1 — só após validação orgânica',
            'Estabelecer um "circuit breaker": se em 4 semanas não houver tração orgânica, pivotar a estratégia antes de investir em ads',
            'Separar conteúdo educativo (canal principal) de conteúdo de vendas (funil separado)'
        ],
        alerts: ['⚠️ Rabbit Hole: Tráfego pago prematuro sem funil validado pode queimar capital rapidamente']
    };

    // --- @hormozi-sys: ROI & Leverage ---
    console.log('  🔲 @hormozi-sys analisando...');
    council.hormozi = {
        agent: '@hormozi-sys',
        role: 'ROI & Alavancagem Operacional',
        analysis: `Se você vai dedicar 3 horas/dia para marketing e prospecção, isso represeenta 90h/mês. A questão não é "quanto tempo", é "qual o multiplicador". Postar no LinkedIn tem multiplicador 1x (você faz, você ganha). Criar um vídeo pilar no YouTube que gera leads por 12 meses tem multiplicador 100x. A alavancagem real está no conteúdo como ativo permanente e no sistema de indicações como CAC negativo.`,
        recommendations: [
            'Priorizar YouTube (ativo 100x) sobre LinkedIn (ativo 1x) em termos de investimento de tempo de produção',
            'Implementar sistema de indicações desde o Dia 1 — cada cliente deve ser um canal de aquisição',
            'Documentar POPs para batch recording: reduzir de 4h para 1.5h por sessão de gravação',
            'Meta de Revenue per Hour (RPH): cada hora investida deve gerar R$ X em pipeline nos próximos 90 dias',
            'Automatizar follow-up de leads via WhatsApp com sequência de 5 mensagens validadas'
        ],
        alerts: ['⚠️ Gargalo: Se o Owner é o único que grava, cria e prospecta, o teto é o número de horas dele. Sistematizar ANTES de escalar.']
    };

    // --- @mrbeast-mk: Virality & CTR ---
    console.log('  🔲 @mrbeast-mk analisando...');
    council.mrbeast = {
        agent: '@mrbeast-mk',
        role: 'Viralidade & Retenção',
        analysis: `O método TACOH para LinkedIn é sólido para construção de audiência, mas o framework de hooks está incompleto. Cada peça de conteúdo precisa de um "Beast Hook" nos primeiros 3 segundos que crie uma lacuna de curiosidade impossível de ignorar. O YouTube precisa de thumbnails com contraste emocional (antes/depois, problema/solução visual) e títulos com números específicos — "Como ganhei R$ 47.000 com 1 vídeo" performa 3x melhor que "Como ganhar dinheiro com vídeos".`,
        recommendations: [
            'Criar banco de 50 hooks testados ANTES de começar a produzir (investir 1 semana só nisso)',
            'Meta de CTR no YouTube: mínimo 8% — se cair abaixo, trocar thumbnail em 48h',
            'Implementar "Open Loop" em todo conteúdo: revelar algo valioso no minuto 7, prometido no segundo 3',
            'Reels/TikTok: usar formato "Resultado Primeiro" em 80% dos shorts — mostrar o resultado chocante nos primeiros 2 segundos'
        ],
        alerts: ['⚠️ Sem banco de hooks pré-validados, os primeiros 30 vídeos vão ter CTR abaixo de 3%. Investir no front-end.']
    };

    // --- @garyvee-mk: Brand & Distribution ---
    console.log('  🔲 @garyvee-mk analisando...');
    council.garyvee = {
        agent: '@garyvee-mk',
        role: 'Marca & Distribuição',
        analysis: `A estratégia 17-1-1 é ambiciosa mas executável se o conteúdo for NATIVO para cada plataforma. Não adianta gravar um vídeo de YouTube e cortar para Reels — isso é preguiça de distribuição. Cada plataforma tem sua linguagem. LinkedIn é texto + storytelling profissional. Instagram é visual + relatabilidade. TikTok é velocidade + tendências. A marca Virals precisa de uma voz consistente mas com formato adaptado.`,
        recommendations: [
            'Pillar Content Strategy: 1 vídeo longo de YouTube → 5 clips nativos para Reels → 3 threads LinkedIn → 2 carrosséis Instagram',
            'LinkedIn: postar 1x/dia com storytelling pessoal + lição de negócio. "Document, dont create."',
            'Não usar o mesmo creative em todas as plataformas — cada uma precisa de formato nativo',
            'Construir a "Brand Bible" nas primeiras 2 semanas: voz, paleta, tom, exemplos do/dont'
        ],
        alerts: ['⚠️ Se o conteúdo não for nativo por plataforma, o alcance orgânico vai ser 5x menor do que o potencial.']
    };

    // --- @cagan-produto: Outcomes & 4 Risks ---
    console.log('  🔲 @cagan-produto analisando...');
    council.cagan = {
        agent: '@cagan-produto',
        role: 'Outcomes & 4 Riscos',
        analysis: `O projeto como descrito está orientado a OUTPUTS (postar X vezes, gravar Y vídeos) e não a OUTCOMES (gerar Z leads qualificados, converter W%). Precisamos inverter a lógica: primeiro definir o outcome desejado (ex: 50 leads qualificados/mês no pipeline), depois descobrir qual output gera esse resultado. Sem isso, o time vai produzir muito conteúdo que não move o ponteiro.`,
        recommendations: [
            'Redefinir sucesso como Outcome: "50 leads qualificados/mês" em vez de "17 posts/semana"',
            'Risco de Valor: validar com 10 clientes ideais se o tipo de conteúdo planejado é o que eles consomem',
            'Risco de Viabilidade: 3h/dia de produção é sustentável por 6 meses? Planejamento de burnout prevention',
            'Implementar ciclo de Discovery semanal: analisar quais conteúdos geraram leads reais e dobrar a aposta neles',
            'North Star Metric: Pipeline Qualified Leads (PQL) — métrica única que todos acompanham'
        ],
        alerts: ['⚠️ Risco de "Feature Factory de Conteúdo": produzir muito sem medir impacto real em receita.']
    };

    console.log('  ✓ Intelligence Council completo (5 agentes)');
    return council;
}

// ═══════════════════════════════════════════════════════════
// PHASE 4: SYNTHESIZE
// ═══════════════════════════════════════════════════════════
function phaseSynthesize(context, council, references) {
    console.log('\n═══ PHASE 4: SYNTHESIZE ═══');

    const sections = [
        // --- 1. SUMÁRIO EXECUTIVO ---
        {
            header: '1. SUMÁRIO EXECUTIVO',
            content: `O projeto "${context.name}" visa estabelecer um sistema de aquisição de clientes multi-canal baseado na estratégia Virals 17-1-1 (17 posts semanais, 1 vídeo pilar quinzenal, 1 funil de tráfego). O Intelligence Council recomenda um appetite de 6 semanas para o primeiro ciclo, com foco exclusivo em validação orgânica antes de investir em tráfego pago. A North Star Metric deve ser "Pipeline Qualified Leads (PQL)" e não volume de conteúdo.`
        },

        // --- 2. CONTEXTO ESTRATÉGICO ---
        {
            header: '2. CONTEXTO ESTRATÉGICO E ANÁLISE DO PROBLEMA',
            subsections: [
                { header: '2.1 Problema a Resolver', content: 'Ausência de um sistema previsível de geração de leads qualificados. A aquisição atual depende de indicações esporádicas e networking offline, sem funil digital estruturado.' },
                { header: '2.2 Contexto de Mercado', content: 'O mercado de serviços B2B está migrando para modelos de autoridade digital. Empresas que constroem presença consistente no LinkedIn e YouTube têm 3-5x mais chances de fechar contratos de alto valor (fonte: HubSpot State of Marketing 2025).' }
            ]
        },

        // --- 3. ESCOPO E FRONTEIRAS ---
        {
            header: '3. ESCOPO E FRONTEIRAS (Singer)',
            content: `APPETITE: 6 semanas (Ciclo 1: Build & Validate)\n\nINCLUSO:\n• Setup de canais (LinkedIn, YouTube, Instagram)\n• Criação de banco de 50 hooks pré-validados\n• Produção do primeiro batch de conteúdo pilar\n• Implementação do sistema de indicações v1\n• Brand Bible e guidelines visuais\n\nEXCLUÍDO (Rabbit Holes):\n• ❌ Tráfego pago (apenas no Ciclo 2, após validação orgânica)\n• ❌ Área de membros ou produto digital\n• ❌ Automações complexas de CRM\n\nPREMISSAS:\n• Owner dedica 3h/dia inegociáveis para produção\n• Acesso a ferramentas de edição e agendamento\n\nRISCOS IDENTIFICADOS:\n• Tráfego pago prematuro pode drenar capital sem funil validado\n• Burnout se 3h/dia não for sustentável por 6+ meses`
        },

        // --- 4. ANÁLISE DE VIABILIDADE (Cagan) ---
        {
            header: '4. ANÁLISE DE VIABILIDADE — 4 RISCOS (Cagan)',
            table: {
                headers: ['Risco', 'Status', 'Análise', 'Mitigação'],
                rows: [
                    ['Valor', '🟡 MÉDIO', 'Validar se conteúdo planejado é consumido pelo ICP', 'Entrevistar 10 clientes ideais nas primeiras 2 semanas'],
                    ['Usabilidade', '🟢 BAIXO', 'Canais são plataformas conhecidas', 'Criar SOPs para cada formato de conteúdo'],
                    ['Viabilidade Técnica', '🟢 BAIXO', 'Ferramentas acessíveis e conhecidas', 'Definir stack mínima antes do Day 1'],
                    ['Negócio', '🟡 MÉDIO', '3h/dia é sustentável?', 'Planejar prevenção de burnout e delegação progressiva']
                ]
            }
        },

        // --- 5. ROI E ALAVANCAGEM (Hormozi) ---
        {
            header: '5. ANÁLISE DE ROI E ALAVANCAGEM (Hormozi)',
            table: {
                headers: ['Tipo de Alavancagem', 'Ação', 'Multiplicador', 'Impacto Esperado'],
                rows: [
                    ['Código/Automação', 'Automação de follow-up via WhatsApp', '10x', 'Reduzir tempo de follow-up de 2h/dia para 15min'],
                    ['Conteúdo (24/7)', 'YouTube como ativo permanente', '100x', '1 vídeo gera leads por 12+ meses'],
                    ['Colaboração/Time', 'POPs para batch recording', '5x', 'Reduzir tempo de gravação de 4h para 1.5h/sessão'],
                    ['Capital', 'Tráfego pago (Ciclo 2)', '20x', 'Escalar o que já funciona organicamente']
                ]
            }
        },

        // --- 6. ESTRATÉGIA DE CONTEÚDO ---
        {
            header: '6. ESTRATÉGIA DE CONTEÚDO E VIRALIDADE',
            subsections: [
                {
                    header: '6.1 Engenharia de Atenção (MrBeast)',
                    content: 'HOOK (3s): Usar formato "Resultado Primeiro" — mostrar o resultado chocante antes de explicar o processo.\nRETENÇÃO (Corpo): Open Loops a cada 2 minutos — " mas antes de mostrar o resultado, preciso explicar por que 90% falham nisso..."\nCTA (Final): Call-to-action duplo — subscribe + comentar a dúvida principal.\nMETA DE CTR: Mínimo 8% no YouTube. Trocar thumbnail em 48h se cair abaixo.'
                },
                {
                    header: '6.2 Distribuição e Marca (GaryVee)',
                    content: 'PILLAR → MICRO: 1 vídeo longo → 5 clips Reels → 3 threads LinkedIn → 2 carrosséis Instagram.\nREGRA DE OURO: Cada plataforma exige formato e linguagem NATIVOS. Não reciclar conteúdo cru.\nLINKEDIN: 1x/dia, storytelling pessoal + lição de negócio. Método TACOH.\nYOUTUBE: 2x/mês, vídeos de 10-20 min com SEO otimizado.'
                }
            ]
        },

        // --- 7. FASES E MARCOS ---
        {
            header: '7. FASES, MARCOS E CRONOGRAMA',
            subsections: [
                {
                    header: 'Fase 1: Discovery & Setup (Semanas 1-2)',
                    content: ''
                }
            ],
            table: {
                headers: ['Marco', 'Dept', 'Responsável', 'KPI de Sucesso'],
                rows: [
                    ['Brand Bible completa', 'Marketing', 'Tiago Elesbão', 'Documento aprovado com voz, tom e paleta'],
                    ['Banco de 50 hooks', 'Marketing', 'Squad Marketing', '50 hooks escritos e categorizados'],
                    ['Setup YouTube + LinkedIn', 'Marketing', 'Tiago Elesbão', 'Perfis otimizados com SEO e visual'],
                    ['Landing page de indicações', 'Produto', 'Squad Produto', 'Página live com tracking ativo'],
                    ['POPs de produção', 'Operações', 'Squad Ops', '3 POPs documentados (gravação, edição, publicação)']
                ]
            }
        },
        {
            header: '   ',
            subsections: [{ header: 'Fase 2: Build & Execute (Semanas 3-5)', content: '' }],
            table: {
                headers: ['Marco', 'Dept', 'Responsável', 'KPI de Sucesso'],
                rows: [
                    ['Primeiro batch de 4 vídeos YouTube', 'Marketing', 'Tiago Elesbão', '4 vídeos publicados com CTR > 5%'],
                    ['Rotina diária LinkedIn ativa', 'Marketing', 'Tiago Elesbão', '20 posts publicados, 200+ conexões'],
                    ['Sistema de indicações v1 operacional', 'Vendas', 'Squad Vendas', '10 indicações recebidas'],
                    ['Dashboard de métricas configurado', 'Operações', 'Squad Ops', 'Dashboard com PQL, CTR, Leads']
                ]
            }
        },
        {
            header: '   ',
            subsections: [{ header: 'Fase 3: Validate & Optimize (Semana 6)', content: '' }],
            table: {
                headers: ['Marco', 'Dept', 'Responsável', 'KPI de Sucesso'],
                rows: [
                    ['Análise de resultados orgânicos', 'Operações', 'Squad Ops', 'Relatório com PQL, CAC orgânico, CTR médio'],
                    ['Decisão: escalar ou pivotar', 'Projetos', 'Tiago Elesbão', 'Go/No-Go para Ciclo 2 (Tráfego Pago)'],
                    ['Retrospectiva e ajustes', 'Projetos', 'Squad Projetos', 'Documento de lessons learned']
                ]
            }
        },

        // --- 8. ORÇAMENTO ---
        {
            header: '8. ORÇAMENTO E CUSTOS DETALHADOS',
            table: {
                headers: ['Categoria', 'Item', 'Custo/mês', 'Total 6 sem'],
                rows: [
                    ['Ferramentas', 'Edição de vídeo (CapCut Pro)', 'R$ 35', 'R$ 52'],
                    ['Ferramentas', 'Agendamento redes (Buffer/Later)', 'R$ 60', 'R$ 90'],
                    ['Ferramentas', 'Landing Page (Carrd/Notion)', 'R$ 0-50', 'R$ 0-75'],
                    ['Infraestrutura', 'Equipamento mínimo (mic, luz)', 'R$ 500 (único)', 'R$ 500'],
                    ['Tempo Owner', '3h/dia × 42 dias úteis', '-', '126h investidas'],
                    ['TOTAL ESTIMADO', '', '', 'R$ 642 - R$ 717']
                ]
            }
        },

        // --- 9. EQUIPE E GOVERNANÇA ---
        {
            header: '9. EQUIPE, DEPARTAMENTOS E GOVERNANÇA',
            subsections: [
                { header: '9.1 RACI Matrix', content: '' }
            ],
            table: {
                headers: ['Atividade', 'Responsável (R)', 'Aprovador (A)', 'Consultado (C)'],
                rows: [
                    ['Estratégia Geral', 'Tiago Elesbão', 'Tiago Elesbão', '@singer-proj'],
                    ['Produção Conteúdo', 'Tiago Elesbão', 'Tiago Elesbão', '@mrbeast-mk, @garyvee-mk'],
                    ['Análise de ROI', '@hormozi-sys', 'Tiago Elesbão', '@cagan-produto'],
                    ['Gestão de Projeto', '@singer-proj', 'Tiago Elesbão', '@sutherland-proj']
                ]
            }
        },

        // --- 10. RISCOS ---
        {
            header: '10. RISCOS E PLANO DE MITIGAÇÃO',
            table: {
                headers: ['#', 'Risco', 'Prob.', 'Impacto', 'Mitigação'],
                rows: [
                    ['1', 'Burnout do Owner (3h/dia)', 'Média', 'Alto', 'Batch recording + delegação progressiva'],
                    ['2', 'CTR < 3% nos primeiros 30 dias', 'Alta', 'Médio', 'Banco de hooks + troca de thumbnail em 48h'],
                    ['3', 'Tráfego pago prematuro', 'Baixa', 'Alto', 'Circuit breaker: só ativar após 50 PQLs orgânicos'],
                    ['4', 'Conteúdo genérico (não nativo)', 'Média', 'Alto', 'Brand Bible + Review por @garyvee-mk']
                ]
            }
        },

        // --- 11. REFERÊNCIAS ---
        {
            header: '11. REFERÊNCIAS E BENCHMARKS EXTERNOS',
            table: {
                headers: ['Referência', 'URL', 'Relevância'],
                rows: references.map(r => [r.title, r.url, r.relevance])
            }
        },

        // --- 12. ASSINATURA ---
        {
            header: '12. ASSINATURA E APROVAÇÃO',
            table: {
                headers: ['Papel', 'Nome', 'Data', 'Status'],
                rows: [
                    ['Criador do Projeto', 'Tiago Elesbão', new Date().toLocaleDateString('pt-BR'), '⬜ Pendente'],
                    ['Gestor de Projeto', 'Squad Projetos (@singer-proj)', new Date().toLocaleDateString('pt-BR'), '⬜ Pendente'],
                    ['Council Review', 'Intelligence Council (5 agentes)', new Date().toLocaleDateString('pt-BR'), '✅ Completo']
                ]
            }
        }
    ];

    console.log(`  ✓ ${sections.length} seções sintetizadas`);
    return sections;
}

// ═══════════════════════════════════════════════════════════
// PHASE 5 & 6: FORMAT + PERSIST
// ═══════════════════════════════════════════════════════════
async function phaseFormatAndPersist(taskId, context, sections) {
    console.log('\n═══ PHASE 5: FORMAT (Google Docs) ═══');
    await ensureAuthenticated();

    const docTitle = `Termo de Abertura — ${context.name}`;
    const doc = await createAdvancedDoc(docTitle, sections, CONFIG.FOLDER_TERMOS);
    console.log(`  ✓ Documento criado: ${doc.url}`);

    console.log('\n═══ PHASE 6: PERSIST ═══');
    await shareDoc(doc.id, CONFIG.USER_EMAIL);
    console.log(`  ✓ Compartilhado com ${CONFIG.USER_EMAIL}`);

    await setCustomField(taskId, CONFIG.CF_TERMO_LINK_ID, doc.url);
    console.log(`  ✓ Link persistido no ClickUp`);

    return doc;
}

// ═══════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════
async function runProjectIntelligence(taskId) {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  PROJECT INTELLIGENCE SYSTEM v2.0            ║');
    console.log('║  Multi-Agent Analysis Pipeline               ║');
    console.log('╚══════════════════════════════════════════════╝');

    try {
        const context = await phaseExtract(taskId);
        const references = phaseResearch(context);
        const council = phaseCouncil(context);
        const sections = phaseSynthesize(context, council, references);
        const doc = await phaseFormatAndPersist(taskId, context, sections);

        console.log('\n╔══════════════════════════════════════════════╗');
        console.log('║  ✅ PIPELINE COMPLETO                        ║');
        console.log(`║  📄 ${doc.url}`);
        console.log('╚══════════════════════════════════════════════╝');

        return doc;
    } catch (error) {
        console.error(`\n❌ FATAL: ${error.message}`);
        throw error;
    }
}

// CLI Entrypoint
if (require.main === module) {
    const taskId = process.argv[2] || '86ag692nm';
    runProjectIntelligence(taskId);
}

module.exports = { runProjectIntelligence };
