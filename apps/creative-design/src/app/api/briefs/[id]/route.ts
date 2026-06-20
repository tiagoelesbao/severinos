import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

const REPO_ROOT = path.join(process.cwd(), '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'squads', 'virals-marketing-squad', 'data');
const OUTPUTS_DIR = path.join(REPO_ROOT, 'outputs');

/** Deriva o "slug" do criativo a partir do id do brief. */
function deriveIdSlug(id: string): string {
  return id.replace(/^brief-v5-single-/, '').replace(/^brief-v5-/, '').trim();
}

/**
 * Remove as pastas de output (carousels/posts) associadas a um criativo, em
 * QUALQUER cliente, casando por slug exato OU sufixo (o output usa prefixo
 * "v5-precision-<idSlug>"). Path-safe: só remove dentro de outputs/.
 */
function purgeOutputDirs(slugs: string[], idSlug: string): string[] {
  const removed: string[] = [];
  const outputsAbs = path.resolve(OUTPUTS_DIR);
  if (!fs.existsSync(outputsAbs)) return removed;
  const exactSlugs = new Set(slugs.filter(Boolean));
  const matchable = idSlug && idSlug.length >= 4 ? idSlug : null;

  let clients: string[] = [];
  try {
    clients = fs.readdirSync(outputsAbs, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch { return removed; }

  for (const client of clients) {
    for (const kind of ['carousels', 'posts']) {
      const base = path.join(outputsAbs, client, kind);
      if (!fs.existsSync(base)) continue;
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        const isMatch = exactSlugs.has(name)
          || (matchable !== null && (name === matchable || name.endsWith(`-${matchable}`) || name.endsWith(matchable)));
        if (!isMatch) continue;
        const abs = path.resolve(path.join(base, name));
        // Segurança: garante que o alvo está sob outputs/.
        if (!abs.startsWith(outputsAbs + path.sep)) continue;
        try {
          fs.rmSync(abs, { recursive: true, force: true });
          removed.push(path.relative(REPO_ROOT, abs).replace(/\\/g, '/'));
        } catch { /* segue limpando os demais */ }
      }
    }
  }
  return removed;
}

interface EditedSlide {
  slide_n: number;
  headline: string;
  sub_headline: string;
  body_text: string;
  headlineFontSize: number | null;
  bodyFontSize: number | null;
  mainObjectImage: string | null;
  imageZoom: number;
  imagePosX: number;
  imagePosY: number;
  /** Creative Studio (MED-05) — modelo de camadas standalone (legado) + fundo. */
  layers?: unknown[];
  background?: unknown;
  /** Creative Studio v2 — template por slide + conteúdo + sobreposições. */
  template_id?: string;
  accent_color?: string;
  number?: string;
  unit_suffix?: string;
  call_to_think?: string;
  variant?: string;
  overlay_layers?: unknown[];
}

function briefFile(id: string): string | null {
  if (!/^[\w.-]+$/.test(id)) return null;
  return path.join(DATA_DIR, `${id}.yaml`);
}

/** GET /api/briefs/[id] — devolve um brief individual como JSON. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const file = briefFile(id);
  if (!file) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'brief não encontrado' }, { status: 404 });
  }
  try {
    return NextResponse.json(parse(fs.readFileSync(file, 'utf-8')));
  } catch {
    return NextResponse.json({ error: 'falha ao ler o brief' }, { status: 500 });
  }
}

/** POST /api/briefs/[id] — grava as edições do Editor no brief (sobrescreve). */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const file = briefFile(id);
  if (!file) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'brief não encontrado' }, { status: 404 });
  }

  let body: { slides?: EditedSlide[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }

  try {
    const brief = parse(fs.readFileSync(file, 'utf-8'));
    const incoming = body.slides ?? [];
    const edits = new Map(incoming.map((s) => [s.slide_n, s]));
    const original: Array<Record<string, unknown>> = brief.content_data ?? [];

    // 1. Aplica edições nos slides que continuam no payload.
    for (const cd of original) {
      const e = edits.get(cd.slide_n as number);
      if (!e) continue;
      cd.headline = e.headline;
      cd.sub_headline = e.sub_headline;
      cd.body_text = e.body_text;
      cd.headline_font_size = e.headlineFontSize ?? null;
      cd.body_font_size = e.bodyFontSize ?? null;
      cd.image_url = e.mainObjectImage ?? null;
      cd.image_zoom = e.imageZoom ?? 1;
      cd.image_pos_x = e.imagePosX ?? 50;
      cd.image_pos_y = e.imagePosY ?? 50;
      // Creative Studio (MED-05): persiste camadas + fundo quando presentes.
      if (e.layers !== undefined) cd.layers = e.layers;
      if (e.background !== undefined) cd.background = e.background;
      // Creative Studio v2: template por slide + conteúdo + sobreposições.
      if (e.template_id !== undefined) cd.template_id = e.template_id;
      if (e.accent_color !== undefined) cd.accent_color = e.accent_color;
      if (e.number !== undefined) cd.number = e.number;
      if (e.unit_suffix !== undefined) cd.unit_suffix = e.unit_suffix;
      if (e.call_to_think !== undefined) cd.call_to_think = e.call_to_think;
      if (e.variant !== undefined) cd.variant = e.variant;
      if (e.overlay_layers !== undefined) cd.overlay_layers = e.overlay_layers;
    }

    // 2. Filtra removidos (presentes no brief, ausentes no payload do Editor).
    //    Preserva a ordem original; mantém slide_n original em `source_slide_n`
    //    para rastrear o screenshot/benchmark de origem.
    const kept = original.filter(
      (cd) => edits.has(cd.slide_n as number),
    );
    const removedSlides: number[] = original
      .filter((cd) => !edits.has(cd.slide_n as number))
      .map((cd) => cd.slide_n as number);

    // 3. Renumera sequencialmente (1..N) — evita gaps na sequência final
    //    e mantém o display do Editor/Render consistente.
    kept.forEach((cd, i) => {
      if (cd.source_slide_n == null) cd.source_slide_n = cd.slide_n;
      cd.slide_n = i + 1;
    });
    brief.content_data = kept;

    // 4. Auditoria mínima da edição.
    brief.edited_at = new Date().toISOString();
    if (removedSlides.length > 0) {
      brief._validation = brief._validation ?? {};
      brief._validation.slides_removed_via_editor = [
        ...(brief._validation.slides_removed_via_editor ?? []),
        ...removedSlides,
      ];
      brief._validation.slide_count_after_edit = kept.length;
    }

    fs.writeFileSync(file, stringify(brief));
    return NextResponse.json({
      ok: true,
      slide_count: kept.length,
      removed: removedSlides,
    });
  } catch {
    return NextResponse.json({ error: 'falha ao salvar o brief' }, { status: 500 });
  }
}

/**
 * DELETE /api/briefs/[id] — exclui o criativo POR COMPLETO do sistema:
 *   1. O arquivo de brief YAML.
 *   2. Todas as pastas de output renderizado (carousels/posts) do criativo,
 *      em qualquer cliente — evitando acúmulo de arquivos órfãos.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const file = briefFile(id);
  if (!file) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

  const idSlug = deriveIdSlug(id);
  const slugs: string[] = [];

  // Lê o brief ANTES de apagar para descobrir o slug usado nos outputs.
  const briefExisted = fs.existsSync(file);
  if (briefExisted) {
    try {
      const brief = parse(fs.readFileSync(file, 'utf-8')) ?? {};
      const cSlug = brief?.carousel_brief?.slug;
      const pSlug = brief?.post_brief?.slug;
      if (typeof cSlug === 'string') slugs.push(cSlug);
      if (typeof pSlug === 'string') slugs.push(pSlug);
    } catch { /* brief ilegível — segue com o idSlug */ }
  }
  if (idSlug) slugs.push(idSlug);

  let briefRemoved = false;
  try {
    if (briefExisted) { fs.unlinkSync(file); briefRemoved = true; }
  } catch {
    return NextResponse.json({ error: 'falha ao deletar o brief' }, { status: 500 });
  }

  const removedDirs = purgeOutputDirs(slugs, idSlug);

  if (!briefRemoved && removedDirs.length === 0) {
    return NextResponse.json({ error: 'criativo não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    brief_removed: briefRemoved,
    output_dirs_removed: removedDirs,
  });
}
