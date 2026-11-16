// Webhook receiver — dispara CAPI Purchase pro Meta NA HORA que a plataforma
// confirma um pagamento (evento order.paid), em vez de esperar o próximo
// ciclo de polling (capi_realtime.ps1, a cada 15min). Isso é o que de fato
// conta como "tempo real" pro Events Manager (gates-status.yaml, achado
// 2026-10-07).
//
// Payload REAL confirmado pelo founder (painel.imperiopremioss.com/dashboard/webhooks
// > Exemplos de payload > Order.Paid, 2026-10-07) — NÃO é o mesmo formato
// do objeto de pedido da API REST (client_api.py). Principais diferenças:
//   - usuário vem em `data.user` (não `data.userId`), com `id` (não `_id`)
//   - telefone já vem em `data.user.phone` pronto em E.164 (ex: "+5511...")
//   - fbc/fbp/ip/userAgent/UTM ficam dentro de `data.params`, não soltos em `data`
//   - `data.id` é o id do pedido (equivalente ao `_id` da API REST)
// Autenticação: a plataforma manda de volta, no header X-AUTH-WEBHOOK, o
// mesmo valor colocado no campo "Authorization" do cadastro do webhook —
// comparamos com WEBHOOK_SHARED_SECRET (env var) pra rejeitar chamadas que
// não vieram de lá.
export const config = { runtime: 'edge' };

const PIXEL_ID = process.env.META_IMPERIO_PREMIOS_DATASET_ID;
const ACCESS_TOKEN = process.env.META_IMPERIO_PREMIOS_ACCESS_TOKEN;
const WEBHOOK_SHARED_SECRET = process.env.WEBHOOK_SHARED_SECRET;
const FBC_MAX_AGE_DIAS = 7; // mesma janela de client_api.py/capi_client.py

// Achado 2026-10-08: a API REST (client_api.py) devolve UTM_Source vazio em
// 99,6% dos pedidos (SPA perde a query string na navegação interna antes do
// checkout) — e o exemplo OFICIAL de payload deste webhook (painel >
// dashboard/webhooks > Exemplos de payload > Order.Paid) mostra
// utmSource/utmCampaign/utmMedium/utmContent/utmTerm dentro de `params`,
// então essa função existe pra captar isso quando presente.
// MAS — validado ao vivo no mesmo dia com 25 pedidos reais de fbc
// genuinamente fresco (<7 dias, alguns de minutos atrás): 100% chegam com
// essas 5 chaves vazias no payload REAL do webhook, não só na API REST.
// Ou seja, o problema NÃO é perda de query string na nossa LP nem na SPA
// do cliente depois do clique — a plataforma não está anexando UTM a
// NENHUM pedido de verdade, independente de canal ou recência do clique.
// Esta função já está correta e pronta pra funcionar no dia em que a
// plataforma resolver isso do lado dela (ou numa camada de persistência
// first-party own-nossa, tipo GTM, ainda não construída) — mas hoje ela é
// best-effort vazio na prática: não espere pedido_utm crescer sozinho
// até esse gap upstream ser corrigido.
const SUPABASE_URL = process.env.IMPERIO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY;

async function registrarUtm(orderId, params) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const temAlgumaUtm = params.utmSource || params.utmMedium || params.utmCampaign || params.utmContent || params.utmTerm;
  if (!temAlgumaUtm) return; // campo ausente = sem rastreio nesse pedido, nada pra gravar
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pedido_utm`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        order_id: orderId,
        utm_source: params.utmSource || null,
        utm_medium: params.utmMedium || null,
        utm_campaign: params.utmCampaign || null,
        utm_content: params.utmContent || null,
        utm_term: params.utmTerm || null,
        gclid: params.gclid || null,
        ttclid: params.ttclid || null,
      }),
    });
  } catch {
    // best-effort — não deixa a falha aqui derrubar a resposta do webhook,
    // mesmo princípio de registrarEnvioWebhook acima.
  }
}

// Registra aqui todo OrderId que o webhook já mandou pro Meta, pra
// send_backlog.py (polling de 15min) não reenviar o mesmo pedido em
// duplicado (achado 2026-10-07: Meta dedupe cobre certo, mas sem isso todo
// pedido ia pro Meta 2x, gasto de API à toa). Best-effort — se essa escrita
// falhar, o pior caso é o pedido ser reenviado pelo polling, nunca perdido.
//
// MIGRADO 2026-11-07 de Edge Config pra Supabase Storage (mesmo padrão de
// apps/BI/imperio-premios/api/solicitar-sync.js e toggle-pause.js): Edge
// Config cobra por ESCRITA desde que viramos plano Pro (US$1/100 writes) —
// este handler roda em TODO pedido pago (milhares/dia), e isso sozinho
// ia custar centenas de dólares/mês por uma escrita que é só otimização
// de dedup, não dado crítico. Storage não tem esse custo por escrita.
async function registrarEnvioWebhook(orderId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/catalogo/webhook_sent_ids.json?t=${Date.now()}`);
    const atual = res.ok ? await res.json() : [];
    const lista = Array.isArray(atual) ? atual : [];
    const nova = [...lista, orderId].slice(-500); // só os 500 mais recentes — rolling window, não precisa de limpeza separada
    await fetch(`${SUPABASE_URL}/storage/v1/object/catalogo/webhook_sent_ids.json`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(nova),
    });
  } catch {
    // best-effort — não deixa a falha aqui derrubar a resposta do webhook
  }
}

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
    return new Response(JSON.stringify({ ok: false, erro: 'JSON invalido' }), { status: 400 });
  }

  if (body.event && body.event !== 'order.paid') {
    return new Response(JSON.stringify({ ok: true, ignorado: `evento ${body.event} não tratado aqui` }), { status: 200 });
  }

  const pedido = body.data || {};
  const user = pedido.user || {};
  const params = pedido.params || {};

  const valor = Number(pedido.total ?? pedido.subtotal ?? 0);
  const orderId = pedido.id;

  if (!valor || valor <= 0 || !orderId) {
    console.log('order-paid: pedido sem valor/id, ignorado. Payload:', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, ignorado: 'valor ou id ausente' }), { status: 200 });
  }

  // Grava a UTM independente do resto do fluxo (Meta CAPI) ter sucesso ou
  // não — é captura pro nosso BI, não depende do envio pro Meta.
  await registrarUtm(orderId, params);

  // event_time: usamos o timestamp do próprio evento do webhook (momento da
  // confirmação do pagamento) — mais preciso que createdAt do pedido (que é
  // quando o pedido foi CRIADO, não quando foi PAGO).
  const eventTimeUnix = Math.floor(new Date(body.timestamp || pedido.createdAt || Date.now()).getTime() / 1000);

  const userData = {};
  const em = await sha256(user.email);
  if (em) userData.em = [em];

  // Telefone já vem pronto em E.164 neste payload (ex: "+5511998765432").
  const ph = await sha256Phone(user.phone);
  if (ph) userData.ph = [ph];

  // external_id = id do usuário na plataforma (mesmo campo que já usamos
  // via API REST, client_api.py — aqui é user.id, lá era userId._id).
  const extId = await sha256(user.id);
  if (extId) userData.external_id = [extId];

  if (params.fbp) userData.fbp = params.fbp;
  if (fbcFresco(params.fbc, eventTimeUnix)) userData.fbc = params.fbc;
  if (params.ip) userData.client_ip_address = params.ip;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  // Achado 2026-10-07 (EMQ caindo pro evento Compra): nome/país nunca eram
  // mandados por nós, só pela CAPI nativa da plataforma (fatia pequena) —
  // conforme nosso volume cresce isso dilui a EMQ em vez de melhorar.
  // `user.name` é defensivo (não confirmado no payload real do webhook,
  // diferente da API REST onde já validamos 100% de preenchimento) — se
  // não vier, simplesmente não manda fn/ln, sem quebrar nada. País fixo
  // "br": confirmado 100% das amostras reais via API REST (plataforma
  // só opera no Brasil) — mais seguro que inventar um campo que o
  // webhook pode não ter.
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
    // Mesmo event_id que o restante do nosso pipeline usa pro pedido (id do
    // pedido, não params.eventId) — precisa bater com o que o Pixel do
    // navegador usa pra deduplicação funcionar (confirmado 99%+ de dedup
    // usando o id do pedido como chave, ver gates-status.yaml).
    event_id: orderId,
    action_source: 'website',
    event_source_url: 'https://rapidinhas24hr.com/',  // domínio trocado 2026-10-22 (era imperiopremioss.com, morto)
    user_data: userData,
    custom_data: {
      currency: 'BRL',
      value: valor,
      order_id: orderId,
    },
  };

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.log('PIXEL_ID/ACCESS_TOKEN nao configurados — evento NAO enviado, so logado:', JSON.stringify(evento));
    return new Response(JSON.stringify({ ok: true, enviado: false, motivo: 'credenciais ausentes' }), { status: 200 });
  }

  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [evento], access_token: ACCESS_TOKEN }),
  });
  const metaJson = await metaRes.json();
  console.log('order-paid -> Meta CAPI:', orderId, JSON.stringify(metaJson));
  await registrarEnvioWebhook(orderId);

  return new Response(JSON.stringify({ ok: true, enviado: true, order_id: orderId, meta: metaJson }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
