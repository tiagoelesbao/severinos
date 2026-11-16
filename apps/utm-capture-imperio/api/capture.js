// Recebe o beacon disparado pelo script injetado via GTM (container
// GTM-WKWZZWC8) na ENTRADA de qualquer página que chegue com UTM na URL.
// Grava {fbp, utm_*, landing_url} no Supabase, por fbp — não por order_id,
// porque nesse momento o pedido ainda nem existe.
//
// Por que isso existe (achado 2026-10-08, ver gates-status.yaml): nem a
// API REST do cliente nem o payload do webhook order.paid trazem UTM
// preenchida em NENHUM pedido real, mesmo com clique de anúncio
// confirmado e recente — a plataforma não persiste isso em lugar nenhum
// do fluxo dela. fbp (cookie do Pixel) já está presente em ~93% dos
// pedidos reais (auditado antes nesta sessão) e é estável entre sessões —
// é a chave de correlação que não depende da plataforma cooperar.
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.IMPERIO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

// Achado 2026-10-22: domínio da plataforma trocou (imperiopremioss.com,
// morto/DNS confirmado NXDOMAIN -> rapidinhas24hr.com). Allowlist em vez de
// origem fixa, pra não repetir o mesmo problema na próxima troca — e pra
// cobrir os dois durante a transição (cache/link antigo ainda podendo
// bater aqui por um tempo).
const ORIGENS_PERMITIDAS = ['https://rapidinhas24hr.com', 'https://imperiopremioss.com'];

function cors(res, origin) {
  res.headers.set('Access-Control-Allow-Origin', ORIGENS_PERMITIDAS.includes(origin) ? origin : ORIGENS_PERMITIDAS[0]);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') {
    return cors(new Response(null, { status: 204 }), origin);
  }
  if (request.method !== 'POST') {
    return cors(new Response('Method Not Allowed', { status: 405 }), origin);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return cors(new Response(JSON.stringify({ ok: false }), { status: 200 }), origin);
  }

  let rawText = '';
  let body;
  try {
    // sendBeacon manda Content-Type text/plain por padrão — não dá pra
    // contar com request.json() funcionar sempre, lê como texto primeiro.
    rawText = await request.text();
    body = JSON.parse(rawText);
  } catch {
    console.log('capture DEBUG JSON invalido, raw:', rawText);
    return cors(new Response(JSON.stringify({ ok: false, erro: 'JSON inválido' }), { status: 200 }), origin);
  }

  console.log('capture DEBUG body cru:', JSON.stringify(body));

  const fbp = (body.fbp || '').trim();
  if (!fbp) {
    console.log('capture DEBUG rejeitado: fbp ausente');
    return cors(new Response(JSON.stringify({ ok: false, erro: 'fbp ausente' }), { status: 200 }), origin);
  }
  const fbc = (body.fbc || '').trim();
  const temAlgumaUtm = UTM_KEYS.some((k) => body[k]);
  // Acorda 2026-10-08: além de UTM, agora também capturamos fbc genuíno do
  // cookie (ver gates-status.yaml — a plataforma regrava o fbc do pedido
  // com timestamp sempre "fresco", inviabilizando o filtro de idade do
  // clique no capi_client.py). O cookie _fbc do navegador, lido direto
  // aqui, não passa por essa corrupção — então vale capturar mesmo sem UTM
  // na URL, só pra manter o fbc mais recente conhecido por fbp sempre
  // atualizado.
  if (!temAlgumaUtm && !fbc) {
    console.log('capture DEBUG rejeitado: sem utm e sem fbc');
    return cors(new Response(JSON.stringify({ ok: false, erro: 'sem utm e sem fbc' }), { status: 200 }), origin);
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/utm_touches`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        fbp,
        fbc: fbc || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        landing_url: body.landing_url || null,
      }),
    });
    if (!resp.ok) {
      console.log('capture DEBUG supabase erro:', resp.status, await resp.text());
    } else {
      console.log('capture DEBUG supabase ok, status', resp.status);
    }
  } catch (e) {
    console.log('capture DEBUG supabase fetch throw:', String(e));
    // best-effort — beacon não espera resposta útil, nunca derruba a página do cliente
  }

  return cors(new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }), origin);
}
