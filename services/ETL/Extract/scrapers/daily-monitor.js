#!/usr/bin/env node
/**
 * Daily Monitor — Virals Marketing Squad
 *
 * Wrapper de orquestração para o pipeline de monitoramento diário:
 *   1. Recebe lista de plataformas via CLI (--platforms=instagram,tiktok,...)
 *   2. Filtra o YAML mestre de perfis (monitoring-profiles.yaml) por plataforma
 *   3. Persiste YAML runtime em services/ETL/Extract/Links/.runtime/profiles-{date}.yaml
 *   4. Executa SocialDiscovery (engine v3.2)
 *   5. Gera 1 arquivo .md por rede + 1 consolidado em ranking decrescente
 *      em workspaces/businesses/virals/marketing/daily-monitoring/{date}/
 *
 * Comando padrão:
 *   node services/ETL/Extract/scrapers/daily-monitor.js --platforms=instagram,tiktok --hours=36
 */

const SocialDiscovery = require('./social-discovery.js');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
    resolveClient,
    extractClientArg,
} = require('../../../../squads/virals-marketing-squad/scripts/_client_resolver.js');
const { checkIgSession } = require('../auth/ig-session.js');
const { loadFitProfile } = require('../../Transform/analyzers/fit-scorer.js');
const { buildGeneralRanking, buildFitRanking } = require('../../Transform/analyzers/ranking-builders.js');

function parseArgs(argv) {
    return argv.slice(2).reduce((acc, arg) => {
        const match = arg.match(/^--([^=]+)=(.*)$/);
        if (match) acc[match[1]] = match[2];
        return acc;
    }, {});
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function fmtNumber(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function buildPlatformReport(platform, posts, date, lookbackHours) {
    let md = `# ${platform.toUpperCase()} · Ranking Diário · ${date}\n\n`;
    md += `**Total de posts:** ${posts.length}  ·  **Lookback:** ${lookbackHours}h  ·  **Threshold:** score >= 10\n\n`;
    md += `> Viral Score = (Views × 0.1) + (Likes × 1) + (Comments × 5)\n\n`;
    md += `Ordenação: maior → menor engajamento.\n\n---\n\n`;

    if (posts.length === 0) {
        md += `_Nenhum post encontrado dentro da janela de ${lookbackHours}h._\n`;
        return md;
    }

    md += `| # | Criador | Viral Score | Likes | Comentários | Views | Link |\n`;
    md += `| :- | :--- | ---: | ---: | ---: | ---: | :--- |\n`;
    posts.forEach((p, i) => {
        md += `| ${i + 1} | ${p.identifier} | **${fmtNumber(p.score)}** | ${fmtNumber(p.metrics.likes)} | ${fmtNumber(p.metrics.comments)} | ${fmtNumber(p.metrics.views)} | [Ver Post](${p.url}) |\n`;
    });
    return md;
}

function buildSummary(allPosts, presentPlatforms, date, lookbackHours, platformsRequested) {
    let md = `# Daily Viral Summary · ${date}\n\n`;
    md += `**Plataformas analisadas:** ${platformsRequested.join(', ')}\n`;
    md += `**Total de posts capturados:** ${allPosts.length}\n`;
    md += `**Lookback:** ${lookbackHours}h  ·  **Threshold:** score >= 10\n\n`;
    md += `> Viral Score = (Views × 0.1) + (Likes × 1) + (Comments × 5)\n\n---\n\n`;

    md += `## 📊 Visão por Plataforma\n\n`;
    md += `| Plataforma | Posts | Top Score | Top Criador |\n`;
    md += `| :--- | ---: | ---: | :--- |\n`;
    for (const plat of platformsRequested) {
        const platPosts = allPosts.filter(p => p.platform === plat);
        const top = platPosts[0];
        md += `| ${plat} | ${platPosts.length} | ${top ? `**${fmtNumber(top.score)}**` : '—'} | ${top ? top.identifier : '—'} |\n`;
    }
    md += `\n---\n\n`;

    for (const plat of presentPlatforms) {
        const platPosts = allPosts.filter(p => p.platform === plat);
        md += `## 🏆 Ranking ${plat.toUpperCase()}\n\n`;
        md += `| # | Criador | Viral Score | Likes | Comentários | Views | Link |\n`;
        md += `| :- | :--- | ---: | ---: | ---: | ---: | :--- |\n`;
        platPosts.forEach((p, i) => {
            md += `| ${i + 1} | ${p.identifier} | **${fmtNumber(p.score)}** | ${fmtNumber(p.metrics.likes)} | ${fmtNumber(p.metrics.comments)} | ${fmtNumber(p.metrics.views)} | [Ver Post](${p.url}) |\n`;
        });
        md += `\n`;
    }

    return md;
}

(async () => {
    const args = parseArgs(process.argv);
    const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

    const date = args.date || todayISO();
    const lookbackHours = parseInt(args.hours, 10) || 36;
    const platforms = (args.platforms || 'instagram,tiktok,youtube,linkedin')
        .split(',')
        .map(p => p.trim().toLowerCase())
        .filter(Boolean);

    // Resolução de cliente (MKT-MC2-03). --profiles e --output têm prioridade.
    let client;
    try {
        client = resolveClient(args.client);
    } catch (e) {
        console.error(`ERRO ao resolver cliente: ${e.message}`);
        process.exit(1);
    }

    const profilesYaml = args.profiles
        ? path.resolve(args.profiles)
        : path.join(REPO_ROOT, client.monitoringDir, 'monitoring-profiles.yaml');

    const outputDir = args.output
        ? path.resolve(args.output)
        : path.join(REPO_ROOT, client.workspaceDir, 'daily-monitoring', date);

    const runtimeDir = path.join(REPO_ROOT, 'services', 'ETL', 'Extract', 'Links', '.runtime');
    if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const runtimeYaml = path.join(runtimeDir, `profiles-${date}.yaml`);
    const summaryPath = path.join(outputDir, `_summary-${date}.md`);

    console.log(`\n=== Daily Monitor ===`);
    console.log(`Client:      ${client.nomeExibicao} (${client.slug})`);
    console.log(`Date:        ${date}`);
    console.log(`Platforms:   ${platforms.join(', ')}`);
    console.log(`Lookback:    ${lookbackHours}h`);
    console.log(`Profiles:    ${profilesYaml}`);
    console.log(`Output dir:  ${outputDir}`);
    console.log(`Runtime YAML: ${runtimeYaml}\n`);

    if (!fs.existsSync(profilesYaml)) {
        console.error(`❌ YAML mestre não encontrado: ${profilesYaml}`);
        process.exit(1);
    }

    const master = yaml.load(fs.readFileSync(profilesYaml, 'utf8'));
    const filtered = { profiles: {} };
    if (master.config) filtered.config = master.config;

    // Mapa handle→priority (VEX-14): a priority editorial do perfil é um sinal
    // de fit que o dono já curou à mão no monitoring-profiles.
    const priorityByHandle = {};
    const normHandle = (h) => String(h || '').toLowerCase().replace(/^@/, '').trim();

    for (const plat of platforms) {
        if (master.profiles && master.profiles[plat]) {
            filtered.profiles[plat] = master.profiles[plat];
            for (const prof of master.profiles[plat]) {
                if (prof.handle) priorityByHandle[normHandle(prof.handle)] = prof.priority || 'medium';
            }
            console.log(`✓ ${plat}: ${master.profiles[plat].length} perfis selecionados`);
        } else {
            console.warn(`⚠️ Plataforma "${plat}" não encontrada no YAML mestre — ignorando.`);
        }
    }

    if (Object.keys(filtered.profiles).length === 0) {
        console.error(`❌ Nenhuma plataforma válida selecionada. Abortando.`);
        process.exit(1);
    }

    fs.writeFileSync(runtimeYaml, yaml.dump(filtered, { lineWidth: 200 }));
    console.log(`✓ Runtime YAML gravado.\n`);

    // Preflight de sessão do Instagram: o fallback Playwright só funciona com
    // sessão viva. Não é fatal (a API anônima ainda cobre boa parte dos perfis),
    // mas o dono precisa saber ANTES de ler o ranking como se fosse completo.
    if (platforms.includes('instagram')) {
        const ig = await checkIgSession();
        if (ig.alive) {
            console.log(`🔓 Sessão Instagram: VIVA (${ig.ageDays}d) — fallback Playwright ativo.\n`);
        } else {
            console.warn(`⚠️  Sessão Instagram NÃO autenticada: ${ig.reason}`);
            console.warn(`    Perfis que a API anônima não devolver serão PULADOS.`);
            console.warn(`    Renove com: node services/ETL/Extract/scrapers/ig-login.js\n`);
        }
    }

    const discovery = new SocialDiscovery({
        profilesPath: runtimeYaml,
        outputPath: summaryPath,
        lookbackHours,
        headless: true
    });

    let allPosts = [];
    let captureFailures = [];
    try {
        await discovery.init();
        allPosts = await discovery.run();
    } catch (e) {
        console.error(`❌ Erro durante discovery: ${e.message}`);
        console.error(e.stack);
    } finally {
        captureFailures = discovery.captureFailures || [];
        await discovery.close();
    }

    if (!Array.isArray(allPosts)) allPosts = [];
    // Enriquece cada post com a priority do seu perfil (para o fit ranking).
    for (const p of allPosts) p.priority = priorityByHandle[normHandle(p.identifier)] || 'medium';
    const sorted = allPosts.sort((a, b) => b.score - a.score);
    const presentPlatforms = [...new Set(sorted.map(p => p.platform))];

    fs.writeFileSync(summaryPath, buildSummary(sorted, presentPlatforms, date, lookbackHours, platforms));

    for (const plat of platforms) {
        const platPosts = sorted.filter(p => p.platform === plat);
        const platFile = path.join(outputDir, `${plat}-ranking-${date}.md`);
        fs.writeFileSync(platFile, buildPlatformReport(plat, platPosts, date, lookbackHours));
        console.log(`✅ ${plat.padEnd(10)} → ${platPosts.length.toString().padStart(3)} posts → ${path.relative(REPO_ROOT, platFile)}`);
    }

    // VEX-14: coletas gerais (ranking global cross-plataforma).
    const generalPath = path.join(outputDir, `_ranking-geral-${date}.md`);
    fs.writeFileSync(generalPath, buildGeneralRanking(sorted, date, lookbackHours, platforms));
    console.log(`✅ ${'geral'.padEnd(10)} → ${sorted.length.toString().padStart(3)} posts → ${path.relative(REPO_ROOT, generalPath)}`);

    // VEX-14: ranking por confluência com o cliente (fit, não engajamento).
    // Não-fatal: sem brand-identity legível, pula o fit e segue.
    try {
        const fitProfile = loadFitProfile(path.resolve(REPO_ROOT, client.brandIdentity));
        const fitPath = path.join(outputDir, `_fit-ranking-${date}.md`);
        fs.writeFileSync(fitPath, buildFitRanking(sorted, fitProfile, client, date));
        console.log(`✅ ${'fit'.padEnd(10)} → confluência com ${client.slug} → ${path.relative(REPO_ROOT, fitPath)}`);
    } catch (e) {
        console.warn(`⚠️ Fit ranking pulado (brand-identity indisponível): ${e.message}`);
    }

    console.log(`\n🏁 Consolidado: ${path.relative(REPO_ROOT, summaryPath)}`);
    console.log(`🏁 Total de posts: ${sorted.length}`);

    // Perfis não capturados: falha técnica, NÃO "perfil sem post na janela".
    // Sem esse bloco o ranking parece completo quando não é.
    if (captureFailures.length > 0) {
        const failPath = path.join(outputDir, `_falhas-de-captura-${date}.md`);
        let md = `# Falhas de Captura · ${date}\n\n`;
        md += `${captureFailures.length} perfil(is) NÃO foram coletados. O ranking está incompleto.\n\n`;
        md += `| Plataforma | Perfil | Motivo |\n| :--- | :--- | :--- |\n`;
        for (const f of captureFailures) md += `| ${f.platform} | ${f.identifier} | ${f.reason} |\n`;
        fs.writeFileSync(failPath, md);

        console.warn(`\n⚠️  ${captureFailures.length} perfil(is) sem captura (ranking INCOMPLETO):`);
        for (const f of captureFailures.slice(0, 10)) console.warn(`    · [${f.platform}] ${f.identifier} — ${f.reason}`);
        if (captureFailures.length > 10) console.warn(`    · ... +${captureFailures.length - 10} (ver ${path.relative(REPO_ROOT, failPath)})`);
        console.warn(`    Detalhes: ${path.relative(REPO_ROOT, failPath)}`);
    }
    console.log('');
})().catch(e => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
