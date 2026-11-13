#!/usr/bin/env node
/**
 * farm-studio-browser-check.js — abre o editor num NAVEGADOR DE VERDADE, usa o criativo
 * como o operador usaria e reprova se aparecer erro de console ou piscada preta.
 *
 * POR QUE EXISTE: a bateria de contrato (`farm-studio-verify.js`) compara campos e o diff
 * visual compara o export renderizado. Nenhum dos dois vê o que acontece na TELA durante a
 * reprodução — e era exatamente ali que o editor falhava: laço de re-render estourando
 * "Maximum update depth", 500 em cascata na faixa de miniaturas e um piscar PRETO de 80 a
 * 120ms em toda virada de take. Tudo isso com o contrato verde.
 *
 * O QUE MEDE
 *   1. erros de console e exceções, ao longo de um roteiro de uso (tocar, tooltips,
 *      pausar, arrastar o playhead, selecionar clipes, atalhos, desfazer, tocar de novo);
 *   2. respostas HTTP >= 400 (a faixa de miniaturas pedia quadro além do fim da mídia);
 *   3. trechos escuros na gravação do palco — a piscada preta na troca de take.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-studio-browser-check.js
 *   node ... --creatives=06-tyfany-editts-636743 --segundos=45 --headed
 *
 * Precisa do app rodando (localhost:3000). Sai com código 1 se achar problema.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('❌ playwright não encontrado — rode a partir da raiz do monorepo.'); process.exit(1); }

const FFMPEG = (() => {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : 'ffmpeg';
})();

/** Trechos escuros da gravação, no recorte do palco. */
function trechosEscuros(video, recorte) {
    const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', video,
        '-vf', `crop=${recorte},format=gray,signalstats,metadata=print`, '-f', 'null', '-'],
        { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 5 * 60 * 1000 });
    const txt = `${r.stderr || ''}${r.stdout || ''}`;
    const quadros = [];
    let t = null;
    for (const linha of txt.split(/\r?\n/)) {
        const mt = linha.match(/pts_time:([\d.]+)/);
        if (mt) { t = Number(mt[1]); continue; }
        const my = linha.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
        if (my && t !== null) { quadros.push({ t, y: Number(my[1]) }); t = null; }
    }
    if (!quadros.length) return { erro: 'não consegui ler a luminância da gravação', trechos: [] };

    const media = quadros.reduce((a, b) => a + b.y, 0) / quadros.length;
    // Limiar relativo: um criativo noturno é escuro por natureza; preto de verdade é
    // uma fração pequena da média da própria peça.
    const limite = Math.max(6, media * 0.25);
    const trechos = [];
    let ini = null, ult = null;
    for (const q of quadros) {
        if (q.y < limite) { if (ini === null) ini = q.t; ult = q.t; }
        else if (ini !== null) { trechos.push({ de: ini, ate: ult }); ini = null; }
    }
    if (ini !== null) trechos.push({ de: ini, ate: ult });
    return { media, limite, trechos, quadros: quadros.length };
}

async function checarCriativo(browser, base, client, creative, segundos, dirGravacao) {
    const ctx = await browser.newContext({
        viewport: { width: 1600, height: 950 },
        recordVideo: { dir: dirGravacao, size: { width: 1280, height: 900 } },
    });
    // A gravação começa aqui; guardar o instante permite situar o "tocar" nela depois.
    const t0 = Date.now();
    const page = await ctx.newPage();
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => erros.push('EXCEÇÃO: ' + String(e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) erros.push(`HTTP ${r.status()} ${r.url().slice(-80)}`); });
    page.on('requestfailed', (r) => {
        const m = r.failure() && r.failure().errorText;
        // ERR_ABORTED é normal: o elemento de mídia cancela a busca duplicada.
        if (m && !/ABORTED/.test(m)) erros.push(`REQ ${m} ${r.url().slice(-80)}`);
    });

    const roteiro = [];
    const passo = async (nome, fn) => {
        const antes = erros.length;
        try { await fn(); } catch (e) { erros.push(`FALHA EM "${nome}": ${String(e).split('\n')[0].slice(0, 160)}`); }
        roteiro.push({ nome, novos: erros.length - antes });
    };

    await page.goto(`${base}/studio?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`,
        { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(3500);

    // Duração da composição — delimita a janela em que a piscada preta é defeito.
    let duracao = 0;
    try {
        const t = await page.evaluate(async (u) => (await fetch(u)).json(),
            `${base}/api/timeline?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`);
        const tl = t && t.timeline;
        if (tl && tl.durationInFrames && tl.fps) duracao = tl.durationInFrames / tl.fps;
    } catch { /* sem duração, a janela vira o tempo de reprodução pedido */ }

    // O palco é o único elemento com aspect-ratio 9/16 — é dele que sai o recorte.
    const caixa = await page.evaluate(() => {
        const el = document.querySelector('main div[style*="aspect-ratio"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });

    let inicioPlay = 0;
    await passo('tocar', async () => {
        inicioPlay = (Date.now() - t0) / 1000;
        await page.$eval('button[aria-label="Reproduzir"]', (b) => b.click());
        await page.waitForTimeout(segundos * 1000);
    });
    await passo('tooltips do transporte', async () => {
        for (const b of (await page.$$('main button[aria-label]')).slice(0, 10)) {
            await b.hover().catch(() => {});
            await page.waitForTimeout(200);
        }
    });
    await passo('pausar', async () => {
        const p = await page.$('button[aria-label="Pausar"]');
        if (p) await p.evaluate((b) => b.click());
        await page.waitForTimeout(700);
    });
    await passo('atalhos e desfazer', async () => {
        for (const k of ['ArrowRight', 'ArrowLeft', 'KeyM', 'KeyM']) await page.keyboard.press(k.startsWith('Key') ? k.slice(3) : k);
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(600);
    });
    await passo('tocar de novo', async () => {
        const b = await page.$('button[aria-label="Reproduzir"]');
        if (b) await b.evaluate((x) => x.click());
        await page.waitForTimeout(Math.min(10, segundos) * 1000);
    });

    await ctx.close();  // fecha o contexto para o vídeo ser gravado

    const arquivos = fs.readdirSync(dirGravacao).filter((f) => f.endsWith('.webm'));
    const video = arquivos.length ? path.join(dirGravacao, arquivos[arquivos.length - 1]) : null;
    let escuros = { trechos: [] };
    if (video && caixa) {
        // O palco no viewport de 1600×950 aparece na gravação de 1280×900 em escala.
        const ex = 1280 / 1600, ey = 900 / 950;
        const rec = `${Math.max(2, Math.round(caixa.w * ex))}:${Math.max(2, Math.round(caixa.h * ey))}:${Math.round(caixa.x * ex)}:${Math.round(caixa.y * ey)}`;
        escuros = trechosEscuros(video, rec);
    }

    // Só interessa o que acontece DURANTE a reprodução: antes disso a página ainda
    // carrega (tela escura legítima) e, depois do fim, o palco pode ficar em qualquer
    // estado. Meio segundo de folga na entrada cobre o quadro inicial do play.
    const fim = inicioPlay + Math.min(segundos, duracao || segundos);
    const piscadas = (escuros.trechos || []).filter(
        (t) => t.de > inicioPlay + 0.5 && t.de < fim && (t.ate - t.de) < 3.0,
    );

    return { creative, erros, roteiro, piscadas, video, duracao };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const base = String(args.base || 'http://localhost:3000').replace(/\/$/, '');
    const client = String(args.client || 'virals-farming');
    const segundos = parseInt(args.segundos, 10) || 25;
    const headed = args.headed !== undefined && args.headed !== false;

    let criativos = args.creatives ? String(args.creatives).split(',') : null;
    if (!criativos) {
        try {
            const res = await fetch(`${base}/api/creatives?client=${encodeURIComponent(client)}`);
            const j = await res.json();
            const arr = j.creatives || j;
            criativos = arr.map((c) => (typeof c === 'string' ? c : c.id || c.name)).filter(Boolean);
        } catch (e) {
            console.error(`❌ não consegui listar os criativos (${e.message}) — o app está rodando em ${base}?`);
            process.exitCode = 1;
            return;
        }
    }

    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-check-'));
    const browser = await chromium.launch({ headless: !headed });
    console.log(`\n=== Checagem do editor no navegador · ${client} · ${criativos.length} criativo(s) ===`);

    const relatorios = [];
    for (const c of criativos) {
        process.stdout.write(`  ${c} … `);
        const dir = path.join(raiz, c);
        fs.mkdirSync(dir, { recursive: true });
        const r = await checarCriativo(browser, base, client, c, segundos, dir);
        console.log(`${r.erros.length} erro(s) · ${r.piscadas.length} piscada(s)`);
        relatorios.push(r);
    }
    await browser.close();

    // A gravação do navegador roda a ~25 quadros por segundo. Um único quadro escuro
    // pode ser a captura pegando o instante da troca, não algo que o olho veja — só
    // reprova a partir de dois quadros (~60ms), que foi a ordem de grandeza do defeito
    // real (80 a 120ms em toda virada). Quadro isolado fica registrado como observação.
    const REPROVA_MS = 60;
    let problemas = 0;
    for (const r of relatorios) {
        const graves = r.piscadas.filter((p) => (p.ate - p.de) * 1000 >= REPROVA_MS);
        if (!r.erros.length && !r.piscadas.length) continue;
        const reprova = r.erros.length > 0 || graves.length > 0;
        if (reprova) problemas++;
        console.log(`\n${reprova ? '❌' : '⚠️ '} ${r.creative}`);
        const unicos = {};
        for (const e of r.erros) { const k = e.slice(0, 120); unicos[k] = (unicos[k] || 0) + 1; }
        for (const [t, n] of Object.entries(unicos)) console.log(`     ${String(n).padStart(4)}× ${t}`);
        for (const p of r.piscadas) {
            const ms = (p.ate - p.de) * 1000;
            console.log(`     preto ${p.de.toFixed(2)}s (${ms.toFixed(0)}ms)${ms < REPROVA_MS ? ' — quadro isolado, no limite da captura' : ''}`);
        }
        console.log(`     gravação: ${r.video}`);
    }

    if (!problemas) {
        console.log(`\n✅ ${relatorios.length}/${relatorios.length} sem erro de console e sem piscada visível.`);
        fs.rmSync(raiz, { recursive: true, force: true });
    } else {
        console.log(`\n${problemas} criativo(s) com problema. Gravações em ${raiz}`);
    }
    process.exitCode = problemas ? 1 : 0;
})();
