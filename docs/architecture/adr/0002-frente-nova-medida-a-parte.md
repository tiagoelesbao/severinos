# ADR-0002 — A frente nova é medida à parte, não somada à atual

**Status:** Aceito
**Data:** 2026-11-17
**Decisor:** founder
**Afeta:** `LTM-04`, o portão **G3** do `EPIC-LTM-Imperio-Migration`, e o BI do Império
**Relacionado:** [`ADR-0001`](0001-meia-cota-como-linha.md)

---

## Contexto

O Império roda hoje na **Sorteamos**: ~177 rodadas por semana, **10.550 pedidos pagos**,
**R$ 639 mil**, **≈ R$ 90 mil/dia** atravessando o fluxo. Tudo isso é lido pelo nosso ETL
(`services/Meta/imperio-premios/`), agregado em `apps/BI/imperio-premios/data-*.json` e servido
pelo dashboard em `imperio-bi.vercel.app`. É por esse número que o investimento de mídia é
decidido.

O **lotemania** é a plataforma sucessora. Até 2026-11-17 ela nunca vendeu nada.

A `LTM-04` foi escrita com uma premissa: o lotemania emitiria exatamente o que os consumidores
atuais já consomem, para que migrar o `client_api.py` fosse "trocar a URL base e nada mais". Isso
é verdade e continua necessário — é o portão **G3**. Mas carregava junto uma leitura **errada**:
a de que um dia o lotemania simplesmente substituiria a fonte do BI atual.

## Decisão

**A frente nova é medida por um caminho inteiramente próprio, em paralelo ao atual, sem tocar
nele.**

O padrão da casa é replicado ponta a ponta, não compartilhado:

```
HOJE (intocado até o corte)              NOVO (em paralelo)
─────────────────────────────            ──────────────────────────────
services/Meta/imperio-premios/           coleta própria do lotemania
        ↓                                        ↓
apps/BI/imperio-premios/data-*.json      dados próprios
        ↓                                        ↓
imperio-bi.vercel.app                    projeto Vercel próprio
```

Nas palavras do founder: *"uma nova frente da empresa aberta com tudo à parte do que roda
principal hoje, para não haver interferência e fazermos uma transição realmente gradual."*

Quatro consequências diretas:

1. **O BI atual não muda.** Continua lendo a Sorteamos até o corte.
2. **Coleta própria**, lendo a API de leitura que a `LTM-04` constrói — nunca o banco direto.
3. **Dashboard próprio**, projeto Vercel próprio. Não é uma aba no BI existente.
4. **Os dois coexistem**, e a comparação entre eles **é** a evidência do portão G3.

## Alternativa rejeitada: uma fonte, duas origens

Fazer o ETL atual ler as duas plataformas e somar no mesmo `data-*.json`, com o dashboard de hoje
mostrando o total.

**Por que não:**

- **Interferência.** Um defeito no lotemania — que nunca vendeu nada e cujo webhook de pagamento
  ainda é um `TODO` — poluiria o número pelo qual R$ 90 mil/dia de decisão são tomados. O risco é
  assimétrico: o lado novo tem tudo a ganhar e o lado antigo tem tudo a perder.
- **Soma esconde divergência.** Se o lotemania contar pedido pago de um jeito diferente, o total
  continua parecendo plausível e ninguém descobre. Duas séries lado a lado **mostram** a
  divergência; uma série somada a **engole**.
- **Transição deixa de ser gradual.** Com uma fonte só, o corte vira evento binário. Com duas, dá
  para subir uma ação, medir, e decidir — que é o que o founder pediu.

## Consequências

### Boas

- Falha no lotemania não contamina a operação que paga as contas.
- A janela de leitura dupla do **G3** deixa de ser um exercício montado para o corte e passa a ser
  o modo normal de operar: duas séries, sempre visíveis.
- Dá para subir uma ação por vez no sistema novo e medir isoladamente.

### Custos aceitos

- **Duplicação do caminho de agregação.** Dois coletores, dois conjuntos de dados, dois projetos
  Vercel.
- **Manutenção dobrada** enquanto durar a transição.

### ⚠️ A armadilha que esta decisão cria

**Se os dois dashboards computarem "faturamento" ou "pedido pago" de formas diferentes, a
comparação do G3 não prova nada — e vai parecer que prova.**

É o modo de falha específico desta arquitetura, e é silencioso: dois números próximos mas não
idênticos levam a semanas de "deve ser arredondamento" até alguém descobrir que um conta pedido
pago por `paidAt` e o outro por `status`.

**Mitigação obrigatória:** as definições das métricas são **derivadas de uma fonte única**, não
reimplementadas de olho. Antes de o G3 ser avaliado, as duas pontas precisam concordar **no mesmo
período da mesma plataforma** — se o coletor novo lê a Sorteamos no mesmo intervalo que o atual, os
números têm de bater **exatamente**. Qualquer diferença é defeito de definição, e precisa ser
resolvida antes de o número servir de prova.

## Notas

O portão **G7** (dado pessoal) vale igual no caminho novo. O aviso de pagamento da Paysure traz
`payer_name` e `payer_document` (**CPF**) — seção 5.4 de
`docs/research/2026-11-16-paysure-contrato.md` — e a política de 2026-11-12 não abre exceção para
frente nova.
