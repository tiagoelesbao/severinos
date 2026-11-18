# LTM-15: As duas seções que faltam no catálogo

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P2** — não bloqueia o sorteio teste, mas é prova social que o cliente usa para vender
**Complexidade:** S — os dados já existem; falta a tela
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-paridade-visual-loja.md` § *"O catálogo tem TRÊS seções"*

## Story

**Como** comprador chegando pela primeira vez
**Eu quero** ver que a casa já sorteou e já pagou gente de verdade
**Para que** eu compre com confiança em vez de desconfiar de um catálogo que só mostra o que está à venda.

## Contexto

O catálogo da Sorteamos tem **três** blocos empilhados. Hoje o lotemania tem **um**: a consulta
em `src/app/loja/[tenant]/page.tsx` filtra `status = 'active'` e descarta o resto.

| Seção | Badge | Nosso estado |
|---|---|---|
| Campanhas ativas | verde `Adquira Já!` | ✅ existe (`LTM-10`/catálogo) |
| **Campanhas concluídas** | cinza `Concluído` | ❌ filtradas fora |
| **🎉 Ganhadores sortudos** | — | ⚠️ **existe em página própria, falta no catálogo** — ver correção |

### Correção de premissa — 2026-11-18, conferida no código

A v1.0 marcava a seção de ganhadores como *"❌ não existe"*. **Existe**, só não onde a Sorteamos a
põe: `src/app/loja/[tenant]/ganhadores/page.tsx` é uma página inteira de ganhadores, com 90 linhas,
já ligada no menu da loja.

**E ela já atende três dos cinco ACs desta story:**

| AC | Estado real | Onde |
|---|---|---|
| AC3 (mascaramento) | ✅ **já feito** — usa `maskName` e `maskPhone` de `src/lib/mask.ts` | `ganhadores/page.tsx:6` |
| AC4 (sem ganhador, sem seção) | ✅ **já feito** — *"Nenhum ganhador anunciado ainda."*, sem exemplo nem placeholder | `:46-48` |
| AC5 (ordem por `announcedAt` desc) | ✅ **já feito** | `:37` |
| AC1 (três seções no catálogo) | ❌ falta | — |
| AC2 (concluída não é comprável) | ❌ falta | — |

**O que isso muda no escopo:** esta story deixa de ser *"construir duas seções"* e passa a ser
**"trazer as concluídas para o catálogo e reusar o cartão de ganhador que já existe"**. A
complexidade **S** estava certa por acaso, e a razão é melhor do que a declarada.

> ⚠️ **Mas o AC3 ainda tem metade em aberto, e é a metade que importa.** O que existe é mascaramento
> **na exibição**. O AC3 exige que o valor completo **não apareça no HTML servido** — nem em
> atributo, nem em JSON de hidratação. A consulta em `ganhadores/page.tsx:22-36` seleciona
> `winners.phone` **inteiro** do banco e mascara depois, em componente de servidor. Se o valor
> atravessar a fronteira de serialização para qualquer componente de cliente, ele vai para o HTML.
> **Conferir isso é trabalho desta story**, e vale para a página que já existe, não só para a seção
> nova.
>
> ⚠️ **Segundo achado:** `maskPhone` devolve `(DD) ****-****`, que casa com o cartão de ganhador
> observado. **Mas a tela de pedido da Sorteamos usa `(11) 9****-****`** — com o 9 visível (ver
> `LTM-14`, achado 2). São duas máscaras, e o arquivo `src/lib/mask.ts` é **disputado** pelas duas
> stories. Ver a nota de ondas.

**As concluídas** são os sorteios do dia que já fecharam e aguardam definição de ganhador. Usam a
mesma linha com miniatura 90×110, trocando o badge verde por um cinza. Uma das observadas exibia
`RESULTADO NOS NOSSOS GRUPOS!!!` — é o `statusText` do próprio sorteio, não um rótulo fixo.

**Ganhadores** é um cartão por ganhador:

```
Marcus ***                               ← nome mascarado
🏆 01° RAPIDINHA VALENDO R$ 27.000,00!
Prêmio: R$ 27.000,00
Número da sorte: 58
Data da premiação: 11/10/2026
Telefone: (98) ****-****                 ← telefone mascarado
```

**A matéria-prima já existe.** `winners` tem `winnerName`, `phone`, `prizeDescription`,
`prizeAmount`, `winningNumber` e `announcedAt` — exatamente os seis campos do cartão. Nenhuma
coluna nova.

> **O mascaramento é da Sorteamos, não da nossa captura.** A página pública dela já mostra o nome
> truncado e o telefone parcial. É decisão de produto que vale copiar: prova social não precisa de
> telefone inteiro.

## Tarefas (Checklist)

- [ ] Consulta do catálogo passa a trazer também os sorteios concluídos, em bloco próprio.
- [ ] Badge cinza `Concluído`, com o `statusText` do sorteio quando houver.
- [ ] Seção `🎉 Ganhadores sortudos` com um cartão por linha de `winners`.
- [ ] Mascaramento de nome e telefone.
- [ ] Placeholder de foto quando o ganhador não tiver imagem — é o que a Sorteamos faz.
- [ ] `[CONFIRMAR]` quantos ganhadores a Sorteamos lista e por quanto tempo. Não observado.

## Critérios de Aceite

- [ ] **AC1 (três seções, nesta ordem):** ativas, concluídas, ganhadores. Catálogo sem concluídas
      ou sem ganhadores **omite a seção**, não mostra bloco vazio com título.
- [ ] **AC2 (concluída não é comprável):** o cartão de sorteio concluído leva à página dele, mas
      ela **não** oferece seleção de número. Regressão: sorteio ativo continua comprável.
- [ ] **AC3 (mascaramento, e no HTML):** nome sai `Primeiro ***` e telefone `(DD) ****-****`, e o
      **valor completo não aparece no HTML servido** — nem em atributo, nem em JSON de hidratação.
      O teste varre o HTML, não a tela. Mascarar na exibição e mandar o valor inteiro no payload é
      vazamento com aparência de proteção.
- [ ] **AC4 (sem ganhador, sem seção):** tenant que nunca sorteou não vê a seção — e **não** vê
      exemplo, placeholder nem "em breve".
- [ ] **AC5 (ordem dos ganhadores):** do mais recente para o mais antigo, por `announcedAt`.

## Escopo

**IN:** as duas seções, o badge cinza, o mascaramento, a ordenação.
**OUT:** cadastrar ganhador pelo painel (é fluxo do operador, outra story); foto do ganhador como
upload; paginação ou "ver todos".

## Dependências

- **Independe da fundação.** É leitura, e os dados já existem.
- Reusa o cartão de linha do catálogo.
- Reusa o cartão de ganhador de `ganhadores/page.tsx`, que **já existe** — ver correção de premissa.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/loja/[tenant]/page.tsx                  (as tres secoes)
  apps/lotemania/src/app/loja/[tenant]/winner-card.tsx           (novo — extrair de ganhadores/page.tsx)
  apps/lotemania/src/app/loja/[tenant]/ganhadores/page.tsx       (passa a usar o cartao extraido)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx    (AC2: concluida nao e compravel)
  apps/lotemania/src/lib/mask.ts                                 (DISPUTADO com a LTM-14 — ver abaixo)
  apps/lotemania/tests/loja/catalogo/**                          (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — winners ja tem os seis campos do cartao; nenhuma coluna nova

Depends-on: none
```

- ⛔ **Não pode compartilhar onda com a `LTM-14`:** as duas tocam `src/lib/mask.ts`, porque a
  Sorteamos usa duas máscaras de telefone e nós temos uma. **Saída recomendada ao @po:** uma única
  story leva as duas formas para `mask.ts` e a outra só consome. Se for esta, o arquivo sai do
  conjunto da `LTM-14`; se for a `LTM-14`, sai do daqui. Decidir **antes** do despacho, não durante.
- ⛔ **Não pode compartilhar onda com a `LTM-12`:** as duas tocam
  `[tenant]/[productSlug]/page.tsx` — a `LTM-12` para registrar a visita com o sorteio, esta para o
  AC2. Conjuntos não disjuntos.
- ✅ **Pode compartilhar onda com a `LTM-10`, `LTM-11` e `LTM-13`** — painel contra loja.
- ✅ **Não depende de nada.** É a candidata natural à primeira onda da Frente B, e a de menor risco.

## Riscos

- **[Alto] Vazar telefone de ganhador.** A página é pública e indexável. AC3 é o mínimo, e a
  política de dado pessoal de 2026-11-12 vale integralmente.
- **[Baixo] Catálogo longo demais** se houver muitos concluídos no dia. O `[CONFIRMAR]` de quantos
  listar existe por isso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` e **corrige a premissa**: a pagina de ganhadores JA EXISTE (`loja/[tenant]/ganhadores/page.tsx`) e ja atende os AC3, AC4 e AC5 -- a story encolhe para trazer as concluidas ao catalogo e reusar o cartao. Mas a metade do AC3 que importa (valor completo fora do HTML servido) continua aberta, inclusive na pagina que ja existe. | @aiox-master |
| 2026-11-17 | 1.0 | Pendência registrada a pedido do founder, para a fundação voltar a ser a prioridade. | @aiox-master |
