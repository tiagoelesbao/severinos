#!/usr/bin/env node
/**
 * farm-takes-check.js — Gate de qualidade de TAKE (F5/F45 → F6) · Virals Farming Squad
 *
 * O gate irmão do `farm-image-check.js`, no elo seguinte. A imagem tinha juiz; o take,
 * não — e take é onde mora o defeito caro, porque é o último artefato antes do export.
 * Até aqui a F6 só verificava que o arquivo EXISTIA e tinha duração: um mp4 preto, um
 * clipe congelado ou o mesmo vídeo repetido em dois takes passavam inteiros e só
 * apareciam no criativo montado.
 *
 * VALE PARA AS DUAS ROTAS. Take gerado por IA e take de acervo falham por motivos
 * diferentes, mas falham no mesmo lugar:
 *
 *   IA      → imagem animada que não animou (congelado), frame preto entre cortes,
 *             render que saiu em 720p, take que veio mais curto que o planejado.
 *   acervo  → clipe fora de formato, trecho parado do vídeo, o MESMO clipe caindo em
 *             dois takes por causa de duas buscas parecidas.
 *
 * SEIS PERGUNTAS, todas locais e determinísticas (nenhuma consome cota):
 *
 *   1. É vídeo?            arquivo com stream de vídeo — não áudio renomeado
 *   2. Dá para enquadrar?  vertical e com altura suficiente para ampliar até 1920
 *   3. Cobre o take?       duração perto da planejada (a montagem estende o que falta)
 *   4. Tem imagem?         não é preto nem chapado (signalstats: YAVG e YSTD)
 *   5. Tem movimento?      início e fim diferem (blend=difference entre dois instantes)
 *   6. É único no pack?    assinatura visual não bate com a de outro take
 *
 * Veredito por take: PASS | CONCERNS | FAIL — mesma convenção do gate de imagem. Um pack
 * libera a F6 quando nenhum take está em FAIL; CONCERNS passa com aviso, porque o
 * julgamento estético final é do dono, não do script.
 *
 * O QUE ESTE GATE NÃO FAZ: exigir 1080×1920 na entrada. A F6 normaliza todo take, e os
 * motores I2V entregam 496×864 — foi com esses arquivos que o lote aprovado foi montado.
 * Um gate que reprova material aprovado está errado sobre o motor, não sobre o material.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-takes-check.js --niche=religioso
 *   node ... --session=ID --origin="lote 2 - 02.08" --ranks=1
 *   node ... --descartar      move os reprovados para takes/_reprovados/ e atualiza os slots
 *   node ... --strict         CONCERNS também reprova o pack
 *
 * Flags:
 *   --niche=ID     nicho (obrigatório, salvo com --session)
 *   --session=ID   sessão; default: a mais recente do nicho na data
 *   --date=...     data da sessão
 *   --origin=X     recorta pela pasta sob benchmark/ (aceita caminho aninhado)
 *   --ranks=1,3    packs específicos
 *   --top=N        quantos packs checar
 *   --descartar    move take reprovado para takes/_reprovados/ (não apaga nada)
 *   --strict       CONCERNS conta como reprovação
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');

const W = 1080;
const H = 1920;

function bin(nome) {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', `${nome}.exe`);
    return fs.existsSync(local) ? local : nome;
}

function probe(file) {
    const r = spawnSync(bin('ffprobe'), ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,codec_type,avg_frame_rate',
        '-show_entries', 'format=duration', '-of', 'default=nw=1', file],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    const out = r.stdout || '';
    const num = (k) => { const m = out.match(new RegExp(`${k}=([\\d.]+)`)); return m ? Number(m[1]) : null; };
    const fps = (() => {
        const m = out.match(/avg_frame_rate=(\d+)\/(\d+)/);
        return m && Number(m[2]) ? Number(m[1]) / Number(m[2]) : null;
    })();
    return {
        width: num('width'), height: num('height'), duration: num('duration'),
        fps, temVideo: /codec_type=video/.test(out),
    };
}

/**
 * Luminância média e desvio num instante.
 *
 * O desvio é o que separa "escuro" de "vazio": uma cena noturna legítima tem YAVG baixo
 * e YSTD alto (há forma dentro do escuro); um retângulo preto ou um degradê chapado tem
 * os dois baixos. Confundir os dois foi um erro real do gate de imagem — cena noturna de
 * criativo aprovado mede YAVG 6,9.
 */
function estatisticas(file, tempo) {
    const r = spawnSync(bin('ffmpeg'), ['-hide_banner', '-nostats', '-ss', String(tempo), '-i', file,
        '-frames:v', '1', '-vf', 'signalstats,metadata=print', '-f', 'null', '-'],
        { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    const txt = `${r.stderr || ''}${r.stdout || ''}`;
    const avg = txt.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    const std = txt.match(/lavfi\.signalstats\.YSTD=([\d.]+)/);
    // Cada métrica é lida por conta própria: o ffmpeg às vezes emite YAVG e não YSTD, e
    // tratar "faltou uma" como "está tudo bem" já deixou passar frame preto (YAVG 1,17).
    return { yavg: avg ? Number(avg[1]) : null, ystd: std ? Number(std[1]) : null };
}

/** Diferença média entre dois instantes do mesmo arquivo — mede se há movimento. */
function movimento(file, t1, t2) {
    const r = spawnSync(bin('ffmpeg'), ['-hide_banner', '-nostats',
        '-ss', String(t1), '-i', file, '-ss', String(t2), '-i', file,
        '-filter_complex', '[0:v]format=gray,scale=160:-1[a];[1:v]format=gray,scale=160:-1[b];[a][b]blend=all_mode=difference,signalstats,metadata=print',
        '-frames:v', '1', '-f', 'null', '-'],
        { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    const txt = `${r.stderr || ''}${r.stdout || ''}`;
    const m = txt.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    return m ? Number(m[1]) : null;
}

/**
 * Assinatura visual grosseira: 8×8 em cinza, lida como texto.
 *
 * Serve só para responder "é o mesmo clipe?". Dois takes com a mesma assinatura em dois
 * instantes diferentes são o mesmo material — acontece quando duas buscas parecidas caem
 * no mesmo vídeo do acervo, ou quando o operador copia o mesmo mp4 em dois slots.
 */
function assinatura(file, tempo) {
    const r = spawnSync(bin('ffmpeg'), ['-v', 'error', '-ss', String(tempo), '-i', file,
        '-frames:v', '1', '-vf', 'scale=8:8,format=gray', '-f', 'rawvideo', '-'],
        { encoding: 'buffer', windowsHide: true, timeout: 60000, maxBuffer: 1 << 20 });
    const b = r.stdout;
    if (!b || b.length < 64) return null;
    // Quantiza em 16 níveis: sobrevive a recompressão, distingue cena diferente.
    return Array.from(b.slice(0, 64)).map((v) => (v >> 4).toString(16)).join('');
}

function distancia(a, b) {
    if (!a || !b || a.length !== b.length) return 999;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d += 1;
    return d;
}

/** Audita um take. `planejado` é a duração que a modelagem pediu (0 = extra do laço). */
function auditarTake(file, planejado) {
    const issues = [];
    const duros = [];

    if (!P.fileOk(file, 50 * 1024)) {
        return { verdict: 'FAIL', issues: ['arquivo ausente ou menor que 50KB'] };
    }
    const p = probe(file);
    if (!p.temVideo) return { verdict: 'FAIL', probe: p, issues: ['sem stream de vídeo'] };

    // O CONTRATO É DO MOTOR, NÃO DA MINHA SUPOSIÇÃO.
    //
    // A F6 normaliza todo take com `scale=...:force_original_aspect_ratio=increase,crop`,
    // então exigir 1080×1920 na entrada reprovaria material legítimo: os motores I2V
    // entregam 496×864, e é com esses takes que os criativos aprovados do lote 1 foram
    // montados. O que de fato quebra a montagem é outra coisa — quadro DEITADO (o corte
    // 9:16 jogaria fora dois terços da cena) e resolução baixa demais para ampliar.
    const vertical = p.width && p.height && p.height > p.width;
    if (!vertical) duros.push(`${p.width}×${p.height} não é vertical — o corte 9:16 destrói a cena`);
    else if (p.height < 640) duros.push(`altura ${p.height}px: baixa demais para ampliar até ${H}`);
    else if (p.height < 1280) issues.push(`${p.width}×${p.height} — será ampliado na montagem`);

    if (p.fps && p.fps < 23.9) issues.push(`${p.fps.toFixed(1)}fps (abaixo de 24)`);

    // Take mais curto que o planejado é TOLERADO por projeto: a montagem estende
    // clonando o último quadro (`tpad`). Vira aviso, não reprovação — menos quando é
    // curto a ponto de o criativo virar quase só quadro congelado.
    const dur0 = p.duration || 0;
    if (planejado > 0 && dur0 < planejado * 0.5) {
        duros.push(`${dur0.toFixed(2)}s para um take de ${planejado.toFixed(2)}s — mais da metade viraria quadro congelado`);
    } else if (planejado > 0 && dur0 < planejado - 0.06) {
        issues.push(`${dur0.toFixed(2)}s, planejado ${planejado.toFixed(2)}s (a montagem estende clonando o último quadro)`);
    }

    const dur = p.duration || 0;
    const instantes = [dur * 0.2, dur * 0.5, dur * 0.8];
    const stats = instantes.map((t) => estatisticas(file, t));
    const pretos = stats.filter((s) => s.yavg !== null && s.yavg < 3).length;
    const chapados = stats.filter((s) => s.ystd !== null && s.ystd < 3).length;
    if (pretos === stats.length) duros.push('todos os quadros amostrados estão pretos');
    else if (pretos > 0) issues.push(`${pretos}/${stats.length} quadro(s) preto(s)`);
    if (chapados === stats.length) duros.push('imagem chapada (sem detalhe em nenhum quadro)');

    const mov = dur > 0.6 ? movimento(file, dur * 0.15, dur * 0.85) : null;
    // Abaixo de 0,5 os dois instantes são praticamente o mesmo quadro: I2V que não
    // animou, ou trecho parado do clipe de acervo. Não reprova sozinho — take estático
    // é escolha estética legítima em criativo devocional —, mas o dono precisa ver.
    if (mov !== null && mov < 0.5) issues.push(`praticamente sem movimento (diferença ${mov.toFixed(2)})`);

    const sig = assinatura(file, dur * 0.5);
    const verdict = duros.length ? 'FAIL' : (issues.length ? 'CONCERNS' : 'PASS');
    return { verdict, probe: p, movimento: mov, assinatura: sig, issues: [...duros, ...issues] };
}

function auditarPack(pack, args) {
    const paths = P.packPaths(pack.dir);
    const modelingPath = path.join(pack.dir, 'modeling.json');
    if (!fs.existsSync(modelingPath)) return { pack, verdict: 'SKIP', motivo: 'sem modeling.json' };
    if (!fs.existsSync(paths.takes)) return { pack, verdict: 'SKIP', motivo: 'sem pasta takes/' };

    const modeling = JSON.parse(fs.readFileSync(modelingPath, 'utf8'));
    const planejado = new Map((modeling.takes || []).map((t) => [t.n, Number(t.duration) || 0]));

    const arquivos = fs.readdirSync(paths.takes)
        .filter((f) => /^take-\d+\.mp4$/.test(f))
        .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

    if (!arquivos.length) return { pack, verdict: 'FAIL', motivo: 'nenhum take em disco' };

    const resultados = [];
    for (const f of arquivos) {
        const n = Number(f.match(/\d+/)[0]);
        const r = auditarTake(path.join(paths.takes, f), planejado.get(n) || 0);
        resultados.push({ n, file: f, extra: !planejado.has(n), ...r });
    }

    // Duplicidade só faz sentido entre takes do MESMO criativo: o mesmo clipe em dois
    // momentos do vídeo é repetição visível; entre criativos diferentes não é problema.
    for (let i = 0; i < resultados.length; i++) {
        for (let j = i + 1; j < resultados.length; j++) {
            const d = distancia(resultados[i].assinatura, resultados[j].assinatura);
            if (d <= 4) {
                const alvo = resultados[j];
                alvo.issues = [...(alvo.issues || []), `mesmo material do take ${resultados[i].n} (assinatura a ${d} de distância)`];
                alvo.verdict = 'FAIL';
                alvo.duplicadoDe = resultados[i].n;
            }
        }
    }

    const faltando = [...planejado.keys()].filter((n) => !resultados.some((r) => r.n === n));
    const falhas = resultados.filter((r) => r.verdict === 'FAIL');
    const avisos = resultados.filter((r) => r.verdict === 'CONCERNS');
    // Take planejado que não existe em disco não é falha do arquivo — é lacuna do lote.
    // A F6 em modo laço monta assim mesmo (foi como o lote 1 foi aprovado), então entra
    // como aviso: o dono precisa saber que o criativo vai rodar com menos cenas.
    if (faltando.length) avisos.push({ n: 0, verdict: 'CONCERNS', issues: [`take ${faltando.join(', ')} não está em disco`] });
    const verdict = falhas.length || (args.strict && avisos.length) ? 'FAIL'
        : avisos.length ? 'CONCERNS' : 'PASS';

    if (args.descartar && falhas.length) {
        const quarentena = path.join(paths.takes, '_reprovados');
        fs.mkdirSync(quarentena, { recursive: true });
        for (const r of falhas) {
            // MOVE, não apaga: o take reprovado é a evidência do que deu errado, e às
            // vezes o dono discorda do gate. Apagar tira dele a chance de olhar.
            fs.renameSync(path.join(paths.takes, r.file), path.join(quarentena, r.file));
            r.descartado = true;
        }
        const slots = P.readSlots(paths.takes);
        if (slots) {
            for (const s of slots.expected || []) {
                if (falhas.some((r) => r.file === s.file)) s.status = 'reprovado';
            }
            fs.writeFileSync(path.join(paths.takes, '_slots.json'), JSON.stringify(slots, null, 2));
        }
    }

    fs.writeFileSync(path.join(paths.takes, '_audit.json'), JSON.stringify({
        _doc: 'Gate de qualidade de take (farm-takes-check.js). PASS/CONCERNS/FAIL por take. '
            + 'FAIL bloqueia a F6; CONCERNS passa com aviso — o julgamento estético é do dono.',
        auditado_em: new Date().toISOString(),
        veredito: verdict,
        faltando,
        takes: resultados.map((r) => ({
            n: r.n, file: r.file, extra: r.extra, verdict: r.verdict, issues: r.issues,
            duracao: r.probe ? Number((r.probe.duration || 0).toFixed(2)) : null,
            formato: r.probe ? `${r.probe.width}×${r.probe.height}` : null,
            movimento: r.movimento, duplicado_de: r.duplicadoDe, descartado: r.descartado || false,
        })),
    }, null, 2));

    return { pack, verdict, resultados, faltando };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    const niche = L.loadNiche(args.niche || 'religioso');

    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const querem = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => querem.includes(p.rank));
    }
    if (args.top) packs = packs.slice(0, parseInt(args.top, 10));

    if (!packs.length) {
        console.error('❌ Nenhum pack no recorte pedido.');
        process.exitCode = 1;
        return;
    }

    console.log(`\n=== Gate de qualidade de take · ${niche.label || niche.id} ===`);
    console.log(`Sessão: ${session.id}`);
    console.log(`Packs:  ${packs.length}${args.descartar ? '  (reprovados vão para takes/_reprovados/)' : ''}\n`);

    const relatorios = [];
    for (const pack of packs) {
        const r = auditarPack(pack, args);
        relatorios.push(r);
        const icone = { PASS: '✅', CONCERNS: '⚠️ ', FAIL: '❌', SKIP: '⏭️ ' }[r.verdict];
        console.log(`${icone} [${pack.rank}] @${pack.handle} — ${r.verdict}${r.motivo ? ` (${r.motivo})` : ''}`);
        for (const t of (r.resultados || [])) {
            if (t.verdict === 'PASS') continue;
            console.log(`      take ${t.n}${t.extra ? ' (extra)' : ''}: ${t.verdict} — ${t.issues.join(' · ')}${t.descartado ? ' → descartado' : ''}`);
        }
        if ((r.faltando || []).length) console.log(`      faltam em disco: take ${r.faltando.join(', ')}`);
    }

    const pass = relatorios.filter((r) => r.verdict === 'PASS').length;
    const concerns = relatorios.filter((r) => r.verdict === 'CONCERNS').length;
    const fail = relatorios.filter((r) => r.verdict === 'FAIL').length;
    console.log('\n==========================================================');
    console.log(`✅ PASS: ${pass}  ·  ⚠️ CONCERNS: ${concerns}  ·  ❌ FAIL: ${fail}`);
    if (fail) console.log(`\n   Reprovados bloqueiam a F6. Refaça o take (--force na fase de takes) ou use --descartar.`);
    process.exitCode = fail ? 1 : 0;
})();
