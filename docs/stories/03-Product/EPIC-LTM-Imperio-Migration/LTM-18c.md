# LTM-18c: Oito campos que prometem governar a reserva, e não governam nada

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A/B — fecha a fila de `reserve.ts`) · filha 3 de 3 da
partição da `LTM-18`
**Prioridade:** **P1** — atrás da fila mais longa do epic, por desenho, não por mérito
**Complexidade:** **L** — oito campos, três deles exigem novos campos de formulário na loja
(não só validação), e um precisa de decisão de alcance (tenant × sorteio)
**Criada por:** @sm (River) · 2026-11-20, partindo a `LTM-18` por ordem do @po
**Substitui:** a parte de "campos que tocam a reserva" da `LTM-18` · irmãs: `LTM-18a`, `LTM-18b`

> **Esta é a filha que a mãe já havia marcado como "a última da fila".** Ela toca
> `src/lib/actions/reserve.ts` e `src/lib/validations/reserve.ts`, disputados nesta ordem por
> `LTM-02` (entregue), `LTM-03b` (entregue), `LTM-17` (`Ready`), `LTM-04`, `LTM-21` e `LTM-28`
> (as três `Draft`). Nenhuma dependência aqui é de mérito — é de arquivo.

## Story

**Como** operador do Império montando o sorteio de teste
**Eu quero** que os limites, a lista de campos obrigatórios, a restrição de DDD e o anti-spam do
editor realmente governem quem consegue reservar o quê
**Para que** eu não configure uma regra de negócio que a loja ignora silenciosamente.

## O caso que o founder fotografou, e por que ele fecha aqui

> *"O operador liga CPF em 'Campos requeridos para realizar a reserva', e a loja nunca vai pedir
> CPF."*

Conferido hoje: `src/lib/validations/reserve.ts:171-177` (`reserveNumbersSchema`) só exige
`phone`. O diálogo de checkout em `number-grid.tsx:180-188` só tem um `<Input>`: telefone. Não há
campo de nome, CPF, e-mail, nome social nem data de nascimento em lugar nenhum da loja — apesar de
as seis colunas existirem em `users` (`core.ts:34-40`: `name`, `socialName`, `email`, `cpf`,
`birthDate`, mais `phone`). **O dado tem onde morar; falta o formulário que o coleta e a validação
que o exige.**

## Os oito campos, cada um medido no código hoje

| Campo | Onde está o controle | Onde deveria ter efeito | Efeito hoje |
|---|---|---|---|
| `requiredFields` | `advanced-settings-tabs.tsx:364-392` | `reserveNumbersSchema` + o diálogo de `number-grid.tsx` | **nenhum** — só telefone é coletado e exigido |
| `minPerReservation` | `advanced-settings-tabs.tsx:466-473` | `reserveSelectedNumbers` | **nenhum** — a função nunca lê `data.units.length` contra um mínimo |
| `maxPerReservation` | `advanced-settings-tabs.tsx:474-480` | idem | **nenhum**, mesma busca |
| `initialPerReservation` | `advanced-settings-tabs.tsx:481-487` | `number-grid.tsx` | **nenhum** — ver achado abaixo |
| `maxPerBuyer` | `advanced-settings-tabs.tsx:445-452` | `reserveSelectedNumbers` | **nenhum** — não há consulta ao total já reservado/pago pelo comprador |
| `maxQuantityPerBuyer` | `advanced-settings-tabs.tsx:454-462` | idem | **nenhum**, mesma busca |
| `restrictedDdds` | `advanced-settings-tabs.tsx:820-845` | `reserveSelectedNumbers` | **nenhum** — `data.phone` nunca é conferido contra a lista |
| `antiSpamEnabled` | `advanced-settings-tabs.tsx:725-729` | `expire-reservations.ts` | **nenhum** — o bloqueio (`ANTI_SPAM_THRESHOLD = 3`, `:90`) roda **sempre**, incondicional à flag |

## Três achados que mudam o que "ligar" significa aqui

### 1. `restrictedDdds` é ALLOWLIST, e o default é a pior leitura possível

Medido (`docs/research/2026-11-18-inventario-sorteamos/editor-14-abas.md:117-132`): o texto da
Sorteamos é *"**Apenas** os usuários com DDDs selecionados **poderão comprar**"* — lista de
**permissão**, não de bloqueio, apesar do nome do campo sugerir o oposto.

**A consequência é concreta e perigosa:** `restrictedDdds.default([])` — se a allowlist for lida ao
pé da letra, **lista vazia = nenhum DDD permitido = ninguém compra**. Implementar pelo nome do
campo, ou pela semântica ingênua de "lista vazia = sem restrição", produz dois erros opostos e os
dois são errados por motivos diferentes:

| Leitura | `restrictedDdds: []` significa | Está certo? |
|---|---|---|
| bloqueio (o nome sugere) | ninguém bloqueado → todos compram | ❌ inverte a regra da Sorteamos |
| allowlist ao pé da letra | nenhum DDD permitido → ninguém compra | ❌ **fecha todo sorteio existente** no instante em que o leitor nascer — viola o AC5 (regressão) |

**Decisão desta story, consistente com o AC5 da mãe** (*"sorteio antigo não muda de comportamento"*):
`restrictedDdds: []` (o default, e o estado de **todo** sorteio hoje) significa **sem restrição —
todos os DDDs compram**. A allowlist só entra em vigor quando o operador **selecionar** ao menos um
DDD, e a partir daí a semântica observada vale ao pé da letra: só os selecionados compram. Isto não
é invenção — é a única leitura que satisfaz simultaneamente o texto observado da Sorteamos e o AC5
que a própria mãe exige para todos os 36.

### 2. `antiSpamEnabled` é por sorteio; o bloqueio que existe é por operador

`applyAbandonmentStrikes` (`expire-reservations.ts:202-241`) debita a ficha do comprador **no
operador inteiro**, não no sorteio — comentário do próprio arquivo: *"a ficha do anti-spam sempre
contou o abandono do comprador em todos os sorteios do operador"*. `antiSpamEnabled`, porém, é um
campo de `advanced_settings` **por sorteio**.

**Decisão:** o abandono de um pedido só gera ficha se o **sorteio daquele pedido** tiver
`antiSpamEnabled` ligado — mas a ficha, uma vez debitada, continua bloqueando o comprador **no
operador inteiro**, preservando o alcance que já existe hoje. Desligar a flag num sorteio não limpa
ficha já debitada por outro sorteio do mesmo operador que a tenha ligada. É a extensão mínima que dá
efeito real ao campo sem mudar o alcance do mecanismo que já está em produção.

### 3. `initialPerReservation` promete uma tela de quantidade que não existe

"Quantidade inicial por reserva" só faz sentido onde o comprador escolhe **quantidade**, não números
específicos — e hoje a loja só vende por seleção manual na grade (`number-grid.tsx`, clique por
número); não há input de quantidade em lugar nenhum. É a mesma classe de achado que
`salesStartMode`/`allowReceiptDownload` na `18b`: a peça que o campo pressupõe não existe.

**[AUTO-DECISION]** @sm → leitura literal e mínima, sem inventar tela nova: ao abrir a grade,
`initialPerReservation` **pré-seleciona** essa quantidade de números disponíveis (os primeiros N
disponíveis, em ordem), que o comprador pode então ajustar clicando. Zero está fora da faixa (campo
é `min(0)`) e significa "nenhuma pré-seleção" — o comportamento de hoje. **Fica registrado para o
@po:** o dia em que existir seleção por quantidade (par do `reservationModel = "random"`, grupo D),
este campo ganha o lugar mais natural, e esta pré-seleção pode ser revista.

## Tarefas (Checklist)

- [ ] `validations/reserve.ts`: `reserveNumbersSchema` ganha `name`, `cpf`, `email`, `socialName`,
      `birthDate`, todos opcionais no tipo; uma função `requiredFieldsFor(product)` (mesmo padrão de
      `reservationMinutesFor`) e `superRefine` que recusa a ausência de qualquer campo que o sorteio
      exija.
- [ ] `number-grid.tsx`: o diálogo de checkout renderiza um `<Input>` por campo presente em
      `requiredFields` do sorteio (nome, CPF, e-mail, nome social, data de nascimento), além do
      telefone que já existe.
- [ ] `actions/reserve.ts` / `ensureBuyerIdentity`: os campos coletados são gravados em `users` na
      criação; releitura não sobrescreve dado já existente de um comprador recorrente com um
      formulário que, numa visita futura, venha vazio.
- [ ] `actions/reserve.ts`: `resolveTargetUnits`/`reserveSelectedNumbers` passam a recusar quando
      `targetUnits.length` estiver fora de `[minPerReservation, maxPerReservation]` do sorteio.
- [ ] `actions/reserve.ts`: antes de reservar, somar as unidades já `reserved`/`sold` do comprador
      (por `userId`, neste sorteio) e recusar se a soma mais o pedido atual passar de `maxPerBuyer`
      (contagem de unidades) ou `maxQuantityPerBuyer` (se for a mesma grandeza — conferir contra o
      texto da Sorteamos qual conta o quê; `[CONFIRMAR]` se divergir).
- [ ] `actions/reserve.ts`: recusar reserva de `data.phone` cujo DDD não esteja em
      `restrictedDdds` **quando a lista não estiver vazia** — allowlist com o default seguro do
      achado 1.
- [ ] `expire-reservations.ts`: `applyAbandonmentStrikes`/`releaseExpiredReservationsWithin` passam
      a receber, por pedido abandonado, se o **sorteio daquele pedido** tem `antiSpamEnabled`
      ligado, e só contam ficha quando sim — achado 2.
- [ ] `number-grid.tsx`: pré-seleção de `initialPerReservation` números disponíveis ao carregar a
      grade — achado 3.
- [ ] Testes de todos os ACs abaixo.

## Critérios de Aceite

- [ ] **AC1 (`requiredFields` governa o formulário, ponta a ponta):** com `requiredFields` incluindo
      `cpf`, a reserva sem CPF é recusada **no servidor** (não só escondida na tela) e o diálogo
      exibe o campo; com `requiredFields = ["phone"]` (default), nenhum campo extra aparece e nenhum
      é exigido. Telefone **sempre** obrigatório, nos dois casos. Três configurações diferentes,
      testadas pela aceitação e pela recusa — não pela aparência.
- [ ] **AC2 (os limites por reserva são obedecidos no servidor):** `minPerReservation`,
      `maxPerReservation` e `maxPerBuyer`/`maxQuantityPerBuyer` recusam chamando a ação direto, sem
      passar pela interface.
- [ ] **AC3 (a allowlist de DDD funciona nos dois sentidos, com o default seguro):**
      `restrictedDdds: []` aceita qualquer DDD (regressão); `restrictedDdds: ["11"]` aceita só
      `(11)` e recusa os demais. Teste explícito dos dois estados, pela razão do achado 1.
- [ ] **AC4 (`antiSpamEnabled` governa a ficha por sorteio, sem mudar o alcance do bloqueio):**
      abandono num sorteio com a flag desligada não debita ficha; abandono num sorteio com a flag
      ligada debita, e o bloqueio resultante vale no operador inteiro — teste com dois sorteios do
      mesmo operador, um ligado e um desligado.
- [ ] **AC5 (`initialPerReservation` pré-seleciona, sem inventar tela de quantidade):** grade abre
      com N números disponíveis pré-selecionados quando `N > 0`; com `N = 0` (default), abre como
      hoje. Teste dos dois.
- [ ] **AC6 (sorteio antigo não muda de comportamento):** sorteio com `advanced_settings = {}`
      continua se comportando como hoje em todos os oito — regressão obrigatória.
- [ ] **AC7 (nenhum campo inventado):** os três achados acima — allowlist vazia, alcance do
      anti-spam, pré-seleção — estão escritos como decisão explícita nesta story, nenhum foi
      adivinhado durante a implementação.
- [ ] **AC8 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.
- [ ] **AC9 (a varredura do AC1 da `18a` reconhece os oito):** depois desta story, o teste de
      "campo sem leitor" da `18a` não lista mais nenhum dos oito.

## Verificável no ensaio, não só em teste automatizado

O founder autorizou, no sorteio de teste, deixar uma reserva vencer de propósito e acionar
`Revisar pagamentos` (*"Reprocessar todas compras expiradas"* — menu ⋮, item 14,
`README.md` do inventário). Isto toca diretamente o caminho que `antiSpamEnabled` (AC4) usa: a
expiração é o evento que debita a ficha (`expire-reservations.ts`, comentário do topo). **Se o
ensaio incluir abandonar reservas de propósito em dois sorteios — um com a flag ligada e outro
desligada —, o AC4 pode ser observado ao vivo**, além do teste automatizado. Vale avisar quem conduz
o ensaio, mas o teste automatizado continua sendo o critério de aceite — o ensaio é confirmação, não
substituto.

## Escopo

**IN:** os oito campos acima, com os três achados resolvidos pelos defaults seguros declarados; os
novos campos de formulário na loja (nome, CPF, e-mail, nome social, data de nascimento) e sua
gravação em `users`.

**OUT:**

- **Validar CPF/e-mail por formato** (dígito verificador, domínio). Esta story exige **presença**,
  não **validade** do dado — validação de formato é item solto, registrado para o @po.
- **A tela `Em breve` / seleção por quantidade** que tornaria `initialPerReservation` plenamente
  útil — ver achado 3. Fica para quando o `reservationModel = "random"` (grupo D) ganhar story.
- **Os sete campos de exibição** — `LTM-18b`.
- **A medição, o inventário e a varredura do AC1** — `LTM-18a`.

## Dependências

- **Depende, por arquivo, de toda a fila que já disputa `actions/reserve.ts` e
  `validations/reserve.ts` neste epic** — conferida story a story, não deduzida:

  | Story | Status | O que toca nestes dois arquivos |
  |---|---|---|
  | `LTM-02` | **Entregue** | a transação da reserva (base de tudo) |
  | `LTM-03b` | **Entregue** | `reservationMinutesFor` em `validations/reserve.ts` |
  | `LTM-17` | **`Ready`** | o corpo de `reservationMinutesFor` (`:149-157`) e apagar `:114`, em `validations/reserve.ts` |
  | `LTM-04` | `Draft` | grava atribuição na transação do pedido, em `actions/reserve.ts` |
  | `LTM-21` | `Draft` | a mensagem de conflito, em `actions/reserve.ts` |
  | `LTM-28` | `Draft` | troca a privada pelo import, em `actions/reserve.ts` |
  | **`18c`** (esta) | `Draft` | `requiredFields`, limites, DDD, anti-spam — ambos os arquivos |

- **Depende também, por arquivo, de `number-grid.tsx`**, dona declarada da `LTM-02` (entregue) e
  tocada por `LTM-08` (`Ready`, a célula partida da meia cota).

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/reserve.ts                         (limites, DDD, identidade,
                                                                      e o bloco e disputado por 3
                                                                      stories Draft + 2 entregues)
  apps/lotemania/src/lib/validations/reserve.ts                     (requiredFields, superRefine)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/number-grid.tsx
                                                                     (novos inputs do checkout;
                                                                      pre-selecao de
                                                                      initialPerReservation)
  apps/lotemania/src/lib/raffles/expire-reservations.ts             (antiSpamEnabled por sorteio)
  apps/lotemania/tests/reserva/grupo-a/**                           (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — os 8 campos e as colunas de users (name/cpf/email/socialName/birthDate) ja
                      existem

Depends-on: LTM-02 (Done), LTM-03b (Done), LTM-17 (Ready — validations/reserve.ts),
            LTM-04 (Draft — actions/reserve.ts), LTM-21 (Draft — actions/reserve.ts),
            LTM-28 (Draft — actions/reserve.ts)
```

> ⛔ **`18c` não compartilha onda com `LTM-17`, `LTM-04`, `LTM-21` nem `LTM-28`** — todas tocam
> `actions/reserve.ts` e/ou `validations/reserve.ts`. É a mesma fila que a `LTM-18` mãe já havia
> identificado, revista aqui contra o estado de hoje (`LTM-17` virou `Ready` desde então).
> ⛔ **`18c` não compartilha onda com `LTM-08`** (`number-grid.tsx`) nem com **`18a`**
> (`advanced-settings-tabs.tsx` — o bloco "Campos requeridos" vive lá, e `18c` só **lê** o esquema
> de `18a`/mãe, não precisa editar o `.tsx` do editor para esta parte; se a implementação concluir
> que precisa, a colisão com `18a` já está declarada na nota de ondas dela).
> ✅ **`18c` pode, a princípio, compartilhar onda com `18b`** — conjuntos de arquivo totalmente
> disjuntos (`18b` não toca `reserve.ts`, `number-grid.tsx` nem `expire-reservations.ts`).
> ⚠️ **`LTM-04` é XL e segue `Draft`** (cresceu com a decisão **D8** do epic, por `LTM-17.md`); não é
> o caminho crítico de `18c` ficar esperando por ela — o controlador decide a ordem de despacho
> entre as `Draft` da fila, esta story só declara que todas colidem em arquivo.

## Riscos

- **[Alto] Implementar `restrictedDdds` pelo nome do campo ou por "vazio = sem efeito" ingênuo.**
  Os dois fecham o sorteio para todo mundo ou invertem a regra da Sorteamos. Mitigado pelo achado 1
  e pelo AC3.
- **[Alto] Decidir por dedução o alcance do anti-spam.** Mitigado pelo achado 2: ficha por sorteio,
  bloqueio por operador — preserva o que já está em produção.
- **[Médio] Inventar a tela de seleção por quantidade para `initialPerReservation`.** Mitigado pelo
  achado 3 e pelo AC5: pré-seleção na grade existente, nada novo.
- **[Médio] Novos campos de formulário quebrarem o comprador recorrente.** Um comprador que já
  reservou sem CPF, numa visita a um sorteio que agora exige CPF, precisa ser pedido o dado — e a
  gravação em `users` não pode sobrescrever campo já preenchido com um formulário vazio de uma visita
  anterior. AC1 cobre o caminho feliz; este risco é a razão de a tarefa de gravação dizer
  "releitura não sobrescreve".
- **[Baixo → Médio] `maxPerBuyer` e `maxQuantityPerBuyer` contarem a mesma coisa.** A Sorteamos
  nomeia os dois separadamente ("Quantidade por Comprador" × "Quantidade de cotas por comprador");
  se divergirem em grandeza (unidades × títulos), fica `[CONFIRMAR]` na implementação, registrado
  na tarefa correspondente.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.0 | Nasce da partição da `LTM-18` (NO-GO 6/10 do @po). Cobre os oito campos do grupo A que tocam a reserva. Três achados registrados com decisão explícita: `restrictedDdds` é allowlist e o default `[]` tem de significar "sem restrição" para não fechar todo sorteio existente (viola AC5 se lido ao pé da letra); `antiSpamEnabled` é por sorteio mas o bloqueio do comprador é por operador — ficha por sorteio, alcance preservado; `initialPerReservation` promete uma tela de seleção por quantidade que não existe, resolvido por pré-seleção na grade manual. Fila de `reserve.ts`/`validations/reserve.ts` conferida story a story: `LTM-02`/`LTM-03b` entregues, `LTM-17` `Ready`, `LTM-04`/`LTM-21`/`LTM-28` `Draft` — todas colidem em arquivo com esta filha. Nota de verificação no ensaio: a autorização do founder de deixar reserva vencer e acionar `Revisar pagamentos` permite observar o AC4 ao vivo, além do teste automatizado. | @sm (River) |
