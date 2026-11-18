---
name: sorteamos-nunca-gravou-utm
description: A Sorteamos declara os campos de UTM e entrega vazios em 100% dos pedidos reais — paridade com ela não é a meta de atribuição
metadata:
  type: project
---

A plataforma atual do Império **declara** `utmSource/Medium/Campaign/Content/Term` no payload do
`order.paid` e na API REST, e entrega **vazio em 100%** dos pedidos reais — inclusive em 25 pedidos
com clique de anúncio confirmado e recente (medido 2026-10-08). Pela API REST, `UTM_Source` vem
vazio em **99,6%**. A plataforma não persiste atribuição em lugar nenhum do fluxo dela.

**Why:** é por isso que `apps/utm-capture-imperio` existe — um beacon por GTM que grava
`{fbp, fbc, utm_*, landing_url}` no Supabase **por `fbp`**, não por pedido, "porque nesse momento o
pedido ainda nem existe". É gambiarra de produção contra um gap upstream, não arquitetura escolhida.

**How to apply:**

- Em qualquer discussão de atribuição no lotemania, **paridade com a Sorteamos é o piso errado**.
  "Tem as colunas" não é entregável; "o dado chega preenchido depois de navegação interna" é. É o
  AC4 da LTM-04 e o risco central dela.
- Distinguir sempre **vazio** de **nunca gravado** — sem isso o gap de captura fica invisível.
- A Sorteamos também **reescreve o `fbc` com timestamp sempre fresco**, o que inviabilizou o filtro
  de idade do clique no `capi_client.py`. Não repetir: o valor original do cookie tem que chegar
  intacto ao pedido.
- Quando o lotemania capturar na origem, o beacon por `fbp` deixa de ser necessário — mas desligá-lo
  é item do corte, não da story de atribuição (ele serve o Império até lá).

Relacionado: [[lotemania-imperio-migration]], [[contrato-existente-antes-de-inventar]]
