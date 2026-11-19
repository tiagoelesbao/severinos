# LTM-20: O número reservado e abandonado nunca volta ao estoque

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P0 — defeito de correção no caminho do dinheiro.** Com ele, um sorteio **não consegue esgotar**
**Complexidade:** M — o conserto é pequeno; decidir **onde** ele roda é a parte difícil
**Criada por:** @aiox-master · 2026-11-19, a partir de relato do founder usando o produto
**Diagnóstico:** confirmado no código na mesma data

## O relato

> *"reservas expiradas não saem da reserva disponibilizando o número novamente após tempo
> determinado"* — founder, 2026-11-19

## O diagnóstico — confirmado, não suposto

A varredura que libera reserva vencida é
`expireStaleReservationsAndCheckSpam` (`src/lib/actions/reserve.ts:129`).

**Duas propriedades dela, lidas no código, explicam o relato inteiro:**

### 1. É chamada em **um** lugar só

```
src/lib/actions/reserve.ts:306
  const spamCheck = await expireStaleReservationsAndCheckSpam(tenant.id, userId);
```

Dentro de `reserveSelectedNumbers`. **Não há job, não há cron, não há rota agendada.** Busca por
`reservedUntil` em `src/` devolve três arquivos: o schema, este arquivo e as validações. Nada mais
no sistema olha para o prazo.

> **Consequência:** se ninguém tentar reservar, **nada expira**. O relógio corre, o prazo vence, e o
> número continua amarelo na grade.

### 2. Filtra por **um** comprador

```sql
eq(orders.tenantId, tenantId),
eq(orders.userId, userId),      -- ← aqui
eq(orders.status, "pending"),
eq(productNumbers.status, "reserved"),
sql`reserved_until < now()`
```

A varredura só libera as reservas **de quem está reservando agora**.

### O caminho que trava o número para sempre

1. **Ana** reserva o número 42. `reservedUntil` = agora + 15 min.
2. Ana some. O prazo vence.
3. **Bruno** abre a loja. O 42 está **amarelo** — reservado.
4. Bruno tenta reservar o 42. A varredura roda **para o Bruno**, não para a Ana. A reserva vencida
   da Ana **não é tocada**. O `UPDATE ... WHERE status = 'available'` não acha o 42.
5. Bruno recebe *"Algum dos números escolhidos acabou de ser reservado por outra pessoa"* e desiste.
6. **O 42 fica travado até a Ana voltar e tentar reservar outra coisa.** Se ela nunca voltar, nunca.

**Um sorteio em que isso acontece não esgota.** As 5 rodadas diárias do Império esgotam em ~18
minutos; qualquer reserva abandonada vira um buraco permanente no estoque.

### Por que o teste não pegou

A suíte da `LTM-05` tem teste de expiração, e ele **passa** — porque exercita a expiração
**do próprio usuário**, que é o caminho que funciona. O defeito mora no caminho **entre dois
compradores diferentes**, e esse caso não existe na suíte.

> **É o tipo de buraco que só aparece com duas pessoas.** Não é falta de teste por descuido: é um
> caso que não ocorre a quem escreve teste pensando num ator só.

## Story

**Como** comprador querendo o número que está livre há meia hora
**Eu quero** que ele esteja disponível quando o prazo de outro venceu
**Para que** o sorteio consiga esgotar, e eu não leve "reservado por outra pessoa" sobre uma reserva
que já morreu.

## Decisão de arquitetura — a parte difícil

Liberar reserva vencida **de qualquer um** é uma linha. **Onde isso roda** é a decisão.

| Caminho | Como funciona | Custo | Risco |
|---|---|---|---|
| **A. Varredura global na reserva** | tirar o `eq(orders.userId, userId)` do filtro de liberação | uma linha | a varredura passa a escrever linhas de outros compradores **dentro da transação de quem reserva** — e o contador anti-spam precisa continuar sendo só do usuário |
| **B. Varredura na leitura da grade** | a página do sorteio libera vencidos antes de pintar | sorteio parado nunca conserta sozinho, mas **ninguém vê número travado** | escrita no caminho de leitura, que é o mais quente |
| **C. Tarefa agendada** | um job periódico varre tudo | o jeito certo em regime | o lotemania **não tem** agendador; e a `OPS-01` registra o que acontece com tarefa agendada que falha calada |
| **D. A e B juntos** | varredura global nos dois pontos | cobre leitura e escrita | duas escritas a mais |

**Recomendação: A + B.** O caminho A conserta a disputa real (dois compradores pelo mesmo número); o
B conserta o que o comprador **vê**, que é o que gera a reclamação. Nenhum dos dois depende de
infraestrutura que não existe. O C fica para quando houver agendador, e aí substitui o B.

> ⚠️ **O anti-spam não pode viajar junto.** A função hoje faz **duas** coisas: libera unidades
> vencidas **e** conta reservas abandonadas do comprador para bloqueá-lo. **A liberação tem de virar
> global; a contagem tem de continuar sendo do usuário.** Fundir os dois escopos faria o comprador
> ser bloqueado pelo abandono de estranhos — defeito pior que o original.

## Tarefas (Checklist)

- [ ] Separar a função em duas: **liberar vencidos** (global, por sorteio) e **contar abandono**
      (por comprador). Hoje são uma só.
- [ ] A liberação global roda na reserva (caminho A).
- [ ] A liberação global roda ao montar a grade do sorteio (caminho B).
- [ ] Teste do caminho entre **dois compradores diferentes** — o caso que a suíte não tem.
- [ ] `[CONFIRMAR]` com o founder: a `LTM-17` vai tornar a janela configurável por sorteio. A
      varredura global precisa respeitar a janela **de cada sorteio**, não uma só.

## Critérios de Aceite

- [ ] **AC1 (o caso de dois compradores):** Ana reserva o 42 e some; o prazo vence; **Bruno
      consegue reservar o 42**. Teste com dois usuários distintos — é o defeito, e nenhum teste
      atual o cobre.
- [ ] **AC2 (a grade não mente):** depois do prazo vencido, a página do sorteio mostra o 42 como
      **livre**, sem que ninguém tenha tentado reservar nada. É o que o comprador vê.
- [ ] **AC3 (o anti-spam continua sendo do comprador):** reservas abandonadas **de outros** não
      aumentam o contador de bloqueio de quem está reservando. Teste: Ana abandona 3 reservas,
      Bruno reserva normalmente e **não** é bloqueado. É a regressão que impede o conserto de criar
      um defeito pior.
- [ ] **AC4 (pedido pago nunca é tocado):** unidade de pedido `paid` não é liberada em nenhum dos
      dois caminhos, mesmo com `reserved_until` no passado. Hoje o filtro `orders.status =
      'pending'` protege; o teste prova que continua protegendo depois da mudança.
- [ ] **AC5 (sob concorrência não libera duas vezes):** duas liberações simultâneas do mesmo pedido
      vencido não produzem estado inconsistente nem erro. A `LTM-05` tem o ferramental.
- [ ] **AC6 (a janela é a do sorteio):** com sorteios de janelas diferentes, cada um expira pela
      sua. Depende da `LTM-17`; enquanto ela não existir, o AC vale com a janela única.
- [ ] **AC7 (regressão da `LTM-02`):** todos os testes de reserva existentes continuam passando.
- [ ] **AC8 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

## Escopo

**IN:** a separação das duas responsabilidades; a liberação global nos dois pontos; os testes.

**OUT:**

- **Agendador / cron** (caminho C). É o jeito certo em regime e **o lotemania não tem**. Quando
  tiver, substitui o caminho B. Fica registrado, não construído.
- **Mudar a janela de reserva** — é a `LTM-17`.
- **Avisar o comprador que a reserva dele venceu** (e-mail, push). Outra story.

## Dependências

- **Depende da `LTM-02`** (entregue) — é o código que esta story corrige.
- **Conversa com a `LTM-17`** — quando a janela virar configuração por sorteio, a varredura global
  precisa ler a janela de cada um. Ordem recomendada: esta primeiro, porque é defeito; a `LTM-17`
  ajusta depois.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/reserve.ts                      (separar as duas funcoes)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx    (liberacao ao montar a grade)
  apps/lotemania/tests/reserva/expiracao-entre-compradores/**    (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — nenhuma coluna nova
  relogio do teste  — AC1/AC2 medem prazo vencido. Semear reserved_until no passado
                      e preferir isso a relogio falso: o predicado e SQL (now()), e
                      relogio falso de JS nao move o now() do Postgres.

Depends-on: LTM-02 (entregue)
```

- ⛔ **Não pode compartilhar onda com `LTM-07`, `LTM-04` nem `LTM-17`** — todas tocam `reserve.ts`.
- ⚠️ **Nota sobre o relógio no teste:** o filtro é `reserved_until < now()` **em SQL**. Adiantar o
  relógio do JS não adianta o do Postgres. Os testes têm de **semear** `reserved_until` no passado.

## Riscos

- **[Alto] Fundir os dois escopos e bloquear comprador pelo abandono alheio.** É o defeito pior que
  o original, e está a uma linha de distância. AC3 existe só por isso.
- **[Médio] Escrita no caminho de leitura** (caminho B). A página do sorteio é a mais acessada; uma
  escrita ali em toda visita tem custo. Mitigação: só escreve quando há o que liberar — o `UPDATE`
  com predicado não encontra linha e não escreve nada no caso comum.
- **[Médio] Liberar unidade de pedido que acabou de ser pago**, numa corrida entre o aviso do
  gateway e a varredura. AC4 e AC5 cobrem; o filtro `orders.status = 'pending'` é a defesa.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce de relato do founder usando o produto, e o diagnóstico foi confirmado no código na mesma data: a varredura é chamada **em um lugar** (`reserve.ts:306`) e filtra **por um comprador** (`eq(orders.userId, userId)`). Logo, reserva abandonada só é liberada se **quem a fez** voltar e tentar reservar de novo — e enquanto isso o número fica travado para todo mundo. Um sorteio com isso **não esgota**. A suíte não pegou porque o teste de expiração exercita o caminho de um ator só. | @aiox-master |
