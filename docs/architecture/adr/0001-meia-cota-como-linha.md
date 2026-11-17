# ADR-0001 — A meia cota é uma linha, não uma coluna

**Status:** Aceito
**Data:** 2026-11-17
**Decisores:** founder (decisão) · @aiox-master (condução do grilling)
**Contexto da decisão:** sessão de `/grill-with-docs` sobre a meia cota do lotemania, 17 decisões
**Afeta:** `LTM-01`, `LTM-02`, `LTM-03a`, `LTM-05` e a Frente C do `EPIC-LTM-Imperio-Migration`

---

## Contexto

O Império pediu **meia cota**: cada título de um sorteio pode ser comprado inteiro por uma pessoa
ou em duas metades por duas pessoas, que dividem o prêmio. A razão de negócio é baixar a barreira
de entrada para viabilizar prêmios de 100 mil e 200 mil sobre os mesmos 100 títulos.

O modelo atual tem uma propriedade que não é acidental e que sustenta a correção do sistema
inteiro:

```sql
UPDATE product_numbers
   SET status = 'reserved', order_id = $1, reserved_until = $2
 WHERE product_id = $3 AND number = ANY($4) AND status = 'available'
RETURNING number;
```

Seguido de `if (reserved.length < pedidos.length) → desfaz tudo`.

Isso é atômico **porque cabe exatamente um dono por linha**. Não há travamento explícito, não há
transação (o driver `neon-http` nem suporta), não há leitura-antes-de-escrever. A condição
`status = 'available'` dentro do próprio `UPDATE` faz o banco resolver a disputa, e a conferência
de contagem detecta quem perdeu.

A meia cota ataca exatamente essa premissa. E ataca num momento ruim: o esgotamento medido no BI
do Império chega a **18 minutos para 100 títulos** (~5,5 por minuto), com **5 rodadas
simultâneas**. Dividir o título **dobra a contenção** no ponto mais quente.

## Decisão

**`product_numbers` passa a ter uma linha por unidade vendável, e num sorteio divisível a unidade
vendável é a metade.** Cem títulos divisíveis são 200 linhas, com unicidade em
`(product_id, number, half)`.

Comprar o título inteiro é reservar **as duas linhas daquele número na mesma instrução**. O
`UPDATE` condicional não muda de forma, e a conferência de contagem continua detectando perda de
disputa sem alteração nenhuma.

Num sorteio de cota inteira, a linha continua sendo uma por título — é o caso degenerado de uma
metade só, e os 177 sorteios/semana que já rodam não mudam de forma.

## Alternativa rejeitada: a metade como coluna

Dar à linha do título dois donos possíveis (`order_id_a` / `order_id_b`, ou um estado de ocupação
com três valores: vazio, meio, cheio).

**Por que não:**

1. **Destrói a atomicidade que existe.** "Disponível" deixa de ser um predicado sobre a linha e
   passa a ser uma pergunta sobre *qual* metade. O `UPDATE` condicional deixa de bastar, e o
   substituto é travamento explícito ou `SELECT ... FOR UPDATE` — exatamente o que o driver atual
   não oferece e o que a `LTM-02` está tentando resolver em separado.
2. **Troca uma propriedade simples por uma complicada no pior momento.** A contenção dobra com a
   feature; o mecanismo que resolve disputa não deveria dobrar de complexidade junto.
3. **Vaza para todo consumidor.** Toda consulta de disponibilidade, todo relatório e o ETL
   passariam a ter de interpretar um estado de ocupação em vez de contar linhas.

A forma em coluna é mais "econômica" em linhas — 100 contra 200 — e esse é o único argumento a
favor dela. Com ~900 mil linhas/ano projetadas em `product_numbers`, dobrar para 1,8 milhão é
irrelevante para Postgres **com índice**, e o índice é escopo da `LTM-01` de qualquer forma.

## Consequências

### Boas

- A reserva permanece correta pelo mesmo motivo de hoje, sob o dobro da contenção.
- Carrinho misturado ("o 42 inteiro e metade do 43") sai de graça: o pedido é uma lista de
  metades, e o título inteiro são duas delas.
- Expiração por metade, com relógio próprio, é consequência natural de a metade ser a linha.
- Sorteio de cota inteira não muda de forma nenhuma.

### Custos aceitos

- **`product_numbers` dobra de tamanho em sorteio divisível.** Aceito: é trivial para Postgres com
  índice, e o índice é pré-requisito independente.
- **`quantity` do pedido passa a contar metades em sorteio divisível.** Isso muda o significado de
  um campo que o BI, o ETL e o CAPI já consomem. **Mitigação obrigatória:** campo novo e explícito
  no pedido, nunca reinterpretação silenciosa de `quantity` — mudança muda de significado em campo
  que alimenta BI é erro que custa uma semana para descobrir.
- **Toda configuração de contagem fica ambígua** (`minPerReservation`, `maxPerReservation`,
  `maxPerBuyer`, `maxQuantityPerBuyer`, `initialPerReservation`, `quickBuyCards`). **Mitigação:**
  uma unidade por sorteio, sempre nomeada na interface — título em sorteio de cota inteira, metade
  em sorteio divisível.

### Invariantes que passam a precisar de prova (escopo `LTM-05`)

1. Nenhuma metade tem dois donos.
2. Reservar título inteiro reserva **as duas** metades ou **nenhuma** — nunca uma.
3. Expirar uma metade não toca na outra.
4. O rateio de um título sorteado soma **exatamente** o prêmio do título — nem centavo a mais, nem
   a menos.
5. Metade órfã em título sorteado paga o prêmio **inteiro** a quem tem a metade vendida.

## Decisões de domínio que acompanham esta

Fechadas na mesma sessão e registradas no `GLOSSARY.md`:

| | |
|---|---|
| Prêmio | meia cota só em sorteio de **prêmio em dinheiro**; o sistema recusa habilitar em outros |
| Preço | metade custa **exatamente metade**, sem ágio |
| Escopo | divisibilidade é **por sorteio**, nunca por título |
| Fusão | duas metades do mesmo dono **continuam duas metades** — não se fundem |
| Metade órfã | quem tem a metade vendida leva o **prêmio inteiro** |
| Congelamento | divisibilidade vira somente-leitura **na primeira venda** |
| Ganhador | **uma linha de `winners` por ganhador**, com o valor já rateado |
| Grade | **célula partida** — um botão por título, dividido ao meio |
| Relatório | a metade aparece **sempre marcada**, nunca como número nu |
| Anúncio | os **dois** valores lado a lado; nunca o número grande sozinho numa tela de metade |

## Notas

O sorteio em si **acontece fora deste sistema** — nada no código escreve em `winners`. O rateio é
registro do resultado, não cálculo de um sorteio automatizado.

Jogos bônus (roleta, caixas, raspadinha) são comprados à parte, com combos de preço e quantidade
próprios. **Não são tocados por esta decisão.**
