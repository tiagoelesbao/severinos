import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Raiz do repositório (cwd do dev server = apps/creative-design).
const REPO_ROOT = path.join(process.cwd(), '..', '..');
const ORCHESTRATOR = 'squads/virals-marketing-squad/scripts/orchestrate_carousel.py';

/**
 * POST /api/export — re-renderiza o criativo (Playwright, alta qualidade)
 * disparando o orquestrador sobre o brief salvo.
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

  return new Promise<Response>((resolve) => {
    const proc = spawn(
      'python',
      [ORCHESTRATOR, briefPath, '--image-mode=pexels'],
      { cwd: REPO_ROOT },
    );
    let log = '';
    proc.stdout.on('data', (d) => { log += d.toString(); });
    proc.stderr.on('data', (d) => { log += d.toString(); });
    proc.on('error', (e) => {
      resolve(NextResponse.json({ ok: false, error: String(e) }, { status: 500 }));
    });
    proc.on('close', (code) => {
      resolve(NextResponse.json({
        ok: code === 0,
        code,
        log: log.slice(-2000),
      }));
    });
  });
}
