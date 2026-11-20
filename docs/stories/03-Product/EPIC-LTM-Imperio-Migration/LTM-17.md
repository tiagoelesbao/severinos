# LTM-17: O relógio da reserva passa a ser do operador

**Status:** Ready
> ✅ **Revalidada pelo @po em 2026-11-20 — GO (8,5/10). `Draft` → `Ready`.** As **quatro** correções
> do NO-GO de 11-18 estão aplicadas, e a nº 1 — a que decidiu aquele NO-GO — está aplicada **no
> lugar certo**: o bloco `Files:` declara `src/lib/validations/reserve.ts` **com a linha do corpo
> (`:149`)** e **não** aponta mais `actions/reserve.ts` para a mudança. Conferido no código hoje:
> `reservationMinutesFor` está em `validations/reserve.ts:149-157` e faz literalmente
> `void product; return RESERVATION_MINUTES_DEFAULT` — **o relógio recebe o sorteio e o descarta.**
> A decisão **D2** do @pm está bem aplicada e o default 30 está **medido**, não escolhido.
> **Corrigi quatro citações de linha que envelheceram de novo** (incluindo duas que a validação
> anterior já havia corrigido uma vez). Ver *Revalidação @po (2026-11-20)*.
>
> ⚠️ **Histórico:** o `Ready` de 11-18 havia sido posto pelo @aiox-master, que não tem essa
> autoridade (`.claude/rules/story-lifecycle.md`). O `Ready` de hoje é meu, e vem com o bloco
> `Files:` conferido arquivo por arquivo.
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o relógio que a `LTM-03b` amarrou
**Prioridade:** **P1** — pedido direto do founder, e é o que faz a divergência de 15 contra 30 minutos deixar de ser decisão de engenharia
**Complexidade:** **S → M** — a tela existe, o campo existe, o esquema existe. Faltava a leitura; a decisão **D2** de 11-19 acrescenta **trocar a lista de valores**
**Criada por:** @aiox-master · 2026-11-18, a pedido do founder
**Atualizada:** @pm (Morgan) · 2026-11-19, aplicando a decisão **D2** do founder

## Story

**Como** operador do Império montando um sorteio
**Eu quero** escolher, na aba de edição daquele sorteio, quanto tempo uma reserva pendente dura
**Para que** uma rapidinha que esgota em uma hora e um sorteio de uma semana não sejam obrigados a usar o mesmo relógio.

## O que já existe — e é quase tudo

Conferido no código em 2026-11-18. **Isto não é uma story de construir; é uma story de ligar.**

| Peça | Onde | Estado |
|---|---|---|
| O campo no esquema | `src/lib/validations/product-settings.ts:24` — `reservationExpiryMinutes`, seção *Títulos*, `.default(15)` | ✅ existe — ⚠️ **o default muda pela D2** |
| O controle na tela | `src/app/dashboard/products/[id]/advanced-settings-tabs.tsx:414-430` — seletor **"Tempo para uma reserva pendente expirar"** | ✅ existe — ⚠️ **a lista muda pela D2** |
| Os valores oferecidos | **10, 15, 30, 60, 120** minutos | ✅ existe — ⚠️ **substituídos pelos 8 da Sorteamos (D2)** |
| Onde o valor é guardado | `products.advancedSettings` (jsonb, `src/db/schema/raffles.ts:82`) | ✅ existe |
| **Quem lê o valor** | — | ❌ **ninguém** |

O que o código faz hoje — ⚠️ **corrigido pelo @po em 2026-11-20; a redação original descrevia o
código de antes da `LTM-03b` e já havia sido apontada como falsa em 11-18:**

```ts
// src/lib/validations/reserve.ts:149-157
export function reservationMinutesFor(
  product?: ReservationWindowProduct | null,
): number {
  void product;                        // <- recebe o sorteio
  return RESERVATION_MINUTES_DEFAULT;  // <- e devolve 15 de qualquer forma
}
```

**A `LTM-03b` já fez a parte difícil:** não há mais constante espalhada nem texto escrito à mão. Os
**três** relógios (a reserva, o texto da tela e o `expiration_seconds` da Paysure) já consultam
**esta** função. O que falta é o corpo dela ler o sorteio que ela já recebe.

**Ou seja: o operador já pode escolher 30 minutos, a escolha é salva no banco, e o sistema continua
reservando por 15.** A tela mente para quem a usa — e o `void product` é essa mentira em uma linha.

> 💡 **O @qa chegou no mesmo lugar pelo outro lado.** O portão da `LTM-03b` saiu **`CONCERNS`**
> porque o `AC14` dela afirma **uma** declaração do número de minutos e existem **duas** — e a
> segunda é justamente o campo que o operador vê e que nada lê. **Esta story é o fecho daquele
> `CONCERNS`**, e é a melhor confirmação de que o recorte entre as duas está no lugar certo.

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

## Decisão do founder — 2026-11-19: **as oito da Sorteamos, e o 15 sai**

A decisão **D2** (epic §4) substituiu **a lista inteira**, não reduziu nem ampliou a que havia:

| | Opções |
|---|---|
| **Sorteamos** (medido, `README.md` §Aba Títulos do inventário) | **3 · 4 · 5 · 10 · 30 Minutos · 1 Hora · 3 Horas · 1 Dia** — oito |
| lotemania (hoje, `advanced-settings-tabs.tsx:423`) | 10, **15**, 30, 60, 120 — cinco |
| **lotemania depois desta story** | **os oito da Sorteamos** |

**O 15 é invenção nossa** e sai. O founder havia pedido *"15 ou 30"* em 11-18; conferido, **30 existe nas duas listas e 15 em nenhuma das duas** — então adotar as oito **satisfaz o pedido dele** e remove o valor que não tinha origem.

Os rótulos são os da Sorteamos, transcritos: `3 Minutos`, `4 Minutos`, `5 Minutos`, `10 Minutos`, `30 Minutos`, `1 Hora`, `3 Horas`, `1 Dia`. **Não "60 Minutos", "180 Minutos" e "1440 Minutos"** — o valor persistido continua em minutos, o rótulo é o da origem.

### O default: **30**, e a razão está medida

`product-settings.ts:24` é `.default(15)` — e 15 **deixa de existir na lista**. Um default fora da lista é um sorteio que abre o editor mostrando uma opção que o seletor não tem.

**Decido 30**, e isto **não** é `[CONFIRMAR]`:

1. é o único valor presente nas **duas** listas;
2. é o valor que **o founder nomeou** (*"15 ou 30"*), e o único dos dois que sobrevive à D2;
3. é o valor **medido em produção**: a campanha `46º RAPIDINHA` observada ao vivo em 11-19 abriu a contagem em `29:17` e expirou `08:33:19 → 09:02:49` (`fluxo-de-compra.md`). **30 é o que o Império usa de fato.**

> ⚠️ **O efeito colateral, e ele tem prazo.** Sorteio que já exista com `reservationExpiryMinutes = 15` gravado fica com **um valor fora da lista**: o seletor não tem onde se posicionar, e o `z.coerce.number().int().positive()` **aceita o 15 sem reclamar**, porque é um inteiro positivo qualquer.
>
> **Hoje isso é barato** — o founder declarou em 11-18 que os sorteios no lotemania são todos descartáveis (epic §5), então não há valor herdado para honrar. **Depois não seria**, e aí a migração do 15 para o 30 teria de ser escrita e executada. É a mesma janela de liberdade que o `ADR-0001` usou, e ela fecha no dia em que existir o primeiro sorteio real.

### E o esquema tem de deixar de aceitar qualquer inteiro

`reservationExpiryMinutes: z.coerce.number().int().positive()` aceita **1**, **7**, **99999**. Isso torna o `AC5` (os valores cabem na faixa da Paysure) uma prova sobre a **tela**, não sobre o **dado** — e quem escreve no `advanced_settings` pela API ou por script não passa pela tela.

**A lista fechada tem de estar no zod**, não só no seletor. É o que faz a guarda da faixa da Paysure ser real em vez de decorativa.

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

`reservedUntil` é gravado **no momento da reserva** (`actions/reserve.ts:423-424`, conferido em
2026-11-20 — a citação `:353`, e depois `:375`, envelheceram as duas). Uma reserva feita com 15
minutos continua expirando em 15 minutos, mesmo que o operador troque para 30 um segundo depois.

Isto não é limitação — é o comportamento correto, e é o único que não quebra a promessa já feita ao
comprador que está com a tela aberta. **Mas tem de estar escrito**, senão alguém "conserta"
recalculando `reservedUntil` das reservas vivas e muda o relógio debaixo de quem está pagando.

### 4. A faixa da Paysure cabe — conferido contra os **oito** novos valores

`expiration_seconds` da Paysure aceita **60 a 86 400** (`docs/research/2026-11-16-paysure-contrato.md`
§4.1). Conferido valor por valor, com a lista nova:

| Opção | Minutos | `expiration_seconds` | Na faixa? |
|---|---|---|---|
| 3 Minutos | 3 | **180** | ✅ |
| 4 Minutos | 4 | 240 | ✅ |
| 5 Minutos | 5 | 300 | ✅ |
| 10 Minutos | 10 | 600 | ✅ |
| 30 Minutos | 30 | 1 800 | ✅ |
| 1 Hora | 60 | 3 600 | ✅ |
| 3 Horas | 180 | 10 800 | ✅ |
| **1 Dia** | 1 440 | **86 400** | ⚠️ **exatamente o teto** |

**Os oito cabem.** Mas dois detalhes mudam o AC5 de "barato" para **obrigatório**:

1. **`1 Dia` é o teto exato, não um valor com folga.** O limite é inclusivo (`60 a 86 400`), então 86 400 passa — e **qualquer** folga somada depois estoura. Um "mais 1 segundo de carência" no cálculo, um arredondamento para cima, um `+ 60` de margem: qualquer um deles manda `86 401` e devolve **422** no caminho do dinheiro. O teste tem de afirmar `<= 86 400`, nunca `< 86 400`.
2. **O extremo de baixo deixou de ter folga confortável.** O menor valor era 10 minutos (600 s, dez vezes o piso); agora é 3 minutos (**180 s, três vezes**). Continua dentro, mas a lista perdeu a margem que tornava o AC5 teórico.

O seletor é fechado **e o zod passa a ser** (ver a decisão acima) — então a faixa é garantida pela lista, e o AC5 prova que a lista é a certa.

## Tarefas (Checklist)

- [ ] `reservationMinutesFor(product)` passa a ler `reservationExpiryMinutes` via
      `productAdvancedSettingsSchema.parse`.
- [ ] **(D2)** O seletor de `advanced-settings-tabs.tsx:414-430` passa a oferecer **os oito valores
      da Sorteamos**, com os rótulos dela: `3 Minutos` · `4 Minutos` · `5 Minutos` · `10 Minutos` ·
      `30 Minutos` · `1 Hora` · `3 Horas` · `1 Dia` (valores 3, 4, 5, 10, 30, 60, 180, 1440).
      ⚠️ A lista está **escrita duas vezes no mesmo arquivo** — no `items={{…}}` do `Select` e no
      `.map()` do `SelectContent`. As duas têm de mudar, ou a tela fica incoerente consigo mesma.
- [ ] **(D2)** `product-settings.ts:24`: `.default(15)` → **`.default(30)`**, e o campo passa a ser
      **lista fechada** no zod (os oito valores), não `int().positive()` solto.
- [ ] **(D2)** Apagar `RESERVATION_MINUTES_DEFAULT = 15` (**`validations/reserve.ts:114`**) — é a linha
      que o **AC6** manda procurar, e sem esta tarefa o AC6 é inexequível (@po, 11-18).
- [ ] O texto da tela de pedido deriva do mesmo valor, para aquele sorteio.
- [ ] A criação da cobrança PIX (`LTM-03b`) passa a usar o valor do sorteio do pedido.
- [ ] Teste de que trocar a configuração **não** altera reserva já feita.
- [ ] Teste dos **oito** valores da lista nova contra a faixa da Paysure, com asserção **inclusiva**
      no teto (`<= 86 400`).

## Critérios de Aceite

- [ ] **AC1 (a escolha do operador governa a reserva):** sorteio com 30 minutos configurados produz
      `reservedUntil` de ~30 minutos; sorteio com 10, de ~10. Dois sorteios, dois valores, no mesmo
      teste — é o que prova que o valor vem do sorteio e não de um módulo.
- [ ] **AC2 (sorteio sem a configuração não quebra):** sorteio com `advanced_settings = {}` reserva
      por **30** minutos, o default declarado **depois da D2**. **Nunca** `NaN`, nunca
      `Invalid Date`, nunca reserva que expira no passado. É o caso de todo sorteio que já existe
      hoje.
  - ⚠️ **Era 15 até 2026-11-19.** O 15 saiu da lista pela decisão **D2**, e um default fora da lista
    é uma tela que abre num estado que ela não sabe exibir. O 30 é o único valor que o founder
    nomeou e que existe nas duas plataformas, e é o medido em produção.
- [ ] **AC3 (os três relógios continuam sendo um):** para o mesmo sorteio, o `reservedUntil`
      gravado, o tempo que a tela de pedido anuncia e o `expiration_seconds` enviado à Paysure
      derivam do **mesmo** valor. Teste que lê os três e compara entre si — não com um literal.
- [ ] **AC4 (trocar a configuração não mexe no passado):** reserva feita com **10** minutos continua
      expirando em 10 depois de o operador trocar para **30**. O `reservedUntil` da reserva viva
      **não muda**. Regressão contra o "conserto" de recalcular reserva aberta.
  - ⚠️ **Os dois valores do teste mudaram com a D2**: eram 15 → 30, e o 15 não existe mais no
    seletor. 10 e 30 estão os dois na lista nova.
- [ ] **AC5 (os oito valores cabem na Paysure):** 3, 4, 5, 10, 30, 60, 180 e 1 440 minutos produzem
      `expiration_seconds` dentro de **60 a 86 400, inclusive nos dois extremos**. Teste sobre a
      lista do **esquema zod**, não sobre valores escolhidos à mão — se alguém acrescentar uma opção
      fora da faixa, o teste cai.
  - ⚠️ **A asserção do teto é `<= 86 400`.** `1 Dia` dá **exatamente** 86 400, e o limite é
    inclusivo. Um `< 86 400` reprovaria a opção que a Sorteamos oferece; e qualquer folga somada ao
    cálculo depois (carência, arredondamento, margem) estoura em **422** no caminho do dinheiro.
- [ ] **AC6 (os oito são a única lista, e o 15 não sobrou em lugar nenhum):** busca por `15` como
      literal de minutos de reserva não encontra nenhuma declaração — **nem no default**, que passou
      a ser 30. Inclui `RESERVATION_MINUTES_DEFAULT` (**`validations/reserve.ts:114`**), que fica morto
      e tem de ser apagado. É o AC14 da `LTM-03b` levado até o fim.
- [ ] **AC7 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.
- [ ] **AC8 (a lista fechada vale no servidor, não só na tela — D2):** gravar
      `reservationExpiryMinutes = 7` por fora da interface é **recusado** pelo
      `productAdvancedSettingsSchema`. Teste chama a validação direto, sem passar pelo seletor.
      Sem este AC, o AC5 prova algo sobre a tela e nada sobre o dado.
- [ ] **AC9 (as duas cópias da lista no seletor são a mesma — D2):** o `items={{…}}` e o `.map()` de
      `advanced-settings-tabs.tsx` oferecem **o mesmo conjunto**, e ele é o do zod. Hoje a lista
      está escrita duas vezes no mesmo componente; uma só mudar é um seletor que mostra um rótulo e
      grava outro valor.

## Escopo

**IN:** a leitura do campo existente; a derivação dos três relógios a partir dele; **a troca da
lista de valores pelas oito da Sorteamos, o default em 30 e a lista fechada no zod (decisão D2)**;
os testes acima.

**OUT:**

- ~~**Mudar a tela ou o esquema.** Os dois já existem e já oferecem cinco valores — mais do que os
  dois pedidos. **Não reduzir a lista a 15 e 30**: tirar opção que já está no ar é decisão do
  founder, não limpeza de escopo.~~
  **REVOGADO em 2026-11-19 pela decisão D2 do founder.** A linha estava certa no raciocínio e é
  justamente por isso que caiu: ela dizia que mexer na lista era decisão do founder, **e o founder
  decidiu**. A lista não foi *reduzida* a 15 e 30 — foi **substituída** pelas oito da Sorteamos, o
  que remove o 15 e acrescenta 3, 4, 5 min, 3 h e 1 dia. A tela e o esquema **entram no IN**.
  > O @po validou esta linha como correta em 11-18 (*"manter os cinco satisfaz o pedido
  > estritamente"*). Ele estava certo **dado o que se sabia**: o pedido era *"15 ou 30"*. O que mudou
  > não foi o argumento, foi o pedido — a D2 é paridade com a Sorteamos, não o pedido de 11-18.
- **Configuração por tenant** (um padrão da casa para sorteios novos). É outra camada, e o pedido
  foi por sorteio.
- **Migrar sorteio existente que tenha `reservationExpiryMinutes = 15`.** Não há sorteio real
  (founder, 11-18), então não há o que migrar. **Fica declarado como o que não se faz** e como o que
  passa a ser necessário no dia em que houver sorteio real — ver o efeito colateral na seção da D2.
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
  apps/lotemania/src/lib/validations/reserve.ts                                 (O CORPO da funcao - :149-157; e apagar :114)
  apps/lotemania/src/lib/validations/product-settings.ts                        (D2: default 30 + lista fechada - :24)
  apps/lotemania/src/app/dashboard/products/[id]/advanced-settings-tabs.tsx     (D2: as 8 opcoes - :414-430, DUAS copias)
  apps/lotemania/tests/reserva/janela/**                                        (novo)

Cobertos por teste, NAO editados (os tres ja consultam a funcao unica desde a LTM-03b):
  apps/lotemania/src/lib/actions/reserve.ts                                    (:424 - ja chama reservationMinutesFor)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx (:117 - ja deriva o valor)
  apps/lotemania/src/lib/payments/paysure-client.ts                            (:54 - ja multiplica por 60)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — o campo ja existe no jsonb; nenhuma coluna nova
  relogio do teste  — AC1, AC2 e AC4 medem janela de tempo. Tempo FALSO, isolado por arquivo.

Depends-on: LTM-03b (total), LTM-02 (dona de validations/reserve.ts)
```

> ✅ **Conferido pelo @po em 2026-11-20: a correção nº 1 está aplicada, e é a que importava.** O
> bloco acima aponta `validations/reserve.ts` para o corpo da função e **não** aponta mais
> `actions/reserve.ts` — era esse exato erro que custou o NO-GO de 11-18, e é a mesma classe de
> defeito que custou 6,5 à `LTM-02` em 17-11.
>
> ⚠️ **`src/lib/validations/reserve.ts` é declarado pela `LTM-02`** (`LTM-02.md`, bloco `Files:`) —
> **esta é a colisão real**. A `LTM-02` está **entregue** (código em `b4d8765b`), então a
> serialização já aconteceu de fato: esta story chega depois.
>
> ⚠️ **`advanced-settings-tabs.tsx` é declarado pela `LTM-18`** (bloco `Files:` da `18a`). A D2
> acrescenta esta colisão, que não existia antes: a `LTM-17` passou a mexer na tela do editor.
> **`LTM-17` e `LTM-18a` não formam onda.**
>
> ⚠️ **`product-settings.ts` também é da `LTM-18`** (*"se algum campo sair"*). Mesma serialização.

- ⛔ **Não pode compartilhar onda com a `LTM-02`** (dona de `validations/reserve.ts`) **nem com a
  `LTM-18a`/`LTM-18c`** (donas de `advanced-settings-tabs.tsx` e `product-settings.ts`).
- ✅ **Pode compartilhar onda com a `LTM-14`.** A restrição anterior vinha de as duas tocarem
  `pedido/[orderId]/page.tsx` — e essa colisão **deixou de existir**: a página já deriva o valor
  (`:98`) desde a `LTM-03b`, então esta story não a edita, só a cobre por teste.
- ✅ **Pode compartilhar onda com a `LTM-04`**, pela mesma razão: a `LTM-04` escreve
  `actions/reserve.ts`, que esta story **não edita mais**.
- ⚠️ **A D2 trocou a natureza do conjunto.** Era "quatro arquivos, em três deles trocar a origem de
  um número". Agora são **três arquivos editados** — o corpo da função, o esquema e a tela do editor
  — e a tela é a que acrescentou colisão nova, com a `LTM-18`.

## Riscos

- **[Médio] `NaN` no caminho mais quente do produto.** Sorteio antigo tem `advanced_settings = {}`,
  e acesso cru ao jsonb devolve `undefined`. Uma `reservedUntil` inválida não falha alto: ela grava,
  e o número fica preso ou livre na hora errada. AC2 existe só por isso, e é o risco real desta
  story.
- **[Médio] Alguém "consertar" recalculando reserva aberta.** Parece correção de consistência e é
  mudar o relógio debaixo de quem está pagando. AC4 é a regressão.
- **[Médio] `1 Dia` estourar a faixa da Paysure por uma folga somada depois.** 1 440 minutos dão
  **exatamente 86 400 s**, o teto do `expiration_seconds`. Não há margem nenhuma: qualquer carência,
  arredondamento para cima ou `+ 60` de segurança devolve **422** na criação da cobrança, no caminho
  do dinheiro. AC5 exige a asserção inclusiva; este risco é o motivo.
- **[Médio] Default fora da lista.** O `.default(15)` do zod aponta para um valor que a D2 remove do
  seletor. Se só a tela mudar, sorteio sem configuração abre num estado que a tela não exibe. AC2 é
  a trava, e o default vira **30**.
- **[Baixo → Médio] Gravar valor fora da lista por fora da tela.** O esquema é
  `int().positive()` — aceita 1, 7, 99999. Enquanto a lista só existir no seletor, a guarda da faixa
  da Paysure é decorativa. AC8 é a trava; o risco subiu porque o extremo de baixo da lista nova
  (3 min = 180 s) tem **três vezes** o piso, não dez.

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

> ### ⚠️ Superado em 2026-11-19 — e pelo motivo que este próprio parágrafo nomeou
>
> **A linha caiu, e o raciocínio acima é o que a derrubou.** O @po disse: *"só quem sabe se algum
> sorteio vivo usa 10 ou 120 hoje pode decidir isso — e não sou eu"*. O founder decidiu: **adotar as
> oito da Sorteamos**, o que remove o 15 **e** o 120, e acrescenta 3, 4, 5 min, 3 h e 1 dia.
>
> **O veredicto de 11-18 não fica arbitrário por isso.** Ele era sobre *"o pedido de 15 ou 30
> autoriza remover três opções?"* — e a resposta **não**, que continua certa. A D2 não é uma resposta
> a essa pergunta: é **paridade com a Sorteamos**, um pedido diferente, vindo do mandato de 11-18
> (*"absolutamente tudo deve ser replicado"*). O que mudou foi o pedido, não o argumento.

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

## Revalidação @po (2026-11-20) — **GO, 8,5/10. `Draft` → `Ready`**

Duas causas: o @pm aplicou a decisão **D2** do founder aqui, e as quatro correções do meu NO-GO de
11-18 precisavam ser conferidas **no arquivo**.

### As quatro correções de 11-18, conferidas

| # | Correção exigida | Estado |
|---|---|---|
| 1 | `Files:` declarar `validations/reserve.ts` e **parar de apontar** `actions/reserve.ts` | ✅ **aplicada, e é a que decidia o NO-GO.** O bloco aponta o corpo em `:149` e lista `actions/reserve.ts` na seção *"cobertos por teste, NÃO editados"* |
| 2 | *"O que já existe"* parar de descrever código que a `LTM-03b` mudou | ⚠️ **meia → fechada por mim hoje.** A tabela foi atualizada, mas o parágrafo logo abaixo dela continuava dizendo *"usa `RESERVATION_MINUTES = 15` cravado"* e *"a tela repete 'por 15 minutos' escrito à mão"*. **Reescrito com o corpo real da função** |
| 3 | Tarefa para apagar `RESERVATION_MINUTES_DEFAULT`, sem a qual o `AC6` é inexequível | ✅ **aplicada**, e o `AC6` a referencia |
| 4 | Corrigir as duas citações envelhecidas | ⚠️ **aplicada em 11-19 e envelhecida de novo** — ver abaixo |

### O alvo está confirmado, e é uma linha

```ts
// src/lib/validations/reserve.ts:149-157
void product;                        // recebe o sorteio
return RESERVATION_MINUTES_DEFAULT;  // devolve 15 de qualquer forma
```

**É a story mais bem recortada do epic hoje**, e por uma razão estrutural: a `LTM-03b` já amarrou os
**três** relógios a esta função, então mudar o corpo dela muda os três **de uma vez**, sem tocar em
nenhum dos três chamadores. Conferi os três: `actions/reserve.ts:424`,
`pedido/[orderId]/page.tsx:117` e `paysure-client.ts:54`. **Nenhum precisa ser editado.**

> 💡 **E o @qa chegou nisso pelo outro lado:** o portão da `LTM-03b` saiu **`CONCERNS`** porque o
> `AC14` dela afirma **uma** declaração de minutos e existem **duas**. Esta story fecha aquele
> `CONCERNS`. Duas rotas independentes achando o mesmo defeito é o melhor sinal de que o recorte
> entre as duas stories está certo.

### A D2 está bem aplicada, e o default 30 é a melhor parte

O @pm não só trocou a lista — ele **justificou o default com três razões independentes**, e a
terceira é a que vale: **30 é o medido em produção** (a campanha `46º RAPIDINHA`, observada ao vivo,
abriu a contagem em `29:17`). Não é *"escolhemos 30"*, é *"o Império usa 30"*. Isso é o oposto de um
`[CONFIRMAR]` disfarçado de decisão.

**E a conferência da faixa da Paysure valor por valor é trabalho que raramente se faz antes:** os
oito cabem, e `1 Dia` dá **exatamente 86 400 s**, o teto. O `AC5` exigindo asserção **inclusiva**
(`<= 86 400`, nunca `<`) com o aviso de que *"qualquer folga somada depois devolve 422 no caminho do
dinheiro"* é precisão de quem leu o contrato, não de quem o supôs.

✅ **E o `OUT` revogado está revogado do jeito certo:** com o raciocínio antigo preservado e a razão
da queda escrita — *"ela dizia que mexer na lista era decisão do founder, e o founder decidiu"*. É
assim que se desfaz uma decisão sem apagar por que ela era crível.

### As quatro citações que eu corrigi — e por que a terceira vez importa

| Citação na story | Linha real hoje |
|---|---|
| `reserve.ts:353` → corrigida para `:375` em 11-18 | **`:423-424`** |
| `page.tsx:63` → corrigida para `:98` em 11-18 | **`:117`** |
| `validations/reserve.ts:113` (`RESERVATION_MINUTES_DEFAULT`) | **`:114`** |
| `validations/reserve.ts:149` (o corpo) | ✅ **exata** — e é a única que **tinha** de estar certa |

> **Duas destas eu já corrigi uma vez, em 11-18, e envelheceram de novo em 48 horas** — porque
> `reserve.ts` recebeu a `LTM-02`, a `LTM-20` e a `LTM-23` nesse intervalo. **A lição não é "medir de
> novo"; é que citar linha de arquivo em fila serial tem prazo de validade curto.** O que não
> envelhece é citar **o nome da função** — `reservationMinutesFor`, `RESERVATION_MINUTES_DEFAULT` —, e
> é por isso que as duas que importam para o despacho (o corpo e a constante a apagar) estão
> ancoradas em nome **e** linha.
>
> ⚠️ **Nota para quem ler as validações antigas deste arquivo:** elas citam `:375` e `:98` como
> *corretas*. **Eram, em 11-18.** Não corrigi o histórico — corrigir registro de validação passada
> apagaria a evidência de que o arquivo se move.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ✅ **a correção que decidia o NO-GO está aplicada**; 3 editados, 3 cobertos e não editados, com as colisões da D2 declaradas |
| UI/Frontend | ✅ as **duas cópias** da lista no mesmo componente (`:416` e `:424`) estão nomeadas, e o `AC9` existe por isso |
| Satisfação dos ACs | ✅ `AC8` (lista fechada no servidor) é o que faz o `AC5` provar o dado em vez da tela |
| Instruções de teste | ✅ `Resources:` declara **tempo falso isolado por arquivo**, que os `AC1`/`AC2`/`AC4` exigem |
| Segurança | ➖ |
| Sequência de tarefas | ✅ |
| Duplicação funcional | ⚠️ três arquivos disputados (`LTM-02` entregue; `LTM-18a`/`18c` **não existem ainda**) |
| Anti-alucinação | ✅ depois das quatro correções; a afirmação falsa de *"o que o código faz hoje"* foi reescrita |
| Prontidão para @dev | ✅ a `LTM-03b` está `InReview` com o portão em `CONCERNS` — e esta story é o fecho dele |

### A ordem que eu recomendo, e ela mudou

A `LTM-17` é **P1**, mas é **S→M**, toca **três** arquivos e **fecha um `CONCERNS` aberto do @qa**. A
`LTM-04`, que o epic põe antes dela na fila de `reserve.ts`, é **XL, cresceu com a D8 e segue
`Draft`**. ⚠️ **E esta story não edita mais `actions/reserve.ts`** — então a razão original de ela
estar atrás da `LTM-04` **deixou de existir**.

> **Recomendo inverter: `LTM-17` antes da `LTM-04`.** Ela sai em uma onda, destrava o pedido direto
> do founder, fecha o `CONCERNS` da `LTM-03b` e **não disputa `actions/reserve.ts` com ninguém**. A
> única serialização real que resta para ela é contra a `LTM-18a`/`18c`, que **ainda não existem**.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.3 | **Revalidada — GO (8,5/10). `Draft` → `Ready`.** As quatro correções de 11-18 conferidas no arquivo: a **nº 1 está aplicada e era a que decidia o NO-GO** — o `Files:` aponta `validations/reserve.ts:149` para o corpo e lista `actions/reserve.ts` como *coberto, não editado*. Alvo confirmado no código: `reservationMinutesFor` em `validations/reserve.ts:149-157` faz `void product; return RESERVATION_MINUTES_DEFAULT` — **recebe o sorteio e o descarta**. **Fechei a correção nº 2, que estava meia:** a tabela *"O que já existe"* tinha sido atualizada, mas o parágrafo abaixo dela seguia afirmando *"`actions/reserve.ts` usa `RESERVATION_MINUTES = 15` cravado"* e *"a tela repete 'por 15 minutos' à mão"* — as duas falsas desde a `LTM-03b`; reescrito com o corpo real. **Quatro citações de linha corrigidas**, duas delas pela **segunda** vez (`reserve.ts:353`→`:375`→**`:423-424`**; `page.tsx:63`→`:98`→**`:117`**; `RESERVATION_MINUTES_DEFAULT` `:113`→**`:114`**), o que registra a lição: **linha de arquivo em fila serial tem prazo de validade curto — ancorar em nome de função**. A **D2** do @pm está bem aplicada, com o default **30 medido em produção** (contagem de `29:17` na campanha ao vivo) e a faixa da Paysure conferida valor por valor (`1 Dia` = **exatamente** o teto de 86 400 s, daí a asserção inclusiva do `AC5`). **Recomendação de ordem alterada: `LTM-17` antes da `LTM-04`** — esta não edita mais `actions/reserve.ts`, então a razão de estar atrás dela deixou de existir, e ela **fecha o `CONCERNS` do portão da `LTM-03b`**. | @po (Pax) |
| 2026-11-19 | 1.2 | **Decisão D2 do founder aplicada: as 8 janelas da Sorteamos substituem as 5 do lotemania, e o 15 sai.** A story deixa de ser só "ligar a leitura" e passa a trocar também a lista: o seletor (`advanced-settings-tabs.tsx:414-430`, **duas cópias da lista no mesmo componente**), o default (`product-settings.ts:24`: `.default(15)` → **`.default(30)`**) e o esquema, que passa de `int().positive()` solto a **lista fechada**. O default 30 é **decidido, não `[CONFIRMAR]`**: é o único valor nas duas listas, é o que o founder nomeou, e é o medido na campanha ao vivo de 11-19 (29:17 de contagem, 29 min 30 s de janela). Conferidos os 8 contra a faixa da Paysure: **todos cabem, e `1 Dia` dá exatamente 86 400 s, o teto** — AC5 passa a exigir asserção inclusiva, porque qualquer folga somada depois devolve 422. ACs mexidos: AC2 (15 → 30), AC4 (15/30 → 10/30), AC5 (5 → 8 valores), AC6 (o 15 não sobra nem no default); **AC8 e AC9 novos** (lista fechada no servidor; as duas cópias do seletor coerentes). O `OUT` de *"não reduzir a lista"* foi **revogado** — ele dizia que mexer era decisão do founder, e o founder decidiu. Bloco `Files:` corrigido conforme a correção nº 1 do @po (o corpo mora em `validations/reserve.ts:149`, declarado pela `LTM-02`) e **acrescido de duas colisões novas com a `LTM-18`**. Registrado o efeito colateral: sorteio com `reservationExpiryMinutes = 15` gravado fica com valor fora da lista — hoje barato (nenhum sorteio real), depois não. **Esta é edição de @pm aplicando decisão de founder; AC e escopo são do @po — a story precisa de revalidação antes de ir a `Ready`.** | @pm (Morgan) |
| 2026-11-18 | 1.1 | **Validada (1ª) — NO-GO (6,5/10). `Ready` → `Draft`.** O `Ready` havia sido posto pelo @aiox-master, que não tem essa autoridade — e a reversão se sustenta pelo mérito: o `Files:` aponta `actions/reserve.ts` para o corpo de `reservationMinutesFor`, que mora em `validations/reserve.ts:149` (o @dev provou que `"use server"` impede o contrário), e **não declara** o arquivo real, que é da `LTM-02`. É o mesmo defeito, no mesmo arquivo, pelo qual a `LTM-02` levou 6,5 em 17-11. Também: *"O que já existe"* descreve um código que a `LTM-03b` já mudou (a constante saiu, a tela já deriva o valor, `paysure-client.ts:54` também), o que faz a story contradizer a própria §1; o **AC6 é inexequível** porque `RESERVATION_MINUTES_DEFAULT` (`validations/reserve.ts:113`) teria de ser apagado e nenhuma tarefa diz isso; e duas citações envelheceram (`reserve.ts:353` → `:375`, `page.tsx:63` → `:98`). **Confirmado como certo:** o OUT de não reduzir os cinco valores a 15 e 30 — o founder pediu a capacidade de escolher, não a remoção de três opções no ar, e manter os cinco satisfaz o pedido. As quatro citações de "o que já existe" estão exatas, e AC2/AC3 são os ACs mais bem formados da story. | @po (Pax) |
| 2026-11-18 | 1.0 | Nasce do pedido do founder de deixar o relógio configurável na aba de edição do sorteio. Ao conferir, **o campo, a tela e os cinco valores já existiam** — `reservationExpiryMinutes` (`product-settings.ts:24`) e o seletor "Tempo para uma reserva pendente expirar" (`advanced-settings-tabs.tsx:414`) — e **nada lê o valor**. A story deixa de ser "construir a flag" e passa a ser "ligar a flag que já está no ar", que é a terceira ocorrência deste padrão na base. | @aiox-master |
