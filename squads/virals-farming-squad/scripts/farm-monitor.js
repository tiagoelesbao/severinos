#!/usr/bin/env node
/**
 * farm-monitor.js — F1 Garimpo · Virals Farming Squad
 *
 * Varre o TikTok por HASHTAG e/ou PERFIL dentro de um nicho pré-configurado,
 * aplica a nota de corte do nicho e produz um ranking de candidatos a modelagem.
 *
 * ARQUITETURA DE FONTE (ver _tiktok-source.js para o estado verificado de cada rota):
 *   · Perfil  → yt-dlp --flat-playlist. Funciona e já traz métricas completas.
 *   · Hashtag → cascata Playwright que devolve HANDLES; as métricas vêm depois
 *               pela rota de perfil. Se a cascata falha, vira falha de captura
 *               explícita — nunca um ranking vazio que parece "não tinha nada".
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-monitor.js --niche=religioso --source=profiles
 *   node ... --niche=pet --source=both --hours=24 --items=30
 *   node ... --niche=noticias --dry-run
 *
 * Flags:
 *   --niche=ID        nicho em data/niches/ (obrigatório)
 *   --source=X        hashtags | profiles | both        (default: both)
 *   --hours=N         janela de lookback                (default: do nicho)
 *   --items=N         itens por alvo                    (default: do nicho)
 *   --date=YYYY-MM-DD data da sessão                    (default: hoje)
 *   --session=ID      grava numa sessão existente
 *   --headed          usa navegador visível na rota de hashtag
 *   --handles=a,b     handles avulsos, sem editar o YAML do nicho
 *   --max-handles=N   teto de handles novos vindos de hashtag  (default: 15)
 *   --dry-run         mostra os alvos e sai, sem chamar a rede
 */

const fs = require('fs');
const path = require('path');

const L = require('./_niche-loader.js');
const TT = require('./_tiktok-source.js');

// A F1 passou a depender de credencial (Serper) na rota de descoberta. Até então
// só usava binários locais, por isso não carregava o .env — a ausência silenciosa das
// variáveis fazia a busca parecer "chave ausente" mesmo com a chave gravada.
require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

// NUNCA use process.exit() aqui. Chamado logo após I/O de rede, ele ABORTA o processo
// no Windows — libuv cospe "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" e o
// código de saída vira 0xC0000409 em vez de 0. Ou seja: a varredura dá certo, imprime o
// ranking, e ainda assim reporta FALHA para quem orquestra por exit code.
// Medido em 2026-07-27 com o --test-search: sucesso saindo -1073740791.
// Sinalizar o código e deixar o event loop drenar sozinho custa milissegundos e sai limpo.
function finish(code) {
    process.exitCode = code;
}

function buildTargets(niche, source) {
    const targets = [];
    const d = niche.discovery;

    if (source === 'hashtags' || source === 'both') {
        // `search_terms` (opcional no nicho) traz as expressões em linguagem natural,
        // com acento e espaço — que é o que o buscador entende. A hashtag crua
        // ("versiculododia") não é indexada como texto; o termo ("versículo do dia") é.
        const terms = d.search_terms && d.search_terms.length ? d.search_terms : (d.hashtags || []);
        for (const t of terms) {
            targets.push({ kind: 'hashtag', label: `#${t}`, key: t, searchTerm: t });
        }
    }
    if (source === 'profiles' || source === 'both') {
        for (const handle of d.anchor_profiles || []) {
            const clean = String(handle).replace(/^@/, '');
            targets.push({ kind: 'perfil', label: `@${clean}`, key: clean });
        }
    }
    return targets;
}

/** Handles avulsos via --handles=a,b — varredura sem precisar editar o YAML do nicho. */
function parseAdHocHandles(raw) {
    if (!raw || raw === true) return [];
    return String(raw)
        .split(',')
        .map((h) => h.trim().replace(/^@/, ''))
        .filter(Boolean);
}

/**
 * Aplica a nota de corte. Separa aprovados, reprovados (com o motivo) e itens
 * sem métrica. Item sem métrica NÃO é rankeado como zero — "sem dado" não é
 * "sem engajamento", e tratá-los como iguais falsearia o corte.
 */
function applyCutoff(items, niche) {
    const cutoff = niche.cutoff;
    const nowSec = Math.floor(Date.now() / 1000);
    const approved = [];
    const rejected = [];
    const unranked = [];

    for (const item of items) {
        if (!item.hasMetrics) {
            unranked.push({ ...item, reason: 'métricas ausentes na fonte' });
            continue;
        }

        const score = L.calculateViralScore(item.metrics, niche.viralScore.weights);
        const engagement = L.engagementRate(item.metrics);
        const model = L.preliminaryModelability(item, niche.signals);
        const ageHours = item.timestamp ? (nowSec - item.timestamp) / 3600 : null;

        const enriched = {
            ...item,
            score: Math.round(score),
            engagement,
            modelability: model.score,
            modelabilityReasons: model.reasons,
            modelabilityStage: 'preliminary',
            ageHours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
        };

        const fails = [];
        if (score < cutoff.min_viral_score) fails.push(`score ${Math.round(score)} < ${cutoff.min_viral_score}`);
        if (item.metrics.views < cutoff.min_views) fails.push(`views ${item.metrics.views} < ${cutoff.min_views}`);
        if (engagement < cutoff.min_engagement_rate)
            fails.push(
                `engaj. ${(engagement * 100).toFixed(2)}% < ${(cutoff.min_engagement_rate * 100).toFixed(2)}%`
            );
        if (ageHours !== null && ageHours > cutoff.max_age_hours)
            fails.push(`idade ${Math.round(ageHours)}h > ${cutoff.max_age_hours}h`);
        if (model.score < (cutoff.min_modelability || 0))
            fails.push(`modelabilidade ${model.score} < ${cutoff.min_modelability}`);

        // Teto de duração. A modelabilidade PENALIZA vídeo longo (-15), mas penalidade
        // não reprova: com o gate em 0, pregação de 7 minutos passava. Em 2026-07-27 os
        // 30 aprovados do religioso tinham 29 acima de 45s e ZERO abaixo de 30s — nenhum
        // no formato que o squad produz. Corte é corte; ponderação não substitui.
        const dur = Number(item.duration) || 0;
        if (cutoff.max_duration_seconds && dur > cutoff.max_duration_seconds)
            fails.push(`duração ${dur}s > ${cutoff.max_duration_seconds}s`);

        // Idioma. O buscador indexa tiktok.com no mundo inteiro e `gl=br` não segura:
        // na mesma varredura, 10 dos 30 aprovados eram de fora do nicho — as três
        // primeiras posições de uma conta em inglês, e o programa de TV @theviewabc
        // entrando três vezes com pauta política americana.
        const lang = L.matchesLanguage(`${item.description || ''} ${item.title || ''}`, niche.language);
        if (!lang.ok) fails.push(lang.reason);

        if (fails.length === 0) approved.push(enriched);
        else rejected.push({ ...enriched, reason: fails.join('; ') });
    }

    return { approved, rejected, unranked };
}

/** Dedupe por id, teto por handle e teto total — garante diversidade de fonte. */
function diversify(items, ranking) {
    const seen = new Set();
    const perHandle = {};
    const out = [];

    // ORDEM: modelabilidade ANTES de viral score. A F1 existe para achar o que dá para
    // REMODELAR, não o que performou melhor — e os dois raramente coincidem: numa mesma
    // varredura, @gshow apareceu com 133.295 de score e formato inaproveitável (-4),
    // enquanto @biblia_sagrada9 fez 7.128 num formato diretamente replicável (+16).
    // Ordenar por score punha o inaproveitável no topo e enterrava o candidato bom.
    // O viral score continua sendo o desempate — dentro do mesmo formato, ele manda.
    const sorted = [...items].sort((a, b) =>
        b.modelability !== a.modelability ? b.modelability - a.modelability : b.score - a.score
    );

    for (const item of sorted) {
        if (item.id && seen.has(item.id)) continue;
        const count = perHandle[item.handle] || 0;
        if (count >= (ranking.max_items_per_handle || 3)) continue;
        if (out.length >= (ranking.max_items_per_niche || 30)) break;

        if (item.id) seen.add(item.id);
        perHandle[item.handle] = count + 1;
        out.push(item);
    }
    return out;
}

/** Hashtags que aparecem nas legendas dos aprovados e ainda não estão no seed. */
function suggestHashtags(approved, niche) {
    const seed = new Set((niche.discovery.hashtags || []).map((h) => h.toLowerCase()));
    const counts = {};
    for (const item of approved) {
        const found = String(item.description || '').match(/#[\p{L}\p{N}_]+/gu) || [];
        for (const raw of found) {
            const tag = raw.slice(1).toLowerCase();
            if (seed.has(tag) || tag.length < 3) continue;
            counts[tag] = (counts[tag] || 0) + 1;
        }
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag, occurrences]) => ({ tag, occurrences }));
}

function buildRankingMarkdown(ctx) {
    const { niche, date, source, lookbackHours, approved, rejected, unranked, failures, totalCaptured, discoveredHandles } = ctx;
    const c = niche.cutoff;
    const w = niche.viralScore.weights;

    let md = `# ${niche.icon} Ranking de Farming · ${niche.label} · ${date}\n\n`;
    md += `**Sessão:** \`${ctx.sessionId}\`  ·  **Fonte:** ${source}  ·  **Lookback:** ${lookbackHours}h\n\n`;
    md += `**Capturados:** ${totalCaptured}  ·  **Aprovados:** ${approved.length}  ·  `;
    md += `**Reprovados:** ${rejected.length}  ·  **Sem métricas:** ${unranked.length}\n\n`;
    md += `> Viral Score = (views × ${w.views}) + (likes × ${w.likes}) + (comentários × ${w.comments})\n`;
    md += `> Corte deste nicho: score ≥ ${L.fmtNumber(c.min_viral_score)} · views ≥ ${L.fmtNumber(c.min_views)} · engaj. ≥ ${(c.min_engagement_rate * 100).toFixed(1)}% · idade ≤ ${c.max_age_hours}h\n`;
    md += `> Modelabilidade está no estágio **preliminar** (só metadados). A F2 a completa com detecção de cortes.\n\n---\n\n`;

    md += `## 🏆 Aprovados (candidatos a benchmark)\n\n`;
    if (approved.length === 0) {
        md += `_Nenhum criativo passou a nota de corte nesta rodada._\n\n`;
        if (failures.length > 0) {
            md += `⚠️ **Atenção:** houve ${failures.length} falha(s) de captura. A lista vazia acima pode ser consequência delas, não ausência de conteúdo. Veja a seção de falhas.\n\n`;
        }
    } else {
        md += `| # | Criador | Score | Modelab. | Views | Likes | Coment. | Engaj. | Dur. | Idade | Origem | Link |\n`;
        md += `| :- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- | :--- |\n`;
        approved.forEach((p, i) => {
            md += `| ${i + 1} | @${p.handle} | **${L.fmtNumber(p.score)}** | ${p.modelability} | ${L.fmtNumber(p.metrics.views)} | ${L.fmtNumber(p.metrics.likes)} | ${L.fmtNumber(p.metrics.comments)} | ${(p.engagement * 100).toFixed(1)}% | ${p.duration || '—'}${p.duration ? 's' : ''} | ${p.ageHours === null ? '—' : p.ageHours + 'h'} | ${p.origin} \`${p.originLabel}\` | [ver](${p.url}) |\n`;
        });
        md += `\n### Detalhe dos 10 primeiros\n\n`;
        approved.slice(0, 10).forEach((p, i) => {
            md += `**${i + 1}. @${p.handle}** — modelabilidade ${p.modelability}`;
            if (p.modelabilityReasons.length) md += ` (${p.modelabilityReasons.join(', ')})`;
            md += `\n`;
            if (p.track) md += `- Trilha: ${p.track}${p.artist ? ` — ${p.artist}` : ''}\n`;
            if (p.description) md += `- Legenda: ${p.description.replace(/\n/g, ' ').slice(0, 200)}\n`;
            md += `\n`;
        });
    }

    if (discoveredHandles && discoveredHandles.length) {
        md += `\n---\n\n## 🌱 Handles descobertos por hashtag (${discoveredHandles.length})\n\n`;
        md += `Perfis novos que apareceram nas hashtags. Promova os que renderem para \`anchor_profiles\` `;
        md += `em \`data/niches/${niche.id}.yaml\` — a rota de perfil é a mais confiável do pipeline.\n\n`;
        md += discoveredHandles.map((h) => `- \`@${h}\``).join('\n') + '\n';
    }

    md += `\n---\n\n## ✂️ Reprovados na nota de corte (${rejected.length})\n\n`;
    if (rejected.length === 0) {
        md += `_Nenhum._\n`;
    } else {
        md += `| Criador | Score | Motivo |\n| :--- | ---: | :--- |\n`;
        rejected.slice(0, 40).forEach((p) => {
            md += `| @${p.handle} | ${L.fmtNumber(p.score)} | ${p.reason} |\n`;
        });
        if (rejected.length > 40) md += `\n_... e mais ${rejected.length - 40}._\n`;
    }

    if (unranked.length > 0) {
        md += `\n---\n\n## ❓ Sem métricas (${unranked.length})\n\n`;
        md += `A fonte não devolveu contadores para estes itens. **Não são "sem engajamento" — são sem dado.** `;
        md += `Rankeá-los como zero falsearia o corte, então ficam de fora.\n\n`;
        md += `| Criador | Link |\n| :--- | :--- |\n`;
        unranked.slice(0, 20).forEach((p) => {
            md += `| @${p.handle} | ${p.url ? `[ver](${p.url})` : '—'} |\n`;
        });
    }

    if (failures.length > 0) {
        md += `\n---\n\n## ⚠️ Falhas de captura (${failures.length})\n\n`;
        md += `Estes alvos **não foram coletados**. O ranking acima está incompleto.\n\n`;
        md += `| Alvo | Tipo | Motivo |\n| :--- | :--- | :--- |\n`;
        failures.forEach((f) => {
            md += `| ${f.label} | ${f.kind} | ${String(f.reason).replace(/\|/g, '/').slice(0, 220)} |\n`;
        });
    }

    md += `\n---\n\n**Próximo passo:** \`node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${ctx.sessionId} --top=8\`\n`;
    return md;
}

(async () => {
    const args = L.parseArgs(process.argv);

    if (!args.niche) {
        console.error(`❌ --niche é obrigatório. Disponíveis: ${L.listNiches().join(', ')}`);
        finish(1);
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

    const date = args.date || L.todayISO();
    const source = String(args.source || 'both').toLowerCase();
    if (!['hashtags', 'profiles', 'both'].includes(source)) {
        console.error(`❌ --source inválido: "${source}". Use hashtags | profiles | both.`);
        finish(1);
        return;
    }

    const lookbackHours = parseInt(args.hours, 10) || niche.discovery.lookback_hours || 48;
    const itemsPerTarget = parseInt(args.items, 10) || niche.discovery.items_per_hashtag || 20;
    const maxHandles = parseInt(args['max-handles'], 10) || 15;
    const bin = TT.resolveYtdlp();
    const adHocHandles = parseAdHocHandles(args.handles);
    const targets = buildTargets(niche, source);

    // Handles avulsos entram como alvos de perfil de primeira classe.
    for (const h of adHocHandles) {
        if (!targets.some((t) => t.kind === 'perfil' && t.key === h)) {
            targets.push({ kind: 'perfil', label: `@${h}`, key: h, adHoc: true });
        }
    }

    const hashtagTargets = targets.filter((t) => t.kind === 'hashtag');
    const profileTargets = targets.filter((t) => t.kind === 'perfil');

    console.log(`\n=== F1 Garimpo · ${niche.icon} ${niche.label} ===`);
    console.log(`Data:         ${date}`);
    console.log(`Fonte:        ${source}`);
    console.log(`Alvos:        ${hashtagTargets.length} hashtag(s), ${profileTargets.length} perfil(is)`);
    console.log(`Lookback:     ${lookbackHours}h  ·  Itens/alvo: ${itemsPerTarget}`);
    console.log(`yt-dlp:       ${bin}`);
    console.log(`Corte:        score ≥ ${niche.cutoff.min_viral_score} · views ≥ ${niche.cutoff.min_views} · engaj. ≥ ${(niche.cutoff.min_engagement_rate * 100).toFixed(1)}%\n`);

    if (targets.length === 0) {
        console.error(`❌ Nenhum alvo para --source=${source}: o nicho "${niche.id}" não tem hashtags nem anchor_profiles.`);
        finish(1);
        return;
    }

    // --test-search: valida a rota de busca isoladamente, antes de gastar uma varredura
    // inteira. A descoberta é a fase mais frágil do F1 — quando ela falha, o ranking sai
    // vazio e o vazio se confunde com "nicho sem conteúdo".
    if (args['test-search'] || args['test-cse']) {
        const arg = args['test-search'] || args['test-cse'];
        const termo = arg === true ? 'oração deus' : String(arg);
        console.log(`🔎 Testando a rota de busca com o termo: "${termo}"\n`);
        console.log(`   SERPER_API_KEY : ${process.env.SERPER_API_KEY ? '✓ presente' : '✗ ausente'}\n`);

        const r = await TT.discoverHandlesViaSerper(termo, { pages: 1 });
        if (r.ok) {
            console.log(`✅ FUNCIONANDO — ${r.handles.length} handle(s):`);
            console.log(`   ${r.handles.join('  ')}\n`);
            console.log(`Próximo passo: node squads/virals-farming-squad/scripts/farm-monitor.js --niche=religioso --source=both\n`);
            finish(0);
            return;
        }

        console.log(`❌ ${r.reason}\n`);
        if (/SERPER_API_KEY ausente/.test(String(r.reason))) {
            console.log(`Crie a chave em https://serper.dev (2.500 buscas grátis) e ponha no .env:`);
            console.log(`  SERPER_API_KEY=...\n`);
        } else if (/40[13]|cota/.test(String(r.reason))) {
            console.log(`403/429 no Serper é CRÉDITO, não configuração — confira o saldo no painel.\n`);
        }
        console.log(`Fallback sem chave: --skip-serper usa o DuckDuckGo, que só aguenta`);
        console.log(`consulta isolada (em rajada devolve 202 em todos os termos).\n`);
        finish(1);
        return;
    }

    // --check-handles: audita atividade sem rodar o garimpo inteiro. É a ferramenta
    // de CURADORIA de anchor_profiles — âncora morta devolve ranking vazio, e o
    // vazio se confunde com "nicho sem conteúdo".
    if (args['check-handles'] || args['check-anchors']) {
        const toCheck = args['check-anchors']
            ? profileTargets.map((t) => t.key)
            : parseAdHocHandles(args['check-handles']);

        if (toCheck.length === 0) {
            console.error('❌ Nada para checar. Use --check-handles=a,b ou --check-anchors com anchor_profiles preenchido.');
            finish(1);
            return;
        }

        const maxAge = parseInt(args['max-age'], 10) || 168; // 7 dias
        console.log(`🔎 Checando atividade de ${toCheck.length} handle(s) (limite: ${maxAge}h desde o último post)\n`);
        const r = TT.filterActiveHandles(bin, toCheck, maxAge);

        if (r.active.length) {
            console.log(`✅ ATIVOS (${r.active.length}) — bons para anchor_profiles:`);
            for (const a of r.active) console.log(`   @${a.handle.padEnd(24)} último post há ${a.ageHours}h (${a.lastPost})`);
        }
        if (r.inactive.length) {
            console.log(`\n⚠️  INATIVOS (${r.inactive.length}) — NÃO use como âncora:`);
            for (const a of r.inactive) console.log(`   @${a.handle.padEnd(24)} último post há ${a.ageHours}h (${a.lastPost})`);
        }
        if (r.failed.length) {
            console.log(`\n❌ SEM CAPTURA (${r.failed.length}):`);
            for (const a of r.failed) console.log(`   @${a.handle.padEnd(24)} ${a.reason}`);
        }
        console.log('');
        finish(r.active.length > 0 ? 0 : 1);
        return;
    }

    if (args['dry-run']) {
        console.log('🧪 DRY RUN — alvos que seriam varridos:\n');
        targets.forEach((t, i) =>
            console.log(`  ${String(i + 1).padStart(2)}. [${t.kind.padEnd(7)}] ${t.label}`)
        );
        console.log(`\nNenhuma chamada de rede feita.\n`);
        finish(0);
        return;
    }

    const session = L.resolveSessionDir(niche.id, date, args.session);
    const collected = [];
    const failures = [];
    const discoveredHandles = new Set();

    // --- Rota de descoberta: hashtags/termos do nicho → HANDLES ---
    // As métricas NUNCA vêm daqui: elas vêm da rota de perfil, que é a confiável.
    // Cascata por alvo: página de hashtag (hoje barrada) → Serper → DDG → busca do TikTok.
    if (hashtagTargets.length > 0) {
        console.log(`— Rota de descoberta (${hashtagTargets.length} termo(s)) —`);

        // Crédito esgotado no meio da varredura não deve fazer os termos restantes
        // baterem na API um por um: a primeira negativa de cota desliga a rota.
        let serperUp = !args['skip-serper'] && Boolean(process.env.SERPER_API_KEY);
        if (!serperUp && !args['skip-serper']) {
            console.log(`   ⚠️  SERPER_API_KEY ausente — caindo para o DuckDuckGo, que não aguenta`);
            console.log(`      rajada (esperado: 202 e zero handle na maioria dos termos).`);
        }

        for (const [idx, target] of hashtagTargets.entries()) {
            process.stdout.write(`[${String(idx + 1).padStart(2)}/${hashtagTargets.length}] ${target.label.padEnd(22)} `);

            let got = null;

            // 1 — página de hashtag do TikTok (mantida: volta a valer se destravar)
            if (!args['skip-tag-page']) {
                const r1 = await TT.discoverByHashtag(target.key, { headless: !args.headed });
                if (r1.ok && r1.handles.length) got = { handles: r1.handles, via: r1.strategy };
            }

            // 2 — Serper (SERP API do Google) — a rota primária, a única que aguenta rajada
            if (!got && serperUp) {
                const r2 = await TT.discoverHandlesViaSerper(target.searchTerm || target.key);
                if (r2.quotaExceeded) serperUp = false;
                if (r2.ok) got = { handles: r2.handles, via: 'serper' };
            }

            // 3 — DuckDuckGo (fallback sem chave; degrada em rajada)
            if (!got) {
                const r3 = await TT.discoverHandlesByTerm(target.searchTerm || target.key);
                if (r3.ok) got = { handles: r3.handles, via: 'duckduckgo' };
            }

            // 4 — página de busca do TikTok (menor rendimento, soma cobertura)
            if (!got && args['deep-search']) {
                const r4 = await TT.discoverHandlesByTikTokSearch(target.searchTerm || target.key, { headless: !args.headed });
                if (r4.ok) got = { handles: r4.handles, via: 'busca-tiktok' };
            }

            if (!got) {
                console.log(`❌ nenhuma via devolveu handles`);
                failures.push({ label: target.label, kind: 'termo', reason: 'hashtag, Serper, DuckDuckGo e busca do TikTok não devolveram handles' });
                continue;
            }
            got.handles.forEach((h) => discoveredHandles.add(h));
            console.log(`✓ ${got.handles.length} handle(s) via ${got.via}`);
        }
        console.log('');
    }

    // Handles a varrer: âncoras do nicho + avulsos (--handles) + descobertos por hashtag.
    const anchorHandles = [...new Set(profileTargets.map((t) => t.key))];
    const newHandles = [...discoveredHandles].filter((h) => !anchorHandles.includes(h)).slice(0, maxHandles);
    const handlesToScan = [
        ...anchorHandles.map((h) => ({ handle: h, origin: 'perfil', label: `@${h}` })),
        ...newHandles.map((h) => ({ handle: h, origin: 'hashtag', label: `@${h}` })),
    ];

    if (handlesToScan.length > 0) {
        console.log(`— Rota de perfil (${handlesToScan.length} handle(s): ${anchorHandles.length} âncora(s) + ${newHandles.length} de hashtag) —`);
        for (const [idx, h] of handlesToScan.entries()) {
            process.stdout.write(`[${String(idx + 1).padStart(2)}/${handlesToScan.length}] ${h.label.padEnd(22)} `);
            const r = TT.discoverByProfile(bin, h.handle, itemsPerTarget, h.origin, h.label);
            if (!r.ok) {
                console.log(`❌ ${String(r.reason).slice(0, 68)}`);
                failures.push({ label: h.label, kind: 'perfil', reason: r.reason });
                continue;
            }
            collected.push(...r.items);
            console.log(`✓ ${r.items.length} item(ns)`);
        }
        console.log('');
    } else {
        console.warn(`⚠️  Nenhum handle para varrer.`);
        if (hashtagTargets.length > 0) {
            console.warn(`    A rota de hashtag não devolveu handles e o nicho não tem anchor_profiles.`);
            console.warn(`    Popule anchor_profiles em data/niches/${niche.id}.yaml — é a rota confiável.\n`);
        }
    }

    const totalCaptured = collected.length;

    // Poda de handles fora do idioma do nicho, ANTES do corte. Usa a evidência de todos
    // os posts do handle — legenda curta e neutra engana item a item, a conta inteira não.
    // Sai alto: um handle podado é uma varredura inteira que não entra no ranking, e o
    // operador precisa saber para não repromovê-lo a anchor_profile depois.
    const langVerdict = L.classifyHandlesByLanguage(collected, niche.language);
    const keptLang = collected.filter((i) => langVerdict.ok.has(i.handle));
    const droppedByLang = totalCaptured - keptLang.length;

    if (langVerdict.rejected.length > 0) {
        console.log(`\n🌐 ${langVerdict.rejected.length} handle(s) podado(s) por idioma (${droppedByLang} post(s) descartado(s)):`);
        for (const r of langVerdict.rejected) {
            console.log(`   @${r.handle.padEnd(24)} ${r.reason}`);
            for (const s of r.samples) console.log(`      ↳ ${JSON.stringify(s)}`);
        }
        console.log('');
    }

    // Poda por TEMA. Sem ela, conta gigante de outro assunto domina o ranking pelo
    // volume: @gshow (novela) e @tntsportsbr (futebol) ocuparam 4 das 7 primeiras
    // posições numa varredura devocional.
    const vocab = niche.discovery.topic_keywords || niche.discovery.hashtags || [];
    const topicVerdict = L.classifyHandlesByTopic(keptLang, vocab);
    const kept = keptLang.filter((i) => topicVerdict.ok.has(i.handle));
    const droppedByTopic = keptLang.length - kept.length;

    if (topicVerdict.rejected.length > 0) {
        console.log(`🎯 ${topicVerdict.rejected.length} handle(s) podado(s) por tema (${droppedByTopic} post(s) descartado(s)):`);
        for (const r of topicVerdict.rejected) {
            console.log(`   @${r.handle.padEnd(24)} ${r.reason}`);
            for (const s of r.samples) console.log(`      ↳ ${JSON.stringify(s)}`);
        }
        console.log('');
    }

    const { approved, rejected, unranked } = applyCutoff(kept, niche);
    const ranked = diversify(approved, niche.ranking);

    console.log(`📦 Capturado: ${totalCaptured}  ·  🌐 Idioma: -${droppedByLang}  ·  🎯 Tema: -${droppedByTopic}  ·  📊 Aprovados: ${ranked.length}  ·  Reprovados: ${rejected.length}  ·  Sem métricas: ${unranked.length}`);
    if (failures.length > 0) console.log(`⚠️  ${failures.length} alvo(s) sem captura — ranking INCOMPLETO.`);

    const ctx = {
        niche, date, source, lookbackHours, totalCaptured,
        approved: ranked, rejected, unranked, failures,
        discoveredHandles: [...discoveredHandles],
        sessionId: session.id,
    };

    const mdPath = path.join(session.dir, `ranking-${niche.id}-${date}.md`);
    const jsonPath = path.join(session.dir, `ranking-${niche.id}-${date}.json`);
    const suggestions = suggestHashtags(ranked, niche);

    fs.writeFileSync(mdPath, buildRankingMarkdown(ctx));
    fs.writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                session_id: session.id,
                niche: niche.id,
                date,
                source,
                lookback_hours: lookbackHours,
                cutoff: niche.cutoff,
                totals: {
                    captured: totalCaptured,
                    approved: ranked.length,
                    rejected: rejected.length,
                    unranked: unranked.length,
                    capture_failures: failures.length,
                },
                discovered_handles: [...discoveredHandles],
                suggested_hashtags: suggestions,
                items: ranked,
                capture_failures: failures,
            },
            null,
            2
        )
    );

    const sessionFile = path.join(session.dir, 'session.json');
    const manifest = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf8')) : { phases: {} };
    Object.assign(manifest, { session_id: session.id, date, niche: niche.id });
    manifest.phases = manifest.phases || {};
    manifest.phases.f1_discovery = {
        completed_at: new Date().toISOString(),
        source,
        ranking_md: path.relative(L.REPO_ROOT, mdPath).replace(/\\/g, '/'),
        ranking_json: path.relative(L.REPO_ROOT, jsonPath).replace(/\\/g, '/'),
        approved: ranked.length,
        capture_failures: failures.length,
    };
    fs.writeFileSync(sessionFile, JSON.stringify(manifest, null, 2));

    if (suggestions.length > 0) {
        console.log(`\n💡 Hashtags novas nas legendas dos aprovados:`);
        console.log(`   ${suggestions.slice(0, 8).map((s) => `#${s.tag}(${s.occurrences})`).join('  ')}`);
    }
    if (newHandles.length > 0) {
        console.log(`\n🌱 Handles novos vindos de hashtag (promova os bons para anchor_profiles):`);
        console.log(`   ${newHandles.map((h) => '@' + h).join('  ')}`);
    }

    console.log(`\n✅ Ranking: ${path.relative(L.REPO_ROOT, mdPath).replace(/\\/g, '/')}`);
    console.log(`✅ Dados:   ${path.relative(L.REPO_ROOT, jsonPath).replace(/\\/g, '/')}`);
    console.log(`\n➡️  Próximo: node squads/virals-farming-squad/scripts/farm-benchmark.js --niche=${niche.id} --session=${session.id} --top=8\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    finish(1);
});
