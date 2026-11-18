# LTM-16: A trilha de ação do operador — quem mudou, o quê, quando

**Status:** Ready
> ✅ **`Draft` → `Ready` em 2026-11-18, 1ª validação do @po — GO (8,5/10).** A extração se justifica:
> conferi tabela por tabela que a trilha **não existe**, e que as três consumidoras já declaram
> depender desta. Uma correção aplicada por mim: a contagem de tabelas era **34**, não 22.
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade) · **pré-requisito compartilhado** de `LTM-10`, `LTM-11` e `LTM-13`
**Prioridade:** **P1** — não é tela, é a peça que três stories de paridade presumem existir e que **não existe**
**Complexidade:** M
**Criada por:** @aiox-master · 2026-11-18, ao escrever os blocos `Files:` da Frente B

## Por que esta story nasceu

Ao mapear os arquivos de cada story da Frente B, três delas pedem a mesma coisa em palavras diferentes:

| Story | O que ela exige | AC |
|---|---|---|
| `LTM-10` | *"toda ação mutante desta tela grava autor e horário"* | AC6 |
| `LTM-11` | *"gravam autor e horário"* para "Ativar títulos premiados" e "Revisar pagamentos" | AC4 |
| `LTM-13` | a coluna **`Aprovado por`** do CSV que o cliente usa hoje | AC7 |

**Nenhuma trilha de ação de operador existe no lotemania.** Reconferido pelo @po em 2026-11-18: as **34** tabelas de `src/db/schema/` (oito arquivos) não têm nenhuma de auditoria de ação humana. A única trilha de auditoria da base é `payment_webhook_events` (`src/db/schema/payments.ts:246`, bloco de comentário a partir de `:232`), que é de **aviso recebido de gateway** — nada a ver com operador. E `orders` não tem coluna `approved_by`: a busca por `approved_by`/`approvedBy` no schema não devolve nada, e a busca por `approved` devolve só o valor `"approved"` de um enum de status de pagamento. O diretório `src/lib/audit/` também não existe — os quatro arquivos do bloco `Files:` são todos novos.

> ⚠️ **A contagem "22 tabelas" estava errada e foi corrigida aqui (@po, 2026-11-18).** São **34**:
> `affiliates`, `discount_links`, `users`, `refresh_tokens`, `contacts`, `page_views`,
> `blocked_numbers`, `integrations`, `outbound_webhooks`, `outbound_webhook_deliveries`,
> `bank_accounts`, `banking_transactions`, `payment_requests`, `payment_gateways`,
> `payment_webhook_events`, `pix_charges`, `capitalizers`, `products`, `product_numbers`, `orders`,
> `awarded_boxes`, `awarded_box_combos`, `reward_spins`, `reward_spin_combos`, `scratch_cards`,
> `winners`, `scratch_card_combos`, `bonus_game_plays`, `settings`, `communications`, `faqs`,
> `utm_links`, `site_pages`, `tenants`. **A conclusão não muda** — nenhuma das 34 é trilha de ação de
> operador, e é isso que sustenta esta story. Mas o número vinha marcado como *conferido*, e não
> estava; ele também já se propagou para a `LTM-10` (duas vezes) e a `LTM-13`. Registrado como item
> solto para corrigir lá.

Se cada uma das três stories criar a sua trilha:

1. **Elas colidem.** Todas as três escreveriam em `src/db/schema/` e em `drizzle/meta/_journal.json`, o que a `.claude/rules/parallel-waves.md` proíbe na mesma onda — e serializar três stories por causa de uma tabela é desperdício.
2. **Saem três desenhos diferentes** da mesma ideia, e a quarta cópia de uma ideia nesta base já tem nome: foi exatamente o que aconteceu com *"qual provedor de pagamento"*, registrado na `LTM-03b`.
3. **A coluna `Aprovado por` sai vazia para sempre** se a trilha nascer depois do primeiro pagamento aprovado à mão. Trilha não se preenche retroativamente.

## Story

**Como** Império conferindo caixa depois de uma rodada
**Eu quero** saber **quem** aprovou um pagamento, **quem** expirou uma compra e **quando**
**Para que** a conferência tenha rastro — e para que a coluna `Aprovado por` do meu relatório deixe de ser uma promessa.

## Escopo

**IN:**

- Uma tabela de trilha de ação de operador, com escopo de tenant, autor, ação, alvo, horário e um corpo de contexto.
- Um ponto único de escrita (uma função), para que *registrar* não seja reimplementado por cada tela.
- A leitura que a `LTM-13` precisa para preencher `Aprovado por`.

**OUT:**

- **Tela de histórico de auditoria.** A trilha existe para ser escrita e consultada por outras telas; uma tela própria é outra story e pode nunca ser necessária.
- **Auditar leitura.** Quem *viu* um CSV com CPF é uma pergunta de política de dado pessoal (portão **G7**), com volume e custo completamente diferentes. Não entra de carona.
- **Reescrever as ações que já mutam hoje** (status de sorteio, edição de produto, configurações). Esta story entrega a trilha e liga **as ações novas** da Frente B nela; migrar as antigas é incremento depois, e cada uma tem dono próprio.
- **Retenção e expurgo da trilha.** Precisa de decisão de quanto tempo guardar, e isso é do founder. Registrado como `[CONFIRMAR]`.

## Tarefas (Checklist)

- [ ] Tabela de trilha em `src/db/schema/core.ts` + migração versionada.
- [ ] Função única de escrita em `src/lib/audit/record.ts`, com o conjunto de ações declarado em um lugar só (como `PAYMENT_GATEWAY_PROVIDERS` é para provedores).
- [ ] Leitura por pedido, para a `LTM-13` resolver `Aprovado por`.
- [ ] `[CONFIRMAR]` com o founder: por quanto tempo a trilha é guardada.

## Critérios de Aceite

- [ ] **AC1 (a ação registrada tem autor de verdade):** o registro guarda o **id do usuário da sessão**, não o tenant nem um rótulo genérico. Teste: duas sessões diferentes expirando compras diferentes produzem dois autores distintos.
  - O autor sai de **`requireUser()`** (`src/lib/auth/require-user.ts`), que é o padrão já estabelecido em toda `src/lib/actions/` — `affiliates.ts:15` o importa e o usa em quatro ações. Nomeado pelo @po na validação para que o quinto jeito de descobrir quem está logado não seja inventado aqui.
- [ ] **AC2 (escopo de tenant):** um tenant **não** lê trilha de outro. Teste prova a recusa, como o AC6 da `LTM-13`.
- [ ] **AC3 (o conjunto de ações é fechado):** uma ação fora do conjunto declarado é recusada em tipo e em execução. Trilha que aceita qualquer string vira depósito de texto livre e deixa de ser consultável.
- [ ] **AC4 (registrar não derruba a ação, e não a esconde):** falha ao gravar a trilha **não** desfaz a ação já feita, **e não passa em silêncio** — é registrada como falha visível ao operador. As duas metades importam: trilha que derruba a operação é pior que trilha nenhuma; trilha que falha calada é a mesma cegueira da `OPS-01`.
- [ ] **AC5 (`Aprovado por` sai do registro ou sai vazia):** a leitura por pedido devolve o autor da aprovação quando existe, e **nada** quando não existe. Nunca o usuário logado no momento do export — é o AC7 da `LTM-13` exercitado aqui.
- [ ] **AC6 (sem dado pessoal desnecessário no corpo):** o corpo de contexto guarda **ids e contagens**, não nome, telefone, CPF nem e-mail. Mascaramento na escrita, como `src/lib/payments/redact.ts` já faz para o aviso de gateway. Teste varre o corpo gravado.
- [ ] **AC7 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck` e `pnpm build` passam.

## Dependências

- **Independe da fundação.** Não toca o caminho da reserva nem do pagamento.
- **Bloqueia** `LTM-10` (AC6), `LTM-11` (AC4) e `LTM-13` (AC7). As três podem ser escritas antes, mas não podem **fechar** esses ACs sem ela.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/db/schema/core.ts                       (tabela nova)
  apps/lotemania/src/lib/audit/record.ts                     (novo)
  apps/lotemania/src/lib/audit/actions.ts                    (novo — o conjunto fechado de ações)
  apps/lotemania/src/lib/audit/read.ts                       (novo — leitura por pedido, para a LTM-13)
  apps/lotemania/drizzle/**                                  (migração gerada)
  apps/lotemania/tests/audit/**                              (novo)

Resources:
  banco de teste        — COMPARTILHADO com toda a suíte. Base/esquema próprio por tarefa.
  pnpm db:generate      — escreve drizzle/meta/_journal.json. Serializar com QUALQUER story que gere migração.

Depends-on: none
```

- ⛔ **Não pode compartilhar onda com nenhuma story que gere migração** — `drizzle/meta/_journal.json` é recurso único. Isso inclui `LTM-03b` (`pix_charges`) e `LTM-07`.
- ✅ **Pode preceder toda a Frente B**, e é o que a torna paralelizável depois: com a trilha pronta, `LTM-10`, `LTM-11` e `LTM-13` deixam de disputar `src/db/schema/`.

## Riscos

- **[Médio] A trilha nascer depois do primeiro pagamento aprovado à mão.** Aí `Aprovado por` fica vazia para aquele período e **não há como preencher depois**. É a razão de esta story vir antes, não depois, da `LTM-13`.
- **[Médio] Virar depósito de texto livre.** AC3 fecha o conjunto de ações por isso.
- **[Baixo] Crescer sem limite.** Volume é de ação de operador, não de visita — ordens de magnitude menor que `page_views`. O `[CONFIRMAR]` de retenção existe mesmo assim.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Retenção da trilha — decisão do founder (`[CONFIRMAR]`)
_(registrar por quanto tempo a trilha é guardada, e quem decidiu)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-18) — **GO, 8,5/10. `Draft` → `Ready`**

**Veredicto: GO — 8,5/10.** A pergunta que me foi feita era se a extração se justifica ou se é story
inventada. **Se justifica, e o recorte está certo.** Conferi a afirmação central em vez de aceitá-la.

### A afirmação central é verdadeira, e eu a conferi por dentro

| Afirmação | Conferência |
|---|---|
| Nenhuma trilha de ação de operador existe | ✅ **34 tabelas lidas, nenhuma é de auditoria de ação humana** |
| A única trilha da base é de gateway | ✅ `payment_webhook_events`, e o comentário dela (`payments.ts:232`) diz literalmente "*Audit trail for every inbound webhook call*" — é aviso recebido, não ação de pessoa |
| `orders` não tem `approved_by` | ✅ li as 11 colunas de `orders` inteiras (`raffles.ts:157-193`). Nenhuma de aprovador. E `grep approved_by\|approvedBy` no schema não devolve nada |
| `src/lib/payments/redact.ts` é o precedente de mascaramento do AC6 | ✅ existe, e é o lugar certo para espelhar |
| `src/db/schema/core.ts` existe (casa da tabela nova) | ✅ |
| `src/lib/audit/` não existe | ✅ os quatro arquivos são novos de verdade |
| As três consumidoras pedem a mesma peça | ✅ `LTM-10:54` (AC6), `LTM-11:52` (AC4), `LTM-13:106` (AC7) — e **as três já declaram `Depends-on: LTM-16`** nos seus blocos de onda |

### Por que a extração é certa, e não inventada

O teste de "story inventada" que eu aplico é: **existe um consumidor real que não fecha sem ela?**
Aqui existem **três**, nomeados, com AC e número de linha, e os três já apontam para cá. O oposto
— deixar cada uma criar a sua — produz os três danos que a story nomeia, e eu confirmo os três:

1. **Colisão real, não teórica.** As três escreveriam em `src/db/schema/` e em
   `drizzle/meta/_journal.json`. Esse `_journal.json` é o mesmo recurso único que já força
   serialização entre `LTM-01`, `LTM-03a`, `LTM-03b`, `LTM-04`, `LTM-07` e esta. Pela
   `.claude/rules/parallel-waves.md`, três stories disputando um recurso mutável não formam onda —
   e serializar três stories por causa de **uma** tabela é desperdício puro.
2. **Três desenhos da mesma ideia.** A story cita o precedente certo: *"qual provedor de pagamento"*
   foi reimplementado até a `LTM-03b` dar a ele um lugar só. É o mesmo padrão, um estágio antes.
3. **O argumento mais forte é o terceiro, e é irreversível:** trilha não se preenche
   retroativamente. Se ela nascer depois do primeiro pagamento aprovado à mão, a coluna
   `Aprovado por` fica **vazia para sempre** naquele período. Isso é o que decide a **ordem**, não só
   a existência — e é por isso que o P1 está certo mesmo não sendo tela.

### O que está bem feito e eu não mexo

- **O OUT é o melhor desta story.** Quatro recusas, cada uma com motivo próprio: tela de histórico
  (outra story, pode nunca ser necessária), **auditar leitura** (é política de dado pessoal, portão
  G7, volume e custo de outra ordem — "não entra de carona" é exatamente a frase certa), reescrever
  as ações antigas (cada uma tem dono) e retenção (é do founder). Recusar auditoria de leitura aqui
  é o que impede esta story de virar um projeto.
- **AC4 tem as duas metades**, e é o AC que eu teria exigido se não estivesse lá: trilha que derruba
  a operação é pior que trilha nenhuma, **e** trilha que falha calada é a cegueira da `OPS-01`.
  Quase toda story erra uma dessas duas; esta escreveu as duas juntas.
- **AC3 (conjunto fechado de ações)** é o que separa trilha consultável de depósito de texto livre,
  e o precedente citado (`PAYMENT_GATEWAY_PROVIDERS`) é o padrão certo da casa.
- **AC6 (sem dado pessoal no corpo)** com mascaramento na escrita e varredura no teste. Guardar ids
  e contagens em vez de nome/telefone/CPF é a decisão certa, e tem precedente em `redact.ts`.
- **AC5** é o AC7 da `LTM-13` exercitado aqui, com a parte que importa: *"nunca o usuário logado no
  momento do export"*. Esse é o jeito exato como `Aprovado por` viraria registro falso.

### O que custa o 1,5 — e nada disso bloqueia

**1. A contagem estava errada e vinha marcada como conferida.** "As 22 tabelas" são **34**. A
conclusão que o número sustenta é verdadeira — eu a verifiquei independentemente, tabela por tabela
—, mas um número apresentado como medido e que está 12 fora é o tipo de coisa que gasta a confiança
em todos os outros números do mesmo artefato. **Corrigido por mim aqui, com a lista nominal das 34**,
para que a próxima conferência seja de leitura e não de recontagem. O número já se propagou para
`LTM-10:66`, `LTM-10:102` e `LTM-13:119` — não toco nessas três nesta validação (não me foram
atribuídas e há trabalho de Frente B em curso); fica item solto.

**2. O autor da ação não tinha procedência.** O AC1 exige "o id do usuário da sessão" e a story não
dizia **de onde** ele sai. Numa base onde a mesma ideia já foi implementada três e quatro vezes,
deixar isso em aberto é convidar o quinto jeito de descobrir quem está logado. **Nomeei no AC1:**
`requireUser()` (`src/lib/auth/require-user.ts`), que é o padrão já usado em `src/lib/actions/`.

**3. Faltava `Dev Agent Record`.** A `LTM-07` tem; esta e a `LTM-17` não tinham. **Acrescentado**,
com uma subseção própria para a decisão de retenção aterrar quando o founder responder — porque
`[CONFIRMAR]` sem lugar para a resposta pousar é `[CONFIRMAR]` que ninguém fecha.

**4. Um detalhe de citação:** `payment_webhook_events` é declarada em `payments.ts:246`; `:232` é
onde começa o bloco de comentário dela. Aceitável — o comentário é parte do bloco — mas registrado,
porque já perdi tempo hoje com três citações de linha envelhecidas neste epic.

### Pontuação

| Eixo | Nota |
|---|---|
| Título claro e objetivo | ✅ o subtítulo *"quem mudou, o quê, quando"* já é a especificação |
| Descrição completa | ✅ a seção *"Por que esta story nasceu"* é o melhor tipo de justificativa: três consumidores com AC e linha |
| ACs testáveis | ✅ sete ACs, todos com teste nomeado. AC4 com as duas metades |
| Escopo IN/OUT | ✅ o OUT é exemplar, com quatro recusas fundamentadas |
| Dependências mapeadas | ✅ `Files:` (seis entradas, quatro novas), `Resources:` com `_journal.json` como recurso único, `Depends-on: none` — e conferido que é mesmo `none` |
| Complexidade | ✅ M, coerente com uma tabela + três módulos + testes |
| Valor de negócio | ✅ conferência de caixa com rastro, e a coluna do CSV que o cliente já usa |
| Riscos documentados | ✅ três, e o irreversível (trilha nascer tarde) está marcado como a razão da ordem |
| Critérios de Done | ✅ AC7 fecha a porta de verificação |
| Alinhamento com epic/schema | ⚠️ contagem de tabelas errada (corrigida aqui) e autor da ação sem procedência (nomeado aqui) |

**8,5/10.** Confiança de implementação: **alta.** É a story mais limpa da Frente B, e a única que
destrava as outras três.

### Sequenciamento — e é aqui que ela vale mais

`Depends-on: none`, conferido. **Pode ir para a onda seguinte imediatamente**, e deve: é a única
story da Frente B que não espera ninguém, e com ela pronta a `LTM-10`, a `LTM-11` e a `LTM-13`
deixam de disputar `src/db/schema/` entre si. **Não compartilha onda com `LTM-03b`, `LTM-07`, nem
qualquer story que gere migração** — `drizzle/meta/_journal.json` é recurso único, e a própria story
já declara isso corretamente.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | **Validada (1ª) — GO (8,5/10). `Draft` → `Ready`.** A extração se justifica e o recorte está certo: conferi que nenhuma das 34 tabelas do schema é trilha de ação de operador, que `orders` não tem `approved_by`, que `src/lib/audit/` não existe, e que as três consumidoras (`LTM-10:54`, `LTM-11:52`, `LTM-13:106`) já declaram `Depends-on: LTM-16`. O argumento decisivo da ordem é o irreversível: trilha não se preenche retroativamente. Corrigido por mim: a contagem "22 tabelas" era **34** (lista nominal acrescentada; o número errado já se propagou para `LTM-10` e `LTM-13` — item solto), o AC1 ganhou a procedência do autor (`requireUser()`, `src/lib/auth/require-user.ts`), e a seção `Dev Agent Record` foi acrescentada com lugar para a decisão de retenção pousar. | @po (Pax) |
| 2026-11-18 | 1.0 | Nasce ao escrever os blocos `Files:` da Frente B: três stories (`LTM-10` AC6, `LTM-11` AC4, `LTM-13` AC7) presumem uma trilha de ação de operador que **não existe** em nenhuma tabela do schema. Extraída para não ser inventada três vezes nem colidir em `drizzle/meta/_journal.json`. | @aiox-master |
