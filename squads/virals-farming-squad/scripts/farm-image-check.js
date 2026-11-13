#!/usr/bin/env node
/**
 * farm-image-check.js — Gate de qualidade de imagem (F4 → F5) · Virals Farming Squad
 *
 * O elo que faltava no pipeline: a F4 validava que o arquivo EXISTE, tem tamanho e
 * está em 9:16 — nada disso diz se a imagem PRESTA. Um retângulo preto de 1080×1920
 * passava em todas as checagens e seguia para a geração de vídeo, onde vira um take
 * animado inútil que só se descobre no export.
 *
 * Duas perguntas, respondidas separadamente porque falham por motivos diferentes:
 *
 *   1. TÉCNICA  — a imagem tem conteúdo? (ffmpeg signalstats)
 *      Pega frame preto, estourado, chapado ou de contraste degenerado. É barata,
 *      local, determinística e roda sempre.
 *
 *   2. SEMÂNTICA — a imagem mostra o que a cena descrevia? (visão)
 *      Pega o caso mais caro: imagem tecnicamente perfeita e completamente fora do
 *      briefing — o gerador entendeu outra coisa, ou o acervo devolveu a foto errada.
 *      Custa cota, então é opcional (--no-vision pula) e nunca reprova sozinha quando
 *      a visão está indisponível: "sem dado" não é "ruim" (mesma regra da F1).
 *
 * Veredito por take: PASS | CONCERNS | FAIL. Um pack só libera a F5 se nenhum take
 * estiver em FAIL — CONCERNS passa com aviso, porque o julgamento estético final é
 * do dono, não do script.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-image-check.js --niche=religioso
 *   node ... --session=ID --ranks=1 --no-vision
 *   node ... --session=ID --strict      (CONCERNS também reprova)
 *
 * Flags:
 *   --niche=ID     nicho (obrigatório, salvo com --session)
 *   --session=ID   sessão; default: a mais recente do nicho na data
 *   --ranks=1,3    packs específicos
 *   --top=N        quantos packs checar
 *   --no-vision    só a checagem técnica (não gasta cota)
 *   --strict       CONCERNS conta como reprovação no veredito do pack
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const Vision = require('./_vision.js');

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

function ffmpegPath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
}
function ffprobePath() {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    return fs.existsSync(local) ? local : 'ffprobe';
}

function probeImage(filePath) {
    const r = spawnSync(
        ffprobePath(),
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 20000 }
    );
    const [w, h] = (r.stdout || '').trim().split(',').map((n) => parseInt(n, 10));
    return { width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null };
}

/**
 * Estatísticas de sinal do ffmpeg. YAVG é a luminância média (0-255) e YSTD o
 * desvio padrão — a medida direta de "quanta variação existe na imagem".
 * Imagem chapada tem YSTD baixíssimo, independentemente de estar clara ou escura.
 */
function signalStats(filePath) {
    const r = spawnSync(
        ffmpegPath(),
        ['-hide_banner', '-nostats', '-i', filePath, '-vf', 'signalstats,metadata=print', '-f', 'null', '-'],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 }
    );
    const out = `${r.stderr || ''}${r.stdout || ''}`;
    const num = (key) => {
        const m = out.match(new RegExp(`lavfi\\.signalstats\\.${key}=([\\d.\\-]+)`));
        return m ? Number(m[1]) : null;
    };
    return { YAVG: num('YAVG'), YSTD: num('YSTD'), YMIN: num('YMIN'), YMAX: num('YMAX') };
}

// Limiares calibrados para o que o pipeline realmente produz: imagem 9:16 de
// wallpaper/cena. Não são universais — são o piso abaixo do qual a imagem não
// serve para animar. Deliberadamente frouxos: o objetivo é pegar o degenerado,
// não arbitrar estética.
const TECH = {
    minYSTD: 12,       // abaixo disso a imagem é praticamente um chapado
    minYAVG: 12,       // quase preta
    maxYAVG: 243,      // quase branca / estourada
    minDynamicRange: 40, // YMAX - YMIN
};

/**
 * Checagem técnica.
 *
 * DOIS PESOS, e confundi-los reprova conteúdo bom (medido 2026-07-29):
 *
 *  · FALHA DURA — arquivo ilegível, fora de 9:16, resolução baixa. São defeitos do
 *    ARQUIVO: nenhuma leitura de contexto os torna aceitáveis.
 *
 *  · SUSPEITA — muito escura, estourada, chapada. São medidas de PIXEL, e pixel não
 *    sabe se a escuridão é intencional. O nicho é noturno: uma imagem de trânsito à
 *    noite vista de dentro do carro, com bokeh das luzes — exatamente o formato do
 *    benchmark — mede luminância média 9,2 e era reprovada como "quase preta", igual
 *    a um retângulo vazio de 3,5. Nenhum limiar de luminância separa os dois.
 *
 * Quem separa é a SEMÂNTICA: ela olha e diz se há cena. Por isso a suspeita vira
 * CONCERNS e deixa a visão decidir — imagem escura COM cena passa; escura SEM cena
 * cai na aderência e é reprovada lá, pelo motivo certo.
 */
function checkTechnical(filePath) {
    const probe = probeImage(filePath);
    const issues = [];

    if (!probe.width || !probe.height) {
        return { verdict: 'FAIL', probe, stats: null, issues: ['arquivo não é uma imagem legível'] };
    }

    const hard = [];
    const ratio = probe.width / probe.height;
    if (Math.abs(ratio - 9 / 16) / (9 / 16) > 0.02) {
        hard.push(`fora de 9:16 (${probe.width}x${probe.height})`);
    }
    if (probe.width < 400 || probe.height < 700) {
        hard.push(`resolução baixa demais para animar (${probe.width}x${probe.height})`);
    }

    const stats = signalStats(filePath);
    if (stats.YSTD !== null && stats.YSTD < TECH.minYSTD) {
        issues.push(`pouca variação de luminância (${stats.YSTD.toFixed(1)}) — confirmar se há cena`);
    }
    if (stats.YAVG !== null && stats.YAVG < TECH.minYAVG) {
        issues.push(`imagem muito escura (luminância média ${stats.YAVG.toFixed(1)}) — normal em cena noturna, confirmar se há cena`);
    }
    if (stats.YAVG !== null && stats.YAVG > TECH.maxYAVG) {
        issues.push(`imagem estourada (luminância média ${stats.YAVG.toFixed(1)})`);
    }

    if (hard.length) return { verdict: 'FAIL', probe, stats, issues: [...hard, ...issues] };
    return { verdict: issues.length ? 'CONCERNS' : 'PASS', probe, stats, issues };
}

const SEMANTIC_PROMPT = (descricao) => `
Você vai julgar se uma imagem corresponde a uma descrição de cena.

DESCRIÇÃO ESPERADA:
"${descricao}"

Compare a imagem com a descrição e responda APENAS com JSON estrito, sem cercas de código:
{"corresponde": true|false, "aderencia": 0-10, "o_que_bate": "...", "o_que_diverge": "...",
 "texto_sobreposto": true|false, "texto_incidental": true|false, "onde_ha_texto": "..."}

Critérios:
- "aderencia" mede o quanto o SUJEITO e o AMBIENTE da imagem batem com a descrição.
  Diferença de estilo ou de enquadramento NÃO derruba a nota; sujeito ou cenário
  errados derrubam.

- DOIS tipos de texto, que NÃO podem ser confundidos:
  · "texto_sobreposto": legenda, título, marca d'água, logotipo ou qualquer letra
    aplicada POR CIMA da imagem, como camada gráfica. Isto INVIABILIZA o uso — o
    pipeline aplica o texto depois, e imagem que já vem escrita não tem conserto.
  · "texto_incidental": letra que faz parte da CENA FOTOGRAFADA — placa de rua,
    letreiro de loja, sinalização, painel de ônibus, outdoor ao fundo. Isto é
    normal em cena urbana e NÃO inviabiliza nada; só merece registro.
  Uma placa distante no fundo é incidental, não sobreposto. Na dúvida entre os
  dois, escolha incidental: reprovar imagem boa custa mais caro que deixar passar
  uma placa.

- "onde_ha_texto": diga em uma frase onde o texto aparece, ou "" se não houver.
- Se a imagem estiver ilegível, corrompida ou vazia, use aderencia 0.
`.trim();

function parseJsonLoose(text) {
    const raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
        return JSON.parse(raw);
    } catch (_) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) return null;
        try { return JSON.parse(m[0]); } catch (_) { return null; }
    }
}

async function checkSemantic(filePath, take, transcriber) {
    // A descrição de referência é a CENA, não o prompt completo: o prompt carrega
    // qualificadores de renderização que a visão não tem como confirmar olhando.
    const cena = take.cena || {};
    const descricao = [cena.sujeito, cena.fundo, cena.luz].filter(Boolean).join(', ')
        || String(take.image_prompt || '').split('.')[0];
    if (!descricao) return { skipped: true, reason: 'take sem descrição de cena' };

    const r = await Vision.analyze({ imagePath: filePath, prompt: SEMANTIC_PROMPT(descricao), transcriber });
    if (!r.ok) return { skipped: true, reason: r.reason || 'visão indisponível' };

    const data = parseJsonLoose(r.text);
    if (!data) return { skipped: true, reason: `visão (${r.provider}) não devolveu JSON` };

    const aderencia = Number(data.aderencia);
    const issues = [];
    let verdict = 'PASS';

    if (Number.isFinite(aderencia)) {
        if (aderencia < 4) { verdict = 'FAIL'; issues.push(`aderência ${aderencia}/10 à cena descrita`); }
        else if (aderencia < 7) { verdict = 'CONCERNS'; issues.push(`aderência parcial ${aderencia}/10`); }
    }
    // Texto SOBREPOSTO é falha dura: o pipeline aplica o texto na montagem, e imagem
    // que já vem com legenda queimada não tem conserto.
    if (data.texto_sobreposto === true) {
        verdict = 'FAIL';
        issues.push(`texto sobreposto na imagem${data.onde_ha_texto ? ` (${data.onde_ha_texto})` : ''} — esta etapa exige imagem limpa`);
    } else if (data.texto_incidental === true) {
        // Placa de rua, letreiro de ônibus, outdoor ao fundo: faz parte da cena
        // fotografada. Medido neste pack — a primeira versão do gate reprovava por
        // isso e teria zerado toda imagem urbana, que é justamente o que o benchmark
        // pedia. Vira ressalva para o dono julgar, não veredito.
        verdict = worst(verdict, 'CONCERNS');
        issues.push(`texto incidental na cena${data.onde_ha_texto ? ` (${data.onde_ha_texto})` : ''} — não impede o uso, confira se atrapalha a leitura`);
    }

    return {
        skipped: false, verdict, issues, aderencia: Number.isFinite(aderencia) ? aderencia : null,
        o_que_bate: data.o_que_bate || null, o_que_diverge: data.o_que_diverge || null,
        texto_sobreposto: data.texto_sobreposto === true,
        texto_incidental: data.texto_incidental === true,
        onde_ha_texto: data.onde_ha_texto || null,
        provider: r.provider, referencia: descricao,
    };
}

const RANK = { PASS: 0, CONCERNS: 1, FAIL: 2 };
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

async function checkPack(pack, args, transcriber) {
    const paths = P.packPaths(pack.dir);
    const imagesDir = paths.images;

    if (!fs.existsSync(paths.modelingJson)) {
        return { rank: pack.rank, handle: pack.handle, verdict: 'FAIL', reason: 'sem modeling.json — rode a F3', takes: [] };
    }
    if (!fs.existsSync(imagesDir)) {
        return { rank: pack.rank, handle: pack.handle, verdict: 'FAIL', reason: 'sem pasta images/ — rode a F4', takes: [] };
    }

    const modeling = JSON.parse(fs.readFileSync(paths.modelingJson, 'utf8'));
    const attrFile = path.join(imagesDir, '_attribution.json');
    const attributions = fs.existsSync(attrFile) ? JSON.parse(fs.readFileSync(attrFile, 'utf8')) : {};

    const results = [];
    let packVerdict = 'PASS';

    for (const take of modeling.takes || []) {
        const candidates = [`take-${take.n}.png`, `take-${take.n}.jpg`, `take-${take.n}.jpeg`, `take-${take.n}.webp`];
        const file = candidates.find((f) => fs.existsSync(path.join(imagesDir, f)));

        if (!file) {
            results.push({ take: take.n, role: take.role, file: null, verdict: 'FAIL', technical: null, semantic: null, issues: ['imagem ausente'] });
            packVerdict = 'FAIL';
            continue;
        }

        const filePath = path.join(imagesDir, file);
        const technical = checkTechnical(filePath);
        let verdict = technical.verdict;
        const issues = [...technical.issues];

        let semantic = null;
        if (!args['no-vision'] && technical.verdict !== 'FAIL') {
            semantic = await checkSemantic(filePath, take, transcriber);
            if (!semantic.skipped) {
                verdict = worst(verdict, semantic.verdict);
                issues.push(...semantic.issues);
            }
        }

        results.push({
            take: take.n, role: take.role, file, verdict, technical, semantic,
            issues, attribution: attributions[file] || null,
        });

        const effective = args.strict && verdict === 'CONCERNS' ? 'FAIL' : verdict;
        packVerdict = worst(packVerdict, effective === 'FAIL' ? 'FAIL' : verdict);
    }

    return { rank: pack.rank, handle: pack.handle, dir: pack.dir, verdict: packVerdict, takes: results };
}

function buildReport(pack, result, strict) {
    let md = `# Gate de qualidade de imagem · @${result.handle} · rank ${result.rank}\n\n`;
    md += `**Veredito do pack:** ${result.verdict}${strict ? ' _(modo strict: CONCERNS reprova)_' : ''}\n`;
    md += `**Gerado em:** ${new Date().toISOString()}\n\n`;
    md += `> Dimensão e proporção já eram validadas na F4. Este gate responde as duas perguntas que\n`;
    md += `> faltavam: a imagem **tem conteúdo** (signalstats) e **mostra o que a cena descrevia** (visão).\n`;
    md += `> Um retângulo preto em 9:16 passava em tudo antes disto e só se revelava no export.\n\n---\n\n`;

    md += `| Take | Papel | Arquivo | Veredito | Aderência | Origem | Observações |\n`;
    md += `| ---: | :--- | :--- | :--- | ---: | :--- | :--- |\n`;
    for (const t of result.takes) {
        const ader = t.semantic && !t.semantic.skipped && t.semantic.aderencia !== null ? `${t.semantic.aderencia}/10` : '—';
        const origem = t.attribution ? `acervo (${t.attribution.source})` : 'geração';
        const obs = t.issues.length ? t.issues.join('; ') : 'sem ressalvas';
        md += `| ${t.take} | ${t.role || '—'} | ${t.file || '—'} | ${t.verdict} | ${ader} | ${origem} | ${obs} |\n`;
    }

    md += `\n## Detalhe por take\n\n`;
    for (const t of result.takes) {
        md += `### Take ${t.take} — ${t.verdict}\n\n`;
        if (t.technical && t.technical.stats) {
            const s = t.technical.stats;
            md += `**Técnica:** ${t.technical.probe.width}x${t.technical.probe.height} · `;
            md += `luminância média ${s.YAVG !== null ? s.YAVG.toFixed(1) : '?'} · `;
            md += `variação ${s.YSTD !== null ? s.YSTD.toFixed(1) : '?'} · `;
            md += `faixa ${s.YMIN !== null ? s.YMIN : '?'}–${s.YMAX !== null ? s.YMAX : '?'}\n\n`;
        }
        if (t.semantic && !t.semantic.skipped) {
            md += `**Semântica** (${t.semantic.provider}) — referência: _${t.semantic.referencia}_\n\n`;
            if (t.semantic.o_que_bate) md += `- Bate: ${t.semantic.o_que_bate}\n`;
            if (t.semantic.o_que_diverge) md += `- Diverge: ${t.semantic.o_que_diverge}\n`;
            md += `\n`;
        } else if (t.semantic && t.semantic.skipped) {
            md += `**Semântica:** não avaliada — ${t.semantic.reason}. `;
            md += `Ausência de avaliação não reprova: "sem dado" não é "ruim".\n\n`;
        }
        if (t.attribution) {
            md += `**Procedência:** acervo ${t.attribution.source} · busca \`${t.attribution.query}\` · `;
            md += `autor ${t.attribution.photographer || '—'} · ${t.attribution.photo_url || '—'}\n\n`;
        }
    }

    md += `\n---\n\n**Liberado para F5?** ${result.verdict === 'FAIL' ? '❌ NÃO — corrija os takes reprovados e rode a F4 de novo.' : '✅ sim' + (result.verdict === 'CONCERNS' ? ' (com ressalvas — revise antes de animar)' : '')}\n`;
    return md;
}

(async () => {
    const args = L.parseArgs(process.argv);
    if (!args.niche && !args.session) {
        console.error('❌ Informe --niche=ID (ou --session=ID).');
        process.exitCode = 1;
        return;
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
    // Só packs que chegaram na F4 — os demais não têm o que checar.
    packs = packs.filter((p) => fs.existsSync(P.packPaths(p.dir).images));

    if (packs.length === 0) {
        console.error('❌ Nenhum pack com pasta images/. Rode a F4 primeiro.');
        process.exitCode = 1;
        return;
    }

    console.log(`\n=== Gate de qualidade de imagem · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:  ${session.id}`);
    console.log(`Packs:   ${packs.length}`);
    console.log(`Visão:   ${args['no-vision'] ? 'desabilitada (só técnica)' : 'habilitada'}`);
    console.log(`Modo:    ${args.strict ? 'strict (CONCERNS reprova)' : 'normal (CONCERNS passa com aviso)'}\n`);

    let transcriber = null;
    if (!args['no-vision']) {
        try {
            const LocalTranscriber = require(path.join(L.REPO_ROOT, 'services', 'ETL', 'Transform', 'processors', 'local-transcriber.js'));
            transcriber = new LocalTranscriber();
        } catch (_) {
            console.warn('⚠️  LocalTranscriber indisponível — a visão usará só o OpenRouter.\n');
        }
    }

    const results = [];
    for (const pack of packs) {
        console.log(`[${pack.rank}] @${pack.handle}`);
        const r = await checkPack(pack, args, transcriber);
        results.push(r);

        if (r.reason) {
            console.log(`    ❌ ${r.reason}`);
            continue;
        }
        for (const t of r.takes) {
            const icon = t.verdict === 'PASS' ? '✓' : t.verdict === 'CONCERNS' ? '⚠' : '❌';
            const ader = t.semantic && !t.semantic.skipped && t.semantic.aderencia !== null ? ` · aderência ${t.semantic.aderencia}/10` : '';
            console.log(`    ${icon} take ${t.take} (${t.role || '—'})${ader}${t.issues.length ? ' — ' + t.issues.join('; ') : ''}`);
        }
        const reportPath = path.join(P.packPaths(pack.dir).images, '_quality.md');
        fs.writeFileSync(reportPath, buildReport(pack, r, !!args.strict));
        fs.writeFileSync(path.join(P.packPaths(pack.dir).images, '_quality.json'), JSON.stringify(r, null, 2));
        console.log(`    → ${r.verdict}  ·  ${path.relative(L.REPO_ROOT, reportPath).replace(/\\/g, '/')}`);
    }

    const pass = results.filter((r) => r.verdict === 'PASS');
    const concerns = results.filter((r) => r.verdict === 'CONCERNS');
    const fail = results.filter((r) => r.verdict === 'FAIL');

    console.log(`\n${'='.repeat(58)}`);
    console.log(`✅ PASS: ${pass.length}  ·  ⚠️ CONCERNS: ${concerns.length}  ·  ❌ FAIL: ${fail.length}`);
    if (fail.length) {
        console.log(`\nPacks reprovados (não devem seguir para a F5):`);
        for (const r of fail) console.log(`   [${r.rank}] @${r.handle}${r.reason ? ' — ' + r.reason : ''}`);
    }
    console.log(`\n➡️  Liberados para F5: ${pass.length + (args.strict ? 0 : concerns.length)} pack(s)\n`);

    process.exitCode = fail.length > 0 ? 1 : 0;
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exitCode = 1;
});
