// Webhook receiver — grava pedido real da Garantido assim que a plataforma
// confirma pagamento (evento order.paid). Mesmo provider do Império
// (payload confirmado pelo founder em 2026-10-30, formato idêntico ao
// documentado em webhook-imperio-capi/api/order-paid.js).
//
// ATUALIZADO 2026-11-12: a decisão original de NÃO reenviar Purchase pro
// Meta CAPI (ver histórico git) partia da premissa de que o pixel nativo
// da plataforma, com a CAPI própria dela, já media bem (EMQ 9.0-9.3/10).
// Essa premissa caiu: o founder removeu o pixel nativo do site e colocou
// no lugar o container GTM espelhado do Império (GTM-WHJFR59M), que não
// tem CAPI server-side — só Pixel client-side via navegador, igual o
// Império tinha ANTES de existir este arquivo. Por isso este handler
// ganhou a mesma seção de envio CAPI que webhook-imperio-capi/api/order-paid.js
// já tinha, usando o Pixel ID e o token fornecidos pelo founder em
// 2026-11-12. Se a plataforma reativar CAPI nativa própria no futuro,
// revisitar esta decisão (risco de duplicar Purchase, mesmo bug que o
// Império documentou).
//
// Autenticação: a plataforma manda de volta, no header X-AUTH-WEBHOOK, o
// mesmo valor colocado no campo "Authorization" do cadastro do webhook —
// comparamos com GARANTIDO_WEBHOOK_SHARED_SECRET (env var) pra rejeitar
// chamadas que não vieram de lá.
export const config = { runtime: 'edge' };

const WEBHOOK_SHARED_SECRET = process.env.GARANTIDO_WEBHOOK_SHARED_SECRET;
const SUPABASE_URL = process.env.GARANTIDO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.GARANTIDO_SUPABASE_SERVICE_ROLE_KEY;

const PIXEL_ID = process.env.META_GARANTIDO_PREMIOS_DATASET_ID;
const ACCESS_TOKEN = process.env.META_GARANTIDO_PREMIOS_ACCESS_TOKEN;
const FBC_MAX_AGE_DIAS = 7; // mesma janela usada pelo Império

async function sha256(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (!v) return null;
  const enc = new TextEncoder().encode(v);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Phone(e164) {
  if (!e164) return null;
  const digits = String(e164).replace(/^\+/, '').trim();
  if (!digits) return null;
  return sha256(digits);
}

function fbcFresco(fbc, eventTimeUnix) {
  if (!fbc) return false;
  try {
    const parts = String(fbc).split('.');
    const tsMs = parseInt(parts[2], 10);
    if (!tsMs) return false;
    const idadeDias = (eventTimeUnix - tsMs / 1000) / 86400;
    return idadeDias >= 0 && idadeDias <= FBC_MAX_AGE_DIAS;
  } catch {
    return false;
  }
}

async function enviarPurchaseCapi(pedido, user, params, orderId, valor, timestampWebhook) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.log('META_GARANTIDO_PREMIOS_DATASET_ID/ACCESS_TOKEN não configurados — Purchase CAPI não enviado para', orderId);
    return;
  }

  const eventTimeUnix = Math.floor(new Date(timestampWebhook || pedido.createdAt || Date.now()).getTime() / 1000);

  const userData = {};
  const em = await sha256(user.email);
  if (em) userData.em = [em];

  const ph = await sha256Phone(user.phone);
  if (ph) userData.ph = [ph];

  const extId = await sha256(user.id);
  if (extId) userData.external_id = [extId];

  if (params.fbp) userData.fbp = params.fbp;
  if (fbcFresco(params.fbc, eventTimeUnix)) userData.fbc = params.fbc;
  if (params.ip) userData.client_ip_address = params.ip;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  if (user.name) {
    const partes = String(user.name).trim().split(/\s+/);
    const fn = await sha256(partes[0]);
    const ln = partes.length > 1 ? await sha256(partes.slice(1).join(' ')) : null;
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
  }
  const country = await sha256('br');
  if (country) userData.country = [country];

  const evento = {
    event_name: 'Purchase',
    event_time: eventTimeUnix,
    event_id: orderId,
    action_source: 'website',
    event_source_url: 'https://garantidopremios.com/',
    user_data: userData,
    custom_data: {
      currency: 'BRL',
      value: valor,
      order_id: orderId,
    },
  };

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [evento], access_token: ACCESS_TOKEN }),
    });
    const metaJson = await metaRes.json();
    console.log('order-paid -> Meta CAPI (Garantido):', orderId, JSON.stringify(metaJson));
  } catch (e) {
    console.log('order-paid: erro de rede enviando Purchase pro Meta CAPI', orderId, e.message);
  }
}

// Campos "ausentes quando vazios" (ver doc do provider) — nunca assume que
// uma chave existe, sempre com fallback null/undefined-safe.
function s(v) {
  return v === undefined || v === null || v === '' ? null : String(v);
}
function n(v) {
  return v === undefined || v === null || v === '' ? null : Number(v);
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (WEBHOOK_SHARED_SECRET) {
    const authHeader = request.headers.get('x-auth-webhook');
    if (authHeader !== WEBHOOK_SHARED_SECRET) {
      return new Response(JSON.stringify({ ok: false, erro: 'não autorizado' }), { status: 401 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'JSON inválido' }), { status: 400 });
  }

  if (body.event && body.event !== 'order.paid') {
    return new Response(JSON.stringify({ ok: true, ignorado: `evento ${body.event} não tratado aqui` }), { status: 200 });
  }

  const pedido = body.data || {};
  const user = pedido.user || {};
  const product = pedido.product || {};
  const params = pedido.params || {};

  const orderId = pedido.id;
  const total = n(pedido.total ?? pedido.subtotal);

  if (!orderId || !total || total <= 0) {
    console.log('order-paid: pedido sem id/total, ignorado. Payload:', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, ignorado: 'id ou total ausente' }), { status: 200 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('SUPABASE_URL/SERVICE_ROLE_KEY não configurados — pedido NÃO gravado, só logado:', orderId);
    return new Response(JSON.stringify({ ok: true, gravado: false, motivo: 'credenciais ausentes' }), { status: 200 });
  }

  const linha = {
    order_id: s(orderId),
    status: s(pedido.status),
    product_id: s(product.id),
    product_title: s(product.title),
    quantity: n(pedido.quantity),
    price: n(pedido.price),
    subtotal: n(pedido.subtotal),
    discount: n(pedido.discount),
    discount_code: s(pedido.discountCode),
    total,
    order_created_at: s(pedido.createdAt),
    paid_at: s(body.timestamp) || s(pedido.createdAt),
    numbers: pedido.numbers ?? null,
    awards: pedido.awards ?? null,

    user_id: s(user.id),
    user_name: s(user.name),
    user_phone: s(user.phone),
    user_email: s(user.email),
    user_cpf: s(user.cpf),
    user_affiliate_code: s(user.affiliateCode),
    user_created_at: s(user.createdAt),
    affiliate: s(pedido.affiliate),

    utm_source: s(params.utmSource),
    utm_medium: s(params.utmMedium),
    utm_campaign: s(params.utmCampaign),
    utm_content: s(params.utmContent),
    utm_term: s(params.utmTerm),
    gclid: s(params.gclid),
    ttclid: s(params.ttclid),
    ttp: s(params.ttp),
    fbc: s(params.fbc),
    fbp: s(params.fbp),
    ip: s(params.ip),
    user_agent: s(params.userAgent),
    event_id: s(params.eventId),

    raw_payload: body,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        // upsert por order_id — o provider reenvia o mesmo evento até 3x
        // em caso de falha (ver doc), isso evita duplicar receita.
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(linha),
    });
    if (!res.ok) {
      const erroTexto = await res.text();
      console.log('order-paid: falha ao gravar no Supabase', orderId, res.status, erroTexto);
      return new Response(JSON.stringify({ ok: false, erro: 'falha ao gravar', detalhe: erroTexto }), { status: 502 });
    }
  } catch (e) {
    console.log('order-paid: erro de rede gravando pedido', orderId, e.message);
    return new Response(JSON.stringify({ ok: false, erro: 'erro de rede', detalhe: e.message }), { status: 502 });
  }

  // Envio CAPI não bloqueia a resposta do webhook nem depende da gravação
  // do pedido ter ido bem até aqui ter afetado o status — best-effort,
  // mesmo princípio dos outros handlers de webhook deste projeto.
  await enviarPurchaseCapi(pedido, user, params, orderId, total, body.timestamp);

  return new Response(JSON.stringify({ ok: true, gravado: true, order_id: orderId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
