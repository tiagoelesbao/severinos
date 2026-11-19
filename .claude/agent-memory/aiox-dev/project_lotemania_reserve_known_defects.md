---
name: lotemania-reserve-known-defects
description: Defeito medido e deliberadamente NÃO consertado no caminho da reserva do lotemania — a identidade do comprador nasce de um INSERT cru contra índice único, e duas primeiras reservas simultâneas do mesmo telefone estouram
metadata:
  type: project
---

Achado e **medido** na LTM-20 (2026-11-19), deixado sem conserto por estar fora do escopo da story.
Aguarda story própria.

## O defeito

`apps/lotemania/src/lib/actions/reserve.ts` cria o comprador com um `INSERT` cru, fora de transação
e sem `onConflict`, contra o índice **único** `users_tenant_phone_idx` em `(tenant_id, phone)`
(`src/db/schema/core.ts`).

Duas primeiras reservas **simultâneas do mesmo telefone novo**: uma insere, a outra estoura com
`Failed query: insert into "users" ...`. A server action **relança** (corretamente — é
infraestrutura, não disputa de número), então o comprador recebe erro de servidor, não mensagem.

Medido com sonda descartável, 5 rodadas × 6 operações simultâneas: identidade não pré-criada → **6
rejeições**; identidade pré-criada → **0**.

**Why:** é caminho do dinheiro e o caso real é banal — primeira compra da vida, conexão ruim, duas
batidas em "Reservar". E a suíte **não o vê**: `tests/money-path/reserve-concurrency.test.ts` gera
um telefone **distinto** por disputante, então a corrida de identidade nunca acontece lá.

**How to apply:** (a) qualquer teste de concorrência de reserva com o **mesmo** telefone tem de
pré-criar a identidade (`createBuyer`) ou vai medir este defeito em vez do que pretende medir —
`tests/money-path/expiracao-entre-compradores.test.ts` faz isso e explica por quê; (b) se aparecer
story para consertar, o conserto é `onConflictDoNothing` + releitura, ou
`onConflictDoUpdate ... returning`, e tem de continuar **fora** da transação da reserva (a razão
está escrita no código: desfazer a identidade junto apagaria a ficha do anti-spam de quem perdeu
uma disputa).

## Limite nomeado da varredura de expiração

`src/lib/raffles/expire-reservations.ts` não tem teto de lote: um parâmetro por pedido candidato em
`inArray`. Não morde no uso orgânico (a varredura roda em toda reserva e em toda visita à grade),
**morde numa importação em massa** de pedidos `pending` históricos — isto é, na própria migração do
Império deste epic. Acima de ~30 mil candidatos chega-se ao limite de bind parameters do Postgres.
O teto seria um `.limit(N)` nas duas leituras de candidatos, tornando a varredura incremental.
