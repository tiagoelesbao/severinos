#!/usr/bin/env node
/**
 * farm-stock-takes.js — F4/F5 por ACERVO · Virals Farming Squad
 *
 * Substitui as duas fases mais caras do pipeline — gerar imagem (F4) e animar (F5) — por
 * uma só: procurar num banco público o vídeo que JÁ mostra a cena que a modelagem
 * descreveu, baixar, recortar no formato e entregar `takes/take-N.mp4`.
 *
 * O QUE MUDA NA PRÁTICA
 *   rota clássica:  cena → prompt → imagem (cota) → I2V (cota/manual) → take
 *   esta rota:      cena → busca → clipe real → corte 9:16 → take
 *
 * Some a cota de imagem, some o trabalho manual de colar prompt em motor de vídeo, e o
 * movimento passa a ser de câmera de verdade em vez de parallax sintético.
 *
 * O QUE DECIDE A QUALIDADE: a QUERY. `stock_query` da modelagem é um truncamento dos
 * primeiros termos da cena — serve para foto, é fraco para vídeo ("ausente fundo sólido
 * preto", "visão indisponível"). Aqui a cena estruturada vira 3 buscas curtas em INGLÊS
 * (o acervo é indexado em inglês) através de um modelo de texto gratuito, com queda para
 * heurística quando a API não responde.
 *
 * O QUE NÃO SE PEDE AO ACERVO: a pessoa do original. Quando a cena é uma pessoa
 * específica (é o caso de metade dos benchmarks), copiar o sujeito nem seria desejável —
 * o criativo é MODELADO, não clonado. A tradução da cena mira o ambiente e a emoção,
 * que é o que sustenta o mesmo ritmo.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-stock-takes.js --niche=religioso \
 *     --session={id} --origin="lote 2 - 02.08"
 *   node ... --ranks=1,2 --dry-run          (só mostra as buscas, não baixa nada)
 *   node ... --force                        (refaz takes já existentes)
 *
 * Flags:
 *   --niche=ID        nicho (obrigatório, salvo com --session)
 *   --session=ID      sessão; default: a mais recente do nicho na data
 *   --date=YYYY-MM-DD data da sessão                    (default: hoje)
 *   --origin=X        recorta pela pasta sob benchmark/ (aceita caminho aninhado)
 *   --ranks=1,3       escolhe ranks específicos
 *   --top=N           limita aos N primeiros packs
 *   --dry-run         monta as queries e busca, sem baixar nem escrever take
 *   --force           regrava takes que já existem em disco
 *   --no-llm          pula o tradutor e usa só a heurística (não gasta API)
 *   --sem-extras      não busca variações para o laço (áudio longo repete os mesmos takes)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const STOCK = require('./adapters/video/pexels-stock.js');

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env'), quiet: true });

const W = 1080;
const H = 1920;
const FPS = 30;

function bin(nome) {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', `${nome}.exe`);
    return fs.existsSync(local) ? local : nome;
}

function probe(file) {
    const r = spawnSync(bin('ffprobe'), ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration', '-show_entries', 'format=duration',
        '-of', 'default=nw=1', file], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    const out = r.stdout || '';
    const n = (k) => { const m = out.match(new RegExp(`${k}=([\\d.]+)`)); return m ? Number(m[1]) : null; };
    return { width: n('width'), height: n('height'), duration: n('duration') };
}

// ---------------------------------------------------------------------------
// Cena → buscas
// ---------------------------------------------------------------------------

/** Campos que a visão preenche com "nada aqui" — poluem a busca se entrarem. */
const VAZIO = /^\s*(ausente|não aplicável|nao aplicavel|indisponível|indisponivel|\[visão indisponível\]|\[visao indisponivel\]|estático|estatico|n\/a|-)?\s*$/i;

function limpo(v) {
    const s = String(v || '').trim();
    return VAZIO.test(s) || /vis[aã]o indispon[ií]vel/i.test(s) ? '' : s;
}

/**
 * Resumo da cena para o tradutor: sujeito e fundo são o que se procura; luz e cor
 * definem a atmosfera; o resto (lente, textura, enquadramento) descreve COMO foi
 * filmado e não ajuda a achar o clipe.
 */
function resumoDaCena(take) {
    const c = take.cena || {};
    const partes = [
        limpo(c.sujeito) && `sujeito: ${limpo(c.sujeito)}`,
        limpo(c.fundo) && `ambiente: ${limpo(c.fundo)}`,
        limpo(c.luz) && `luz: ${limpo(c.luz)}`,
        limpo(c.cor) && `cores: ${limpo(c.cor)}`,
    ].filter(Boolean);
    return partes.join(' · ').slice(0, 900);
}

/** Glossário mínimo PT→EN para a queda sem LLM. Só termos visuais recorrentes. */
const GLOSSARIO = {
    montanha: 'mountain', montanhas: 'mountains', neve: 'snow', nevado: 'snowy', nevadas: 'snowy',
    céu: 'sky', ceu: 'sky', nuvens: 'clouds', nuvem: 'cloud', sol: 'sun', pôr: 'sunset', por: 'sunset',
    amanhecer: 'sunrise', entardecer: 'sunset', noite: 'night', noturno: 'night', dia: 'day',
    mar: 'sea', oceano: 'ocean', praia: 'beach', onda: 'wave', ondas: 'waves', rio: 'river', lago: 'lake',
    floresta: 'forest', árvore: 'tree', arvore: 'tree', árvores: 'trees', arvores: 'trees', folhas: 'leaves',
    chuva: 'rain', chuvoso: 'rainy', névoa: 'fog', nevoa: 'fog', neblina: 'mist', vento: 'wind',
    cidade: 'city', urbano: 'urban', rua: 'street', estrada: 'road', carro: 'car', carros: 'cars',
    trânsito: 'traffic', transito: 'traffic', janela: 'window', trem: 'train', ponte: 'bridge',
    casa: 'house', casas: 'houses', igreja: 'church', vela: 'candle', velas: 'candles', cruz: 'cross',
    mulher: 'woman', homem: 'man', pessoa: 'person', mãos: 'hands', maos: 'hands', silhueta: 'silhouette',
    café: 'coffee', cafe: 'coffee', mesa: 'table', livro: 'book', bíblia: 'bible', biblia: 'bible',
    dourada: 'golden', dourado: 'golden', escuro: 'dark', escura: 'dark', claro: 'bright',
    quente: 'warm', fria: 'cold', frio: 'cold', calma: 'calm', calmo: 'calm',
};

const RUIDO = new Set(['plano', 'geral', 'médio', 'medio', 'longo', 'close', 'ângulo', 'angulo', 'vertical',
    'quadro', 'enquadramento', 'imagem', 'vídeo', 'video', 'cena', 'fundo', 'sujeito', 'com', 'sem', 'uma',
    'que', 'para', 'dos', 'das', 'aos', 'pela', 'pelo', 'está', 'esta', 'muito', 'mais', 'seu', 'sua']);

/** Queda sem LLM: extrai substantivos visuais e traduz o que estiver no glossário. */
function queriesHeuristicas(take) {
    const texto = `${limpo((take.cena || {}).sujeito)} ${limpo((take.cena || {}).fundo)} ${take.stock_query || ''}`.toLowerCase();
    const termos = [];
    for (const bruto of texto.split(/[^\p{L}\p{N}]+/u)) {
        const t = bruto.trim();
        if (t.length < 4 || RUIDO.has(t)) continue;
        const en = GLOSSARIO[t];
        if (!en || termos.includes(en)) continue;
        termos.push(en);
        if (termos.length >= 4) break;
    }
    if (!termos.length) return [];
    return [termos.slice(0, 3).join(' '), termos.slice(0, 2).join(' ')].filter((q, i, a) => q && a.indexOf(q) === i);
}

/**
 * Traduz a cena em 3 buscas curtas em inglês.
 *
 * `openrouter/free` é o único roteador gratuito que responde hoje: os slugs `:free` dos
 * modelos grandes (gemma-3-27b, llama-3.3-70b) passaram a devolver 404 "unavailable for
 * free". Medido em 2026-08-02.
 */
async function queriesPorLLM(take, niche) {
    const key = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!key) return null;
    const resumo = resumoDaCena(take);
    if (!resumo) return null;

    const prompt = [
        'Você monta buscas para um banco de vídeos de acervo (Pexels).',
        `Nicho do criativo: ${niche}.`,
        `Cena descrita: ${resumo}`,
        '',
        'Responda SOMENTE com 3 buscas em INGLÊS, uma por linha, de 2 a 4 palavras cada.',
        'Regras: descreva o AMBIENTE e a ATMOSFERA filmáveis, não pessoas específicas nem texto na tela.',
        'Nada de aspas, numeração ou explicação.',
    ].join('\n');

    // Uma repetição com espera: o roteador gratuito limita rajada, e a fase dispara uma
    // chamada por take. Falhar de primeira é comum; falhar duas vezes é sinal real.
    for (let tentativa = 0; tentativa < 2; tentativa++) {
        if (tentativa) await new Promise((r) => setTimeout(r, 2500));
        try {
            const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'openrouter/free', max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
                signal: AbortSignal.timeout(45000),
            });
            if (!r.ok) continue;
            const j = await r.json();
            const txt = (((j.choices || [])[0] || {}).message || {}).content || '';
            const linhas = String(txt).split('\n')
                .map((l) => l.replace(/^[\s\-*\d.)"']+/, '').replace(/["']+$/, '').trim())
                // LISTA BRANCA, não lista negra.
                //
                // O roteador gratuito é tagarela: devolve política ("User Safety: safe"),
                // preâmbulo ("Let's craft:") e até o próprio enunciado ("Constraints:",
                // "Only 3 searches in ENGLISH.") junto das buscas — e isso ia direto para
                // o banco de vídeo como se fosse a query do take. Perseguir cada padrão
                // ruim é corrida perdida; o que uma busca É, ao contrário, se descreve em
                // uma linha: 2 a 5 palavras, só letras e hífen, sem pontuação e sem número.
                .filter((l) => /^[a-zA-Z][a-zA-Z\- ]{2,}$/.test(l))
                .filter((l) => { const n = l.split(/\s+/).length; return n >= 2 && n <= 5; });
            if (linhas.length) return linhas.slice(0, 3);
        } catch (_) { /* tenta de novo */ }
    }
    return null;
}

/**
 * Buscas de ÚLTIMO RECURSO, tiradas da estética do nicho.
 *
 * Quando a visão falhou naquele frame, a cena vem `[VISÃO INDISPONÍVEL]` e não há o que
 * traduzir. É exatamente o caso que o `visual_style` do nicho existe para cobrir (a F3
 * usa o mesmo critério para o prompt de imagem): estética declarada do formato, não
 * invenção sobre o criativo. Melhor um take do ambiente certo do que um buraco na
 * montagem — e o operador vê no `_stock.json` que aquele veio do fallback.
 */
async function queriesDoNicho(niche) {
    const estilo = (niche.modeling && (niche.modeling.visual_style || niche.modeling.visual_grading)) || '';
    if (!estilo) return [];
    const falso = { cena: { sujeito: estilo, fundo: '', luz: '', cor: '' }, stock_query: estilo };
    const doLLM = await queriesPorLLM(falso, niche.label || niche.id);
    return [...new Set([...(doLLM || []), ...queriesHeuristicas(falso)])].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Clipe do acervo → take no formato
// ---------------------------------------------------------------------------

/**
 * Recorta o trecho e entrega no formato do pipeline: 1080×1920, 30fps, sem áudio.
 *
 * DE ONDE SAI O TRECHO: do meio do clipe. O começo costuma ter o movimento de câmera
 * ainda assentando e o fim, o corte do autor — o miolo é a parte estável. Quando o clipe
 * é mais curto que o take, `-stream_loop` repete o material em vez de deixar o fim preto
 * (a F6 estende clonando o último quadro, mas aí seria um congelamento visível).
 */
function recortarParaTake(origem, destino, duracao) {
    const info = probe(origem);
    const dur = info.duration || 0;
    const precisaLoop = dur > 0 && dur < duracao + 0.2;
    const inicio = precisaLoop ? 0 : Math.max(0, Math.min(dur - duracao - 0.1, (dur - duracao) / 2));

    const args = ['-y', '-hide_banner', '-loglevel', 'error'];
    if (precisaLoop) args.push('-stream_loop', String(Math.ceil((duracao + 1) / Math.max(0.5, dur))));
    args.push('-ss', inicio.toFixed(2), '-i', origem, '-t', duracao.toFixed(3),
        '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1`,
        '-an',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        // Mesma política do resto do pipeline: um keyframe por segundo. Sem isso o
        // editor precisa redecodificar desde o início a cada seek.
        '-g', String(FPS), '-keyint_min', String(FPS), '-sc_threshold', '0',
        '-movflags', '+faststart', destino);

    const r = spawnSync(bin('ffmpeg'), args, { encoding: 'utf8', windowsHide: true, timeout: 5 * 60 * 1000 });
    if (r.status !== 0 || !fs.existsSync(destino)) {
        return { ok: false, reason: `ffmpeg: ${(r.stderr || '').slice(-200)}` };
    }
    const final = probe(destino);
    if (!final.width || final.width !== W || final.height !== H) {
        return { ok: false, reason: `saiu ${final.width}×${final.height}, esperado ${W}×${H}` };
    }
    // Tolerância de meio quadro: o corte cai no keyframe mais próximo.
    if ((final.duration || 0) < duracao - 0.05) {
        return { ok: false, reason: `saiu ${(final.duration || 0).toFixed(2)}s, take pede ${duracao.toFixed(2)}s` };
    }
    return { ok: true, ...final, inicio, loop: precisaLoop };
}

// ---------------------------------------------------------------------------

async function processarPack(pack, niche, args, fallbackNicho) {
    const paths = P.packPaths(pack.dir);
    const modelingPath = path.join(pack.dir, 'modeling.json');
    if (!fs.existsSync(modelingPath)) return { pack, ok: false, reason: 'sem modeling.json — rode a F3 antes' };

    const modeling = JSON.parse(fs.readFileSync(modelingPath, 'utf8'));
    const takes = [...(modeling.takes || [])].sort((a, b) => a.n - b.n);
    if (!takes.length) return { pack, ok: false, reason: 'modeling.json sem takes' };

    fs.mkdirSync(paths.takes, { recursive: true });
    const usados = new Set();
    const registro = [];

    // O `_stock.json` da execução anterior é a memória desta fase: guarda as buscas que
    // acharam cada take e os ids já usados. Sem ele, um take "já existe" entra no
    // registro sem query nenhuma — e a busca de variações para o laço não tem do que
    // partir (foi o que aconteceu na primeira tentativa: 0 extras para 57,7s de áudio).
    const anterior = (() => {
        const f = path.join(paths.takes, '_stock.json');
        if (!fs.existsSync(f)) return null;
        try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; }
    })();
    for (const t of ((anterior || {}).takes || [])) {
        if (t.fonte && t.fonte.id) usados.add(t.fonte.id);
    }

    for (const take of takes) {
        const destino = path.join(paths.takes, `take-${take.n}.mp4`);
        if (fs.existsSync(destino) && !args.force) {
            const antes = ((anterior || {}).takes || []).find((x) => x.n === take.n) || {};
            registro.push({ n: take.n, status: 'ja-existia', queries: antes.queries, fonte: antes.fonte });
            console.log(`    · take ${take.n}: já existe (use --force para refazer)`);
            continue;
        }

        const duracao = Number(take.duration) || 4;
        const doLLM = args['no-llm'] ? null : await queriesPorLLM(take, niche.label || niche.id);
        const heuristicas = queriesHeuristicas(take);
        let queries = [...new Set([...(doLLM || []), ...heuristicas])].filter(Boolean);
        // Sem cena traduzida, cai para a estética declarada do nicho (ver queriesDoNicho).
        let veioDoNicho = queries.length === 0;
        if (veioDoNicho) queries = fallbackNicho || [];
        // Query de uma palavra só ("book", "dark") não descreve cena nenhuma: é o que
        // sobra quando o tradutor falhou e o glossário achou um termo isolado. O banco
        // devolve o clipe mais popular daquele tema e o take vira sorteio. A estética do
        // nicho entra ATRÁS como reforço — não substitui, complementa.
        else if (queries.every((q) => q.split(/\s+/).filter((t) => t.length > 3).length < 2)) {
            queries = [...new Set([...queries, ...(fallbackNicho || [])])];
            veioDoNicho = 'parcial';
        }

        if (!queries.length) {
            registro.push({ n: take.n, status: 'sem-query', motivo: 'cena vazia e nicho sem estética declarada' });
            console.log(`    ❌ take ${take.n}: sem query (cena vazia / visão indisponível)`);
            continue;
        }
        const etiqueta = veioDoNicho === true ? ' [fallback do nicho]' : veioDoNicho === 'parcial' ? ' [+reforço do nicho]' : '';
        console.log(`    · take ${take.n} (${duracao.toFixed(1)}s)${etiqueta}: ${queries.join(' | ')}`);

        const achado = await STOCK.procurarTake(queries, duracao, usados);
        if (!achado.ok) {
            registro.push({ n: take.n, status: 'sem-clipe', queries, motivo: achado.reason });
            console.log(`    ❌ take ${take.n}: ${achado.reason}`);
            continue;
        }
        const v = achado.video;
        console.log(`      ↳ #${v.id} ${v.width}×${v.height} ${v.duration}s · ${v.user.name} · nota ${achado.score}`);

        if (args['dry-run']) {
            // Marca como usado também no ensaio: sem isso o mesmo clipe aparece em vários
            // takes do relatório e o ensaio mente sobre o que a execução real faria.
            usados.add(v.id);
            registro.push({ n: take.n, status: 'dry-run', queries, escolhido: v.id, score: achado.score });
            continue;
        }

        const arquivo = STOCK.melhorArquivo(v);
        if (!arquivo) {
            registro.push({ n: take.n, status: 'sem-arquivo', escolhido: v.id });
            console.log(`    ❌ take ${take.n}: clipe sem arquivo mp4 utilizável`);
            continue;
        }
        const bruto = path.join(paths.takes, `.stock-${v.id}.mp4`);
        const dl = await STOCK.baixar(arquivo.link, bruto);
        if (!dl.ok) {
            registro.push({ n: take.n, status: 'falha-download', escolhido: v.id, motivo: dl.reason });
            console.log(`    ❌ take ${take.n}: ${dl.reason}`);
            continue;
        }

        const corte = recortarParaTake(bruto, destino, duracao);
        try { fs.unlinkSync(bruto); } catch (_) { /* segue */ }
        if (!corte.ok) {
            registro.push({ n: take.n, status: 'falha-corte', escolhido: v.id, motivo: corte.reason });
            console.log(`    ❌ take ${take.n}: ${corte.reason}`);
            continue;
        }

        usados.add(v.id);
        registro.push({
            n: take.n,
            status: 'ok',
            duracao: Number(duracao.toFixed(2)),
            query: achado.query,
            queries,
            score: achado.score,
            origem_da_query: veioDoNicho === true ? 'estética do nicho (visão indisponível no frame)'
                : veioDoNicho === 'parcial' ? 'cena traduzida + reforço do nicho (query fraca)'
                : 'cena traduzida',
            trecho: { inicio: Number(corte.inicio.toFixed(2)), loop: corte.loop },
            fonte: {
                banco: 'pexels',
                id: v.id,
                url: v.url,
                autor: v.user.name,
                autor_url: v.user.url,
                arquivo: `${arquivo.width}×${arquivo.height}`,
                licenca: 'Pexels License (uso comercial livre, atribuição opcional)',
            },
        });
        console.log(`    ✓ take ${take.n}: ${(corte.duration || 0).toFixed(2)}s · ${corte.width}×${corte.height}${corte.loop ? ' (loop)' : ''}`);
    }

    // ---------------------------------------------------------------------------
    // VARIEDADE PARA O LAÇO — a vantagem que só esta rota tem.
    //
    // Quando o áudio é muito mais longo que a soma dos takes, a F6 repete os mesmos
    // arquivos em ordem até cobrir (medido no lote 2: 2 takes × 8 ciclos para 57,7s —
    // duas cenas oito vezes). Na rota de geração isso é inevitável: cada take extra
    // custa cota de imagem e de vídeo. Aqui custa uma busca — e o banco tem outros
    // clipes da MESMA cena. Os extras entram como take-(N+1), take-(N+2)…, que é
    // exatamente o que o modo `--fill=loop` da F6 lê do disco.
    // ---------------------------------------------------------------------------
    const prontos = registro.filter((r) => r.status === 'ok' || r.status === 'ja-existia');
    if (!args['dry-run'] && !args['sem-extras'] && prontos.length) {
        const somaTakes = takes.reduce((acc, t) => acc + (Number(t.duration) || 0), 0);
        const audioSec = probe(path.join(pack.dir, 'audio.mp3')).duration || 0;
        const videoSec = ((pack.benchmark || {}).video || {}).duration || 0;
        const alvo = videoSec > 0 ? Math.min(audioSec, videoSec) : audioSec;

        if (alvo > somaTakes * 1.4) {
            const MAX_EXTRAS = 12;
            let faltam = alvo - somaTakes;
            let n = Math.max(...takes.map((t) => t.n));
            let i = 0;
            console.log(`    ↻ áudio de ${alvo.toFixed(1)}s contra ${somaTakes.toFixed(1)}s de takes — buscando variações para o laço`);

            while (faltam > 1.5 && registro.filter((r) => r.extra).length < MAX_EXTRAS) {
                const modelo = takes[i % takes.length];
                i++;
                const base = registro.find((r) => r.n === modelo.n && r.queries);
                const queries = (base && base.queries) || [];
                if (!queries.length) { if (i > takes.length * 2) break; continue; }

                const duracao = Number(modelo.duration) || 4;
                const achado = await STOCK.procurarTake(queries, duracao, usados);
                if (!achado.ok) { if (i > takes.length * 3) break; continue; }

                const v = achado.video;
                const arquivo = STOCK.melhorArquivo(v);
                if (!arquivo) continue;
                n += 1;
                const destinoExtra = path.join(paths.takes, `take-${n}.mp4`);
                const bruto = path.join(paths.takes, `.stock-${v.id}.mp4`);
                const dl = await STOCK.baixar(arquivo.link, bruto);
                if (!dl.ok) { n -= 1; continue; }
                const corte = recortarParaTake(bruto, destinoExtra, duracao);
                try { fs.unlinkSync(bruto); } catch (_) { /* segue */ }
                if (!corte.ok) { n -= 1; continue; }

                usados.add(v.id);
                faltam -= duracao;
                registro.push({
                    n, extra: true, de_qual_take: modelo.n, status: 'ok',
                    duracao: Number(duracao.toFixed(2)), query: achado.query, score: achado.score,
                    fonte: { banco: 'pexels', id: v.id, url: v.url, autor: v.user.name, autor_url: v.user.url },
                });
                console.log(`    ✓ take ${n} (variação da cena ${modelo.n}): ${(corte.duration || 0).toFixed(2)}s · #${v.id}`);
            }
        }
    }

    if (!args['dry-run']) {
        // CONTRATO DA F6: ela exige `takes/_slots.json` e não sabe (nem precisa saber)
        // como o take nasceu — gerado por IA ou trazido do acervo. Escrever o mesmo
        // arquivo que a F5 escreveria é o que faz esta rota entrar no pipeline sem
        // nenhuma mudança rio abaixo.
        const extras = registro.filter((r) => r.extra && r.status === 'ok')
            .map((r) => ({ take: r.n, file: `take-${r.n}.mp4`, status: 'filled', provider: 'pexels-stock', tier: 'acervo', variacao_de: r.de_qual_take }));
        P.writeSlots(paths.takes, 'auto', [...takes.map((t) => {
            const r = registro.find((x) => x.n === t.n);
            const pronto = r && (r.status === 'ok' || r.status === 'ja-existia');
            return {
                take: t.n,
                file: `take-${t.n}.mp4`,
                status: pronto ? 'filled' : 'pending',
                ...(pronto ? { provider: 'pexels-stock', tier: 'acervo' } : {}),
            };
        }), ...extras], { origem: 'acervo (farm-stock-takes.js)' });

        fs.writeFileSync(path.join(paths.takes, '_stock.json'), JSON.stringify({
            _doc: 'Takes obtidos de banco de vídeo público, não gerados por IA. Cada item traz a '
                + 'busca que o encontrou e a procedência do clipe — atribuição é opcional na licença '
                + 'do Pexels, mas publicar sem saber a origem do material é risco silencioso.',
            gerado_em: new Date().toISOString(),
            criativo: `${modeling.rank}-${modeling.handle}`,
            // Preserva a procedência dos takes que NÃO foram refeitos: sem isto, uma
            // segunda passada sem `--force` reescrevia o manifesto com entradas vazias
            // e a fase perdia a própria memória — as buscas sumiam e a variação para o
            // laço ficava sem ponto de partida.
            takes: registro.map((r) => {
                if (r.status !== 'ja-existia') return r;
                const antes = ((anterior || {}).takes || []).find((x) => x.n === r.n);
                return antes ? { ...antes, status: 'ja-existia' } : r;
            }),
        }, null, 2));
    }

    const ok = registro.filter((r) => r.status === 'ok' || r.status === 'ja-existia').length;
    return { pack, ok: ok === takes.length, total: takes.length, prontos: ok, registro };
}

(async () => {
    const args = L.parseArgs(process.argv);
    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    const niche = L.loadNiche(args.niche || (session.id || '').split('-')[3] || 'religioso');

    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const querem = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => querem.includes(p.rank));
    }
    if (args.top) packs = packs.slice(0, parseInt(args.top, 10));
    packs = packs.filter((p) => fs.existsSync(path.join(p.dir, 'modeling.json')));

    if (!packs.length) {
        console.error('❌ Nenhum pack com modeling.json no recorte pedido. Rode a F3 antes.');
        process.exitCode = 1;
        return;
    }

    console.log(`\n=== Takes de acervo · ${niche.label || niche.id} ===`);
    console.log(`Sessão: ${session.id}`);
    console.log(`Packs:  ${packs.length}${args['dry-run'] ? '  (dry-run: nada será baixado)' : ''}\n`);

    // Uma vez por execução: as buscas de fallback do nicho não mudam entre packs.
    const fallbackNicho = args['no-llm'] ? queriesHeuristicas({ cena: { sujeito: (niche.modeling || {}).visual_style || '' } }) : await queriesDoNicho(niche);

    const relatorios = [];
    for (const pack of packs) {
        console.log(`[${pack.rank}] @${pack.handle} — ${path.basename(pack.dir)}`);
        const r = await processarPack(pack, niche, args, fallbackNicho);
        if (r.reason) console.log(`    ❌ ${r.reason}`);
        relatorios.push(r);
    }

    const completos = relatorios.filter((r) => r.ok).length;
    const parciais = relatorios.filter((r) => !r.ok && r.prontos > 0).length;
    console.log('\n==========================================================');
    console.log(`✅ Completos: ${completos}  ·  ⚠️ Parciais: ${parciais}  ·  ❌ Sem takes: ${relatorios.length - completos - parciais}`);
    for (const r of relatorios.filter((x) => !x.ok)) {
        console.log(`   ${path.basename(r.pack.dir)}: ${r.prontos || 0}/${r.total || '?'} takes`);
    }
    if (!args['dry-run']) console.log(`\n➡️  Próximo: a F6 monta normalmente (node farm-assemble.js --ranks=...)`);
    process.exitCode = completos === relatorios.length ? 0 : 1;
})();
