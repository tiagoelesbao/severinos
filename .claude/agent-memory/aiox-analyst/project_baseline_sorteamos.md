---
name: baseline-sorteamos
description: Baseline da Sorteamos (plataforma do Império) como alvo de paridade do apps/lotemania — onde está, o que é confirmado e o que depende de observação ao vivo
metadata:
  type: project
---

O `apps/lotemania` é o **sucessor da Sorteamos**, a plataforma de sorteios que roda o Império
Prêmios. **O fonte da Sorteamos não existe mais** — a especificação de paridade só pode ser
extraída do sistema rodando.

A baseline vive em `docs/research/2026-11-16-baseline-sorteamos/` (6 documentos: índice, API,
domínio, telas, lacunas, pendências). O documento `05-pendente-de-observacao.md` é um **roteiro de
navegação** — tela, pergunta, evidência — não uma lista de desejos.

**Why:** a baseline vira especificação de implementação. Um campo inventado nela vira código
errado. Por isso todo documento usa marcadores de procedência (`[PROD]`, `[AMOSTRA]`,
`[BRIEFING]`, `[RELATO]`, `[DEFENSIVO]`, `[INFERIDO]`, `[NÃO OBSERVADO]`) e "não confirmado" é
resposta preferível a palpite plausível.

**How to apply:** antes de inferir qualquer coisa sobre a Sorteamos, checar se já está nesses
documentos — e respeitar o marcador. Comentário em `apps/lotemania` descrevendo "o original" é
`[RELATO]`, nunca observação: o README do app, por exemplo, erra a contagem dos relatórios da
Sorteamos e descreve um índice em `product_numbers` que não existe no schema.

## Os três fatos que mais mudam decisão

- **A fonte mais rica é o nosso próprio código**, não documentação: `client_api.py` (574 linhas,
  com achados datados ao vivo), `bi_aggregator.py`, `order-paid.js`.
- **O payload do webhook `order.paid` não tem o mesmo formato do REST** (usuário em `data.user`
  com `id`, rastreio dentro de `data.params`). Quem assume um formato só erra metade.
- **A lacuna real do lotemania não é tela, é pedido:** faltam ~15 campos do `order` (todos de
  pagamento e atribuição, incluindo `approvedBy`, que é a baixa manual), o fechamento do pedido
  no webhook é um `TODO`, e não há export de arquivo. Ver [[sorteamos-baixa-manual]].
