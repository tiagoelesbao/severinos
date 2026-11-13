#!/usr/bin/env node
/**
 * Course ETL — transcrição + captura de frames de videoaulas.
 *
 * Extract   : varre a árvore do curso, extrai áudio 16kHz mono de cada aula
 * Transform : Whisper local (grátis) → SRT + TXT; analisa o transcript para
 *             escolher os momentos que merecem frame; ffmpeg extrai os frames
 * Load      : escreve um dossiê markdown por aula + índice do curso
 *
 * Resumível: mantém `_etl-state.json` e pula aula já processada. Pode ser
 * interrompido e retomado sem perder trabalho.
 *
 * Uso:
 *   node services/ETL/Transform/course-etl.js --course "<dir>" --slug <slug>
 *   node services/ETL/Transform/course-etl.js --course "<dir>" --slug <slug> --model small --frames 8
 *   node services/ETL/Transform/course-etl.js --slug <slug> --status
 *
 * Flags:
 *   --course <dir>   Raiz do curso (obrigatório, exceto com --status)
 *   --slug <slug>    Nome curto do curso — define o diretório de saída
 *   --model <m>      Modelo Whisper: tiny|base|small|medium  (default: base)
 *   --frames <n>     Máximo de frames por aula (default: 6)
 *   --limit <n>      Processa no máximo N aulas nesta execução (default: todas)
 *   --only <regex>   Só aulas cujo path casar com o regex
 *   --status         Só imprime o progresso e sai
 *   --redo           Reprocessa aulas já concluídas
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const OUT_ROOT = path.join(REPO, 'services', 'ETL', 'outputs', 'courses');

const WHISPER_CANDIDATES = [
  'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe',
  'whisper',
];

// ─────────────────────────────────────────────────────────────────────────────
// Termos que sinalizam um momento digno de frame. O objetivo não é "achar
// palavra bonita" — é achar o instante em que a aula MOSTRA algo na tela:
// um parâmetro, um menu, um resultado, uma comparação.
const CUE_TERMS = [
  // demonstração de interface
  'aqui', 'olha', 'veja', 'repara', 'perceb', 'clica', 'clico', 'aperta', 'seleciona',
  'arrasta', 'menu', 'botão', 'aba', 'painel', 'janela', 'tela', 'canto', 'barra',
  // parâmetro e configuração
  'parâmetro', 'parametro', 'valor', 'configura', 'ajusta', 'define', 'coloca',
  'seed', 'aspect', 'ratio', 'resolução', 'resolucao', 'steps', 'cfg', 'peso',
  'stylize', 'chaos', 'weird', 'raw', 'guidance', 'denoise', 'sampler',
  // resultado e comparação
  'resultado', 'ficou', 'gerou', 'saída', 'saida', 'antes', 'depois', 'compara',
  'diferença', 'diferenca', 'versão', 'versao', 'variação', 'variacao',
  // prompt
  'prompt', 'negativo', 'referência', 'referencia', 'estilo', 'style',
  // ferramentas — nomeadas explicitamente porque é o que queremos capturar
  'midjourney', 'flux', 'krea', 'magnific', 'recraft', 'firefly', 'ideogram',
  'runway', 'kling', 'veo', 'sora', 'luma', 'pika', 'topaz', 'nano banana',
  'photoshop', 'lightroom', 'after effects', 'premiere', 'davinci', 'suno',
  'freepik', 'leonardo', 'comfyui', 'stable diffusion', 'chatgpt', 'gemini',
];

// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { model: 'base', frames: 6, limit: Infinity, status: false, redo: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--course') a.course = argv[++i];
    else if (k === '--slug') a.slug = argv[++i];
    else if (k === '--model') a.model = argv[++i];
    else if (k === '--frames') a.frames = parseInt(argv[++i], 10);
    else if (k === '--limit') a.limit = parseInt(argv[++i], 10);
    else if (k === '--only') a.only = new RegExp(argv[++i], 'i');
    else if (k === '--status') a.status = true;
    else if (k === '--redo') a.redo = true;
  }
  return a;
}

function resolveWhisper() {
  for (const c of WHISPER_CANDIDATES) {
    try {
      if (c.includes('\\') || c.includes('/')) {
        if (fs.existsSync(c)) return c;
      } else {
        execSync(`${c} --help`, { stdio: 'ignore' });
        return c;
      }
    } catch { /* tenta o próximo */ }
  }
  throw new Error('Whisper não encontrado. Instale com: pip install -U openai-whisper');
}

function slugify(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 70);
}

function walkVideos(root) {
  const out = [];
  (function rec(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((x, y) => x.name.localeCompare(y.name, 'pt-BR'))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) rec(p);
      else if (/\.(mp4|mkv|mov|webm|m4v)$/i.test(e.name)) out.push(p);
    }
  })(root);
  return out;
}

function ffprobeDuration(file) {
  try {
    const s = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ], { encoding: 'utf8' }).trim();
    return Math.round(parseFloat(s)) || 0;
  } catch { return 0; }
}

function extractAudio(video, wav) {
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', video,
    '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav,
  ], { stdio: 'ignore' });
}

function runWhisper(whisper, wav, outDir, model) {
  execFileSync(whisper, [
    wav,
    '--model', model,
    '--language', 'Portuguese',
    '--task', 'transcribe',
    '--output_format', 'srt',
    '--output_dir', outDir,
    '--fp16', 'False',
    '--verbose', 'False',
  ], { stdio: 'ignore', maxBuffer: 1024 * 1024 * 64 });
}

// SRT → [{ start, end, text }]
function parseSrt(srtPath) {
  const raw = fs.readFileSync(srtPath, 'utf8');
  const blocks = raw.split(/\r?\n\r?\n/).filter(Boolean);
  const segs = [];
  const toSec = (t) => {
    const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
  };
  for (const b of blocks) {
    const lines = b.split(/\r?\n/);
    const tl = lines.find((l) => l.includes('-->'));
    if (!tl) continue;
    const [s, e] = tl.split('-->').map((x) => toSec(x.trim()));
    const text = lines.slice(lines.indexOf(tl) + 1).join(' ').trim();
    if (text) segs.push({ start: s, end: e, text });
  }
  return segs;
}

/**
 * Escolhe os instantes que merecem frame.
 * Pontua cada segmento pelos termos-pista, força distribuição ao longo da aula
 * (nunca dois frames colados) e sempre garante um frame de abertura.
 */
function pickFrameMoments(segs, maxFrames, duration) {
  if (!segs.length) {
    const n = Math.min(maxFrames, 3);
    return Array.from({ length: n }, (_, i) => ({
      t: Math.round((duration * (i + 1)) / (n + 1)),
      why: 'amostragem uniforme (sem transcript)',
      text: '',
    }));
  }

  const scored = segs.map((s) => {
    const low = s.text.toLowerCase();
    let score = 0;
    const hits = [];
    for (const term of CUE_TERMS) {
      if (low.includes(term)) { score += 1; hits.push(term); }
    }
    // segmento muito curto raramente carrega demonstração
    if (s.text.length < 25) score -= 1;
    return { ...s, score, hits };
  });

  const minGap = Math.max(20, duration / (maxFrames * 2.5));
  const chosen = [];
  for (const s of [...scored].sort((a, b) => b.score - a.score)) {
    if (chosen.length >= maxFrames) break;
    if (s.score <= 0) continue;
    const t = Math.round((s.start + s.end) / 2);
    if (chosen.some((c) => Math.abs(c.t - t) < minGap)) continue;
    chosen.push({ t, why: s.hits.slice(0, 4).join(', '), text: s.text });
  }

  // completa com amostragem uniforme se a heurística não encheu
  let guard = 0;
  while (chosen.length < Math.min(maxFrames, 3) && guard++ < 50) {
    const t = Math.round((duration * (chosen.length + 1)) / (Math.min(maxFrames, 3) + 1));
    if (!chosen.some((c) => Math.abs(c.t - t) < minGap)) {
      chosen.push({ t, why: 'amostragem uniforme', text: '' });
    } else break;
  }

  return chosen.sort((a, b) => a.t - b.t);
}

function extractFrame(video, t, outPng) {
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-ss', String(t), '-i', video,
    '-frames:v', '1', '-q:v', '2', '-vf', 'scale=1280:-2', outPng,
  ], { stdio: 'ignore' });
}

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
    : `${m}:${String(x).padStart(2, '0')}`;
}

function writeLessonDoc(dir, meta, segs, frames) {
  const lines = [];
  lines.push(`# ${meta.title}`);
  lines.push('');
  lines.push(`> **Módulo:** ${meta.module}  `);
  lines.push(`> **Duração:** ${fmtTime(meta.duration)}  `);
  lines.push(`> **Origem:** \`${meta.relPath}\`  `);
  lines.push(`> **Transcrito com:** Whisper \`${meta.model}\` · ${meta.transcribedAt}`);
  lines.push('');

  if (frames.length) {
    lines.push('## Frames capturados');
    lines.push('');
    lines.push('| # | Tempo | Motivo da captura | Fala no instante |');
    lines.push('|---|-------|-------------------|------------------|');
    frames.forEach((f, i) => {
      const t = (f.text || '').replace(/\|/g, '\\|').slice(0, 110);
      lines.push(`| ${i + 1} | [${fmtTime(f.t)}](frames/${f.file}) | ${f.why} | ${t} |`);
    });
    lines.push('');
    frames.forEach((f, i) => {
      lines.push(`### Frame ${i + 1} — ${fmtTime(f.t)}`);
      lines.push('');
      lines.push(`![frame ${i + 1}](frames/${f.file})`);
      lines.push('');
    });
  }

  lines.push('## Transcrição');
  lines.push('');
  let para = [];
  let paraStart = segs.length ? segs[0].start : 0;
  const flush = () => {
    if (!para.length) return;
    lines.push(`**[${fmtTime(paraStart)}]** ${para.join(' ')}`);
    lines.push('');
    para = [];
  };
  for (const s of segs) {
    if (para.length === 0) paraStart = s.start;
    para.push(s.text);
    if (para.join(' ').length > 420) flush();
  }
  flush();

  fs.writeFileSync(path.join(dir, 'aula.md'), lines.join('\n'), 'utf8');
}

function loadState(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { lessons: {} }; }
}
function saveState(p, st) {
  fs.writeFileSync(p, JSON.stringify(st, null, 2), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) { console.error('ERRO: --slug é obrigatório'); process.exit(1); }

  const outDir = path.join(OUT_ROOT, args.slug);
  const statePath = path.join(outDir, '_etl-state.json');
  fs.mkdirSync(outDir, { recursive: true });
  const state = loadState(statePath);

  if (args.status) {
    const done = Object.values(state.lessons).filter((l) => l.status === 'done').length;
    const failed = Object.values(state.lessons).filter((l) => l.status === 'failed');
    const total = state.total || Object.keys(state.lessons).length;
    console.log(`curso ${args.slug}: ${done}/${total} aulas concluídas`);
    if (failed.length) {
      console.log(`falhas (${failed.length}):`);
      failed.forEach((f) => console.log(`  - ${f.relPath}: ${f.error}`));
    }
    return;
  }

  if (!args.course || !fs.existsSync(args.course)) {
    console.error('ERRO: --course inválido ou ausente'); process.exit(1);
  }

  const whisper = resolveWhisper();
  const videos = walkVideos(args.course).filter((v) => !args.only || args.only.test(v));
  state.total = videos.length;
  state.course = args.course;
  state.model = args.model;
  saveState(statePath, state);

  console.log(`[course-etl] ${args.slug} — ${videos.length} aulas · modelo ${args.model} · ${args.frames} frames/aula`);

  let processed = 0;
  for (const video of videos) {
    const rel = path.relative(args.course, video);
    const key = rel;

    if (!args.redo && state.lessons[key] && state.lessons[key].status === 'done') continue;
    if (processed >= args.limit) { console.log('[course-etl] limite desta execução atingido'); break; }

    const parts = rel.split(path.sep);
    const moduleName = parts.length > 1 ? parts[0] : '(raiz)';
    const title = path.basename(video).replace(/\.[^.]+$/, '');
    const lessonDir = path.join(outDir, slugify(moduleName), slugify(title));
    const framesDir = path.join(lessonDir, 'frames');
    fs.mkdirSync(framesDir, { recursive: true });

    const t0 = Date.now();
    process.stdout.write(`  [${processed + 1}] ${rel.slice(0, 78)} ... `);

    try {
      const duration = ffprobeDuration(video);
      const wav = path.join(lessonDir, '_audio.wav');
      extractAudio(video, wav);
      runWhisper(whisper, wav, lessonDir, args.model);

      const srt = path.join(lessonDir, '_audio.srt');
      const segs = fs.existsSync(srt) ? parseSrt(srt) : [];

      const moments = pickFrameMoments(segs, args.frames, duration);
      const frames = [];
      moments.forEach((m, i) => {
        const file = `f${String(i + 1).padStart(2, '0')}_${fmtTime(m.t).replace(/:/g, '-')}.png`;
        try {
          extractFrame(video, m.t, path.join(framesDir, file));
          frames.push({ ...m, file });
        } catch { /* frame perdido não invalida a aula */ }
      });

      writeLessonDoc(lessonDir, {
        title, module: moduleName, duration, relPath: rel,
        model: args.model, transcribedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      }, segs, frames);

      try { fs.unlinkSync(wav); } catch { /* ignore */ }

      state.lessons[key] = {
        status: 'done', relPath: rel, module: moduleName, title,
        duration, segments: segs.length, frames: frames.length,
        dir: path.relative(outDir, lessonDir),
        elapsedSec: Math.round((Date.now() - t0) / 1000),
      };
      console.log(`ok (${segs.length} seg, ${frames.length} frames, ${Math.round((Date.now() - t0) / 1000)}s)`);
    } catch (err) {
      state.lessons[key] = { status: 'failed', relPath: rel, error: String(err.message).slice(0, 200) };
      console.log(`FALHOU: ${String(err.message).slice(0, 90)}`);
    }

    saveState(statePath, state);
    processed++;
  }

  // índice do curso
  const done = Object.values(state.lessons).filter((l) => l.status === 'done');
  const byModule = {};
  for (const l of done) (byModule[l.module] ||= []).push(l);
  const idx = [`# Índice — ${args.slug}`, '', `> ${done.length} aulas transcritas · modelo \`${args.model}\``, ''];
  for (const m of Object.keys(byModule).sort()) {
    idx.push(`## ${m}`, '');
    idx.push('| Aula | Duração | Frames |');
    idx.push('|------|---------|--------|');
    for (const l of byModule[m].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))) {
      idx.push(`| [${l.title}](${l.dir.replace(/\\/g, '/')}/aula.md) | ${fmtTime(l.duration)} | ${l.frames} |`);
    }
    idx.push('');
  }
  fs.writeFileSync(path.join(outDir, 'INDEX.md'), idx.join('\n'), 'utf8');

  const failed = Object.values(state.lessons).filter((l) => l.status === 'failed').length;
  console.log(`[course-etl] concluído nesta execução: ${processed} · total ok: ${done.length}/${state.total} · falhas: ${failed}`);
}

if (require.main === module) main();
module.exports = { pickFrameMoments, parseSrt, slugify };
