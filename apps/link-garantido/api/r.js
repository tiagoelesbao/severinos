// Redireciona /l/{codigo} -> URL original + UTM fixo do grupo. Lê via
// Supabase REST com a service role key (mesma fonte que api/create.js
// grava). Clonado de link-imperio em 2026-10-08.
//
// Achado 2026-10-09: até aqui o handler só fazia lookup+redirect — nenhum
// clique ficava registrado em lugar nenhum, então não havia como medir
// volume/timing de tráfego do grupo (pré-requisito pro BI da Garantido
// mostrar "cliques no link do grupo", a única fatia de tracking de grupo
// que dá pra ter sem acesso ao backend de pedidos). Log em
// `short_link_clicks` (schema em supabase-schema.sql, precisa ser criado
// manualmente no painel — service role key de runtime não tem DDL) —
// best-effort: se a tabela ainda não existir ou o insert falhar por
// qualquer motivo, o redirect do usuário real continua acontecendo normal,
// nunca trava por causa do log.
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.GARANTIDO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.GARANTIDO_SUPABASE_SERVICE_ROLE_KEY;
const UTM_SUFFIXO = { utm_source: 'whatsapp', utm_medium: 'community', utm_campaign: 'grupo-principal' };

async function registrarClique(request, codigo) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/short_link_clicks`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        code: codigo,
        user_agent: request.headers.get('user-agent') || null,
        referrer: request.headers.get('referer') || null,
      }),
    });
  } catch {
    // best-effort — tabela pode não existir ainda (ver supabase-schema.sql),
    // ou falha de rede; nunca derruba o redirect real por causa do log.
  }
}

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

  await registrarClique(request, codigo);

  return Response.redirect(destino.toString(), 302);
}
