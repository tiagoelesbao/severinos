# LTM-18a: A medição, o inventário e a varredura que vira teste

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade) · filha 1 de 3 da partição da `LTM-18`
**Prioridade:** **P0** — maior relação valor/risco do epic hoje (@po, 2026-11-18/20): um arquivo, zero
migração, faz a tela parar de mentir sem ligar nada
**Complexidade:** **S** — nenhuma lógica de negócio nova; medição + um teste de inventário + ajuste
visual
**Criada por:** @sm (River) · 2026-11-20, partindo a `LTM-18` por ordem do @po (NO-GO 6/10,
indespachável como XL)
**Substitui:** a parte de medição/inventário/AC1 da `LTM-18` · irmãs: `LTM-18b`, `LTM-18c`

> **Esta filha não liga nenhum dos 36 campos.** Ela mede, inventaria e constrói a rede que impede o
> 46º campo de nascer inerte. As 15 do grupo A que mudam comportamento de verdade são das suas irmãs
> — `LTM-18b` (exibição) e `LTM-18c` (reserva).

## Story

**Como** River, partindo a `LTM-18` por ordem do @po
**Eu quero** entregar a medição visual, o inventário por aba e a varredura de "campo sem leitor"
como teste versionado
**Para que** `18b` e `18c` tenham onde apontar evidência, e para que nenhum campo futuro nasça
inerte sem que a suíte o denuncie.

## Por que esta é a primeira a sair, e por que ela sozinha não basta

O @po priorizou esta parte da antiga `LTM-18` como **"a maior relação valor/risco do epic"**
(`LTM-18.md`, Priorização 2026-11-18): toca **um** arquivo de produto (`advanced-settings-tabs.tsx`)
e um documento, não liga nenhum campo, e portanto **não tem a condição de entrada** que `18b`/`18c`
têm (consultar `advanced_settings` gravado em sorteio real — aqui não há sorteio real tocado).

O que ela não é: um "marcar como não implementado" — essa saída deixou de existir na decisão do
founder de 2026-11-18 (*"implemente todas as 36"*). O que sobra, e é o que importa, é a **varredura
virando teste**: sem ela, a `LTM-18` conserta o passado e não protege o futuro.

## Identidade visual — decisão do founder, 2026-11-20

> **Textual:** *"cópia do que está no ar hoje."*

Era a última pendência aberta da §4 do epic. Para esta story ela fixa o **alvo** da medição: **a
loja/o painel da Sorteamos como estão no ar agora**, lidos do HTML/CSS servido com
`getComputedStyle` — no padrão já usado em `docs/research/2026-11-17-paridade-visual-loja.md` —, e
**não** uma interpretação de como "deveriam" ficar. Nenhum valor desta story entra sem a linha do
documento de medição que o sustenta (AC6 original, preservado abaixo como AC3).

## O que já existe, medido em código hoje

| Peça | Onde | Estado |
|---|---|---|
| O editor com as 14 abas e os 45 campos | `apps/lotemania/src/app/dashboard/products/[id]/advanced-settings-tabs.tsx` | existe, 850 linhas |
| O esquema com os 45 campos | `apps/lotemania/src/lib/validations/product-settings.ts` | existe |
| A classificação em grupos A/B/C/D | `LTM-18.md` | existe, **corrigida para 36** (`showRandomSelectionOption` entrou no grupo D, @po 2026-11-20) |
| Uma varredura de "campo sem leitor" | — | **não existe como teste**; existiu como grep manual único, uma vez, em 2026-11-18 |

## Tarefas (Checklist)

- [ ] **Documento de medição visual** (novo, `docs/research/2026-11-20-paridade-visual-editor-sorteio.md`):
      para cada aba do editor, lido com `getComputedStyle` na Sorteamos ao vivo e no lotemania —
      altura de linha, corpo e cor do rótulo, dimensão do `Switch`/`Select`, espaçamento entre
      blocos, largura do campo. Alvo é a Sorteamos **como está no ar**, decisão do founder acima.
- [ ] **Inventário tela-a-tela** (mesmo documento ou anexo): para cada um dos 45 campos de
      `product-settings.ts`, a aba onde ele vive (já declarado nos grupos A/B/C/D da `LTM-18`; aqui
      é conferência campo a campo contra o `.tsx`, com linha).
- [ ] **A varredura vira teste versionado** (AC1 original): script que enumera os campos de
      `productAdvancedSettingsSchema` e procura, no código-fonte de `apps/lotemania/src`, um leitor
      de cada campo **fora** de `product-settings.ts` e de `advanced-settings-tabs.tsx`. Roda na
      suíte (`npm run test`).
- [ ] **Ajuste visual** em `advanced-settings-tabs.tsx`: altura de linha, corpo do rótulo e
      espaçamento, conforme o documento de medição — **nenhum valor por impressão** (AC6 da `LTM-18`
      original; já produziu regressão em produção nesta migração).

## Critérios de Aceite

- [ ] **AC1 (a varredura é teste, não memória):** existe um arquivo de teste que enumera os 45
      campos do esquema e, para cada um, decide "tem leitor fora do editor" ou "não tem". O teste
      **falha** se executado contra o estado de 2026-11-18 (36 sem leitor) e deve ficar **verde**
      somente depois que `18b` e `18c` ligarem os 15 do grupo A — ou seja, este teste nasce
      **vermelho de propósito** e é isso que prova que ele mede algo real. ⚠️ **Não é um teste que
      esta filha precisa fazer passar** — ela cria a régua; `18b`/`18c` são quem a zera para os 15
      campos deles. Os campos dos grupos B/C/D continuam aparecendo na lista até as stories deles
      existirem (fora do mandato desta partição — ver Escopo).
- [ ] **AC2 (a lista hoje é exatamente a da mãe):** o teste do AC1, rodado **antes** de `18b`/`18c`
      aterrarem, devolve exatamente os 36 nomes de campo listados em `LTM-18.md` §"Os 36,
      classificados" (grupos A+B+C+D), nem um a mais nem um a menos. É a prova de que a conta fecha
      e de que `showRandomSelectionOption` está contado (grupo D).
- [ ] **AC3 (o visual sai da medição):** cada valor alterado em `advanced-settings-tabs.tsx` aponta,
      em comentário, para a linha do documento de medição que o mediu, e o alvo registrado no
      documento é a Sorteamos **como está no ar** (decisão do founder, 2026-11-20) — não uma
      dedução.
- [ ] **AC4 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Escopo

**IN:** o documento de medição + inventário; a varredura virando teste versionado; o ajuste visual
de `advanced-settings-tabs.tsx` conforme a medição.

**OUT:**

- **Ligar qualquer um dos 36 campos.** É `18b` (exibição) e `18c` (reserva), para os 15 do grupo A.
  Os grupos B (8), C (11+1) e D (2, com `reservationModel`) continuam fora do mandato desta
  partição — são stories próprias nascidas do inventário da `LTM-19`, como a `LTM-18` mãe já
  registra.
- **Marcar qualquer campo como "não implementado" na interface.** Essa saída não existe desde a
  decisão do founder de 2026-11-18.

## Dependências

- **Nenhuma dependência de negócio.** Não liga campo, não consulta `advanced_settings` de sorteio
  real — a condição de entrada que `18b`/`18c` carregam não se aplica aqui.
- **Depende da `LTM-17` por colisão de arquivo (ver Files).**

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/dashboard/products/[id]/advanced-settings-tabs.tsx   (so ajuste visual —
                                                                               nenhum campo novo)
  docs/research/2026-11-20-paridade-visual-editor-sorteio.md                  (novo)
  apps/lotemania/tests/dashboard/editor-sorteio/campo-sem-leitor.test.ts      (novo)

Resources:
  NENHUM banco, NENHUMA migracao, NENHUMA porta — a varredura le arquivo-fonte, nao banco.

Depends-on: LTM-17 (colisao de arquivo, ver abaixo)
```

> ⚠️ **`advanced-settings-tabs.tsx` é o arquivo mais disputado do epic agora, e são QUATRO partes
> disputando-o nesta mesma semana — conferido no código de cada uma, não deduzido:**
>
> | Story | Status | O que toca no arquivo |
> |---|---|---|
> | **`LTM-17`** | `Ready` | `:414-430` — as oito opções de "Tempo para uma reserva pendente expirar" (D2) |
> | **`LTM-08`** | `Ready` | *"a unidade nomeada nas seis configurações + o marcador de divisibilidade"* (`LTM-08.md`, bloco `Files:`) — e ela mesma já declara, por escrito: *"⛔ Não compartilha onda com a `LTM-17` nem com a `LTM-18a`/`18c` — as três querem `advanced-settings-tabs.tsx`"* |
> | **`18a`** (esta) | `Draft` | só o ajuste visual (altura de linha, rótulo, espaçamento) — nenhuma lógica |
> | **`18c`** (irmã) | `Draft` | o bloco "Campos requeridos para realizar a reserva" ganha o fluxo de coleta — ver `LTM-18c.md` |
>
> **A ordem não é opção, é dado:** `LTM-17` e `LTM-08` já estão `Ready` hoje e **as duas** se
> declararam incompatíveis com esta filha no mesmo arquivo. `18a` entra **depois das duas**,
> qualquer que seja a ordem entre elas — não há aresta entre `LTM-17` e `LTM-08` que esta story
> precise resolver, só a de chegar depois.
> ⛔ **`18a` não compartilha onda com `LTM-17` nem com `LTM-08`.**
> ⛔ **`18a` não compartilha onda com `18c`** (mesmo arquivo, blocos de aba diferentes — mesma regra
> de arquivo-completo da `parallel-waves.md`: linha diferente não é conjunto disjunto).
> ✅ **`18a` pode compartilhar onda com `18b`** — conjuntos de arquivo totalmente disjuntos
> (`18b` não toca `advanced-settings-tabs.tsx`).

## Riscos

- **[Médio] O ajuste visual ser feito por impressão em vez de medição.** Já aconteceu nesta
  migração e produziu regressão em produção. Mitigação: AC3, com a linha do documento citada em
  comentário no código.
- **[Baixo] A varredura do AC1 esquecer de excluir a própria declaração e o próprio editor como
  "leitor".** Um campo lido só por `product-settings.ts` (o `.default()`) ou só por
  `advanced-settings-tabs.tsx` (o `set(...)`) não tem leitor de verdade — é exatamente o estado
  medido em 2026-11-18. O teste precisa excluir os dois arquivos da busca por leitor, não só o
  primeiro.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.0 | Nasce da partição da `LTM-18` (NO-GO 6/10 do @po — indespachável, `Files:` de 8 entradas, `Depends-on` de quatro stories). Esta é a filha sem lógica de negócio: medição, inventário e a varredura do AC1 virando teste versionado. Incorpora a decisão do founder de 2026-11-20 sobre identidade visual (*"cópia do que está no ar hoje"*) como alvo da medição, e declara a colisão real em `advanced-settings-tabs.tsx` contra `LTM-17` e `LTM-08`, ambas `Ready` e ambas já cientes da colisão pelo próprio texto da `LTM-08`. | @sm (River) |
