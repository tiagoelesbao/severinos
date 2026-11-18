# LTM-18: O editor de sorteio tem 43 controles e 5 funcionam

**Status:** Draft
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

### Grupo C — prometem uma feature inteira (11)

Aqui a chave não é o trabalho; é o rótulo de um trabalho. `upsellEnabled` não se "liga": upsell se
constrói.

```
upsellEnabled      promotionsEnabled    doublePromoEnabled    instantPrizesEnabled
capitalizerEnabled capitalizerCode      alertEnabled          freeCampaign
hasFee             allowAffiliates      drawMechanism
```

> Algumas têm tabela de apoio no banco (`capitalizers`, `affiliates`, `awarded_boxes`,
> `scratch_cards`, `reward_spins`) — o que significa que **parte** do caminho existe, não que a
> feature exista. Confirmar caso a caso é trabalho de análise, não suposição: nenhuma destas entra
> em escopo sem o @architect dizer o que já há.

### Grupo D — o `reservationModel` é um caso à parte

`reservationModel: "manual" | "random"` decide se o comprador escolhe o número ou se o sistema
sorteia. **Não é cosmético: muda o fluxo de compra inteiro**, e hoje a loja só faz manual. Fica
classificado separado para não ser confundido com uma chave de exibição do grupo A.

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

### Decidir, controle a controle

- [ ] Para cada um dos 36: **ligar**, **esconder** ou **marcar como não implementado**. A decisão
      é do founder/@po; a recomendação é minha (ver *Decisão pendente*).

### Executar

- [ ] Grupo A: a leitura de cada campo, no lugar onde ele deveria ter efeito.
- [ ] Grupos B e C: a decisão aplicada — nenhum deles fica como está.
- [ ] Ajuste visual conforme a medição.

## Critérios de Aceite

- [ ] **AC1 (nenhum controle inerte sobra na tela):** ao fim da story, todo controle visível no
      editor **ou** governa alguma coisa, **ou** está marcado na própria interface como ainda não
      implementado. Teste: a varredura que gerou esta story roda de novo e o conjunto "sem leitor E
      visível E sem marcação" fica **vazio**. É o AC que impede a situação de hoje de voltar.
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
- [ ] **AC7 (nenhuma decisão de produto tomada por dedução):** nenhum campo dos grupos B e C é
      implementado sem decisão escrita de quem decide. O que não for decidido fica **marcado**, não
      adivinhado.
- [ ] **AC8 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Decisão pendente — e é do founder, não minha

**Os 36 não cabem numa story, e dois deles não cabem em nenhuma sem virarem produto.** A pergunta a
responder antes de implementar:

| Grupo | Recomendação | Por quê |
|---|---|---|
| **A** (15) | **Ligar**, nesta story ou nas suas filhas | O caminho existe; é o que o sorteio de teste precisa, e é onde a tela mais mente |
| **B** (8) | **Esconder** do editor até a tela existir | Esconder é reversível e honesto. Marcar como "em breve" numa tela de operador é ruído permanente |
| **C** (11) | **Marcar como não implementado**, visível | Esconder aqui apagaria o mapa do que falta para a paridade. A chave fica, cinza, dizendo o que é |
| **D** (`reservationModel`) | **Decisão própria** | Muda o fluxo de compra; não é chave, é funcionalidade |

> **Não vou reduzir a lista por conta própria.** O pedido foi *"todas as ações realmente
> manipularem variáveis do sorteio"*, e a resposta honesta é que 11 delas exigem construir a feature
> antes. O que está acima é o recorte que entrega o máximo do pedido sem inventar comportamento.

## Escopo

**IN:** a medição visual; o inventário por aba; a decisão aplicada aos 36; a implementação do
grupo A; o ajuste visual.

**OUT:**

- **Construir as features do grupo C.** Upsell, promoções, títulos premiados, capitalizadora,
  alertas e afiliados são epics próprios. Esta story decide o que a **chave** faz enquanto eles não
  existem.
- **As telas do grupo B.** Barra de progresso, rankings e cartões de compra rápida são paridade de
  loja — parente da `LTM-15`, não desta.
- **O `reservationModel`.** Story própria.
- **As configurações fora do editor de sorteio** (configurações do site, integrações, gateways).
  Mesmo defeito, outra tela: `showQrCodeByDefault` é o exemplo conhecido. **Fica registrado como
  item solto** — a varredura de "campo de configuração sem leitor" que o @po já tem em mãos.

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
  | **18a** | A medição + o inventário + a marcação dos grupos B e C no editor | só `advanced-settings-tabs.tsx` e o doc | **pode ir já** |
  | **18b** | As chaves de **exibição** do grupo A | `[productSlug]/page.tsx`, `loja/[tenant]/page.tsx` | depende só de não colidir com `LTM-12`/`LTM-15` |
  | **18c** | Os campos que tocam **a reserva** (limites, DDD, anti-spam, `requiredFields`) | `reserve.ts`, `validations/reserve.ts` | **depois** de `LTM-02`, `LTM-03b`, `LTM-04` e `LTM-17` |

  A **18a** é a que entrega o maior valor mais cedo: ela não liga nada, mas **faz a tela parar de
  mentir** — que é o pedido original.

## Riscos

- **[Alto] Ligar uma chave e mudar o comportamento de sorteio que já está no ar.** Sorteio existente
  tem valores gravados que **nunca tiveram efeito**; passar a obedecê-los muda o comportamento de
  uma hora para outra, sem ninguém ter pedido. Exemplo concreto: um sorteio com `maxPerBuyer` = 1
  salvo por engano passa a recusar a segunda compra de todo mundo. **AC5 cobre o caso do
  `advanced_settings` vazio, mas não este.** Antes de ligar o grupo A, conferir que valores estão
  gravados nos sorteios reais do Império — é consulta, não suposição.
- **[Alto] Decidir por dedução no grupo C.** "Ligar" `instantPrizesEnabled` sem saber o que ele
  fazia na Sorteamos é inventar feature no caminho do prêmio. AC7 existe por isso.
- **[Médio] Ajustar o visual por impressão.** Já produziu regressão em produção nesta migração. AC6
  é a trava.
- **[Médio] A story virar depósito.** 43 controles numa story é o que o @po chamou de "menu grande
  vira depósito" na `LTM-11`. A divisão proposta existe para isso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.0 | Nasce do pedido do founder depois do impasse da flag do relógio: *"verificar todas as ações configuráveis de edição do sorteio e corrigi-las visual e funcionalmente"*. A medição confirmou a suspeita e a superou: **36 dos 43 campos não têm leitor nenhum**, e a loja lê exatamente cinco linhas de configuração. O caso que o founder fotografou — "Campos requeridos para realizar a reserva", seis chaves — é inerte: `reserve.ts:176` exige telefone e nada mais. | @aiox-master |
