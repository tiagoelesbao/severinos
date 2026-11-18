---
name: lotemania-imperio-migration
description: EPIC-LTM — migrar o Império Prêmios da Sorteamos para apps/lotemania; os 4 problemas de fundação, o volume real e por que a cota dividida está bloqueada
metadata:
  type: project
---

Migração do **Império Prêmios** de `painel.rapidinhas24hr.com` (Sorteamos) para `apps/lotemania`
(importado 2026-11-16, commit `2ac7d133`). Epic: `docs/epics/03-Product/current/EPIC-LTM-Imperio-Migration.md`.
Stories LTM-01..05 em `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/`.

**Why:** o lotemania é a plataforma própria do founder e sucessora da Sorteamos. O corte só é
autorizado por 7 portões medidos (G1..G7 no epic), não por sensação de pronto.

**How to apply:**

- O lotemania é **andaime, não clone funcional**: 3 páginas de dashboard são arquivos vazios,
  `reports` tem 22 linhas, e **ninguém nunca comprou nada** — o webhook de pagamento era um `TODO`.
  Nunca tratar como sistema em produção.
- **Contenção, não volume, é o gargalo.** 100 números por rodada, 5 rodadas simultâneas,
  esgotamento mais rápido medido em **18 min** (~5,5 números/minuto), ≈R$ 90 mil/dia. ~900 mil
  linhas/ano é trivial para Postgres *com índice*.
- Três frentes separadas: **A — fundação** (LTM-01..05, este epic), **B — paridade** (bloqueada pela
  baseline em `docs/research/2026-11-16-baseline-sorteamos/`), **C — features novas**.
- **A cota dividida (número comprado inteiro ou em duas metades) está deliberadamente fora de
  story.** Ela quebra a premissa de um dono por linha em `product_numbers` — que é exatamente o que
  torna o UPDATE condicional da reserva atômico — e dobra a contenção. Passa por `/grill-with-docs`
  só depois de LTM-01, LTM-02 e LTM-05 estarem Done. Se alguém pedir essa feature antes, a resposta
  é a dependência, não um "vamos tentar".
- Ordem real de execução: `LTM-05 + LTM-01` → `LTM-02` → `LTM-03 + LTM-04`. F2 antes de F3 porque
  fechar pedido sem transação recria o problema com dinheiro já capturado; F5 cedo porque o teste de
  concorrência vermelho **é** o critério de aceite da LTM-02.

Relacionado: [[contrato-existente-antes-de-inventar]], [[sorteamos-nunca-gravou-utm]]
