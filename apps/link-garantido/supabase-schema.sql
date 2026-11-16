-- Tabela de log de cliques do encurtador da Garantido — rodar manualmente no
-- SQL Editor do painel Supabase (a service role key de runtime usada em
-- api/create.js e api/r.js não tem permissão de DDL, só de INSERT/SELECT).
--
-- Sem esta tabela, api/r.js segue funcionando normalmente (o INSERT de log é
-- best-effort e nunca derruba o redirect), mas fica sem nenhuma visibilidade
-- de quantos cliques o link do grupo recebe — é o gap que motivou este
-- arquivo (ver api/r.js, comentário "Achado 2026-10-09").

create table if not exists short_link_clicks (
  id bigint generated always as identity primary key,
  code text not null,
  clicked_at timestamptz not null default now(),
  user_agent text,
  referrer text
);

create index if not exists short_link_clicks_code_idx on short_link_clicks (code);
create index if not exists short_link_clicks_clicked_at_idx on short_link_clicks (clicked_at);

-- Depois de criar, nada mais a fazer — api/r.js já está pronto pra escrever
-- aqui assim que a tabela existir (detecta sozinho via resposta da API, não
-- precisa de redeploy).
