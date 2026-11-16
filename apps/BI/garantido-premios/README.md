# BI Garantido — v1 (Meta Ads real, pedido real mockado)

**Status (2026-10-09):** primeira versão, deliberadamente mais enxuta que
`apps/BI/imperio-premios`. Não é escopo reduzido por preguiça — é o reflexo
real do que temos acesso hoje. Ver topo de
`services/Meta/garantido-premios/bi_aggregator.py` pra fronteira exata entre
real e mock.

## O que já é real

- Gasto, impressões, cliques por dia — Meta Ads Insights, puxado direto da
  conta (campanhas detectadas automaticamente via `/me/adaccounts`, sem
  campaign_id fixo).
- Funil do Pixel (PageView/ViewContent/AddToCart/InitiateCheckout/Purchase)
  — tracking nativo da Garantido, já validado em EMQ 9.0-9.3/10
  (2026-10-09). Só leitura, nenhum envio novo.
- Cliques no link do grupo de WhatsApp — **depende de 1 passo manual**, ver
  abaixo.

## O que está mockado (e por quê)

Faturamento real, ROAS cruzado com pedido, novo×recorrente, lucro — tudo
que depende de **pedido real** da plataforma `garantidopremios.com`.
Falta a credencial de API do backend (equivalente a
`IMPERIO_PREMIOS_API_EMAIL`/`PASSWORD` + `client_api.py` do Império, que a
Garantido ainda não tem). A função `pull_pedidos()` no aggregator devolve
`{"_mock": true, "_motivo": "..."}` em vez de inventar número — a página
mostra um aviso explícito em vez de esconder isso.

**Quando o acesso chegar:** criar `GARANTIDO_PREMIOS_API_EMAIL`/
`GARANTIDO_PREMIOS_API_PASSWORD` no `.env`, portar `client_api.py` do
Império adaptando pro schema real da API da Garantido (não confirmado —
não assumir que é igual ao Império só por ser o mesmo nicho), e trocar só
o corpo de `pull_pedidos()`.

## Passo manual pendente — ativar o log de cliques do grupo

A tabela `short_link_clicks` ainda não existe no Supabase da Garantido.
Rodar `apps/link-garantido/supabase-schema.sql` no SQL Editor do painel
Supabase (a service role key de runtime não tem permissão de DDL). Depois
disso, `apps/link-garantido/api/r.js` já grava cada clique sozinho — não
precisa de redeploy, o código já está pronto esperando a tabela existir.

Também falta `GARANTIDO_SUPABASE_URL`/`GARANTIDO_SUPABASE_SERVICE_ROLE_KEY`
no `.env` **local** (só existem hoje como env var da Vercel, usadas pelo
`link-garantido` em produção) — sem isso, `bi_aggregator.py` rodado
localmente não consegue ler os cliques, mesmo depois da tabela criada.

## Como gerar o snapshot

```bash
cd services/Meta/garantido-premios
python bi_aggregator.py --dias 30
```

Gera `apps/BI/garantido-premios/data.json`. Sem agendamento automático
nesta v1 — rodar manualmente (ou configurar Task Scheduler depois, mesmo
padrão do `refresh_hidden.vbs` do Império, quando fizer sentido).

## Senha de acesso

`GARANTIDO_BI_PASSWORD` (env var da Vercel, Production + Preview) — nome
próprio, nunca reusar `BI_PASSWORD` do Império (contas diferentes). Ainda
não configurada nem deployado — próximo passo pra deixar a URL pública
funcionando, mesmo padrão do `apps/BI/imperio-premios/README.md`.
