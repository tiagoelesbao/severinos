# LTM-25: Remover o mascaramento do dado pessoal do aviso de pagamento

**Status:** Draft
> ✅ **DESTRAVADA em 2026-11-19 — o founder confirmou.** A decisão **D6** havia sido tomada **sem** a
> informação de que o mascaramento já existia, estava implementado e estava coberto por teste. Ele
> foi informado disso **depois** de responder, com todas as letras de que a decisão significa
> **remover proteção entregue** e não deixar de construí-la — e **manteve a decisão**:
> *"pode remover o mascaramento, confirmo a decisão do CPF"*.
> **A story está pronta para despacho.** O registro do desdobramento fica — ver *A decisão, e a
> ressalva que veio depois dela*.

**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · **desfaz** o `AC-G2` da `LTM-03a` · portão **G7**
**Prioridade:** **P2** — não bloqueia o sorteio de teste nem o corte. O sistema **funciona** com o mascaramento ligado
**Complexidade:** **S** no código, **XL** na consequência — são ~90 linhas a remover e um volume crescente de CPF em claro a assumir
**Criada por:** @pm (Morgan) · 2026-11-19, pela decisão **D6** do founder

## Story

**Como** dono do negócio que opera o Império
**Eu quero** que o aviso de pagamento seja guardado como a Sorteamos o guarda, sem mascaramento
**Para que** o lotemania não tenha menos informação disponível do que a plataforma que ele substitui.

## A decisão, e a ressalva que veio depois dela

### A decisão (D6, 2026-11-19)

> **Textual:** *"Igual à Sorteamos, sem mascarar nada."*

A pergunta feita foi sobre **retenção**: `payer_name` e `payer_document` (CPF) chegam no corpo do
aviso da Paysure, o corpo inteiro é gravado em `payment_webhook_events.payload`, e a pergunta era qual
a política. A resposta é paridade com a Sorteamos.

### ⚠️ A ressalva, comunicada ao founder **depois** da resposta — e **confirmada por ele**

**A pergunta foi feita como se a proteção não existisse. Ela existe.** `src/lib/payments/redact.ts`
foi entregue pela `LTM-03a`, está no caminho de produção, e o `AC-G2` que a exige está marcado `[x]`
na story (`LTM-03a.md:248`) com teste cobrindo.

**Então a D6, aplicada ao estado real do código, não é *"deixar de construir uma proteção"* — é
*remover uma proteção entregue*.** As duas coisas são diferentes em grau e em natureza:

| | Deixar de construir | **Remover o que está construído** |
|---|---|---|
| O que se perde | uma proteção que ninguém teve | uma proteção que já **está** protegendo |
| O que se desfaz | nada | um `AC` entregue, com teste, e uma decisão registrada na `LTM-03a` |
| Custo de reverter depois | escrever a proteção | **reescrever a proteção + lidar com o que foi gravado em claro no meio** |
| O que o registro diz | "não fizemos" | "fizemos, e depois desfizemos **de propósito**" |

### ✅ A confirmação (2026-11-19)

O founder foi informado desta diferença, com todas as letras, e de que podia reverter **sem custo
nenhum** — o código estava no ar e funcionando. **Ele manteve a decisão:**

> **Textual:** *"Pode remover o mascaramento, confirmo a decisão do CPF."*

**Isto é o que distingue uma decisão tomada de um descuido**, e é por isso que fica escrito aqui em
vez de resumido: a remoção foi escolhida **sabendo que era remoção**, por quem é dono do risco. Se
alguém reabrir o assunto depois — numa revisão de segurança, numa auditoria, num gate de QA —
**a resposta é este parágrafo**, não uma reconstrução de memória.

O que **não** muda com a confirmação: os três limites da seção abaixo (`mask.ts` fora de escopo
exceto pela **D9**, `adapter.test.ts:177` intocado, política de artefato versionado inalterada). A
D6 é sobre **retenção na trilha de auditoria**, e continua sendo só isso.

## O que exatamente é mascarado hoje — lido no código, 2026-11-19

**Não é "o CPF no corpo do aviso de gateway".** É mais que isso, em três frentes.

### 1. Vinte chaves, não uma

`redact.ts:46-70`, comparadas por chave **exata** depois de normalizar (minúsculas, sem `_` e sem `-`):

| Grupo | Chaves |
|---|---|
| identidade do **pagador**, como a Paysure a entrega | `payername` · `payerdocument` · `payeremail` · `payerphone` |
| identidade de quem **gera** a cobrança (`POST /v1/pix/qrcode`) | `generatorname` · `generatordocument` |
| formas genéricas que **outro provedor** pode usar | `document` · `documento` · `cpf` · `cnpj` · `taxid` · `name` · `nome` · `fullname` · `email` · `mail` · `phone` · `telefone` · `celular` · `holdername` |

**Isso cobre os quatro tipos da política de 2026-11-12 — nome, telefone, e-mail e CPF — não só o
CPF.** O `AC-G2` foi **estendido a `payer_name` pelo @po em 2026-11-17** exatamente por essa razão
(`LTM-03a.md:735`).

### 2. Em qualquer profundidade, e em estrutura aninhada

`redactPersonalData` desce recursivamente até **profundidade 12** (`MAX_DEPTH`), por listas e objetos.
O teste prova um caso que ninguém teria enumerado à mão: `splits[0].name` — o **nome do parceiro no
rateio** — também é mascarado (`tests/money-path/webhook-token.test.ts:168`).

### 3. O corpo ilegível, por forma e não por chave

`redactRawBody` trata o aviso que **não é JSON**: substitui qualquer sequência de **11 ou mais
dígitos** (a forma de um CPF sem pontuação) e **trunca em 2 000 caracteres**.

### 4. Em **todos** os caminhos, inclusive os recusados

As **duas** rotas de webhook mascaram antes de gravar:

| Rota | Linhas |
|---|---|
| `src/app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts` | `:147` (`redactRawBody`), `:153` (`redactPersonalData`) |
| `src/app/api/webhooks/payment/[tenant]/[provider]/route.ts` | `:66`, `:73` |

E o comentário do arquivo é explícito sobre o porquê: *"Chamada ANTES de qualquer `insert` … em todos
os caminhos, inclusive nos recusados. Aviso rejeitado por token errado também traz CPF, e rejeitar
não é razão para guardar."*

> **Esta é a parte mais fácil de subestimar.** Um aviso **recusado** — token errado, provedor
> desconhecido, corpo ilegível — também chega com CPF, e também é gravado na trilha. Remover o
> mascaramento **expõe também o dado de avisos que o sistema não aceitou**, inclusive de requisições
> que não são do provedor contratado.

## Onde o dado passa a ficar inteiro

| Destino | O que passa a conter |
|---|---|
| **`payment_webhook_events.payload`** (`jsonb`) | o corpo do aviso **como o provedor o enviou** — nome completo, CPF, e-mail e telefone do pagador, mais a identidade do gerador da cobrança e os nomes do rateio |
| `payment_webhook_events.payload` em avisos **recusados** | idem, de requisições que o sistema **não processou** |
| O comentário de `src/db/schema/payments.ts:254` | hoje diz *"⚠️ Mascarado na escrita. Ver `src/lib/payments/redact.ts` (portão G7)"* — **passa a afirmar o falso** e tem de ser reescrito |

**E só isso.** O escopo não se espalha, e os limites estão abaixo.

## ⚠️ O que esta story **não** faz — e cada "não" é deliberado

### Não toca `src/lib/mask.ts` — e a **D9** é outra story, não esta

`mask.ts` mascara **nome e telefone do comprador na tela do pedido e no cartão de ganhador**
(`maskName`, `maskPhoneKeepingNinth`, usados em `order-view.ts:219-220`).

**Mascaramento de interface não é retenção, e a paridade com a Sorteamos aponta para o lado
contrário.** A Sorteamos **mascara nos dois lugares**, medido em três observações independentes:

| Onde, na Sorteamos | Formato observado |
|---|---|
| cartão de ganhador | `Marcus ***` · `(96) ****-****` |
| tela de pedido / checkout | `Tiago ***` · `(11) 9****-****` |

**São duas máscaras distintas, e a Sorteamos usa as duas.** Ler *"sem mascarar nada"* como "apagar
`mask.ts`" seria **divergir** da referência em vez de convergir com ela, e numa página **pública**.

> ⚠️ **A `D9` de 2026-11-19 mexe em exatamente um desses dois lugares — e não é aqui que ela mora.**
> O founder decidiu **telefone inteiro na tela do próprio pedido**, mantendo o cartão de ganhador
> mascarado. Isso é **uma chamada** de `maskPhoneKeepingNinth` em `order-view.ts:220`, e **pertence à
> `LTM-14`**, que está em implementação agora.
>
> **Esta story continua não tocando `mask.ts` nem `order-view.ts`.** A função permanece, o cartão de
> ganhador permanece mascarado, e a mudança da tela do pedido é da `LTM-14`. ⛔ **Não há sobreposição
> de arquivo entre a `LTM-25` e a `D9`** — e isso é o que permite as duas andarem sem se atropelar.

### Não toca `tests/payments/paysure/adapter.test.ts:177`

Aquele teste afirma que `payer_name` e `payer_document` **não entram no evento traduzido**
(`ParsedEvent`). **Isso não é mascaramento — é o adaptador não carregar adiante um campo que nenhuma
decisão usa.** O fechamento casa por `external_reference`, confere o valor contra `orders.amount` e
credita por `paymentId`/`endToEndId`. Nome e CPF do pagador **não entram em nenhuma decisão**.

**Então esse teste continua válido mesmo com a D6 executada**, e removê-lo seria carregar dado pessoal
para dentro do domínio sem razão — o que a D6 não pediu. A D6 é sobre **retenção na trilha de
auditoria**, não sobre a superfície do evento traduzido.

### Não altera a política de 2026-11-12 nem o portão G7

A política proíbe **nome, telefone, e-mail e CPF em artefato versionado** — e nasceu de um incidente
real: ~320 MB de dado de cliente em CSV prestes a entrar no git pela primeira vez
(`docs/ESTADO-ATUAL.md` §1-A).

**Banco de produção não é artefato versionado.** A D6 decide o que o banco guarda; **ela não alcança o
repositório**, e essa metade do G7 continua integralmente em vigor:

- fixture de teste segue **sintética** — os marcadores atuais (`"marcador-sintetico-de-documento"`,
  `"documento-sintetico"`) continuam sintéticos;
- nenhum payload real entra em Dev Record, em log versionado ou em documento de pesquisa;
- a varredura antes de cada commit continua obrigatória.

## Quantas pessoas isso alcança

| | |
|---|---|
| Base de compradores que migra da Sorteamos | **183.381 usuários** · colunas **Nome · Telefone · Email · CPF** ([OBSERVADO], `painel-telas.md` §7) |
| Pedidos **pagos** na janela móvel de 7 dias | **10.550** · R$ 639.325 |
| Ritmo diário | ~**1.500 pedidos pagos/dia** · ~R$ 90 mil/dia · 5 rodadas simultâneas |

**Com precisão, porque a diferença importa:** `payment_webhook_events` **não** recebe os 183.381 de
uma vez — ele recebe **um registro por aviso de pagamento, a partir do corte**. Os 183.381 são o
tamanho da base que vai operar sobre o lotemania; ao ritmo de ~1.500 pedidos pagos por dia, **o
conjunto de CPFs em claro na trilha cresce para a ordem de dezenas de milhares em semanas** e tende a
cobrir a base ativa.

**E há um segundo conjunto, que não aparece nessa conta:** os avisos **recusados**. Eles não têm
relação com pedido nenhum, não são contabilizados em faturamento, e passariam a guardar CPF do mesmo
jeito.

## Tarefas (Checklist)

- [x] **Confirmação registrada do founder** — 2026-11-19, já ciente de que a proteção existia e
      estava entregue: *"pode remover o mascaramento, confirmo a decisão do CPF"*. **Era a
      pré-condição de tudo o que segue, e está satisfeita.**
- [ ] Remover `src/lib/payments/redact.ts` **ou** inverter o comportamento dele — ver `AC1` para a
      decisão entre as duas.
- [ ] Remover as chamadas das **duas** rotas de webhook: `[token]/route.ts:147,153` e
      `[provider]/route.ts:66,73`.
- [ ] Reescrever o comentário de `src/db/schema/payments.ts:254`, que hoje **afirma** que o campo é
      mascarado. Comentário que mente é pior que comentário ausente.
- [ ] **Desfazer o `AC-G2` da `LTM-03a` por escrito** — ele está marcado `[x]`. Um AC entregue **não
      some em silêncio**: ou é removido com registro, ou é **invertido** (o payload persistido
      **contém** o dado). Ver `AC2`.
- [ ] Remover ou inverter os testes que provam o mascaramento — a lista exata está no `AC2`.
- [ ] Reescrever o bloco de cabeçalho de `redact.ts` (se o arquivo sobreviver) ou o registro que o
      substituir: o arquivo tem **27 linhas de comentário** explicando por que a proteção existe,
      incluindo a decisão nº 2 do dono do negócio (*"o operador precisa ver o CPF para disputa
      MED/chargeback?"* → **"não"**). **Essa decisão acabou de ser revertida pela D6**, e o registro
      tem de dizer isso.
- [ ] Atualizar o portão **G7** do epic com a política vigente.

## Critérios de Aceite

- [ ] **AC1 (remover ou inverter — e a escolha é registrada):** o comportamento muda de *mascarar na
      escrita* para *gravar como recebido*. ⚠️ **Decidir e escrever qual das duas formas**, porque
      elas têm consequências diferentes:
  - **Remover o arquivo:** mais limpo, e **joga fora o `redactRawBody`** — a defesa grosseira contra
    corpo ilegível, que também **trunca em 2 000 caracteres**. Sem ela, corpo de terceiro de tamanho
    arbitrário entra no `jsonb` inteiro. **O truncamento não é proteção de dado pessoal; é proteção de
    banco**, e perdê-lo de carona não é o que a D6 decidiu.
  - **Inverter (manter o arquivo, lista vazia):** preserva `MAX_DEPTH`, preserva o truncamento, e
    deixa **um lugar só** para reverter se o founder mudar de ideia.
  - **Recomendação do @pm: inverter.** A D6 é sobre dado pessoal; o teto de profundidade e o
    truncamento são sobre robustez, e não estavam na pergunta.
- [ ] **AC2 (o `AC-G2` da `LTM-03a` não desaparece em silêncio):** o `AC-G2` está **marcado como
      revertido** na `LTM-03a`, com a data, a decisão **D6** citada e o motivo — e os testes abaixo
      estão removidos **ou invertidos**, nenhum deles simplesmente apagado sem registro:

  | Arquivo | O que prova hoje | Destino |
  |---|---|---|
  | `tests/money-path/webhook.test.ts:709-751` | `AC-G2`: `payer_name`, `payer_document` e `payer_email` chegam `[mascarado]` no payload persistido | **inverter** — passam a chegar íntegros |
  | `tests/money-path/webhook.test.ts:753+` | `AC-G2`: aviso **rejeitado** também tem o dado mascarado | **inverter** — e é o caso que mais merece ser visto de propósito |
  | `tests/money-path/webhook-token.test.ts:121,155-193` | unidade de `redactPersonalData` e `redactRawBody`, incluindo `splits[].name` | **remover** com os identificadores, ou inverter se o arquivo sobreviver |
  | `tests/payments/paysure/webhook.test.ts:163-172` | *"dado pessoal do pagador é mascarado na trilha (portão G7)"* | **inverter** |
  | `tests/payments/paysure/adapter.test.ts:177-182` | `payer_name`/`payer_document` **não entram no evento traduzido** | ⛔ **NÃO TOCAR** — não é mascaramento, é o adaptador não carregar campo inútil. Ver *O que esta story não faz* |

  > **Por que inverter é melhor que remover, aqui:** um teste que afirma *"o CPF **está** no payload
      persistido"* documenta a decisão onde ela acontece, e **quebra** no dia em que alguém reintroduzir
      mascaramento por engano. Um teste apagado não documenta nada.
- [ ] **AC3 (`mask.ts` intocado por *esta* story):** a função `maskPhoneKeepingNinth` e o
      mascaramento do **cartão de ganhador** (`(DD) ****-****`) continuam existindo e funcionando.
      Nenhum teste de `mask.ts` é tocado aqui.
  - ⚠️ **A `D9` muda a tela do próprio pedido, e é da `LTM-14`.** Se, ao rodar a suíte, um teste de
    telefone na tela do pedido estiver diferente do que esta story esperava, **a causa é a `D9` e não
    é regressão** — conferir contra a `LTM-14` antes de "consertar". O cartão de ganhador é a parte
    que **nunca** muda: página pública, dado de terceiro.
- [ ] **AC4 (o repositório continua limpo):** nenhum CPF, telefone, e-mail ou nome real entra em
      artefato versionado. Fixtures seguem sintéticas; nenhum payload real em Dev Record. A política
      de 2026-11-12 e **essa metade** do portão G7 são **inalteradas** pela D6.
- [ ] **AC5 (o comentário do schema não mente):** `src/db/schema/payments.ts:254` descreve o
      comportamento **vigente**. Hoje ele afirma *"Mascarado na escrita"* — depois desta story isso
      seria falso, e é o tipo de afirmação que sobrevive anos sem ser relida.
- [ ] **AC6 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Escopo

**IN:** a remoção/inversão de `redact.ts` e das suas chamadas; a reversão registrada do `AC-G2`; os
testes; os comentários que afirmam o comportamento antigo; a atualização do portão G7.

**OUT:**

- **`src/lib/mask.ts`** e qualquer mascaramento de **interface** — incluindo a **`D9`** (telefone
  inteiro na tela do próprio pedido). Isso é **uma chamada em `order-view.ts:220` e é da `LTM-14`**,
  que está em implementação. O cartão de ganhador segue mascarado por decisão do founder.
- **`tests/payments/paysure/adapter.test.ts:177`** — superfície do evento traduzido, não retenção.
- **A política de dado pessoal em artefato versionado** (2026-11-12). Não está em questão.
- **Cifrar o dado em vez de mascarar.** Era a alternativa que `redact.ts:21-26` registrou como
  *"requisito novo, não refazimento"*, para o caso de a resposta à disputa MED virar "sim". **A D6
  não escolheu isso** — escolheu guardar em claro. Se o founder quiser o caminho do meio na
  confirmação, **esta story muda de forma** e vira "guardar cifrado com acesso registrado".
- **Retenção com prazo** (guardar e apagar depois de N dias). Não foi decidido, e inventar prazo é
  inventar política.

## Dependências

- **Depende da `LTM-03a`** — é ela que entregou o que esta story desfaz. Ela está em `InReview`:
  ⚠️ **esta story não pode ser executada enquanto o @qa estiver avaliando a `LTM-03a` com o `AC-G2`
  marcado `[x]`.** Desfazer um AC debaixo da revisão dele é tirar o chão do gate.
- ~~**Bloqueada por decisão do founder** — a confirmação.~~ **Destravada em 2026-11-19**: o founder
  confirmou depois de ser informado de que a decisão significa remover proteção entregue.
- ⚠️ **Acoplada à `LTM-24`** — as duas mexem em `src/lib/payments/` e nas rotas de webhook.
  **Serializar.** O `AC9` da `LTM-24` aponta para cá.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/payments/redact.ts                                          (remover ou inverter)
  apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts   (:147, :153)
  apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/route.ts           (:66, :73)
  apps/lotemania/src/db/schema/payments.ts                                           (SO o comentario :254)
  apps/lotemania/tests/money-path/webhook.test.ts                                    (inverter AC-G2)
  apps/lotemania/tests/money-path/webhook-token.test.ts                              (remover/inverter)
  apps/lotemania/tests/payments/paysure/webhook.test.ts                              (inverter)
  docs/stories/.../LTM-03a.md                                                        (reverter o AC-G2 por escrito)

NAO TOCAR:
  apps/lotemania/src/lib/mask.ts                                                     (paridade com a Sorteamos)
  apps/lotemania/tests/payments/paysure/adapter.test.ts                              (evento traduzido, nao retencao)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — o campo `payload` jsonb nao muda de forma; muda o que entra nele

Depends-on: LTM-03a (entregue). Confirmacao do founder: OBTIDA em 2026-11-19.
```

- ⛔ **Não compartilha onda com a `LTM-24`** — `src/lib/payments/` e as rotas de webhook.
- ⛔ **Não compartilha onda com a `LTM-23`** se ela tocar as rotas de webhook — conferir no despacho.
- ✅ Não toca `reserve.ts`, nem a loja, nem o editor.

## Riscos

- ~~**[Alto] Executar sem a confirmação.**~~ **RESOLVIDO em 2026-11-19**: a confirmação veio, já com
  a informação de que a decisão é remoção de proteção entregue. O que **permanece** é o custo
  assimétrico de reverter: o que for gravado em claro depois da execução **já estará gravado**, e aí
  a volta exige decidir o que fazer com o que está no banco. **Vale executar antes do primeiro aviso
  real**, enquanto o conjunto é vazio — é a mesma janela de liberdade que o `ADR-0001` usou.
- **[Médio] A `D9` ser confundida com esta story.** As duas chegaram no mesmo dia, as duas são "parar
  de mascarar", e **são mecanismos diferentes em arquivos diferentes**: a D6 é retenção em
  `payment_webhook_events.payload` (`redact.ts`); a D9 é exibição na tela do pedido (`mask.ts`, via
  `order-view.ts:220`, **na `LTM-14`**). Fundir as duas remove o mascaramento do **cartão de
  ganhador**, que é página pública com dado de terceiro, e que **nenhuma das duas decisões autorizou**.
- **[Alto] Perder o `redactRawBody` de carona.** Ele trunca corpo ilegível em 2 000 caracteres —
  **proteção de banco, não de privacidade**, e não estava na pergunta. `AC1` obriga a escolha
  explícita entre remover o arquivo e inverter a lista.
- **[Médio] A leitura de "sem mascarar nada" se espalhar para a interface.** `mask.ts` mascara o nome
  e o telefone do comprador na tela — **e a Sorteamos faz o mesmo**. Remover seria divergir no nome de
  convergir. `AC3` é a trava, e é o risco mais provável desta story.
- **[Médio] O `AC-G2` desaparecer em silêncio.** Um AC marcado `[x]` que deixa de valer sem registro
  apaga o motivo pelo qual ele foi exigido — e o motivo (a política de 2026-11-12, estendida a
  `payer_name` pelo @po) é informação que vale mais que o checkbox. `AC2`.
- **[Médio] Avisos recusados guardarem CPF sem que ninguém tenha pensado nisso.** Token errado,
  provedor desconhecido, corpo ilegível: nenhum deles vira pedido, todos viram registro. Era
  explicitamente coberto pelo desenho atual (*"rejeitar não é razão para guardar"*), e deixa de ser.
  **Está nomeado para ser escolha, não efeito colateral.**
- **[Baixo] O comentário do schema sobreviver desatualizado** afirmando que o campo é mascarado.
  `AC5`.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### A confirmação do founder (pré-condição) — **OBTIDA**
**2026-11-19:** *"Pode remover o mascaramento, confirmo a decisão do CPF."* Dada **depois** de ele ser
informado de que `redact.ts` já existia, estava no caminho de produção e tinha o `AC-G2` da `LTM-03a`
marcado `[x]` com teste em quatro arquivos — isto é, sabendo que a decisão é **remover proteção
entregue**, não deixar de construí-la.

### A escolha do AC1: remover ou inverter
_(registrar qual, e por quê)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce da decisão **D6** do founder: *"igual à Sorteamos, sem mascarar nada"*. **A story é de remoção, não de abstenção**, e isso é a primeira coisa que ela diz: `src/lib/payments/redact.ts` **já existe**, entregue pela `LTM-03a` com o `AC-G2` marcado `[x]` e coberto por teste em quatro arquivos. Lido o arquivo, o mascaramento vai além do CPF: são **20 chaves** por comparação exata normalizada (pagador, gerador da cobrança e formas genéricas — cobrindo **nome, telefone, e-mail e CPF**, os quatro tipos da política de 2026-11-12), em **qualquer profundidade até 12**, incluindo `splits[].name`; mais `redactRawBody`, que substitui sequências de 11+ dígitos e **trunca em 2 000 caracteres**; e tudo isso **em todos os caminhos, inclusive nos avisos recusados**. O dado passa a ficar inteiro em **`payment_webhook_events.payload`**, nas duas rotas de webhook. Alcance: base de **183.381 usuários** migra, ~1.500 pedidos pagos/dia — e um segundo conjunto que não entra nessa conta, os avisos **recusados**. Três limites deliberados, cada um com a razão: **`mask.ts` não é tocado** (a Sorteamos mascara na tela do pedido e no cartão de ganhador, em dois formatos distintos, observados três vezes — remover seria **divergir** dela); **`adapter.test.ts:177` não é tocado** (é o adaptador não carregar campo que nenhuma decisão usa, não retenção); e a **política de artefato versionado é inalterada** (banco de produção não é artefato versionado). ⛔ **Registrado em destaque que o founder foi informado, depois de responder, de que a proteção já existia e de que a D6 significa desfazê-la.** A story nasceu **travada** aguardando esse retorno. | @pm (Morgan) |
| 2026-11-19 | 1.1 | **DESTRAVADA — o founder confirmou:** *"pode remover o mascaramento, confirmo a decisão do CPF"*, já ciente de que a decisão significa **remover proteção entregue e testada**. A pré-condição da checklist está marcada e a story está pronta para despacho. O registro do desdobramento **fica no corpo** — é o que distingue decisão tomada de descuido e é a resposta pronta para quem reabrir o assunto num gate de QA ou numa revisão de segurança. Acrescentada a delimitação contra a **`D9`**, que chegou no mesmo dia e é *"parar de mascarar"* também: a D6 é **retenção** em `payment_webhook_events.payload` (`redact.ts`); a D9 é **exibição** na tela do próprio pedido (`mask.ts` via `order-view.ts:220`), pertence à **`LTM-14`** e **não tem sobreposição de arquivo com esta story**. Risco novo [Médio]: fundir as duas removeria o mascaramento do **cartão de ganhador**, que é página pública com dado de terceiro e que **nenhuma das duas decisões autorizou**. | @pm (Morgan) |
