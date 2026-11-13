// Redireciona /l/{codigo} -> URL original + UTM fixo do grupo. Lê via
// Supabase REST com a service role key (mesma fonte que api/create.js
// grava) — migrado do Edge Config em 2026-10-07 (cota de escrita
// esgotada no plano free da Vercel).
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.IMPERIO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY;
const UTM_SUFFIXO = { utm_source: 'whatsapp', utm_medium: 'community', utm_campaign: 'grupo-principal' };

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('code');

  if (!codigo || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Link não encontrado', { status: 404 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/short_links?code=eq.${encodeURIComponent(codigo)}&select=url&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return new Response('Link não encontrado', { status: 404 });
  }

  const linhas = await res.json();
  const urlOriginal = linhas && linhas[0] && linhas[0].url;
  if (!urlOriginal) {
    return new Response('Link não encontrado', { status: 404 });
  }

  const destino = new URL(urlOriginal);
  for (const [k, v] of Object.entries(UTM_SUFFIXO)) {
    destino.searchParams.set(k, v);
  }

  return Response.redirect(destino.toString(), 302);
}
