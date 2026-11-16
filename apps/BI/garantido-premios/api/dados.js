// Proxy pros data-*.json — mesmo padrão do BI do Império
// (apps/BI/imperio-premios/api/dados.js), criado 2026-11-03 pra tirar o
// "vercel --prod" do ciclo de refresh (limite de 100 deploys/dia é
// compartilhado entre TODOS os projetos da conta Vercel).
//
// bi_aggregator.py publica os 4 data-*.json no bucket PRIVADO "bi-dados"
// do Supabase da Garantido — esta função busca de lá com a service role
// key (nunca exposta ao navegador) e devolve pro frontend. Protegida pelo
// middleware.js igual qualquer outra rota (cookie bi_auth); não precisa
// checar senha de novo aqui.
export const config = { runtime: 'edge' };

const SUPABASE_URL = (process.env.GARANTIDO_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.GARANTIDO_SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'bi-dados';
const TIPOS_VALIDOS = new Set(['executiva', 'operacional', 'produto', 'qualidade']);

export default async function handler(request) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') || '';

  if (!TIPOS_VALIDOS.has(tipo)) {
    return new Response(JSON.stringify({ erro: 'tipo inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ erro: 'dados não configurados (env vars ausentes)' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const objeto = `data-${tipo}.json`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objeto}?t=${Date.now()}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ erro: 'dado indisponível', status: res.status }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const corpo = await res.text();
  return new Response(corpo, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
