# LTM-16: A trilha de ação do operador — quem mudou, o quê, quando

**Status:** Draft
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

**Nenhuma trilha de ação de operador existe no lotemania.** Conferido em 2026-11-18: as 22 tabelas de `src/db/schema/` não têm nenhuma de auditoria de ação humana. A única trilha de auditoria da base é `payment_webhook_events` (`src/db/schema/payments.ts:232`), que é de **aviso recebido de gateway** — nada a ver com operador. E `orders` não tem coluna `approved_by`: a busca por `approved` no schema devolve só o valor `"approved"` de um enum de status de pagamento.

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

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.0 | Nasce ao escrever os blocos `Files:` da Frente B: três stories (`LTM-10` AC6, `LTM-11` AC4, `LTM-13` AC7) presumem uma trilha de ação de operador que **não existe** em nenhuma das 22 tabelas do schema. Extraída para não ser inventada três vezes nem colidir em `drizzle/meta/_journal.json`. | @aiox-master |
