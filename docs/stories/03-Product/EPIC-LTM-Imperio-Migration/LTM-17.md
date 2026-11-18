# LTM-17: O relógio da reserva passa a ser do operador

**Status:** Draft
> ❌ **`Ready` → `Draft` em 2026-11-18, 1ª validação do @po — NO-GO (6,5/10).** O `Ready` anterior foi
> posto pelo @aiox-master, que não tem essa autoridade (`.claude/rules/story-lifecycle.md`), e
> **revertê-lo era o certo mesmo com a autoridade correta**: o bloco `Files:` nomeia o arquivo errado
> para a única mudança que esta story faz, e omite o arquivo real — que pertence a outra story.
> Três das quatro correções são de redação. Ver a validação no fim do arquivo.
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

## Validação @po (2026-11-18) — **NO-GO, 6,5/10. `Ready` → `Draft`**

**Veredicto: NO-GO — 6,5/10.** Volta a `Draft`. **Não bloqueia nada**: ela depende da `LTM-03b`, que
ainda está em implementação, então o atraso é zero. As quatro correções são pequenas e três são de
redação pura.

### Primeiro, a autoridade

O `Ready` foi posto pelo @aiox-master. A transição `Draft → Ready` é minha
(`.claude/rules/story-lifecycle.md`, e o passo 12 do `validate-next-story.md` manda eu **parar** se o
status não for `Draft` ao chegar). Reverti — e registro que **eu teria revertido de todo modo**: a
story tem um defeito que a torna indespachável. A violação de processo e o defeito são
independentes; o segundo é o que importa.

### O defeito que decide o NO-GO

**O `Files:` nomeia o arquivo errado para a única mudança que esta story faz.**

O bloco diz:

```
apps/lotemania/src/lib/actions/reserve.ts    (o corpo da funcao)
```

**`reservationMinutesFor` não mora lá.** Mora em **`src/lib/validations/reserve.ts:149`** —
conferido, e com a razão inteira escrita no próprio arquivo (`:95-145`): `actions/reserve.ts` é
`"use server"` e exportar valor não-assíncrono de lá faz o módulo perder **todas** as exportações no
grafo do cliente e `pnpm build` morrer em `number-grid.tsx`. O @dev mediu isso contra `next build`
em 2026-11-18. Ou seja: **o lugar certo já está decidido e provado, e esta story aponta para o lugar
que foi descartado.**

E o arquivo real **não aparece em nenhuma linha do bloco**. Isso é subdeclaração — a direção
perigosa pela `.claude/rules/parallel-waves.md`, porque o conjunto declarado é o que decide se duas
tarefas podem rodar juntas. Pior: **`src/lib/validations/reserve.ts` é declarado pela `LTM-02`**
(`LTM-02.md:137`). O arquivo é disputado, e a disputa está invisível no bloco.

> **Este é exatamente o defeito pelo qual eu reprovei a `LTM-02` em 2026-11-17, com estes mesmos
> 6,5/10**: *"`Files:` sem `validations/reserve.ts`"*. Mesmo arquivo, mesmo epic, mesma omissão. Dar
> GO aqui tornaria aquele veredicto arbitrário.

E o efeito prático é o oposto do pretendido: a story declara ⛔ não poder compartilhar onda com
`LTM-03b`, `LTM-04` e `LTM-14` *"porque todas tocam `reserve.ts`"* — uma restrição em cima de um
arquivo que ela talvez não precise tocar — enquanto a colisão que **existe de verdade**, com a
`LTM-02` em `validations/reserve.ts`, não está declarada.

### O segundo defeito: a story descreve um código que já não existe

A seção *"O que já existe — e é quase tudo"* diz:

> *"`src/lib/actions/reserve.ts` usa `RESERVATION_MINUTES = 15` cravado, e a tela de pedido repete
> 'por 15 minutos' escrito à mão (`pedido/[orderId]/page.tsx:63`)."*

**As duas metades já são falsas**, e foi a `LTM-03b` em curso que as desfez:

| A story diz | O código (conferido 2026-11-18) |
|---|---|
| `actions/reserve.ts` tem `RESERVATION_MINUTES = 15` | ❌ `:375` chama `reservationMinutesFor(product)`. A constante sobrou só como comentário em `:25` — *"Era `const RESERVATION_MINUTES = 15` aqui"* |
| a tela repete "por 15 minutos" à mão, `page.tsx:63` | ❌ `page.tsx:98` renderiza `por {reservationMinutes} minutos`; o comentário em `:50` registra *"O texto dizia '15 minutos'"* |
| (não dito) `paysure-client.ts` | já chama `reservationMinutesFor(product) * 60` em `:54` |
| `reservedUntil` gravado em `reserve.ts:353` | ❌ é `:375` |

**A story contradiz a si mesma**: a seção *"O que já existe"* descreve o mundo **antes** da
`LTM-03b`, e a *Decisão de arquitetura §1* descreve o mundo **depois** dela — corretamente. Um @dev
que leia na ordem vai caçar uma constante que não está lá, e é a primeira coisa que ele lê.

A consequência boa dessa descoberta: **os três consumidores já consultam a função única.** O
trabalho que resta é **um corpo de função** mais testes. Três das cinco tarefas da checklist ("o
texto da tela deriva do mesmo valor", "a cobrança PIX passa a usar o valor do sorteio") já estão
feitas — elas passam a ser verdade **automaticamente** quando a função ler o sorteio. O `S` de
complexidade está certo; a superfície declarada é que está inflada, e foi ela que produziu o
`Files:` errado.

### O terceiro: o AC6 não fecha com a lista de tarefas que existe

**AC6:** *"busca por `15` como literal de minutos de reserva não encontra nenhuma declaração fora do
`.default(15)` do zod."*

Mas `validations/reserve.ts:113` declara `const RESERVATION_MINUTES_DEFAULT = 15;`. Quando a função
passar a ler o sorteio via `productAdvancedSettingsSchema.parse`, essa constante fica **morta** — o
`.default(15)` do zod assume o papel dela. Ela tem de ser **apagada**, e nenhuma tarefa diz isso, no
arquivo que o `Files:` não declara. **Como está, o AC6 é inexequível pela própria checklist.**

### A pergunta do escopo OUT: a resposta é que está certo

Me foi perguntado se *"não reduzir a lista de 5 valores a 15 e 30"* contraria o pedido do founder.
**Não contraria — é a leitura correta do pedido, e eu manteria essa linha.**

O founder pediu **a capacidade de escolher**, e citou os dois valores que tinha em mente. Ele não
pediu para **remover** 10, 60 e 120. São coisas diferentes: manter os cinco **satisfaz o pedido
estritamente** (15 e 30 estão na lista) e custa zero. Remover três opções que já estão no ar é
subtrair superfície do operador, e só quem sabe se algum sorteio vivo usa 10 ou 120 hoje pode
decidir isso — e não sou eu. Conferido, de resto, que os cinco valores existem mesmo
(`advanced-settings-tabs.tsx:423`, `[10, 15, 30, 60, 120]`) e que os cinco cabem na faixa da Paysure.
**A linha fica. É decisão do founder, registrada, não limpeza de escopo.**

### O que está certo e não se toca

- **As quatro citações de "o que já existe" estão exatas, linha por linha.** `product-settings.ts:24`
  é `reservationExpiryMinutes: z.coerce.number().int().positive().default(15)` na seção *Títulos*; o
  seletor *"Tempo para uma reserva pendente expirar"* está em `advanced-settings-tabs.tsx:413-430`
  com exatamente 10/15/30/60/120; `raffles.ts:82` é
  `advancedSettings: jsonb("advanced_settings").notNull().default({})`. **A descoberta central da
  story — o campo e a tela existem e ninguém lê o valor — é verdadeira e bem documentada.** É o
  melhor desta story.
- **§2 (ler pelo zod, nunca pelo jsonb cru) é a decisão certa, e o risco é real:** sorteio antigo tem
  `advanced_settings = {}`, acesso cru devolve `undefined`, e `undefined * 60` é `NaN`. Uma
  `reservedUntil` inválida **não falha alto**: ela grava, e o número fica preso ou livre na hora
  errada, no caminho mais quente do produto. **O AC2 é o AC mais importante da story** e está na
  forma certa.
- **§3 + AC4 (não recalcular reserva viva)** é a regressão certa contra um "conserto" que parece
  consistência e é mudar o relógio debaixo de quem está pagando.
- **AC3** compara os três relógios **entre si**, não contra um literal. É a forma certa de provar
  "são um só".
- **AC5** testa **sobre a lista do seletor**, não sobre valores escolhidos à mão — então uma opção
  nova fora da faixa derruba o teste. Essa escolha é melhor que o óbvio.
- **A tabela das três ocorrências do padrão** (`showQrCodeByDefault`, `paymentGatewayProvider`,
  `reservationExpiryMinutes`) e o diagnóstico de que é *"o custo de um painel reconstruído a partir
  da aparência da Sorteamos, tela antes de comportamento"*. **Aceito o item solto e ele é meu.**

### Pontuação

| Eixo | Nota |
|---|---|
| Título claro e objetivo | ✅ |
| Descrição completa | ⚠️ a descoberta central está certa e bem provada, mas *"O que o código faz hoje"* descreve um estado que já não existe, e contradiz a §1 da própria story |
| ACs testáveis | ⚠️ AC1-AC5 e AC7 bem formados (AC2 e AC3 são os melhores); **AC6 inexequível** pela checklist atual |
| Escopo IN/OUT | ✅ e o OUT de não reduzir os cinco valores está **certo** — é decisão do founder, não limpeza |
| Dependências mapeadas | ❌ `Files:` aponta `actions/reserve.ts` para o corpo da função, que mora em `validations/reserve.ts:149`; o arquivo real **não é declarado** e é da `LTM-02` |
| Complexidade | ✅ S, e correto — mas a checklist infla a superfície |
| Valor de negócio | ✅ pedido direto do founder, e hoje a tela **mente** para quem a usa |
| Riscos documentados | ✅ o `NaN` é o risco real e está nomeado como tal |
| Critérios de Done | ✅ AC7 fecha a porta de verificação |
| Anti-alucinação / alinhamento | ❌ duas afirmações de código já falsas e duas citações de linha envelhecidas (`reserve.ts:353` → `:375`, `page.tsx:63` → `:98`) |

**6,5/10.** Confiança de implementação: **média** — alta no desenho, baixa no despacho.

### Correções exigidas antes de ir a `Ready`

1. **`Files:` nomeia `apps/lotemania/src/lib/validations/reserve.ts`** como o arquivo do corpo da
   função, e **registra que ele é declarado pela `LTM-02`** (`LTM-02.md:137`) — essa é a colisão
   real. Reavaliar na mesma passada se `actions/reserve.ts`, `page.tsx`, `paysure-client.ts` e
   `pix-charge.ts` precisam mesmo ser **editados** ou se só entram como **cobertos por teste**: hoje
   os quatro já consultam a função única. A lista ⛔ de ondas sai dessa reavaliação, não da anterior.
2. **Reescrever *"O que já existe"* contra o código de hoje.** A constante não está mais em
   `actions/reserve.ts` (só o comentário em `:25`), a tela já deriva o valor (`page.tsx:98`), e
   `paysure-client.ts:54` também. A seção precisa descrever o mundo pós-`LTM-03b`, que é o mundo em
   que esta story vai rodar — e assim ela deixa de contradizer a própria §1.
3. **Uma tarefa para apagar `RESERVATION_MINUTES_DEFAULT`** (`validations/reserve.ts:113`), sem a
   qual o **AC6 não fecha**. É a linha que o AC6 está mandando procurar.
4. **Corrigir as duas citações envelhecidas:** `reserve.ts:353` → **`:375`** e `page.tsx:63` →
   **`:98`**.

As quatro são pequenas. A 1 e a 3 mudam o que o @dev faz; a 2 e a 4 mudam o que ele lê antes de
fazer — e nesta base já perdi conferências o bastante com número de linha envelhecido para tratar as
duas com o mesmo peso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | **Validada (1ª) — NO-GO (6,5/10). `Ready` → `Draft`.** O `Ready` havia sido posto pelo @aiox-master, que não tem essa autoridade — e a reversão se sustenta pelo mérito: o `Files:` aponta `actions/reserve.ts` para o corpo de `reservationMinutesFor`, que mora em `validations/reserve.ts:149` (o @dev provou que `"use server"` impede o contrário), e **não declara** o arquivo real, que é da `LTM-02`. É o mesmo defeito, no mesmo arquivo, pelo qual a `LTM-02` levou 6,5 em 17-11. Também: *"O que já existe"* descreve um código que a `LTM-03b` já mudou (a constante saiu, a tela já deriva o valor, `paysure-client.ts:54` também), o que faz a story contradizer a própria §1; o **AC6 é inexequível** porque `RESERVATION_MINUTES_DEFAULT` (`validations/reserve.ts:113`) teria de ser apagado e nenhuma tarefa diz isso; e duas citações envelheceram (`reserve.ts:353` → `:375`, `page.tsx:63` → `:98`). **Confirmado como certo:** o OUT de não reduzir os cinco valores a 15 e 30 — o founder pediu a capacidade de escolher, não a remoção de três opções no ar, e manter os cinco satisfaz o pedido. As quatro citações de "o que já existe" estão exatas, e AC2/AC3 são os ACs mais bem formados da story. | @po (Pax) |
| 2026-11-18 | 1.0 | Nasce do pedido do founder de deixar o relógio configurável na aba de edição do sorteio. Ao conferir, **o campo, a tela e os cinco valores já existiam** — `reservationExpiryMinutes` (`product-settings.ts:24`) e o seletor "Tempo para uma reserva pendente expirar" (`advanced-settings-tabs.tsx:414`) — e **nada lê o valor**. A story deixa de ser "construir a flag" e passa a ser "ligar a flag que já está no ar", que é a terceira ocorrência deste padrão na base. | @aiox-master |
