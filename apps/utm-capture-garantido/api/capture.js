// Recebe o beacon disparado pelo script injetado via GTM (container novo da
// Garantido, duplicado do GTM-58RGNFCK do Império) na ENTRADA de qualquer
// página que chegue com UTM na URL. Grava {fbp, utm_*, landing_url} no
// Supabase da Garantido, por fbp — não por order_id, porque nesse momento o
// pedido ainda nem existe.
//
// Mesma lógica do apps/utm-capture-imperio/api/capture.js (ver lá o
// histórico do achado original). Duplicado 1:1 para a Garantido porque é o
// mesmo white-label de plataforma — a suspeita é que ela tenha o mesmo gap
// de não persistir UTM em pedido real.
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.GARANTIDO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.GARANTIDO_SUPABASE_SERVICE_ROLE_KEY;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const ORIGENS_PERMITIDAS = ['https://garantidopremios.com'];

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
