#!/usr/bin/env node
/**
 * farm-profiles.js — F1-P Auditoria de Perfis · Virals Farming Squad
 *
 * Rota de CURADORIA: o operador já sabe QUAIS perfis quer modelar. Aqui não se
 * descobre nada — captura-se o acervo de cada perfil, ranqueia-se DENTRO dele e
 * entrega-se um dossiê por perfil para que a escolha dos criativos que seguem
 * para a F2 seja humana.
 *
 * DIFERENÇA PARA O farm-monitor.js (F1 Garimpo), que continua valendo:
 *   · O garimpo DESCOBRE perfis e REPROVA itens por nota de corte, entregando um
 *     ranking único e podado do nicho inteiro.
 *   · Esta rota NÃO REPROVA NADA. Corte automático aqui destruiria o propósito:
 *     o operador quer ver o acervo para decidir. O que era reprovação virou
 *     SINALIZADOR (`flags`) na linha do criativo.
 *
 * ORDENAÇÃO — a decisão central deste script: dentro de um perfil, o ranking
 * default é por ÍNDICE DE OUTLIER (views do post ÷ mediana de views do perfil),
 * não por views absolutas. Views absolutas dentro de um mesmo canal medem o
 * tamanho do canal, que é constante, e o tempo que o post está no ar. O que
 * identifica FORMATO VENCEDOR é o post que rompeu a linha de base do próprio
 * canal — 3x a mediana num canal de 8k views ensina mais que 200k views num
 * canal que sempre faz 200k. Mediana, não média: um viral isolado puxa a média
 * e faz todo o resto do acervo parecer fraco.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-profiles.js --niche=religioso \
 *        --profiles=@a,@b,https://www.tiktok.com/@c
 *   node ... --niche=religioso --from=perfis.txt --items=40
 *   node ... --niche=religioso --session=ID --pick=lermenn_#1,motivase_21#3
 *
 * Flags:
 *   --niche=ID         nicho em data/niches/ (obrigatório — define pesos de score)
 *   --profiles=a,b     perfis (aceita @handle, handle ou URL completa)
 *   --from=arquivo     lê perfis de um arquivo, um por linha (# vira comentário)
 *   --items=N          posts capturados por perfil            (default: 30)
 *   --sort=X           outlier | score | engagement | saves | recent  (default: outlier)
 *   --date=YYYY-MM-DD  data da sessão                          (default: hoje)
 *   --session=ID       grava numa sessão existente
 *   --pick=h#N,h#M     monta a seleção para a F2 a partir do cache (sem rede)
 *   --pick-from=arq    mesma coisa, lendo de arquivo
 *   --min-score=N      seleciona por critério: todos com viral score ≥ N
 *   --min-outlier=N    idem, por índice de outlier (combinável com --min-score)
 *   --all              seleciona o acervo inteiro capturado
 *   --dry-run          lista os perfis e sai, sem chamar a rede
 */

const fs = require('fs');
const path = require('path');

const L = require('./_niche-loader.js');
const TT = require('./_tiktok-source.js');

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

// Ver a nota em farm-monitor.js: process.exit() logo após I/O aborta o processo no
// Windows e transforma sucesso em exit code 0xC0000409.
function finish(code) {
    process.exitCode = code;
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/** Aceita `@handle`, `handle`, `https://www.tiktok.com/@handle` e variações com query. */
function parseHandle(raw) {
    const s = String(raw || '').trim();
    if (!s || s.startsWith('#')) return null;
    const fromUrl = s.match(/tiktok\.com\/@([a-zA-Z0-9._]{1,30})/i);
    if (fromUrl) return fromUrl[1].toLowerCase();
    const clean = s.replace(/^@/, '').split(/[/?#\s]/)[0];
    return /^[a-zA-Z0-9._]{1,30}$/.test(clean) ? clean.toLowerCase() : null;
}

function collectProfiles(args) {
    const raw = [];
    if (args.profiles && args.profiles !== true) raw.push(...String(args.profiles).split(','));
    if (args.handles && args.handles !== true) raw.push(...String(args.handles).split(','));
    if (args.from && args.from !== true) {
        const file = path.resolve(L.REPO_ROOT, String(args.from));
        if (!fs.existsSync(file)) throw new Error(`Arquivo de perfis não encontrado: ${file}`);
        raw.push(...fs.readFileSync(file, 'utf8').split('\n'));
    }
    const out = [];
    const invalid = [];
    for (const entry of raw) {
        const line = String(entry).split('#')[0]; // comentário no fim da linha
        if (!line.trim()) continue;
        const h = parseHandle(line);
        if (h) {
            if (!out.includes(h)) out.push(h);
        } else invalid.push(entry.trim());
    }
    return { handles: out, invalid };
}

// ---------------------------------------------------------------------------
// Estatística
// ---------------------------------------------------------------------------

/**
 * Mediana — e não média — em tudo que descreve um perfil. Um único viral de 2M
 * views num acervo de posts de 8k desloca a média para 70k e faz o acervo inteiro
 * parecer abaixo do normal do canal, invertendo exatamente a leitura que este
 * relatório existe para dar.
 */
function median(values) {
    const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (v.length === 0) return 0;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const HASHTAG_RE = /#([\p{L}\p{N}_]{2,40})/gu;

function extractHashtags(text) {
    const out = [];
    for (const m of String(text || '').matchAll(HASHTAG_RE)) {
        const tag = m[1].toLowerCase();
        if (!out.includes(tag)) out.push(tag);
    }
    return out;
}

/** Faixa de duração — o formato que o squad consegue reproduzir mora nos extremos curtos. */
function durationBand(sec) {
    const d = Number(sec) || 0;
    if (d === 0) return 'sem duração';
    if (d <= 15) return '≤15s';
    if (d <= 30) return '16-30s';
    if (d <= 60) return '31-60s';
    if (d <= 120) return '61-120s';
    return '>120s';
}

// Tempo mínimo para as views de um post pararem de crescer o suficiente para ser
// comparável ao acervo. Abaixo disso o post ainda está sendo distribuído.
const MATURITY_HOURS = 48;

/**
 * Sinalizadores. NENHUM reprova — são o que a nota de corte do garimpo teria
 * usado para eliminar o item, aqui rebaixado a informação para o operador decidir.
 *
 * NÃO sinaliza "fora da janela de lookback": esta rota audita o ACERVO, onde post
 * de 300h é o normal, não a exceção. O sinal apareceria em quase toda linha e
 * esconderia os que importam. A idade já tem coluna própria na tabela.
 */
function buildFlags(item, niche, ageHours) {
    const c = niche.cutoff || {};
    const flags = [];
    const dur = Number(item.duration) || 0;

    if (!item.hasMetrics) flags.push('sem métricas');
    // Post novo não perdeu — ainda está sendo distribuído. Sem este aviso, o índice
    // de outlier joga todo lançamento recente para o fim da tabela e o operador
    // conclui que o formato novo do canal não funciona.
    if (ageHours !== null && ageHours < MATURITY_HOURS) flags.push(`imaturo (${Math.round(ageHours)}h)`);
    if (c.max_duration_seconds && dur > c.max_duration_seconds) flags.push(`longo (${dur}s)`);
    if (item.hasMetrics && c.min_engagement_rate && L.engagementRate(item.metrics) < c.min_engagement_rate) {
        flags.push('engaj. abaixo do corte');
    }
    const lang = L.matchesLanguage(`${item.description || ''} ${item.title || ''}`, niche.language);
    if (!lang.ok) flags.push('idioma fora do nicho');
    if (!item.track) flags.push('sem trilha');
    return flags;
}

function analyzeProfile(handle, items, niche) {
    const nowSec = Math.floor(Date.now() / 1000);
    const withMetrics = items.filter((i) => i.hasMetrics);

    // A linha de base sai só dos posts MADUROS. Um canal que postou 8 vezes nas
    // últimas 48h teria a mediana puxada para baixo por views que ainda vão crescer,
    // inflando o índice de outlier de todo o acervo antigo. Com menos de 5 maduros a
    // amostra não sustenta o recorte, e aí vale mais usar tudo — declarando isso.
    const mature = withMetrics.filter((i) => !i.timestamp || (nowSec - i.timestamp) / 3600 >= MATURITY_HOURS);
    const baselinePool = mature.length >= 5 ? mature : withMetrics;

    const medViews = median(baselinePool.map((i) => i.metrics.views));
    const medEngagement = median(withMetrics.map((i) => L.engagementRate(i.metrics)));
    const medDuration = median(items.map((i) => Number(i.duration) || 0));

    const analyzed = items.map((item) => {
        const ageHours = item.timestamp ? Math.round(((nowSec - item.timestamp) / 3600) * 10) / 10 : null;
        const engagement = item.hasMetrics ? L.engagementRate(item.metrics) : null;
        const saves = Number(item.metrics.saves) || 0;
        const views = Number(item.metrics.views) || 0;
        const model = L.preliminaryModelability(item, niche.signals);

        return {
            ...item,
            score: Math.round(L.calculateViralScore(item.metrics, niche.viralScore.weights)),
            engagement,
            saveRate: views > 0 ? saves / views : null,
            // Índice de outlier: 1.0 = exatamente a mediana do canal. Só faz sentido
            // com mediana > 0; canal sem métrica nenhuma devolve null em vez de fingir 0.
            outlier: medViews > 0 && item.hasMetrics ? Math.round((views / medViews) * 100) / 100 : null,
            modelability: model.score,
            modelabilityReasons: model.reasons,
            ageHours,
            durationBand: durationBand(item.duration),
            hashtags: extractHashtags(item.description),
            flags: buildFlags(item, niche, ageHours),
        };
    });

    // Cadência real: dias entre o post mais antigo e o mais novo do que foi capturado.
    const stamps = items.map((i) => i.timestamp).filter(Boolean).sort((a, b) => a - b);
    const spanDays = stamps.length > 1 ? (stamps[stamps.length - 1] - stamps[0]) / 86400 : null;
    const postsPerWeek = spanDays && spanDays > 0 ? Math.round((items.length / spanDays) * 7 * 10) / 10 : null;

    const bands = {};
    for (const a of analyzed) bands[a.durationBand] = (bands[a.durationBand] || 0) + 1;

    const hits = analyzed.filter((a) => a.outlier !== null && a.outlier >= 2);
    const topViews = Math.max(0, ...withMetrics.map((i) => i.metrics.views));

    return {
        handle,
        url: `https://www.tiktok.com/@${handle}`,
        capturedItems: items.length,
        withMetrics: withMetrics.length,
        baselineFrom: baselinePool === mature ? 'maduros' : 'todos',
        baselineCount: baselinePool.length,
        medianViews: Math.round(medViews),
        medianEngagement: medEngagement,
        medianDuration: Math.round(medDuration),
        medianSaveRate: median(analyzed.map((a) => a.saveRate).filter((n) => n !== null)),
        topViews,
        // Amplitude do canal: quantas vezes o melhor post supera a mediana. Alto =
        // canal de hits esporádicos (o hit é que interessa); baixo = canal constante
        // (o formato inteiro é replicável, qualquer post serve de referência).
        peakRatio: medViews > 0 ? Math.round((topViews / medViews) * 100) / 100 : null,
        hitCount: hits.length,
        hitRate: analyzed.length > 0 ? Math.round((hits.length / analyzed.length) * 1000) / 10 : 0,
        newestPost: stamps.length ? new Date(stamps[stamps.length - 1] * 1000).toISOString().split('T')[0] : null,
        oldestPost: stamps.length ? new Date(stamps[0] * 1000).toISOString().split('T')[0] : null,
        lastPostAgeHours: stamps.length ? Math.round((nowSec - stamps[stamps.length - 1]) / 3600) : null,
        postsPerWeek,
        durationBands: bands,
        items: analyzed,
    };
}

const SORTERS = {
    outlier: (a, b) => (b.outlier || 0) - (a.outlier || 0) || (b.engagement || 0) - (a.engagement || 0),
    score: (a, b) => b.score - a.score,
    engagement: (a, b) => (b.engagement || 0) - (a.engagement || 0),
    saves: (a, b) => (b.saveRate || 0) - (a.saveRate || 0),
    recent: (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
};

/**
 * Sugestão de seleção — atalho, não veredito. Pega os que romperam a linha de base
 * do canal (outlier ≥ 1.5) E não ficaram abaixo do engajamento mediano dele, porque
 * pico de views com engajamento medíocre costuma ser distribuição, não formato.
 */
function suggestPicks(profile, limit = 3) {
    return profile.items
        .filter((i) => i.outlier !== null && i.outlier >= 1.5 && (i.engagement || 0) >= profile.medianEngagement)
        .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

const pct = (n) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}%`);
const num = (n) => L.fmtNumber(Math.round(Number(n) || 0));

function buildProfileDoc(profile, niche, date, sessionId, sortKey) {
    const p = profile;
    let md = `# @${p.handle} · dossiê de criativos · ${date}\n\n`;
    md += `**Perfil:** <${p.url}>  ·  **Sessão:** \`${sessionId}\`  ·  **Nicho de referência:** ${niche.icon} ${niche.label}\n\n`;

    md += `## Linha de base do canal\n\n`;
    md += `| Métrica | Valor | Leitura |\n| :--- | ---: | :--- |\n`;
    md += `| Posts capturados | ${p.capturedItems} | ${p.withMetrics} com métricas |\n`;
    md += `| Janela do acervo | ${p.oldestPost || '—'} → ${p.newestPost || '—'} | último post há ${p.lastPostAgeHours === null ? '—' : p.lastPostAgeHours + 'h'} |\n`;
    md += `| Cadência | ${p.postsPerWeek === null ? '—' : p.postsPerWeek + ' posts/sem'} | ritmo de publicação |\n`;
    md += `| Views (mediana) | ${num(p.medianViews)} | linha de base — calculada sobre ${p.baselineCount} post(s) ${p.baselineFrom === 'maduros' ? `com mais de ${MATURITY_HOURS}h` : '(inclui recentes: poucos maduros na amostra)'} |\n`;
    md += `| Melhor post | ${num(p.topViews)} | ${p.peakRatio === null ? '—' : p.peakRatio + 'x a mediana'} |\n`;
    md += `| Engajamento (mediana) | ${pct(p.medianEngagement)} | (likes + comentários) ÷ views |\n`;
    md += `| Salvamentos (mediana) | ${pct(p.medianSaveRate)} | intenção de repostar — o sinal mais próximo de "replicável" |\n`;
    md += `| Duração (mediana) | ${p.medianDuration}s | formato dominante |\n`;
    md += `| Posts acima de 2x a mediana | ${p.hitCount} (${p.hitRate}%) | ${p.hitRate >= 20 ? 'acervo com muitos picos' : 'canal constante'} |\n\n`;

    const bands = Object.entries(p.durationBands).sort((a, b) => b[1] - a[1]);
    md += `**Distribuição de duração:** ${bands.map(([b, n]) => `${b} (${n})`).join(' · ')}\n\n`;

    md += `---\n\n## Criativos ranqueados (ordem: ${sortKey})\n\n`;
    md += `> **Índice de outlier** = views do post ÷ mediana do canal. \`1.0\` é o normal do perfil; `;
    md += `\`≥2.0\` é rompimento de linha de base — é aí que mora o formato que vale modelar.\n`;
    md += `> Nada foi reprovado. A coluna **Sinais** traz o que a nota de corte do garimpo teria usado para eliminar o item.\n`;
    md += `> ⚠️ Post marcado **imaturo** tem menos de ${MATURITY_HOURS}h: as views ainda estão crescendo e o outlier dele `;
    md += `está subestimado. Ele cai para o fim desta tabela por idade, não por desempenho — julgue esses pelo formato.\n\n`;

    md += `| # | Outlier | Views | Engaj. | Salv. | Score | Modelab. | Dur. | Idade | Trilha | Legenda | Sinais | Link |\n`;
    md += `| :- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- | :--- | :--- | :--- |\n`;
    p.items.forEach((i, idx) => {
        const caption = String(i.description || '').replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 70) || '—';
        md += `| ${idx + 1} `;
        md += `| ${i.outlier === null ? '—' : '**' + i.outlier.toFixed(2) + 'x**'} `;
        md += `| ${num(i.metrics.views)} | ${pct(i.engagement)} | ${pct(i.saveRate)} | ${num(i.score)} | ${i.modelability} `;
        md += `| ${i.duration || '—'}${i.duration ? 's' : ''} | ${i.ageHours === null ? '—' : i.ageHours + 'h'} `;
        md += `| ${(i.track || '—').replace(/\|/g, '/').slice(0, 28)} | ${caption} `;
        md += `| ${i.flags.length ? i.flags.join(', ') : '—'} | [ver](${i.url}) |\n`;
    });

    const picks = suggestPicks(p);
    md += `\n### Sugestão de corte para a F2\n\n`;
    if (picks.length === 0) {
        md += `_Nenhum post rompeu a linha de base do canal (outlier ≥ 1.5 com engajamento ≥ mediana). `;
        md += `Isso não desqualifica o perfil: canal muito constante não produz outlier — nesse caso escolha pelo FORMATO nas primeiras linhas da tabela._\n`;
    } else {
        md += `Candidatos que romperam a linha de base **e** mantiveram engajamento ≥ mediana do canal:\n\n`;
        picks.forEach((i) => {
            const rank = p.items.indexOf(i) + 1;
            md += `- \`${p.handle}#${rank}\` — ${i.outlier.toFixed(2)}x · ${num(i.metrics.views)} views · ${pct(i.engagement)} · ${i.duration}s`;
            if (i.description) md += ` — _${String(i.description).replace(/\s+/g, ' ').slice(0, 80)}_`;
            md += `\n`;
        });
        md += `\n\`\`\`\n--pick=${picks.map((i) => `${p.handle}#${p.items.indexOf(i) + 1}`).join(',')}\n\`\`\`\n`;
    }

    const tagCount = {};
    for (const i of p.items) for (const t of i.hashtags) tagCount[t] = (tagCount[t] || 0) + 1;
    const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
    md += `\n### Hashtags deste perfil (${tags.length})\n\n`;
    md += tags.length ? tags.map(([t, n]) => `\`#${t}\`(${n})`).join(' · ') + '\n' : `_O perfil não usa hashtags na legenda._\n`;
    md += `\n> Estudo isolado por hashtag: veja \`hashtags-${date}.md\`.\n`;

    return md;
}

function buildIndexDoc(profiles, failures, niche, date, sessionId, sortKey) {
    let md = `# Auditoria de perfis · ${niche.icon} ${niche.label} · ${date}\n\n`;
    md += `**Sessão:** \`${sessionId}\`  ·  **Perfis:** ${profiles.length}  ·  **Ordem interna:** ${sortKey}\n\n`;
    md += `Rota de **curadoria**: os perfis foram informados pelo operador, não descobertos. `;
    md += `Nenhum criativo foi reprovado — a escolha do que segue para a F2 é humana.\n\n`;

    md += `## Comparativo\n\n`;
    md += `| Perfil | Posts | Views (med.) | Melhor | Pico | Engaj. | Salv. | Dur. | Cadência | Últ. post | Hits ≥2x |\n`;
    md += `| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
    for (const p of profiles) {
        md += `| [@${p.handle}](${p.url}) | ${p.capturedItems} | ${num(p.medianViews)} | ${num(p.topViews)} `;
        md += `| ${p.peakRatio === null ? '—' : p.peakRatio + 'x'} | ${pct(p.medianEngagement)} | ${pct(p.medianSaveRate)} `;
        md += `| ${p.medianDuration}s | ${p.postsPerWeek === null ? '—' : p.postsPerWeek + '/sem'} `;
        md += `| ${p.lastPostAgeHours === null ? '—' : p.lastPostAgeHours + 'h'} | ${p.hitCount} (${p.hitRate}%) |\n`;
    }

    md += `\n**Como ler:** *Views (med.)* é o tamanho real do canal — mediana, imune ao viral isolado. `;
    md += `*Pico* é quantas vezes o melhor post supera essa mediana: pico alto = canal de hits esporádicos `;
    md += `(modele o hit); pico baixo com engajamento alto = canal constante (o formato inteiro é replicável). `;
    md += `*Salv.* é a taxa de salvamento — em conteúdo de status/reflexão, salvar é intenção de repostar.\n\n`;

    md += `---\n\n## Dossiês\n\n`;
    for (const p of profiles) {
        md += `- [@${p.handle}](profiles/${p.handle}.md) — ${p.capturedItems} criativos ranqueados`;
        const picks = suggestPicks(p);
        if (picks.length) md += ` · sugestão: \`${picks.map((i) => `${p.handle}#${p.items.indexOf(i) + 1}`).join(',')}\``;
        md += `\n`;
    }

    if (failures.length) {
        md += `\n---\n\n## ⚠️ Perfis sem captura (${failures.length})\n\n`;
        md += `Estes **não** entraram na auditoria. A ausência aqui é falha técnica, não juízo sobre o perfil.\n\n`;
        md += `| Perfil | Motivo |\n| :--- | :--- |\n`;
        for (const f of failures) md += `| @${f.handle} | ${String(f.reason).replace(/\|/g, '/').slice(0, 200)} |\n`;
    }

    const allPicks = profiles.flatMap((p) => suggestPicks(p).map((i) => `${p.handle}#${p.items.indexOf(i) + 1}`));
    md += `\n---\n\n## Próximo passo\n\n`;
    md += `1. Abra os dossiês e escolha os criativos (a referência é \`handle#posição\`).\n`;
    md += `2. Monte a seleção — nenhuma rede é chamada, o script lê o cache da sessão:\n\n`;
    md += `\`\`\`bash\nnode squads/virals-farming-squad/scripts/farm-profiles.js --niche=${niche.id} \\\n`;
    md += `  --session=${sessionId} --pick=${allPicks.slice(0, 6).join(',') || 'handle#1,handle#2'}\n\`\`\`\n\n`;
    md += `3. Rode a F2 sobre a seleção:\n\n`;
    md += `\`\`\`bash\nnode squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${sessionId} --top=8\n\`\`\`\n`;
    return md;
}

function buildHashtagsDoc(profiles, niche, date, sessionId) {
    // Agrega por hashtag guardando o item inteiro: sem isso não dá para dizer se a
    // hashtag acompanha post acima ou abaixo da linha de base de quem a usou.
    const tags = {};
    for (const p of profiles) {
        for (const item of p.items) {
            for (const tag of item.hashtags) {
                const t = (tags[tag] = tags[tag] || { tag, occurrences: 0, profiles: new Set(), items: [] });
                t.occurrences += 1;
                t.profiles.add(p.handle);
                t.items.push(item);
            }
        }
    }

    const rows = Object.values(tags)
        .map((t) => ({
            tag: t.tag,
            occurrences: t.occurrences,
            profiles: [...t.profiles],
            medianViews: Math.round(median(t.items.map((i) => Number(i.metrics.views) || 0))),
            medianEngagement: median(t.items.map((i) => i.engagement).filter((n) => n !== null)),
            medianOutlier: median(t.items.map((i) => i.outlier).filter((n) => n !== null)),
            topItem: [...t.items].sort((a, b) => (b.outlier || 0) - (a.outlier || 0))[0] || null,
        }))
        .sort((a, b) => b.profiles.length - a.profiles.length || b.medianOutlier - a.medianOutlier || b.occurrences - a.occurrences);

    // Co-ocorrência: qual hashtag anda junto de qual. É o que revela o "bloco" de
    // tags que o nicho usa em conjunto — estudar uma isolada ignora o pacote.
    const pairs = {};
    for (const p of profiles) {
        for (const item of p.items) {
            const list = [...new Set(item.hashtags)].sort();
            for (let a = 0; a < list.length; a++) {
                for (let b = a + 1; b < list.length; b++) {
                    const key = `${list[a]} + ${list[b]}`;
                    pairs[key] = (pairs[key] || 0) + 1;
                }
            }
        }
    }
    const topPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 15);

    const totalTagged = profiles.reduce((n, p) => n + p.items.filter((i) => i.hashtags.length > 0).length, 0);
    const totalItems = profiles.reduce((n, p) => n + p.items.length, 0);

    let md = `# Hashtags dos perfis auditados · ${niche.icon} ${niche.label} · ${date}\n\n`;
    md += `**Sessão:** \`${sessionId}\`  ·  **Perfis:** ${profiles.length}  ·  `;
    md += `**Hashtags distintas:** ${rows.length}  ·  **Posts com hashtag:** ${totalTagged}/${totalItems}\n\n`;
    md += `Documento de apoio ao **estudo isolado por hashtag**. Cada linha traz o desempenho `;
    md += `dos posts que usaram a tag — não o volume da hashtag no TikTok, que é outra pesquisa `;
    md += `(essa exige varredura da própria tag, hoje barrada pelo anti-bot; ver \`_tiktok-source.js\`).\n\n`;

    if (rows.length === 0) {
        md += `> ⚠️ **Nenhuma hashtag encontrada nas legendas.** Não é falha de captura: parte relevante `;
        md += `dos perfis de status/reflexão publica com legenda limpa e sem tag. Se for o caso de todos `;
        md += `os perfis desta lista, o estudo por hashtag precisa partir de outra fonte que não o acervo deles.\n`;
        return md;
    }

    md += `---\n\n## Ranking de hashtags\n\n`;
    md += `> **Alcance transversal** = em quantos perfis distintos a tag aparece. Tag usada por vários `;
    md += `perfis independentes é convenção do nicho; tag de um perfil só é assinatura dele.\n`;
    md += `> **Outlier med.** = mediana do índice de outlier dos posts que a usaram. \`>1.0\` significa que, `;
    md += `em média, quem usou essa tag ficou acima da própria linha de base.\n`;
    md += `> **⚠ em Usos** = menos de 3 ocorrências. A mediana de 1 ou 2 posts é anedota, não tendência — `;
    md += `uma tag que aparece uma vez num vídeo que viralizou por outro motivo exibe outlier altíssimo e não significa nada.\n\n`;
    md += `| # | Hashtag | Perfis | Usos | Views (med.) | Engaj. (med.) | Outlier med. | Melhor post |\n`;
    md += `| :- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |\n`;
    rows.forEach((r, i) => {
        const top = r.topItem ? `[@${r.topItem.handle} ${r.topItem.outlier === null ? '' : r.topItem.outlier.toFixed(2) + 'x'}](${r.topItem.url})` : '—';
        const uses = r.occurrences < 3 ? `${r.occurrences} ⚠` : String(r.occurrences);
        md += `| ${i + 1} | \`#${r.tag}\` | ${r.profiles.length} | ${uses} | ${num(r.medianViews)} `;
        md += `| ${pct(r.medianEngagement)} | ${r.medianOutlier ? r.medianOutlier.toFixed(2) + 'x' : '—'} | ${top} |\n`;
    });

    // Recorte de amostra sustentável: tag com 3+ usos E acima da linha de base.
    // É esta lista, não o topo da tabela, que sustenta hipótese de teste.
    const solid = rows.filter((r) => r.occurrences >= 3 && r.medianOutlier > 1);
    if (solid.length) {
        md += `\n### Com amostra sustentável (3+ usos) e acima da linha de base\n\n`;
        for (const r of solid) {
            md += `- \`#${r.tag}\` — ${r.occurrences} usos em ${r.profiles.length} perfil(is) · `;
            md += `outlier med. **${r.medianOutlier.toFixed(2)}x** · engaj. med. ${pct(r.medianEngagement)}\n`;
        }
    }

    const transversal = rows.filter((r) => r.profiles.length >= 2);
    md += `\n---\n\n## Candidatas a estudo isolado\n\n`;
    if (transversal.length) {
        md += `Tags presentes em **2 ou mais perfis independentes** — são convenção do nicho, não assinatura de um criador:\n\n`;
        for (const r of transversal) {
            md += `- \`#${r.tag}\` — ${r.profiles.length} perfis (${r.profiles.map((h) => '@' + h).join(', ')}) · `;
            md += `${r.occurrences} usos · outlier med. ${r.medianOutlier ? r.medianOutlier.toFixed(2) + 'x' : '—'}\n`;
        }
    } else {
        md += `_Nenhuma tag apareceu em mais de um perfil._ Cada criador usa seu próprio conjunto — o estudo `;
        md += `isolado, nesse caso, mede a assinatura do criador, não a convenção do nicho.\n`;
    }

    if (topPairs.length) {
        md += `\n---\n\n## Combinações mais frequentes\n\n`;
        md += `Tags que aparecem juntas no mesmo post. Estudar uma isolada ignora o pacote em que ela é publicada.\n\n`;
        md += `| Combinação | Posts |\n| :--- | ---: |\n`;
        for (const [k, n] of topPairs) {
            const combo = k.split(' + ').map((t) => '`#' + t + '`').join(' + ');
            md += `| ${combo} | ${n} |\n`;
        }
    }

    md += `\n---\n\n## Por perfil\n\n`;
    for (const p of profiles) {
        const count = {};
        for (const i of p.items) for (const t of i.hashtags) count[t] = (count[t] || 0) + 1;
        const list = Object.entries(count).sort((a, b) => b[1] - a[1]);
        md += `### @${p.handle}\n\n`;
        md += list.length
            ? list.map(([t, n]) => `\`#${t}\`(${n})`).join(' · ') + '\n\n'
            : `_Sem hashtags nas legendas capturadas._\n\n`;
    }

    return md;
}

// ---------------------------------------------------------------------------
// Seleção para a F2 (--pick)
// ---------------------------------------------------------------------------

function parsePicks(args) {
    const raw = [];
    if (args.pick && args.pick !== true) raw.push(...String(args.pick).split(','));
    if (args['pick-from'] && args['pick-from'] !== true) {
        const file = path.resolve(L.REPO_ROOT, String(args['pick-from']));
        if (!fs.existsSync(file)) throw new Error(`Arquivo de seleção não encontrado: ${file}`);
        raw.push(...fs.readFileSync(file, 'utf8').split('\n'));
    }
    const picks = [];
    for (const entry of raw) {
        // Atenção: aqui `#` é o SEPARADOR de posição (handle#3), não marcador de
        // comentário como na lista de perfis. Cortar no '#' quebraria toda seleção.
        const line = String(entry).trim();
        if (!line) continue;
        const m = line.match(/^@?([a-zA-Z0-9._]{1,30})#(\d+)$/);
        if (m) picks.push({ handle: m[1].toLowerCase(), rank: parseInt(m[2], 10) });
        else throw new Error(`Seleção inválida: "${line}". Formato esperado: handle#posição (ex.: lermenn_#3)`);
    }
    return picks;
}

function runPick(args, date) {
    const sessionRef = args.session
        ? { id: String(args.session), dir: path.join(L.OUTPUT_ROOT, date, String(args.session)) }
        : L.findLatestSession(args.niche, date);

    if (!sessionRef || !fs.existsSync(sessionRef.dir)) {
        console.error(`❌ Sessão não encontrada. Rode a auditoria antes:`);
        console.error(`   node squads/virals-farming-squad/scripts/farm-profiles.js --niche=${args.niche} --profiles=@a,@b`);
        return 1;
    }

    const cachePath = path.join(sessionRef.dir, `profiles-${date}.json`);
    if (!fs.existsSync(cachePath)) {
        console.error(`❌ Cache da auditoria não encontrado em ${cachePath}.`);
        return 1;
    }

    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const niche = L.loadNiche(args.niche || cache.niche);
    const byHandle = Object.fromEntries(cache.profiles.map((p) => [p.handle, p]));
    const selected = [];

    // Seleção por CRITÉRIO, não por posição. Com centenas de criativos no cache,
    // enumerar `handle#N` à mão é inviável — e uma lista digitada à mão erra em
    // silêncio (posição trocada seleciona outro vídeo sem avisar).
    if (args['min-score'] || args['min-outlier'] || args['all']) {
        const minScore = parseFloat(args['min-score']) || 0;
        const minOutlier = parseFloat(args['min-outlier']) || 0;
        const criteria = [];
        if (minScore) criteria.push(`score ≥ ${minScore}`);
        if (minOutlier) criteria.push(`outlier ≥ ${minOutlier}x`);

        const matched = [];
        for (const p of cache.profiles) {
            p.items.forEach((item, idx) => {
                if (item.score < minScore) return;
                if (minOutlier && (item.outlier === null || item.outlier < minOutlier)) return;
                matched.push({ ...item, pickRef: `${p.handle}#${idx + 1}` });
            });
        }
        // Ordem global por score: se a F2 for interrompida ou truncada, o que já
        // rodou é o mais relevante do conjunto, não uma fatia arbitrária.
        matched.sort((a, b) => b.score - a.score);
        selected.push(...matched);
        console.log(`\n🎯 Critério: ${criteria.join(' · ') || 'todos'} → ${selected.length} de ${cache.totals.captured} criativo(s)`);
    }

    const picks = parsePicks(args);
    const missing = [];
    for (const pick of picks) {
        const p = byHandle[pick.handle];
        if (!p) { missing.push(`@${pick.handle} não está nesta sessão`); continue; }
        const item = p.items[pick.rank - 1];
        if (!item) { missing.push(`@${pick.handle}#${pick.rank} fora do intervalo (o perfil tem ${p.items.length})`); continue; }
        const ref = `${pick.handle}#${pick.rank}`;
        if (!selected.some((s) => s.pickRef === ref)) selected.push({ ...item, pickRef: ref });
    }

    if (missing.length) {
        console.error(`❌ Seleção inválida:`);
        for (const m of missing) console.error(`   · ${m}`);
        return 1;
    }
    if (selected.length === 0) {
        console.error(`❌ Nenhum criativo selecionado. Use --pick=handle#N ou --min-score=N.`);
        return 1;
    }

    // Grava no formato que a F2 já consome (`ranking-{niche}-{date}.json` → `items`).
    // Reaproveitar o contrato existente é o que permite a F2 rodar sem saber que a
    // seleção veio de curadoria manual em vez do garimpo.
    const rankingPath = path.join(sessionRef.dir, `ranking-${niche.id}-${date}.json`);
    fs.writeFileSync(rankingPath, JSON.stringify({
        session_id: sessionRef.id,
        niche: niche.id,
        date,
        source: 'profiles-curated',
        selection: selected.map((s) => s.pickRef),
        totals: { captured: cache.totals.captured, approved: selected.length, rejected: 0, unranked: 0, capture_failures: cache.totals.capture_failures },
        items: selected,
    }, null, 2));

    const sessionFile = path.join(sessionRef.dir, 'session.json');
    const manifest = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf8')) : { phases: {} };
    Object.assign(manifest, { session_id: sessionRef.id, date, niche: niche.id });
    manifest.phases = manifest.phases || {};
    manifest.phases.f1_selection = {
        completed_at: new Date().toISOString(),
        source: 'profiles-curated',
        selection: selected.map((s) => s.pickRef),
        ranking_json: path.relative(L.REPO_ROOT, rankingPath).replace(/\\/g, '/'),
        approved: selected.length,
    };
    fs.writeFileSync(sessionFile, JSON.stringify(manifest, null, 2));

    console.log(`\n✅ Seleção com ${selected.length} criativo(s):\n`);
    selected.slice(0, 15).forEach((s, i) => {
        console.log(`   ${String(i + 1).padStart(3)}. ${s.pickRef.padEnd(24)} ${num(s.metrics.views).padStart(10)} views · ${pct(s.engagement)} · ${s.duration}s`);
    });
    if (selected.length > 15) console.log(`   ... e mais ${selected.length - 15} (ordem: score decrescente).`);
    console.log(`\n✅ Ranking F2: ${path.relative(L.REPO_ROOT, rankingPath).replace(/\\/g, '/')}`);
    console.log(`\n➡️  Próximo: node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${sessionRef.id} --top=${selected.length}\n`);
    return 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
    const args = L.parseArgs(process.argv);
    const date = args.date || L.todayISO();

    if (!args.niche) {
        console.error(`❌ --niche é obrigatório (define os pesos de score). Disponíveis: ${L.listNiches().join(', ')}`);
        finish(1);
        return;
    }

    if (args.pick || args['pick-from'] || args['min-score'] || args['min-outlier'] || args.all) {
        try {
            finish(runPick(args, date));
        } catch (e) {
            console.error(`❌ ${e.message}`);
            finish(1);
        }
        return;
    }

    let niche;
    try {
        niche = L.loadNiche(args.niche);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        finish(1);
        return;
    }

    let handles;
    let invalid;
    try {
        ({ handles, invalid } = collectProfiles(args));
    } catch (e) {
        console.error(`❌ ${e.message}`);
        finish(1);
        return;
    }

    if (handles.length === 0) {
        console.error(`❌ Nenhum perfil informado. Use --profiles=@a,@b ou --from=arquivo.txt`);
        finish(1);
        return;
    }
    if (invalid.length) {
        console.warn(`⚠️  ${invalid.length} entrada(s) ignorada(s) por não parecerem perfil: ${invalid.slice(0, 5).join(' | ')}`);
    }

    const itemsPerProfile = parseInt(args.items, 10) || 30;
    const sortKey = SORTERS[String(args.sort || 'outlier')] ? String(args.sort || 'outlier') : 'outlier';
    const bin = TT.resolveYtdlp();

    console.log(`\n=== F1-P Auditoria de Perfis · ${niche.icon} ${niche.label} ===`);
    console.log(`Data:      ${date}`);
    console.log(`Perfis:    ${handles.length}`);
    console.log(`Itens:     ${itemsPerProfile} por perfil`);
    console.log(`Ordem:     ${sortKey}`);
    console.log(`yt-dlp:    ${bin}`);
    console.log(`\nNenhum criativo é reprovado nesta rota — o corte é seu.\n`);

    if (args['dry-run']) {
        handles.forEach((h, i) => console.log(`  ${String(i + 1).padStart(2)}. @${h}`));
        console.log(`\n🧪 DRY RUN — nenhuma chamada de rede feita.\n`);
        finish(0);
        return;
    }

    const session = L.resolveSessionDir(niche.id, date, args.session);
    const profiles = [];
    const failures = [];

    for (const [idx, handle] of handles.entries()) {
        process.stdout.write(`[${String(idx + 1).padStart(2)}/${handles.length}] @${handle.padEnd(24)} `);
        const r = TT.discoverByProfile(bin, handle, itemsPerProfile, 'perfil', `@${handle}`);
        if (!r.ok || r.items.length === 0) {
            const reason = r.reason || 'nenhum item devolvido';
            console.log(`❌ ${String(reason).slice(0, 60)}`);
            failures.push({ handle, reason });
            continue;
        }
        const profile = analyzeProfile(handle, r.items, niche);
        profile.items.sort(SORTERS[sortKey]);
        profiles.push(profile);
        console.log(`✓ ${r.items.length} criativo(s) · mediana ${num(profile.medianViews)} views · pico ${profile.peakRatio || '—'}x`);
    }

    if (profiles.length === 0) {
        console.error(`\n❌ Nenhum perfil capturado. A auditoria não foi gerada.`);
        for (const f of failures) console.error(`   @${f.handle}: ${f.reason}`);
        finish(1);
        return;
    }

    const profilesDir = path.join(session.dir, 'profiles');
    fs.mkdirSync(profilesDir, { recursive: true });
    for (const p of profiles) {
        fs.writeFileSync(path.join(profilesDir, `${p.handle}.md`), buildProfileDoc(p, niche, date, session.id, sortKey));
    }

    const indexPath = path.join(session.dir, `profiles-index-${date}.md`);
    const hashtagsPath = path.join(session.dir, `hashtags-${date}.md`);
    const cachePath = path.join(session.dir, `profiles-${date}.json`);
    const hashtagsJsonPath = path.join(session.dir, `hashtags-${date}.json`);

    fs.writeFileSync(indexPath, buildIndexDoc(profiles, failures, niche, date, session.id, sortKey));
    fs.writeFileSync(hashtagsPath, buildHashtagsDoc(profiles, niche, date, session.id));

    const totalCaptured = profiles.reduce((n, p) => n + p.capturedItems, 0);
    fs.writeFileSync(cachePath, JSON.stringify({
        session_id: session.id, niche: niche.id, date, source: 'profiles-audit',
        sort: sortKey, items_per_profile: itemsPerProfile,
        totals: { profiles: profiles.length, captured: totalCaptured, capture_failures: failures.length },
        profiles, capture_failures: failures,
    }, null, 2));

    // JSON de hashtags à parte — é o insumo do estudo isolado, e quem for consumi-lo
    // não deve precisar carregar o acervo inteiro dos perfis.
    const tagAgg = {};
    for (const p of profiles) {
        for (const item of p.items) {
            for (const tag of item.hashtags) {
                const t = (tagAgg[tag] = tagAgg[tag] || { tag, occurrences: 0, profiles: [], views: [], engagements: [], outliers: [], posts: [] });
                t.occurrences += 1;
                if (!t.profiles.includes(p.handle)) t.profiles.push(p.handle);
                t.views.push(Number(item.metrics.views) || 0);
                if (item.engagement !== null) t.engagements.push(item.engagement);
                if (item.outlier !== null) t.outliers.push(item.outlier);
                t.posts.push({ handle: item.handle, url: item.url, views: item.metrics.views, outlier: item.outlier });
            }
        }
    }
    fs.writeFileSync(hashtagsJsonPath, JSON.stringify({
        session_id: session.id, niche: niche.id, date,
        profiles: profiles.map((p) => p.handle),
        hashtags: Object.values(tagAgg)
            .map((t) => ({
                tag: t.tag, occurrences: t.occurrences, profiles: t.profiles,
                median_views: Math.round(median(t.views)),
                median_engagement: median(t.engagements),
                median_outlier: median(t.outliers),
                posts: t.posts,
            }))
            .sort((a, b) => b.profiles.length - a.profiles.length || b.occurrences - a.occurrences),
    }, null, 2));

    const sessionFile = path.join(session.dir, 'session.json');
    const manifest = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf8')) : { phases: {} };
    Object.assign(manifest, { session_id: session.id, date, niche: niche.id });
    manifest.phases = manifest.phases || {};
    manifest.phases.f1_profiles = {
        completed_at: new Date().toISOString(),
        source: 'profiles-audit',
        profiles: profiles.map((p) => p.handle),
        index_md: path.relative(L.REPO_ROOT, indexPath).replace(/\\/g, '/'),
        hashtags_md: path.relative(L.REPO_ROOT, hashtagsPath).replace(/\\/g, '/'),
        cache_json: path.relative(L.REPO_ROOT, cachePath).replace(/\\/g, '/'),
        captured: totalCaptured,
        capture_failures: failures.length,
    };
    fs.writeFileSync(sessionFile, JSON.stringify(manifest, null, 2));

    const rel = (p) => path.relative(L.REPO_ROOT, p).replace(/\\/g, '/');
    console.log(`\n📦 ${profiles.length} perfil(is) · ${totalCaptured} criativo(s) capturado(s)`);
    if (failures.length) console.log(`⚠️  ${failures.length} perfil(is) sem captura — veja o índice.`);
    console.log(`\n✅ Índice:    ${rel(indexPath)}`);
    console.log(`✅ Dossiês:   ${rel(profilesDir)}/*.md`);
    console.log(`✅ Hashtags:  ${rel(hashtagsPath)}`);
    console.log(`✅ Cache:     ${rel(cachePath)}`);
    console.log(`\n➡️  Escolha os criativos e monte a seleção:`);
    console.log(`   node squads/virals-farming-squad/scripts/farm-profiles.js --niche=${niche.id} --session=${session.id} --pick=handle#1,handle#3\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    finish(1);
});
