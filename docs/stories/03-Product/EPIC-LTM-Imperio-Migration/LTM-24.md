# LTM-24: A segunda rota de pagamento — e a primeira tarefa é descobrir de quem ela é

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · **irmã da `LTM-03b`**, sobre o arcabouço da `LTM-03a`
**Prioridade:** **P0** — é o portão **G5**. O Império **não roda tudo na Paysure**, e isso foi medido ao vivo
**Complexidade:** **L** — e a primeira parte dela é **pesquisa**, não código
**Criada por:** @pm (Morgan) · 2026-11-19, pela decisão **D1** do founder
**Evidência de partida:** `docs/research/2026-11-18-inventario-sorteamos/fluxo-de-compra.md` (o BR Code ao vivo) · `README.md` §Aba Pagamento (os dois bancos cadastrados) · `docs/research/2026-11-16-paysure-contrato.md` (o modelo de como esta story se escreve)

## Story

**Como** operador do Império que escolhe o gateway **por sorteio**
**Eu quero** que a segunda rota de pagamento funcione no lotemania como funciona na Sorteamos
**Para que** o corte não dependa de mover toda a operação para um único provedor que ela hoje não usa.

## A decisão do founder — 2026-11-19

> **A decisão, textual (D1):** *"Construir o segundo adaptador."*

A pergunta era se as duas rotas precisam continuar existindo. **Precisam.** A `LTM-03b` entregou a
Paysure; esta story entrega a segunda.

## ⚠️ O que **não se sabe** — e é a primeira tarefa, não uma nota de rodapé

**Ninguém sabe ainda de qual provedor é esta rota.** As duas evidências não batem:

| Evidência | O que diz | Onde |
|---|---|---|
| O **BR Code** de uma rodada ao vivo, lido em 2026-11-19 08h33 | aponta para **`pix.banprime.com.br/v1/pub/...`** | `fluxo-de-compra.md` §💳 |
| O **painel** do Império, aba Pagamento, lido do `value` do `<option>` | dois bancos cadastrados: **`Banco paysure`** (`6aab4ba845d3571887117dc6`) e **`PAY2M`** (`6ab3e31645d3571887192c0d`) | `README.md` §Aba Pagamento |

**Três hipóteses, e nenhuma está confirmada:**

1. **A PAY2M usa a Banprime por baixo** — a PAY2M é a camada comercial/adquirente e a Banprime é o
   PSP que emite o BR Code. É a hipótese mais provável, mas *provável* não é *lido*.
2. **São coisas diferentes** — e existe um terceiro arranjo no meio que o painel não mostra.
3. **A campanha observada usa um gateway que não é nenhum dos dois** do painel, por alguma
   configuração que não foi lida.

> ⛔ **Nada de desenhar adaptador antes de responder isso.** Não é cautela de processo: **esta base já
> pagou por esse erro exatamente uma vez.** O `AC11` da `LTM-03` especificou verificação por
> `x-webhook-signature` — um cabeçalho **inventado** — e a documentação oficial da Paysure depois
> mostrou que **não existe assinatura nenhuma**. O adaptador inventado teria **rejeitado 100% dos
> avisos** do provedor de produção do cliente. O que desfez aquilo foi ler o contrato
> (`2026-11-16-paysure-contrato.md`), e foi ele que derrubou **quatro** premissas do código de uma só
> vez.
>
> **A lição, aplicada aqui:** o entregável do `AC1` é *saber de quem é o contrato*. O entregável do
> `AC2` é *ter o contrato em mãos*. O adaptador é o `AC3` em diante.

## A descoberta que esta story fez ao nascer — e ela é pior do que faltar adaptador

**`pay2m` já está nas duas listas de provedores, e já tem adaptador atribuído.** Conferido no código
em 2026-11-19:

| Onde | O que tem |
|---|---|
| `src/db/schema/payments.ts:132` | `"pay2m"` no `paymentGatewayProviderEnum` |
| `src/lib/validations/payment-gateway.ts:38` | `"pay2m"` em `PAYMENT_GATEWAY_PROVIDERS` |
| `src/lib/validations/payment-gateway.ts:144` | `pay2m: LEGACY_HMAC_SPEC` |
| `src/lib/payments/providers/index.ts` | `UNSUPPORTED` está **vazia** ⇒ `pay2m` recebe `createHmacGenericAdapter("pay2m")` |

**O que isso significa, concretamente.** A `paysure` antes da `LTM-03b` estava em `UNSUPPORTED`: todo
aviso dela era recusado **em voz alta**, com estado `unsupported_provider` nomeando o provedor, pedido
intocado e item na lista do operador. Era honesto — o sistema dizia *"eu não sei falar com este"*.

**A `pay2m` não está nesse estado. Ela está no estado de "eu acho que sei falar com este":**

- pede ao operador **uma** credencial chamada `apiKey` — e a Paysure provou que "uma credencial por
  gateway" era premissa errada (ela usa **dois** cabeçalhos, `ci` e `cs`);
- declara **`signsWebhooks: true`**, então pede *"Segredo do Webhook"* ao operador e **verifica HMAC**;
- se a PAY2M não assinar — como a Paysure não assina — **todo aviso é rejeitado**, e rejeitado pelo
  motivo errado: não como "provedor sem adaptador", mas como "assinatura inválida".

O próprio arquivo já avisa disso, e o aviso está em `payment-gateway.ts:85-91`:

> *"⚠️ Isto descreve o que o CÓDIGO ATUAL assume, não um contrato lido de cada um dos 17. … Quando um
> for de fato contratado, a entrada dele aqui passa a ser escrita contra a documentação dele — como a
> da paysure foi."*

**A PAY2M acabou de deixar de ser hipotética.** Ela é um dos dois bancos cadastrados na conta de
produção do Império. A ressalva do arquivo passou de nota de cuidado a **condição acionada**.

### E `banprime` não está em lista nenhuma

Se a rota for da Banprime e não da PAY2M, o provedor é **irrepresentável** hoje: faltaria nas duas
listas, exatamente como a `paysure` faltava antes da `LTM-03a` — e com os mesmos três efeitos medidos
então (404 na rota de webhook, recusa ao salvar a credencial, ausência na tela).

## O segundo achado: o caminho da cobrança está cravado na Paysure

Mesmo com o adaptador escrito, **a cobrança não sairia pelo provedor do sorteio.** Conferido:

| Onde | O que faz |
|---|---|
| `src/lib/actions/pix-charge.ts:275` | busca o gateway do tenant filtrando por `eq(paymentGateways.provider, PAYSURE_PROVIDER)` |
| `:284-299` | as três mensagens de erro ao operador citam a Paysure **pelo nome** |
| `:329` | monta a URL de postback com `PAYSURE_PROVIDER` no caminho |
| `:369` · `:385` | grava `provider: PAYSURE_PROVIDER` no lançamento e **`orders.paymentGatewayProvider = PAYSURE_PROVIDER`** |

E do outro lado, **`advancedSettings.paymentGatewayProvider` — a escolha do operador por sorteio —
não é lida por ninguém**: `advanced-settings-tabs.tsx:654-655` escreve, `product-settings.ts:101` é
`z.string().nullable()` **sem validação**, e nenhum consumidor existe. É o campo nº 2 da tabela de
*"três campos configuráveis que não governam nada"* da `LTM-17`.

> **Então esta story tem duas metades, e a segunda é a que faz a primeira valer:**
>
> 1. **o adaptador** do segundo provedor (verificação + tradução do aviso + criação da cobrança);
> 2. **a escolha por sorteio passar a governar** qual adaptador atende — na criação da cobrança, na
>    URL de postback e no `orders.paymentGatewayProvider`.
>
> Sem a segunda metade, o adaptador existe e nunca é chamado. **E na Sorteamos o provedor é
> obrigatório na criação do sorteio** (`README.md` §1), o que faz desta metade paridade, não extra.

## O que a `LTM-03a` já entregou e esta story **reusa sem tocar**

Esta é a economia da story: o arcabouço existe e foi provado por um provedor real.

| Peça | Onde | O que ela já resolve |
|---|---|---|
| A interface do adaptador | `src/lib/payments/providers/types.ts` | `VerifyRequest`/`VerifyResult`/`ParsedEvent` — a verificação mora **no adaptador**, porque o esquema de autenticidade é do provedor |
| O registro e o fail-loud | `src/lib/payments/providers/index.ts` | provedor sem adaptador é recusado **em voz alta** (`unsupported_provider`), com HTTP 200 e corpo que diz que não processou |
| Autenticidade da plataforma | `src/lib/payments/webhook-token.ts` · rota `[tenant]/[provider]/[token]` | token opaco por tenant, em segmento de caminho — **independe de o provedor assinar** |
| O fechamento | `src/lib/payments/settle-order.ts` | transacional, idempotente, casado por `external_reference` = `orders.id` |
| Idempotência | `ParsedEvent.externalEventId` | composta `{fluxo}:{reference_code}:{status}` — e a razão está escrita: `paid` e `refunded` da mesma transação chegam com o mesmo `reference_code` |
| Dado pessoal | `src/lib/payments/redact.ts` | mascarado **antes de qualquer escrita, em todos os caminhos** ⚠️ **sujeito à `LTM-25`** — ver *Dependências* |
| Credencial multi-campo | `CredentialField[]` em `payment-gateway.ts` | "uma credencial por gateway" já foi corrigido; o segundo provedor declara os campos **dele** |

**Nada disso se reescreve.** A `LTM-03b` é o molde: ela acrescentou um arquivo de adaptador, uma
entrada no registro, uma `ProviderGatewaySpec` e uma tabela de apoio (`pix_charges`).

## Tarefas (Checklist)

### Primeiro: descobrir de quem é a rota

- [ ] **Identificar o provedor.** Observar no painel do Império **qual dos dois bancos** está
      selecionado na campanha cuja cobrança aponta para `pix.banprime.com.br` — é leitura da aba
      Pagamento daquele sorteio, **ação não mutante**, dentro da autorização já dada.
- [ ] Registrar a resposta em `docs/research/` com a mesma disciplina do inventário:
      **[OBSERVADO]** × **[SUPOSTO]**, separados.
- [ ] Se a resposta for *"PAY2M, e a Banprime é o PSP dela"*: o provedor do adaptador é **`pay2m`**,
      e a Banprime aparece só no BR Code.
- [ ] Se a resposta for *"são coisas diferentes"*: decidir **qual das duas** precisa de adaptador, e
      registrar que `banprime` falta nas duas listas.

### Depois: o contrato, antes de uma linha de adaptador

- [ ] Obter a **documentação oficial** do provedor identificado — criação de cobrança PIX, formato do
      aviso, esquema de autenticidade, política de reentrega, faixa de expiração.
      ⛔ **Sem este item, a story para aqui.** Ver o `AC2`.
- [ ] Documentar em `docs/research/` no formato de `2026-11-16-paysure-contrato.md`, que é o padrão
      desta casa e o que desfez quatro premissas falsas de uma vez.
- [ ] **Decidir o estado interino do `pay2m`** enquanto o contrato não existir — ver o `AC2`.

### Então: o adaptador

- [ ] `src/lib/payments/providers/{provedor}.ts` — verificação e tradução, contra a documentação.
- [ ] A `ProviderGatewaySpec` do provedor: os campos de credencial **dele** e `signsWebhooks` **lido
      da documentação**, nunca presumido.
- [ ] Entrada em `DEDICATED_ADAPTERS` (`providers/index.ts`), saindo do HMAC genérico.
- [ ] A criação da cobrança PIX do provedor, e a tabela de apoio se ela for necessária.
- [ ] `banprime` nas **duas** listas, se e somente se o `AC1` disser que é ele.

### E a metade que faz o adaptador valer

- [ ] `pix-charge.ts` passa a **resolver o provedor a partir do sorteio**, não da constante: a busca
      do gateway, as mensagens ao operador, a URL de postback e o `orders.paymentGatewayProvider`.
- [ ] `advancedSettings.paymentGatewayProvider` deixa de ser `z.string().nullable()` e passa a ser
      **enum validado** contra `PAYMENT_GATEWAY_PROVIDERS`, com leitor de verdade.
- [ ] Decidir e registrar se o provedor é **obrigatório na criação do sorteio**, como é na Sorteamos.

## Critérios de Aceite

- [ ] **AC1 (o provedor é identificado por observação, não por dedução):** existe documento de
      pesquisa que responde *"de quem é a rota que emitiu o BR Code `pix.banprime.com.br`?"* com a
      evidência citada e a marca **[OBSERVADO]**. Uma resposta marcada **[SUPOSTO]** **não** satisfaz
      este AC — é o `AC3` da `LTM-19` aplicado aqui.
- [ ] **AC2 (nenhuma linha de adaptador sem documentação do provedor):** o arquivo de adaptador cita,
      campo por campo, a seção da documentação de onde cada decisão saiu — do mesmo modo que
      `providers/paysure.ts` cita `2026-11-16-paysure-contrato.md`.
  - ⛔ **E se a documentação não vier?** Então o provedor **volta para `UNSUPPORTED`** em
    `providers/index.ts`, e passa a ser recusado em voz alta como `unsupported_provider`. **Isso é
    melhoria em relação a hoje, não regressão**: hoje ele usa o HMAC genérico e seria recusado por
    "assinatura inválida" — um motivo falso. `unsupported_provider` é verdadeiro.
- [ ] **AC3 (o `pay2m` para de fingir que tem contrato):** ao fim desta story, **nenhum** provedor
      cadastrado na conta de produção do Império usa `LEGACY_HMAC_SPEC`. Ou ele tem spec própria
      escrita contra documentação, ou está em `UNSUPPORTED`. Teste: a lista dos provedores que o
      Império tem cadastrados **não intersecta** o conjunto dos que caem no adaptador genérico.
- [ ] **AC4 (a escolha do operador governa a cobrança):** sorteio configurado com o provedor A gera
      cobrança pelo adaptador de A; sorteio com o provedor B, pelo de B. **Dois sorteios, dois
      provedores, no mesmo teste** — é o que prova que o provedor vem do sorteio e não de uma
      constante. Hoje `pix-charge.ts:385` grava `PAYSURE_PROVIDER` sempre.
- [ ] **AC5 (a URL de postback é do provedor certo):** o `postbackUrl` enviado na criação da cobrança
      carrega **o provedor do sorteio** no caminho, e o token de webhook **daquele** gateway. Um aviso
      do provedor B chegando na URL do provedor A é recusado.
- [ ] **AC6 (sorteio sem provedor configurado não cobra em silêncio):** sorteio com
      `paymentGatewayProvider = null` **recusa a criação da cobrança com mensagem nomeando a
      configuração que falta** — nunca cai no default da Paysure. É o comportamento da Sorteamos, onde
      o provedor é obrigatório na criação.
- [ ] **AC7 (idempotência vale para o provedor novo):** aviso reentregue 5× pelo segundo provedor
      produz **1** pedido pago e **1** lançamento bancário. É o KPI do epic, re-provado por rota.
- [ ] **AC8 (a mesma transação, `paid` depois `refunded`, não é duplicata):** os dois avisos com o
      mesmo código de referência e status diferentes produzem **dois** eventos distintos. É a razão
      pela qual `externalEventId` é composto, e ela tem de valer para o adaptador novo também.
- [ ] **AC9 (dado pessoal no aviso do provedor novo tem o mesmo tratamento do da Paysure):** o que
      valer na data da implementação. ⚠️ **Hoje isso significa mascarado na escrita** (`redact.ts`);
      **se a `LTM-25` for confirmada e executada, significa em claro.** Este AC segue a decisão
      vigente, e **não** pode ser fechado citando a decisão que não foi confirmada.
- [ ] **AC10 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Escopo

**IN:** a identificação do provedor; a documentação do contrato dele; o adaptador; a spec de
credencial; a criação de cobrança; a resolução do provedor **a partir do sorteio** no caminho da
cobrança; a validação do campo `paymentGatewayProvider`.

**OUT:**

- **Os outros 16 provedores herdados em `LEGACY_HMAC_SPEC`.** Nenhum está contratado (nota de escopo
  do founder, 11-16). O `AC3` só alcança os que o Império **tem cadastrados** — hoje dois.
- **Derivar `PAYMENT_GATEWAY_PROVIDERS` do `pgEnum`** e acabar com a duplicidade das duas listas. É
  decisão de @architect, declarada fora de escopo pela `LTM-03a`, e continua fora.
- **Reescrever o arcabouço da `LTM-03a`.** Se o provedor novo não couber na interface, **isso é
  achado e vira registro**, não refatoração dentro desta story.
- **Alterar o adaptador da Paysure.** A `LTM-03b` está em `InReview`; esta story não a toca.
- **Migrar cobranças existentes.** Não há cobrança real no lotemania.

## Dependências

- **Depende da `LTM-03a` (entregue, `InReview`)** — é dela o arcabouço inteiro.
- **Depende da `LTM-03b` (entregue, `InReview`)** — é dela o molde de como um adaptador real se
  escreve, e é dela `reservationMinutesFor` no caminho da cobrança.
- **Depende de evidência externa:** a documentação do provedor, que **não está neste repositório**. É
  o mesmo tipo de bloqueio do `ci`/`cs` do cliente — e por isso o `AC2` tem a saída de
  `UNSUPPORTED` escrita, para a story não ficar represada sem entregar nada.
- ⚠️ **Acoplada à `LTM-25`** pelo `AC9`: as duas mexem em `src/lib/payments/`. A `LTM-25` está
  travada por decisão pendente; **se as duas andarem, serializar**.
- **Não depende da `LTM-17`** e não colide com ela: a `LTM-17` deixou de editar `actions/reserve.ts` e
  `paysure-client.ts`.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/payments/providers/{provedor}.ts      (novo)
  apps/lotemania/src/lib/payments/providers/index.ts           (entrada no registro)
  apps/lotemania/src/lib/validations/payment-gateway.ts        (spec propria; e banprime, se for ele)
  apps/lotemania/src/db/schema/payments.ts                     (pgEnum, SO se banprime entrar)
  apps/lotemania/src/lib/actions/pix-charge.ts                 (resolver o provedor pelo sorteio)
  apps/lotemania/src/lib/validations/product-settings.ts       (paymentGatewayProvider vira enum)
  apps/lotemania/drizzle/**                                    (migracao, SO se o pgEnum mudar)
  apps/lotemania/tests/payments/{provedor}/**                  (novo)
  docs/research/2026-11-19-contrato-{provedor}.md              (novo)

Resources:
  banco de teste       — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  drizzle/meta/_journal.json — DISPUTADO. Serializar `db:generate` (epic §8)
  cota de branch Neon  — finita. Uma onda rodando a suite por vez
  painel da Sorteamos  — RECURSO EXTERNO: producao do cliente. Uma sessao de observacao por vez

Depends-on: LTM-03a, LTM-03b
```

- ⛔ **Não compartilha onda com a `LTM-25`** — `src/lib/payments/` é o conjunto das duas.
- ⛔ **Não compartilha onda com a `LTM-17` nem com a `LTM-18`** se tocar
  `validations/product-settings.ts`, que as três reivindicam.
- ✅ **Não toca `actions/reserve.ts`** — fica fora da fila mais longa do epic.
- ⚠️ A tarefa de observação no painel do cliente é **recurso externo compartilhado** com a `LTM-19`.
  **Uma sessão de cada vez.**

## Riscos

- **[Alto] Escrever o adaptador contra o provedor errado.** As duas evidências apontam para nomes
  diferentes e ninguém confirmou a relação entre eles. `AC1` é a trava, e ela é a razão de esta story
  começar por pesquisa.
- **[Alto] O `pay2m` continuar no HMAC genérico e parecer pronto.** Ele está nas duas listas, tem
  adaptador atribuído e **não dá erro de compilação nem de teste** — então ninguém descobre o
  problema até o primeiro aviso real do provedor de produção do cliente ser rejeitado por
  "assinatura inválida". **É a repetição exata do `x-webhook-signature`**, com a diferença de que
  este já está mergeado. `AC3` é a trava.
- **[Alto] O adaptador existir e nunca ser chamado.** `pix-charge.ts` está cravado em
  `PAYSURE_PROVIDER` em seis lugares. Sem a segunda metade da story, o entregável é código morto.
  `AC4` e `AC5` são as travas.
- **[Médio] Sorteio sem provedor cair no default da Paysure.** Hoje o caminho da cobrança não consulta
  o sorteio, então **todo** sorteio é Paysure por omissão. Quando a resolução passar a existir, o
  caso `null` tem de recusar, não escolher. `AC6`.
- **[Médio] A documentação do provedor não vir.** Mitigação escrita no `AC2`: `UNSUPPORTED` e recusa
  em voz alta. A story entrega **honestidade** mesmo sem entregar o adaptador — e isso é melhor que
  hoje.
- **[Médio] A credencial do segundo provedor não caber em `CredentialField[]`.** A Paysure precisou de
  dois cabeçalhos; outro provedor pode precisar de certificado, de mTLS ou de OAuth com renovação. Se
  não couber, **é achado registrado**, não refatoração do arcabouço dentro desta story.
- **[Baixo] A faixa de expiração do provedor novo ser mais estreita que a da Paysure.** A `LTM-17`
  adotou oito janelas, de 180 s a **86 400 s exatos**. Se o provedor novo aceitar menos, há sorteio
  configurável que ele não consegue cobrar. **Conferir na documentação** e registrar.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### O provedor identificado (AC1)
_(colar a evidência, com a marca [OBSERVADO] e a data da observação)_

### O contrato lido (AC2)
_(citar o documento de pesquisa e, campo por campo, a seção de origem)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce da decisão **D1** do founder: *"construir o segundo adaptador"*. A story é irmã da `LTM-03b` e reusa o arcabouço da `LTM-03a` sem tocá-lo. **Registrado em primeiro plano o que não se sabe:** o BR Code ao vivo aponta para `pix.banprime.com.br` e o painel chama o banco de **PAY2M** — pode ser que a PAY2M use a Banprime por baixo, ou que sejam coisas distintas, e **nenhuma das duas está confirmada**. `AC1` exige a identificação **[OBSERVADO]** e `AC2` proíbe uma linha de adaptador sem documentação do provedor, com a saída explícita de devolver o provedor a `UNSUPPORTED` se ela não vier. Dois achados de código ao escrever a story: **(1)** `pay2m` **já está nas duas listas e já recebe o adaptador HMAC genérico** (`payment-gateway.ts:38,144` + `providers/index.ts` com `UNSUPPORTED` vazia), ou seja, não é provedor esperando adaptador — é provedor com adaptador **suposto**, que pediria uma credencial `apiKey` e verificaria HMAC inexistente, rejeitando todo aviso pelo motivo errado; **(2)** `pix-charge.ts` está cravado em `PAYSURE_PROVIDER` em **seis** pontos (`:275`, `:284-299`, `:329`, `:369`, `:385`) e `advancedSettings.paymentGatewayProvider` **não é lido por ninguém**, então o adaptador novo existiria sem ser chamado. Por isso a story tem duas metades, e a segunda (a escolha por sorteio governar a cobrança) é paridade: na Sorteamos o provedor é **obrigatório na criação**. | @pm (Morgan) |
