#!/usr/bin/env node
/**
 * farm-run.js — Orquestrador do pipeline completo (F1 → F6).
 *
 * Encadeia as seis fases numa única sessão, propagando o `session_id` e parando nos
 * checkpoints bloqueantes. Cada fase é um processo separado: uma fase que quebra não
 * derruba o orquestrador, e o relatório final diz exatamente onde parou e por quê.
 *
 * PRINCÍPIO: o orquestrador nunca "conclui" um pipeline que não produziu arquivos.
 * O sumário final é montado lendo o DISCO, não os logs das fases.
 *
 * DUAS PORTAS DE ENTRADA, escolhidas por `--entry`:
 *
 *   · monitor  (default) — DESCOBERTA. Varre hashtags e âncoras do nicho atrás de
 *     postagens RECENTES, aplica a nota de corte e entrega um ranking já podado.
 *     É a rota de quem não sabe ainda quais perfis modelar.
 *
 *   · profiles — CURADORIA. Recebe um lote de perfis do operador e ranqueia TODAS
 *     as postagens capturadas de cada um, sem reprovar nada. O corte vem depois,
 *     por `--min-score`, e a escolha final continua podendo ser manual. É a rota de
 *     quem já sabe quais perfis quer modelar.
 *
 * Ambas convergem no MESMO contrato — `ranking-{niche}-{date}.json` — e daí para
 * frente o pipeline é idêntico. Nenhuma fase posterior sabe qual porta foi usada.
 *
 * Uso:
 *   # curadoria: lote de perfis → ranking por perfil → corte 1000 → pipeline
 *   node squads/virals-farming-squad/scripts/farm-run.js --niche=religioso \
 *     --entry=profiles --profiles=@a,@b --min-score=1000
 *
 *   # descoberta: postagens recentes do nicho
 *   node ... --niche=religioso --entry=monitor --source=both
 *
 *   node ... --niche=pet --from=f3 --session=2026-07-26-pet-abc123
 *   node ... --niche=pet --only=f1,f2 --top=5
 *
 * Flags:
 *   --niche=ID          nicho (obrigatório)
 *   --entry=X           monitor | profiles              (default: monitor)
 *   --profiles=a,b      perfis a auditar (entry=profiles; aceita URL ou @handle)
 *   --from-file=arq     lê os perfis de um arquivo
 *   --items=N           postagens capturadas por perfil (entry=profiles, default: 40)
 *   --min-score=N       corte de viral score para o benchmark (default: 1000)
 *   --session=ID        continua numa sessão existente
 *   --from=fN           começa nesta fase
 *   --to=fN             para nesta fase
 *   --only=f1,f3        roda apenas estas fases
 *   --mode=auto|hybrid  modo de geração para F4/F5 (default: hybrid)
 *   --takes=X           gerar | acervo — sem isto, o pipeline PARA e pergunta
 *   --descartar         gate de take move os reprovados para takes/_reprovados/
 *   --strict            gates reprovam também em CONCERNS
 *   --fill=loop         repete os takes em ordem até cobrir o áudio (padrão em --takes=acervo)
 *   --top=N             teto de criativos no benchmark (default: 5)
 *   --source=X          fonte da F1 no modo monitor: hashtags|profiles|both
 *   --handles=a,b       handles avulsos para a F1 no modo monitor
 *   --tier=A|B|C        força o tier de geração
 *   --strict-quality    o gate de imagem reprova também em CONCERNS
 *   --dry-run           mostra o plano de execução e sai
 *   --continue-on-fail  segue mesmo quando uma fase bloqueante falha
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');

const SCRIPTS = __dirname;

/**
 * Definição das fases. `blocking: true` significa que uma falha aqui impede as
 * seguintes — não faz sentido modelar sem benchmark, nem montar sem takes.
 */
const PHASES = [
    {
        id: 'f1',
        key: 'f1_discovery',
        name: 'Garimpo (postagens recentes)',
        agent: '@farming-scout',
        script: 'farm-monitor.js',
        blocking: true,
        // Porta de DESCOBERTA. Pulada quando o operador já trouxe os perfis.
        entry: 'monitor',
        args: (o) => {
            const a = [`--niche=${o.niche}`];
            if (o.source) a.push(`--source=${o.source}`);
            if (o.handles) a.push(`--handles=${o.handles}`);
            if (o.hours) a.push(`--hours=${o.hours}`);
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            return a;
        },
    },
    {
        id: 'f1p',
        key: 'f1_profiles',
        name: 'Auditoria de perfis (acervo)',
        agent: '@farming-scout',
        script: 'farm-profiles.js',
        blocking: true,
        // Porta de CURADORIA. Ranqueia todas as postagens de cada perfil, sem reprovar.
        entry: 'profiles',
        args: (o) => {
            const a = [`--niche=${o.niche}`, `--items=${o.items || 40}`];
            if (o.profiles) a.push(`--profiles=${o.profiles}`);
            if (o['from-file']) a.push(`--from=${o['from-file']}`);
            if (o.sort) a.push(`--sort=${o.sort}`);
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            return a;
        },
    },
    {
        id: 'f1s',
        key: 'f1_selection',
        name: 'Seleção por nota de corte',
        agent: '@farming-scout',
        script: 'farm-profiles.js',
        blocking: true,
        entry: 'profiles',
        // Converte a auditoria em `ranking-{niche}-{date}.json` — o mesmo contrato que
        // o garimpo produz. É aqui que as duas portas de entrada se encontram.
        args: (o) => {
            const a = [`--niche=${o.niche}`, `--min-score=${o['min-score'] || 1000}`];
            if (o['min-outlier']) a.push(`--min-outlier=${o['min-outlier']}`);
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            return a;
        },
    },
    {
        id: 'f2',
        key: 'f2_benchmark',
        name: 'Benchmark ETL',
        agent: '@farming-analyst',
        script: 'farm-benchmark.js',
        blocking: true,
        args: (o) => {
            const a = [`--niche=${o.niche}`, `--top=${o.top || 5}`];
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            if (o['no-transcribe']) a.push('--no-transcribe');
            return a;
        },
    },
    {
        id: 'f2p',
        key: 'f2_publication',
        name: 'Publicação original (legenda + hashtags)',
        agent: '@farming-analyst',
        script: 'farm-publication.js',
        // NÃO bloqueante: não depende de rede nem de cota, e um pack sem legenda não
        // impede modelar o vídeo. Mas roda logo após a F2 para que o pack já nasça
        // completo — a embalagem é metade do criativo, e ir buscá-la depois significa
        // voltar a uma sessão que já foi considerada pronta.
        blocking: false,
        args: (o) => {
            const a = [`--niche=${o.niche}`];
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            if (o['skip-existing']) a.push('--skip-existing');
            return a;
        },
    },
    {
        id: 'f3',
        key: 'f3_modeling',
        name: 'Modelagem autoral',
        agent: '@farming-modeler',
        script: 'farm-model.js',
        blocking: true,
        args: (o) => baseArgs(o),
    },
    {
        id: 'rota',
        key: 'rota_takes',
        name: 'Escolha da rota dos takes',
        agent: '@farming-chief',
        // NÃO É SCRIPT: é a pergunta que o pipeline precisa fazer antes de gastar a
        // primeira cota. Sem ela, o operador só descobre qual rota está rodando quando
        // a fatura da geração chega — ou quando o criativo sai com estética que ele não
        // escolheu. Com `--takes` já respondido, a fase só confirma e segue.
        decisao: true,
        blocking: true,
    },
    {
        id: 'f4',
        key: 'f4_images',
        name: 'Imagens 9:16',
        agent: '@farming-imager',
        script: 'farm-images.js',
        blocking: true,
        args: (o) => {
            const a = baseArgs(o);
            a.push(`--mode=${o.mode || 'hybrid'}`);
            if (o.tier) a.push(`--tier=${o.tier}`);
            return a;
        },
        // No modo híbrido a fase para esperando o usuário depositar os arquivos.
        halts_in_hybrid: true,
    },
    {
        id: 'f4q',
        key: 'f4_quality',
        name: 'Gate de qualidade de imagem',
        agent: '@farming-imager',
        script: 'farm-image-check.js',
        // BLOQUEANTE de propósito: é o ponto do pipeline em que gastar cota fica caro.
        // Animar uma imagem ruim custa uma geração de vídeo por take e só se descobre
        // no export. Reprovar aqui custa uma rodada de F4.
        blocking: true,
        args: (o) => {
            const a = [`--niche=${o.niche}`];
            if (o.session) a.push(`--session=${o.session}`);
            if (o.date) a.push(`--date=${o.date}`);
            if (o.ranks) a.push(`--ranks=${o.ranks}`);
            if (o['strict-quality']) a.push('--strict');
            if (o['no-vision']) a.push('--no-vision');
            return a;
        },
    },
    {
        id: 'f5',
        key: 'f5_takes',
        name: 'Takes de vídeo',
        agent: '@farming-animator',
        script: 'farm-takes.js',
        blocking: true,
        // FORA DO PIPELINE AUTOMÁTICO desde 2026-07-28. A geração local (procedural) não
        // entrega qualidade publicável, e não há API paga nem hardware para modelo local.
        // O fluxo é: a F3 emite os prompts em inglês (prompts-animacao.md), o operador
        // gera à mão em Hailuo/BytePlus/Kling e deposita os mp4 em `takes/`.
        // Só roda com `--video=auto` explícito — o padrão para e instrui.
        manual_by_default: true,
        args: (o) => {
            const a = baseArgs(o);
            a.push(`--mode=${o.mode || 'hybrid'}`);
            if (o.tier) a.push(`--tier=${o.tier}`);
            if (o.procedural) a.push('--procedural');
            return a;
        },
        halts_in_hybrid: true,
    },
    {
        id: 'f45',
        key: 'f45_stock',
        name: 'Takes de acervo (sem gerar imagem nem vídeo)',
        agent: '@farming-animator',
        script: 'farm-stock-takes.js',
        blocking: true,
        // Rota alternativa à F4+F5: só entra com `--takes=acervo`. Ver a seleção de
        // fases abaixo — quando ela entra, imagem, gate de imagem e I2V saem.
        rota: 'acervo',
        args: (o) => {
            const a = baseArgs(o);
            if (o['no-llm']) a.push('--no-llm');
            if (o.force) a.push('--force');
            return a;
        },
    },
    {
        id: 'f5q',
        key: 'f5_quality',
        name: 'Gate de qualidade de take',
        agent: '@farming-animator',
        script: 'farm-takes-check.js',
        // BLOQUEANTE pelo mesmo motivo do gate de imagem, um elo adiante: take preto,
        // congelado ou duplicado só aparecia no criativo montado. Vale para as duas
        // rotas — IA e acervo falham por motivos diferentes, no mesmo lugar.
        blocking: true,
        args: (o) => {
            const a = baseArgs(o);
            if (o.strict) a.push('--strict');
            if (o.descartar) a.push('--descartar');
            return a;
        },
    },
    {
        id: 'f6',
        key: 'f6_assembly',
        name: 'Montagem e export',
        agent: '@farming-producer',
        script: 'farm-assemble.js',
        blocking: true,
        args: (o) => {
            const a = baseArgs(o);
            if (o.via) a.push(`--via=${o.via}`);
            if (o.fill) a.push(`--fill=${o.fill}`);
            // NA ROTA DE ACERVO O LAÇO É O PADRÃO. Os takes vêm com a duração que a
            // modelagem planejou (5s cada, digamos) e o áudio do benchmark tem 60s: sem
            // laço, a montagem estica os poucos takes e barra na tolerância de duração —
            // medido no lote 2, um criativo saiu com 20,5s para 57,7s de áudio. Repetir
            // os takes em ordem é o que o dono já aprovou como comportamento.
            else if (String(o.takes || '').toLowerCase() === 'acervo') a.push('--fill=loop');
            return a;
        },
    },
];

function baseArgs(o) {
    const a = [`--niche=${o.niche}`];
    if (o.session) a.push(`--session=${o.session}`);
    if (o.date) a.push(`--date=${o.date}`);
    if (o.ranks) a.push(`--ranks=${o.ranks}`);
    else if (o.top) a.push(`--top=${o.top}`);
    return a;
}

function selectPhases(args) {
    const entry = String(args.entry || 'monitor').toLowerCase();

    // Fases marcadas com `entry` só existem na porta correspondente. Sem este filtro,
    // a rota de curadoria rodaria o garimpo antes (varrendo o nicho inteiro à toa) e a
    // rota de descoberta tentaria auditar perfis que ninguém informou.
    let doEntry = PHASES.filter((p) => !p.entry || p.entry === entry);

    // DUAS ROTAS PARA O TAKE, e elas se excluem:
    //
    //   geração (default) — imagem (F4) → gate (F4q) → I2V (F5)
    //   acervo            — busca o clipe pronto no banco (F45)
    //
    // A F6 não sabe por qual rota o take chegou: as duas entregam `takes/take-N.mp4`
    // e `takes/_slots.json`. Por isso a troca acontece aqui, na seleção, e nenhuma
    // fase posterior precisa saber da diferença.
    const rota = String(args.takes || '').toLowerCase();
    const rotaAcervo = rota === 'acervo';
    // Enquanto a rota não estiver decidida, as duas pernas ficam FORA do plano: mostrar
    // f4+f5 e f45 juntos daria a impressão de que o pipeline vai rodar as duas.
    doEntry = doEntry.filter((p) => {
        if (p.id === 'rota') return true;
        if (!rota) return !['f4', 'f4q', 'f5'].includes(p.id) && p.rota !== 'acervo';
        return rotaAcervo ? !['f4', 'f4q', 'f5'].includes(p.id) : p.rota !== 'acervo';
    });

    if (args.only) {
        const wanted = String(args.only).split(',').map((s) => s.trim().toLowerCase());
        // `--only` é explícito: respeita o que foi pedido, mesmo fora da porta.
        return PHASES.filter((p) => wanted.includes(p.id));
    }
    let list = doEntry;
    if (args.from) {
        const i = list.findIndex((p) => p.id === String(args.from).toLowerCase());
        if (i >= 0) list = list.slice(i);
    }
    if (args.to) {
        const i = list.findIndex((p) => p.id === String(args.to).toLowerCase());
        if (i >= 0) list = list.slice(0, i + 1);
    }
    return list;
}

/** Descobre o session_id criado pela F1, para propagar às fases seguintes. */
function discoverSession(niche, date) {
    const ref = L.findLatestSession(niche, date);
    return ref ? ref.id : null;
}

function runPhase(phase, opts) {
    const scriptPath = path.join(SCRIPTS, phase.script);
    if (!fs.existsSync(scriptPath)) {
        return { ok: false, missing: true, reason: `motor não implementado: scripts/${phase.script}` };
    }

    const args = phase.args(opts);
    console.log(`\n${'─'.repeat(64)}`);
    console.log(`▶  ${phase.id.toUpperCase()} · ${phase.name}   ${phase.agent}`);
    console.log(`   node ${phase.script} ${args.join(' ')}`);
    console.log(`${'─'.repeat(64)}`);

    const r = spawnSync(process.execPath, [scriptPath, ...args], {
        stdio: 'inherit',
        cwd: L.REPO_ROOT,
        windowsHide: true,
        timeout: 45 * 60 * 1000,
    });

    if (r.error) return { ok: false, reason: r.error.message };
    if (r.status !== 0) return { ok: false, reason: `saiu com código ${r.status}` };
    return { ok: true };
}

/**
 * Sumário lido do DISCO, não dos logs. Um pipeline que "concluiu" sem arquivos
 * não concluiu nada — e o relatório precisa dizer isso.
 */
function diskSummary(sessionDir) {
    const out = { packs: 0, comPlano: 0, comImagens: 0, comTakes: 0, exportados: 0, degradados: false };
    const benchDir = path.join(sessionDir, 'benchmark');
    if (!fs.existsSync(benchDir)) return out;

    for (const origin of fs.readdirSync(benchDir)) {
        const od = path.join(benchDir, origin);
        if (!fs.statSync(od).isDirectory()) continue;
        for (const folder of fs.readdirSync(od)) {
            const d = path.join(od, folder);
            if (!fs.statSync(d).isDirectory()) continue;
            if (!fs.existsSync(path.join(d, 'benchmark.json'))) continue;
            out.packs++;
            if (fs.existsSync(path.join(d, 'modeling.json'))) out.comPlano++;
            if (countFiles(path.join(d, 'images'), /\.(png|jpe?g)$/i) > 0) out.comImagens++;
            if (countFiles(path.join(d, 'takes'), /\.mp4$/i) > 0) out.comTakes++;
            if (countFiles(path.join(d, 'export'), /\.mp4$/i) > 0) out.exportados++;
        }
    }
    out.degradados = fs.existsSync(path.join(sessionDir, '_degraded.md'));
    return out;
}

function countFiles(dir, pattern) {
    if (!fs.existsSync(dir)) return 0;
    try {
        return fs.readdirSync(dir).filter((f) => pattern.test(f)).length;
    } catch (_) {
        return 0;
    }
}

(async () => {
    const args = L.parseArgs(process.argv);

    if (!args.niche) {
        console.error(`❌ --niche é obrigatório. Disponíveis: ${L.listNiches().join(', ')}`);
        process.exit(1);
    }
    try {
        L.loadNiche(args.niche);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const date = args.date || L.todayISO();
    const mode = args.mode || 'hybrid';
    const phases = selectPhases(args);

    const opts = { ...args, niche: args.niche, date, mode, top: args.top || 5 };

    console.log(`\n${'═'.repeat(64)}`);
    console.log(`  🌱 PIPELINE DE FARMING · ${args.niche}`);
    console.log(`${'═'.repeat(64)}`);
    console.log(`  Data:    ${date}`);
    // Na rota de acervo não existe F4/F5 para parar esperando arquivo — dizer "hybrid"
    // ali faria o operador esperar por um passo que não vai acontecer.
    const rotaAcervo = String(args.takes || '').toLowerCase() === 'acervo';
    console.log(`  Rota:    ${rotaAcervo ? 'acervo (busca clipe pronto — sem F4/F5)' : `geração · ${mode}${mode === 'hybrid' ? ' (F4/F5 param aguardando seus arquivos)' : ''}`}`);
    console.log(`  Fases:   ${phases.map((p) => p.id).join(' → ')}`);
    if (args.session) console.log(`  Sessão:  ${args.session} (continuando)`);

    if (args['dry-run']) {
        console.log(`\n🧪 DRY RUN — plano de execução:\n`);
        for (const p of phases) {
            // Fase de decisão não tem script: é uma pergunta ao dono, não um processo.
            if (p.decisao) {
                console.log(`  ⏸  ${p.id.toUpperCase()} ${p.name.padEnd(22)} ${p.agent.padEnd(20)} (pergunta — responda com --takes)`);
                continue;
            }
            const exists = fs.existsSync(path.join(SCRIPTS, p.script));
            console.log(`  ${exists ? '✓' : '✗'} ${p.id.toUpperCase()} ${p.name.padEnd(22)} ${p.agent.padEnd(20)} ${p.script}${exists ? '' : '  ← NÃO IMPLEMENTADO'}`);
        }
        console.log('');
        process.exit(0);
    }

    const results = [];
    let sessionId = args.session || null;
    let halted = null;

    for (const phase of phases) {
        if (sessionId) opts.session = sessionId;

        // Fase manual: para e instrui, em vez de gerar algo que não se publica.
        if (phase.decisao) {
            const escolha = String(args.takes || '').toLowerCase();
            if (escolha === 'gerar' || escolha === 'acervo') {
                console.log(`
🔀 Rota dos takes: ${escolha === 'acervo'
                    ? 'ACERVO — busca clipe pronto em banco público (sem F4/F5)'
                    : 'GERAÇÃO — imagem por IA (F4) e animação a partir dela (F5)'}`);
                results.push({ phase, ok: true, skipped: false });
                continue;
            }

            // A PERGUNTA. Não se lê stdin de propósito: este pipeline precisa rodar
            // igual no terminal, dentro de um agente e, um dia, atrás de um frontend
            // num VPS. Prompt interativo funciona só no primeiro caso. Aqui o pipeline
            // PARA, escreve a decisão pendente em disco e devolve os dois comandos —
            // quem responde pode ser humano, agente ou API.
            const pendencia = {
                pergunta: 'Como os takes deste lote devem ser produzidos?',
                decidir_em: 'takes',
                opcoes: [
                    {
                        valor: 'gerar',
                        nome: 'Geração por IA',
                        como: 'imagem 9:16 (F4) → gate de imagem → animação I2V (F5)',
                        custo: 'cota de imagem + cota/trabalho manual de vídeo por take',
                        quando: 'a cena é específica demais para existir em acervo, ou a estética precisa ser inventada',
                    },
                    {
                        valor: 'acervo',
                        nome: 'Banco de vídeo (Pexels)',
                        como: 'busca o clipe pronto pela cena traduzida (F45)',
                        custo: 'uma busca por take — sem cota de imagem nem de vídeo',
                        quando: 'a cena é ambiente/natureza/urbano, que o acervo cobre bem',
                    },
                ],
                comandos: {
                    gerar: `node squads/virals-farming-squad/scripts/farm-run.js --niche=${args.niche} --session=${sessionId || '{id}'} --from=f4 --takes=gerar`,
                    acervo: `node squads/virals-farming-squad/scripts/farm-run.js --niche=${args.niche} --session=${sessionId || '{id}'} --from=rota --takes=acervo`,
                },
            };
            if (sessionId) {
                const dir = path.join(L.OUTPUT_ROOT, date, sessionId);
                try {
                    fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(path.join(dir, 'decisao-rota.json'), JSON.stringify(pendencia, null, 2));
                } catch (_) { /* a pergunta no console basta */ }
            }

            console.log(`
${'─'.repeat(64)}`);
            console.log(`⏸️  ROTA DOS TAKES — decisão do dono`);
            console.log(`${'─'.repeat(64)}`);
            for (const o of pendencia.opcoes) {
                console.log(`
   ${o.valor === 'acervo' ? '🎞️ ' : '🎨'} ${o.nome}  (--takes=${o.valor})`);
                console.log(`      como:   ${o.como}`);
                console.log(`      custo:  ${o.custo}`);
                console.log(`      quando: ${o.quando}`);
            }
            console.log(`
   Retome com uma das duas:`);
            console.log(`      ${pendencia.comandos.acervo}`);
            console.log(`      ${pendencia.comandos.gerar}`);
            if (sessionId) console.log(`
   (registrado em ${sessionId}/decisao-rota.json)`);
            console.log('');
            halted = phase;
            break;
        }

        if (phase.manual_by_default && String(args.video || '').toLowerCase() !== 'auto') {
            console.log(`\n${'─'.repeat(64)}`);
            console.log(`⏸️  ${phase.id.toUpperCase()} · ${phase.name} — ETAPA MANUAL`);
            console.log(`${'─'.repeat(64)}`);
            console.log(`   O motor automático de vídeo está fora do pipeline: a geração local não`);
            console.log(`   entrega qualidade publicável e não há API paga configurada.`);
            console.log(`\n   1. Abra  {pack}/prompts-animacao.md  — prompts em inglês, por motor.`);
            console.log(`   2. Gere à mão (Hailuo/MiniMax · BytePlus · Kling · Symphony · RunningHub).`);
            console.log(`   3. Salve cada resultado em  {pack}/takes/take-N.mp4`);
            console.log(`   4. Confira:  node squads/virals-farming-squad/scripts/farm-takes.js --mode=hybrid --verify`);
            console.log(`   5. Retome:   node farm-run.js --niche=${args.niche} --session=${sessionId || '{id}'} --from=f6\n`);
            console.log(`   (Para gerar mesmo assim, procedural: --video=auto)`);
            halted = phase;
            break;
        }

        const r = runPhase(phase, opts);
        results.push({ phase, ...r });

        // A primeira fase cria a sessão — capture o id para propagar às seguintes.
        // Vale para as DUAS portas: no modo curadoria quem cria é a f1p, e sem isto
        // a seleção seguinte abriria uma sessão nova, órfã da auditoria que a alimenta.
        if ((phase.id === 'f1' || phase.id === 'f1p') && r.ok && !sessionId) {
            sessionId = discoverSession(args.niche, date);
            if (sessionId) console.log(`\n🔗 Sessão: ${sessionId}`);
        }

        if (!r.ok) {
            const label = r.missing ? '⏳ NÃO IMPLEMENTADA' : '❌ FALHOU';
            console.log(`\n${label} — ${phase.id.toUpperCase()} ${phase.name}: ${r.reason}`);
            if (phase.blocking && !args['continue-on-fail']) {
                halted = phase;
                break;
            }
        }

        // No híbrido, F4 e F5 param esperando os arquivos do usuário.
        if (phase.halts_in_hybrid && mode === 'hybrid') {
            console.log(`\n⏸  ${phase.id.toUpperCase()} em modo híbrido — gere os arquivos e retome com:`);
            console.log(`   node squads/virals-farming-squad/scripts/farm-run.js --niche=${args.niche} --session=${sessionId} --from=${nextPhaseId(phase)}`);
            halted = phase;
            break;
        }
    }

    // --- Relatório final, lido do disco ---
    console.log(`\n${'═'.repeat(64)}`);
    console.log(`  RESUMO`);
    console.log(`${'═'.repeat(64)}`);

    for (const r of results) {
        const icon = r.ok ? '✅' : r.missing ? '⏳' : '❌';
        console.log(`  ${icon} ${r.phase.id.toUpperCase()} ${r.phase.name}${r.ok ? '' : ` — ${r.reason}`}`);
    }

    if (sessionId) {
        const dir = path.join(L.OUTPUT_ROOT, date, sessionId);
        if (fs.existsSync(dir)) {
            const s = diskSummary(dir);
            console.log(`\n  Verificado em disco:`);
            console.log(`    packs de benchmark:  ${s.packs}`);
            console.log(`    com plano (F3):      ${s.comPlano}`);
            console.log(`    com imagens (F4):    ${s.comImagens}`);
            console.log(`    com takes (F5):      ${s.comTakes}`);
            console.log(`    exportados (F6):     ${s.exportados}`);
            if (s.degradados) console.log(`\n  ⚠️  Há itens degradados: ${path.relative(L.REPO_ROOT, path.join(dir, '_degraded.md')).replace(/\\/g, '/')}`);
            console.log(`\n  Sessão: ${path.relative(L.REPO_ROOT, dir).replace(/\\/g, '/')}`);
        }
    }

    if (halted && !halted.halts_in_hybrid) {
        console.log(`\n  ⛔ Pipeline parou em ${halted.id.toUpperCase()}. Resolva e retome com --from=${halted.id}.`);
        console.log('');
        process.exit(1);
    }
    console.log('');
})().catch((e) => {
    console.error(`❌ Falha crítica no orquestrador: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});

function nextPhaseId(phase) {
    const i = PHASES.findIndex((p) => p.id === phase.id);
    return i >= 0 && i < PHASES.length - 1 ? PHASES[i + 1].id : phase.id;
}
