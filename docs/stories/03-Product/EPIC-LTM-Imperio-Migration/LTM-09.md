# LTM-09: BI próprio da frente nova — o que medir sem tocar no que roda

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (**Frente D — medição da frente nova**) · nasce de decisão do founder
**Prioridade:** **P1** — não bloqueia o primeiro sorteio de teste, mas **é a evidência do portão G3** e o G3 bloqueia o corte
**Complexidade:** M — coleta própria + agregação + dashboard estático, todo em padrão já provado duas vezes na casa
**Criada por:** @po (Pax) · 2026-11-17, a partir da decisão do founder
**Recorte:** separada da `LTM-04` por decisão do @po — razão registrada abaixo

## Story

**Como** founder abrindo uma frente nova da empresa em paralelo à que fatura ≈ R$ 90 mil/dia
**Eu quero** medir o lotemania num dashboard à parte, alimentado por coleta própria
**Para que** a transição seja gradual e comparável — e para que nada que eu construa para medir o
novo possa quebrar o que mede o velho.

## A decisão que origina esta story

Founder, 2026-11-17 (citação literal):

> "para acoes que formos subir nesse novo sistema vamos criar um dashboard a parte para metrificar
> as acoes pois digamos que esta sendo uma nova frente da empresa aberta com tudo a parte do que
> roda principal hoje para nao haver interferencia e fazermos uma transicao realmente gradual"

Quatro consequências, e nenhuma delas é interpretação:

| Consequência | O que significa em arquivo |
|---|---|
| **Zero interferência** | `services/Meta/imperio-premios/` e `apps/BI/imperio-premios/` **não são tocados** por esta story |
| **Coleta própria** | lê a **API de leitura que a `LTM-04` constrói**, nunca o banco do lotemania direto |
| **Dashboard próprio** | projeto Vercel próprio, não uma aba no BI existente |
| **Transição gradual** | os dois coexistem, e a **comparação entre eles é a prova do G3** |

### Isto reforça o G3; não o substitui

O portão **G3** do epic exige *"janela de leitura dupla: mesmo período lido das duas plataformas
produz o mesmo faturamento e a mesma contagem de pedidos pagos"*. Antes desta decisão, a leitura
dupla era um procedimento sem dono e sem artefato. Agora ela é **a razão de existir de dois
pipelines simultâneos**, e a comparação tem onde morar.

**O que estava errado e sai de circulação:** a leitura de que "um dia o lotemania substitui a fonte
do BI atual". O BI do Império continua lendo a Sorteamos, **intocado**, até o corte. A substituição
da fonte, se acontecer, é trabalho da fase de corte — não desta story e não da `LTM-04`.

## O padrão da casa, medido (não proposto)

Conferido no repositório, e são **duas instâncias**, o que o torna padrão e não exceção:

```
services/Meta/imperio-premios/        collector.py · client_api.py · bi_aggregator.py
        ↓ gera
apps/BI/imperio-premios/              data-executiva.json · data-operacional.json
                                      data-produto.json · data-qualidade.json
        ↓ serve
4 páginas HTML estáticas + login próprio    projeto Vercel próprio (imperio-bi.vercel.app)
```

| Fato conferido | Onde |
|---|---|
| `collector.py` importa `SorteiosAPIClient` de `client_api.py`; checkpoint resumível e CSV incremental | `services/Meta/imperio-premios/collector.py` |
| Quatro `data-*.json` servidos por quatro HTML (`executiva`, `operacional`, `produto`, `qualidade`) | `apps/BI/imperio-premios/` |
| Login é **nosso**, por `middleware.js` + `api/login.js` + cookie `bi_auth`, porque Vercel Password Protection exige plano Pro | `apps/BI/imperio-premios/README.md` |
| O middleware bloqueia também acesso direto aos `data-*.json` — não só ao HTML | idem, testado 2026-10-07 |
| Única dependência: `@vercel/functions`, com `"type":"module"` | `apps/BI/imperio-premios/package.json` |
| A segunda instância existe e é **deliberadamente mais enxuta**, refletindo o acesso disponível | `apps/BI/garantido-premios/README.md` |

**A `garantido-premios` é o precedente mais útil para esta story**, não a `imperio-premios`: ela
nasceu pequena de propósito, com a fronteira entre o que é real e o que é mock escrita no topo do
seu `bi_aggregator.py`. É exatamente a postura certa para uma frente que começa com **zero pedido
pago**.

## Decisão de arquitetura (proposta)

1. **Pipeline novo, em diretório novo.** `services/Meta/lotemania-imperio/` (nome a confirmar pelo
   founder) com `client_api.py` próprio apontado para a API da `LTM-04`, `collector.py` e
   `bi_aggregator.py`. **Nenhum arquivo de `imperio-premios/` é editado nem importado.** Importar o
   `client_api.py` de lá para "reusar" acopla a frente nova à que fatura hoje — e a primeira
   necessidade de mudar a base URL quebraria as duas.
2. **Lê a API, nunca o banco.** A `LTM-04` constrói a API de leitura autenticada e escopada por
   tenant; esta story é consumidora dela. Ler o Postgres do lotemania direto pularia o contrato que
   o portão G3 precisa exercitar — e o contrato só se prova sendo usado.
3. **Dashboard estático com o mesmo mecanismo de login.** HTML + `data-*.json` + `middleware.js` +
   `api/login.js`, projeto Vercel próprio. Nada de framework: as duas instâncias existentes provam
   que não é necessário.
4. **Começa com as páginas que têm dado.** Com zero pedido pago, uma página "executiva" de
   faturamento é uma página vazia. A primeira página que tem conteúdo real é a de **comparação**
   (G3) e a de **saúde do caminho do dinheiro** — pedido criado, reserva expirada, pedido pago,
   evento de webhook casado e não casado. O resto entra quando houver o que mostrar, no espírito da
   `garantido-premios`.
5. **A comparação é um artefato, não um relatório ad hoc.** Mesma janela, as duas fontes, lado a
   lado, com a diferença explícita em reais e em contagem de pedidos pagos. É isso que o G3 pede, e
   é a página que justifica a existência do dashboard antes de a frente nova ter volume.
6. **Dado pessoal: o G7 vale igual, e aqui vale mais.** O endpoint de pedidos da `LTM-04` devolve
   nome, telefone, e-mail e CPF do comprador, e o aviso da Paysure traz `payer_name` e
   `payer_document` (CPF) — seção 5.4 de `docs/research/2026-11-16-paysure-contrato.md`. Um
   pipeline de BI é, por natureza, uma máquina de escrever arquivo em disco: CSV bruto, checkpoint,
   JSON servido na web. **Nenhum artefato desta frente, versionado ou publicado, carrega dado
   pessoal** — a agregação derruba a identificação na origem, e o `data-*.json` servido na web é
   agregado por definição.

## Tarefas (Checklist)

### Coleta

- [ ] `services/Meta/lotemania-imperio/client_api.py` (novo): cliente autenticado da API da
      `LTM-04`, **base URL por variável de ambiente** desde o nascimento.
- [ ] `services/Meta/lotemania-imperio/collector.py` (novo): coleta resumível com checkpoint, no
      padrão do existente.
- [ ] `services/Meta/lotemania-imperio/bi_aggregator.py` (novo): agrega para os `data-*.json`, com
      a fronteira "real × ainda sem dado" escrita no topo do arquivo, no padrão da
      `garantido-premios`.
- [ ] `.env`: variáveis próprias desta frente, sem reusar as do Império atual.

### Dashboard

- [ ] `apps/BI/lotemania-imperio/` (novo): `package.json` (`type: module`, `@vercel/functions`),
      `middleware.js`, `api/login.js`, `login.html`, `nav.html`/`nav.js`, `theme.css`.
- [ ] Página **Comparação** (G3): mesma janela nas duas fontes, faturamento e pedidos pagos lado a
      lado, com a diferença explícita.
- [ ] Página **Caminho do dinheiro**: pedido criado, reserva expirada, pedido pago, evento de
      webhook casado / não casado / não suportado.
- [ ] Projeto Vercel próprio, com `BI_PASSWORD` própria.

### Operação

- [ ] Agendamento próprio, independente do `refresh.ps1` do BI atual.
- [ ] README com o que é real, o que ainda não tem dado, e como rodar.

## Critérios de Aceite

- [ ] **AC1 (zero interferência, verificável):** o diff completo desta story **não contém nenhum
      arquivo** sob `services/Meta/imperio-premios/` nem sob `apps/BI/imperio-premios/`. Verificável
      por `git diff --name-only`. Se a implementação precisar mudar algo lá, ela para e abre item
      próprio — essa é a decisão do founder, e ela é literal.
- [ ] **AC2 (lê a API, não o banco):** nenhum arquivo desta story abre conexão com o Postgres do
      lotemania. Verificável por inspeção: zero string de conexão, zero cliente de banco. Toda
      leitura passa pela API autenticada da `LTM-04`.
- [ ] **AC3 (a comparação do G3 existe e é um artefato):** para uma janela declarada, o dashboard
      mostra faturamento e contagem de pedidos pagos das **duas** fontes e a diferença entre elas.
      Com zero pedido no lotemania, a página mostra `0` contra o valor da Sorteamos e **diz que a
      diferença é o que ainda não migrou** — não uma página em branco nem um erro.
- [ ] **AC4 (base URL parametrizada desde o nascimento):** a base da API vem de variável de
      ambiente. Teste: apontar para duas bases diferentes sem editar uma linha de código. Este AC
      existe porque o ETL atual tem a base **literal** no arquivo (`client_api.py:74`) e é
      exatamente o que impede a `LTM-04` de cumprir o seu AC3 — o defeito não se repete aqui.
- [ ] **AC5 (nenhum dado pessoal em artefato):** nenhum `data-*.json` servido, nenhum CSV
      versionado e nenhum checkpoint contém nome, telefone, e-mail ou CPF. Verificável por varredura
      **de conteúdo**, não por nome de arquivo nem por extensão. Política de 2026-11-12
      (`docs/ESTADO-ATUAL.md` §1-A), portão **G7**.
- [ ] **AC6 (o dashboard não é aberto):** sem o cookie de autenticação, tanto o HTML quanto os
      `data-*.json` são bloqueados — o mesmo comportamento já testado no BI atual em 2026-10-07.
      Teste das duas rotas, não só da página.
- [ ] **AC7 (honesto sobre o que não tem):** toda página ou cartão sem dado real diz **por que** não
      tem, em texto. O precedente é a `garantido-premios`, que escreve a fronteira real × mock no
      topo do agregador, e a tela `analytics` da Sorteamos, que exibe dado fictício de template há
      meses sem ninguém notar. **Marcador explícito, nunca número plausível** (Artigo IV).
- [ ] **AC8 (a frente nova não disputa recurso com a antiga):** agendamento, variáveis de ambiente,
      diretório de saída e projeto Vercel são próprios. Verificável: as duas coletas rodando ao
      mesmo tempo não escrevem no mesmo arquivo nem usam a mesma credencial.

## Escopo

**IN:** pipeline de coleta próprio lendo a API da `LTM-04`; agregação própria; dashboard estático em
projeto Vercel próprio com o mecanismo de login da casa; página de comparação do G3; página de saúde
do caminho do dinheiro; agendamento próprio; README com a fronteira do que é real.

**OUT:**

- **Qualquer alteração em `services/Meta/imperio-premios/` ou `apps/BI/imperio-premios/`** — é a
  decisão do founder, e o AC1 a verifica.
- **Construir a API de leitura** — é a `LTM-04`. Esta story é consumidora.
- **Substituir a fonte do BI atual.** Os dois coexistem até o corte; a substituição, se acontecer, é
  fase de corte.
- **Desligar o `apps/utm-capture-imperio`** — já está OUT na `LTM-04` pelo mesmo motivo.
- **Reproduzir as quatro páginas do BI atual.** Página sem dado é andaime, e o epic já tem o
  precedente registrado (achado B2: a tela de analytics da Sorteamos exibe dado de template).
- **CAPI, envio para o Meta, qualquer escrita em plataforma de anúncio.** Esta frente **lê**.
- **Migração de histórico** — dado pessoal, portão G7, fase de corte.

## Dependências

- **Depende de `LTM-04` (bloqueante para a coleta).** Sem a API de leitura não há o que coletar. As
  páginas, o login e o projeto Vercel podem ser construídos antes, com dado semeado.
- **Depende de `LTM-03a`** para a página de saúde fazer sentido: os estados `unmatched`,
  `unsupported_provider` e o contador de entregas nascem lá (AC-F1 a AC-F4).
- **Não depende de `LTM-01`, `02`, `05`, `07`, `08`.** Nenhuma delas toca os arquivos desta story.
- **Serve ao portão G3** e é onde a sua evidência passa a morar.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

**Onda 4 ou posterior**, e paralelizável com qualquer coisa — é a story mais isolada do epic.

```
Files:
  services/Meta/lotemania-imperio/client_api.py        (novo)
  services/Meta/lotemania-imperio/collector.py         (novo)
  services/Meta/lotemania-imperio/bi_aggregator.py     (novo)
  apps/BI/lotemania-imperio/package.json               (novo)
  apps/BI/lotemania-imperio/middleware.js              (novo)
  apps/BI/lotemania-imperio/api/login.js               (novo)
  apps/BI/lotemania-imperio/login.html                 (novo)
  apps/BI/lotemania-imperio/index.html                 (novo)
  apps/BI/lotemania-imperio/comparacao.html            (novo)
  apps/BI/lotemania-imperio/caminho-do-dinheiro.html   (novo)
  apps/BI/lotemania-imperio/nav.html · nav.js · theme.css   (novos)
  apps/BI/lotemania-imperio/README.md                  (novo)
  .env                                                 (variáveis próprias, acrescentadas)

  NENHUM arquivo sob services/Meta/imperio-premios/ — AC1
  NENHUM arquivo sob apps/BI/imperio-premios/        — AC1
  NENHUM arquivo sob apps/lotemania/                 — esta story não toca o app

Resources:
  API de leitura do lotemania  — somente leitura, autenticada. Compartilhada com
                                 ninguém; a `LTM-04` a constrói, esta a consome.
  projeto Vercel               — PRÓPRIO. Não compartilha com imperio-bi nem com a LP.
  agendamento (Task Scheduler) — PRÓPRIO. Não reusa o refresh.ps1 do BI atual.
  banco de teste               — não usa. Esta story não tem suíte contra Postgres.

Depends-on: LTM-04 (coleta), LTM-03a (página de saúde)
```

- ✅ **Disjunto de todas as outras stories do epic.** Nenhum arquivo em comum com `LTM-01`, `02`,
  `03a`, `03b`, `04`, `05`, `06`, `07` ou `08`.
- ✅ **Não gera migração** — não disputa o journal do Drizzle.
- ⚠️ **Projeto Vercel novo é operação de @devops** (`.claude/rules/agent-authority.md`). A criação
  do projeto, a variável `BI_PASSWORD` e o primeiro deploy passam por lá.

## Riscos

- **[Alto] "Reusar" o pipeline do Império por economia.** É o risco número um, porque parece a coisa
  certa: o `client_api.py` já faz login, paginação, retry em 401 e rate limit. Mas a base URL é
  **literal** no arquivo (`:74`) e a frente nova precisa de outra — a primeira tentativa de reuso
  edita o arquivo que alimenta o faturamento de hoje. Mitigação: AC1 proíbe por diff, AC4 exige a
  base parametrizada no cliente novo.
- **[Alto] Dado pessoal escorrendo para artefato.** Um pipeline de BI escreve CSV bruto, checkpoint
  e JSON servido na web; o endpoint da `LTM-04` devolve CPF. Já aconteceu nesta casa: 320 MB de
  nome, telefone, e-mail e CPF de clientes quase entraram no versionamento. Mitigação: AC5 com
  varredura **de conteúdo**, e agregação que derruba a identificação na origem.
- **[Médio] Dashboard vazio virar dashboard mentiroso.** Com zero pedido pago, a tentação é
  preencher com número de exemplo — e o epic tem o caso pronto do que isso produz (a tela de
  analytics da Sorteamos, dado de template no ar sem ninguém notar). Mitigação: AC7 e Artigo IV —
  marcador, nunca valor plausível.
- **[Médio] A comparação do G3 divergir e ninguém saber dizer se é erro ou é a realidade.** Os
  números do BI são **janela móvel de 7 dias** e andam a cada refresh — o epic já registrou isso
  como lição. Mitigação: a página de comparação carimba a janela e o instante do snapshot das duas
  fontes, lado a lado. Deriva com data é informação; deriva sem data é suspeita.
- **[Baixo] Duas coletas simultâneas estourando limite de requisição** na API nova. Mitigação: AC8;
  a frente nova tem volume zero no começo, então o risco só aparece depois do corte.

## Decisões que precisam do dono do negócio

Nenhuma bloqueia a implementação; todas têm default seguro embutido.

| # | Decisão | Default embutido | Quem decide |
|---|---|---|---|
| 1 | Nome da frente nos diretórios e no domínio (`lotemania-imperio`? `imperio-v2`?) | `lotemania-imperio` nos dois | founder |
| 2 | O dashboard novo é compartilhado com o cliente desde já, ou é interno até o corte? | **interno** até o G3 fechar — a comparação expõe a diferença entre as duas plataformas, e isso é conversa de founder, não de dashboard | founder |
| 3 | Quais páginas entram na primeira versão além de Comparação e Caminho do dinheiro | nenhuma — entram quando houver dado | founder |

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Nome escolhido para a frente
_(registrar, decisão 1)_

### Varredura de dado pessoal (AC5)
_(colar o comando e o resultado)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce da decisão do founder de 2026-11-17 (dashboard à parte para a frente nova, sem interferência no que roda hoje). Recortada **fora** da `LTM-04` por decisão do @po: ciclo de vida próprio, três árvores de arquivo disjuntas, e artefato que continua existindo depois de a `LTM-04` estar Done. Padrão de arquitetura conferido nas duas instâncias existentes (`imperio-premios`, `garantido-premios`), não proposto. | @po (Pax) |
