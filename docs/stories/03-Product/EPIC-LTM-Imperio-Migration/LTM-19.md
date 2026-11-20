# LTM-19: O inventário completo da Sorteamos

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade Total) · **primeira entrega do mandato de 2026-11-18**
**Prioridade:** **P0** — é o que transforma *"absolutamente tudo"* de intenção em lista
**Complexidade:** **L** — não é difícil, é longo e exige disciplina de registro
**Criada por:** @aiox-master · 2026-11-18, a partir da decisão do founder
**Evidência de partida:** `docs/research/2026-11-16-baseline-sorteamos/`, `2026-11-17-painel-sorteamos-editor.md`, `2026-11-17-painel-acoes-por-sorteio.md`, `2026-11-17-paridade-visual-loja.md`

## Por que esta story existe

O founder decidiu em 2026-11-18: **implementar as 36 configurações inertes e tudo que a Sorteamos
tem — absolutamente tudo replicado.**

**Não se replica o que ninguém enumerou.** Hoje o que existe são quatro documentos de pesquisa, cada
um feito para responder a uma pergunta específica: o editor, as ações por sorteio, a loja, a
baseline. Juntos eles cobrem uma parte — e **ninguém sabe qual parte**, porque nunca houve a lista
contra a qual comparar.

Sem inventário, *"absolutamente tudo"* tem dois destinos, os dois ruins:

1. **Trabalho sem fim conhecido** — cada descoberta nova vira escopo novo, e a frente nunca fecha
   porque não há definição de fechada.
2. **Implementação por dedução** — alguém encontra uma chave chamada `instantPrizesEnabled`,
   imagina o que ela fazia, e constrói isso. É inventar no caminho do prêmio, que é o oposto de
   replicar. O `AC7` da `LTM-18` existe contra isso, e **esta story é a fonte que ele consulta**.

### O teste que o próprio founder deu

Na mesma frase em que mandou replicar tudo, ele deu o critério: *"não será impedimento para
**cadastrarmos tudo que tem na Sorteamos atualmente**"*.

Isso é melhor que qualquer lista de features, porque **passa ou falha**: pegar os sorteios que a
Sorteamos tem hoje, com a configuração que têm hoje, recriá-los no lotemania, e cada controle se
comportar igual. É o portão **G8** do epic, e esta story levanta o material que ele exige.

## Story

**Como** quem vai construir a paridade total
**Eu quero** uma lista fechada de tudo que a Sorteamos faz — tela, controle, ação e comportamento
**Para que** "absolutamente tudo" tenha um fim conhecido, e nada seja construído por dedução.

## Escopo

**IN — o inventário, em quatro camadas:**

| Camada | O que registrar |
|---|---|
| **Telas** | toda rota do painel e da loja: caminho, título, a que serve |
| **Controles** | todo campo, chave, seletor e botão de cada tela: rótulo exato, tipo, valores possíveis, valor padrão |
| **Comportamento** | o que cada controle **faz** quando muda — observado, não suposto |
| **Dados** | a configuração real dos sorteios que o Império tem hoje, que é o material do portão G8 |

**OUT:**

- **Implementar qualquer coisa.** Esta story não escreve uma linha de `apps/lotemania/src/`.
- **Decidir o que entra na paridade.** O inventário registra o que existe; **o founder decide** o
  que é replicado e em que ordem. Lista não é backlog.
- **A API e o banco da Sorteamos.** Isto é inventário do que se **vê e se faz**, não engenharia
  reversa da implementação dela.

## Como observar — e os limites que o founder já impôs

O founder autorizou a navegação com duas regras, registradas e **mantidas**:

> *"só não faça ações que impactam diretamente em sorteios ativos, de resto pode clicar e
> visualizar tudo que for preciso, inclusive fazer downloads, gerar relatórios"*
>
> *"pode navegar clicando para ver o que cada ação faz, só não altere nada"*

**O que isso permite:** abrir toda tela, ler todo controle, baixar relatório, gerar export.

**O que isso proíbe, e é onde o inventário vai doer:** as ações **mutantes** não podem ser
executadas em sorteio ativo. Já são conhecidas duas — *"Ativar títulos premiados"* e *"Revisar
pagamentos"* (`LTM-11`, itens 11 e 13) — e vai haver mais.

**A saída, e ela precisa da decisão do founder:** observar as mutantes **num sorteio concluído ou
num sorteio criado só para isso**. Sem essa saída, elas ficam permanentemente `[CONFIRMAR]` — e aí
*"absolutamente tudo"* tem um buraco estrutural, não um atraso. **Esta é a pergunta mais importante
desta story**, e está no fim, em *Decisão pendente*.

## O sorteio de observação — protocolo

**Autorizado pelo founder em 2026-11-18:** *"pode criar então, se for preciso, um sorteio privado
sem divulgação, e na sequência já exclua ele rápido… cuidado para não fazer nada que comprometa o
sistema ou acarrete em confusões, por exemplo o sorteio acabar ficando público e alguém de fato
comprar ou algo desse tipo"*.

O risco que ele nomeou é o risco certo, e é o único que importa: **um sorteio de teste virar
comprável.** Se isso acontecer, não é um incidente nosso — é um cliente real pagando por um título
que não existe, no sistema de um negócio que movimenta ~R$ 90 mil/dia.

### A regra que torna o protocolo seguro

**Verificar a invisibilidade ANTES de criar, não depois.** A ordem importa: conferir depois é
descobrir o vazamento com ele já no ar. Então a primeira ação não é criar — é **abrir o formulário
de criação e ler quais controles decidem a visibilidade**, sem submeter.

> ⛔ **Se não for possível garantir que o sorteio nasce invisível, o sorteio NÃO é criado.** Essa é
> a trava, e ela vale mesmo ao custo de as ações mutantes ficarem `[CONFIRMAR]`. Buraco no
> inventário é um problema nosso; comprador pagando por título inexistente é um problema do cliente.

### Antes de criar

- [ ] Ler o formulário de criação **sem submeter**, e identificar **todo** controle que afeta
      visibilidade: status do sorteio, "mostrar na página inicial", início das vendas, data do
      sorteio, publicação.
- [ ] Conferir **em qual estado um sorteio nasce** — se nasce ativo, qual é o caminho para que não
      nasça.
- [ ] Abrir a **loja pública** e registrar o catálogo **antes**, para ter a linha de base de
      comparação.

### Ao criar

- [ ] Status: **o mais inativo que o sistema aceitar** (rascunho/inativo). Nunca "ativo".
- [ ] "Mostrar na página inicial": **desligado**.
- [ ] Início das vendas: **agendado para data futura**, nunca "imediatamente" — é a segunda camada,
      independente do status, e o que salva se o status não bastar.
- [ ] Título inequívoco: algo como `ZZ TESTE TECNICO - NAO COMPRAR - <data>`. Se vazar, pelo menos
      vaza dizendo o que é.
- [ ] Menor quantidade de números e menor valor que o sistema aceitar.
- [ ] **Nenhuma divulgação**: link não sai daqui, não vai a grupo, não vai a rede social.

### Logo depois de criar — a conferência que não pode ser pulada

- [ ] Abrir a **loja pública** e confirmar que o sorteio **não aparece** no catálogo.
- [ ] Tentar abrir a **URL direta** do sorteio e registrar o que acontece — se abrir e permitir
      selecionar número, **a invisibilidade falhou** e o sorteio é excluído **imediatamente**, antes
      de qualquer observação.

### A observação

- [ ] Executar as ações mutantes **somente neste sorteio**, uma de cada vez, registrando antes e
      depois.
- [ ] **Nenhuma ação em qualquer outro sorteio** — a regra do founder vale integralmente.

### A exclusão

- [ ] Excluir **assim que a observação terminar**, na mesma sessão. Não deixar para depois: sorteio
      de teste esquecido no painel é exatamente a "confusão" que o founder pediu para evitar.
- [ ] Confirmar a exclusão na lista de sorteios.
- [ ] Conferir a loja pública **de novo**, depois da exclusão.
- [ ] Registrar no inventário **tudo** que foi criado, clicado e excluído, com horário.

### O que este sorteio **não** vai conseguir mostrar

Honestidade sobre o limite, para a expectativa não ser frustrada depois: um sorteio recém-criado
tem **zero compras**. Então *"Revisar pagamentos"* — cujo subtítulo é *"reprocessar todas as compras
expiradas"* — provavelmente **não terá o que reprocessar**, e vai mostrar o fluxo da ação, não o
efeito dela.

Observar o **efeito** exigiria uma compra expirada no sorteio de teste, isto é, reservar números e
deixar expirar. Isso é factível — a reserva não cobra ninguém —, mas é **passo a mais, com decisão
própria do founder**, e não está autorizado por enquanto. Fica registrado como o que falta para
aquele item específico sair de `[CONFIRMAR]`.

## Tarefas (Checklist)

- [ ] **Mapa de rotas:** toda tela do painel e da loja da Sorteamos, com caminho e propósito.
- [ ] **Inventário de controles**, tela a tela, aba a aba: rótulo exato (com acento), tipo, valores,
      padrão.
- [ ] **Comportamento observado** de cada controle que puder ser observado sem mutar sorteio ativo.
- [ ] **Lista das ações mutantes** não executáveis, cada uma com o que falta para observá-la.
- [ ] **Configuração real dos sorteios de hoje** do Império — o material do portão G8.
- [ ] **Comparação com o lotemania:** para cada item, existe / existe mas não funciona / não existe.
- [ ] **Consolidar as quatro pesquisas já feitas** no inventário, marcando o que elas já cobrem —
      para não remedir o que foi medido.

## Critérios de Aceite

- [ ] **AC1 (toda tela listada tem caminho):** cada entrada do inventário traz a rota literal. Tela
      citada sem rota não é inventário, é lembrança.
- [ ] **AC2 (rótulo exato, com acento):** os rótulos são transcritos como aparecem, não
      parafraseados. É o que permite a comparação byte a byte que a `LTM-13` já exigiu do CSV.
- [ ] **AC3 (observado × suposto, sempre separados):** todo item diz qual dos dois é. Um item sem
      marca é defeito do inventário. **É o AC central desta story:** um inventário que mistura o que
      se viu com o que se imagina é pior que inventário nenhum, porque dá confiança falsa a quem
      implementa depois.
- [ ] **AC4 (as mutantes aparecem como buraco nomeado):** toda ação que não pôde ser executada está
      listada **com o motivo e com o que falta**. Ela não some da lista por não ter sido observada.
- [ ] **AC5 (a comparação é tripla, não binária):** cada item é *existe e funciona*, *existe e não
      funciona*, ou *não existe*. A coluna do meio é a que esta frente inteira descobriu que existe
      — 36 campos moram nela — e um inventário de duas colunas a esconderia.
- [ ] **AC6 (o material do G8 está levantado):** a configuração dos sorteios reais de hoje está
      registrada, campo a campo, pronta para o exercício de recriação.
- [ ] **AC7 (nada é alterado na Sorteamos):** nenhuma ação mutante executada em sorteio ativo.
      Registrar, no documento, o que foi clicado — a trilha protege a operação do cliente **e** quem
      navegou.
- [ ] **AC8 (dado pessoal não entra no inventário):** relatórios baixados durante a observação
      contêm CPF, telefone e e-mail de compradores reais (`LTM-13`: sete das 25 colunas). O
      inventário registra **estrutura** — nome de coluna, formato, separador — **nunca conteúdo**, e
      os arquivos baixados não entram no repositório. A política de 2026-11-12 vale integralmente, e
      este repositório é **público**.

## Entregável

```
docs/research/2026-11-18-inventario-sorteamos/
├── README.md              índice e método; o que cada arquivo cobre
├── rotas.md               o mapa de telas
├── painel/*.md            inventário de controles, uma tela por arquivo
├── loja/*.md              idem, lado do comprador
├── comportamento.md       o que cada controle faz — observado
├── nao-observado.md       as mutantes e o que falta para cada uma
└── comparacao.md          Sorteamos × lotemania, nas três colunas do AC5
```

## Dependências

- **Independe de tudo no código.** Não toca `apps/lotemania/`.
- **Bloqueia a implementação dos grupos B e C da `LTM-18`** — são 19 itens que ninguém sabe
  descrever sem observar.
- **Não bloqueia o grupo A** (15 campos): o comportamento esperado deles é dedutível do próprio
  nome e do schema, e a `LTM-18` já os tem descritos.
- **Não bloqueia a Frente A.** A fundação segue na frente; sem fechar pedido pago, nenhuma
  configuração faz o lotemania vender.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  docs/research/2026-11-18-inventario-sorteamos/**    (novo, so documentacao)

Resources:
  painel da Sorteamos  — RECURSO EXTERNO E COMPARTILHADO: e o sistema de PRODUCAO do cliente.
                         Uma sessao de observacao por vez. Nenhuma acao mutante em sorteio ativo.
  sessao do founder    — a navegacao depende do login dele estar ativo

Depends-on: none
```

- ✅ **Pode correr em paralelo com qualquer story de código.** Conjunto de arquivos totalmente
  disjunto — é a única story do epic que não disputa nada em `apps/lotemania/`.
- ⚠️ **O painel da Sorteamos é produção do cliente.** Duas observações simultâneas não se atrapalham
  tecnicamente, mas duplicam carga e risco numa operação que movimenta ~R$ 90 mil/dia. **Uma de
  cada vez.**

## Riscos

- **[Alto] O inventário misturar observado com suposto.** É o modo de falhar que anula a story
  inteira: quem implementa depois confia, e constrói o imaginado. AC3 é a única defesa, e ela
  depende de disciplina de registro, não de ferramenta.
- **[Alto] Dado pessoal de comprador real entrar no repositório público.** Os relatórios têm CPF. Já
  aconteceu nesta casa — 320 MB de dado pessoal quase entraram no git. AC8 é o mínimo.
- ~~**[Médio] As mutantes ficarem permanentemente não observadas.**~~ **MITIGADO em 2026-11-18**: o
  founder autorizou o sorteio de teste, ele foi criado e `Ativar títulos premiados` foi observado com
  efeito medido. **E a D5 de 11-19 o mantém no ar**, então o instrumento de observação continua
  disponível. Resta **um** item (`Revisar pagamentos`), e o que falta para ele não é decisão sobre o
  sorteio — é autorização para deixar uma reserva expirar nele.
- **[Médio] O inventário envelhecer antes de ser usado.** A Sorteamos é um produto vivo. O
  inventário é **fotografia datada**, e tem de dizer isso na primeira linha de cada arquivo.
- **[Baixo] Remedir o que já foi medido.** As quatro pesquisas existentes cobrem parte; a tarefa de
  consolidação existe para que elas sejam aproveitadas em vez de refeitas.

## Decisões do founder — as duas que esta story esperava estão fechadas

### 1. Como observar as ações mutantes — **respondido em 2026-11-18: criar o sorteio de teste**

Era a pergunta mais importante desta story, e a recomendação era criar um sorteio privado sem
divulgação. **O founder autorizou, o sorteio foi criado, o protocolo acima foi seguido e as duas
travas funcionaram** — nada vazou para o catálogo público e não existe caminho de compra. Ver
`README.md` §10 do inventário para o registro do que foi criado, clicado e verificado.

### 2. O que fazer com o sorteio de teste que sobrou — **decisão D5, 2026-11-19: deixar como está**

> **A decisão, textual:** *"Deixar como está."*

**O motivo é o mesmo achado que criou o problema: a Sorteamos não exclui sorteio.** Procurado em seis
lugares em 11-18 (ações da linha, menu ⋮ da linha, página de edição, seletor de status, filtro de
status, cabeçalho e menu da lista de compras) — **não existe exclusão**. Um sorteio criado é
permanente para o operador, e é o que explica os **10.774** sorteios na conta do Império.

O que fica no painel do cliente, e por que é aceitável:

| | |
|---|---|
| Id | `6afde6282bfd48a5b86b14b9` |
| Título | `ZZ TESTE TECNICO - NAO COMPRAR` — nomeado para que, se vazar, vaze dizendo o que é |
| Privacidade | **Privado** — fora do catálogo público, verificado |
| Status · início das vendas | **Em breve** · **18/11/2027** |
| Caminho de compra na loja | **não existe** — verificado na URL direta |
| Compras | **zero** |

**Ninguém consegue comprar nele, nem com o link na mão**, enquanto a data de início estiver em 2027.
O risco que o founder nomeou ao autorizar a criação — *"o sorteio acabar ficando público e alguém de
fato comprar"* — **não se materializou e não pode se materializar** nesse estado.

**O custo da decisão, declarado:** uma linha a mais numa lista de 10.774, invisível ao público. Os
outros dois caminhos que estavam na mesa — pedir exclusão ao suporte do fornecedor, ou encerrá-lo —
**saem da lista**: abrir chamado no suporte do fornecedor **do cliente** era decisão dele, e ele
decidiu não abrir.

### A lição de protocolo continua valendo, e ganhou força

**Verificar o caminho de saída antes de criar, não depois.** O protocolo desta story cobria
invisibilidade e compra — as duas coisas que podiam dar errado com o público — e **não cobria "como
desfazer"**. Deu certo: nada vazou. Mas a D5 só existiu como pergunta porque *"como eu apago isto?"*
não foi respondida antes do primeiro clique em "Criar Sorteio". **Passa a fazer parte do protocolo**,
e vale para qualquer sorteio de observação futuro: o caminho de saída se confere primeiro.

### O que continua em aberto nesta story — e não é decisão de founder

**`Revisar pagamentos`** (item 14 de 14 do menu ⋮) segue `[NÃO OBSERVADO]`: a sessão caiu no clique.
Observar o **efeito** dele exigiria uma compra expirada no sorteio de teste — reservar números e
deixar expirar, o que não cobra ninguém. Isso é **passo a mais com decisão própria**, e não está
autorizado. Fica registrado como o que falta para aquele item sair de `[CONFIRMAR]`, e **não é
bloqueado pela D5**: o sorteio de teste continua existindo e continua disponível para isso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.1 | **Decisão D5 do founder aplicada: o sorteio de teste fica na Sorteamos como está.** A seção *Decisão pendente* deixa de existir e vira **Decisões fechadas**, com as duas: a de 11-18 (criar o sorteio de observação — autorizada, executada, travas verificadas) e a D5 de 11-19. **O motivo da D5 está escrito: a Sorteamos não exclui sorteio**, procurado em seis lugares. Dos três caminhos que estavam na mesa sobrou **um** — pedir exclusão ao suporte do fornecedor do cliente e encerrá-lo **saem da lista**, porque abrir chamado no fornecedor dele era decisão dele e ele decidiu não abrir. Registrado o estado em que o sorteio fica (privado, `Em breve`, vendas em 18/11/2027, zero compras, sem caminho de compra verificado) e o custo declarado (uma linha numa lista de 10.774). Risco das mutantes não observadas rebaixado a **mitigado**: o instrumento continua no ar. **`Revisar pagamentos` segue o único item aberto**, e o que falta nele não é a D5 — é autorização para deixar uma reserva expirar. | @pm (Morgan) |
| 2026-11-18 | 1.0 | Nasce da decisão do founder de replicar **absolutamente tudo** da Sorteamos. É a primeira entrega do mandato, porque não se replica o que ninguém enumerou — e porque o `AC7` da `LTM-18` (*"nenhum comportamento inventado"*) precisa de uma fonte para consultar. O critério de fim veio da própria frase do founder: recriar no lotemania os sorteios que a Sorteamos tem hoje (portão **G8**). | @aiox-master |
