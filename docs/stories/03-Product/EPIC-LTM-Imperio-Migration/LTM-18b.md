# LTM-18b: Sete chaves de exibição que a loja ignora

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade) · filha 2 de 3 da partição da `LTM-18`
**Prioridade:** **P1**
**Complexidade:** **M** — sete campos, nenhum novo subsistema; duas delas (`salesStartMode`,
`allowReceiptDownload`) descobrem uma peça que falta e precisam de um default seguro, não de
invenção
**Criada por:** @sm (River) · 2026-11-20, partindo a `LTM-18` por ordem do @po
**Substitui:** a parte de "chaves de exibição do grupo A" da `LTM-18` · irmãs: `LTM-18a`, `LTM-18c`

## Story

**Como** operador do Império montando o sorteio de teste
**Eu quero** que as chaves de exibição do editor mudem o que a loja de fato mostra
**Para que** eu não configure uma vitrine que a loja ignora.

## Os sete campos, cada um medido no código hoje

| Campo | Onde está o controle | Onde deveria ter efeito | Efeito hoje |
|---|---|---|---|
| `showOnHomepage` | `advanced-settings-tabs.tsx:247-251` | `loja/[tenant]/page.tsx` (listagem) | **nenhum** — a consulta filtra por `status`/`privacy`, nunca por `showOnHomepage` (`page.tsx:34-40`) |
| `showDrawDateToParticipants` | `advanced-settings-tabs.tsx:343-347` | `loja/[tenant]/[productSlug]/page.tsx` | **nenhum** — `product.drawDate` não aparece em nenhuma linha da página (conferido, busca por `drawDate` no diretório `loja` não encontra nada) |
| `showPaidParticipantNames` | `advanced-settings-tabs.tsx:353-357` | idem | **nenhum** — não existe lista de compradores na página |
| `allowReceiptDownload` | `advanced-settings-tabs.tsx:348-352` | `pedido/[orderId]/` | **nenhum** — não existe "comprovante" nem geração de PDF em lugar nenhum do app (busca por `comprovante`/`receipt`/`pdf` no diretório `loja` encontra só o rótulo do próprio editor) |
| `descriptionMode` | `advanced-settings-tabs.tsx:289-303` | `raffle-extras.tsx` → `DescriptionPanel` | **nenhum** — `DescriptionPanel` sempre nasce `open = false` (`:41`), ignorando o valor (`[productSlug]/page.tsx:236` não passa `descriptionMode`) |
| `salesStartMode` | `advanced-settings-tabs.tsx:314-328` | — | **nenhum**, e ver achado abaixo |
| `autoFinishOnDrawDate` | `advanced-settings-tabs.tsx:338-342` | — | **nenhum** — o app não tem agendador (`expire-reservations.ts`, cabeçalho); nada transiciona `status` por data |

## Dois achados que mudam o que "ligar" significa aqui

### `salesStartMode` promete um estado que o lotemania não tem

A Sorteamos tem um estado de listagem **`Em breve`** para sorteio agendado
(`docs/research/2026-11-18-inventario-sorteamos/README.md:160-161`: *"O `Em breve` é o estado de um
sorteio agendado, e **o lotemania não tem equivalente**"*). `salesStartMode: "scheduled"` promete
esse estado, e ele não existe — nem como coluna de `products.status`, nem como tela.

**[AUTO-DECISION]** @sm → implementar o único efeito que não inventa a peça que falta: enquanto
`salesStartMode === "scheduled"`, o sorteio **não aparece** na listagem (`loja/[tenant]/page.tsx`) e
o acesso direto a `[productSlug]/page.tsx` devolve o mesmo tratamento de "não encontrado" que um
sorteio fora de `active`/`finished` já recebe hoje — **nunca** inventando uma data de início que a
Sorteamos mostraria e o lotemania não grava. Razão: é a leitura mais próxima do texto observado
(*"ainda não está à venda"*) sem fabricar o estado `Em breve` completo, que é trabalho de tela nova
e cabe em story própria (fica registrado em OUT). Quando `salesStartMode === "immediate"`
(`.default`), nada muda — é o comportamento de hoje.

### `allowReceiptDownload` promete um comprovante que não existe

Não há geração de comprovante/recibo em nenhuma camada do app — nem PDF, nem HTML dedicado. A
Sorteamos observada confirma *"Permite download do comprovante"* como liga/desliga simples
(`README.md` Aba Geral), mas não descreve o artefato por dentro, e esta story não pode inventá-lo.

**[AUTO-DECISION]** @sm → o efeito mínimo e verdadeiro, sem subsistema novo: quando
`allowReceiptDownload` está ligado **e** o pedido está `paid`, a tela de
`pedido/[orderId]` ganha um botão **"Baixar comprovante"** que aciona a impressão/"Salvar como PDF"
do navegador sobre a própria tela de confirmação já renderizada (que já tem pedido, valor, números e
data) — nenhum gerador de PDF novo, nenhuma dependência nova. Quando desligado, o botão não aparece.
**Fica registrado para o @po:** um comprovante com identidade visual própria (logo, cabeçalho) é
Grupo-C-like — feature, não chave — e não entra aqui.

## Tarefas (Checklist)

- [ ] `loja/[tenant]/page.tsx`: a consulta da listagem ganha o filtro de `showOnHomepage` (lido via
      `productAdvancedSettingsSchema.parse`, nunca jsonb cru) e de `salesStartMode !== "scheduled"`.
- [ ] `loja/[tenant]/[productSlug]/page.tsx`: sorteio com `salesStartMode === "scheduled"` segue o
      mesmo caminho de "não encontrado" que status fora de `active`/`finished`.
- [ ] `loja/[tenant]/[productSlug]/page.tsx`: renderizar `product.drawDate` quando
      `showDrawDateToParticipants` estiver ligado.
- [ ] `loja/[tenant]/[productSlug]/page.tsx` (ou componente novo em `components/loja/`): lista de
      compradores pagos quando `showPaidParticipantNames` estiver ligado — nome se
      `users.name` existir, senão telefone **mascarado** (ex.: `(11) ****-7777`), nunca o telefone
      inteiro de um terceiro exposto publicamente.
- [ ] `raffle-extras.tsx`: `DescriptionPanel` ganha prop `initialOpen`, alimentada por
      `descriptionMode === "expanded"`.
- [ ] `pedido/[orderId]/`: botão "Baixar comprovante" condicionado a `allowReceiptDownload` e a
      `status === "paid"`, acionando impressão do navegador sobre a tela já renderizada.
- [ ] `autoFinishOnDrawDate`: no caminho de leitura da listagem/detalhe (mesmo padrão lazy da
      `LTM-20`/`releaseExpiredReservations`), sorteio `active` com `drawDate` no passado e a flag
      ligada transiciona para `finished` na leitura.
- [ ] Testes de cada um dos sete, nos dois estados (ligado/desligado).

## Critérios de Aceite

- [ ] **AC1 (as sete chaves de exibição exibem):** para cada um dos sete campos, dois estados, dois
      resultados visíveis — catorze asserções no total (regra da mãe, AC4 original: "três chaves,
      seis asserções", estendida às sete).
- [ ] **AC2 (`salesStartMode` não inventa a tela que falta):** sorteio `scheduled` não aparece na
      listagem nem abre por URL direta; sorteio `immediate` comporta-se como hoje. Nenhuma data
      inventada em nenhum teste nem em nenhuma tela.
- [ ] **AC3 (`allowReceiptDownload` não inventa o comprovante):** o botão só aparece com a flag
      ligada **e** pedido pago; aciona a função de impressão do navegador sobre a própria tela —
      nenhuma biblioteca de geração de PDF entra no `package.json`.
- [ ] **AC4 (dado pessoal não é exposto por `showPaidParticipantNames`):** a lista de compradores
      nunca mostra telefone inteiro de alguém sem nome cadastrado; teste com comprador sem `name`
      confere a máscara.
- [ ] **AC5 (sorteio antigo não muda de comportamento):** sorteio com `advanced_settings = {}`
      continua se comportando como hoje em todos os sete — regressão obrigatória, mesma cláusula da
      mãe.
- [ ] **AC6 (nenhum campo inventado):** nenhuma destas sete chaves aciona comportamento que não
      esteja (i) observado na Sorteamos (`editor-14-abas.md`/`README.md` do inventário) ou (ii) um
      default seguro e declarado como tal (os dois `[AUTO-DECISION]` acima).
- [ ] **AC7 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.
- [ ] **AC8 (a varredura do AC1 da `18a` reconhece as sete):** depois desta story, o teste de
      "campo sem leitor" da `18a` não lista mais nenhuma das sete.

## Escopo

**IN:** os sete campos acima, nos dois estados, com os dois defaults seguros declarados para
`salesStartMode` e `allowReceiptDownload`.

**OUT:**

- **O estado `Em breve` completo** (status próprio, badge na listagem, data de início real). Fica
  registrado como item solto para o @po — é o que torna `salesStartMode` plenamente útil.
- **Um comprovante com identidade visual própria.** O botão desta story é impressão da tela, não um
  documento com cabeçalho/logo — essa é feature (Grupo C-like), não chave.
- **Os outros oito do grupo A** (reserva) — `LTM-18c`.
- **A medição visual, o inventário e a varredura do AC1** — `LTM-18a`.

## Dependências

- **Depende da `LTM-18a` por transitividade do AC8** (o teste da varredura é dela), mas **não**
  colide em arquivo com `18a` — pode ser implementada antes ou depois, só a verificação final do
  AC8 precisa das duas no mesmo estado da árvore.
- **Condição de entrada herdada da `LTM-18` mãe, aplicável aqui:** antes de ligar
  `showDrawDateToParticipants`/`showPaidParticipantNames` em sorteio real, conferir se há sorteio
  com dado gravado que o operador não esperava expor. **Hoje é condição morta**: o founder declarou
  (2026-11-18) que os sorteios atuais do lotemania são descartáveis. Tem prazo — volta no dia do
  primeiro sorteio real.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/loja/[tenant]/page.tsx                                (showOnHomepage, salesStartMode)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx                  (showDrawDateToParticipants,
                                                                                 showPaidParticipantNames,
                                                                                 salesStartMode, autoFinishOnDrawDate)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/raffle-extras.tsx         (descriptionMode)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/**       (allowReceiptDownload)
  apps/lotemania/tests/loja/exibicao-grupo-a/**                                (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — os 7 campos ja existem no jsonb

Depends-on: nenhuma bloqueante. Ver colisoes abaixo.
```

> ⚠️ **`[productSlug]/page.tsx` é o segundo arquivo mais disputado do epic, e QUATRO partes o
> tocam — conferido story a story, não deduzido:**
>
> | Story | Status | O que toca na página |
> |---|---|---|
> | **`LTM-08`** | `Ready` | *"o anúncio dos dois valores lado a lado (AC3)"* — meia cota |
> | **`LTM-12`** | `Draft` | registrar a visita com o sorteio |
> | **`LTM-15`** | `Draft` | *"concluída não é comprável"* (AC2) |
> | **`18b`** (esta) | `Draft` | as quatro chaves de exibição desta tabela |
>
> ⛔ **`18b` não compartilha onda com `LTM-08`, `LTM-12` nem `LTM-15`** — todas no mesmo arquivo. Das
> quatro, só `LTM-08` está `Ready` hoje; `LTM-12` e `LTM-15` seguem `Draft`, então a serialização
> real e imediata é contra a `LTM-08`.
> ⚠️ **Dois `@dev` escrevem em `apps/lotemania` agora (2026-11-20, 18h40): `LTM-27` e `LTM-08`.**
> `LTM-08` está ativamente em `pedido/[orderId]/` e em `[productSlug]/page.tsx` nesta janela — o
> controlador deve confirmar que ela terminou (ou não toca estes trechos) antes de despachar `18b`.
> ✅ **`18b` pode compartilhar onda com `18a`** (arquivos totalmente disjuntos) e, a princípio, com
> `18c` — **conferir na `18c`**: ela não declara `[productSlug]/page.tsx` nem `loja/[tenant]/page.tsx`.

## Riscos

- **[Alto] Inventar o estado `Em breve` ou a data de início por dedução.** Mitigado pelo
  `[AUTO-DECISION]` registrado: a saída segura é ocultar, não simular uma tela que não existe.
- **[Alto] Inventar um gerador de comprovante.** Mitigado pelo segundo `[AUTO-DECISION]`: impressão
  da tela existente, nenhuma dependência nova.
- **[Médio] Expor telefone inteiro de comprador em `showPaidParticipantNames`.** AC4 é a trava —
  política de dado pessoal de 2026-11-12, mesma classe do `payer_document` mascarado na `LTM-03a`.
- **[Baixo] `autoFinishOnDrawDate` depender de agendador que não existe.** Mitigado pelo padrão já
  validado da `LTM-20`: escrita lazy no caminho de leitura, sem cron.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.0 | Nasce da partição da `LTM-18` (NO-GO 6/10 do @po). Cobre as sete chaves de exibição do grupo A. Dois achados registrados com `[AUTO-DECISION]`: `salesStartMode` promete o estado `Em breve`, que o lotemania não tem (confirmado no inventário), e recebe o default seguro de ocultar o sorteio em vez de inventar uma data; `allowReceiptDownload` promete um comprovante que não existe em nenhuma camada do app, e recebe o default seguro de imprimir a própria tela de confirmação. Declarada a colisão de `[productSlug]/page.tsx` contra `LTM-08` (Ready, em edição ativa agora), `LTM-12` e `LTM-15` (Draft). | @sm (River) |
