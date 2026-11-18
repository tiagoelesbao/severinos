# LTM-10: A lista de compras do sorteio — abas, busca e ações por linha

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P1** — é a tela onde o operador trabalha o dia inteiro, e hoje ela quase não faz nada
**Complexidade:** L
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-painel-acoes-por-sorteio.md`

## Story

**Como** operador do Império acompanhando uma rodada que esgota em 1,8 h
**Eu quero** filtrar, buscar e agir sobre uma compra sem sair da tela
**Para que** eu consiga responder um comprador, expirar uma reserva travada ou conferir números no ritmo em que a rodada acontece.

## Contexto

`/dashboard/invoice/{productId}/orders` na Sorteamos contra
`/dashboard/products/{id}/orders` no lotemania, medido em 2026-11-17:

| | Sorteamos | lotemania |
|---|---|---|
| Abas | **5** — Todos, Pagos, Reservado, Expirados, **Afiliados** | 4 (sem Afiliados) |
| Busca | por **Nome** e por **Título** | nenhuma |
| Ações por linha | **5** | **1** (Detalhes) |
| Seleção em massa | checkbox por linha e no cabeçalho | não existe |

As cinco ações por linha, com os rótulos exatos lidos da árvore de acessibilidade:

1. `Enviar mensagem no WhatsApp`
2. *(ícone sem rótulo — aparenta ser aprovar/marcar pago)* `[CONFIRMAR]`
3. `Expirar compra`
4. `Ver números`
5. `Detalhes`

## Tarefas (Checklist)

- [ ] Aba **Afiliados** e a consulta que a alimenta.
- [ ] Busca por **nome** do comprador e por **número de título**, com os mesmos dois campos.
- [ ] `Ver números` — o que o comprador levou naquela compra.
- [ ] `Detalhes` — expandir o que já existe para paridade de campos.
- [ ] `Enviar mensagem no WhatsApp` — abre `wa.me` com o telefone do comprador.
- [ ] `Expirar compra` — **mutante**, exige confirmação nomeando o que será liberado.
- [ ] Ação 2 — **só depois de `[CONFIRMAR]`** o que ela faz. Não implementar por dedução.
- [ ] Seleção em massa (checkbox) — **só a seleção**; o que fazer com ela é outra story.

## Critérios de Aceite

- [ ] **AC1 (as cinco abas filtram de verdade):** cada aba devolve exatamente o conjunto que o nome promete, verificado por contagem contra o banco. A aba **Afiliados** mostra as compras com `affiliateId` preenchido.
- [ ] **AC2 (busca combina com aba):** buscar com uma aba ativa filtra **dentro** dela, não sobre o total.
- [ ] **AC3 (expirar é deliberado):** `Expirar compra` pede confirmação que diz **quantos títulos** voltam a ficar disponíveis, e a ação é registrada com quem fez e quando. Sem confirmação não há expiração.
- [ ] **AC4 (expirar devolve os títulos):** depois de expirar, os títulos daquela compra ficam `available` e o pedido `canceled`. Contagens antes/depois.
- [ ] **AC5 (WhatsApp usa o telefone real, sem vazar):** o link abre com o telefone do comprador em E.164 e **o telefone não aparece em log, URL de página nem analytics**.
- [ ] **AC6 (nada muta sem rastro):** toda ação mutante desta tela grava autor e horário.

## Escopo

**IN:** as cinco abas, as duas buscas, as quatro ações confirmadas, seleção em massa (só a seleção).

**OUT:** o menu de 13 itens (é a `LTM-11`); o dashboard por sorteio (`LTM-12`); os exports (`LTM-13`); qualquer ação em massa; a ação 2 enquanto não for confirmada.

## Dependências

- **Independe da fundação.** Toca só telas de painel e consultas de leitura, fora do caminho da reserva.
- ⚠️ `Expirar compra` mexe em `product_numbers` — **depois** da `LTM-02`, para não escrever compensação manual que ela vai remover.
- ⚠️ **O AC6 depende da `LTM-16`.** *"Toda ação mutante grava autor e horário"* pressupõe uma trilha de ação de operador que **não existe** — conferido em 2026-11-18: nenhuma das 34 tabelas do schema é de auditoria de ação humana, e a única trilha da base (`payment_webhook_events`) é de aviso de gateway. A `LTM-16` entrega a trilha; esta story **liga** as ações dela. Sem a `LTM-16`, o AC6 não fecha — e implementar a trilha aqui a reinventaria pela segunda de três vezes (`LTM-11` AC4 e `LTM-13` AC7 pedem a mesma coisa).

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/dashboard/products/[id]/orders/page.tsx            (abas, buscas, consultas)
  apps/lotemania/src/app/dashboard/products/[id]/orders/order-detail-dialog.tsx
  apps/lotemania/src/app/dashboard/products/[id]/orders/orders-filters.tsx  (novo — as duas buscas)
  apps/lotemania/src/app/dashboard/products/[id]/orders/order-row-actions.tsx (novo — as 4 acoes)
  apps/lotemania/src/app/dashboard/products/[id]/orders/order-numbers-dialog.tsx (novo — "Ver numeros")
  apps/lotemania/src/lib/actions/orders.ts                                  (novo — "Expirar compra")
  apps/lotemania/tests/dashboard/orders/**                                  (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — esta story nao gera migracao, logo nao disputa drizzle/meta/_journal.json

Depends-on: LTM-02 (para "Expirar compra"), LTM-16 (para o AC6)
```

- ⚠️ **`src/lib/actions/orders.ts` é novo e deliberadamente NÃO é `reserve.ts`.** Expirar uma compra devolve títulos ao estado `available`, que é exatamente o que a varredura de expiração da `LTM-02` faz (`reserve.ts`) — a tentação é editar lá. **Não editar:** `reserve.ts` é o caminho do comprador, está sob concorrência e é disputado pela `LTM-03b` e pela `LTM-04`. Se for preciso reusar lógica, ela é **extraída** por quem for dono de `reserve.ts`, não copiada nem editada daqui.
- ✅ **Pode compartilhar onda com a `LTM-12` e a `LTM-15`** — conjuntos disjuntos (painel por sorteio e catálogo da loja), nenhuma gera migração.
- ⛔ **Não pode compartilhar onda com a `LTM-11`:** as duas vivem na mesma tela (`orders/page.tsx`).
- ⛔ **Não pode compartilhar onda com a `LTM-13`** se a `LTM-13` for lida como dona da mesma tela — ver a nota de ondas dela.

## Riscos

- **[Alto] `Expirar compra` num sorteio ativo** libera título que alguém pode ter pago segundos antes. AC3 e AC4 existem por isso.
- **[Médio] A ação 2 implementada por dedução.** Se ela for "marcar como pago", errar é creditar pagamento que não existiu. Por isso está em OUT até ser observada.
- **[Médio] Telefone em log.** A tela inteira lida com dado pessoal; AC5 trata o caso mais fácil de vazar.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` (a story era indespachavel sem ele). O AC6 passa a depender da `LTM-16`: a trilha de acao de operador que ele presume nao existe em nenhuma das 34 tabelas do schema. Registra por que `Expirar compra` NAO pode editar `reserve.ts`. | @aiox-master |
| 2026-11-17 | 1.0 | Nasce da observação do painel com o founder. | @aiox-master |
