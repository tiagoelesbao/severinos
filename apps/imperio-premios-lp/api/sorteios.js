// Lista os sorteios ATIVOS do cliente para a página /catalogo.
//
// Por que o catálogo existe (achado 2026-10-10, validado ao vivo):
// a home (`/`) e a lista (`/campanhas`) do site do cliente NÃO carregam o
// GTM — zero scripts de googletagmanager, `dataLayer` e `fbq` inexistentes,
// e o HTML renderizado não tem nenhuma menção a `GTM-`. A home também
// DESCARTA a query string, que é a origem do UTM 0% em todos os pedidos.
// Já a página do sorteio (`/campanha/{friendlyURL}`) carrega tudo:
// GTM-58RGNFCK, `dataLayer` com `view_item`, `fbq`, e grava `ic_origem`.
//
// Logo, mandar tráfego pago para a home perde UTM E perde GTM. O catálogo é
// a ponte: roda no NOSSO domínio (onde o Pixel funciona), lista os sorteios
// vivos e entrega o usuário direto na página do sorteio, com a query string
// preservada — rastreável de ponta a ponta pela primeira vez.
//
// POR QUE ESTA FUNÇÃO LÊ DO SUPABASE E NÃO DA API DO CLIENTE
// (achado 2026-10-11, causa raiz provada):
// a versão anterior autenticava direto na API do cliente e tomava 403. O
// corpo da resposta era página de desafio do **Cloudflare** (header
// `server: cloudflare`): o Cloudflare do cliente barra IP de datacenter.
// Não era header — a função já mandava User-Agent/Origin/Referer completos
// de navegador e continuou 403; do IP residencial local o mesmo login
// devolve 200. Ajustar header ou trocar região da Vercel não resolve.
//
// Solução: `services/Meta/imperio-premios/snapshot_sorteios.py` roda LOCAL
// (IP residencial, aceito pelo Cloudflare) a cada 5 min via Task Scheduler
// e grava o snapshot no Supabase Storage. Aqui só lemos de lá.
//
// Storage e não tabela: criar tabela exige DDL, que a service role key de
// runtime não tem — dependeria do founder rodar SQL no painel. A API de
// Storage aceita a mesma key, então o pipeline sobe sem ação manual. O
// bucket é público e o conteúdo é a lista de sorteios abertos (já pública
// no site do cliente, sem dado pessoal), então aqui é um GET sem credencial.

const SUPABASE_URL = (process.env.IMPERIO_SUPABASE_URL || "")
  .replace(/^"|"$/g, "")
  .replace(/\/+$/, "");
const SNAPSHOT_URL = `${SUPABASE_URL}/storage/v1/object/public/catalogo/sorteios.json`;

// Cache em memória da instância — a Vercel reaproveita a instância entre
// requisições próximas, então isto evita ida ao Supabase a cada visita.
let cache = { em: 0, corpo: null };
const TTL_MS = 30 * 1000;

// Guardas de idade do snapshot. O job local roda a cada 5 min.
//   > 15 min  → serve, mas marca `stale` (≈3 ciclos perdidos; um sorteio
//               individual dura horas, então o dado ainda converte).
//   > 90 min  → recusa. Nesse ponto o job está realmente parado e, pelo
//               giro observado (~85 sorteios encerrando por dia, ~7 ativos
//               por vez), boa parte da lista já rodou. Mandar clique pago
//               para sorteio morto cai em "Erro 404 - Campanha não
//               encontrada" — pior do que mostrar erro honesto.
const STALE_MS = 15 * 60 * 1000;
const MAX_MS = 90 * 60 * 1000;

async function lerSnapshot() {
  const r = await fetch(`${SNAPSHOT_URL}?t=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => "");
    throw new Error(`storage ${r.status}: ${corpo.slice(0, 200)}`);
  }
  const d = await r.json();
  if (!d || !Array.isArray(d.sorteios) || !d.atualizado_em) {
    throw new Error("snapshot em formato inesperado");
  }
  return d;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL) {
    res.status(500).json({ ok: false, erro: "IMPERIO_SUPABASE_URL não configurado" });
    return;
  }
  try {
    const agora = Date.now();
    if (cache.corpo && agora - cache.em < TTL_MS) {
      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
      res.status(200).json({ ...cache.corpo, cache: "hit" });
      return;
    }

    const snap = await lerSnapshot();
    const idadeMs = agora - new Date(snap.atualizado_em).getTime();

    if (idadeMs > MAX_MS) {
      // Não é "nenhuma campanha aberta" — é "não consigo confiar no dado".
      // A página precisa dizer a verdade: nunca afirmar que não há sorteio
      // quando na realidade a fonte está parada.
      res.status(503).json({
        ok: false,
        erro: "snapshot desatualizado",
        idade_min: Math.round(idadeMs / 60000),
        atualizado_em: snap.atualizado_em,
      });
      return;
    }

    const corpo = {
      ok: true,
      sorteios: snap.sorteios,
      atualizado_em: snap.atualizado_em,
      stale: idadeMs > STALE_MS,
      idade_min: Math.round(idadeMs / 60000),
    };
    cache = { em: agora, corpo };
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
    res.status(200).json({ ...corpo, cache: "miss" });
  } catch (e) {
    // Degrada servindo o último cache bom em vez de quebrar a página: um
    // catálogo levemente velho ainda converte; um catálogo vazio, não.
    if (cache.corpo) {
      res.setHeader("Cache-Control", "public, s-maxage=15");
      res.status(200).json({ ...cache.corpo, cache: "stale" });
      return;
    }
    res.status(502).json({ ok: false, erro: String(e.message || e) });
  }
}
