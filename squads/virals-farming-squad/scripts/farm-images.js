#!/usr/bin/env node
/**
 * farm-images.js — F4 Geração de Imagens 9:16 · Virals Farming Squad
 *
 * Consome `modeling.json` (saída da F3) e produz, para cada take de cada pack, uma
 * imagem 9:16 pronta para animação — via cascata de providers free-first (modo auto)
 * ou entregando os prompts prontos para colar (modo híbrido).
 *
 * REUSO (IDS): _quota-ledger.js é a fonte de verdade da cascata (config + cota real);
 * _pack.js é o contrato de slots que dá paridade entre auto e híbrido. Nenhum dos dois
 * é reimplementado aqui.
 *
 * PRINCÍPIO: nada é reportado como sucesso sem o arquivo em disco E com a proporção 9:16
 * validada por leitura real das dimensões (ffprobe) — nunca pelo campo de retorno do
 * adapter. Falha de um take nunca derruba o lote; tudo vai para _degraded.md.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-images.js --niche=religioso --top=3
 *   node ... --session=2026-07-26-pet-90b1cb --ranks=1,3 --mode=hybrid
 *   node ... --niche=pet --mode=auto --tier=B
 *   node ... --niche=pet --verify
 *   node ... --quota
 *
 * Flags:
 *   --niche=ID        nicho (obrigatório, salvo com --session)
 *   --session=ID      sessão da F1; default: a mais recente do nicho na data
 *   --ranks=1,3       escolhe ranks específicos
 *   --top=N           quantos packs processar (default: todos os packs com modeling.json)
 *   --mode=auto|hybrid  default: auto
 *   --tier=A|B|C      força o tier inicial da cascata (senão: niche_overrides > tier A)
 *   --dry-run         mostra o plano (cascata resolvida, takes) sem chamar API nem escrever
 *   --verify          confere existência + proporção 9:16 dos slots já preenchidos
 *   --skip-providers=a,b  pula providers na cascata (testar fallback / contornar instabilidade)
 *   --quota           mostra o ledger de cota do dia e sai
 *   --date=YYYY-MM-DD data da sessão (default: hoje)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const Q = require('./_quota-ledger.js');

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

// ---------------------------------------------------------------------------
// Validação de imagem em disco — nunca confiar no retorno do adapter sozinho.
// ---------------------------------------------------------------------------

function ffprobePath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

/** Lê as dimensões reais do arquivo de imagem via ffprobe (funciona para png/jpg/webp). */
function probeImage(filePath) {
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 20000 }
    );
    const out = (r.stdout || '').trim();
    const [w, h] = out.split(',').map((n) => parseInt(n, 10));
    return { width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null, stderr: r.stderr || null };
}

/**
 * A regra inviolável é a PROPORÇÃO 9:16, não o pixel exato 1080×1920. Providers grátis
 * arredondam para o "bucket" de tamanho deles (ex.: Pollinations limita o lado maior a
 * ~1024px preservando a razão) — travar em pixel exato reprovaria o próprio degrau que
 * tem a obrigação de nunca falhar. Tolerância de 2% cobre esse arredondamento sem abrir
 * mão da regra "fora de proporção é falha".
 */
function isVertical916(probe, tolerance = 0.02) {
    if (!probe.width || !probe.height) return false;
    if (probe.width < 400 || probe.height < 700) return false; // descarta thumbnails degeneradas
    const ratio = probe.width / probe.height;
    const target = 9 / 16;
    return Math.abs(ratio - target) / target <= tolerance;
}

/**
 * Cadeia de providers com exclusões pedidas na linha de comando.
 *
 * Existe por dois motivos práticos, ambos vistos rodando o pipeline de verdade:
 *  1. TESTAR os degraus de baixo. Enquanto o tier B responde, a cascata nunca desce —
 *     e o fallback fica sem nunca ter sido exercitado no roteamento real, só no
 *     adapter isolado. "Nunca falhou" não é o mesmo que "funciona quando chamado".
 *  2. CONTORNAR provider instável numa rodada específica, sem editar o YAML (que é
 *     decisão editorial permanente, com motivo declarado) só para uma execução.
 */
function chainFor(startTier, skipList) {
    const chain = Q.resolveProviderChain('image', startTier);
    if (!skipList || skipList.length === 0) return chain;
    return chain.filter((p) => !skipList.includes(p.id));
}

function parseSkipList(args) {
    const raw = args['skip-providers'];
    if (!raw || raw === true) return [];
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Geração — um take por vez, percorrendo a cascata de providers.
// ---------------------------------------------------------------------------

async function safeGenerate(adapter, req) {
    try {
        return await adapter.generate(req);
    } catch (e) {
        return { ok: false, reason: `exceção no adapter: ${e.message}` };
    }
}

/**
 * Tenta gerar UM take percorrendo a cascata inteira. Cota estourada não interrompe o
 * lote — desce para o próximo provider. Erro transitório leva 1 retry (regra do
 * roteador, não do adapter) antes de descer.
 */
/**
 * Marcador que a F3 grava na cena quando a visão falhou naquele frame.
 * Ele NUNCA pode chegar a um gerador de imagem: o modelo não sabe que é placeholder e
 * trata como descrição. Medido no lote de 234 packs — um prompt "[VISÃO INDISPONÍVEL],
 * [VISÃO INDISPONÍVEL], [VISÃO INDISPONÍVEL]" produziu uma TABELA OPTOMÉTRICA com óculos
 * (o gerador leu "visão" como eyesight). Foram 159 takes nessa situação e 111 imagens
 * geradas antes da guarda existir — cota queimada para produzir lixo garantido.
 */
const VISION_PLACEHOLDER = /VISÃO INDISPONÍVEL/i;

async function generateTake(take, ctx) {
    const { pack, imagesDir, chain } = ctx;
    const file = `take-${take.n}.png`;
    const outputPath = path.join(imagesDir, file);

    // Gate de entrada: sem cena real não há o que gerar. Falhar aqui é barato;
    // falhar depois custa uma imagem inútil e uma unidade de cota.
    if (VISION_PLACEHOLDER.test(take.image_prompt || '')) {
        return {
            ok: false, take: take.n, file, blocked: true,
            attempts: [{ provider: '(nenhum)', reason: 'prompt sem cena — a visão falhou neste frame na F3' }],
            reason: 'prompt contém o marcador de visão indisponível; rode a F3 novamente neste pack antes de gerar',
        };
    }
    // A F3 já julgou este take como não-modelável (cena vazia: fade, cartela preta).
    // Gerar aqui produziria um retângulo preto — refugo garantido, cota gasta.
    if (take.blocked_reason) {
        return {
            ok: false, take: take.n, file, blocked: true,
            attempts: [{ provider: '(nenhum)', reason: take.blocked_reason }],
            reason: take.blocked_reason,
        };
    }
    const referenceImage = take.source_frame ? path.join(pack.dir, 'screenshots', take.source_frame) : null;
    const hasReference = !!(referenceImage && fs.existsSync(referenceImage));

    const attempts = [];

    for (const provider of chain) {
        if (!provider._available) {
            attempts.push({ provider: provider.id, skipped: true, reason: provider._reason });
            continue;
        }

        let adapter;
        try {
            adapter = require(path.join(__dirname, provider.adapter));
        } catch (e) {
            attempts.push({ provider: provider.id, skipped: true, reason: `adapter não carregou: ${e.message}` });
            continue;
        }

        let checkResult;
        try {
            checkResult = await adapter.check();
        } catch (e) {
            checkResult = { available: false, reason: e.message };
        }
        if (!checkResult.available) {
            attempts.push({ provider: provider.id, skipped: true, reason: checkResult.reason || 'indisponível' });
            continue;
        }

        const req = {
            prompt: take.image_prompt,
            negative: take.negative_prompt,
            outputPath,
            referenceImage: provider.supports_reference_image && hasReference ? referenceImage : undefined,
            seed: pack.modeling.seed,
            width: 1080,
            height: 1920,
            // Campo extra ao contrato documentado: permite ao adapter da Gemini diferenciar
            // a variante 'gemini-image' (generateContent) de 'gemini-imagen' (predict) sem
            // duplicar arquivo — ver comentário no topo de adapters/image/gemini.js.
            providerId: provider.id,
            // Idem para adapters/image/cloudflare.js — cloudflare-flux e cloudflare-sdxl
            // compartilham o arquivo e o YAML já declara qual modelo e qual formato de
            // resposta cada entrada espera. O router só repassa; quem decide é o adapter.
            model: provider.model,
            response: provider.response,
            // Query de busca para providers de ACERVO (kind: stock). A F3 a deriva dos
            // campos de cena da visão — sujeito + fundo + luz —, que descrevem o que a
            // foto precisa MOSTRAR. O prompt completo, cheio de qualificadores de
            // renderização, devolveria zero resultado num banco de imagens.
            stockQuery: take.stock_query || undefined,
        };

        let result = await safeGenerate(adapter, req);
        if (!result.ok && !result.quotaExceeded) {
            // Erro transitório: 1 retry antes de descer de degrau (regra do roteador).
            result = await safeGenerate(adapter, req);
        }

        if (result.quotaExceeded) {
            Q.recordExhausted(provider.id, result.reason || '429/quota_exceeded');
            attempts.push({ provider: provider.id, quotaExceeded: true });
            continue;
        }
        if (!result.ok) {
            Q.recordError(provider.id, result.reason);
            attempts.push({ provider: provider.id, reason: result.reason });
            continue;
        }

        // "Sucesso" do adapter só vira sucesso de verdade com o arquivo em disco E em 9:16.
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 512) {
            Q.recordError(provider.id, 'generate() retornou ok:true mas o arquivo está ausente/vazio');
            attempts.push({ provider: provider.id, reason: 'arquivo ausente/vazio após ok:true' });
            continue;
        }

        const probe = probeImage(outputPath);
        if (!isVertical916(probe)) {
            const dims = `${probe.width || '?'}x${probe.height || '?'}`;
            Q.recordError(provider.id, `dimensão fora de 9:16 (${dims})`);
            attempts.push({ provider: provider.id, reason: `fora de 9:16 (${dims})` });
            try {
                fs.unlinkSync(outputPath);
            } catch (_) {
                /* melhor esforço — não é fatal deixar o arquivo inválido para trás */
            }
            continue;
        }

        Q.recordSuccess(provider.id);
        P.markSlotFilled(imagesDir, file, provider.id, provider.tier);

        // Take vindo de ACERVO carrega procedência: autor, URL e a query que o achou.
        // Sem isso o pack não distingue imagem gerada de foto de banco — e a diferença
        // importa tanto para licenciamento quanto para julgar o resultado: uma foto de
        // acervo que não bateu com a cena é problema de BUSCA, não de prompt.
        if (result.attribution) {
            const attrFile = path.join(imagesDir, '_attribution.json');
            let attrs = {};
            if (fs.existsSync(attrFile)) {
                try { attrs = JSON.parse(fs.readFileSync(attrFile, 'utf8')); } catch (_) { attrs = {}; }
            }
            attrs[file] = { ...result.attribution, provider: provider.id, tier: provider.tier };
            fs.writeFileSync(attrFile, JSON.stringify(attrs, null, 2));
        }

        attempts.push({ provider: provider.id, ok: true, dims: `${probe.width}x${probe.height}` });
        return {
            ok: true, take: take.n, file, provider: provider.id, tier: provider.tier,
            kind: provider.kind || 'image', attribution: result.attribution || null, attempts,
        };
    }

    return { ok: false, take: take.n, file, attempts };
}

// ---------------------------------------------------------------------------
// Modo híbrido — mesma árvore de arquivos, sem chamar nenhuma API.
// ---------------------------------------------------------------------------

function writeHybridPrompts(imagesDir, pack, niche, modeling) {
    const cfg = Q.loadProvidersConfig();
    const targets = (cfg.image && cfg.image.hybrid_targets) || [];

    let md = `# Prompts para Colar · @${pack.handle} · rank ${pack.rank}\n\n`;
    md += `**Nicho:** ${niche.icon} ${niche.label} · **Formato:** 9:16 (1080×1920)\n`;
    md += `**Seed travada:** \`${modeling.seed}\` — use a MESMA em todas as ferramentas e takes; sem isso o criativo montado parece uma colagem de mundos diferentes.\n\n---\n\n`;

    for (const take of modeling.takes) {
        md += `## Take ${take.n} — ${take.role || 'sem função declarada'}\n\n`;
        const refPath = take.source_frame ? `screenshots/${take.source_frame}` : null;

        for (const target of targets) {
            md += `### ${target.label} (${target.url})\n\n`;
            if (target.paste_format === 'plain_with_reference' && refPath) {
                md += `Anexe a imagem de referência antes de colar o prompt: \`${refPath}\`\n\n`;
            } else if (target.paste_format === 'plain_with_reference' && !refPath) {
                md += `_(sem screenshot de referência para este take — cole só o texto)_\n\n`;
            }
            md += '```text\n' + (take.image_prompt || '(prompt ausente no modeling.json)') + '\n```\n\n';
            md += `**Negativos:**\n\`\`\`text\n${take.negative_prompt || '(nenhum negativo declarado)'}\n\`\`\`\n\n`;
        }

        md += `Salve o resultado como \`images/take-${take.n}.png\` (1080×1920, 9:16).\n\n---\n\n`;
    }

    fs.writeFileSync(path.join(imagesDir, '_prompts-para-colar.md'), md);
}

// ---------------------------------------------------------------------------
// --verify — confere slots já preenchidos contra o disco.
// ---------------------------------------------------------------------------

function runVerify(packs) {
    let allOk = true;

    for (const pack of packs) {
        const imagesDir = P.packPaths(pack.dir).images;
        console.log(`\n[${pack.rank}] @${pack.handle}`);

        const v = P.verifySlots(imagesDir);
        if (!v.slots) {
            console.log(`    ⚠️  ${v.reason}`);
            allOk = false;
            continue;
        }

        for (const slot of v.present) {
            const probe = probeImage(slot.path);
            const ok = isVertical916(probe);
            console.log(`    ${ok ? '✓' : '❌'} ${slot.file} — ${probe.width || '?'}x${probe.height || '?'}${ok ? '' : ' (FORA DE 9:16)'}`);
            if (!ok) allOk = false;
        }
        for (const slot of v.missing) {
            console.log(`    ❌ ${slot.file} — ausente`);
            allOk = false;
        }
    }

    console.log(`\n${allOk ? '✅ todos os slots presentes e em 9:16' : '⚠️  há pendências — ver acima'}`);
    return allOk;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
    const args = L.parseArgs(process.argv);

    if (args.quota) {
        console.log(Q.formatSummary());
        return;
    }

    if (!args.niche && !args.session) {
        console.error('❌ Informe --niche=ID (ou --session=ID).');
        process.exit(1);
    }

    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    const niche = L.loadNiche(args.niche || session.manifest.niche);

    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    } else if (args.top) {
        packs = packs.slice(0, parseInt(args.top, 10) || packs.length);
    }

    if (packs.length === 0) {
        console.error(`❌ Nenhum pack encontrado em ${path.relative(L.REPO_ROOT, path.join(session.dir, 'benchmark'))}. Rode a F2 primeiro.`);
        process.exit(1);
    }

    const mode = args.mode === 'hybrid' ? 'hybrid' : 'auto';
    const skipProviders = parseSkipList(args);

    console.log(`\n=== F4 Geração de Imagens 9:16 · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:  ${session.id}`);
    if (skipProviders.length) console.log(`Pulando: ${skipProviders.join(', ')}`);
    console.log(`Packs:   ${packs.length}`);
    console.log(`Modo:    ${mode}${args['dry-run'] ? ' (dry-run)' : ''}`);

    if (args.verify) {
        const ok = runVerify(packs);
        process.exitCode = ok ? 0 : 1;
        return;
    }

    const startTier = args.tier ? String(args.tier).toUpperCase() : Q.preferredTierForNiche('image', niche.id);
    const results = [];

    for (const pack of packs) {
        const paths = P.packPaths(pack.dir);
        console.log(`\n[${pack.rank}] @${pack.handle}`);

        if (!fs.existsSync(paths.modelingJson)) {
            console.log(`    ⏭️  modeling.json ausente — a F3 não rodou para este pack. Pulando.`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'skipped', reason: 'modeling.json ausente (F3 não rodou)' });
            continue;
        }

        let modeling;
        try {
            modeling = JSON.parse(fs.readFileSync(paths.modelingJson, 'utf8'));
        } catch (e) {
            console.log(`    ❌ modeling.json inválido: ${e.message}`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'error', reason: `modeling.json inválido: ${e.message}` });
            continue;
        }

        if (!Array.isArray(modeling.takes) || modeling.takes.length === 0) {
            console.log(`    ❌ modeling.json sem takes.`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'error', reason: 'modeling.json sem takes' });
            continue;
        }

        const imagesDir = paths.images;
        const expected = modeling.takes.map((t) => ({ take: t.n, file: `take-${t.n}.png`, status: 'pending' }));

        if (args['dry-run']) {
            const chain = chainFor(startTier, skipProviders);
            console.log(`    tier inicial: ${startTier || 'A (default)'}`);
            console.log(
                `    cascata: ${chain.map((p) => `${p.id}${p._available ? '' : ` (indisponível: ${p._reason})`}`).join(' → ') || '(vazia)'}`
            );
            console.log(`    takes: ${modeling.takes.map((t) => `#${t.n} (${t.role || '?'})`).join(', ')}`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'dry-run', expected });
            continue;
        }

        fs.mkdirSync(imagesDir, { recursive: true });

        if (mode === 'hybrid') {
            writeHybridPrompts(imagesDir, pack, niche, modeling);
            P.writeSlots(imagesDir, 'hybrid', expected);
            console.log(`    📝 prompts em images/_prompts-para-colar.md`);
            console.log(`    ⏸️  HALT — deposite os arquivos em images/take-N.png e rode --verify.`);
            results.push({ rank: pack.rank, handle: pack.handle, status: 'hybrid-pending', expected });
            continue;
        }

        // --- modo auto ---
        P.writeSlots(imagesDir, 'auto', expected);
        const chain = chainFor(startTier, skipProviders);
        if (chain.length === 0) {
            console.log(`    ⚠️  nenhum provider na cascata (sem credenciais?). O tier C (Pollinations) não exige chave — verifique config/ai-providers.yaml.`);
        }

        const takeResults = [];
        for (const take of modeling.takes) {
            // eslint-disable-next-line no-await-in-loop -- geração é sequencial de propósito: mesma seed, mesmo mundo, sem corrida por cota
            const r = await generateTake(take, { pack: { ...pack, modeling }, imagesDir, chain });
            takeResults.push(r);
            if (r.ok) {
                console.log(`    ✓ take ${r.take} via ${r.provider} (tier ${r.tier}) — ${r.file}`);
            } else if (r.blocked) {
                // Distinto de "falhou": não foi tentado, e tentar seria errado.
                console.log(`    ⛔ take ${r.take} — ${r.reason}`);
            } else {
                const trail = r.attempts.map((a) => `${a.provider}:${a.quotaExceeded ? 'cota' : a.skipped ? 'pulado' : 'erro'}`).join(', ');
                console.log(`    ❌ take ${r.take} — todas as tentativas falharam (${trail || 'cascata vazia'})`);
            }
        }

        const failedTakes = takeResults.filter((r) => !r.ok);
        if (failedTakes.length > 0) {
            P.appendDegraded(session, {
                phase: 'F4',
                label: `@${pack.handle} (rank ${pack.rank})`,
                status: 'partial',
                issues: failedTakes.map((r) => `take ${r.take} (${r.file}): todas as tentativas falharam — ${JSON.stringify(r.attempts)}`),
            });
        }

        results.push({
            rank: pack.rank,
            handle: pack.handle,
            status: failedTakes.length === 0 ? 'complete' : 'partial',
            takes: takeResults.map((r) => ({ take: r.take, ok: r.ok, provider: r.provider || null })),
        });
    }

    if (!args['dry-run']) {
        P.saveManifest(session, 'f4_images', {
            mode,
            processed: results.length,
            complete: results.filter((r) => r.status === 'complete').length,
            partial: results.filter((r) => r.status === 'partial').length,
            skipped: results.filter((r) => r.status === 'skipped' || r.status === 'error').length,
            hybrid_pending: results.filter((r) => r.status === 'hybrid-pending').length,
            packs: results,
        });
    }

    console.log(`\n${'='.repeat(58)}`);
    if (mode === 'auto' && !args['dry-run']) console.log(Q.formatSummary());
    console.log(`\n➡️  Próximo: @farming-animator *animate all (F5)\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
