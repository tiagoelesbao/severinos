# LTM-07: A meia cota — o domínio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente C — a feature que o cliente pediu)
**Prioridade:** **P0** — entra no primeiro sorteio de teste, e define a forma de `reserve.ts` antes de a `LTM-02` reescrevê-lo
**Complexidade:** L — schema, reserva e rateio. A superfície está na `LTM-08`
**Criada por:** @aiox-master · 2026-11-17, a partir do `/grill-with-docs` com o founder
**Decisão de arquitetura:** `docs/architecture/adr/0001-meia-cota-como-linha.md`
**Vocabulário:** `GLOSSARY.md` → título, meia cota, sorteio divisível, metade órfã, rateio, unidade

## Story

**Como** Império, que quer sortear 100 mil e 200 mil sem aumentar o preço de entrada
**Eu quero** vender cada título inteiro **ou** em duas metades, a duas pessoas
**Para que** o prêmio possa crescer sobre os mesmos 100 títulos, com quem comprou metade concorrendo a metade do prêmio.

## Contexto

### A propriedade que não pode ser perdida

`src/lib/actions/reserve.ts`:

```ts
const reserved = await db.update(productNumbers)
  .set({ status: "reserved", orderId: order.id, reservedUntil: ... })
  .where(and(
    eq(productNumbers.productId, product.id),
    inArray(productNumbers.number, data.numbers),
    eq(productNumbers.status, "available"),
  ))
  .returning({ number: productNumbers.number });

if (reserved.length < data.numbers.length) { /* desfaz tudo */ }
```

Isto é atômico **porque cabe exatamente um dono por linha**. Sem travamento, sem transação (o
driver `neon-http` não suporta), sem leitura-antes-de-escrever. A condição dentro do próprio
`UPDATE` faz o banco resolver a disputa; a conferência de contagem detecta quem perdeu.

**A meia cota dobra a contenção** exatamente aqui: o esgotamento medido chega a **18 minutos para
100 títulos** (~5,5/min), com **5 rodadas simultâneas**.

### A forma escolhida, e por quê

**A metade é uma linha, não uma coluna** (ADR-0001). Num sorteio divisível, `product_numbers` tem
uma linha por metade — 100 títulos são 200 linhas — e comprar inteiro é reservar as duas linhas
daquele número **na mesma instrução**. O `UPDATE` condicional **não muda de forma** e a
conferência de contagem continua valendo sem alteração.

Sorteio de cota inteira é o caso degenerado de uma metade só: segue com uma linha por título.

### O sorteio não é nosso

**Nada no código escreve em `winners`.** O sorteio acontece fora do sistema; o operador registra
o resultado depois. O rateio desta story é **registro de resultado**, não cálculo de sorteio.

## Tarefas (Checklist)

### Schema

- [ ] `product_numbers`: coluna `half` (ordinal da metade dentro do título) + `uniqueIndex` em
      `(product_id, number, half)`. Em sorteio de cota inteira existe uma metade só.
- [ ] `products`: marcador de **sorteio divisível** e a **unidade** derivada dele.
- [ ] `orders`: campo **explícito** para a unidade e para a contagem na unidade do sorteio.
      **Não reinterpretar `quantity`** — ver AC7.
- [ ] `winners`: já comporta uma linha por ganhador; confirmar que nada no código assume uma
      linha por `winning_number`.
- [ ] Migração versionada — depende do regime da `LTM-01`.

### Regras

- [ ] Habilitar divisibilidade **recusa** sorteio cujo prêmio não seja em dinheiro.
- [ ] Divisibilidade vira **somente-leitura na primeira venda**.
- [ ] Geração dos títulos do sorteio cria uma ou duas linhas por número conforme a divisibilidade.

### Reserva

- [ ] `reserve.ts`: o pedido passa a ser uma **lista de metades**; título inteiro são as duas
      metades daquele número na mesma lista.
- [ ] Expiração **por metade**, com relógio próprio.
- [ ] Contador anti-spam conta **metades**, não títulos.
- [ ] `amount` calculado na unidade do sorteio — metade custa **exatamente metade**, sem ágio.

### Rateio

- [ ] Registro de ganhador por **linha por pessoa**, com `prize_amount` já rateado, todas
      apontando para o mesmo `winning_number`.
- [ ] Metade órfã em título sorteado → **prêmio inteiro** a quem tem a metade vendida.

## Critérios de Aceite

- [ ] **AC1 (uma metade, um dono):** sob concorrência, duas reservas disputando a **mesma** metade
      produzem exatamente um dono. Teste com as duas disparadas em paralelo, contagem medida.
- [ ] **AC2 (inteiro é tudo ou nada):** reservar o título inteiro reserva **as duas** metades ou
      **nenhuma**. Teste monta o estado em que a metade B já está reservada por outra pessoa e
      verifica que a metade A **não** ficou presa ao pedido perdedor.
- [ ] **AC3 (expiração não contamina):** expirar a metade A não altera `status`, `order_id` nem
      `reserved_until` da metade B. Contagens antes/depois.
- [ ] **AC4 (o rateio fecha):** a soma dos `prize_amount` das linhas de `winners` de um título
      sorteado é **exatamente** o prêmio do título. Nem um centavo a mais, nem a menos — teste com
      valor que não divide redondo (ex.: R$ 100.000,01).
- [ ] **AC5 (metade órfã paga inteiro):** título com uma metade vendida e uma não vendida, sorteado
      → **uma** linha de `winners` com o prêmio **integral**.
- [ ] **AC6 (duas metades do mesmo dono não se fundem):** quem compra as duas metades do 42 aparece
      como **dois** rateios, não um pagamento único.
- [ ] **AC7 (nenhum significado muda em silêncio):** num sorteio divisível, o consumidor do pedido
      consegue saber a unidade **sem inferir**. Teste de contrato: a leitura de um pedido de
      sorteio divisível e a de um de cota inteira se distinguem por campo explícito, não por
      heurística sobre `quantity`.
- [ ] **AC8 (cota inteira intacta):** regressão — todo teste de reserva de sorteio não divisível
      passa sem alteração. É o que garante que as 5 rodadas/dia do Império não mudam de forma.
- [ ] **AC9 (congelamento):** tentar alterar a divisibilidade de um sorteio com pelo menos uma
      venda falha com motivo nomeado, e **não** altera nada.
- [ ] **AC10 (prêmio divisível):** habilitar divisibilidade em sorteio cujo prêmio não é dinheiro
      falha com motivo nomeado.

## Escopo

**IN:** schema da metade; marcador e unidade do sorteio; geração dos títulos; reserva na nova
forma com expiração e anti-spam por metade; cálculo de valor; rateio no registro de ganhador; as
regras de recusa (prêmio não divisível, congelamento).

**OUT:** tudo que o comprador e o operador **veem** — grade partida, rótulo de unidade, anúncio
dos dois valores, marcação da metade em relatório, contagem de metades órfãs no painel. É a
`LTM-08`. Também fora: ágio sobre a metade (decidido: não existe), divisão em mais de duas partes,
revenda ou transferência de metade, e qualquer automação do sorteio — que não é nosso.

## Dependências

- **Depende de `LTM-01`** — a forma desta story é o que a `LTM-01` tem que indexar. Elas **se
  resolvem juntas**: criar índice sobre a forma antiga e depois mudar a forma é trabalho jogado
  fora.
- **Depende de `LTM-02`** — reserva atômica sob o dobro da contenção.
- **Depende de `LTM-05`** — AC1 a AC6 são todos de concorrência ou de invariante; nenhum se
  verifica à mão.
- **Precede `LTM-08`** — a superfície mostra o que este domínio define.
- ⚠️ **Gera migração.** Serializar `pnpm db:generate` com `LTM-01`, `LTM-03a` e `LTM-04`.

## O que esta story muda nas outras — **@po precisa revalidar**

As quatro abaixo estão em `Ready` ou `Draft` com escopo escrito **antes** desta decisão.

| Story | O que muda |
|---|---|
| `LTM-01` | o índice passa a ser sobre `(product_id, number, half)`, não `(product_id, number)` |
| `LTM-02` | a reserva que ela torna transacional é a de metades, não a de títulos |
| `LTM-05` | a suíte nasce provando os invariantes do ADR-0001. **Escrita para cota inteira, ela provaria invariantes que deixam de valer** |
| `LTM-03a` | o fechamento de pedido marca metades como vendidas, e `quantity` tem unidade |

## Riscos

- **[Alto] Implementar antes de a `LTM-05` existir.** AC1 a AC6 são todos de concorrência. "Ficou
  atômico" sem suíte é afirmação sem prova, no caminho do dinheiro.
- **[Alto] `quantity` reinterpretado em silêncio** cegaria o BI, o ETL e o CAPI de um jeito que só
  aparece na conferência de faturamento. AC7 existe só para isso.
- **[Médio] Arredondamento no rateio.** Prêmio ímpar em centavos dividido por dois não fecha
  sozinho. AC4 força o caso.
- **[Médio] A contenção dobra.** O cenário de carga do portão **G4** precisa ser refeito na forma
  divisível: 5 rodadas de 200 metades, não de 100 títulos.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Política de arredondamento escolhida para o AC4
_(registrar a decisão e quem decidiu)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder: 17 decisões, fronteira fechada. Forma dos dados em `ADR-0001`; vocabulário em `GLOSSARY.md`. | @aiox-master |
