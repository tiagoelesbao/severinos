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
| Estado em que esta sessão terminou | **AINDA EXISTE — pendente de exclusão** (a sessão do painel caiu) |

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

> ⚠️ **Não há "Excluir" neste menu.** Onde se exclui um sorteio ficou **[NÃO OBSERVADO]** — a sessão
> caiu antes. É o que falta para fechar o ciclo do sorteio de teste.

---

## 3. Lista de compras — `/dashboard/invoice/{productId}/orders`

**Cinco abas** [OBSERVADO]: `Todos` · `Pagos` · `Reservado` · `Expirados` · `Afiliados` — cada uma
com contador. Confirma a `LTM-10`.

**Duas buscas** [OBSERVADO]: `Nome` e `Título`, com botão `Buscar`. Confirma a `LTM-10`.

**Cabeçalho do sorteio** [OBSERVADO]: miniatura, título, descrição, preço, selo de estado, barra de
progresso, e três contadores — `N Livres` · `N Reservados` · `N Pagos` — mais dois cartões,
`Pagos` e `Reservados`, com contagem e total em R$.

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
