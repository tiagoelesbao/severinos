// Servidor de render persistente (2026-10-18, pedido do founder: "disparando
// vários terminais" + "um pouco lento"). Abre o Chrome UMA VEZ pro ciclo de
// vida inteiro do servidor (reaproveitado via `puppeteerInstance` em toda
// chamada) — é a parte mais lenta de cada render E a origem da janela de
// console no Windows (Remotion não passa windowsHide no spawn interno dele;
// abrir 1x em vez de 1x por job já reduz a frequência do problema a quase
// zero).
//
// Bundle: `bundle()` TIRA UM RETRATO do publicDir no momento da chamada —
// arquivos adicionados depois (ex.: o vídeo de uma sessão nova) NÃO ficam
// visíveis sem rebundlar (confirmado via 404 "could not be found" testando
// um publicDir fixo compartilhado entre sessões). Por isso:
//   - encerramento decomposto (EndingLayers — só usa o asset FIXO do
//     cliente, nunca um upload) usa 1 bundle cacheado pro resto da vida do
//     servidor (publicDir=public/, nunca muda).
//   - lote (precisa do vídeo QUE O USUÁRIO ACABOU DE SUBIR) rebundla por
//     sessão — exatamente como antes, só que sem reabrir o browser.
//
// Fila interna serializada (1 job por vez) — mesmo motivo da correção de
// concurrency:1 em renderMedia: pedidos concorrentes de frame no MESMO
// browser derrubavam o compositor Rust ("No frame found"/panic).
//
// Uso: node scripts/render-server.mjs (fica rodando; subido sob demanda por
// src/lib/renderServerClient.ts — não precisa rodar manualmente).
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, renderStill, openBrowser } from "@remotion/renderer";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.RENDER_SERVER_PORT || 39091);
const ENTRY_POINT = path.join(ROOT, "src/remotion/index.ts");
const PUBLIC_DIR = path.join(ROOT, "public");

let browser;
let fixedServeUrl; // bundle cacheado, publicDir=public/ — usado pelo encerramento decomposto.
let ready = false;

async function init() {
  console.log("[render-server] abrindo o browser (uma vez)…");
  browser = await openBrowser("chrome");
  console.log("[render-server] bundlando o encerramento decomposto (publicDir fixo, cacheado)…");
  fixedServeUrl = await bundle({ entryPoint: ENTRY_POINT, publicDir: PUBLIC_DIR });
  ready = true;
  console.log(`[render-server] pronto em http://127.0.0.1:${PORT}`);
}

// Fila: 1 job por vez, mesmo entre tipos diferentes (batch e ending-layers
// competem pelo MESMO browser compartilhado).
const queue = [];
let processing = false;
function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    pump();
  });
}
function pump() {
  if (processing) return;
  const item = queue.shift();
  if (!item) return;
  processing = true;
  item
    .fn()
    .then(item.resolve, item.reject)
    .finally(() => {
      processing = false;
      pump();
    });
}

function writeStatus(statusPath, patch) {
  const now = new Date().toISOString();
  let cur = {};
  try {
    cur = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
  } catch {
    /* 1ª escrita */
  }
  fs.writeFileSync(statusPath, JSON.stringify({ ...cur, ...patch, updatedAt: now }), "utf-8");
}

async function handleBatch(job) {
  const { sessionDir, variants, extraAssetsDir, extraAssetFiles } = job;
  const statusPath = path.join(sessionDir, "status.json");
  const logPath = path.join(sessionDir, "render.log");
  const log = (msg) => fs.appendFileSync(logPath, msg + "\n");
  const variantsDir = path.join(sessionDir, "variants");
  fs.mkdirSync(variantsDir, { recursive: true });

  // Asset(s) fixo(s) do template (ex.: print da tela do app) não nascem na
  // sessão — copia pra dentro do publicDir=sessionDir antes de bundlar
  // (publicDir é um retrato tirado NA HORA do bundle(), não serve nada
  // adicionado depois).
  if (extraAssetsDir && Array.isArray(extraAssetFiles)) {
    for (const rel of extraAssetFiles) {
      const src = path.join(extraAssetsDir, rel);
      const dest = path.join(sessionDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  const total = variants.length;
  writeStatus(statusPath, { state: "rendering", progress: 0, total, done: 0 });

  // publicDir=sessionDir — o vídeo que o usuário acabou de subir só existe
  // AQUI, então não dá pra usar o bundle fixo (ele já tirou o retrato do
  // public/ real antes dessa sessão existir). Browser continua o mesmo.
  log("[render-server] bundlando (publicDir da sessão)…");
  const serveUrl = await bundle({ entryPoint: ENTRY_POINT, publicDir: sessionDir });

  const outputs = [];
  for (let i = 0; i < total; i++) {
    const v = variants[i];
    const outputLocation = path.join(variantsDir, v.outName);
    log(`[render-server] (${i + 1}/${total}) ${v.outName} -> ${v.compositionId}`);
    try {
      const composition = await selectComposition({ serveUrl, id: v.compositionId, inputProps: v.inputProps, puppeteerInstance: browser });
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation,
        inputProps: v.inputProps,
        audioCodec: "aac",
        concurrency: 1,
        puppeteerInstance: browser,
      });
      outputs.push({ label: v.label, file: `variants/${v.outName}` });
    } catch (err) {
      log(`[render-server] FALHOU ${v.outName}: ${err instanceof Error ? err.message : err}`);
    }
    writeStatus(statusPath, { state: "rendering", progress: (i + 1) / total, total, done: i + 1, outputs });
  }

  if (outputs.length === 0) {
    writeStatus(statusPath, { state: "error", progress: 1, error: "nenhuma variação renderizou com sucesso" });
  } else {
    writeStatus(statusPath, { state: "done", progress: 1, total, done: outputs.length, outputs });
  }
  log(`[render-server] OK — ${outputs.length}/${total} variação(ões) renderizada(s).`);
}

async function handleEndingLayers(args) {
  const {
    bgCompositionId,
    headlineCompositionId,
    phoneCompositionId,
    ctaCompositionId,
    ctaSubtitleCompositionId,
    headlineCopy,
    tags,
    phoneScreenFile,
    customPublicDir,
    outPaths,
  } = args;
  // Usa o bundle FIXO (publicDir=public/) já pronto desde o init() — rápido,
  // sem rebundle. SÓ rebundla (publicDir=customPublicDir) quando o usuário
  // subiu uma tela de celular própria (2026-10-18) — esse arquivo nasceu na
  // sessão/materialsDir, invisível pro bundle fixo (retrato tirado no init()).
  const serveUrl = customPublicDir
    ? await bundle({ entryPoint: ENTRY_POINT, publicDir: customPublicDir })
    : fixedServeUrl;

  const bgInputProps = {};
  const bg = await selectComposition({ serveUrl, id: bgCompositionId, inputProps: bgInputProps, puppeteerInstance: browser });
  await renderMedia({ composition: bg, serveUrl, codec: "h264", outputLocation: outPaths.bg, inputProps: bgInputProps, concurrency: 1, puppeteerInstance: browser });

  const stills = [
    ["headline", headlineCompositionId],
    ["phone", phoneCompositionId],
    ["cta", ctaCompositionId],
    ["ctaSubtitle", ctaSubtitleCompositionId],
  ];
  for (const [key, compId] of stills) {
    const inputProps = { headlineCopy, tags, phoneScreenFile };
    const comp = await selectComposition({ serveUrl, id: compId, inputProps, puppeteerInstance: browser });
    await renderStill({ composition: comp, serveUrl, output: outPaths[key], inputProps, imageFormat: "png", puppeteerInstance: browser });
  }
}

/**
 * Endpoint GENÉRICO de camadas isoladas (2026-10-19) — generaliza
 * `handleEndingLayers` pra qualquer conjunto de composições-still, sem
 * precisar de 1 handler bespoke por template. Usado pela ponte "Editar" pra
 * decompor Ranking/Tela Dividida em camadas (ver SplitRankingLayers.tsx +
 * generateEditorBridge.ts) — sempre o bundle FIXO (publicDir=public/), essas
 * camadas são gráficos puros (headline/copy/botão/balão/overlay), nunca
 * dependem do vídeo que o usuário subiu.
 */
async function handleLayers(args) {
  const { items } = args; // [{ compositionId, inputProps, outPath }]
  for (const item of items) {
    const comp = await selectComposition({ serveUrl: fixedServeUrl, id: item.compositionId, inputProps: item.inputProps, puppeteerInstance: browser });
    await renderStill({ composition: comp, serveUrl: fixedServeUrl, output: item.outPath, inputProps: item.inputProps, imageFormat: "png", puppeteerInstance: browser });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ready }));
    return;
  }

  if (req.method === "POST" && req.url === "/render-batch") {
    readBody(req).then((body) => {
      const payload = JSON.parse(body);
      // Fire-and-forget: quem acompanha progresso é o status.json (mesmo
      // contrato de hoje, o frontend já faz polling nele).
      enqueue(() => handleBatch(payload)).catch((err) => {
        console.error("[render-server] erro não tratado no job de lote:", err);
      });
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/render-ending-layers") {
    readBody(req)
      .then((body) => enqueue(() => handleEndingLayers(JSON.parse(body))))
      .then(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch((err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }));
      });
    return;
  }

  if (req.method === "POST" && req.url === "/render-layers") {
    readBody(req)
      .then((body) => enqueue(() => handleLayers(JSON.parse(body))))
      .then(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch((err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }));
      });
    return;
  }

  res.writeHead(404);
  res.end();
});

init()
  .then(() => {
    server.listen(PORT, "127.0.0.1");
  })
  .catch((err) => {
    console.error("[render-server] falha fatal ao iniciar:", err);
    process.exit(1);
  });
