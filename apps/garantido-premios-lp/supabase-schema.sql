-- Tabela de beacon de funil por versão de LP — rodar manualmente no SQL
-- Editor do painel Supabase da Garantido (a service role key de runtime
-- usada em api/beacon.js não tem permissão de DDL, só de INSERT/SELECT).
-- Mesmo princípio de apps/link-garantido/supabase-schema.sql.
--
-- Por que existe (mesmo achado do Império, 2026-10-16): a API de stats do
-- Pixel da Meta só quebra por nome de evento ou host, nunca por parâmetro
-- customizado — sem esta tabela não dá pra comparar v1 × v2 da LP.
--
-- Sem esta tabela, api/beacon.js responde 204 e não grava nada (nunca
-- quebra a navegação da LP, é best-effort).

create table if not exists lp_eventos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  variant text not null,
  evento text not null,
  session_id text,
  utm_source text,
  utm_campaign text
);

create index if not exists lp_eventos_criado_em_idx on lp_eventos (criado_em);
create index if not exists lp_eventos_variant_evento_idx on lp_eventos (variant, evento);

-- Depois de criar, nada mais a fazer — api/beacon.js já está pronto pra
-- gravar aqui assim que a tabela existir, sem precisar de redeploy.
