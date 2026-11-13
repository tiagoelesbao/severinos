#!/usr/bin/env node
/**
 * farm-studio-visual-diff.js — Compara PIXEL A PIXEL o export aprovado contra o render
 * do video-studio.
 *
 * POR QUE EXISTE: a bateria `farm-studio-verify.js` compara o CONTRATO (campos do
 * `studio-edit.json` contra o `timeline.json`) e deu 6/6 — enquanto o resultado na tela
 * estava, nas palavras do dono, "ridículo e distante do export". Contrato igual não
 * garante render igual: o editor tem seu próprio motor de composição (enquadramento,
 * tipografia, camadas), e nada disso aparece na comparação de campos.
 *
 * Este script fecha esse buraco: extrai frames nos MESMOS instantes dos dois vídeos e
 * mede a diferença real da imagem. É o único juiz que importa.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-studio-visual-diff.js \
 *     --aprovado=caminho/A.mp4 --studio=caminho/B.mp4 --out=pasta [--amostras=6]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');

function bin(nome) {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', `${nome}.exe`);
    return fs.existsSync(local) ? local : nome;
}

function probeDur(file) {
    const r = spawnSync(bin('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    return Number(String(r.stdout || '').trim()) || 0;
}

function extrairFrame(file, tempo, dest, largura = 360) {
    const r = spawnSync(bin('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error',
        '-ss', String(tempo), '-i', file, '-vf', `scale=${largura}:-1`, '-frames:v', '1', dest],
        { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    return r.status === 0 && fs.existsSync(dest);
}

/**
 * Diferença média entre dois frames, via `blend=difference` + signalstats.
 * 0 = idênticos. Acima de ~12 a diferença já é visível a olho nu.
 */
/**
 * @param {string} recorte  filtro de crop aplicado aos DOIS frames antes de comparar.
 *
 * Comparar o QUADRO INTEIRO engana quando o fundo é o mesmo vídeo: um texto totalmente
 * remontado ocupa pouca área e a média fica baixa. Medido: linhas de legenda
 * SOBREPOSTAS uma na outra deram diferença 8,1 — abaixo do limiar — porque as montanhas
 * ao fundo eram idênticas. Por isso a banda do texto é medida à parte.
 */
function diferenca(a, b, recorte = null) {
    const pre = recorte ? `${recorte},` : '';
    const r = spawnSync(bin('ffmpeg'), ['-hide_banner', '-nostats',
        '-i', a, '-i', b,
        '-filter_complex', `[0:v]${pre}format=gray[x];[1:v]${pre}format=gray[y];[x][y]blend=all_mode=difference,signalstats,metadata=print`,
        '-f', 'null', '-'],
        { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    const out = `${r.stderr || ''}${r.stdout || ''}`;
    const m = out.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    return m ? Number(m[1]) : null;
}

(async () => {
    const args = L.parseArgs(process.argv);
    const aprovado = args.aprovado;
    const studio = args.studio;
    const out = args.out || path.join(L.REPO_ROOT, 'workspaces', 'businesses', 'virals', 'farming', '_qa-espelhamento', 'diff');
    const amostras = parseInt(args.amostras, 10) || 6;

    if (!aprovado || !studio || !fs.existsSync(aprovado) || !fs.existsSync(studio)) {
        console.error('❌ Informe --aprovado=A.mp4 e --studio=B.mp4 (ambos precisam existir).');
        process.exitCode = 1;
        return;
    }
    fs.mkdirSync(out, { recursive: true });

    const durA = probeDur(aprovado);
    const durB = probeDur(studio);
    console.log(`\naprovado: ${durA.toFixed(2)}s  ·  studio: ${durB.toFixed(2)}s  ·  delta ${(durB - durA).toFixed(2)}s`);

    // Amostra em posições RELATIVAS: se as durações divergirem, comparar segundos
    // absolutos compararia momentos diferentes do criativo.
    const linhas = [];
    let somaDiff = 0;
    let medidos = 0;
    for (let i = 0; i < amostras; i++) {
        const frac = (i + 0.5) / amostras;
        const tA = durA * frac;
        const tB = durB * frac;
        const fa = path.join(out, `s${i}-aprovado.png`);
        const fb = path.join(out, `s${i}-studio.png`);
        if (!extrairFrame(aprovado, tA, fa) || !extrairFrame(studio, tB, fb)) {
            linhas.push({ i, frac, diff: null, nota: 'falha ao extrair' });
            continue;
        }
        const d = diferenca(fa, fb);
        // Banda do texto: 25%–70% da altura, onde a copy vive nestes criativos.
        // É a medida que importa — o fundo costuma ser o mesmo vídeo nos dois lados.
        const dTexto = diferenca(fa, fb, "crop=iw:ih*0.45:0:ih*0.25");
        if (dTexto !== null) { somaDiff += dTexto; medidos++; }
        linhas.push({ i, frac, tA, tB, diff: d, diffTexto: dTexto });

        // Montagem lado a lado, para inspeção humana.
        spawnSync(bin('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error',
            '-i', fa, '-i', fb, '-filter_complex', 'hstack', path.join(out, `comparacao-${i}.png`)],
            { windowsHide: true, timeout: 60000 });
    }

    console.log('\n  #   posição   aprovado   studio    diferença');
    for (const l of linhas) {
        console.log(`  ${l.i}   ${(l.frac * 100).toFixed(0).padStart(3)}%   ${(l.tA || 0).toFixed(2).padStart(7)}s   ${(l.tB || 0).toFixed(2).padStart(6)}s   ${l.diff === null ? '   —' : l.diff.toFixed(2).padStart(7)}`);
    }

    const media = medidos ? somaDiff / medidos : null;
    console.log(`\ndiferença média: ${media === null ? '—' : media.toFixed(2)}  (0 = idêntico · >12 = visível a olho nu)`);
    console.log(`comparações lado a lado em: ${path.relative(L.REPO_ROOT, out).replace(/\\/g, '/')}\n`);

    process.exitCode = media !== null && media < 6 ? 0 : 1;
})();
