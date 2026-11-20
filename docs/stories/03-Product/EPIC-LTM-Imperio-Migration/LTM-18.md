# LTM-18: O editor de sorteio tem 43 controles e 5 funcionam

**Status:** Draft
> ❌ **NO-GO do @po em 2026-11-20 — 6/10. Permanece `Draft`, e a razão não é de mérito.** A story
> está certa no diagnóstico, certa na medição e certa na divisão que ela mesma propõe — e **é
> indespachável como está**: um conjunto `Files:` de 8 entradas que atravessa a fila serial de
> `reserve.ts`, com `Depends-on: LTM-02, LTM-03b, LTM-04, LTM-17`, não forma onda em nenhuma
> combinação (`parallel-waves.md`, condição 2). **O que falta é a divisão em `18a`/`18b`/`18c`
> existir como arquivo**, e criar story é do @sm — não minha. A `18a` sai `Ready` no dia em que
> nascer. Revalidada também a decisão **D3** (aplicada pelo @pm) e **corrigida a conta dos 36**:
> a classificação cobre **35**. Ver *Revalidação @po (2026-11-20)*.
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P0** — o operador configura o sorteio de teste nesta tela, e ela aceita qualquer coisa sem obedecer
**Complexidade:** **XL** — candidata a divisão; o recorte proposto está no fim
**Criada por:** @aiox-master · 2026-11-18, a pedido do founder, depois do impasse da flag do relógio da reserva
**Evidência:** medição completa de 2026-11-18 (abaixo) + telas do founder comparando os dois painéis

## Story

**Como** operador do Império montando o primeiro sorteio no lotemania
**Eu quero** que cada chave que eu viro mude alguma coisa de verdade
**Para que** eu não configure um sorteio inteiro acreditando em controles que são desenho.

## A medição

Varredura de 2026-11-18 sobre `src/lib/validations/product-settings.ts` (43 campos de primeiro
nível), procurando leitor de cada campo **fora** da própria declaração e da tela de edição.

| | Campos |
|---|---|
| **Têm leitor de verdade** | **5** — `statusText`, `fullDescription`, `prizes`, `showPrizes`, `support` |
| Ganhando leitor agora, pela `LTM-03b`/`LTM-17` | 2 — `reservationExpiryMinutes`, `paymentGatewayProvider` |
| **Não têm nenhum leitor** | **36** |

> ### Atualização 2026-11-19 — o esquema tem **45** campos, e os 36 continuam 36
>
> A `LTM-07` acrescentou **dois** campos ao mesmo esquema: **`prizeKind`** (`cash` | `other`) e
> **`prizeAmount`**. Eles **nascem com leitor** — `src/lib/raffles/divisibility.ts`,
> `prize-split.ts`, `winners.ts`, `validations/product.ts` e `actions/products.ts` — então **não**
> entram na conta dos inertes.
>
> | | Antes | Agora |
> |---|---|---|
> | Total de campos | 43 | **45** |
> | Com leitor | 5 (+2 em curso) | **9** |
> | **Sem leitor** | **36** | **36** |
>
> **A manchete não muda; o denominador sim.** Importa para o `AC1`, que manda a varredura rodar
> como teste: ela mede o conjunto *"campo declarado sem nenhum leitor"*, e esse conjunto tem de
> ficar vazio — independente de quantos campos existam no total.
>
> **E é a primeira vez que um campo novo nasce ligado nesta base.** Era exatamente o que o `AC1`
> existe para tornar obrigatório.
>
> ⚠️ **Colisão de nome que vale conhecer:** `advancedSettings.prizeAmount` é o **prêmio do
> sorteio**; `winners.prize_amount` (`raffles.ts:297`) é o **valor que um ganhador recebeu**. Em
> sorteio divisível o segundo é metade do primeiro — é o rateio. Nomes iguais, camadas diferentes,
> e o rateio é literalmente a função que leva de um ao outro.

A loja lê exatamente cinco linhas de configuração
(`src/app/loja/[tenant]/[productSlug]/page.tsx:130, 136, 165, 215, 219-220`). Todo o resto do
editor grava no banco e **nada consulta**.

> ### O caso que o founder fotografou
>
> No bloco **"Campos requeridos para realizar a reserva"** o operador liga Nome, Telefone, CPF,
> E-mail, Nome Social e Data de Nascimento. São seis chaves, e elas aparecem **iguais** nos dois
> painéis.
>
> O formulário de reserva do lotemania exige **telefone, sempre, e mais nada**:
> `src/lib/validations/reserve.ts:176` → `phone: z.string().min(8, "Telefone inválido")`. Não há
> leitura de `requiredFields` em lugar nenhum.
>
> **O operador pode exigir CPF e a loja nunca vai pedir CPF.** A chave gira, a cor muda, o valor
> salva no banco, e o comportamento é o mesmo. É o retrato exato do defeito desta story.

### Por que isto é pior do que faltar o controle

Um controle ausente é uma falta de paridade: o operador percebe, pergunta, e nós respondemos.

**Um controle que não faz nada é uma informação falsa.** O operador configura, confere, e segue
confiando. Ele só descobre quando um comprador reclama — ou quando não reclama, e o sorteio inteiro
rodou com a regra errada sem ninguém notar. É o mesmo gênero de cegueira da `OPS-01`, onde a tarefa
agendada relatava sucesso enquanto falhava: **a interface afirmando algo que o sistema não cumpre.**

## Os 36, classificados

A classificação importa porque **"ligar as 36" não é um trabalho só** — três delas são features
inteiras disfarçadas de chave.

### Grupo A — mentem sobre o que o sistema **já poderia** fazer hoje (15)

O dado existe, o caminho existe, falta a leitura. É aqui que mora a maior parte do valor, e é o
grupo que o sorteio de teste precisa.

```
requiredFields              showPaidParticipantNames    showDrawDateToParticipants
autoFinishOnDrawDate        showOnHomepage              descriptionMode
salesStartMode              minPerReservation           maxPerReservation
initialPerReservation       maxPerBuyer                 maxQuantityPerBuyer
restrictedDdds              antiSpamEnabled             allowReceiptDownload
```

⚠️ **Quatro destes tocam o caminho da reserva** — `minPerReservation`, `maxPerReservation`,
`initialPerReservation`, `maxPerBuyer`/`maxQuantityPerBuyer`, `restrictedDdds` e `antiSpamEnabled`
vivem em `src/lib/actions/reserve.ts`, que é disputado pela `LTM-02`, `LTM-03b`, `LTM-04` e
`LTM-17`. **Ver a nota de ondas**: esta é a razão principal da divisão proposta.

### Grupo B — prometem uma tela que não existe (8)

A chave ligaria um pedaço de loja que nunca foi construído. Conferido: não há barra de progresso,
nem ranking, nem cartões de compra rápida em `number-grid.tsx` nem em `[productSlug]/page.tsx`.

```
showSalesProgressBar   showDailyRanking    showGeneralRanking
quickBuyCards          popularCardIndex    groupCta
videoEnabled           ebookEnabled
```

### Grupo C — prometem uma feature inteira (11 campos + 1 ferramenta)

Aqui a chave não é o trabalho; é o rótulo de um trabalho. `upsellEnabled` não se "liga": upsell se
constrói.

```
upsellEnabled      promotionsEnabled    doublePromoEnabled    instantPrizesEnabled
capitalizerEnabled capitalizerCode      alertEnabled          freeCampaign
hasFee             allowAffiliates      drawMechanism
```

#### + `Porcentagem` — decisão **D3** do founder, 2026-11-19: **replicar**

> **A decisão, textual:** *"Replicar, é ferramenta do cliente."*

**O que ela é, dito sem rodeio** (`README.md` §4 do inventário, [OBSERVADO] em 2026-11-18): um painel
com a barra de progresso real, um campo **"Ajuste de porcentagem"**, uma caixa **"Fixar
porcentagem"** e os botões `Salvar`/`Fechar`. **É um controle para exibir ao comprador uma
porcentagem de vendas diferente da real, e para travá-la nesse valor.**

Ela entra no grupo C porque **não é configuração, é feature** — e porque exige três peças que hoje
não existem, nenhuma das quais basta sozinha:

| Peça | Onde mora | Grupo | Estado |
|---|---|---|---|
| A **barra de progresso** na loja | `[productSlug]/page.tsx` — `showSalesProgressBar` | **B** | não existe |
| O **ajuste e a fixação** (o valor exibido deixa de ser o real) | persistência nova + o cálculo que a barra lê | **C** | não existe |
| O **controle do operador** que abre o painel | menu ⋮ da lista de compras, item 4 de 14 | **`LTM-11`** | não existe |

> ⚠️ **`Porcentagem` NÃO é um campo de `product-settings.ts`**, e isso importa para o **AC1**: a
> varredura que ele manda virar teste mede *"campo declarado sem nenhum leitor"*, e esta ferramenta
> não é campo declarado. **Ela não entra na conta dos 36** — nem antes, nem depois. O grupo C passa a
> ter **11 campos + 1 ferramenta**, e os dois números têm de andar separados ou a medição se corrompe.
>
> ⚠️ **E a peça do meio é a que carrega a decisão.** Construir só a barra (grupo B) entrega uma barra
> **honesta**, que mostra o real. É o `showSalesProgressBar` e nada mais. A D3 é sobre a **segunda**
> peça: a que faz o número exibido divergir do número verdadeiro. Quem implementar a barra sem o
> ajuste não cumpriu a D3 — e quem implementar o ajuste sem a barra construiu um controle sem efeito,
> que é o defeito que esta story inteira existe para acabar.

**A relação com a `.claude/rules/claims-ledger.md`, registrada sem moralizar.** A regra proíbe
escassez e urgência que não correspondam ao fato, e **continua valendo integralmente para material
que nós produzimos** — anúncio, DM, proposta, legenda, página. O que a D3 decide é diferente: esta é
uma **ferramenta de operação do cliente**, dentro do sistema dele, e **quem decide usá-la ou não é
ele**. Construir a ferramenta não é fazer a alegação.

O que **permanece** nosso, e não é afetado pela D3:

- nenhum material de marketing nosso cita número de vendas do Império que venha desta barra;
- o que o lotemania **grava** continua sendo o real — o ajuste é camada de exibição, nunca
  reescrita do dado. `product_numbers` e `orders` não mentem; a barra é que passa a poder.
- a mesma leitura vale para o `alertEnabled` (*"cronômetro de início e fim"* na página de vendas,
  `editor-14-abas.md` §5), que é do mesmo gênero e foi registrado junto.

> Algumas têm tabela de apoio no banco (`capitalizers`, `affiliates`, `awarded_boxes`,
> `scratch_cards`, `reward_spins`) — o que significa que **parte** do caminho existe, não que a
> feature exista. Confirmar caso a caso é trabalho de análise, não suposição: nenhuma destas entra
> em escopo sem o @architect dizer o que já há.

### Grupo D — o `reservationModel` é um caso à parte **— e ele tem um par (2)**

`reservationModel: "manual" | "random"` decide se o comprador escolhe o número ou se o sistema
sorteia. **Não é cosmético: muda o fluxo de compra inteiro**, e hoje a loja só faz manual. Fica
classificado separado para não ser confundido com uma chave de exibição do grupo A.

> ### ⚠️ O 36º campo não estava em grupo nenhum — `showRandomSelectionOption`
>
> **Achado do @po em 2026-11-20, contando os grupos contra o esquema.** A classificação soma
> **A (15) + B (8) + C (11) + D (1) = 35**, e os campos sem leitor são **36**. O que faltava:
>
> | | |
> |---|---|
> | Campo | **`showRandomSelectionOption`** (`product-settings.ts:18`) |
> | Leitor fora da declaração e do editor | **nenhum** — só `advanced-settings-tabs.tsx:360-361`, que é a própria tela de edição e não conta pelo método desta story |
> | Grupo | **D**, com o `reservationModel` — é o **par** dele: um decide se o sistema sorteia o número, o outro decide se o comprador **vê a opção** de pedir que sorteiem |
>
> **Por que isto importa além da aritmética:** o `AC1` manda a varredura virar teste com o conjunto
> *"campo sem leitor"* **vazio**. Um campo fora de todos os grupos é um campo que **nenhuma tarefa
> reivindica** — ele sobreviveria às três filhas e **faria o `AC1` falhar no fim da frente**, sem
> dono para consertá-lo. Era o 43º campo nascendo inerte **antes** de a story acabar.
>
> E ele é o par do `reservationModel` por razão de produto, não de arrumação: ligar o modo aleatório
> sem a opção na tela entrega uma feature que ninguém alcança — **o mesmo defeito, um nível acima**,
> que é o defeito que esta story inteira existe para acabar.

## O lado visual

As duas telas que o founder capturou mostram o mesmo bloco nos dois painéis. A estrutura confere —
os mesmos campos, na mesma ordem, com os mesmos rótulos. **A diferença é de densidade:** o editor
do lotemania usa linha mais alta, rótulo maior e chave maior que o da Sorteamos, o que faz o mesmo
conteúdo ocupar visivelmente mais altura.

> ⚠️ **Isto é leitura de tela, não medição.** Diferente do que já foi feito para a loja
> (`docs/research/2026-11-17-paridade-visual-loja.md`, onde cada valor saiu do HTML servido), aqui
> **nada foi medido ainda**. A primeira tarefa visual é medir: altura de linha, corpo do rótulo,
> dimensão da chave e espaçamento entre blocos, dos dois lados. **Não ajustar por impressão** — foi
> o que já produziu uma regressão visual em produção nesta mesma migração.

## Tarefas (Checklist)

### Medir antes de mexer

- [ ] Documento de pesquisa com os valores dos dois editores, lidos do HTML servido: altura de
      linha, corpo e cor do rótulo, dimensão da chave, espaçamento de bloco, largura do campo.
- [ ] Inventário tela-a-tela: para **cada** controle do editor, em qual das 14 abas ele vive.

### ~~Decidir, controle a controle~~ — **decidido em 2026-11-18: implementar os 36**

A tarefa de triagem deixou de existir. O que resta de "decidir" não é **se**, é **o quê**: o
comportamento de cada campo dos grupos B e C vem da observação da `LTM-19`, nunca de dedução.

### Executar

- [ ] **Grupo A (15):** a leitura de cada campo, no lugar onde ele deveria ter efeito.
- [ ] **Grupo B (8):** construir a tela de loja que cada chave liga — stories próprias.
- [ ] **Grupo C (11):** construir a feature que cada chave liga — stories próprias, a partir da
      `LTM-19`.
- [ ] **`reservationModel`:** os dois modos de escolha de número — story própria.
- [ ] A varredura vira **teste versionado** (AC1), para o 43º campo não nascer inerte.
- [ ] Ajuste visual conforme a medição.

## Critérios de Aceite

- [ ] **AC1 (nenhum controle inerte, ponto):** ao fim da frente, **todo** controle do editor governa
      alguma coisa. Teste: a varredura que gerou esta story vira **script versionado** e roda na
      suíte; o conjunto "campo declarado sem nenhum leitor" fica **vazio**.
  - ⚠️ **Endurecido pela decisão de 2026-11-18.** A redação anterior aceitava *"ou está marcado na
    interface como não implementado"* — a saída de escape que a triagem previa. Com a decisão de
    implementar as 36, **essa saída deixa de existir**: marcar virou admissão de trabalho não feito,
    não estado aceitável.
  - 💡 **A varredura precisa virar teste, não ficar como medição de uma vez.** Ela é o que impede o
    43º campo de nascer inerte amanhã. Um `expect(camposSemLeitor).toEqual([])` custa um arquivo e
    fecha o defeito **de forma permanente** — sem isso, a `LTM-18` conserta o passado e não protege
    o futuro.
- [ ] **AC2 (`requiredFields` governa o formulário):** ligar CPF faz a loja **exigir** CPF na
      reserva; desligar faz parar de exigir. Telefone ligado continua obrigatório. Teste com três
      configurações diferentes, conferindo a recusa e a aceitação — não a aparência do formulário.
- [ ] **AC3 (os limites por reserva são obedecidos):** `minPerReservation`, `maxPerReservation` e
      `maxPerBuyer` recusam no servidor, não só na tela. Teste chama a ação direto, sem passar pela
      interface — limite que só existe no navegador não é limite.
- [ ] **AC4 (as chaves de exibição exibem):** `showDrawDateToParticipants`,
      `showPaidParticipantNames` e `showOnHomepage` mudam o que a loja mostra, nos dois estados.
      Três chaves, seis asserções.
- [ ] **AC5 (sorteio antigo não muda de comportamento):** sorteio com `advanced_settings = {}`
      continua se comportando como hoje, com os defaults do zod. **Regressão obrigatória** — as 5
      rodadas diárias do Império rodam com configuração gravada antes desta story.
- [ ] **AC6 (o visual sai da medição, não da impressão):** cada valor alterado no editor aponta
      para a linha do documento de pesquisa que o mediu. Valor sem origem documentada não entra.
- [ ] **AC7 (nenhum comportamento inventado):** nenhum campo dos grupos B e C é implementado sem
      **observação registrada** do que ele faz na Sorteamos. O que não puder ser observado **espera
      a observação** — não é adivinhado.
  - ⚠️ **Este AC sobrevive à decisão de implementar tudo, e fica mais importante por causa dela.**
    "Implementar as 36" responde **se** construir; não responde **o quê**. `instantPrizesEnabled`
    ligado sem saber o que ele fazia na Sorteamos é inventar comportamento no caminho do prêmio —
    e o founder pediu réplica, que é o oposto de invenção. A fonte é a `LTM-19`.
- [ ] **AC8 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Decisão do founder — 2026-11-18: **as 36, todas**

Eu recomendei triagem: ligar o grupo A, esconder o B, marcar o C como não implementado. **O founder
decidiu o contrário, e a decisão está tomada:** *"quero que implemente todas as 36 features e tudo
que tem na Sorteamos — absolutamente tudo deve ser replicado"*.

| Grupo | Minha recomendação | **Decisão** |
|---|---|---|
| **A** (15) | ligar | **implementar** |
| **B** (8) | esconder até a tela existir | **construir a tela e ligar** |
| **C** (11 + 1) | marcar como não implementado | **construir a feature e ligar** |
| **D** (`reservationModel`) | story própria | **implementar os dois modos** |

> **2026-11-19 — a `Porcentagem` fecha o único item do grupo C que ainda era dúvida de produto.** A
> decisão de 11-18 (*"as 36, todas"*) respondia **se** construir os campos do editor; ela não
> alcançava a `Porcentagem`, que **não é campo do editor** e estava registrada à parte como pergunta
> ao founder, por colidir com a `claims-ledger`. A decisão **D3** respondeu: **replicar, é ferramenta
> do cliente.** Ver o detalhamento no grupo C.

**O que isso muda na natureza desta story:** ela deixa de ser *"fazer a tela parar de mentir"* e
passa a ser *"construir o que a tela promete"*. Os grupos B e C **não são configuração** — são
oito telas de loja e onze features. Isso não cabe numa story nem em três; vira a espinha da Frente
B, e o recorte abaixo muda de acordo.

### E o risco [Alto] desapareceu

O founder também decidiu: **os sorteios hoje cadastrados no lotemania são todos de teste e podem
ser excluídos.**

Isso **elimina**, não mitiga, o risco que eu registrara como [Alto] e que o @po elevara a condição
de entrada da `18b`/`18c`: sorteio existente com configuração gravada que nunca teve efeito
passando a obedecê-la de repente (`maxPerBuyer` = 1 salvo por engano recusando a segunda compra de
todo mundo). **Sem sorteio real no banco, não há configuração herdada para obedecer.**

> ⚠️ **Esta liberdade tem prazo.** Ela vale enquanto não existir sorteio de verdade. No dia em que
> o primeiro sorteio real for cadastrado, o risco volta inteiro — e aí a conferência do que está
> gravado deixa de ser dispensável. Registrado para não ser esquecido quando a condição mudar.

## Escopo

**IN:** a medição visual; o inventário por aba; a decisão aplicada aos 36; a implementação do
grupo A; o ajuste visual.

**OUT desta story — mas DENTRO do mandato, em stories próprias (decisão de 2026-11-18):**

As três linhas abaixo saíram daqui porque **não são configuração** e não cabem numa story de
editor. Nenhuma delas está fora do escopo do epic — todas foram mandadas construir.

- **As 8 telas do grupo B.** Barra de progresso, rankings, cartões de compra rápida, vídeo, ebook,
  CTA de grupo. São loja, parentes da `LTM-15`. **Construir** — a chave do editor só faz sentido
  depois que a tela existe.
- **As 11 features do grupo C, mais a `Porcentagem`.** Upsell, promoções, promoção dobrada, títulos
  premiados, capitalizadora, alertas, campanha gratuita, taxa, afiliados, mecanismo de sorteio —
  **e o ajuste/fixação da barra de progresso, por decisão D3 do founder em 2026-11-19**.
  **Construir** — cada uma com story própria, e cinco delas já têm tabela de apoio no banco
  (`capitalizers`, `affiliates`, `awarded_boxes`, `scratch_cards`, `reward_spins`), o que muda o
  tamanho mas não a natureza do trabalho.
  > A `Porcentagem` é a única das doze que **atravessa três lugares**: a barra na loja (grupo B), a
  > persistência do ajuste (grupo C) e o controle no menu ⋮ da `LTM-11`. A story própria dela tem de
  > declarar os três, ou ela nasce entregando um terço.
- **O `reservationModel`** (manual × aleatório). **Construir os dois modos** — muda o fluxo de
  compra, então é story própria por tamanho, não por dúvida.

**OUT do mandato — por ora:**

- **As configurações fora do editor de sorteio** (configurações do site, integrações, gateways).
  Mesmo defeito, outra tela: `showQrCodeByDefault` é o exemplo conhecido. O mandato de 2026-11-18
  diz *"tudo que tem na Sorteamos"*, então isto provavelmente **entra** — mas entra pelo inventário
  da `LTM-19`, não por dedução minha aqui.

## Dependências

- ⚠️ **Seis campos do grupo A vivem em `src/lib/actions/reserve.ts`**, disputado por `LTM-02`,
  `LTM-03b`, `LTM-04` e `LTM-17`. Esta story vem **depois** das quatro, ou o grupo A é cortado em
  dois (ver nota de ondas).
- **Depende da `LTM-10`/`LTM-13`?** Não. É outra tela.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files (recorte COMPLETO, antes da divisao):
  apps/lotemania/src/app/dashboard/products/[id]/advanced-settings-tabs.tsx   (ajuste visual + marcacao)
  apps/lotemania/src/lib/validations/product-settings.ts                      (se algum campo sair)
  apps/lotemania/src/lib/validations/reserve.ts                               (requiredFields, limites)
  apps/lotemania/src/lib/actions/reserve.ts                                   (limites, DDD, anti-spam)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx                 (chaves de exibicao)
  apps/lotemania/src/app/loja/[tenant]/page.tsx                               (showOnHomepage)
  apps/lotemania/tests/dashboard/editor-sorteio/**                            (novo)
  docs/research/2026-11-18-paridade-editor-sorteio.md                         (a medicao)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — os 43 campos ja existem no jsonb; nenhuma coluna nova

Depends-on: LTM-02, LTM-03b, LTM-04, LTM-17 (todas donas de reserve.ts)
```

- ⛔ **Conjunto grande demais e disputado demais para uma onda.** `reserve.ts` sozinho a põe atrás
  de quatro stories, e `[productSlug]/page.tsx` colide com a `LTM-12` e a `LTM-15`.
- 💡 **Divisão proposta ao @po — três filhas, e as duas primeiras não dependem de nada:**

  | Filha | Conteúdo | Arquivos | Onda |
  |---|---|---|---|
  | **18a** | A medição visual + o inventário por aba + **a varredura virando teste** (AC1) | `advanced-settings-tabs.tsx`, o doc, `tests/` | **pode ir já** |
  | **18b** | As chaves de **exibição** do grupo A | `[productSlug]/page.tsx`, `loja/[tenant]/page.tsx` | depende só de não colidir com `LTM-12`/`LTM-15` |
  | **18c** | Os campos que tocam **a reserva** (limites, DDD, anti-spam, `requiredFields`) | `reserve.ts`, `validations/reserve.ts` | **depois** de `LTM-02`, `LTM-03b`, `LTM-04` e `LTM-17` |

  **A 18a mudou de natureza com a decisão de 2026-11-18.** Ela não marca mais nada como "não
  implementado" — essa era a saída que a triagem previa. O que sobra nela é mais valioso: a medição
  visual e, sobretudo, **a varredura virando teste versionado**, que é o que impede o defeito de
  voltar depois que as 36 estiverem ligadas.

  ⚠️ **As três filhas não dão conta do mandato.** Elas cobrem o **grupo A**. Os grupos B (8 telas) e
  C (11 features) e o `reservationModel` são stories próprias, nascidas do inventário da `LTM-19` —
  ver a seção de escopo. Chamar isso de "LTM-18 dividida em três" seria subdeclarar o trabalho do
  mesmo jeito que o `Files:` subdeclarado que o @po reprovou duas vezes neste epic.

## Riscos

- ~~**[Alto] Ligar uma chave e mudar o comportamento de sorteio que já está no ar.**~~
  **ELIMINADO em 2026-11-18 por decisão do founder:** os sorteios hoje no lotemania são todos de
  teste e **podem ser excluídos**. Sem sorteio real no banco, não há configuração herdada para
  obedecer. O @po havia elevado isto a condição de entrada da `18b`/`18c`; a condição caiu.
  ⚠️ **Com prazo:** volta inteiro no dia em que existir o primeiro sorteio de verdade.
- **[Alto] Decidir por dedução no grupo C.** "Ligar" `instantPrizesEnabled` sem saber o que ele
  fazia na Sorteamos é inventar feature no caminho do prêmio. **A decisão de implementar tudo não
  diminui este risco — aumenta**, porque remove a saída de "marcar como não implementado" que antes
  absorvia o desconhecido. AC7 e a `LTM-19` existem por isso.
- **[Médio] Ajustar o visual por impressão.** Já produziu regressão em produção nesta migração. AC6
  é a trava.
- **[Médio] A story virar depósito.** 43 controles numa story é o que o @po chamou de "menu grande
  vira depósito" na `LTM-11`. A divisão proposta existe para isso.

## Priorização @po (2026-11-18) — **o item solto fecha aqui**

> ⚠️ **Isto não é a validação desta story.** A `LTM-18` não me foi atribuída nesta rodada e segue
> `Draft`. O que registro aqui é **priorização**, que é minha, e o fechamento de um item solto.

### O item solto que me foi passado é esta story

A `LTM-17` abriu, como item solto para o @po, *"uma varredura de **campo de configuração sem
leitor**"*, com três ocorrências conhecidas — `showQrCodeByDefault` (`LTM-14`),
`paymentGatewayProvider` (`LTM-03b`) e `reservationExpiryMinutes` (`LTM-17`) — **todas descobertas
por acaso**. Era a quarta ocorrência que se queria procurar de propósito.

**A varredura foi feita, e a resposta é 36, não 4.** Aceito o item como **fechado por esta story**:
ele deixa de ser item de backlog e passa a ser escopo medido. O que eu registro é o reenquadramento
de prioridade que a medição força:

| | Ao abrir o item solto (`LTM-17`) | Depois da medição (`LTM-18`) |
|---|---|---|
| Tamanho | 3 ocorrências conhecidas, tamanho desconhecido | **36 de 43 campos sem leitor**; a loja lê **5 linhas** |
| Natureza | padrão recorrente a vigiar | **informação falsa na tela que o operador usa para montar o sorteio de teste** |
| Prioridade | item solto, sem dono | **P0, com dono** |

O argumento que move isso de "vigiar" para P0 é o da própria story, e eu o subscrevo: **controle
ausente é falta de paridade; controle inerte é informação falsa.** O operador configura, confere, e
segue confiando. O caso que o founder fotografou é o retrato: ele liga CPF em *"Campos requeridos
para realizar a reserva"*, e `validations/reserve.ts:176` exige telefone e nada mais. A chave gira e
nada acontece.

### A divisão proposta: **aceita, com a ordem invertida no que importa**

A story me propõe três filhas. **Aceito as três**, e priorizo assim:

| Filha | Prioridade @po | Por quê |
|---|---|---|
| **18a** — medição + inventário + marcação dos grupos B e C | **P0, e vai primeiro** | É a única que **não liga nada** e já **faz a tela parar de mentir**. Toca um arquivo só (`advanced-settings-tabs.tsx`) e o doc, `Depends-on: none` de fato. Entrega o pedido original do founder sem esperar ninguém |
| **18b** — chaves de exibição do grupo A | **P1** | Conjunto pequeno, e a única aresta é não colidir com `LTM-12`/`LTM-15` em `[productSlug]/page.tsx` |
| **18c** — campos que tocam a reserva | **P1, por último** | Atrás de `LTM-02`, `LTM-03b`, `LTM-04` e `LTM-17`, todas donas de `reserve.ts`. É a fila mais longa do epic e não há como furá-la |

**A `18a` é o maior valor por unidade de risco de todo o epic hoje:** um arquivo, zero migração,
zero dependência, e o defeito que o founder viu deixa de existir visualmente no mesmo dia. Marcar um
controle como "não implementado" é honestidade de interface, e ela não espera a implementação.

### A ressalva que vale mais que a divisão

O risco **[Alto]** de *"ligar uma chave e mudar o comportamento de sorteio que já está no ar"* está
corretamente identificado e **não é coberto por nenhum AC** — a própria story diz isso do AC5. Fica
registrado como **condição de entrada da `18b` e da `18c`**, não como risco a conviver:

> **Antes de ligar qualquer campo do grupo A, consultar que valores estão gravados em
> `advanced_settings` nos sorteios reais do Império.** É consulta ao banco, não suposição. Um
> `maxPerBuyer` = 1 salvo por engano num sorteio vivo passa a recusar a segunda compra de todo mundo
> no instante em que o leitor existir — e ninguém pediu isso.

A `18a` não tem essa condição, porque não liga nada. É mais uma razão para ela ir primeiro.

## Revalidação @po (2026-11-20) — **NO-GO, 6/10. Permanece `Draft`**

Esta revalidação tem duas causas: o @pm aplicou a decisão **D3** do founder nesta story, e mudança de
escopo por outro agente exige minha revalidação. E eu nunca a tinha **validado** — em 11-18 registrei
**priorização**, que é outra coisa, e disse isso com todas as letras no próprio arquivo.

### A D3 está bem aplicada, e a parte mais difícil dela está certa

> *"Replicar, é ferramenta do cliente."*

O @pm fez três coisas que eu subscrevo sem ressalva:

1. **Manteve escrito o que a ferramenta é** — *"um controle para exibir ao comprador uma porcentagem
   de vendas diferente da real, e para travá-la"*, `[OBSERVADO]`. Decisão registrada com o que ela
   faz, não com um nome neutro.
2. **Separou a barra do ajuste.** *"Construir só a barra entrega uma barra honesta... quem implementar
   a barra sem o ajuste não cumpriu a D3"* — é a distinção que impede a story de nascer entregando um
   terço, e ela atravessa **três** lugares (grupo B, grupo C, menu da `LTM-11`).
3. **Tirou a `Porcentagem` da conta dos 36.** Ela **não é campo** de `product-settings.ts`, então não
   entra na varredura do `AC1`. Conferido: o grupo C é *11 campos + 1 ferramenta*, e os dois números
   andando juntos corromperiam a medição.

**Sobre a `claims-ledger.md`, concordo com o enquadramento e acrescento o limite.** A regra governa
**material que nós produzimos**; construir ferramenta de operação do cliente não é fazer a alegação, e
a decisão de uso é dele. O que permanece nosso está escrito e eu reforço: **o dado gravado continua
sendo o real** — `product_numbers` e `orders` não mentem, a barra é que passa a poder. ⚠️ **E uma
consequência que vale ficar aqui:** no dia em que algum material nosso citar número de vendas do
Império, a fonte **não pode ser essa barra**. É o tipo de atalho que ninguém decide tomar — se toma
por não saber que o número é ajustável.

### Por que é NO-GO, e o que exatamente destrava

**Não é discordância. É despachabilidade.** O bloco `Files:` da própria story declara 8 entradas,
três delas na fila serial de `reserve.ts`, e `Depends-on: LTM-02, LTM-03b, LTM-04, LTM-17`.

| Condição da `parallel-waves.md` | Esta story |
|---|---|
| 1. sem dependência transitiva | ❌ atrás de **quatro** stories |
| 2. conjuntos `Files` disjuntos | ❌ `reserve.ts`, `validations/reserve.ts`, `advanced-settings-tabs.tsx`, `product-settings.ts` e `[productSlug]/page.tsx` são todos disputados |
| 3. recursos independentes | ✅ nenhuma migração |

A story **já sabe disso** e propõe a saída: `18a` / `18b` / `18c`. Eu **aceitei a divisão em
2026-11-18** e priorizei a `18a` primeiro. **O que não aconteceu é a divisão existir como arquivo** —
e criar story é do @sm (`.claude/rules/agent-authority.md`), não minha. Marcar esta `Ready` seria
despachar um XL que colide com cinco stories e depende de quatro.

> **A `18a` é a maior relação valor/risco do epic hoje, e isso não mudou:** um arquivo
> (`advanced-settings-tabs.tsx`) mais o documento de medição, **`Depends-on: none` de fato**, e dentro
> dela **a varredura virando teste versionado** — que é o que impede o 46º campo de nascer inerte
> amanhã. Ela sai `Ready` no mesmo dia em que nascer.
>
> ⚠️ **Com uma colisão nova que a D2 criou e que a `18a` herda:** `advanced-settings-tabs.tsx` e
> `product-settings.ts` passaram a ser da **`LTM-17`** também. **`18a` e `LTM-17` não formam onda**, e
> a `LTM-17` vem antes — é P1 com pedido direto do founder e um escopo de três arquivos.

### O que eu medi e corrigi

| Afirmação | Medição de hoje |
|---|---|
| *"o esquema tem **45** campos"* (v1.1) | ✅ **45**, contados no `z.object` de `product-settings.ts` |
| *"**36** sem leitor"* | ✅ 45 − 9 com leitor = **36** |
| a classificação cobre os 36 | ❌ **cobre 35.** `showRandomSelectionOption` não estava em grupo nenhum — **corrigido**, entra no grupo **D** |
| `support` tem leitor de verdade | ✅ `[productSlug]/page.tsx:240-241` |
| `prizeKind`/`prizeAmount` nascem com leitor | ✅ `divisibility.ts`, `prize-split.ts`, `winners.ts`, `validations/product.ts`, `actions/products.ts` |
| *"`reserve.ts:176` exige telefone e nada mais"* | ⚠️ **a linha envelheceu** — o arquivo foi reescrito pela `LTM-02`/`LTM-23`. **A substância está intacta:** `requiredFields` (`product-settings.ts:19`) não tem **nenhum** leitor fora do editor, então a chave do CPF que o founder fotografou continua inerte |

### A ressalva de 11-18 continua valendo, e ganhou prazo

*"Antes de ligar qualquer campo do grupo A, consultar que valores estão gravados em
`advanced_settings` nos sorteios reais do Império."* O risco foi **eliminado** pela decisão de os
sorteios serem descartáveis — **com prazo**: ele volta inteiro no dia do primeiro sorteio real. A
`18a` não tem essa condição porque não liga nada; a `18b`/`18c` têm.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ❌ conjunto correto e **indespachável como um só** |
| UI/Frontend | ✅ a medição visual exigida antes do ajuste é a trava certa (`AC6`) |
| Satisfação dos ACs | ⚠️ `AC1` era insatisfazível pelo campo fora de grupo — **corrigido**; `AC7` é o melhor AC do epic contra invenção |
| Instruções de teste | ✅ a varredura virando teste é a melhor peça da story |
| Segurança | ✅ `claims-ledger` enquadrado com o limite escrito |
| Sequência de tarefas | ❌ *Executar* mistura grupo A (aqui) com B/C (stories próprias que não existem) |
| Duplicação funcional | ❌ cinco arquivos disputados |
| Anti-alucinação | ✅ 45/36 conferem; corrigidos o campo fora de grupo e a linha `:176` envelhecida |
| Prontidão para @dev | ❌ atrás de quatro stories |

### Correções exigidas antes de ir a `Ready`

1. **A divisão existir como arquivo** — `LTM-18a`, `LTM-18b`, `LTM-18c`, cada uma com seu `Files:`.
   **É do @sm.** Esta story passa a ser a **medição e o índice** das três, ou é substituída por elas.
2. **A seção *Executar* parar de misturar** o que é desta story (grupo A) com o que são stories
   próprias (B, C, `reservationModel`, `Porcentagem`) — hoje a mesma checklist pede as duas coisas.
3. **Nenhuma depende de decisão do founder.** As três são de recorte.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.3 | **Revalidada — NO-GO (6/10). Permanece `Draft`.** Primeira **validação** de fato (11-18 foi priorização, e o arquivo dizia isso). A decisão **D3** aplicada pelo @pm está **bem aplicada** e subscrita nos três pontos: o que a ferramenta é fica escrito, a barra é separada do ajuste (*"construir só a barra não cumpre a D3"*), e a `Porcentagem` fica **fora** da conta dos 36 porque não é campo do esquema. Acrescentado o limite do `claims-ledger`: no dia em que material nosso citar vendas do Império, **a fonte não pode ser essa barra**. **Corrigida a conta: a classificação cobria 35 dos 36.** `showRandomSelectionOption` (`product-settings.ts:18`) não estava em grupo nenhum — sem leitor fora do editor, entra no grupo **D** como par do `reservationModel`; sem isso ele sobreviveria às três filhas e faria o `AC1` falhar **sem dono**. Conferidos 45 campos no `z.object`, 9 com leitor, 36 sem. Registrado que a citação *"`reserve.ts:176` exige telefone e nada mais"* **envelheceu** (o arquivo foi reescrito pela `LTM-02`/`LTM-23`) e que a **substância está intacta**: `requiredFields` segue sem leitor. **O NO-GO é de despachabilidade, não de mérito:** 8 entradas em `Files:`, cinco arquivos disputados, `Depends-on` de quatro stories — não forma onda em nenhuma combinação. O que destrava é a divisão `18a`/`18b`/`18c` **existir como arquivo**, e criar story é do **@sm**. A `18a` sai `Ready` no dia em que nascer, com a colisão nova que a D2 lhe deu: `advanced-settings-tabs.tsx` e `product-settings.ts` agora são da `LTM-17` também, e a `LTM-17` vem antes. | @po (Pax) |
| 2026-11-19 | 1.2 | **Decisão D3 do founder aplicada: a `Porcentagem` entra no grupo C — *"replicar, é ferramenta do cliente"*.** Ela sai do terreno de dúvida e entra no escopo de construção, com o que ela é mantido escrito: um painel que exibe ao comprador porcentagem de vendas **diferente da real** e permite **travá-la** ([OBSERVADO], `README.md` §4 do inventário). Registrado que ela atravessa **três** lugares — a barra na loja (`showSalesProgressBar`, grupo B), a persistência do ajuste (grupo C) e o controle no menu ⋮ da `LTM-11` —, e que **construir só a barra não cumpre a D3**: a barra sozinha é honesta; a decisão é sobre a peça que faz o exibido divergir do real. Registrado também que ela **não é campo de `product-settings.ts`** e portanto **não entra na conta dos 36** nem na varredura do `AC1` — o grupo C passa a ser *11 campos + 1 ferramenta*, e os dois números andam separados. Sobre a `.claude/rules/claims-ledger.md`: a regra **continua valendo para material que nós produzimos**; esta é ferramenta de operação do cliente e a decisão de uso é dele. O que permanece nosso: o dado gravado continua sendo o real — o ajuste é camada de exibição, nunca reescrita de `product_numbers`/`orders`. Mesma leitura vale para o `alertEnabled`. **Edição de @pm aplicando decisão de founder; escopo é do @po.** | @pm (Morgan) |
| 2026-11-18 | — | **Priorização @po** (não é validação; a story segue `Draft`). O item solto *"varredura de campo de configuração sem leitor"*, aberto pela `LTM-17` com 3 ocorrências conhecidas, **fecha aqui**: a medição achou **36 de 43**, o que o move de "padrão a vigiar" para **P0 com dono**. Divisão em `18a`/`18b`/`18c` **aceita**, com a `18a` primeiro — um arquivo, `Depends-on: none`, e faz a tela parar de mentir sem ligar nada. Registrada como **condição de entrada** da `18b`/`18c` (não como risco a conviver) a consulta aos valores já gravados em `advanced_settings` dos sorteios reais do Império antes de qualquer campo do grupo A ganhar leitor. | @po (Pax) |
| 2026-11-18 | 1.1 | **Decisao do founder substitui a triagem: as 36, todas.** Eu recomendei ligar o grupo A, esconder o B e marcar o C como nao implementado; o founder decidiu implementar tudo, mais "tudo que tem na Sorteamos". A story muda de natureza — deixa de ser "fazer a tela parar de mentir" e passa a ser "construir o que a tela promete" —, os grupos B (8 telas) e C (11 features) viram stories proprias nascidas do inventario da `LTM-19`, o AC1 perde a saida de escape ("ou marcado como nao implementado") e ganha a exigencia de a varredura virar TESTE versionado, e o AC7 ("nenhum comportamento inventado") fica mais importante, nao menos: implementar tudo responde SE construir, nao O QUE. O risco [Alto] de ligar chave em sorteio existente foi **eliminado** — o founder declarou os sorteios atuais descartaveis — com prazo ate o primeiro sorteio real. | @aiox-master |
| 2026-11-18 | 1.0 | Nasce do pedido do founder depois do impasse da flag do relógio: *"verificar todas as ações configuráveis de edição do sorteio e corrigi-las visual e funcionalmente"*. A medição confirmou a suspeita e a superou: **36 dos 43 campos não têm leitor nenhum**, e a loja lê exatamente cinco linhas de configuração. O caso que o founder fotografou — "Campos requeridos para realizar a reserva", seis chaves — é inerte: `reserve.ts:176` exige telefone e nada mais. | @aiox-master |
