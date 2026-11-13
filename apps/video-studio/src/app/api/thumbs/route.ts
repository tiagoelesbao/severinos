import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { materialsDirFor, studioAssetsDirFor } from "@/lib/ingest";

// VEX-08: gera uma miniatura (1 frame) de um clipe de vídeo via ffmpeg, com
// cache em disco (.thumbs/ na pasta do criativo, gitignored). Usado pelo
// filmstrip da timeline. O Player não acessa o filesystem — a UI pede aqui.
export const runtime = "nodejs";

const REPO = path.resolve(process.cwd(), "../..");
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);
// A espinha do dark-room é IMAGEM PARADA, e o filmstrip da timeline pede miniatura
// de todo clipe. Sem as imagens aqui, cada still devolvia 400 e a faixa ficava vazia.
// Para imagem o parâmetro `t` é ignorado: não há linha do tempo dentro do arquivo.
const IMAGEM = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp"]);
const aceito = (ext: string) => VIDEO.has(ext) || IMAGEM.has(ext);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const client = sp.get("client") || "";
  const creative = sp.get("creative") || "";
  const file = path.basename(sp.get("file") || ""); // só o basename — sem traversal
  const t = Math.max(0, Number(sp.get("t") || "0"));
  const h = Math.min(180, Math.max(32, Number(sp.get("h") || "72")));
  const fromUploads = sp.get("assets") === "1";

  if (!SLUG.test(client) || !SLUG.test(creative)) {
    return new Response("bad request", { status: 400 });
  }
  const ext = path.extname(file).toLowerCase();
  if (!file || !aceito(ext) || !Number.isFinite(t)) {
    return new Response("bad request", { status: 400 });
  }

  const dir = fromUploads
    ? studioAssetsDirFor(REPO, client, creative)
    : materialsDirFor(REPO, client, creative);
  const input = path.join(dir, file);
  // Segurança: o arquivo tem que estar dentro da pasta resolvida.
  if (!path.resolve(input).startsWith(path.resolve(dir) + path.sep)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!fs.existsSync(input)) return new Response("not found", { status: 404 });

  const cacheDir = path.join(dir, ".thumbs");
  const ehImagem = IMAGEM.has(ext);
  // Imagem tem UMA miniatura, nao uma por instante: incluir `t` na chave
  // geraria um arquivo por posicao do filmstrip, para o mesmo quadro.
  const key = ehImagem
    ? `${file.replace(/[^a-z0-9._-]/gi, "_")}__h${h}.jpg`
    : `${file.replace(/[^a-z0-9._-]/gi, "_")}__t${t.toFixed(2)}__h${h}.jpg`;
  const out = path.join(cacheDir, key);

  if (!fs.existsSync(out)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      /* segue — ffmpeg falha e retornamos 500 */
    }
    // -ss antes de -i = seek rápido (por keyframe, suficiente para thumbnail).
    // scale=-2:h mantém o aspect com largura par. windowsHide: sem console piscando.
    const extrair = (args: string[]) =>
      spawnSync(
        "ffmpeg",
        ["-hide_banner", "-loglevel", "error", ...args, "-i", input,
         "-frames:v", "1", "-vf", `scale=-2:${h}`, "-q:v", "6", "-y", out],
        { windowsHide: true, timeout: 20000 },
      );

    // Imagem nao tem seek: `-ss` num png faz o ffmpeg pular alem do unico quadro
    // e devolver arquivo vazio.
    let r = ehImagem ? extrair([]) : extrair(["-ss", String(t)]);
    if (!ehImagem && (r.status !== 0 || !fs.existsSync(out))) {
      // O CLIPE PODE SER MAIS LONGO QUE A MÍDIA. A montagem estende o último take
      // clonando o quadro final (o `tpad` do ffmpeg), então a faixa da timeline pede
      // miniatura DEPOIS do fim do arquivo — e o seek falhava com 500 a cada pedido,
      // enchendo o console de erro numa tela que estava certa. O último quadro é
      // exatamente o que o vídeo mostra ali; é ele que a miniatura deve trazer.
      r = extrair(["-sseof", "-0.2"]);
    }
    if (r.status !== 0 || !fs.existsSync(out)) {
      return new Response("thumb failed", { status: 500 });
    }
  }

  return new Response(fs.readFileSync(out), {
    headers: {
      "Content-Type": "image/jpeg",
      // imutável: a chave inclui file+t+h; mudou o corte → nova URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
