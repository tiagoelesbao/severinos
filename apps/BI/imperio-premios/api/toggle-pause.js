// Flag self-service "pausar pontos de contato" (login automático na API do
// cliente) — pedido 2026-10-24 do founder: testando login manual no painel
// da plataforma, a sessão dele caía porque os 5 jobs agendados (CAPI
// Realtime/InitiateCheckout, BI Refresh/SyncCheck, Catálogo Snapshot) ficam
// relogando em paralelo. Antes disso eu desativava/reativava as 5 Scheduled
// Tasks do Windows manualmente por pedido no chat — essa rota + o botão no
// nav tiram essa dependência: o founder liga/desliga ele mesmo, na hora que
// quiser, sem precisar me chamar.
//
// Por que Supabase Storage e não o Edge Config (como o botão "Sincronizar
// agora" usa, api/solicitar-sync.js): tentei o mesmo Edge Config store
// primeiro e bati no limite de escrita do plano Free (429 rate_limited,
// "more than 250" updates/mês, trava por 30 dias) — provavelmente já quase
// no teto só com o uso normal do botão de sync. Storage não tem esse limite
// de updates (mesmo padrão já usado e provado por
// services/Meta/imperio-premios/snapshot_sorteios.py pro catálogo de
// sorteios: bucket "catalogo", objeto JSON com x-upsert, service role key).
// Objeto PÚBLICO de propósito (mesmo bucket do catálogo) — não tem dado
// sensível, só {paused, paused_at, paused_by}.
export const config = { runtime: 'edge' };

const SUPABASE_URL = (process.env.IMPERIO_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'catalogo';
const OBJETO = 'bi_paused.json';

async function lerFlag() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJETO}?t=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { paused: false, paused_at: null, paused_by: null };
  try {
    return await res.json();
  } catch {
    return { paused: false, paused_at: null, paused_by: null };
  }
}

async function gravarFlag(valor) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJETO}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(valor),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    throw new Error(`Supabase Storage respondeu ${res.status}: ${corpo.slice(0, 200)}`);
  }
}

export default async function handler(request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ ok: false, erro: 'não configurado (env vars ausentes)' }), { status: 500 });
  }

  if (request.method === 'GET') {
    const flag = await lerFlag();
    return new Response(JSON.stringify({ ok: true, ...flag }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* corpo vazio/inválido — tratado abaixo */
  }
  const novoEstado = typeof body.paused === 'boolean' ? body.paused : null;
  if (novoEstado === null) {
    return new Response(JSON.stringify({ ok: false, erro: 'corpo precisa de {"paused": true|false}' }), { status: 400 });
  }

  try {
    const valor = { paused: novoEstado, paused_at: new Date().toISOString(), paused_by: 'dashboard' };
    await gravarFlag(valor);
    return new Response(JSON.stringify({ ok: true, ...valor }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: String(err?.message || err) }), { status: 500 });
  }
}
