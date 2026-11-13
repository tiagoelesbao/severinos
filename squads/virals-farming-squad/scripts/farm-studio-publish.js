#!/usr/bin/env node
/**
 * farm-studio-publish.js — Publica um pack de farming no video-studio (F6b).
 *
 * O QUE DESTRAVA: a F6 registrava a ponte para o video-studio como "gap estrutural"
 * porque `render-export.ts`/`ingest.ts` operam sobre um Timeline interno e não leem
 * `workspaces/businesses/virals/farming/...`. Isso continua verdade — mas a conclusão
 * de que era preciso um adapter DENTRO do app estava errada.
 *
 * Lendo `api/creatives/route.ts` e `lib/ingest.ts`: o studio lista qualquer pasta em
 * `outputs/{client}/video-plans/{creative}/` e a considera editável assim que houver
 * ao menos um vídeo em `Materiais Brutos/`. A ordem e os papéis dos clipes vêm de um
 * `assembly.json` opcional no mesmo diretório.
 *
 * Ou seja: o adapter cabe do lado do FARMING, copiando os assets para a estrutura que
 * o app já sabe ler. Nenhuma linha de `apps/video-studio` é tocada — o squad continua
 * sem editar o app, como manda a fronteira entre os dois.
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-studio-publish.js \
 *     --niche=religioso --session=ID --origin=teste --client=tiago-elesbao
 *
 * DOIS MODOS, e a diferença importa:
 *
 *   --mode=approved (DEFAULT) — publica o `criativo.mp4` já exportado como material
 *     ÚNICO. O studio não tem o que remontar: mostra exatamente o que foi aprovado,
 *     com o texto centralizado, as transições da F6, o áudio do benchmark e a marca
 *     d'água já removida.
 *
 *   --mode=source — publica os takes separados + áudio. Serve para reeditar de fato,
 *     mas o studio vai aplicar o PRÓPRIO pipeline por cima (legenda karaokê, hook
 *     renderer, motion, SFX, transições), porque foi construído para o fluxo de
 *     narração do cliente. O resultado NÃO é o criativo aprovado — é uma nova
 *     montagem a partir das mesmas peças.
 *
 * Foi essa diferença que fez o frontend divergir do export: publicar peças soltas num
 * editor que monta sozinho é pedir uma montagem nova, não uma visualização.
 *
 * Flags:
 *   --niche=ID       nicho (obrigatório, salvo com --session)
 *   --session=ID     sessão; default: a mais recente do nicho na data
 *   --origin=X       recorta pela pasta sob benchmark/
 *   --ranks=1,3      packs específicos
 *   --client=SLUG    cliente do studio (obrigatório) — a pasta em outputs/
 *   --mode=X         mirror | approved | edit | source     (default: approved)
 *                    mirror = espelho editável do export, peça a peça
 *   --with-export    copia também o criativo final para exports/
 *   --force          sobrescreve materiais já publicados
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
// Tradutor do export da F6 para o modelo do editor — ver _studio-mirror.js para os
// limites do app e como cada um é contornado.
const M = require('./_studio-mirror.js');

/** Dimensões e duração REAIS do arquivo publicado — o save precisa bater com o disco. */
function probeMedia(filePath) {
    const local = path.join(L.REPO_ROOT, 'services', 'ETL', 'yt-dlp_win', 'ffprobe.exe');
    const bin = fs.existsSync(local) ? local : 'ffprobe';
    const r = spawnSync(
        bin,
        ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=width,height',
         '-of', 'default=nw=1', filePath],
        { encoding: 'utf8', windowsHide: true, timeout: 30000 }
    );
    const out = r.stdout || '';
    const d = out.match(/duration=([\d.]+)/);
    const w = out.match(/width=(\d+)/);
    const h = out.match(/height=(\d+)/);
    if (!d) return null;
    return { duration: Number(d[1]), width: w ? Number(w[1]) : null, height: h ? Number(h[1]) : null };
}

/**
 * Reenquadramento anti-marca-d'água do espelho, em ordem de autoridade:
 *
 *  1. flag explícita (`--dewatermark[=z]`) — sobreposição manual;
 *  2. `timeline.dewatermark` da F6 — o contrato, gravado por quem renderizou;
 *  3. o `crop` do comando ffmpeg real (`export/_ffmpeg-cmd.txt`) — rede de segurança
 *     para packs montados antes de (2) existir.
 *
 * Sem isto o operador tinha de repetir a mesma flag em dois comandos diferentes, e
 * esquecer trocava o enquadramento do criativo inteiro sem nenhum aviso.
 */
function resolveDewatermark(args, f6, exportDir) {
    if (args.dewatermark !== undefined && args.dewatermark !== false) {
        return {
            enabled: true,
            zoom: args.dewatermark === true || args.dewatermark === '' ? 0.07 : parseFloat(args.dewatermark) || 0.07,
            corner: String(args['wm-corner'] || 'br'),
        };
    }
    if (f6 && f6.dewatermark && typeof f6.dewatermark.enabled === 'boolean') {
        return { corner: 'br', zoom: 0.07, ...f6.dewatermark };
    }
    const cmdPath = path.join(exportDir, '_ffmpeg-cmd.txt');
    if (fs.existsSync(cmdPath)) {
        const m = fs.readFileSync(cmdPath, 'utf8').match(/crop=iw\*([\d.]+):ih\*[\d.]+:\(iw-iw\*[\d.]+\)\/2:(ih-ih\*[\d.]+|0)/);
        if (m) {
            const zoom = Number((1 - Number(m[1])).toFixed(4));
            return { enabled: zoom > 0.001, zoom, corner: m[2] === '0' ? 'br' : 'tr' };
        }
    }
    return { enabled: false, zoom: 0.07, corner: 'br' };
}

require('dotenv').config({ path: path.join(L.REPO_ROOT, '.env') });

const SLUG = /^[a-z0-9][a-z0-9-]*$/i;

/** Mesmo layout de `creativeDirFor`/`materialsDirFor` do app — replicado, não importado:
 *  o squad não depende do build do Next para publicar arquivos. */
function creativeDir(client, creative) {
    return path.join(L.REPO_ROOT, 'outputs', client, 'video-plans', creative);
}

/**
 * Estado de edição PRÉ-SALVO (`studio-edit.json`).
 *
 * Sem este arquivo, `api/timeline/route.ts` monta o criativo do zero e — no ramo
 * `if (!persisted)` — PRÉ-MONTA sound design: deriva SFX dos cortes e, quando não há
 * `video-brief.yaml` com `sound_design`, injeta uma trilha lo-fi default. Foi de onde
 * vieram o "impact · hook" e a "trilha lo-fi" que não existem no export aprovado.
 *
 * Pior: `audioEnabled` é decidido por `TALKING_HEAD.has(role)`, e esse conjunto é
 * apenas {hook, cta}. Um clipe com qualquer outro papel entra MUDO — era por isso que
 * "Áudio próprio do clipe" aparecia desmarcado e o áudio do benchmark sumia.
 *
 * Com um save válido ({timeline, fxPlan}), o route trata a edição como autoritativa e
 * pula a pré-montagem inteira. É o único jeito de o frontend abrir exatamente o que foi
 * aprovado — sem tocar no app.
 */
function buildStudioEdit({ client, creative, materialsDir, file, probe, fps = 30 }) {
    const durationInFrames = Math.max(1, Math.round((probe.duration || 0) * fps));
    const clip = {
        file,
        absPath: path.join(materialsDir, file),
        // `hook` de propósito: é o papel que o studio trata como talking-head e,
        // portanto, o único que NÃO entra mudo. O criativo carrega o próprio áudio.
        role: 'hook',
        durationSeconds: Number((durationInFrames / fps).toFixed(2)),
        durationInFrames,
        nativeDurationInFrames: durationInFrames,
        playbackRate: 1,
        width: probe.width || 1080,
        height: probe.height || 1920,
        startFrame: 0,
        audioEnabled: true,
    };

    return {
        _doc: 'Estado pré-salvo pelo Virals Farming Squad para que o studio abra o criativo '
            + 'APROVADO como ele foi exportado: um clipe, áudio próprio ligado, sem SFX '
            + 'automático, sem trilha de fundo e sem legenda sobreposta (o texto já está '
            + 'queimado no arquivo). Editar e salvar no app sobrescreve isto normalmente.',
        timeline: {
            fps,
            width: clip.width,
            height: clip.height,
            durationInFrames,
            videoTrack: [clip],
            videoMuted: false,
            audioTrack: null,   // sem faixa de narração: o áudio vive dentro do clipe
            captionTrack: [],
            extraLayers: [],    // sem SFX e sem trilha — o vazio é o ponto
            markers: [],
            meta: {
                client, creative,
                videoSeconds: clip.durationSeconds,
                audioSeconds: clip.durationSeconds,
                rhythmGapSeconds: null,
                gaps: [],
            },
        },
        // fxPlan COMPLETO. Um `{ captions: [] }` solto quebra a página: `page.tsx` lê
        // `snap.fxPlan.brand.accent` direto, sem guarda, e o save persistido substitui
        // o fxPlan inteiro — não é mesclado com um default. Faltando `brand`, o studio
        // estoura com "Cannot read properties of undefined (reading 'accent')".
        //
        // Os valores abaixo são os MESMOS defaults que `buildFxPlan`/`loadBrandTokens`
        // produziriam (hook-hardcut → "hard-cut", cap-word-pop → "word-pop",
        // motion-lower-third → ["lower-third","progress-bar"], paleta de fallback).
        // `captions: []` é o único desvio deliberado: o texto do criativo já está
        // queimado pela F6 e, se o editor gerasse cues, apareceria DUAS vezes.
        fxPlan: {
            brand: {
                accent: '#FF5B3F',
                primary: '#0C0A1F',
                displayName: 'Virals Farming',
                fontFamily: 'Outfit, system-ui, sans-serif',
            },
            hookRenderer: 'hard-cut',
            captionRenderer: 'word-pop',
            motionRenderers: [],
            captions: [],
        },
        captionSource: 'script',
    };
}

/**
 * Estado EDITÁVEL que reproduz a composição da F6 camada por camada.
 *
 * O modo `approved` entrega o arquivo achatado: fiel, mas nada é editável — um clipe só,
 * sem acesso aos segmentos, ao texto ou à trilha. Este modo reconstrói a MESMA montagem
 * com as peças separadas, lendo o `timeline.json` que a F6 já emitiu (fades reais,
 * durações reais, transições reais) em vez de estimar.
 *
 * Três decisões que fazem a diferença entre "as peças estão lá" e "bate com o export":
 *
 *  · Os takes entram com `audioEnabled: false`. Eles vêm de motor I2V e carregam áudio
 *    próprio — a sirene que apareceu num teste. O som do criativo é a trilha do
 *    benchmark, e deixar os dois tocando soma duas fontes.
 *
 *  · O mp3 vai numa CAMADA DE ÁUDIO chamada "Trilha (benchmark)", não em `audioTrack`.
 *    `audioTrack` é a faixa de narração do studio: colocá-lo lá o rotula como fala do
 *    criador (era por isso que aparecia como "hook") e o sujeita ao ducking da voz.
 *
 *  · O texto vai numa camada de ELEMENTOS, como `type: "text"` posicionado em x/y
 *    percentuais — editável no app. Não como legenda cronometrada, que é o que o
 *    editor geraria sozinho e que descaracteriza este formato.
 */
function buildEditableEdit({ client, creative, materialsDir, modeling, f6, fps = 30 }) {
    const toFrames = (s) => Math.max(1, Math.round((Number(s) || 0) * fps));
    const f6Video = (f6 && f6.videoTrack) || [];
    const openFrames = (f6 && f6.open && f6.open.durationFrames) || 10;
    const closeFrames = (f6 && f6.close && f6.close.durationFrames) || 14;

    let cursor = 0;
    const videoTrack = (modeling.takes || []).map((t, i) => {
        const src = f6Video[i] || {};
        const dur = toFrames(src.durationSeconds || t.duration || 3);
        const isFirst = i === 0;
        const isLast = i === (modeling.takes || []).length - 1;
        const clip = {
            file: `take-${t.n}.mp4`,
            absPath: path.join(materialsDir, `take-${t.n}.mp4`),
            // `insert` mantém o take MUDO (só {hook,cta} tocam áudio próprio no studio),
            // que é exatamente o que queremos: o som vem da trilha.
            role: 'insert',
            durationSeconds: Number((dur / fps).toFixed(2)),
            durationInFrames: dur,
            nativeDurationInFrames: dur,
            playbackRate: 1,
            width: 1080,
            height: 1920,
            startFrame: cursor,
            audioEnabled: false,
            // Fades reais da F6: abertura no primeiro, encerramento no último.
            ...(isFirst ? { fadeIn: openFrames } : {}),
            ...(isLast ? { fadeOut: closeFrames } : {}),
        };
        cursor += dur;
        return clip;
    });

    const totalFrames = Math.max(cursor, 1);
    const frase = String((modeling.creative_text && modeling.creative_text.frase) || '').trim();

    const extraLayers = [
        {
            id: 'L-trilha-benchmark',
            kind: 'audio',
            name: 'Trilha (benchmark)',
            clips: [{
                id: 'trilha-0',
                type: 'media-audio',
                file: 'audio_original.mp3',
                label: 'áudio original do benchmark',
                startFrame: 0,
                durationInFrames: totalFrames,
                volume: 1,
                // Sem ducking: não há narração para abaixar a trilha. Com ducking
                // ligado e sem voz, o volume oscilaria sem motivo.
                ducking: false,
            }],
        },
    ];

    if (frase) {
        extraLayers.push({
            id: 'L-copy',
            kind: 'video',
            name: 'Elementos (copy)',
            clips: [{
                id: 'copy-0',
                type: 'text',
                text: frase,
                label: 'copy do criativo',
                startFrame: 0,
                durationInFrames: totalFrames,
                // 50/50 é o centro; 42% deixa o bloco acima do meio, como no benchmark.
                x: 50,
                y: 42,
                fontSize: 76,
                color: '#FFFFFF',
                opacity: 1,
                animateIn: { type: 'fade', durationInFrames: openFrames },
                animateOut: { type: 'fade', durationInFrames: closeFrames },
            }],
        });
    }

    return {
        _doc: 'Composição da F6 reconstruída em camadas EDITÁVEIS: takes separados (mudos), '
            + 'trilha do benchmark em camada própria e a copy como elemento de texto centrado. '
            + 'Equivale ao export aprovado, mas com as peças acessíveis. Para ver o arquivo '
            + 'exato que foi aprovado, republique com --mode=approved.',
        timeline: {
            fps, width: 1080, height: 1920,
            durationInFrames: totalFrames,
            videoTrack,
            videoMuted: false,
            audioTrack: null,
            captionTrack: [],
            extraLayers,
            markers: [],
            meta: {
                client, creative,
                videoSeconds: Number((totalFrames / fps).toFixed(2)),
                audioSeconds: Number((totalFrames / fps).toFixed(2)),
                rhythmGapSeconds: null,
                gaps: [],
            },
        },
        fxPlan: {
            brand: {
                accent: '#FF5B3F', primary: '#0C0A1F',
                displayName: 'Virals Farming', fontFamily: 'Outfit, system-ui, sans-serif',
            },
            hookRenderer: 'hard-cut',
            captionRenderer: 'word-pop',
            motionRenderers: [],
            // A copy é um ELEMENTO de texto, não legenda cronometrada — se o fxPlan
            // gerasse cues, o texto apareceria duas vezes.
            captions: [],
        },
        captionSource: 'script',
    };
}

function copyIfNeeded(src, dest, force) {
    if (!fs.existsSync(src)) return { ok: false, reason: 'origem ausente' };
    if (fs.existsSync(dest) && !force) return { ok: true, skipped: true };
    fs.copyFileSync(src, dest);
    return { ok: true, bytes: fs.statSync(dest).size };
}

function publishPack(pack, client, args) {
    const paths = P.packPaths(pack.dir);
    const mode = String(args.mode || 'approved').toLowerCase();
    // Slug do criativo: o mesmo id usado no timeline.json da F6, para que o criativo
    // seja rastreável dos dois lados sem tabela de correspondência.
    // Slug do criativo = NOME DA PASTA do pack. Usar `rank + handle` colidia: os ranks
    // se repetem entre packs (cada execução da F2 renumera de 1), e dois criativos do
    // mesmo perfil viravam a mesma pasta no editor, um sobrescrevendo o outro.
    const creative = L.slug(pack.folder, 60);
    const dir = creativeDir(client, creative);
    const materials = path.join(dir, 'Materiais Brutos');
    fs.mkdirSync(materials, { recursive: true });

    const modeling = fs.existsSync(paths.modelingJson)
        ? JSON.parse(fs.readFileSync(paths.modelingJson, 'utf8'))
        : { takes: [] };

    const copied = [];
    const missing = [];

    if (mode === 'approved') {
        // MATERIAL ÚNICO: o criativo já exportado. Sem peças soltas, o editor não tem
        // o que remontar — e é justamente a remontagem que trazia SFX, transições e
        // legenda karaokê que não existem na versão aprovada.
        const src = path.join(paths.export, 'criativo.mp4');
        const r = copyIfNeeded(src, path.join(materials, 'criativo-aprovado.mp4'), args.force);
        if (r.ok) copied.push(`criativo-aprovado.mp4${r.skipped ? ' (já existia)' : ''}`);
        else missing.push(`export/criativo.mp4 — ${r.reason} (rode a F6 antes)`);

        // O áudio NÃO é publicado aqui: já está dentro do criativo. Publicá-lo à parte
        // faria o studio tratá-lo como faixa de narração e dobrar o som.
    } else if (mode !== 'mirror') {   // mirror publica os próprios arquivos, já recortados
        // Modos `edit` e `source` publicam as mesmas peças; a diferença é o estado.
        // Takes na ordem do plano. O nome preserva o número do take: a ordem alfabética
        // dos materiais é o que o studio usa quando não há assembly, então `take-1` antes
        // de `take-2` já sai certo mesmo se o assembly for ignorado.
        for (const t of modeling.takes || []) {
            const src = path.join(paths.takes, `take-${t.n}.mp4`);
            const dest = path.join(materials, `take-${t.n}.mp4`);
            const r = copyIfNeeded(src, dest, args.force);
            if (r.ok) copied.push(`take-${t.n}.mp4${r.skipped ? ' (já existia)' : ''}`);
            else missing.push(`take-${t.n}.mp4 — ${r.reason}`);
        }

        // Áudio do benchmark: é ele que manda na duração do criativo, então precisa
        // atravessar a ponte junto. Sem ele o studio monta os takes sem trilha.
        const audio = copyIfNeeded(paths.audio, path.join(materials, 'audio_original.mp3'), args.force);
        if (audio.ok) copied.push(`audio_original.mp3${audio.skipped ? ' (já existia)' : ''}`);
        else missing.push(`audio.mp3 — ${audio.reason}`);
    }

    // assembly.json — ordem e papéis explícitos. O studio dá precedência a ele sobre
    // a heurística de nome de arquivo.
    const assembly = {
        _doc: mode === 'approved'
            ? 'Criativo APROVADO publicado como material único pelo Virals Farming Squad. '
              + 'O arquivo já contém texto, transições, áudio e a marca d\'água removida — '
              + 'nada deve ser remontado por cima. Para reeditar as peças, republique com --mode=source.'
            : 'Peças SOLTAS de um pack do Virals Farming Squad, para reedição. '
              + 'Atenção: a montagem daqui NÃO é o criativo aprovado — o studio aplica o próprio '
              + 'pipeline (legenda, transições, SFX) sobre estes materiais.',
        _mode: mode,
        _source: {
            session: path.relative(L.REPO_ROOT, pack.dir).replace(/\\/g, '/'),
            handle: pack.handle,
            url: pack.url || null,
            rank: pack.rank,
        },
        narrationFile: mode === 'approved' ? null : 'audio_original.mp3',
        clips: mode === 'approved'
            ? [{ file: 'criativo-aprovado.mp4', role: 'full', order: 1 }]
            : (modeling.takes || []).map((t, i) => ({
                file: `take-${t.n}.mp4`,
                role: t.role || null,
                order: i + 1,
                durationSeconds: t.duration || null,
                cameraMove: t.camera_move || null,
            })),
        // A frase do criativo atravessa a ponte: é ela que o editor precisa ver e
        // ajustar no frontend, e sem isso o texto viraria decisão de quem edita.
        creativeText: (modeling.creative_text && modeling.creative_text.frase) || '',
        captionStyle: modeling.caption_style || null,
    };
    fs.writeFileSync(path.join(dir, 'assembly.json'), JSON.stringify(assembly, null, 2));

    // O save pré-montado é o que impede o studio de remontar por cima. `source` é o
    // único modo que NÃO pré-salva: ali a remontagem é justamente o que se quer.
    if (mode === 'approved' && !missing.length) {
        const file = 'criativo-aprovado.mp4';
        const probe = probeMedia(path.join(materials, file));
        if (probe) {
            fs.writeFileSync(
                path.join(dir, 'studio-edit.json'),
                JSON.stringify(buildStudioEdit({ client, creative, materialsDir: materials, file, probe }), null, 2)
            );
            copied.push('studio-edit.json (estado pré-salvo: áudio próprio, sem SFX, sem trilha)');
        } else {
            missing.push('studio-edit.json — ffprobe não leu o criativo publicado');
        }
    } else if (mode === 'mirror') {
        // ESPELHO: reproduz o export da F6 dentro do editor, peça a peça.
        const f6Path = path.join(pack.dir, 'timeline.json');
        const assPath = path.join(paths.export, 'captions.ass');
        if (!fs.existsSync(f6Path)) {
            missing.push('timeline.json da F6 ausente — rode a montagem antes');
        } else {
            const f6 = JSON.parse(fs.readFileSync(f6Path, 'utf8'));
            // O reenquadramento vem do CONTRATO da F6 (`timeline.dewatermark`), não da
            // linha de comando: se o export cortou 7% e o espelho não cortar, os dois
            // ficam com enquadramentos diferentes e nada acusa — o texto bate, a imagem
            // não. A flag continua valendo como sobreposição manual, e packs antigos
            // (sem o campo) caem no comando real gravado em `export/_ffmpeg-cmd.txt`.
            const dw = resolveDewatermark(args, f6, paths.export);
            copied.push(dw.enabled
                ? `reenquadramento: corte de ${(dw.zoom * 100).toFixed(0)}% (${dw.corner}), herdado do export`
                : 'reenquadramento: nenhum (o export também não cortou)');

            // Takes publicados JÁ recortados e normalizados: o editor não sabe cortar.
            const usados = [...new Set((f6.videoTrack || []).map((c) => path.basename(c.file)))];
            for (const nome of usados) {
                const src = path.join(paths.takes, nome);
                const dest = path.join(materials, nome);
                if (!fs.existsSync(src)) { missing.push(`${nome} ausente em takes/`); continue; }
                if (fs.existsSync(dest) && !args.force) { copied.push(`${nome} (já existia)`); continue; }
                const r = M.bakeTake(L.REPO_ROOT, src, dest, { dewatermark: dw });
                if (r.ok) copied.push(`${nome} (recortado e normalizado)`);
                else missing.push(`${nome} — ${r.reason}`);
            }

            const audioDest = path.join(materials, 'audio_original.mp3');
            const ra = copyIfNeeded(paths.audio, audioDest, args.force);
            if (ra.ok) copied.push(`audio_original.mp3${ra.skipped ? ' (já existia)' : ''}`);
            else missing.push(`audio.mp3 — ${ra.reason}`);

            if (!missing.length) {
                const assCues = M.parseAssCues(assPath);
                const assStyle = M.parseAssStyle(assPath);
                fs.writeFileSync(
                    path.join(dir, 'studio-edit.json'),
                    JSON.stringify(M.buildMirrorEdit({
                        client, creative, repoRoot: L.REPO_ROOT, materialsDir: materials, f6, assCues,
                        fontSize: assStyle.fontSize, assStyle,
                        audioFile: 'audio_original.mp3',
                    }), null, 2)
                );
                const linhas = assCues.reduce((n, c) => n + c.linhas.length, 0);
                copied.push(`studio-edit.json (${(f6.videoTrack || []).length} clipes · ${assCues.length} elementos de texto`
                    + ` · ${linhas} linhas · ${assStyle.family} ${assStyle.fontWeight} ${assStyle.fontSize}px`
                    + ` · contorno ${assStyle.strokeWidth}px ${assStyle.strokeColor})`);
            }
        }
    } else if (mode === 'edit' && !missing.length) {
        // Reproduz a composição da F6 a partir do timeline.json dela — fades, durações
        // e ordem reais, não estimadas.
        const f6Path = path.join(pack.dir, 'timeline.json');
        const f6 = fs.existsSync(f6Path) ? JSON.parse(fs.readFileSync(f6Path, 'utf8')) : null;
        if (!f6) missing.push('timeline.json da F6 ausente — rode a montagem antes de publicar em modo edit');
        else {
            fs.writeFileSync(
                path.join(dir, 'studio-edit.json'),
                JSON.stringify(buildEditableEdit({ client, creative, materialsDir: materials, modeling, f6 }), null, 2)
            );
            copied.push('studio-edit.json (takes separados + trilha + copy em camadas)');
        }
    }

    let exported = null;
    if (args['with-export']) {
        const src = path.join(paths.export, 'criativo.mp4');
        if (fs.existsSync(src)) {
            const expDir = path.join(dir, 'exports');
            fs.mkdirSync(expDir, { recursive: true });
            fs.copyFileSync(src, path.join(expDir, 'farming-criativo.mp4'));
            exported = 'exports/farming-criativo.mp4';
        }
    }

    return { creative, dir, copied, missing, exported };
}

(async () => {
    const args = L.parseArgs(process.argv);
    // Cliente DEDICADO por padrão. O farming não deve despejar criativos no cliente de
    // um perfil pessoal: os dois têm marca, formato e destino diferentes, e o app lista
    // tudo junto. A pasta nasce sozinha — o studio descobre clientes varrendo outputs/,
    // e o nome de exibição cai para title-case do slug ("Virals Farming").
    const client = String(args.client || 'virals-farming').trim();

    if (!SLUG.test(client)) {
        console.error('❌ --client=SLUG inválido (a pasta do cliente em outputs/).');
        const outs = path.join(L.REPO_ROOT, 'outputs');
        if (fs.existsSync(outs)) {
            const disponiveis = fs.readdirSync(outs, { withFileTypes: true })
                .filter((e) => e.isDirectory() && fs.existsSync(path.join(outs, e.name, 'video-plans')))
                .map((e) => e.name);
            if (disponiveis.length) console.error(`   Clientes com video-plans: ${disponiveis.join(', ')}`);
        }
        process.exitCode = 1;
        return;
    }

    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    const niche = L.loadNiche(args.niche || session.manifest.niche);

    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    }
    // Só publica quem tem take em disco — publicar pasta vazia faz o criativo aparecer
    // no frontend como não-ingestável, que é pior que não aparecer.
    packs = packs.filter((p) => fs.existsSync(P.packPaths(p.dir).takes));

    if (packs.length === 0) {
        console.error('❌ Nenhum pack com pasta takes/. Gere os takes antes de publicar.');
        process.exitCode = 1;
        return;
    }

    console.log(`\n=== Publicação no video-studio · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:  ${session.id}`);
    console.log(`Cliente: ${client}`);
    console.log(`Packs:   ${packs.length}\n`);

    const results = [];
    for (const pack of packs) {
        const r = publishPack(pack, client, args);
        results.push(r);
        console.log(`[${pack.rank}] @${pack.handle} → outputs/${client}/video-plans/${r.creative}/`);
        for (const c of r.copied) console.log(`    ✓ ${c}`);
        for (const m of r.missing) console.log(`    ⚠️ ${m}`);
        if (r.exported) console.log(`    ✓ ${r.exported}`);
    }

    console.log(`\n✅ ${results.length} criativo(s) publicado(s).`);
    console.log(`\n➡️  Abra o video-studio (localhost:3000), escolha o cliente "${client}" e o criativo aparecerá na lista.\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exitCode = 1;
});
