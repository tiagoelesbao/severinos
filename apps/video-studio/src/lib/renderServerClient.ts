import { spawn } from "node:child_process";
import path from "node:path";

/**
 * Cliente do servidor de render persistente (scripts/render-server.mjs) —
 * substitui o padrão antigo de "spawn um processo novo por job" (que
 * rebundlava o Remotion E reabria o Chrome a cada render — causa raiz da
 * lentidão e das janelas de console piscando no Windows, pedido do founder
 * 2026-10-18). Sobe o servidor sob demanda na 1ª chamada da sessão de dev;
 * depois disso é só HTTP local.
 *
 * SEM import de @remotion/bundler/@remotion/renderer aqui — este módulo é
 * importado por API routes do Next (Turbopack), e aquele import quebra o
 * bundle (ver nota em generateEditorBridge.ts / next.config.ts). O Remotion
 * só é importado dentro de scripts/render-server.mjs, que roda como
 * processo filho, nunca dentro do grafo de módulos do Next.
 */

const PORT = Number(process.env.RENDER_SERVER_PORT || 39091);
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function isHealthy(timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const data = (await res.json()) as { ready?: boolean };
    return Boolean(data.ready);
  } catch {
    return false;
  }
}

let starting: Promise<void> | null = null;

/** Garante que o render-server está de pé, subindo-o (detached) se preciso. */
export async function ensureRenderServer(): Promise<void> {
  if (await isHealthy(800)) return;
  if (!starting) {
    starting = (async () => {
      const worker = path.join(process.cwd(), "scripts", "render-server.mjs");
      const child = spawn(process.execPath, [worker], {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, RENDER_SERVER_PORT: String(PORT) },
      });
      child.unref();
      // Bundle + abrir o browser demora alguns segundos na 1ª vez — espera
      // ficar pronto em vez de travar pra sempre num erro de conexão.
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        if (await isHealthy(1500)) return;
        await new Promise((r) => setTimeout(r, 400));
      }
      throw new Error("render-server não ficou pronto em 60s — ver scripts/render-server.mjs");
    })().finally(() => {
      starting = null;
    });
  }
  return starting;
}

async function post(endpoint: string, payload: Record<string, unknown>): Promise<void> {
  await ensureRenderServer();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `render-server respondeu ${res.status} em ${endpoint}`);
  }
}

/** Dispara o render em lote (fire-and-forget — status.json é quem informa progresso). */
export function submitBatchJob(payload: Record<string, unknown>): Promise<void> {
  return post("/render-batch", payload);
}

/** Renderiza as camadas isoladas do encerramento (aguarda terminar). */
export function submitEndingLayersJob(payload: Record<string, unknown>): Promise<void> {
  return post("/render-ending-layers", payload);
}

/** Renderiza um conjunto genérico de camadas-still (Ranking/Tela Dividida —
 * ver SplitRankingLayers.tsx). `items`: [{ compositionId, inputProps, outPath }]. */
export function submitLayersJob(items: { compositionId: string; inputProps: Record<string, unknown>; outPath: string }[]): Promise<void> {
  return post("/render-layers", { items });
}
