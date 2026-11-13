/**
 * briefing-to-icp.js — Transformador de Briefing de Cliente → ICP-C + Search Criteria
 * Squad: virals-creators-hunting-squad
 * Agent: @hunter-chief (Joe)
 * 
 * Recebe um briefing livre de cliente (como o da Juvelina Organics) e gera:
 *   1. ICP-C estruturado (Markdown, seguindo templates/icp-c-template.md)
 *   2. Search Criteria JSON (input direto para hunt-creators.js)
 *   3. Readiness Checklist preenchida (validação)
 * 
 * O briefing do cliente pode vir em qualquer formato — o script extrai
 * informações via parsing heurístico de seções Markdown.
 * 
 * Usage:
 *   node briefing-to-icp.js --briefing ./data/icp-briefings/ICP-C_Juvelina_Organics.md
 *   node briefing-to-icp.js --briefing ./data/icp-briefings/ICP-C_Juvelina_Organics.md --dry-run
 *   node briefing-to-icp.js --list   (lista briefings disponíveis)
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// ── Paths ────────────────────────────────────────────────
const SQUAD_ROOT = path.join(__dirname, '..');
const NICHES_CATALOG_PATH = path.join(SQUAD_ROOT, 'data/niches-catalog.yaml');
const BRIEFINGS_DIR = path.join(SQUAD_ROOT, 'data/icp-briefings');
const OUTPUT_DIR = path.join(SQUAD_ROOT, 'data');
const ICP_OUTPUT_DIR = path.join(SQUAD_ROOT, 'data/icp-structured');
const CHECKLIST_OUTPUT_DIR = path.join(SQUAD_ROOT, 'data/readiness-reports');

// Ensure output dirs
[ICP_OUTPUT_DIR, CHECKLIST_OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Load dependencies ────────────────────────────────────
function loadNichesCatalog() {
    try {
        return yaml.load(fs.readFileSync(NICHES_CATALOG_PATH, 'utf8'));
    } catch (e) {
        console.warn('⚠️ Could not load niches-catalog.yaml:', e.message);
        return { niches: {} };
    }
}

// ── Briefing Parser ──────────────────────────────────────
/**
 * Parse a free-form client briefing into structured sections.
 * Works by splitting on ## headings and extracting key patterns.
 */
function parseBriefing(content) {
    const parsed = {
        raw: content,
        brand: {},
        consumer: {},
        creator_profile: {},
        product: {},
        content_formats: [],
        hooks: [],
        compliance: { can: [], cannot: [] },
        partnership: {},
        hashtags: [],
        tone: {},
        resources: []
    };

    // ── Extract brand name from title / first heading ────
    const titleMatch = content.match(/^#\s+.*$/m);
    const subtitleMatch = content.match(/^##\s+(.*?)(?:\s*\||\s*—)/m);
    if (subtitleMatch) {
        parsed.brand.name = subtitleMatch[1].trim();
    } else if (titleMatch) {
        // Try to extract from first heading
        const h1 = titleMatch[0].replace(/^#+\s*/, '');
        const nameInH1 = h1.match(/(?:ICP-C|Briefing).*?(?:—|:|\|)\s*(.+)/i);
        if (nameInH1) parsed.brand.name = nameInH1[1].trim();
    }

    // ── Split into sections ──────────────────────────────
    const sections = {};
    const sectionRegex = /^##\s+(\d+\.?\s*)?(.*?)$/gm;
    let match;
    const sectionPositions = [];

    while ((match = sectionRegex.exec(content)) !== null) {
        sectionPositions.push({
            title: match[2].trim().toUpperCase(),
            index: match.index,
            fullMatch: match[0]
        });
    }

    for (let i = 0; i < sectionPositions.length; i++) {
        const start = sectionPositions[i].index + sectionPositions[i].fullMatch.length;
        const end = i + 1 < sectionPositions.length ? sectionPositions[i + 1].index : content.length;
        sections[sectionPositions[i].title] = content.substring(start, end).trim();
    }

    // ── Parse: SOBRE A MARCA ─────────────────────────────
    const brandSection = findSection(sections, ['SOBRE A MARCA', 'DADOS DA MARCA', 'A MARCA', 'BRAND']);
    if (brandSection) {
        parsed.brand.description = extractFirstParagraph(brandSection);
        parsed.brand.instagram = extractPattern(brandSection, /instagram.*?@(\w+)/i)?.[1] || 
                                  extractPattern(brandSection, /\[@(\w+)\]\(https:\/\/.*instagram/i)?.[1] || '';
        parsed.brand.tiktok = extractPattern(brandSection, /tiktok.*?@(\w+)/i)?.[1] ||
                               extractPattern(brandSection, /\[@(\w+)\]\(https:\/\/.*tiktok/i)?.[1] || '';
        parsed.brand.site = extractPattern(brandSection, /site.*?\[.*?\]\((https?:\/\/[^\)]+)\)/i)?.[1] ||
                             extractPattern(brandSection, /(https?:\/\/\S+\.com\.br\S*)/i)?.[1] || '';
    }

    // ── Parse: PERFIL DO CONSUMIDOR ──────────────────────
    const consumerSection = findSection(sections, ['PERFIL DO CONSUMIDOR', 'CONSUMIDOR FINAL', 'PÚBLICO-ALVO']);
    if (consumerSection) {
        parsed.consumer.gender = extractTableValue(consumerSection, 'Gênero') || '';
        parsed.consumer.age_range = extractTableValue(consumerSection, 'Faixa etária') || '';
        parsed.consumer.pain_points = extractTableValue(consumerSection, 'Dores') || '';
        parsed.consumer.desires = extractTableValue(consumerSection, 'Desejos') || '';
        parsed.consumer.platforms = extractTableValue(consumerSection, 'Plataformas') || '';
    }

    // ── Parse: PERFIL IDEAL DO CREATOR ───────────────────
    const creatorSection = findSection(sections, ['PERFIL IDEAL DO CREATOR', 'ICP-C', 'CREATOR IDEAL']);
    if (creatorSection) {
        // Nichos
        const nicheLines = creatorSection.match(/[-•]\s+\*\*(.+?)\*\*\s*[-—:]\s*(.+)/g) || [];
        parsed.creator_profile.niches = nicheLines.map(line => {
            const m = line.match(/\*\*(.+?)\*\*/);
            return m ? m[1].trim() : line.replace(/[-•]\s+/, '').trim();
        });

        // Engagement rate
        const engMatch = extractTableValue(creatorSection, 'Taxa de engajamento') ||
                          extractTableValue(creatorSection, 'engajamento');
        parsed.creator_profile.engagement_reference = engMatch || '';

        // Content characteristics
        parsed.creator_profile.characteristics = [];
        const charLines = creatorSection.match(/[-•]\s+(?:Produz|Comunica|Tem|Demonstra|Conhece|Entende).+/g) || [];
        parsed.creator_profile.characteristics = charLines.map(l => l.replace(/^[-•]\s+/, '').trim());
    }

    // ── Parse: FORMATOS DE CONTEÚDO ──────────────────────
    const formatsSection = findSection(sections, ['FORMATOS DE CONTEÚDO', 'TIPOS DE CONTEÚDO', 'CONTENT FORMATS']);
    if (formatsSection) {
        const formatRows = formatsSection.match(/\*\*(.+?)\*\*/g) || [];
        parsed.content_formats = formatRows.map(f => f.replace(/\*\*/g, '').trim())
            .filter(f => f.length > 2 && f.length < 50);
    }

    // ── Parse: GANCHOS / HOOKS ───────────────────────────
    const hooksSection = findSection(sections, ['GANCHOS VALIDADOS', 'HOOKS', 'GANCHOS']);
    if (hooksSection) {
        const hooks = hooksSection.match(/\*"([^"]+)"\*/g) || 
                      hooksSection.match(/"([^"]+)"/g) || [];
        parsed.hooks = hooks.map(h => h.replace(/[*"]/g, '').trim()).slice(0, 10);
    }

    // ── Parse: COMPLIANCE ────────────────────────────────
    const complianceSection = findSection(sections, ['COMPLIANCE', 'DIRETRIZES', 'REGRAS']);
    if (complianceSection) {
        const canLines = complianceSection.match(/[-•]\s+Falar.+|[-•]\s+Compartilhar.+|[-•]\s+Usar.+|[-•]\s+Destacar.+/gi) || [];
        parsed.compliance.can = canLines.map(l => l.replace(/^[-•]\s+/, '').trim());
        
        const cannotLines = complianceSection.match(/[-•]\s+Afirmar.+|[-•]\s+Prometer.+|[-•]\s+Usar termos.+|[-•]\s+Fazer.+|[-•]\s+Publicar.+|[-•]\s+Reutilizar.+|[-•]\s+Criar perfis.+|[-•]\s+Copiar.+/gi) || [];
        parsed.compliance.cannot = cannotLines.map(l => l.replace(/^[-•]\s+/, '').trim());
    }

    // ── Parse: PROGRAMA DE PARCEIROS ─────────────────────
    const partnerSection = findSection(sections, ['PROGRAMA DE PARCEIROS', 'METAS E RECOMPENSAS', 'PARCERIA', 'TERMOS']);
    if (partnerSection) {
        const bonusRows = partnerSection.match(/\d+\s*vendas\/mês.*?\|.*?R?\$?\d+/gi) || [];
        parsed.partnership.tiers = bonusRows.map(r => r.trim());

        // Try to extract compensation model
        const fixoMatch = content.match(/(?:fixo|base).*?R?\$\s*([\d.,]+)/i);
        const comissaoMatch = content.match(/(?:comissão|commission).*?([\d]+)%/i);
        if (fixoMatch) parsed.partnership.fixo = fixoMatch[1];
        if (comissaoMatch) parsed.partnership.comissao = comissaoMatch[1] + '%';
    }

    // ── Parse: HASHTAGS ──────────────────────────────────
    const hashtagSection = findSection(sections, ['HASHTAGS', 'HASHTAGS OFICIAIS']);
    if (hashtagSection) {
        const tags = hashtagSection.match(/#[\w\u00C0-\u024FÀ-ÿ]+/g) || [];
        parsed.hashtags = [...new Set(tags)];
    }

    // ── Parse: TOM DE VOZ ────────────────────────────────
    const toneSection = findSection(sections, ['TOM DE VOZ', 'COMUNICAÇÃO', 'VOICE']);
    if (toneSection) {
        const useRows = toneSection.match(/(?:\|[^|]*){2,}/g) || [];
        parsed.tone.guidelines = useRows.map(r => r.trim()).filter(r => r.includes('|'));
    }

    return parsed;
}

// ── Helper functions ─────────────────────────────────────

function findSection(sections, keys) {
    for (const key of keys) {
        for (const [sTitle, sContent] of Object.entries(sections)) {
            if (sTitle.includes(key)) return sContent;
        }
    }
    return null;
}

function extractFirstParagraph(text) {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-'));
    return lines.length > 0 ? lines[0].replace(/\*\*/g, '').trim() : '';
}

function extractTableValue(text, key) {
    const regex = new RegExp(`\\|[^|]*${key}[^|]*\\|\\s*([^|]+)\\|`, 'i');
    const m = text.match(regex);
    return m ? m[1].trim() : null;
}

function extractPattern(text, regex) {
    return text.match(regex);
}

// ── Niche Matching ───────────────────────────────────────
/**
 * Match briefing niches to our catalog niches, and enrich with catalog hashtags.
 */
function matchAndEnrichNiches(briefingNiches, catalog) {
    const nicheMap = {
        'saúde': ['beauty', 'fitness'],
        'saude': ['beauty', 'fitness'],
        'bem-estar': ['beauty', 'lifestyle'],
        'beleza': ['beauty'],
        'skincare': ['beauty'],
        'fitness': ['fitness'],
        'academia': ['fitness'],
        'maternidade': ['lifestyle'],
        'lifestyle': ['lifestyle'],
        'feminino': ['lifestyle', 'beauty'],
        'food': ['food'],
        'alimentação': ['food'],
        'tech': ['tech'],
        'moda': ['moda'],
        'estudos': ['estudos'],
        'pets': ['pets']
    };

    const matchedNicheKeys = new Set();
    const enrichedHashtags = { tiktok: new Set(), instagram: new Set() };

    for (const briefNiche of briefingNiches) {
        const lower = briefNiche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const [keyword, catalogKeys] of Object.entries(nicheMap)) {
            const normalizedKw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (lower.includes(normalizedKw)) {
                catalogKeys.forEach(k => matchedNicheKeys.add(k));
            }
        }
    }

    // Enrich with catalog hashtags
    for (const nicheKey of matchedNicheKeys) {
        const nicheData = catalog.niches?.[nicheKey];
        if (nicheData?.hashtags) {
            (nicheData.hashtags.tiktok || []).forEach(h => enrichedHashtags.tiktok.add(h));
            (nicheData.hashtags.instagram || []).forEach(h => enrichedHashtags.instagram.add(h));
        }
    }

    return {
        matched_catalog_niches: Array.from(matchedNicheKeys),
        primary_niche: matchedNicheKeys.size > 0 ? Array.from(matchedNicheKeys)[0] : 'lifestyle',
        sub_niches: briefingNiches,
        enriched_hashtags: {
            tiktok: Array.from(enrichedHashtags.tiktok),
            instagram: Array.from(enrichedHashtags.instagram)
        }
    };
}

// ── Output Generators ────────────────────────────────────

/**
 * Generate structured ICP-C Markdown from parsed briefing
 */
function generateStructuredICP(parsed, nicheData) {
    const brandName = parsed.brand.name || 'Unknown Brand';
    const date = new Date().toISOString().split('T')[0];

    return `# ICP-C — Ideal Creator Profile (Structured)

**Cliente/Marca:** ${brandName}
**Produto/Serviço:** ${parsed.brand.description || ''}
**Data:** ${date}
**Gerado por:** briefing-to-icp.js (auto-transform)

---

## 1. Dados da Marca

| Campo | Valor |
|:------|:------|
| **Nome da marca** | ${brandName} |
| **Segmento** | ${nicheData.primary_niche} |
| **Produto principal** | ${parsed.brand.description || ''} |
| **Público-alvo da marca** | ${parsed.consumer.gender || ''}, ${parsed.consumer.age_range || ''} |
| **Ticket médio** | — |
| **Região de atuação** | Brasil |
| **URL do site** | ${parsed.brand.site || ''} |
| **Redes sociais da marca** | IG: @${parsed.brand.instagram || ''} / TT: @${parsed.brand.tiktok || ''} |

---

## 2. Perfil Ideal da Creator (ICP-C)

### 2.1 Demographics da Creator

| Campo | Valor |
|:------|:------|
| **Gênero preferido** | ${parsed.consumer.gender || 'Qualquer'} |
| **Faixa etária** | ${parsed.consumer.age_range || '18-35'} |
| **Localização** | Brasil |
| **Idioma principal** | Português BR |

### 2.2 Perfil de Conteúdo

| Campo | Valor |
|:------|:------|
| **Nicho principal** | ${nicheData.primary_niche} |
| **Sub-nichos aceitáveis** | ${nicheData.sub_niches.join(', ')} |
| **Plataforma principal** | TikTok / Instagram / Ambos |
| **Tipo de conteúdo** | ${parsed.content_formats.slice(0, 5).join(', ') || 'UGC, review, tutorial'} |
| **Deve mostrar rosto/corpo?** | Sim |
| **Tom de voz** | Autêntico, natural, empoderador |

### 2.3 Métricas Mínimas

| Campo | Valor |
|:------|:------|
| **Followers mínimo** | 1.000 |
| **Followers máximo** | 50.000 |
| **Engagement Rate mínimo** | 3% |
| **Frequência mínima de posts** | 3x/semana |
| **Idade da conta mínima** | 6 meses |

---

## 3. Hashtags de Referência (para mineração)

### Hashtags da marca (do briefing):
${parsed.hashtags.map(h => `- ${h}`).join('\n') || '- (nenhuma fornecida)'}

### Hashtags enriquecidas do catálogo (TikTok):
${nicheData.enriched_hashtags.tiktok.map(h => `- ${h}`).join('\n') || '- (nenhuma)'}

### Hashtags enriquecidas do catálogo (Instagram):
${nicheData.enriched_hashtags.instagram.map(h => `- ${h}`).join('\n') || '- (nenhuma)'}

---

## 4. Creators de Referência

| Handle | Plataforma | Por que é referência? |
|:-------|:-----------|:----------------------|
| (a preencher na Fase 1) | — | — |

---

## 5. Red Flags (NÃO queremos)

- [x] Feed 100% patrocinado/brandado
- [x] Engajamento suspeito (bots)
- [x] Conteúdo controverso ou fora do posicionamento
- [x] Promove concorrentes diretos
${parsed.compliance.cannot.map(r => `- [x] ${r}`).join('\n')}

---

## 6. Termos da Parceria

| Campo | Valor |
|:------|:------|
| **Modelo** | Starter (padrão) |
| **Fixo mensal** | R$ ${parsed.partnership.fixo || '—'} |
| **Comissão** | ${parsed.partnership.comissao || '—'} |
| **Entregáveis/mês** | A definir |
| **Exclusividade** | Não |
| **Duração inicial** | 3 meses |

---

## 7. Marcas Concorrentes (para monitoramento)

| Marca | Perfil Ads Library | Observações |
|:------|:-------------------|:------------|
| (a preencher) | | Multivitamínicos concorrentes |

---

## 8. Material Extra do Cliente (hooks, compliance, formatos)

### Hooks validados pelo cliente:
${parsed.hooks.slice(0, 6).map((h, i) => `${i + 1}. "${h}"`).join('\n') || '(nenhum)'}

### Compliance:
**Pode:** ${parsed.compliance.can.join('; ') || '—'}
**Não pode:** ${parsed.compliance.cannot.join('; ') || '—'}

### Formatos recomendados:
${parsed.content_formats.map(f => `- ${f}`).join('\n') || '(nenhum)'}

---

_Auto-generated from briefing: ${path.basename(parsed.sourcePath || '')}_
_Template Version: 1.0.0 | Squad: virals-creators-hunting-squad_
`;
}

/**
 * Generate search criteria JSON (input for hunt-creators.js)
 */
function generateSearchCriteria(parsed, nicheData) {
    const brandName = parsed.brand.name || 'unknown';

    // Merge briefing hashtags + catalog hashtags
    const allHashtags = [
        ...parsed.hashtags,
        ...nicheData.enriched_hashtags.tiktok,
        ...nicheData.enriched_hashtags.instagram
    ];
    const uniqueHashtags = [...new Set(allHashtags)];

    return {
        client: brandName,
        generated_at: new Date().toISOString(),
        generated_by: 'briefing-to-icp.js',
        source_briefing: parsed.sourcePath || '',
        search_criteria: {
            hashtags: uniqueHashtags,
            hashtags_by_platform: {
                tiktok: [...new Set([...parsed.hashtags, ...nicheData.enriched_hashtags.tiktok])],
                instagram: [...new Set([...parsed.hashtags, ...nicheData.enriched_hashtags.instagram])]
            },
            platforms: ['tiktok', 'instagram'],
            follower_range: { min: 1000, max: 50000 },
            engagement_rate_min: 3,
            niche: nicheData.primary_niche,
            sub_niches: nicheData.sub_niches,
            matched_catalog_niches: nicheData.matched_catalog_niches,
            demographics: {
                gender: parsed.consumer.gender || 'any',
                age_range: parsed.consumer.age_range || '18-35',
                location: 'BR'
            },
            content_requirements: {
                face_required: true,
                tone: 'autêntico',
                type: parsed.content_formats.length > 0 ? 
                      parsed.content_formats.slice(0, 5) :
                      ['UGC', 'review', 'tutorial'],
                formats_recommended: parsed.content_formats
            },
            red_flags: [
                '100% branded feed',
                'fake engagement',
                'conteúdo controverso',
                ...parsed.compliance.cannot.slice(0, 3)
            ],
            reference_creators: [],
            competitor_brands: [],
            hooks_from_client: parsed.hooks.slice(0, 8),
            compliance: {
                can: parsed.compliance.can,
                cannot: parsed.compliance.cannot
            }
        },
        brand_context: {
            name: brandName,
            instagram: parsed.brand.instagram || '',
            tiktok: parsed.brand.tiktok || '',
            site: parsed.brand.site || '',
            description: parsed.brand.description || '',
            consumer_profile: parsed.consumer
        }
    };
}

/**
 * Generate readiness checklist validation report
 */
function generateReadinessReport(parsed, nicheData) {
    const checks = {
        brand_name: !!parsed.brand.name,
        brand_segment: nicheData.matched_catalog_niches.length > 0,
        brand_product: !!parsed.brand.description,
        brand_audience: !!(parsed.consumer.gender || parsed.consumer.age_range),
        creator_demographics: !!(parsed.consumer.gender && parsed.consumer.age_range),
        creator_niches: parsed.creator_profile.niches?.length > 0,
        creator_platform: true, // always TikTok+IG
        creator_content_type: parsed.content_formats.length > 0,
        creator_face_required: true, // default
        creator_tone: true, // derived from brand tone
        metrics_followers: true, // default 1K-50K
        metrics_engagement: true, // derived
        metrics_frequency: true, // default 3x/week
        hashtags: parsed.hashtags.length >= 3 || nicheData.enriched_hashtags.tiktok.length >= 3,
        reference_creators: false, // usually not in briefing — to fill in Phase 1
        red_flags: parsed.compliance.cannot.length > 0,
        contract_model: true, // default Starter
        compensation: !!(parsed.partnership.fixo || parsed.partnership.comissao),
        deliverables: parsed.content_formats.length > 0,
        exclusivity: true // default no
    };

    const passed = Object.values(checks).filter(v => v).length;
    const total = Object.values(checks).length;
    const passRate = Math.round((passed / total) * 100);
    const ready = passRate >= 75; // Allow 75% threshold (some fields are derived in Phase 1)

    const report = `# ICP-C Readiness Report — ${parsed.brand.name || 'Unknown'}

**Data:** ${new Date().toISOString().split('T')[0]}
**Source:** ${path.basename(parsed.sourcePath || '')}
**Pass Rate:** ${passed}/${total} (${passRate}%)
**Status:** ${ready ? '✅ READY — pode prosseguir para Fase 1' : '⚠️ INCOMPLETE — revisar itens faltantes'}

---

## Dados da Marca
- [${checks.brand_name ? 'x' : ' '}] Nome da marca preenchido
- [${checks.brand_segment ? 'x' : ' '}] Segmento/nicho definido
- [${checks.brand_product ? 'x' : ' '}] Produto principal identificado
- [${checks.brand_audience ? 'x' : ' '}] Público-alvo da marca descrito

## Perfil da Creator (ICP-C)
- [${checks.creator_demographics ? 'x' : ' '}] Demographics definidos (gênero, idade, localização)
- [${checks.creator_niches ? 'x' : ' '}] Nicho principal e sub-nichos definidos
- [${checks.creator_platform ? 'x' : ' '}] Plataforma principal selecionada (TikTok/IG/ambos)
- [${checks.creator_content_type ? 'x' : ' '}] Tipo de conteúdo esperado
- [${checks.creator_face_required ? 'x' : ' '}] Requisito de rosto/corpo definido
- [${checks.creator_tone ? 'x' : ' '}] Tom de voz descrito

## Métricas Mínimas
- [${checks.metrics_followers ? 'x' : ' '}] Range de followers definido (1K-50K default)
- [${checks.metrics_engagement ? 'x' : ' '}] Engagement rate mínimo definido (3% default)
- [${checks.metrics_frequency ? 'x' : ' '}] Frequência mínima de posts (3x/semana default)

## Referências
- [${checks.hashtags ? 'x' : ' '}] Pelo menos 3 hashtags de referência (${parsed.hashtags.length} do briefing + ${nicheData.enriched_hashtags.tiktok.length} do catálogo)
- [${checks.reference_creators ? 'x' : ' '}] Pelo menos 2 creators de referência (a preencher na Fase 1)
- [${checks.red_flags ? 'x' : ' '}] Red flags identificadas (${parsed.compliance.cannot.length} do compliance)

## Termos da Parceria
- [${checks.contract_model ? 'x' : ' '}] Modelo de contrato definido (Starter default)
- [${checks.compensation ? 'x' : ' '}] Faixa de compensação definida
- [${checks.deliverables ? 'x' : ' '}] Entregáveis mensais definidos
- [${checks.exclusivity ? 'x' : ' '}] Exclusividade definida (Não default)

---

## Items para Completar Manualmente

${Object.entries(checks).filter(([k, v]) => !v).map(([k]) => `- ⚠️ **${k.replace(/_/g, ' ')}** — preencher antes ou durante Fase 1`).join('\n') || '✅ Todos os items estão completos!'}

---

**Gate:** ${ready ? 'APROVADO — prosseguir para Fase 1 (Identificação)' : 'BLOQUEADO — completar items faltantes'}
`;

    return { report, checks, passed, total, passRate, ready };
}

// ── Main Execution ───────────────────────────────────────

function processsBriefing(briefingPath, dryRun = false) {
    console.log('🎯 Briefing → ICP-C Transformer');
    console.log(`   Input: ${briefingPath}`);
    console.log('');

    // 1. Read briefing
    if (!fs.existsSync(briefingPath)) {
        console.error(`❌ File not found: ${briefingPath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(briefingPath, 'utf8');

    // 2. Parse briefing
    console.log('📖 Step 1: Parsing briefing...');
    const parsed = parseBriefing(content);
    parsed.sourcePath = briefingPath;
    console.log(`   Brand: ${parsed.brand.name || 'Unknown'}`);
    console.log(`   Niches found: ${parsed.creator_profile.niches?.join(', ') || 'none'}`);
    console.log(`   Hashtags found: ${parsed.hashtags.length}`);
    console.log(`   Content formats: ${parsed.content_formats.length}`);
    console.log(`   Hooks found: ${parsed.hooks.length}`);
    console.log(`   Compliance rules: ${parsed.compliance.can.length} can + ${parsed.compliance.cannot.length} cannot`);

    // 3. Match niches to catalog
    console.log('\n🔗 Step 2: Matching niches to catalog...');
    const catalog = loadNichesCatalog();
    const nicheData = matchAndEnrichNiches(
        parsed.creator_profile.niches || [],
        catalog
    );
    console.log(`   Matched: ${nicheData.matched_catalog_niches.join(', ') || 'none'}`);
    console.log(`   Primary: ${nicheData.primary_niche}`);
    console.log(`   Enriched TikTok hashtags: +${nicheData.enriched_hashtags.tiktok.length}`);
    console.log(`   Enriched Instagram hashtags: +${nicheData.enriched_hashtags.instagram.length}`);

    // 4. Validate readiness
    console.log('\n✅ Step 3: Running readiness checklist...');
    const readiness = generateReadinessReport(parsed, nicheData);
    console.log(`   Pass rate: ${readiness.passed}/${readiness.total} (${readiness.passRate}%)`);
    console.log(`   Status: ${readiness.ready ? '✅ READY' : '⚠️ INCOMPLETE'}`);

    if (dryRun) {
        console.log('\n🏁 DRY RUN — would generate:');
        console.log(`   1. ICP-C structured: data/icp-structured/icp-c-{brand}-{date}.md`);
        console.log(`   2. Search criteria: data/search-criteria-{brand}-{date}.json`);
        console.log(`   3. Readiness report: data/readiness-reports/readiness-{brand}-{date}.md`);
        return;
    }

    // 5. Generate outputs
    const brandSlug = (parsed.brand.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];

    // 5a. ICP-C Structured
    console.log('\n📝 Step 4: Generating structured ICP-C...');
    const icpContent = generateStructuredICP(parsed, nicheData);
    const icpPath = path.join(ICP_OUTPUT_DIR, `icp-c-${brandSlug}-${dateStr}.md`);
    fs.writeFileSync(icpPath, icpContent);
    console.log(`   💾 Saved: ${icpPath}`);

    // 5b. Search Criteria JSON
    console.log('\n🔍 Step 5: Generating search criteria JSON...');
    const criteria = generateSearchCriteria(parsed, nicheData);
    const criteriaPath = path.join(OUTPUT_DIR, `search-criteria-${brandSlug}-${dateStr}.json`);
    fs.writeFileSync(criteriaPath, JSON.stringify(criteria, null, 2));
    console.log(`   💾 Saved: ${criteriaPath}`);

    // 5c. Readiness Report
    console.log('\n📋 Step 6: Saving readiness report...');
    const readinessPath = path.join(CHECKLIST_OUTPUT_DIR, `readiness-${brandSlug}-${dateStr}.md`);
    fs.writeFileSync(readinessPath, readiness.report);
    console.log(`   💾 Saved: ${readinessPath}`);

    // 6. Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 FASE 0 COMPLETE — Outputs gerados:');
    console.log(`   1. ICP-C Structured:    ${icpPath}`);
    console.log(`   2. Search Criteria:     ${criteriaPath}`);
    console.log(`   3. Readiness Report:    ${readinessPath}`);
    console.log('');
    console.log(`   Status: ${readiness.ready ? '✅ PRONTO para Fase 1 — rodar hunt-creators.js' : '⚠️ REVISAR — completar items faltantes'}`);
    if (readiness.ready) {
        console.log('');
        console.log(`   Próximo passo:`);
        console.log(`   node scripts/hunt-creators.js --criteria "${criteriaPath}"`);
    }
    console.log('═'.repeat(60));

    return { icpPath, criteriaPath, readinessPath, readiness: readiness.ready };
}

function listBriefings() {
    if (!fs.existsSync(BRIEFINGS_DIR)) {
        console.log('📂 No briefings directory found. Create: data/icp-briefings/');
        return;
    }
    const files = fs.readdirSync(BRIEFINGS_DIR).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
        console.log('📂 No briefings found in data/icp-briefings/');
        return;
    }
    console.log('📂 Available briefings:');
    files.forEach((f, i) => {
        const full = path.join(BRIEFINGS_DIR, f);
        const size = fs.statSync(full).size;
        console.log(`   ${i + 1}. ${f} (${Math.round(size / 1024)}KB)`);
    });
    console.log(`\nRun: node scripts/briefing-to-icp.js --briefing ./data/icp-briefings/{filename}`);
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

    if (params.list) {
        listBriefings();
    } else if (params.briefing) {
        const briefingPath = path.resolve(params.briefing);
        processsBriefing(briefingPath, params['dry-run'] === true);
    } else {
        console.log('🎯 Briefing → ICP-C Transformer');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/briefing-to-icp.js --briefing ./data/icp-briefings/ICP-C_Juvelina_Organics.md');
        console.log('  node scripts/briefing-to-icp.js --briefing ./path --dry-run');
        console.log('  node scripts/briefing-to-icp.js --list');
    }
}

module.exports = { processsBriefing, parseBriefing, matchAndEnrichNiches };
