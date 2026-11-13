-- Tabela utm_touches — Supabase da Garantido.
-- Espelha a tabela homônima já em uso pelo Império (criada lá direto pelo
-- dashboard, sem schema versionado — este arquivo é a primeira versão
-- escrita, inferida do que api/capture.js grava e do que bi_aggregator.py
-- consulta). Rodar no SQL Editor do painel Supabase da Garantido.
--
-- fbp não é PK/unique: cada touch é um evento (uma chegada com UTM ou fbc
-- novo), não um upsert por pessoa. O enriquecimento do lado do BI sempre
-- pega "o touch mais recente por fbp" via order=captured_at.desc.

create table if not exists utm_touches (
  id bigint generated always as identity primary key,
  fbp text not null,
  fbc text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_url text,
  captured_at timestamptz not null default now()
);

create index if not exists utm_touches_fbp_captured_at_idx
  on utm_touches (fbp, captured_at desc);
