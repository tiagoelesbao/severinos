# LTM-12: Painel de controle por sorteio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P1**
**Complexidade:** M
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-painel-acoes-por-sorteio.md` §2

## Story

**Como** operador decidindo se empurra mais tráfego para uma rodada
**Eu quero** ver, numa tela só, como aquele sorteio está indo
**Para que** a decisão seja sobre o número e não sobre a impressão.

## Contexto

`/dashboard/products/{id}/dashboard` na Sorteamos, título **"Geral: Campanha"**. Onze cartões,
lidos em 2026-11-17:

```
Faturamento · Compras · Ticket Médio
Visitas Hoje · Visitas Ontem · Visitas Total
Expirados      (contagem + total R$)
Upsell         (contagem + total R$)
Descontos      (contagem + total R$)
Participantes  (total + hoje)
```

Mais o gráfico **"Desempenho da Campanha Por Dia"** (faturamento e quantidade).

**O lotemania não tem a página.** Mas tem a matéria-prima: `pageViews` já é alimentada pelo layout
da loja — `src/app/loja/[tenant]/layout.tsx` insere uma linha a cada visita, e o comentário ali diz
que isso existe para alimentar *"the admin dashboard's Visitas Hoje/Ontem/Total cards with real
traffic instead of static numbers"*. A tabela enche desde sempre e **nunca foi lida**.

## Tarefas (Checklist)

- [ ] Rota `/dashboard/products/{id}/dashboard`.
- [ ] Os onze cartões, com os mesmos rótulos.
- [ ] Gráfico de desempenho por dia (faturamento e quantidade).
- [ ] Consulta de visitas a partir de `pageViews`, por sorteio.
- [ ] `Upsell` e `Descontos`: **`[CONFIRMAR]`** o que a Sorteamos conta aí. Há `discount_links` no
      schema; upsell não tem correspondente óbvio.

## Critérios de Aceite

- [ ] **AC1 (os números batem):** Faturamento, Compras e Ticket Médio conferem com consulta direta
      ao banco para o mesmo sorteio. Ticket Médio é faturamento ÷ compras **pagas**, e o teste
      prova a definição, não só o valor.
- [ ] **AC2 (visitas vêm de `pageViews`):** Hoje, Ontem e Total saem da tabela real. Nenhum número
      estático — era exatamente o que o comentário no código prometia e nunca entregou.
- [ ] **AC3 (Expirados conta e soma):** mostra quantidade **e** total em reais, como na Sorteamos.
- [ ] **AC4 (gráfico com dia sem venda):** um dia sem venda aparece como **zero**, não some do
      eixo. Buraco silencioso em série temporal é o jeito mais fácil de ler tendência errada.
- [ ] **AC5 (sorteio sem nada não quebra):** sorteio recém-criado mostra zeros, não erro nem tela
      vazia.
- [ ] **AC6 (nenhuma métrica inventada):** cartão cuja origem não existe no lotemania **não é
      exibido com zero** — fica fora até a `[CONFIRMAR]` ser respondida. Zero mentiroso é pior que
      ausência.

## Escopo

**IN:** a rota, os cartões cuja origem existe, o gráfico, as visitas reais.
**OUT:** Upsell e Descontos enquanto `[CONFIRMAR]`; comparação entre sorteios; exportar o painel.

## Dependências

- **Depende da `LTM-04`** para o que for atribuição.
- **Independe da fundação** no resto — é leitura.

## Riscos

- **[Médio] Ticket Médio com definição diferente da Sorteamos.** Se eles dividem por **todas** as
  compras e nós por pagas, o número diverge e parece erro de dado. AC1 fixa a definição.
- **[Médio] `pageViews` cresce sem limite.** Uma linha por visita, e o Império faz ~272
  visitas/dia **por sorteio**. Precisa de índice e de política de retenção — e **a `LTM-01` não
  cobre esta tabela**.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce da observação do painel com o founder. | @aiox-master |
