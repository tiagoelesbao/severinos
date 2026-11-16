import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

// Diretório dos briefs (relativo ao cwd do dev server = apps/creative-design).
const DATA_DIR = path.join(
  process.cwd(), '..', '..',
  'squads', 'virals-marketing-squad', 'data',
);
const REGISTRY_PATH = path.join(DATA_DIR, 'clients', '_registry.yaml');

/**
 * Resolve o cliente associado a um brief, com fallback hierárquico:
 *   1. `client_slug` direto no root (briefs gerados pós-MKT-MC-01)
 *   2. Parse de `carousel_brief.brand_config` → `clients/<slug>/brand-config.yaml`
 *   3. Default: "virals" (back-compat)
 */
function resolveClient(brief: Record<string, unknown>): { slug: string; display: string } {
  const cs = brief?.client_slug as string | undefined;
  const cn = brief?.client_nome as string | undefined;
  if (cs) return { slug: cs, display: cn || cs };

  const bc = (brief?.carousel_brief as Record<string, unknown> | undefined)?.brand_config as string | undefined
    ?? (brief?.brand_config as string | undefined);
  if (bc) {
    const m = bc.match(/clients[\\/]([^\\/]+)[\\/]brand-config/);
    if (m) return { slug: m[1], display: m[1] };
  }
  return { slug: 'virals', display: 'virals' };
}

/** Lê o display name + handle dos clientes do registry para enriquecer a resposta. */
function loadClientInfoMap(): Record<string, { display: string; handle: string }> {
  try {
    const txt = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const data = parse(txt) as {
      clients?: Record<string, { nome_exibicao?: string; handle_instagram?: string }>;
    } | undefined;
    const out: Record<string, { display: string; handle: string }> = {};
    const clients = data?.clients ?? {};
    for (const [slug, entry] of Object.entries(clients)) {
      out[slug] = {
        display: entry?.nome_exibicao || slug,
        handle: entry?.handle_instagram || '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** GET /api/briefs — lista os criativos (briefs v5) disponíveis com o cliente resolvido. */
export async function GET(req: Request) {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DATA_DIR)
      .filter((f) => f.startsWith('brief-v5') && f.endsWith('.yaml'));
  } catch {
    return NextResponse.json(
      { error: 'Diretório de briefs não encontrado', briefs: [], clients: [] },
      { status: 500 },
    );
  }

  const infoMap = loadClientInfoMap();
  const url = new URL(req.url);
  const filterClient = (url.searchParams.get('client') || '').trim();

  const briefs = files.map((f) => {
    const id = f.replace(/\.yaml$/, '');
    let archetype = 'news';
    let slideCount = 0;
    let theme = '';
    let client = {
      slug: 'virals',
      display: infoMap['virals']?.display || 'virals',
      handle: infoMap['virals']?.handle || '',
    };
    try {
      const data = parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')) as Record<string, unknown>;
      archetype = (data?.archetype as string) ?? 'news';
      slideCount = Array.isArray(data?.content_data) ? (data.content_data as unknown[]).length : 0;
      theme = (data?.central_theme as string)
        ?? ((data?.carousel_brief as Record<string, unknown>)?.tema as string)
        ?? '';
      const resolved = resolveClient(data);
      client = {
        slug: resolved.slug,
        display: infoMap[resolved.slug]?.display || resolved.display,
        handle: infoMap[resolved.slug]?.handle || '',
      };
    } catch {
      /* brief malformado — entra na lista com defaults */
    }
    return { id, file: f, archetype, slideCount, theme, client };
  });

  // Lista dos clientes detectados (para construir as tabs no editor).
  // Mantém a ordem do registry quando possível, depois clients descobertos.
  const detected = new Set(briefs.map((b) => b.client.slug));
  const clients: Array<{ slug: string; display: string; handle: string; count: number }> = [];
  for (const slug of Object.keys(infoMap)) {
    if (detected.has(slug)) {
      clients.push({
        slug,
        display: infoMap[slug].display,
        handle: infoMap[slug].handle,
        count: briefs.filter((b) => b.client.slug === slug).length,
      });
    }
  }
  for (const slug of detected) {
    if (!clients.find((c) => c.slug === slug)) {
      clients.push({
        slug,
        display: infoMap[slug]?.display || slug,
        handle: infoMap[slug]?.handle || '',
        count: briefs.filter((b) => b.client.slug === slug).length,
      });
    }
  }

  // Aplica filtro opcional de cliente (?client=<slug>)
  const filtered = filterClient
    ? briefs.filter((b) => b.client.slug === filterClient)
    : briefs;

  return NextResponse.json({ briefs: filtered, clients, total: briefs.length });
}
