# LTM-08: A meia cota — a superfície

**Status:** Draft
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
      sem o nome da unidade. Verificável por varredura dos rótulos das seis configurações, dos
      cartões e do resumo.
- [ ] **AC3 (o anúncio não engana):** numa tela onde se compra metade, o valor que a metade
      concorre aparece **junto** do preço da metade. Teste: a página de um sorteio divisível de
      R$ 100.000 nunca exibe "R$ 100.000" como o valor de uma compra de metade.
- [ ] **AC4 (congelamento visível):** num sorteio com ao menos uma venda, o controle de
      divisibilidade aparece desabilitado **com o motivo escrito**, não apenas inerte.
- [ ] **AC5 (relatório sem ambiguidade):** nos três exports e no "Meus títulos", uma metade sai
      marcada e um título inteiro sai nu. Quem tem a metade do 42 e o 43 inteiro produz
      `42 (metade)` e `43`. O cabeçalho traz a unidade do sorteio.
- [ ] **AC6 (o operador enxerga a órfã):** o painel de um sorteio divisível mostra quantos títulos
      têm metade órfã, **antes** do sorteio, na tela que o operador já abre — não atrás de um
      filtro. Teste monta o estado e confere o número.
- [ ] **AC7 (recusa de prêmio não divisível):** tentar habilitar divisibilidade em sorteio de
      prêmio não monetário mostra o motivo, não um erro genérico.

## Escopo

**IN:** grade partida; unidade nomeada em toda contagem exibida; anúncio dos dois valores; controle
de divisibilidade no editor com congelamento e recusa; marcação da metade nos três exports e no
"Meus títulos"; contagem de metades órfãs no painel.

**OUT:** o modelo de dados, a reserva e o rateio (`LTM-07`); construir de verdade `analytics`,
`social` e `utm-links`, que são Frente B; qualquer mudança nos sorteios de cota inteira além da
regressão que prova que **não** mudaram.

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

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder, separada da `LTM-07` desde o início para não repetir o tamanho que derrubou a `LTM-03` na validação. | @aiox-master |
