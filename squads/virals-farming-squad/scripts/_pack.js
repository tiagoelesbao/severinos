/**
 * _pack.js — Localização e leitura dos packs de benchmark de uma sessão.
 *
 * Contrato compartilhado por todas as fases (F3..F6): quem quiser iterar sobre os
 * criativos de uma sessão usa `listPacks()`; quem quiser gravar slots de modo híbrido
 * usa `writeSlots()`/`readSlots()`.
 *
 * REGRA: a verificação de completude é feita EM DISCO, nunca por campo de status.
 * Um manifesto que diz "complete" com a pasta vazia é bug, não sucesso.
 */

const fs = require('fs');
const path = require('path');

const L = require('./_niche-loader.js');

/**
 * Resolve o diretório da sessão.
 * @returns {{id, dir, manifest}}
 */
function resolveSession(args = {}) {
    const date = args.date || L.todayISO();

    let ref = null;
    if (args.session) {
        ref = { id: args.session, dir: path.join(L.OUTPUT_ROOT, date, args.session) };
    } else if (args.niche) {
        ref = L.findLatestSession(args.niche, date);
    }

    if (!ref || !fs.existsSync(ref.dir)) {
        throw new Error(
            `Sessão não encontrada${args.session ? ` ("${args.session}")` : ''}. ` +
            `Rode a F1: node squads/virals-farming-squad/scripts/farm-monitor.js --niche=${args.niche || '{nicho}'}`
        );
    }

    const manifestPath = path.join(ref.dir, 'session.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
    return { ...ref, manifest, manifestPath };
}

function saveManifest(session, phaseKey, data) {
    const manifest = fs.existsSync(session.manifestPath)
        ? JSON.parse(fs.readFileSync(session.manifestPath, 'utf8'))
        : {};
    manifest.phases = manifest.phases || {};
    manifest.phases[phaseKey] = { completed_at: new Date().toISOString(), ...data };
    fs.writeFileSync(session.manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
}

/**
 * Lista os packs de benchmark da sessão, lendo o disco.
 * @param {object} session
 * @param {object} opts  { onlyComplete: boolean, ranks: number[] }
 * @returns {Array<{dir, rank, handle, benchmark, hasVideo, hasAudio, frames, status}>}
 */
function listPacks(session, opts = {}) {
    const benchDir = path.join(session.dir, 'benchmark');
    if (!fs.existsSync(benchDir)) return [];

    const packs = [];

    // ORIGEM ANINHADA: o operador organiza o trabalho em subpastas (`lote 1 - 29.07/ready`)
    // para separar o que já foi aprovado do resto. A varredura padrão só enxerga um nível
    // sob `benchmark/`, então um caminho com barra devolvia zero packs — sem erro, o que é
    // pior: parecia que não havia nada pronto. Aqui o origin com separador vira o diretório
    // de busca direto.
    const origins = opts.origin && /[\\/]/.test(opts.origin)
        ? [opts.origin]
        : fs.readdirSync(benchDir);

    for (const origin of origins) {
        const originDir = path.join(benchDir, origin);
        if (!fs.existsSync(originDir) || !fs.statSync(originDir).isDirectory()) continue;

        for (const folder of fs.readdirSync(originDir)) {
            const dir = path.join(originDir, folder);
            if (!fs.statSync(dir).isDirectory()) continue;

            const bjPath = path.join(dir, 'benchmark.json');
            if (!fs.existsSync(bjPath)) continue;

            let benchmark;
            try {
                benchmark = JSON.parse(fs.readFileSync(bjPath, 'utf8'));
            } catch (_) {
                continue;
            }

            const shotsDir = path.join(dir, 'screenshots');
            const frames = fs.existsSync(shotsDir)
                ? fs.readdirSync(shotsDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort()
                : [];

            const pack = {
                dir,
                origin,
                folder,
                rank: benchmark.rank,
                handle: (benchmark.source && benchmark.source.handle) || 'desconhecido',
                url: (benchmark.source && benchmark.source.url) || null,
                benchmark,
                hasVideo: fileOk(path.join(dir, 'video.mp4'), 50 * 1024),
                hasAudio: fileOk(path.join(dir, 'audio.mp3'), 1024),
                hasAudioDescription: fs.existsSync(path.join(dir, 'audio-description.md')),
                frames,
                framesDir: shotsDir,
                status: benchmark.status || 'unknown',
            };

            // Completude verificada em DISCO, não pelo campo de status.
            //
            // O `video.mp4` NÃO entra nesta conta. Nenhuma fase posterior lê esse
            // arquivo: a F3 usa `benchmark.video.duration` (metadado do JSON), e F4/F5/F6
            // trabalham sobre frames, áudio e transcrição. Exigi-lo aqui reprovava packs
            // perfeitamente modeláveis só porque o vídeo-fonte foi apagado para liberar
            // disco — travando o pipeline inteiro por um arquivo que ninguém consome.
            // Quem precisar do vídeo-fonte tem `hasSourceVideo` explícito abaixo.
            pack.hasSourceVideo = pack.hasVideo;
            pack.diskComplete = pack.hasAudio && frames.length > 0 && pack.hasAudioDescription;
            packs.push(pack);
        }
    }

    packs.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    let out = packs;
    // Filtro por ORIGEM = a pasta sob benchmark/ (perfil, hashtag, teste...). É o
    // recorte natural para ensaiar uma mudança num pack isolado sem gastar cota de
    // visão nos outros: basta pôr o pack sob benchmark/teste/ e passar --origin=teste.
    // Origem aninhada já restringiu a varredura acima; comparar de novo por igualdade
    // exata falharia por causa do separador de caminho do Windows.
    if (opts.origin && !/[\\/]/.test(opts.origin)) out = out.filter((p) => p.origin === opts.origin);
    if (opts.onlyComplete) out = out.filter((p) => p.diskComplete && p.status === 'complete');
    if (opts.ranks && opts.ranks.length) out = out.filter((p) => opts.ranks.includes(p.rank));
    if (opts.top) out = out.slice(0, opts.top);
    return out;
}

function fileOk(p, minBytes = 1) {
    try {
        return fs.existsSync(p) && fs.statSync(p).size >= minBytes;
    } catch (_) {
        return false;
    }
}

/** Caminhos padronizados dentro de um pack. */
function packPaths(packDir) {
    return {
        video: path.join(packDir, 'video.mp4'),
        audio: path.join(packDir, 'audio.mp3'),
        audioDescription: path.join(packDir, 'audio-description.md'),
        benchmark: path.join(packDir, 'benchmark.json'),
        screenshots: path.join(packDir, 'screenshots'),
        plan: path.join(packDir, 'plano-criativo.md'),
        imagePrompts: path.join(packDir, 'prompts-imagem.md'),
        motionPrompts: path.join(packDir, 'prompts-animacao.md'),
        publication: path.join(packDir, 'publicacao.md'),
        modelingJson: path.join(packDir, 'modeling.json'),
        images: path.join(packDir, 'images'),
        takes: path.join(packDir, 'takes'),
        export: path.join(packDir, 'export'),
    };
}

// ---------------------------------------------------------------------------
// Slots — o contrato que dá PARIDADE entre modo auto e híbrido.
// A fase seguinte lê os slots e não sabe qual modo produziu os arquivos.
// ---------------------------------------------------------------------------

/**
 * @param {string} dir       pasta onde vivem os arquivos (images/ ou takes/)
 * @param {string} mode      'auto' | 'hybrid'
 * @param {Array}  expected  [{ take, file, status, provider?, tier? }]
 */
function writeSlots(dir, mode, expected, extra = {}) {
    fs.mkdirSync(dir, { recursive: true });
    const payload = { mode, generated_at: new Date().toISOString(), expected, ...extra };
    fs.writeFileSync(path.join(dir, '_slots.json'), JSON.stringify(payload, null, 2));
    return payload;
}

function readSlots(dir) {
    const p = path.join(dir, '_slots.json');
    if (!fs.existsSync(p)) return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (_) {
        return null;
    }
}

/**
 * Verifica os slots contra o DISCO e devolve o que está pendente.
 * @returns {{ok, present: [], missing: [], slots}}
 */
function verifySlots(dir, minBytes = 1024) {
    const slots = readSlots(dir);
    if (!slots) return { ok: false, present: [], missing: [], slots: null, reason: '_slots.json ausente' };

    const present = [];
    const missing = [];
    for (const slot of slots.expected || []) {
        const p = path.join(dir, slot.file);
        if (fileOk(p, minBytes)) present.push({ ...slot, path: p });
        else missing.push(slot);
    }
    return { ok: missing.length === 0, present, missing, slots };
}

/** Marca um slot como preenchido, registrando qual provider o produziu. */
function markSlotFilled(dir, file, provider, tier) {
    const slots = readSlots(dir);
    if (!slots) return null;
    for (const s of slots.expected) {
        if (s.file === file) {
            s.status = 'filled';
            s.provider = provider;
            s.tier = tier;
        }
    }
    fs.writeFileSync(path.join(dir, '_slots.json'), JSON.stringify(slots, null, 2));
    return slots;
}

/** Acrescenta um item ao relatório de degradação da sessão. */
function appendDegraded(session, entry) {
    const p = path.join(session.dir, '_degraded.md');
    const header = `# Itens Degradados · ${session.id}\n\n> Um pack sem os assets não é um pack. Estes itens NÃO devem avançar como se estivessem prontos.\n\n`;
    let body = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : header;
    body += `\n## [${entry.phase}] ${entry.label} — \`${entry.status}\`\n\n`;
    for (const issue of entry.issues || []) body += `- ⚠️ ${issue}\n`;
    body += `\n_registrado em ${new Date().toISOString()}_\n`;
    fs.writeFileSync(p, body);
}

module.exports = {
    resolveSession,
    saveManifest,
    listPacks,
    packPaths,
    fileOk,
    writeSlots,
    readSlots,
    verifySlots,
    markSlotFilled,
    appendDegraded,
};
