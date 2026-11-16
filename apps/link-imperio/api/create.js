// Recebe um link longo, gera um código curto, grava a correspondência na
// tabela short_links do Supabase (chave=código, valor=URL original) e
// devolve o link curto (/l/{codigo}) pro operador colar no grupo. O UTM
// fixo é aplicado só na HORA do clique (ver api/r.js) — não precisa estar
// salvo aqui.
//
// Migrado do Edge Config em 2026-10-07: o Edge Config do plano free da
// Vercel tem cota de 250 escritas/MÊS via Management API — esgotada em
// produção (rate_limited, reset só 30 dias depois), bloqueando qualquer
// link novo. Supabase REST não tem esse teto artificial.
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.IMPERIO_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.IMPERIO_SUPABASE_SERVICE_ROLE_KEY;
// Domínio público final pro link curto. Sem isso, `new URL(request.url).origin`
// resolveria pro domínio real que atendeu a função (ex.: link-imperio.vercel.app)
// mesmo quando o operador acessa a ferramenta via rewrite de outro domínio —
// um rewrite cross-project não reescreve o host que a function enxerga.
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;
const CHARSET = 'abcdefghijkmnpqrstuvwxyz23456789'; // sem 0/O/1/l/I pra evitar confusão visual

function gerarCodigo(tamanho = 6) {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  for (let i = 0; i < tamanho; i++) out += CHARSET[bytes[i] % CHARSET.length];
  return out;
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, erro: 'IMPERIO_SUPABASE_URL/IMPERIO_SUPABASE_SERVICE_ROLE_KEY não configurados' }), { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'JSON inválido' }), { status: 400 });
  }

  const urlOriginal = (body.url || '').trim();
  if (!urlOriginal) {
    return new Response(JSON.stringify({ ok: false, erro: 'url ausente' }), { status: 400 });
  }
  try {
    new URL(urlOriginal);
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'url inválida — cole o link completo (com https://)' }), { status: 400 });
  }

  // Retry em colisão de código (PK duplicada, 409) — espaço de 32^6 códigos
  // torna isso raríssimo, mas o retry é barato e evita falha espúria.
  let codigo;
  let salvou = false;
  let ultimoErro = '';
  for (let tentativa = 0; tentativa < 3 && !salvou; tentativa++) {
    codigo = gerarCodigo();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/short_links`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ code: codigo, url: urlOriginal }),
    });
    if (res.ok) {
      salvou = true;
    } else if (res.status === 409) {
      ultimoErro = 'colisão de código, tentando outro';
      continue;
    } else {
      ultimoErro = await res.text();
      break;
    }
  }

  if (!salvou) {
    return new Response(JSON.stringify({ ok: false, erro: 'Falha ao salvar no Supabase', detalhe: ultimoErro }), { status: 502 });
  }

  const origem = PUBLIC_DOMAIN || new URL(request.url).origin;
  const linkCurto = `${origem}/l/${codigo}`;
  return new Response(JSON.stringify({ ok: true, codigo, link_curto: linkCurto, url_original: urlOriginal }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
