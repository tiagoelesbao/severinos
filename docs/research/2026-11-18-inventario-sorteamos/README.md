# Inventário da Sorteamos — sessão 1

**Data:** 2026-11-18 · **Fotografia datada**: a Sorteamos é produto vivo, e isto vale para este dia.
**Painel:** `painel.rapidinhas24hr.com` · **Loja:** `rapidinhas24hr.com` · **Conta:** Império Prêmios
**Story:** `LTM-19` · **Autorização:** founder, 2026-11-18 (criar sorteio privado, observar, excluir)

## Método, e a regra que o governa

Cada item abaixo é marcado como **[OBSERVADO]** ou **[SUPOSTO]**. Um item sem marca é defeito deste
documento — é o `AC3` da `LTM-19`, e existe porque inventário que mistura o que se viu com o que se
imagina dá confiança falsa a quem implementa depois.

**Nenhuma ação mutante foi executada em sorteio ativo.** As duas mutantes observadas rodaram
exclusivamente no sorteio de teste.

## O sorteio de observação

| | |
|---|---|
| Título | `ZZ TESTE TECNICO - NAO COMPRAR - 18/11` |
| Slug | `zz-teste-tecnico-nao-comprar-1811` |
| Id | `6afde6282bfd48a5b86b14b9` |
| Privacidade | **Privado** |
| Início das vendas | **Agendado — 18/11/2027** |
| Cotas / preço | 10 · R$ 1,00 |
| Estado em que esta sessão terminou | **AINDA EXISTE — e não há como excluir pelo painel.** Ver *§2* e *§10* |

### As duas travas funcionaram, e foram verificadas

1. **Não aparece no catálogo público.** Busca por "ZZ TESTE" na loja: zero resultados. [OBSERVADO]
2. **A URL direta abre, mas não vende.** `rapidinhas24hr.com/campanha/zz-teste-tecnico-nao-comprar-1811`
   mostra selo **"Em breve"**, título, preço e regulamento — e **nenhuma grade de números, nenhum
   seletor de quantidade, nenhum botão de compra**. O corpo inteiro da página cabe em oito linhas de
   texto. [OBSERVADO]

> **Por que as duas camadas eram necessárias, e não redundantes:** "Privado" na Sorteamos significa
> literalmente *"acessa apenas com link"* — **não** significa invisível. Quem tivesse o link
> acessaria. É o **agendamento** que remove o caminho de compra. Uma trava sozinha não bastaria.

---

## 1. Criar sorteio — `/dashboard/products/new`

### Os padrões de criação são o oposto do seguro [OBSERVADO]

| Campo | Padrão de fábrica |
|---|---|
| Privacidade | **Público** |
| Mostrar o sorteio na página inicial | **ligado** |
| Início das vendas | **Imediatamente** |
| Quantidade de cotas | **1.000.000** |

**Um sorteio criado sem tocar em nada nasce público, na home e vendendo** — com um milhão de cotas.
Vale para a paridade: se o lotemania copiar os padrões, copia o risco junto.

### Comportamento que só aparece mexendo [OBSERVADO]

Ao escolher **Privado**, o controle *"Mostrar o sorteio na página inicial"* **desaparece do
formulário**. Não fica desabilitado: some. É coerente — privado não vai à home — e é
comportamento condicional que precisa ser replicado, não só o campo.

### Obrigatórios para criar [OBSERVADO]

Descobertos por tentativa: o formulário recusou três vezes, uma por item.

1. Título · URL Amigável · Breve Descrição
2. **Texto** (editor rico) — erro: *"Texto É Obrigatório"*
3. **Imagem** — a aba *Imagens* fica vermelha; `jpg, jpeg, png`
4. **Método de pagamento** — erro em toast: *"Método de Pagamento não habilitado"*

> **O item 4 é achado de arquitetura:** na Sorteamos **não existe sorteio sem gateway**. O provedor
> é por sorteio e obrigatório **na criação**. No lotemania, `paymentGatewayProvider` é
> `z.string().nullable()` sem validação e **ninguém lê** — ver `LTM-03b` e `LTM-18`.

### As 14 abas do editor [OBSERVADO]

```
Geral · Títulos · Imagens · Prêmios · Afiliados · Títulos Premiados · Pagamento
Promoções · Alertas · Upsell · Anti Spam · Suporte · Capitalizadora · Restrições
```

### Aba Geral — campos e valores

| Campo | Valores | Mapeamento no lotemania |
|---|---|---|
| Privacidade | `Público` · `Privado (acessa apenas com link)` | ❌ **não existe** |
| Mostrar na página inicial | liga/desliga | `showOnHomepage` (sem leitor) |
| Categoria | Carros · Motos · Dinheiro · Celulares · Eletrônicos · Diversos · Outros | ❌ **não existe** |
| Modelo de Reserva | `Escolhe os bilhetes manualmente` (`manual`) · `Números Aleatórios` (`random`) | `reservationModel` ✅ mesmos dois |
| Modalidade | `Baseado em Loteria Federal` (`none`) · `Giro da Sorte` (`giro`) · `Loteria Federal (COM REGRAS DE SORTEIO)` (`federal`) | `drawMechanism: manual\|lottery` ⚠️ **três contra dois, e vocabulário diferente** |
| Modo de Descrição | `Colapsado/Retraído` · `Expandido` | `descriptionMode` ✅ |
| Texto do status | texto livre, padrão `Adquira Já!` | `statusText` ✅ |
| Início das vendas | `Imediatamente` · `Agendado` | `salesStartMode` ✅ |
| Data de início das vendas | aparece só com `Agendado` | ❌ **não existe** |
| Data do Sorteio | data/hora | existe |
| Encerrar automático na data do sorteio | liga/desliga | `autoFinishOnDrawDate` |
| Mostrar a data do sorteio para os participantes | liga/desliga | `showDrawDateToParticipants` |
| Permite download do comprovante | liga/desliga | `allowReceiptDownload` |
| Campos requeridos para a reserva | Nome · Telefone · CPF · E-mail · Nome Social · Data de Nascimento | `requiredFields` ✅ **os seis, idênticos** |

### Aba Títulos [OBSERVADO]

| Campo | Valores |
|---|---|
| Preço da cota | número, padrão `0.00` |
| Quantidade de cotas | **lista fechada**: 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100, 150…1.000, 2.000…10.000, 20.000…100.000, 400.000, 500.000, 1.000.000…10.000.000, 100.000.000. **Mínimo 10** |
| **Tempo para uma reserva pendente expirar** | **3 · 4 · 5 · 10 · 30 Minutos · 1 Hora · 3 Horas · 1 Dia** — oito |
| Campanha gratuita / Adicionar taxa | liga/desliga | 
| Quantidade por Comprador · Quantidade de cotas por comprador | `0` = sem limite |
| Quantidade mínima / máxima / inicial por reserva | número |
| Cards de Seleção 01–06 + Card mais popular (1–6) | `quickBuyCards`, `popularCardIndex` |
| Mostrar barra de progresso das vendas | liga/desliga |
| Mostrar Ranking Diário / Geral de Maiores Compradores | liga/desliga |

> ### ⚠️ O relógio da reserva: as listas não batem — e isto responde à `LTM-17`
>
> | | Opções |
> |---|---|
> | **Sorteamos** | 3, 4, 5, 10, **30** min, 1 h, 3 h, 1 dia |
> | **lotemania** | 10, **15**, 30, 60, 120 min |
>
> **15 minutos não existe na Sorteamos** — e é justamente o valor cravado hoje no lotemania. Em
> compensação a Sorteamos oferece 3, 4, 5 minutos, 3 horas e 1 dia, que o lotemania não tem.
>
> O founder pediu *"15 ou 30"*. **30 existe nas duas**; 15 é invenção nossa. Paridade estrita manda
> adotar as oito opções da Sorteamos — o que **remove** o 15. É decisão do founder, e está
> registrada aqui em vez de ser resolvida por conta própria.
>
> ### ✅ Decidido em 2026-11-19 (**`D2`**): **adotar as oito, e o 15 sai**
>
> As oito viram o seletor do lotemania, com os rótulos desta coluna. O **default** passa de 15 para
> **30** — o único valor nas duas listas, o que o founder nomeou, e o **medido em produção** (a
> campanha ao vivo de 11-19 abriu a contagem em `29:17`, ver `fluxo-de-compra.md`).
>
> Conferido contra a faixa de `expiration_seconds` da Paysure (**60 a 86 400**): os oito cabem, e
> **`1 Dia` dá exatamente 86 400 — o teto, sem folga nenhuma.** Aplicado na `LTM-17`.

### Aba Pagamento [OBSERVADO]

Campo único e obrigatório: **"Provedor de pagamentos online *"** — *"Selecione um banco"*.

Bancos cadastrados na conta do Império, lidos do `value` do `<option>`:

| Nome | id |
|---|---|
| **Banco paysure** | `6aab4ba845d3571887117dc6` |
| **PAY2M** | `6ab3e31645d3571887192c0d` |

Aviso no rodapé: *"Para cadastrar novos bancos, entre em contato com o nosso suporte através do
WhatsApp"* — ou seja, **o lojista não cadastra gateway sozinho** na Sorteamos. No lotemania ele
cadastra. Divergência de produto, não de tela.

---

## 2. Lista de sorteios — `/dashboard/products`

**Filtros** [OBSERVADO]: Pesquisar por título · Status · **Privacidade** (`Todos`/`Público`/`Privado`)
· Data do sorteio · Categoria · Limpar filtros.

**Estados de sorteio vistos** [OBSERVADO]: `Ativo` · `Concluído` · **`Em breve`**.
O `Em breve` é o estado de um sorteio agendado, e **o lotemania não tem equivalente**.

**Ações por linha**, rótulos exatos da árvore de acessibilidade [OBSERVADO]:

```
Privado (selo/cadeado) · Em breve (status, com seta) · Destaque · Copiar link · Editar
· Resumo das Vendas · Links de Campanha · Visualizar página · Compras · ⋮
```

**Menu ⋮ da linha — 4 itens** [OBSERVADO]: `QR Code` · `Salvar cópia` · `Ordenação: 0` ·
**`Definir ganhadores`**.

**Vocabulário de status do filtro** [OBSERVADO]: `Todos` · `Ativos` · `Em breve` · `Encerrados` —
**quatro**, e **nenhum** deles é estado de exclusão.

### ⛔ A Sorteamos não exclui sorteio pelo painel [OBSERVADO]

Procurado em **seis** lugares, na sessão de 2026-11-18 19h:

| Onde | O que tem |
|---|---|
| Ações da linha (9 botões) | Privado · Em breve · Destaque · Copiar link · Editar · Resumo das Vendas · Links de Campanha · Visualizar página · Compras |
| Menu ⋮ da linha (4 itens) | QR Code · Salvar cópia · Ordenação · Definir ganhadores |
| Página de edição | nenhum controle de exclusão |
| Seletor de status da linha | **não abre** para sorteio `Em breve` |
| Filtro de status | 4 estados, nenhum de exclusão |
| Cabeçalho e menu ⋮ da lista de compras (7 ícones + 14 itens) | nenhum |

**Conclusão: um sorteio criado é permanente do ponto de vista do operador.** Ele pode ser encerrado,
despromovido, tornado privado — não apagado. Isso explica os **10.774** sorteios na conta do
Império: eles se acumulam desde sempre porque não há como remover.

> **Consequência direta para o lotemania:** se a paridade for estrita, o lotemania também não
> ofereceria exclusão — o que é uma decisão de produto séria, não um detalhe copiado. E é o motivo
> pelo qual o sorteio de teste **não pôde ser excluído** nesta sessão. Ver *§10*.
>
> ### ✅ Decidido em 2026-11-19 (**`D7`**): **o lotemania diverge e permite excluir sorteio sem vendas**
>
> > **Textual:** *"Permitir excluir sorteio sem vendas."*
>
> **Divergência deliberada**, a favor do operador: o caso de uso é o rascunho criado por engano.
> *"Sem vendas"* foi definido na **`LTM-26`** como **zero pedidos em qualquer estado** — não "zero
> pagos" — mais zero ganhadores, porque `pending` pode ser alguém pagando agora e `expired` é o
> denominador do funil que o ETL lê.
>
> ⚠️ **Ao escrever a `LTM-26` descobriu-se que o lotemania JÁ exclui sorteio** —
> `src/lib/actions/products.ts:211`, ligado à interface em dois lugares, **sem guarda nenhuma**. A
> única coisa que impede apagar um sorteio com faturamento é uma chave estrangeira sem `onDelete`.
> **A divergência já existia, indeclarada.** A `D7` a torna deliberada e segura.

---

## 3. Lista de compras — `/dashboard/invoice/{productId}/orders`

**Cinco abas** [OBSERVADO]: `Todos` · `Pagos` · `Reservado` · `Expirados` · `Afiliados` — cada uma
com contador. Confirma a `LTM-10`.

**Duas buscas** [OBSERVADO]: `Nome` e `Título`, com botão `Buscar`. Confirma a `LTM-10`.

**Cabeçalho do sorteio** [OBSERVADO]: miniatura, título, descrição, preço, selo de estado, barra de
progresso, e três contadores — `N Livres` · `N Reservados` · `N Pagos` — mais dois cartões,
`Pagos` e `Reservados`, com contagem e total em R$.

### Os 7 ícones do cabeçalho, com rótulo [OBSERVADO]

```
Mostrar · Visualizar Página · Ranking de Compras · Títulos Premiados
· Caixas Surpresas · Roletas Premiadas · Raspadinhas Premiadas · ⋮
```

> **Quatro mecânicas de premiação, não uma.** `Títulos Premiados`, `Caixas Surpresas`, `Roletas
> Premiadas` e `Raspadinhas Premiadas` são features distintas, cada uma com tela própria a partir
> daqui. E elas **já têm tabela no lotemania**: `awarded_boxes` / `awarded_box_combos`,
> `reward_spins` / `reward_spin_combos`, `scratch_cards` / `scratch_card_combos`, `bonus_game_plays`.
>
> Isso muda o tamanho do grupo C da `LTM-18`: `instantPrizesEnabled` não é **uma** feature — é a
> porta de **quatro**. [NÃO OBSERVADO] o que cada uma faz por dentro.

**Barra de busca** [OBSERVADO]: `Nome` (texto) · `Título` (**numérico**) · `Buscar` · `Filtros` ·
`Limpar`. Note que a busca por título é por **número do título**, não pelo nome do sorteio — a
`LTM-10` já tinha lido assim, e está confirmado.

### O menu ⋮ tem **14 itens, não 13** [OBSERVADO]

A `LTM-11` listou 13. Falta **`Números`**.

| # | Item | Subtítulo | Estado |
|---|---|---|---|
| 1 | Editar | Informações do sorteio | conhecido |
| 2 | Dashboard | Painel de controle | conhecido |
| 3 | Top 10 diário | Ranking do Top 10 diário | conhecido |
| 4 | **Porcentagem** | Barra de progresso | **OBSERVADO — ver §4** |
| 5 | **Horário Premiado** | Ganhadores por horário | **OBSERVADO — ver §5** |
| 6 | Menor ou maior | Títulos vendidos | abriu sem painel próprio em sorteio vazio |
| 7 | **Números** | Números do Sorteio | **ITEM NOVO** — não estava na `LTM-11`. [NÃO OBSERVADO] |
| 8 | Vendas por dia | Resumo das vendas por dia | [NÃO OBSERVADO] |
| 9 | Relatório de Vendas | Somente pagos | conhecido |
| 10 | Relatório de Expirados | Somente expirados | conhecido |
| 11 | Relatório de Participantes | Somente pagos | conhecido |
| 12 | **Ativar títulos premiados** | Começar com títulos premiados | **OBSERVADO — ver §6** |
| 13 | Faturamento | Detalhes do faturamento | [NÃO OBSERVADO] |
| 14 | **Revisar pagamentos** | Reprocessar todas compras expiradas | **[NÃO OBSERVADO]** — a sessão caiu no clique |

---

## 4. `Porcentagem` — a barra de progresso é editável [OBSERVADO]

Abre um painel sobre a barra, com:

- a barra de progresso real (`0.00%`)
- campo **"Ajuste de porcentagem"** (numérico, começou em `0`)
- caixa **"Fixar porcentagem"**
- botões `Salvar` e `Fechar`

**O que isso é, dito sem rodeio:** um controle para exibir ao comprador uma porcentagem de vendas
**diferente da real**, e para **travá-la** nesse valor.

> ⚠️ **Isto colide com `.claude/rules/claims-ledger.md`**, que proíbe escassez e urgência que não
> correspondam ao fato. A regra é nossa e vale para material que **nós** produzimos; este é um
> recurso que **o cliente já usa** no sistema dele. O mandato de 2026-11-18 manda replicar tudo, e
> replicar isto é construir deliberadamente um mecanismo de prova social fabricada.
>
> **Não é decisão de engenharia, e não vou tomá-la por conta própria** — está registrado aqui,
> nomeado pelo que é, para o founder decidir. Nenhuma das duas respostas é obviamente errada:
> paridade é o pedido, e o risco é do negócio dele.
>
> ### ✅ Decidido em 2026-11-19 (**`D3`**): **replicar — é ferramenta do cliente**
>
> > **Textual:** *"Replicar, é ferramenta do cliente."*
>
> A `Porcentagem` sai do terreno de dúvida e entra no **escopo de construção**, no grupo C da
> `LTM-18`. **O que ela é continua escrito acima, sem eufemismo** — é o registro que importa manter.
>
> **Sobre a `.claude/rules/claims-ledger.md`, sem moralizar:** a regra **continua valendo
> integralmente para material que nós produzimos** — anúncio, DM, proposta, legenda, página. Esta é
> **ferramenta de operação do cliente**, dentro do sistema dele, e **a decisão de usá-la é dele**.
> Construir a ferramenta não é fazer a alegação.
>
> **O que permanece nosso:** o dado **gravado** continua sendo o real — o ajuste é camada de
> **exibição**, nunca reescrita de `product_numbers` ou `orders`. A barra passa a poder mentir; o
> banco não.
>
> ⚠️ **Ela atravessa três lugares, e construir um só não cumpre a decisão:** a barra na loja
> (`showSalesProgressBar`, grupo **B** — e a barra sozinha é **honesta**), a persistência do ajuste e
> da fixação (grupo **C** — é aqui que mora a decisão) e o controle no menu ⋮ da lista de compras
> (item 4 de 14, **`LTM-11`**). Detalhado na `LTM-18`.
>
> ⚠️ **E ela não é campo de `product-settings.ts`**, então **não entra na conta dos 36** nem na
> varredura do `AC1` da `LTM-18`. O grupo C passa a ser *11 campos + 1 ferramenta*.
>
> **Mesmo gênero, mesma leitura:** o `alertEnabled` (*"cronômetro de início e fim"* na página de
> vendas, `editor-14-abas.md` §5) — cronômetro com prazo que não seja real cai sob a mesma regra, e
> a mesma distinção se aplica.

---

## 5. `Horário Premiado` — sorteio por janela de tempo [OBSERVADO]

Página própria (cabeçalho verde). Campos:

| Campo | Padrão |
|---|---|
| Data inicial / Data final | janela de ~1 hora a partir de agora |
| Quantidade de Ganhadores | `1` |
| Valor da Compra | `R$ 0` — *"Valor da compra maior ou igual a R$…"* |
| Quantidade de títulos | `0` — *"Quantidade de títulos maior ou igual a…"* |
| Código de Afiliado | vazio — *"Código de afiliado igual a…"* |
| Prêmio | texto livre |

Botões: `Histórico De Ganhadores` · **`Realizar Sorteio`** · `Fechar`.

**`Realizar Sorteio` não foi clicado.** É mutante e cria ganhador; a estrutura já responde o que a
`LTM-11` precisava saber, e executar sem necessidade seria custo sem retorno.

**O que é:** sortear entre quem comprou numa janela de tempo, filtrando por valor gasto, quantidade
de títulos e afiliado, atribuindo um prêmio. É mecânica de campanha, não de sorteio principal.

---

## 6. `Ativar títulos premiados` — efeito medido [OBSERVADO]

A ação **não pede confirmação**. Clique único, toast verde: **"Título premiado ativado com sucesso"**.

**Efeito, medido nos contadores do próprio painel:**

| | Antes | Depois |
|---|---|---|
| Livres | **10** | **9** |
| Reservados | 0 | **0 🔒 1** |
| Pagos | 0 | 0 |

Um número saiu do estoque vendável e ficou **trancado** como título premiado — o cadeado com `1` ao
lado de *Reservados*. Um ícone novo apareceu também na barra de ações do cabeçalho.

> **Isto era `[CONFIRMAR]` na `LTM-11` e deixa de ser.** E confirma a preocupação registrada lá: a
> ação **muda a disponibilidade de títulos** — num sorteio ativo, mexe no que está à venda. Que ela
> **não peça confirmação nenhuma** é, por si, um achado: a `LTM-11` AC4 exige que a nossa peça
> **avise antes**, e aqui a paridade estrita seria copiar a ausência de aviso. Recomendo divergir, e
> a `LTM-11` já diz isso.

---

## 7. A loja pública

- **Catálogo:** `rapidinhas24hr.com` — bloco *"⚡ Campanhas / Escolha sua sorte"*, primeiro item em
  destaque grande, demais em linha com miniatura. [OBSERVADO]
- **Página do sorteio:** `rapidinhas24hr.com/campanha/{slug}` [OBSERVADO]
- **Menu da loja:** Início · Campanhas · Comunicados · Meus títulos · Ganhadores · Afiliados ·
  Termos de uso · Suporte [OBSERVADO]
- **Selo por sorteio** vem do `statusText` e varia de fato entre campanhas: foram vistos
  `Adquira Já!` e `SORTEIO NOS NOSSOS GRUPOS!` [OBSERVADO] — confirma a nota da `LTM-15`.
- Página de sorteio agendado mostra selo **"Em breve"** e **nenhum caminho de compra** [OBSERVADO]

---

## 8. Operacional

**A sessão do painel da Sorteamos cai rápido.** Caiu duas vezes nesta sessão de trabalho, a segunda
no meio de uma observação. É a mesma morte de sessão que o lotemania tinha e corrigiu
(`LTM-06`). Consequência prática para a `LTM-19`: **a observação tem de ser feita em blocos curtos**,
registrando a cada passo, porque o estado não sobrevive a uma pausa.

---

## 9. O que falta — e por quê

| Item | Por que não foi observado |
|---|---|
| `Revisar pagamentos` | a sessão caiu exatamente no clique |
| `Números`, `Vendas por dia`, `Faturamento`, `Menor ou maior` | sessão caiu antes |
| **Onde se exclui um sorteio** | não está no menu da linha; sessão caiu antes de procurar |
| Abas Prêmios, Afiliados, Títulos Premiados, Promoções, Alertas, Upsell, Anti Spam, Suporte, Capitalizadora, Restrições | 10 das 14 abas do editor ainda não foram abertas |
| Demais telas do painel | Afiliados, Bancos, Links de Desconto, Relatórios, Contatos, Usuários, Integrações, Capitalizadoras, Comunicados, FAQ, Analytics, Links UTM, Webhooks, Redes Sociais, Certificado, Filantropia, Termos, Privacidade, Sobre |

**Nenhuma compra foi feita, nenhum dado pessoal foi coletado, nenhum relatório foi baixado nesta
sessão** — logo não há material sujeito ao `AC8` da `LTM-19` neste diretório.

---

## 10. O sorteio de teste: o que foi feito, e o que ficou

**Ele não pôde ser excluído porque a Sorteamos não exclui sorteio** (§2). Não foi falta de tentativa
nem de sessão: foi procurado em seis lugares e não existe.

### O que ele é hoje

| | |
|---|---|
| Id | `6afde6282bfd48a5b86b14b9` |
| Privacidade | **Privado** — fora do catálogo público, verificado |
| Status | **Em breve** |
| Início das vendas | **18/11/2027** |
| Caminho de compra na loja | **não existe** — verificado na URL direta |
| Títulos | 10, sendo 1 trancado pelo teste de "Ativar títulos premiados" |
| Compras | zero |

**Ninguém consegue comprar nele**, nem com o link na mão. O risco que o founder nomeou ao autorizar
— *"o sorteio acabar ficando público e alguém de fato comprar"* — **não se materializou e não pode
se materializar** enquanto a data de início estiver em 2027.

### ✅ Decidido pelo founder em 2026-11-19 (**`D5`**): **deixar como está**

> **Textual:** *"Deixar como está."*

**Dos três caminhos que estavam aqui, sobrou um.** Ficam registrados os dois que caíram, com o motivo:

| Caminho | Estado |
|---|---|
| **Deixar como está** | ✅ **a decisão.** Custo: uma linha a mais numa lista de 10.774, invisível ao público, claramente nomeada `ZZ TESTE TECNICO - NAO COMPRAR`. É o caminho de menor risco |
| ~~Pedir a exclusão ao suporte da Sorteamos~~ | ❌ **fora.** Abrir chamado no suporte do fornecedor **do cliente** era decisão dele, e ele decidiu não abrir |
| ~~Encerrá-lo~~ | ❌ **fora.** E continuava `[NÃO OBSERVADO]`: o seletor de status **não abriu** para este sorteio — pode ser regra (agendado não encerra) ou exigir a data chegar |

**O motivo da decisão é o achado do §2 deste documento: a Sorteamos não exclui sorteio**, procurado
em seis lugares. Não há como apagá-lo, e os dois contornos custam mais do que a linha custa.

Registrado também na `LTM-19`, que é onde o protocolo de observação vive.

### A lição que fica para a `LTM-19`

**Verificar o caminho de saída antes de criar, não depois.** O protocolo da `LTM-19` cobria
invisibilidade e compra — as duas coisas que podiam dar errado com o público — e **não cobria "como
desfazer"**. Deu certo: nada vazou. Mas a pergunta *"como eu apago isto?"* tinha de ter sido
respondida **antes** do primeiro clique em "Criar Sorteio", e passa a fazer parte do protocolo.
