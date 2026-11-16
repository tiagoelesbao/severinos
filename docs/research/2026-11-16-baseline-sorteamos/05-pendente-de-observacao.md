# 05 — Pendente de observação: o roteiro de navegação

> **Este documento é um roteiro, não um lamento.** Cada item diz **onde clicar**, **que pergunta
> exata responder** e **que evidência serve como resposta**. Foi escrito para quem vai abrir o
> painel já autenticado e precisa trazer o máximo numa passada só.
>
> Ordem de prioridade é a ordem de leitura: **P0 bloqueia story de paridade**, P1 fecha o
> contrato de API, P2 fecha as bordas do domínio.

---

## Como observar sem quebrar nada

**Três regras de execução, nessa ordem de importância.**

**1. Nenhum login novo.** A sessão é única: autenticar de novo derruba a sessão aberta. Usar a
aba já autenticada. Nenhuma chamada de `POST /api/auth/login`.

**2. Nenhuma escrita sem autorização explícita do founder.** Quatro itens deste roteiro são ações
de escrita — **Ativar títulos premiados**, **Revisar pagamentos**, **salvar sorteio novo** e
**Horário Premiado**. Para os quatro, a instrução é a mesma: **abrir o formulário, fotografar os
campos, NÃO submeter.** O valor está no formulário, não no efeito. Se o founder autorizar um
sorteio `private` de teste, aí sim submeter — e anotar o corpo da requisição.

**3. A evidência mais valiosa é a aba Network, não a tela.** Com o DevTools aberto na aba
**Network**, filtro **Fetch/XHR**, cada clique revela: a **rota**, o **método**, os **parâmetros**
e o **shape da resposta**. É isso que fecha `01-api.md`. Uma captura de tela resolve layout;
só a resposta de rede resolve contrato.

**Sobre dado pessoal:** ao trazer resposta de rede, **mascarar nome, telefone, e-mail, CPF e IP
antes de colar em qualquer lugar.** O que interessa é a **chave**, não o valor. `"phone": "+55..."`
já responde a pergunta; o número não acrescenta nada e o repositório tem histórico recente de
quase vazar PII. A regra está em `.claude/rules/claims-ledger.md`.

**Atalho que vale o esforço:** se o painel for uma SPA, **um único clique em qualquer tela
devolve a rota e o shape inteiro**. Doze cliques com o Network aberto fecham mais buraco que
duas horas de leitura de tela.

---

# P0 — Bloqueia story de paridade

## A. As ações do menu de sorteio

**Onde:** tela **Sorteios**, numa linha de sorteio **`active` com títulos ainda livres** (para
Top 10 e Porcentagem terem dado) e numa linha de sorteio **`done`** (para Faturamento e Revisar
pagamentos terem dado). Vale percorrer o menu duas vezes, uma em cada.

### A0. Resolver a contagem — 12 ou 13?

| | |
|---|---|
| **Pergunta** | O menu tem 12 ou 13 itens? A lista do briefing tem 13 nomes mas diz "12" |
| **Evidência** | contar os itens do menu aberto, na ordem, e anotar a ordem exata |
| **Por que importa** | é a lista que vira o backlog de paridade. Um item fantasma gera story de algo que não existe; um item esquecido gera lacuna silenciosa |

### A1. Dashboard (do sorteio)

| | |
|---|---|
| **Pergunta** | Que **blocos** essa tela tem, e que número cada um mostra? É por rodada ou acumulado? Tem gráfico? Tem recorte de período? |
| **Evidência** | a lista de rótulos dos cartões (ex.: "Faturamento", "Títulos pagos", "Ticket médio") + a rota e o shape da resposta na aba Network |
| **Por que importa** | o lotemania tem um modal de 3 contadores no lugar disso. Sem a lista de blocos, a story é um chute |

### A2. Top 10 diário

| | |
|---|---|
| **Pergunta** | É ranking de **compradores** ou de **títulos**? Ordenado por **quantidade de títulos** ou por **valor gasto**? "Diário" é do dia corrente ou tem seletor de data? Quantas colunas? |
| **Evidência** | os cabeçalhos da tabela + as 2 primeiras linhas **com nome e telefone mascarados** |
| **Por que importa** | a home do lotemania tem "Top 5 Compradores no total, por quantidade" — se o original é por valor e por dia, é outra consulta |

### A3. Porcentagem

| | |
|---|---|
| **Pergunta** | **Porcentagem de quê?** É progresso de venda da rodada? É distribuição de títulos por comprador? É payout? É um gráfico ou uma tabela? |
| **Evidência** | título da tela/modal, a unidade mostrada ao lado do número, e se o total fecha em 100% |
| **Por que importa** | **não tenho hipótese confiável.** É o item mais opaco do menu e o nome não entrega nada |

### A4. Horário Premiado

| | |
|---|---|
| **Pergunta** | É **configuração** ou **visualização**? Se é formulário: que campos pede? O prêmio é por **faixa de horário** (ex.: 14:00–15:00) ou por **horário exato**? Prêmio em dinheiro ou em títulos? Quantos horários por rodada? Como se escolhe o ganhador — quem comprou **naquele** intervalo? |
| **Evidência** | os rótulos dos campos do formulário, os tipos de input (hora, hora+minuto, intervalo), e o texto de ajuda se houver. **Abrir e não salvar** |
| **Por que importa** | é um mecanismo de promoção inteiro que não existe no clone, nem como campo |

### A5. Menor ou maior

| | |
|---|---|
| **Pergunta** | O que essa tela faz? É relatório de **maior e menor compra** da rodada? É um **jogo** de adivinhar? É configuração de prêmio para o maior comprador? |
| **Evidência** | título, os rótulos de qualquer coisa que apareça, e **o estado vazio** se não houver dado — o texto do estado vazio geralmente explica o propósito melhor que a tela cheia |
| **Por que importa** | nenhuma hipótese. Pode ser relatório trivial ou feature inteira |

### A6. Vendas por dia

| | |
|---|---|
| **Pergunta** | Quais são as **colunas exatas** e em que ordem? Tem seletor de período? Tem total no rodapé? Tem **botão de export**? |
| **Evidência** | a linha de cabeçalho copiada literalmente |
| **Por que importa** | o lotemania devolve `Data, Pagos, Reservados, Expirados, Faturamento` — quero saber se acertou ou inventou |

### A7. Relatório de Vendas — **o item mais valioso de todo o roteiro**

| | |
|---|---|
| **Pergunta** | É **daqui** que sai o CSV de 25 colunas? Tem botão de export e qual o rótulo ("Exportar", "Baixar CSV", ícone)? Qual o **nome do arquivo** gerado? Tem seletor de período e de status? A tela mostra as 25 colunas ou o arquivo tem mais que a tela? |
| **Evidência** | **a rota de download na aba Network** (método, parâmetros, content-type) + o nome do arquivo + a linha de cabeçalho do CSV. **Não é preciso trazer nenhuma linha de dado** |
| **Por que importa** | o contrato de 25 colunas é a especificação do export, e hoje não sei **de onde** ele sai nem com que parâmetros. O lotemania não exporta arquivo nenhum |

### A8. Relatório de Expirados

| | |
|---|---|
| **Pergunta** | Colunas exatas. Mostra **quem** reservou e não pagou? Mostra os **títulos** que foram liberados? Mostra **`expiredBy`** (quem/o quê expirou)? |
| **Evidência** | cabeçalhos + se há coluna cujo valor seja algo como `system`, `admin`, `timeout` — **esse valor responde a pergunta aberta sobre `expiredBy`** |
| **Por que importa** | `expiredBy` é um campo que capturamos sem saber o que significa, e esta tela provavelmente o exibe traduzido |

### A9. Relatório de Participantes

| | |
|---|---|
| **Pergunta** | Colunas exatas. Agrega por participante **dentro da rodada** ou no histórico? Traz CPF/e-mail? Tem export? |
| **Evidência** | cabeçalhos + presença de export |
| **Por que importa** | o lotemania identifica o participante por **8 caracteres do uuid**, o que é inusável. Preciso saber o que o original mostra |

### A10. Ativar títulos premiados

| | |
|---|---|
| **Pergunta** | É um **toggle** ou abre um **formulário**? Se abre: como se escolhe o título premiado — o operador **digita o número**, a plataforma **sorteia**, ou é **por quantidade** ("3 títulos premiados aleatórios")? O prêmio é valor em dinheiro, crédito, ou outro título? O comprador **vê na hora** que comprou um premiado? |
| **Evidência** | os rótulos do formulário e os tipos de input. **Abrir e não salvar** |
| **Por que importa** | no clone é um booleano `instantPrizesEnabled` sem mecanismo nenhum. Isto é uma feature inteira a especificar |

### A11. Faturamento — **o segundo item mais valioso**

| | |
|---|---|
| **Pergunta** | Quais **linhas** o modal tem, com os rótulos literais? Confirma a separação **baixa automática × baixa manual**? Mostra **contagem de títulos** além do valor? Desconta **taxa de plataforma** (sabemos que é 5%) e **prêmio**? Mostra **lucro/margem**? É da rodada ou do período? |
| **Evidência** | **foto do modal inteiro** com os rótulos legíveis + a rota e o shape da resposta |
| **Por que importa** | é a tela que o cliente pediu explicitamente, é onde a baixa manual aparece, e é **impossível** no lotemania hoje porque não há campo `approvedBy`. A story depende dos rótulos exatos |

### A12. Revisar pagamentos

| | |
|---|---|
| **Pergunta** | **É aqui que a baixa manual acontece?** O que a tela lista — pedidos `waiting-payment`? pedidos pagos no gateway mas não conciliados? Que **botão** cada linha oferece (rótulo literal: "Aprovar"? "Dar baixa"? "Confirmar")? Dá para aprovar **em lote**? Pede confirmação? Pede justificativa? |
| **Evidência** | os rótulos dos botões, o estado da linha antes e depois **sem clicar**, e a rota que o botão dispara (visível no `onclick`/handler ou, se o founder autorizar um clique em sorteio de teste, na aba Network) |
| **Por que importa** | 647 títulos de baixa manual em 10 dias passaram por alguma tela. Esta é a candidata. Sem ela, o fluxo que fecha a rodada não tem especificação |

### A13. Editar — as abas do editor

| | |
|---|---|
| **Pergunta** | **Quantas abas** o editor tem e quais os **rótulos exatos, na ordem?** (a hipótese de 14 abas vem de um comentário no clone, não de observação) |
| **Evidência** | a fileira de abas, fotografada |
| **Por que importa** | valida ou derruba de uma vez a lista de 14 abas em que boa parte do `advancedSettings` do clone foi baseada |

Se der tempo em só duas abas, que sejam **Títulos** e **Pagamento**: Títulos para confirmar
`expirationSeconds`, `min`, `max`; Pagamento para descobrir como o gateway é escolhido por
sorteio — e se **paysure** aparece por nome ali.

---

## B. Formulário de criação de sorteio

**Onde:** tela **Sorteios** → botão de criar (rótulo exato também interessa: "Novo Sorteio"?
"Criar"? só um `+`?).

| | |
|---|---|
| **Pergunta 1** | Que campos o formulário de criação pede, **na ordem**, e quais são **obrigatórios** (asterisco, validação ao submeter vazio)? |
| **Pergunta 2** | A criação é **um passo** ou **wizard de várias etapas**? As 14 abas aparecem já na criação ou só na edição? |
| **Pergunta 3** | **`friendlyURL` é editável pelo operador ou gerado pela plataforma?** Se é gerado, o campo aparece preenchido e travado, ou nem aparece? |
| **Pergunta 4** | Quais são os **valores padrão** de total de títulos, preço, expiração de reserva, mín./máx. por pedido? |
| **Pergunta 5** | Dá para criar com `status` diferente de `active`? Existe "salvar como rascunho"? |
| **Evidência** | os rótulos dos campos, os placeholders, os valores pré-preenchidos, e — se o founder autorizar criar um sorteio `private` de teste — **o corpo da requisição de criação na aba Network**, que entrega a rota de escrita e o schema de uma vez |
| **Por que importa** | **a Pergunta 3 é a mais importante de todo o documento depois do export.** Sabemos que `friendlyURL` tem padrão irregular e que slug errado queima clique pago. Se o operador digita à mão, isso explica a irregularidade e o clone precisa de campo editável — não de gerador |

---

## C. As três telas que estão vazias ou mínimas no clone

### C1. Relatórios (item 6 da barra lateral)

| | |
|---|---|
| **Pergunta** | Esta tela é a **mesma coisa** que as 5 ações de relatório do menu do sorteio, só sem filtro de sorteio? Ou tem relatórios **adicionais**? Quais são as opções do seletor, com os rótulos exatos? Tem filtro de período, de sorteio, de status, de afiliado? **Tem export aqui também?** |
| **Evidência** | as opções do seletor de tipo de relatório, copiadas literalmente, + os controles de filtro |
| **Por que importa** | a tela do clone tem 22 linhas e 5 tipos adivinhados. Se o original tem 8 tipos, a story muda de tamanho |

### C2. Analytics (item 13 da barra lateral)

| | |
|---|---|
| **Pergunta** | Que **métricas** mostra, e com que granularidade (dia/hora)? É tráfego (visitas, origem) ou é venda? Tem gráfico — de que tipo? Tem seletor de período? **Vem de dado próprio da plataforma ou é um embed do Google Analytics?** |
| **Evidência** | os rótulos dos cartões/eixos + a rota na aba Network (se a resposta vier de domínio terceiro, é embed e a story é outra) |
| **Por que importa** | `analytics/page.tsx` no clone é um **arquivo de 0 bytes**. Não há nem hipótese. A pergunta do embed é a que mais economiza trabalho: se for embed, não há nada a construir |

### C3. Bancos (item 4 da barra lateral)

| | |
|---|---|
| **Pergunta** | **Bancos é o quê, exatamente?** Conta bancária do operador? Extrato de entradas? Solicitações de saque de afiliado? As três? **Tem submenu** (o clone assume um submenu "Pagamentos")? |
| **Pergunta 2** | Se há extrato: que colunas? Se há saque: que estados um pedido de saque assume (pendente/aprovado/pago/recusado) e que botões a linha oferece? |
| **Evidência** | o submenu expandido + os cabeçalhos de tabela + os rótulos de status |
| **Por que importa** | o clone criou 3 tabelas (`bank_accounts`, `banking_transactions`, `payment_requests`) e uma tela chamada "Transações Bancárias" **sem saber o que "Bancos" faz**. Pode estar construindo a coisa errada |

---

# P1 — Fecha o contrato de API

Todos estes se respondem **com a aba Network aberta**, enquanto se navega por P0. Custo marginal
quase zero se o DevTools já estiver ligado.

| # | Pergunta exata | Onde / como | Evidência que serve |
|---|---|---|---|
| D1 | Qual a **rota de criação** de sorteio e o corpo que ela recebe? | criar sorteio `private` de teste (com autorização) | método + path + JSON do corpo |
| D2 | Qual a rota de **edição** e de **troca de status**? | editar um sorteio e trocar status | idem |
| D3 | Existe **duplicar** e **excluir** sorteio? | menu de ações | presença do item + rota |
| E1 | Qual a **lista completa de eventos de webhook** assináveis? | `dashboard/webhooks` → formulário de cadastro, seletor de eventos | a lista de nomes, literal (ex.: `order.paid`, `order.expired`, `product.finished`…) |
| E2 | Os "Exemplos de payload" cobrem quais eventos? | mesma tela, seção de exemplos | a lista de abas/opções de exemplo |
| F1 | O login devolve **`accessToken`** ou **`token`**? | não dá para ver sem logar — **pular**, ou ler de `localStorage`/`sessionStorage` na aba já autenticada | o nome da chave armazenada |
| F2 | Há **refresh token**? Onde o access token é guardado? | DevTools → Application → Local Storage / Cookies | os nomes das chaves (não os valores) |
| G1 | Qual a **chave do envelope** de `/products` — `products`, `data`, `docs`? | qualquer carregamento da tela Sorteios | a chave de topo da resposta |
| G2 | A resposta traz **total/count/pages**? | idem | os campos irmãos da lista |
| G3 | Qual o **`rowsPerPage` máximo** aceito? | trocar "linhas por página" na tela, se houver seletor | os valores oferecidos |
| H1 | Que **valores** `expiredBy` assume? | Relatório de Expirados (A8) ou a resposta de rede da Lista de Compras com status `expired` | o valor literal do campo |
| I1 | O que é **`primeAffiliate`**? | resposta de rede de um pedido que tenha o campo preenchido; ou a tela de Afiliados ter noção de "principal"/"premium" | o valor + qualquer rótulo correspondente na interface |
| J1 | **"Host do Pagamento"** no export é o quê? | abrir o CSV exportado em A7 e olhar os valores dessa coluna | 2 valores distintos da coluna bastam (ex.: `paysure`, `pay2m`) |
| J2 | **"Data da Compra"** é `createdAt` ou `paymentAt`? | comparar uma linha do CSV com o mesmo pedido na Lista de Compras | se bate com a data de criação ou com a de pagamento |
| J3 | De onde vêm **"Nome Social"** e **"Data de Nascimento"**? | tela de **Usuários** → abrir/editar um participante | se os campos existem no cadastro e com que rótulo |
| J4 | **`utmMedium`** aparece no export sob outro rótulo? | cabeçalho do CSV de A7 | a lista de 25 cabeçalhos literal |
| K1 | Que rota a **página pública do sorteio** chama para carregar o produto? | abrir `rapidinhas24hr.com/campanha/{slug}` numa aba **anônima** (sem sessão — não há risco) com Network aberto | método + path + se exige header |
| K2 | Os **dois padrões de URL** (`/campanha/{slug}` e `/sorteio/{id}`) funcionam hoje? | abrir os dois na aba anônima | código de resposta / se redireciona |
| L1 | Qual a rota de **reserva** e de **checkout**, e o corpo? | na aba anônima, selecionar títulos na loja e **ir até a tela de pagamento sem pagar** | método + path + corpo |
| L2 | A reserva devolve **prazo** no corpo? Qual o prazo real em produção? | mesma passagem | o campo de expiração na resposta + o contador na tela |
| L3 | Como o PIX é apresentado — QR gerado pela plataforma ou redirect para o gateway? | mesma passagem | o host do recurso do QR |

---

# P2 — Fecha as bordas do domínio

Menor prioridade porque o clone já tem forma para a maioria — o risco aqui é ter construído
**parâmetros errados**, não ter construído nada.

| # | Tela | Pergunta exata | Evidência |
|---|---|---|---|
| M1 | **Capitalizadoras** | Que campos tem o cadastro? Número de processo SUSEP é obrigatório? Pode haver mais de uma? Aparece na loja? | os rótulos do formulário de cadastro |
| M2 | editor → aba Capitalizadora | Como se vincula ao sorteio — seleção de uma cadastrada, ou digita-se um código? | o tipo de controle (select ou input) |
| N1 | **Links De Desconto** | Que parâmetros o cadastro pede? Desconto é **percentual** ou **valor**? Tem limite de uso total e por usuário? Tem "checkout direto"? Vincula a sorteio específico e a afiliado? | os rótulos do formulário + as colunas da listagem |
| N2 | idem | A listagem mostra **cliques** e **conversões**? | cabeçalhos |
| O1 | **Afiliados** | Colunas da listagem. A comissão é **percentual fixo por afiliado** ou por sorteio? Mostra total vendido e total de comissão? | cabeçalhos + os rótulos do cadastro |
| O2 | idem | Há **painel do próprio afiliado** (login dele)? Como ele saca? | presença de item/rota de saque |
| P1 | **Usuários** | Que colunas a listagem tem? Que filtros? Dá para **bloquear** um usuário e com que rótulo? Há **export**? | cabeçalhos + rótulos de ação |
| P2 | idem | Que campos o formulário de criação/edição de usuário pede? (responde J3 também) | rótulos |
| Q1 | **Integrações** | **Quais provedores** aparecem, com os nomes exatos? Quais estão ativos no Império? | a grade de provedores, fotografada |
| Q2 | idem | Onde fica **Webhooks** — dentro de Integrações? | o caminho de navegação até `dashboard/webhooks` |
| Q3 | idem | Há integração de **Meta/Pixel/CAPI** configurável aqui? É daqui que sai a CAPI nativa (que envia em lote horário)? | o rótulo do card + os campos que ele pede |
| R1 | **Contatos** | É formulário de suporte da loja ou lista de leads? Que colunas? Tem estado (aberto/resolvido)? | cabeçalhos + rótulos de status |
| R2 | **Comunicados** | O aviso é para a **equipe** ou para o **participante**? Onde aparece na loja? | o texto de ajuda da tela |
| R3 | **Perguntas Frequentes** | Tem ordenação e ativar/desativar? | os controles da linha |
| S1 | qualquer lugar | **"Certificado" existe na Sorteamos?** Se existe: é **domínio próprio com SSL** ou **certificado de capitalização**? | onde o item aparece + o texto da tela. **Ambíguo e o clone escolheu uma das duas** |
| T1 | editor → abas | **Existem jogos bônus** (caixa premiada, roleta, raspadinha) em algum lugar da Sorteamos? | presença ou ausência de aba/menu com esses nomes |
| T2 | editor → abas Promoções, Upsell, Alertas | O que cada uma configura? | os rótulos dos campos |
| U1 | barra lateral | **Quais itens têm submenu?** Expandir todos os 13 e anotar os filhos | a árvore completa |
| U2 | barra lateral / topo | Onde ficam **Configurações**? Existem banners de "Ativar 2FA" e "Ativar Captcha" na Início? | o caminho + o texto do banner |
| V1 | **Início** | Que **cartões** a home tem, com os rótulos exatos e os números? Tem gráfico de "vendas na última hora"? Tem "Top compradores"? Tem contadores de **visitas** (hoje/ontem/total)? | a tela inteira, fotografada — é a tela que o clone copiou "de cabeça" e vale validar de uma vez |

---

## Os cinco itens que, se vierem, mudam mais a especificação

Se a passada tiver que ser curta, esta é a ordem:

1. **A7 — Relatório de Vendas:** a rota de export e o cabeçalho das 25 colunas. Fecha o contrato
   de export inteiro, que é o entregável mais citado da paridade.
2. **A11 + A12 — Faturamento e Revisar pagamentos:** fecham a baixa manual, que é o conceito mais
   específico do negócio e hoje é `ausente` no clone em campo, em tela e em ação.
3. **B — formulário de criação, com ênfase na Pergunta 3** (`friendlyURL` editável ou gerado).
   Decide se o clone precisa de campo de slug editável ou de gerador — e slug errado queima
   clique pago.
4. **C2 — Analytics:** descobrir se é **embed** de terceiro. Resposta de uma palavra que pode
   eliminar uma story inteira do backlog.
5. **A4 + A10 — Horário Premiado e Ativar títulos premiados:** as duas features de promoção que
   não existem no clone nem como campo, e que têm ação própria no menu — ou seja, o cliente usa.

---

## O que **não** dá para resolver por navegação

Registrado para não entrar em loop de investigação:

| Pergunta | Por que navegação não resolve | Caminho real |
|---|---|---|
| O limite real de rate limit da API | só se descobre atingindo, e atingir é abuso | perguntar ao suporte da plataforma, ou aceitar o nosso teto de 20/min |
| O mecanismo exato do Pixel duplicar 1,6x | exige instrumentar o site do cliente | já registrado como defeito da plataforma, fora do nosso escopo |
| Se `qtyFree + qtyReserved + qtyPaid == qty` sempre | uma amostra não prova invariante | tratar como invariante **a garantir no lotemania**, não a herdar |
| A fatia da CAPI nativa no volume de eventos | a plataforma não separa | já documentado como limite conhecido |
| O fonte da Sorteamos | não existe mais | é a razão desta baseline existir |
