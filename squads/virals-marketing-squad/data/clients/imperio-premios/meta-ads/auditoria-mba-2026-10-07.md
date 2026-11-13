# Auditoria MBA vs. Trabalho Real — Império Prêmios (2026-10-07)

Fonte de verdade da Apostila: `docs/meta_mba/Apostila/` (16 módulos) +
`docs/meta_mba/MODULO_01_FUNDAMENTOS_OFICIAIS_ECOSSISTEMA_E_ESTRUTURA.md`
(versão raiz = adaptação pro cliente, com o Kickoff Kit dos 5 Gates, seção
6, e o caso prático de sorteios, seção 7 — é ESTE arquivo, não o da pasta
Apostila/, que define os Gates). Comparado contra `gates-status.yaml`
(auditado linha a linha) e o código real em `services/Meta/imperio-premios/`.

## 1. Checklist Gate 0-4 (seção 6.2 do Módulo 01 raiz) — status real

| Gate | Pergunta | Status | Nota |
|---|---|---|---|
| **0. Elegibilidade** | Oferta permitida + margem definida? | 🟡 Parcial | Autorização Meta OK. Falta: parecer jurídico Lei 5.768/1971 (fora do nosso escopo) e meta de margem líquida (10% vs 15%) — isso trava o CAC_max real, ainda não decidido com o cliente. |
| **1a. Governança** | Pixel/pagamento em BM separada da execução? | 🟡 Parcial | Pixel/Página separados OK. BM de pagamento e conta de contingência seguem pendentes — ponto único de falha real, não é só burocracia. |
| **1b. Sinais** | Pixel+CAPI deduplicado, EMQ≥8.0? | 🟢 OK (com ressalva) | EMQ real = 9,3/10 (confirmado no Events Manager, acima do mínimo). Dedup = 99,69% (confirmado). **Inconsistência no próprio arquivo**: `dedup_capi_nativa_vs_nosso_pipeline` ainda está `status: pendente` no item (linha 60-62), mas a nota em `test_events_validado` (gate 3) já documenta "VERIFICAÇÃO DE DEDUP — RESOLVIDA". Recomendo sincronizar o campo de status. |
| **2. Estrutura/Criativo** | Orçamento cobre 50 eventos/7d? ≥3 ângulos? | 🟡 Não verificado numericamente | 5 ângulos definidos (acima do mínimo de 3) — OK. A fórmula do Módulo 01 §4.4 (`Budget_min/dia ≈ 50/7 × CPA_alvo`) nunca foi checada contra o volume real de Purchase que a campanha gera — o brief.yaml deliberadamente zera `cpa_alvo` (decisão correta, documentada: recompra intensa invalida CPA fixo), mas isso significa que o teste de "saiu do aprendizado" não tem como ser feito pela fórmula padrão. Sugestão: medir direto — quantos "purchase" o Ads Manager contou nos últimos 7 dias corridos vs. o piso de 50. |
| **3. Lançamento** | Go-live com orçamento calculado? | 🟢 OK, campanha no ar | R$700/dia, estrutura 1 campanha + 1 ad set consolidado + 4 anúncios — bate com a campanha real confirmada via API. |
| **4. Medição** | Como saberemos se é incremental? | 🟡 Parcial | BI novo resolve leitura de resultado, mas não é plano de incrementalidade. `plano_incrementalidade: nao_aplicavel` com justificativa correta (Módulo 11: GeoLift só se justifica com gasto maior) — isso está CERTO segundo o próprio módulo, não é lacuna. |

## 2. Divergências reais do MBA

**Nenhuma divergência de severidade alta encontrada.** Duas decisões que
PARECEM desvio mas são adaptações justificadas e documentadas:

1. **`cpa_alvo: null`** no brief — o template do Módulo 01 §6.3 pede um
   CPA alvo numérico. O time documentou por que não se aplica (recompra de
   78 compras/usuário em 90d invalida CPA fixo) e optou por otimizar por
   VALOR. Isso é consistente com a própria recomendação do Módulo 04
   (Bid Strategies) de otimizar pelo evento certo pro modelo de negócio —
   não é um desvio, é uma leitura correta de um caso em que o template
   genérico não serve.
2. **Otimização ainda em `OFFSITE_CONVERSIONS` (volume), não VALOR**,
   mesmo com Business Verification já aprovada (que era o bloqueio
   técnico). A equipe decidiu adiar a troca pra VALOR até resolver a
   contaminação do sinal de fbc — essa é uma decisão PRUDENTE, não uma
   violação: o Módulo 08 (CAPI/EMQ/Dedup) é claro que otimização por valor
   depende de sinal de receita limpo chegando ao pixel, e o próprio achado
   de 2026-10-07 (ROAS 0,47 em novo público escondido atrás de ROAS
   agregado de 7x) prova que o sinal ainda tem ruído real de atribuição.

## 3. O que o MBA prescreve que ainda não começamos

Direto da seção 4.3 do Módulo 01 (raiz) — **estrutura padrão de qualquer
cliente é DUAS campanhas**, não uma:

> Campanha 1: Advantage+ Vendas/Leads (70-80% do budget) + **Campanha 2:
> CBO Creative Testing (20-30%)** — "vencedores migram" pra campanha 1.

Hoje só existe a Campanha 1. A **Campanha 2 (CBO Creative Testing)** é
literalmente o próximo passo prescrito pelo próprio framework — e já está
nomeada como tal em `campaign-plan-wave1.md` ("Campanha 2 — CBO Teste de
Criativos"), então não é uma lacuna de planejamento, é trabalho ainda não
executado. Isso também é o que `gates-status.yaml` já chama de "campanhas
2 e 3" pendentes — bate com o framework.

Outros itens claramente "fase seguinte, não agora" segundo os próprios
módulos, e corretamente tratados como tal no gates-status.yaml:
- **GeoLift/incrementalidade (Módulo 11)** — módulo é explícito que isso
  exige volume de mídia maior. Prematuro agora, status `nao_aplicavel` está
  certo.
- **CRM offline sync / Revenue Intelligence (Módulo 14)** — não iniciado,
  e não deveria estar — é fase de maturidade mais avançada que onde o
  cliente está (cold start há 2 dias).
- **Escala/Decision Science (Módulo 12)** — mesma lógica, fase futura.

## 4. Avaliação honesta do BI construído hoje

**Não existe módulo de "BI" ou "dashboard" na Apostila.** Busquei em todos
os 16 módulos — zero resultado pros termos "dashboard"/"Business
Intelligence". O BI (`apps/BI/imperio-premios/`) é uma construção PARALELA
nossa, sem precedente direto no MBA como produto entregável — isso precisa
ficar claro pro founder, não é "seguindo o módulo X do curso".

Dito isso, os **números/fórmulas** que o BI usa batem com o MBA de verdade,
não foram inventados:
- `MER = Receita Bruta Total / Gasto Total em Mídia Paga` — **fórmula
  idêntica** à do Módulo 01 §3.1-D. ✅ correspondência exata.
- Margem de Contribuição, ROAS Break-Even — mesma lógica do §3.1-A/B.
- **Gap real**: o Módulo 01 §3.1-C define `CAC_max = MC - (PV × %ML)` como
  um TETO calculado a priori (quanto você PODE gastar). O BI hoje só
  calcula o CAC REAL (quanto você gastou de fato) e infere problema via
  "margem negativa" — nunca calcula e mostra o `CAC_max` da fórmula oficial
  lado a lado. Seria mais fiel ao módulo mostrar os dois juntos
  (CAC real vs. CAC_max), não só margem negativa como proxy.
- O Módulo 13 (SQL/Python pra auditoria + "Detector Multivariado de
  Anomalias") e o Módulo 10 ("Comparador de Janelas de Atribuição") são os
  dois projetos práticos mais próximos em espírito da página
  `qualidade.html` que construímos hoje (prova de dado, detecção de
  problema) — vale citar esse paralelo pro founder como "inspirado no
  método do Módulo 13", não fingir que é módulo oficial de BI.

## 5. Limpeza recomendada em gates-status.yaml (achado desta auditoria)

Dois campos ficaram desatualizados depois da correção rápida de hoje:
1. `gate_1b_sinais.itens.dedup_capi_nativa_vs_nosso_pipeline.status` ainda
   diz `pendente` — já está resolvido (ver nota em `test_events_validado`).
2. `resumo.proximo_passo_imediato` ainda diz "escalar pro dev da
   plataforma" — isso foi substituído por correção própria no mesmo dia.
   Sugestão de novo texto: "Campanha 2 (CBO Creative Testing) é o próximo
   passo segundo a estrutura padrão do Módulo 01 §4.3 — ainda não criada."

## Resumo pro founder

Nada crítico fora de conformidade. Os 5 Gates estão majoritariamente OK ou
parcialmente OK com pendências já conhecidas (margem líquida, BM de
pagamento, parecer jurídico — nenhuma bloqueia o que já está rodando). A
única peça do framework ainda não executada é a **Campanha 2 (CBO Creative
Testing)**, que é o próximo passo oficial da estrutura padrão do curso, não
invenção nossa. O BI de hoje não tem módulo correspondente no MBA (é
construção nossa), mas as fórmulas financeiras usadas nele são as mesmas
do Módulo 01 — só falta mostrar o CAC_max oficial ao lado do CAC real.
Achei e aponto uma inconsistência de bookkeeping no gates-status.yaml
(2 campos desatualizados) pra corrigir.
