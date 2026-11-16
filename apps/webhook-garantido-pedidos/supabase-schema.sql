-- Tabela de pedidos reais da Garantido — rodar manualmente no SQL Editor
-- do painel Supabase da Garantido (a service role key de runtime usada em
-- api/order-paid.js não tem permissão de DDL, só INSERT/UPSERT/SELECT).
-- Mesmo princípio de apps/link-garantido/supabase-schema.sql.
--
-- Alimentada pelo webhook order.paid cadastrado no painel da Garantido
-- (painel.garantidopremios.com ou equivalente — mesmo provider do Império,
-- payload confirmado 2026-10-30). É a PRIMEIRA fonte de pedido real da
-- Garantido — sem ela, faturamento/ROAS/canal de atribuição continuam
-- mockados nas páginas Executiva/Operacional/Produto do BI.
--
-- order_id é UNIQUE: o provider reenvia o mesmo evento até 3x em caso de
-- falha (1min, 5min de intervalo) — upsert por order_id evita contar o
-- mesmo pedido 2x na receita.

create table if not exists pedidos (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  recorded_at timestamptz not null default now(),

  -- pedido
  status text,
  product_id text,
  product_title text,
  quantity integer,
  price numeric,
  subtotal numeric,
  discount numeric,
  discount_code text,
  total numeric not null,
  order_created_at timestamptz,
  paid_at timestamptz,
  numbers jsonb,
  awards jsonb,

  -- cliente (identidade pra novo×recorrente)
  user_id text,
  user_name text,
  user_phone text,
  user_email text,
  user_cpf text,
  user_affiliate_code text,
  user_created_at timestamptz,
  affiliate text,

  -- atribuição (data.params do payload — ausente quando o pedido não tem)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  ttclid text,
  ttp text,
  fbc text,
  fbp text,
  ip text,
  user_agent text,
  event_id text,

  -- payload bruto — rede de segurança pra campo que esquecemos de mapear
  raw_payload jsonb
);

create index if not exists pedidos_paid_at_idx on pedidos (paid_at);
create index if not exists pedidos_user_phone_idx on pedidos (user_phone);
create index if not exists pedidos_utm_source_idx on pedidos (utm_source);
create index if not exists pedidos_utm_campaign_idx on pedidos (utm_campaign);

-- Depois de criar, nada mais a fazer — api/order-paid.js já está pronto
-- pra gravar aqui assim que a tabela existir, sem precisar de redeploy.
