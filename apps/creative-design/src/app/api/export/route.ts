import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Raiz do repositório (cwd do dev server = apps/creative-design).
const REPO_ROOT = path.join(process.cwd(), '..', '..');
const ORCHESTRATOR = 'squads/virals-marketing-squad/scripts/orchestrate_carousel.py';

type SyncResult = { ok: boolean; count?: number; reason?: string };

/** Roda sync-creatives.js by-brief e devolve o resultado estruturado — o
 * CLI já imprime `console.log(JSON.stringify(res))` como última linha do
 * stdout, então parseamos isso em vez de tratar o log como texto opaco.
 * AGUARDADO (não fire-and-forget): antes disso, uma falha de sync (ex.:
 * criativo sem Lote aprovado, testado fora do fluxo real) acontecia calada
 * — só aparecia no terminal do servidor, nunca na tela do founder. Ele
 * reportou 2026-08-17 que achou que o reexport tinha ido pro ClickUp e não
 * tinha ido — silêncio no lugar de aviso é pior que esperar mais 1-2s. */
function runSync(id: string): Promise<SyncResult> {
  return new Promise((resolve) => {
    const sync = spawn(
      'node',
      ['services/ETL/Load/sync-creatives.js', 'by-brief', id],
      { cwd: REPO_ROOT },
    );
    let out = '';
    sync.stdout.on('data', (d) => { out += d.toString(); });
    sync.stderr.on('data', (d) => { out += d.toString(); });
    sync.on('error', (e) => resolve({ ok: false, reason: String(e) }));
    sync.on('close', () => {
      // console.log(JSON.stringify(res, null, 2)) sempre imprime por último,
      // com "{" sozinho numa linha abrindo o objeto — não usar um regex guloso
      // desde o PRIMEIRO "{" da saída inteira: linhas de log anteriores (ex.:
      // o dotenv injetando env imprime "{ path: '...' }") também têm chaves e
      // quebravam o parse, fazendo todo sync bem-sucedido cair no fallback de
      // erro (bug real visto em produção 2026-08-17).
      const lines = out.split('\n');
      const openIdx = lines.map((l) => l.trim()).lastIndexOf('{');
      if (openIdx !== -1) {
        try {
          const parsed = JSON.parse(lines.slice(openIdx).join('\n'));
          resolve({ ok: !!parsed.ok, count: parsed.count, reason: parsed.reason });
          return;
        } catch {
          /* cai pro fallback abaixo */
        }
      }
      resolve({ ok: false, reason: out.slice(-500) || 'sem saída do sync-creatives.js' });
    });
  });
}

/**
 * POST /api/export — re-renderiza o criativo (Playwright, alta qualidade)
 * disparando o orquestrador sobre o brief salvo, e sincroniza o resultado
 * com o ClickUp (se esse criativo estiver vinculado a alguma task).
 */
export async function POST(request: Request) {
  let id = '';
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }
  if (!id || !/^[\w.-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const briefPath = `squads/virals-marketing-squad/data/${id}.yaml`;

  // orchestrate_carousel.py confere o serviço de render em RENDER_BASE_URL
  // (default http://localhost:3001) ANTES de renderizar — mas esse serviço
  // é o PRÓPRIO app Next.js respondendo essa rota. Se o dev server estiver
  // rodando noutra porta (ex.: 3000), o check falha sempre e todo export dá
  // "Falha no export" sem exceção — bug real visto em produção 2026-08-17,
  // o founder rodando em :3000 nunca conseguia exportar. Deriva a porta
  // certa do próprio request em vez de depender do default fixo.
  const renderBaseUrl = new URL(request.url).origin;

  const renderResult = await new Promise<{ ok: boolean; code: number | null; log: string }>((resolve) => {
    const proc = spawn(
      'python',
      [ORCHESTRATOR, briefPath, '--image-mode=pexels'],
      { cwd: REPO_ROOT, env: { ...process.env, RENDER_BASE_URL: renderBaseUrl } },
    );
    let log = '';
    proc.stdout.on('data', (d) => { log += d.toString(); });
    proc.stderr.on('data', (d) => { log += d.toString(); });
    proc.on('error', (e) => resolve({ ok: false, code: null, log: String(e) }));
    proc.on('close', (code) => resolve({ ok: code === 0, code, log: log.slice(-2000) }));
  });

  if (!renderResult.ok) {
    return NextResponse.json({ ok: false, code: renderResult.code, log: renderResult.log });
  }

  const sync = await runSync(id);
  return NextResponse.json({ ok: true, code: renderResult.code, log: renderResult.log, sync });
}
