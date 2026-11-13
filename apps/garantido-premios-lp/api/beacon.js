// Beacon próprio de funil por LP — grava em `lp_eventos` (Supabase da
// Garantido), paralelo ao que já vai pro pixel da Meta via
// fbq('trackCustom', ...). Clone de apps/imperio-premios-lp/api/beacon.js.
//
// Por que existe (mesmo achado do Império, 2026-10-16): a API de stats do
// pixel da Meta só quebra por nome de evento ou host — não por parâmetro
// customizado (o `variant: 'v1'/'v2'` que a LP já manda pro fbq fica preso
// lá dentro, sem jeito de agregar por versão no BI). Esse endpoint grava o
// mesmo evento, mas numa tabela nossa, consultável como quisermos.
//
// Fire-and-forget: NUNCA deve travar a navegação da LP. Erro aqui vira log
// no servidor, nunca 500 pro cliente.

const SUPABASE_URL = (process.env.GARANTIDO_SUPABASE_URL || "")
  .replace(/^"|"$/g, "")
  .replace(/\/+$/, "");
const SUPABASE_KEY = (process.env.GARANTIDO_SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");

const VARIANTS_VALIDAS = new Set(["v1", "v2"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, erro: "method not allowed" });
    return;
  }
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      res.status(204).end();
      return;
    }
    const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { variant, evento, session_id, utm_source, utm_campaign } = body || {};
    if (!variant || !evento || !VARIANTS_VALIDAS.has(variant)) {
      res.status(204).end();
      return;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/lp_eventos`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variant: String(variant).slice(0, 20),
        evento: String(evento).slice(0, 60),
        session_id: session_id ? String(session_id).slice(0, 80) : null,
        utm_source: utm_source ? String(utm_source).slice(0, 80) : null,
        utm_campaign: utm_campaign ? String(utm_campaign).slice(0, 120) : null,
      }),
    });
  } catch (e) {
    console.error("beacon falhou:", e && e.message);
  }
  res.status(204).end();
}
