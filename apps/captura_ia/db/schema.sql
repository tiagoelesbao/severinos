-- Esquema do funil da ORACLUM TECH.
-- Rode uma vez no SQL Editor do Supabase.
--
-- Duas tabelas porque são dois momentos diferentes da jornada:
--   leads    → quem liberou o cofre (lista fria, sem card no ClickUp)
--   bookings → quem clicou em "Marcar Reunião" (vira card no ClickUp)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- leads — cadastro do cofre
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             text not null,
  phone             text,
  agreed_to_terms   boolean not null default false,
  source            text,                       -- 'vault_gate'
  utm               jsonb,                      -- utm_source, utm_medium, utm_campaign...
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Restrição única na COLUNA email. Precisa ser na coluna, não em expressão:
-- o upsert do endpoint usa `on_conflict=email`, e o ON CONFLICT do Postgres
-- não consegue mirar um índice de expressão por nome de coluna (erro 42P10).
-- O endpoint já normaliza para minúsculas antes de gravar.
alter table public.leads
  drop constraint if exists leads_email_key;
alter table public.leads
  add constraint leads_email_key unique (email);

-- Guarda secundária case-insensitive, para o caso de algum outro escritor
-- gravar sem normalizar. Não serve para o ON CONFLICT — só impede o duplicado.
create unique index if not exists leads_email_lower_unique
  on public.leads (lower(email));

-- ---------------------------------------------------------------------------
-- bookings — pré-agendamentos
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),

  -- Chave de junção com o Calendly. Vai na URL da agenda como valor opaco:
  -- é UUID aleatório, não dado pessoal, então não expõe ninguém em log,
  -- histórico de navegador ou cabeçalho de referência.
  tracking_id         uuid not null unique,

  full_name           text not null,
  phone               text not null,
  business_type       text not null,

  -- Preenchido quando o telefone bate com um lead já cadastrado.
  lead_id             uuid references public.leads (id) on delete set null,

  clickup_task_id     text,
  calendly_event_uri  text,

  -- clicked → scheduled → canceled
  status              text not null default 'clicked',

  created_at          timestamptz not null default now(),
  scheduled_at        timestamptz,
  canceled_at         timestamptz
);

create index if not exists bookings_status_created_idx
  on public.bookings (status, created_at desc);

create index if not exists bookings_phone_idx
  on public.bookings (phone);

-- ---------------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------------
-- RLS ligado e SEM policy: nenhuma chave pública (anon) enxerga nada.
-- As funções serverless usam a service_role key, que ignora RLS por definição.
alter table public.leads    enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------------------
-- Consulta de recuperação: clicou em agendar e não concluiu no Calendly
-- ---------------------------------------------------------------------------
-- select full_name, phone, business_type, created_at
--   from public.bookings
--  where status = 'clicked'
--    and created_at < now() - interval '24 hours'
--  order by created_at desc;
