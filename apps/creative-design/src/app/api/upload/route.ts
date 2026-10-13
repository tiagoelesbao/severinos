import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Imagens enviadas vão para public/render-assets — servidas em /render-assets/*.
const ASSETS_DIR = path.join(process.cwd(), 'public', 'render-assets');

/** POST /api/upload — recebe uma imagem (multipart) e devolve a URL pública. */
export async function POST(request: Request) {
  let file: unknown;
  try {
    const form = await request.formData();
    file = form.get('file');
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'arquivo ausente' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'só imagens são aceitas' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const ext = (file.name.split('.').pop() || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'png';
  const name = `upload_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(ASSETS_DIR, name), buffer);

  return NextResponse.json({ url: `/render-assets/${name}` });
}
