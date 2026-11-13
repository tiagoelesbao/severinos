// Botão "Sincronizar agora" da Visão Executiva — pedido 2026-10-07 do founder
// pra não depender só do ciclo de 15min. O refresh de verdade (puxar API do
// cliente + Meta Ads + redeploy) só roda na máquina Windows local (precisa
// das credenciais do .env e do CLI da Vercel); esta função só grava um sinal
// compartilhado — uma tarefa agendada local (BI-Imperio-SyncCheck, a cada
// 1min) lê esse sinal e dispara o refresh de verdade. GET devolve o status
// pro frontend saber se já rodou.
//
// MIGRADO 2026-10-24 (pedido do founder) de Edge Config pra Supabase
// Storage: o Edge Config (chave "bi_sync", mesmo store do link-imperio)
// bateu no limite de escrita do plano Free da Vercel (429 rate_limited,
// "more than 250" updates/mês, trava 30 dias) — provavelmente só de uso
// normal deste botão ao longo do tempo. Storage não tem esse limite, mesmo
// padrão já provado em `snapshot_sorteios.py` (catálogo de sorteios) e em
// `toggle-pause.js` (flag de pausa). Mesmo bucket público "catalogo",
// objeto próprio "bi_sync.json" — contrato do JSON idêntico ao de antes
// ({requested, requested_at, last_synced_at}), então o frontend (nav.js)
// não precisou mudar nada.
export const config = { runtime: 'edge' };

const SUPABASE_URL = (process.env.IMPERIO_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'catalogo';
const OBJETO = 'bi_sync.json';
const COOLDOWN_MS = 60 * 1000; // não deixa pedir de novo antes de 1min

async function lerSinal() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJETO}?t=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { requested: false, requested_at: null, last_synced_at: null };
  try {
    return await res.json();
  } catch {
    return { requested: false, requested_at: null, last_synced_at: null };
  }
}

async function gravarSinal(valor) {
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
    return new Response(JSON.stringify({ ok: false, erro: 'sync não configurado (env vars ausentes)' }), { status: 500 });
  }

  if (request.method === 'GET') {
    const sinal = await lerSinal();
    return new Response(JSON.stringify({ ok: true, ...sinal }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const sinal = await lerSinal();
  const agora = Date.now();
  const pedidoRecente = sinal.requested_at && (agora - new Date(sinal.requested_at).getTime()) < COOLDOWN_MS;
  if (sinal.requested || pedidoRecente) {
    return new Response(JSON.stringify({ ok: false, erro: 'sincronização já solicitada — aguarde terminar antes de pedir de novo' }), { status: 429 });
  }

  try {
    const solicitadoEm = new Date().toISOString();
    await gravarSinal({ requested: true, requested_at: solicitadoEm, last_synced_at: sinal.last_synced_at || null });
    return new Response(JSON.stringify({ ok: true, solicitado_em: solicitadoEm }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: String(err?.message || err) }), { status: 500 });
  }
}
