# LTM-17: O relógio da reserva passa a ser do operador

**Status:** Ready
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o relógio que a `LTM-03b` amarrou
**Prioridade:** **P1** — pedido direto do founder, e é o que faz a divergência de 15 contra 30 minutos deixar de ser decisão de engenharia
**Complexidade:** **S** — a tela existe, o campo existe, o esquema existe. **Falta a leitura.**
**Criada por:** @aiox-master · 2026-11-18, a pedido do founder

## Story

**Como** operador do Império montando um sorteio
**Eu quero** escolher, na aba de edição daquele sorteio, quanto tempo uma reserva pendente dura
**Para que** uma rapidinha que esgota em uma hora e um sorteio de uma semana não sejam obrigados a usar o mesmo relógio.

## O que já existe — e é quase tudo

Conferido no código em 2026-11-18. **Isto não é uma story de construir; é uma story de ligar.**

| Peça | Onde | Estado |
|---|---|---|
| O campo no esquema | `src/lib/validations/product-settings.ts:24` — `reservationExpiryMinutes`, seção *Títulos*, `.default(15)` | ✅ existe |
| O controle na tela | `src/app/dashboard/products/[id]/advanced-settings-tabs.tsx:414-430` — seletor **"Tempo para uma reserva pendente expirar"** | ✅ existe |
| Os valores oferecidos | **10, 15, 30, 60, 120** minutos | ✅ existe — e são cinco, não os dois do pedido |
| Onde o valor é guardado | `products.advancedSettings` (jsonb, `src/db/schema/raffles.ts:82`) | ✅ existe |
| **Quem lê o valor** | — | ❌ **ninguém** |

O que o código faz hoje: `src/lib/actions/reserve.ts` usa `RESERVATION_MINUTES = 15` cravado, e a
tela de pedido repete *"por 15 minutos"* escrito à mão (`pedido/[orderId]/page.tsx:63`).

**Ou seja: o operador já pode escolher 30 minutos, a escolha é salva no banco, e o sistema continua
reservando por 15.** A tela mente para quem a usa.

> ### A terceira vez que este padrão aparece nesta base
>
> | Campo | Tela | Lido pelo código? |
> |---|---|---|
> | `showQrCodeByDefault` | ✅ configurações | ❌ (achado da `LTM-14`) |
> | `paymentGatewayProvider` | ✅ edição do sorteio | ❌ (achado da `LTM-03b`) |
> | `reservationExpiryMinutes` | ✅ edição do sorteio | ❌ **esta story** |
>
> Três campos configuráveis que não governam nada. Não é coincidência: é o custo de um painel
> reconstruído a partir da aparência da Sorteamos, tela antes de comportamento. Vale registrar o
> padrão para que a **quarta** ocorrência seja procurada de propósito, e não descoberta por acaso.
> **Fica como item solto para o @po:** uma varredura de "campo de configuração sem leitor".

## Decisão de arquitetura

### 1. Um leitor, e ele recebe o sorteio

A `LTM-03b` já troca a constante exportada por `reservationMinutesFor(product)` em
`src/lib/actions/reserve.ts`, que hoje devolve o `15` ignorando o argumento. **Esta story é o corpo
dessa função**: ela passa a devolver `reservationExpiryMinutes` do sorteio.

Isso mantém os três relógios — a reserva, o texto da tela e o `expiration_seconds` da cobrança PIX —
amarrados a **um** lugar, que foi a conquista da `LTM-03b`. A diferença é que esse lugar deixa de
ser um número e passa a ser uma consulta.

### 2. A leitura passa pelo zod, nunca pelo jsonb cru

`advanced_settings` é `jsonb` com default `{}`, e **sorteio criado antes de o campo existir tem o
objeto vazio**. Ler `product.advancedSettings.reservationExpiryMinutes` direto devolve `undefined`,
e `undefined * 60` é `NaN` — que viraria uma `reservedUntil` inválida no caminho mais quente do
produto.

A leitura é `productAdvancedSettingsSchema.parse(product.advancedSettings)`, que aplica o
`.default(15)` já declarado. **O default já está escrito; o que falta é passar por ele.**

### 3. Mudar a configuração não mexe em reserva já feita

`reservedUntil` é gravado **no momento da reserva** (`reserve.ts:353`). Uma reserva feita com 15
minutos continua expirando em 15 minutos, mesmo que o operador troque para 30 um segundo depois.

Isto não é limitação — é o comportamento correto, e é o único que não quebra a promessa já feita ao
comprador que está com a tela aberta. **Mas tem de estar escrito**, senão alguém "conserta"
recalculando `reservedUntil` das reservas vivas e muda o relógio debaixo de quem está pagando.

### 4. A faixa da Paysure cabe, e isso foi conferido

`expiration_seconds` da Paysure aceita **60 a 86 400** (`docs/research/2026-11-16-paysure-contrato.md`
§4.1). Os cinco valores do seletor dão 600, 900, 1 800, 3 600 e 7 200 segundos. **Nenhum estoura**,
nos dois extremos. O seletor é fechado, então a faixa não precisa de guarda — mas o teste que prova
isso é barato e impede que alguém acrescente "1 minuto" ao seletor e descubra o 422 em produção.

## Tarefas (Checklist)

- [ ] `reservationMinutesFor(product)` passa a ler `reservationExpiryMinutes` via
      `productAdvancedSettingsSchema.parse`.
- [ ] O texto da tela de pedido deriva do mesmo valor, para aquele sorteio.
- [ ] A criação da cobrança PIX (`LTM-03b`) passa a usar o valor do sorteio do pedido.
- [ ] Teste de que trocar a configuração **não** altera reserva já feita.
- [ ] Teste dos cinco valores do seletor contra a faixa da Paysure.

## Critérios de Aceite

- [ ] **AC1 (a escolha do operador governa a reserva):** sorteio com 30 minutos configurados produz
      `reservedUntil` de ~30 minutos; sorteio com 10, de ~10. Dois sorteios, dois valores, no mesmo
      teste — é o que prova que o valor vem do sorteio e não de um módulo.
- [ ] **AC2 (sorteio sem a configuração não quebra):** sorteio com `advanced_settings = {}` reserva
      por **15** minutos, o default declarado. **Nunca** `NaN`, nunca `Invalid Date`, nunca
      reserva que expira no passado. É o caso de todo sorteio que já existe hoje.
- [ ] **AC3 (os três relógios continuam sendo um):** para o mesmo sorteio, o `reservedUntil`
      gravado, o tempo que a tela de pedido anuncia e o `expiration_seconds` enviado à Paysure
      derivam do **mesmo** valor. Teste que lê os três e compara entre si — não com um literal.
- [ ] **AC4 (trocar a configuração não mexe no passado):** reserva feita com 15 minutos continua
      expirando em 15 depois de o operador trocar para 30. O `reservedUntil` da reserva viva **não
      muda**. Regressão contra o "conserto" de recalcular reserva aberta.
- [ ] **AC5 (os cinco valores cabem na Paysure):** 10, 15, 30, 60 e 120 minutos produzem
      `expiration_seconds` dentro de 60–86 400. Teste sobre a lista do seletor, não sobre valores
      escolhidos à mão — se alguém acrescentar uma opção fora da faixa, o teste cai.
- [ ] **AC6 (o número escrito à mão desaparece):** busca por `15` como literal de minutos de
      reserva não encontra nenhuma declaração fora do `.default(15)` do zod. É o AC14 da `LTM-03b`
      levado até o fim.
- [ ] **AC7 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Escopo

**IN:** a leitura do campo existente; a derivação dos três relógios a partir dele; os testes acima.

**OUT:**

- **Mudar a tela ou o esquema.** Os dois já existem e já oferecem cinco valores — mais do que os
  dois pedidos. **Não reduzir a lista a 15 e 30**: tirar opção que já está no ar é decisão do
  founder, não limpeza de escopo.
- **Configuração por tenant** (um padrão da casa para sorteios novos). É outra camada, e o pedido
  foi por sorteio.
- **Recalcular reserva aberta** quando a configuração muda — ver AC4: é explicitamente o que **não**
  se faz.
- **A varredura de "campo de configuração sem leitor"**. Registrada como item solto para o @po; é um
  trabalho de auditoria com valor próprio e tamanho desconhecido.

## Dependências

- **Depende da `LTM-03b` (bloqueante).** É ela que cria `reservationMinutesFor(product)` e amarra os
  três relógios a uma fonte. Sem ela, esta story teria de mexer em três lugares desalinhados — que é
  exatamente o estado que a `LTM-03b` removeu.
- **Depende da `LTM-02`** por transitividade (dona de `reserve.ts`).

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/reserve.ts                                    (o corpo da funcao)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx (o texto derivado)
  apps/lotemania/src/lib/payments/paysure-client.ts                            (expiration_seconds do sorteio)
  apps/lotemania/src/lib/actions/pix-charge.ts                                  (passa o sorteio adiante)
  apps/lotemania/tests/reserva/janela/**                                        (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — o campo ja existe no jsonb; nenhuma coluna nova
  relogio do teste  — AC1, AC2 e AC4 medem janela de tempo. Tempo FALSO, isolado por arquivo.

Depends-on: LTM-03b (total), LTM-02 (transitiva)
```

- ⛔ **Não pode compartilhar onda com a `LTM-03b`, a `LTM-04` nem a `LTM-14`.** Com as duas
  primeiras porque todas tocam `reserve.ts`; com a `LTM-14` porque as duas tocam
  `pedido/[orderId]/page.tsx`. Esta story vem **depois** das três.
- ✅ **É a candidata natural à onda seguinte à da `LTM-03b`**, e é pequena: o conjunto são quatro
  arquivos, e em três deles a mudança é trocar a origem de um número.

## Riscos

- **[Médio] `NaN` no caminho mais quente do produto.** Sorteio antigo tem `advanced_settings = {}`,
  e acesso cru ao jsonb devolve `undefined`. Uma `reservedUntil` inválida não falha alto: ela grava,
  e o número fica preso ou livre na hora errada. AC2 existe só por isso, e é o risco real desta
  story.
- **[Médio] Alguém "consertar" recalculando reserva aberta.** Parece correção de consistência e é
  mudar o relógio debaixo de quem está pagando. AC4 é a regressão.
- **[Baixo] Opção fora da faixa da Paysure** ser acrescentada ao seletor depois. AC5 cobre pela
  lista, não por valor escolhido.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.0 | Nasce do pedido do founder de deixar o relógio configurável na aba de edição do sorteio. Ao conferir, **o campo, a tela e os cinco valores já existiam** — `reservationExpiryMinutes` (`product-settings.ts:24`) e o seletor "Tempo para uma reserva pendente expirar" (`advanced-settings-tabs.tsx:414`) — e **nada lê o valor**. A story deixa de ser "construir a flag" e passa a ser "ligar a flag que já está no ar", que é a terceira ocorrência deste padrão na base. | @aiox-master |
