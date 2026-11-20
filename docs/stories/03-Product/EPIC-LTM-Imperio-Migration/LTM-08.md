# LTM-08: A meia cota — a superfície

**Status:** Ready
> ✅ **Revalidada pelo @po em 2026-11-20 — GO (8/10). `Draft` → `Ready`.** O **único** item que a
> travava em 11-17 era o bloco `Files:`, e ele foi recusado então por uma razão certa: *"não vou
> inventar a lista a partir das tarefas"*. **Hoje ela não se inventa, se mede** — a `LTM-07` está
> entregue (`4d18f17a`), as superfícies existem no disco e cada caminho abaixo foi conferido um a um.
> A dependência bloqueante **caiu**, e a story saiu de *"não está no caminho crítico"* para **dentro
> dele**: o founder mandou que o ensaio ponta a ponta **inclua meia cota**, e hoje a meia cota é
> **inalcançável pela interface em três pontos**, não um. Ver *Revalidação @po (2026-11-20)*.
**Epic:** EPIC-LTM-Imperio-Migration (Frente C)
**Prioridade:** **P0** — a feature existe quando o comprador consegue comprar e o operador consegue conferir
**Complexidade:** M — grade, unidade na interface, anúncio, relatório, aviso de órfã
**Criada por:** @aiox-master · 2026-11-17, a partir do `/grill-with-docs` com o founder
**Par:** `LTM-07` (o domínio) · **Decisão:** `docs/architecture/adr/0001-meia-cota-como-linha.md`

## Story

**Como** comprador de uma Rapidinha de 100 mil
**Eu quero** entender, sem esforço, o que estou comprando e a quanto estou concorrendo
**Para que** eu não descubra depois que paguei metade e concorro a metade — achando que concorria ao valor que vi na tela.

## Contexto

A `LTM-07` define o domínio. Esta é a parte que **chega às pessoas** — e é onde o erro é caro de
um jeito diferente: um bug de reserva perde um pedido, um número ambíguo na tela ou no relatório
vira disputa com o ganhador.

### A armadilha das contagens

Existem **seis** configurações de contagem por sorteio, todas em `advancedSettings`:
`minPerReservation`, `maxPerReservation`, `maxPerBuyer`, `maxQuantityPerBuyer`,
`initialPerReservation` e `quickBuyCards` (hoje `[5, 10, 50, 100, 500, 1000]`).

Num sorteio divisível, "comprar 10" dá **10 metades — cinco títulos** — enquanto o cartão sugere
dez de alguma coisa. A decisão (ADR-0001, `GLOSSARY.md` → **unidade**): **uma unidade por
sorteio, sempre nomeada**. A interface escreve o nome da unidade em vez de deixar o número solto.

### A armadilha do anúncio

Mostrar "R$ 100.000" ao lado do preço da metade induz a erro: a pessoa compra achando que concorre
ao valor cheio. Isso cai em `.claude/rules/claims-ledger.md` — afirmação que não se sustenta não
sai, e valor inflado é prática enganosa.

## Tarefas (Checklist)

- [ ] **Grade partida**: um botão por título, dividido ao meio, cada banda clicável e colorida por
      conta própria. O comprador continua vendo cem títulos.
- [ ] **Unidade nomeada** nas seis configurações, nos cartões de compra rápida, na barra de
      progresso e no resumo do carrinho.
- [ ] **Anúncio dos dois valores** lado a lado com o que se está comprando.
- [ ] **Editor do sorteio**: o marcador de divisibilidade, com o congelamento visível (desabilitado
      e com motivo depois da primeira venda) e a recusa para prêmio não divisível.
- [ ] **Metade marcada** nos três exports por sorteio (Vendas, Expirados, Participantes) e na
      consulta "Meus títulos" do comprador.
- [ ] **Contagem de metades órfãs** no painel do sorteio, visível sem o operador procurar.

## Critérios de Aceite

- [ ] **AC1 (a grade é honesta):** em sorteio divisível, cada título renderiza duas bandas
      independentes; clicar numa não seleciona a outra; o estado de cada banda reflete o da sua
      metade. Em sorteio de cota inteira a grade renderiza **exatamente como hoje** — regressão
      visual.
- [ ] **AC2 (nenhum número solto):** nenhuma contagem exibida ao comprador ou ao operador aparece
      sem o nome da unidade. Verificável por varredura dos rótulos das seis configurações e do
      resumo do carrinho.
  - **Recorte do @po (2026-11-20), mesma classe de correção do AC5.** O AC citava *"os cartões de
    compra rápida"*. **Eles não existem**: `quickBuyCards` aparece em **um** arquivo em todo o
    repositório — a própria declaração, `product-settings.ts:30` — e em nenhuma tela. É um dos **8**
    campos do **grupo B** da `LTM-18` (*"prometem uma tela que não existe"*). A unidade nomeada nos
    cartões entra como **condição de aceite da story que construir os cartões**, e está registrada
    no `OUT`.
    - **Nesta story:** as seis configurações (que existem em
      `advanced-settings-tabs.tsx`), a barra de progresso **se e quando existir**, e o resumo do
      carrinho na grade.
- [ ] **AC3 (o anúncio não engana):** numa tela onde se compra metade, o valor que a metade
      concorre aparece **junto** do preço da metade. Teste: a página de um sorteio divisível de
      R$ 100.000 nunca exibe "R$ 100.000" como o valor de uma compra de metade.
- [ ] **AC4 (congelamento visível):** num sorteio com ao menos uma venda, o controle de
      divisibilidade aparece desabilitado **com o motivo escrito**, não apenas inerte.
- [ ] **AC5 (relatório sem ambiguidade):** em **todo artefato de saída que existir no fim desta
      story**, uma metade sai marcada e um título inteiro sai nu. Quem tem a metade do 42 e o 43
      inteiro produz `42 (metade)` e `43`. O cabeçalho traz a unidade do sorteio.
  - **Recorte do @po (2026-11-17), porque o AC original era insatisfazível.** Dos quatro artefatos
    citados, **um existe**: `src/app/loja/[tenant]/meus-titulos` (conferido). O relatório que
    existe é `generateReport` (`src/lib/actions/reports.ts:15`, colunas
    `Data, Pagos, Reservados, Expirados, Faturamento` — agregado por dia, **não lista número**).
    Os **três exports por sorteio** (Vendas, Expirados, Participantes) **ainda não foram
    construídos**: são Frente B, hoje despriorizada e com escopo "a definir" no epic. Um AC não
    pode exigir marcação em export inexistente.
    - **Nesta story:** "Meus títulos" e qualquer coluna de número que a story introduza.
    - **Na Frente B:** a regra do `GLOSSARY` → *metade marcada* entra como **condição de aceite dos
      três exports quando eles forem escritos**, e isso precisa ficar registrado lá — não aqui,
      pendurado num AC que ninguém pode fechar.
- [ ] **AC6 (o operador enxerga a órfã):** o painel de um sorteio divisível mostra quantos títulos
      têm metade órfã, **antes** do sorteio, na tela que o operador já abre — não atrás de um
      filtro. Teste monta o estado e confere o número.
- [ ] **AC7 (recusa de prêmio não divisível):** tentar habilitar divisibilidade em sorteio de
      prêmio não monetário mostra o motivo, não um erro genérico.

## Escopo

**IN:** grade partida; unidade nomeada em toda contagem exibida; anúncio dos dois valores; controle
de divisibilidade no editor com congelamento e recusa; marcação da metade no "Meus títulos" e em
qualquer saída que esta story introduza; contagem de metades órfãs no painel.

**OUT:** o modelo de dados, a reserva e o rateio (`LTM-07`); construir de verdade `analytics`,
`social` e `utm-links`, que são Frente B; **construir os três exports por sorteio** (Vendas,
Expirados, Participantes) — são Frente B, e a regra da metade marcada entra como condição de aceite
deles **lá** (ver nota do AC5); qualquer mudança nos sorteios de cota inteira além da regressão que
prova que **não** mudaram.

## Dependências

- **Depende de `LTM-07` (bloqueante).** A superfície mostra o que o domínio define; construir a
  grade antes de a metade existir é desenhar contra um modelo que ainda pode mudar.
- **Independe de `LTM-03a/b` e `LTM-04`** — conjuntos de arquivo disjuntos (componentes da loja e
  do painel, contra rotas de API e schema de pagamento/atribuição).
- **Não gera migração** — não disputa o journal do Drizzle.

## Riscos

- **[Alto] Anúncio ambíguo.** É o risco com consequência fora do software: cliente que compra
  metade achando que concorre ao valor cheio tem queixa legítima, e isso é prática enganosa pelo
  CDC. AC3 existe por isso.
- **[Médio] Export ambíguo.** `42` para uma metade vira disputa na hora de pagar o prêmio. AC5.
- **[Médio] Regressão na grade dos sorteios atuais.** São 5 rodadas simultâneas em produção. AC1
  exige a regressão explícita.
- **[Baixo] Grade partida no celular.** A banda de cada metade precisa continuar clicável num alvo
  de toque usável — a grade já é de sete colunas.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-17)

**Veredicto: GO condicional — 7/10.** Permanece `Draft` até **um** item ser fechado: o bloco
`Files:`. A correção de escopo do AC5 já foi aplicada nesta validação.

É uma story honesta e bem recortada. O AC3 (o anúncio não engana) e o AC1 (regressão da grade de
cota inteira) são as duas travas certas nos dois lugares onde o erro é caro de verdade — um com
consequência fora do software, outro com 5 rodadas simultâneas em produção. A invocação de
`.claude/rules/claims-ledger.md` no anúncio é apropriada: valor inflado ao lado do preço da metade
é prática enganosa, não só UX ruim.

### Correção aplicada: o AC5 era insatisfazível

Exigia marcação da metade *"nos três exports"* por sorteio. **Eles não existem.** Conferido hoje:
`src/lib/actions/reports.ts` tem **uma** função, `generateReport`, e ela devolve um agregado por dia
(`Data, Pagos, Reservados, Expirados, Faturamento`) — não lista número nenhum. Os três relatórios
por sorteio estão listados no epic como **Frente B, despriorizada, "a definir"**.

"Meus títulos" **existe** (`src/app/loja/[tenant]/meus-titulos`) e continua no AC. O resto migrou
para condição de aceite da Frente B, registrada no OUT. Um AC que depende de trabalho não
especificado em outra frente é um AC que trava a story sem defeito nenhum nela.

### O item que falta

**Bloco `Files:`/`Resources:`/`Depends-on:`**, no padrão da `LTM-03a`. A story diz, corretamente,
que é disjunta de `03a`/`04` e que não gera migração — mas **não lista um arquivo**. Não vou
inventar a lista a partir das tarefas: inferir conjunto de arquivo foi exatamente o que derrubou a
`LTM-03`, quando a validação achou um terceiro consumidor
(`src/lib/validations/payment-gateway.ts`) fora do conjunto suposto. Quem escreve a story declara.

Não está no caminho crítico: esta story é bloqueada pela `LTM-07` de qualquer forma.

### Dois pontos de atenção, não bloqueantes

1. **AC2 não é automatizável como está.** *"Verificável por varredura dos rótulos"* é inspeção
   humana. As seis configurações estão nomeadas, o que salva o AC — mas vale converter a varredura
   numa lista enumerada no Dev Record, como o AC7 da `LTM-05` fez para os ramos de falha. Caixinha
   marcável é o risco.
2. **AC6 (o operador enxerga a órfã)** depende de a contagem de metades órfãs ser consultável, o que
   depende da chave de unidade que a `LTM-07` ainda não fechou. Herdado, não defeito daqui.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ⚠️ sem bloco `Files:` |
| Estrutura de arquivos / árvore | ⚠️ disjunção afirmada, conjunto não declarado |
| UI/Frontend | ✅ é a força da story — grade, unidade, anúncio, congelamento visível |
| Satisfação dos ACs | ✅ após a correção do AC5 |
| Instruções de teste | ⚠️ AC2 por varredura manual |
| Segurança | ✅ claims-ledger invocado onde devia |
| Sequência de tarefas | ✅ |
| Duplicação funcional | ✅ nenhum arquivo em disputa |
| Anti-alucinação | ✅ as seis configurações e o `quickBuyCards` conferem com o código |
| Prontidão para @dev | ⚠️ bloqueada pela `LTM-07` |

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder, separada da `LTM-07` desde o início para não repetir o tamanho que derrubou a `LTM-03` na validação. | @aiox-master |
| 2026-11-17 | 1.1 | **Validada — GO condicional (7/10). Permanece `Draft` até o bloco `Files:` ser declarado.** AC5 recortado: exigia marcação da metade em três exports que não existem (Frente B); fica com "Meus títulos", e a regra da metade marcada migra para condição de aceite da Frente B. | @po (Pax) |
