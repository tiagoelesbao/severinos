# As ações por sorteio no painel da Sorteamos — mapeadas

Observado em 2026-11-17 na sessão do founder, com autorização explícita para clicar e baixar.
**Nada foi alterado.** Duas ações do menu foram deliberadamente **não executadas** por serem
mutantes — ver §4.

Isto fecha as perguntas **A1**, **A2** e **A7** que ficaram abertas em
`2026-11-16-baseline-sorteamos/05-pendente-de-observacao.md`.

---

## 1. Onde as ações vivem — e por que eu não as achava

Eu procurava o "menu de 12-13 itens" na **lista de sorteios** (`/dashboard/products`). Ele não
está lá. Está na **Lista de Compras de um sorteio**:

```
/dashboard/invoice/{productId}/orders
```

Na lista de sorteios existem só **nove ícones inline** + um menu de quatro itens (QR Code, Salvar
cópia, Ordenação, Deletar ganhadores). O menu grande é outro, e é este documento.

> **Nosso equivalente hoje:** `/dashboard/products/{id}/orders` — quatro abas, uma tabela e **um**
> ícone de ação. A distância é grande, e está medida abaixo.

## 2. O menu de 13 itens

| # | Item | Subtítulo | O que faz | Observado? |
|---|---|---|---|---|
| 1 | **Editar** | Informações do sorteio | abre o editor de 14 abas | sim (ontem) |
| 2 | **Dashboard** | Painel de controle | **navega** para `/dashboard/products/{id}/dashboard` | **sim** |
| 3 | **Top 10 diário** | Ranking de Top 10 diário | **modal** com seletor de data + tabela | **sim** |
| 4 | **Porcentagem** | Barra de progresso | — | não |
| 5 | **Horário Premiado** | Ganhadores por horário | — | não |
| 6 | **Menor ou maior** | Títulos vendidos | — | não |
| 7 | **Vendas por dia** | Resumo das vendas por dia | — | não |
| 8 | **Relatório de Vendas** | Somente pagos | **baixa CSV direto**, sem modal | **sim** |
| 9 | **Relatório de Expirados** | Somente expirados | baixa CSV direto | formato já conhecido |
| 10 | **Relatório de Participantes** | Somente pagos | baixa **PDF** | formato já conhecido |
| 11 | ⛔ **Ativar títulos premiados** | Começar com títulos premiados | **muta** | **não executado** |
| 12 | **Faturamento** | Detalhes de faturamento | — | não |
| 13 | ⛔ **Revisar pagamentos** | Reprocessar todas compras expiradas | **muta** | **não executado** |

### O que foi visto de cada um

**Dashboard (item 2)** — página própria por sorteio, `Geral: Campanha`. Onze cartões de métrica:

```
Faturamento · Compras · Ticket Médio
Visitas Hoje · Visitas Ontem · Visitas Total
Expirados (contagem + total R$)
Upsell (contagem + total R$)
Descontos (contagem + total R$)
Participantes (total + hoje)
```

Mais um gráfico **"Desempenho da Campanha Por Dia"** (faturamento e quantidade). **O lotemania não
tem nada equivalente** — nem a página, nem os cartões, nem o gráfico.

**Top 10 diário (item 3)** — modal com **seletor de data** e tabela ranqueada:
`Participante | Compras | Números | Total R$`, de 1º a 10º.

**Relatório de Vendas (item 8)** — **baixa direto, sem modal nenhum**. É a resposta à pergunta A7.

## 3. O contrato do export — medido no arquivo baixado

Arquivo: `relatorio-vendas-{slug-do-sorteio}.csv`

| | |
|---|---|
| Separador | **`;`** (ponto e vírgula) |
| BOM | **não tem** |
| Colunas | **25** |
| Linhas | 1 de cabeçalho + 1 por compra paga |

```
Id do Sorteio;Título do Sorteio;Id da Compra;Quantidade;Status;Valor;Nome;Telefone;
País;E-mail;CPF;Nome Social;Data de Nascimento;Data da Compra;Id do Pagamento;
Host do Pagamento;Aprovado por;Código do Afiliado;Origem do Tráfego;
Conteúdo do Tráfego;Campaign;Term;fbc;fbp;Números
```

Três observações que importam para a migração:

1. **`Aprovado por`** — o @po já tinha apontado que este campo **não tem origem no lotemania**.
   Agora está confirmado que ele é coluna do export, não detalhe interno: sem ele, a baixa manual
   de pagamento fica sem rastro no relatório que o cliente usa.
2. **Sete colunas de dado pessoal** — Nome, Telefone, País, E-mail, CPF, Nome Social, Data de
   Nascimento. O export é, por desenho, um arquivo de dado pessoal. Portão **G7** se aplica a
   qualquer coisa que o reproduza.
3. **Quatro colunas de atribuição** — Origem do Tráfego, Conteúdo do Tráfego, Campaign, Term,
   mais `fbc` e `fbp`. São exatamente os campos que a `LTM-04` precisa emitir, e que hoje chegam
   vazios na Sorteamos (Achado A).

## 4. O que eu não cliquei, e por quê

**Item 11, "Ativar títulos premiados"** e **item 13, "Revisar pagamentos — Reprocessar todas
compras expiradas"**.

Os dois alteram estado de um sorteio **ativo**, com dinheiro real em trânsito. O founder autorizou
*"clicar para ver o que cada coisa faz"* e no mesmo pedido disse *"só não altere nada"* — e antes
disso já havia posto a regra de nunca agir sobre sorteio ativo. Executar qualquer um deles para
descobrir o que faz seria exatamente o que a regra proíbe.

**O que falta deles pode ser obtido sem risco:** abrir o mesmo menu num sorteio **concluído**, ou
ler o comportamento no bundle. Nenhum dos dois foi feito nesta passada.

## 5. A distância, por elemento

| Elemento | Sorteamos | lotemania |
|---|---|---|
| Abas da lista de compras | **5** — Todos, Pagos, Reservado, Expirados, **Afiliados** | 4 (sem Afiliados) |
| Busca | por **Nome** e por **Título** | nenhuma |
| Ações por linha | **5** — Enviar mensagem no WhatsApp · *(aprovar)* · Expirar compra · Ver números · Detalhes | **1** (Detalhes) |
| Menu do sorteio | **13 itens** | nenhum |
| Dashboard por sorteio | página com 11 cartões + gráfico | não existe |
| Exports | 3 (2 CSV + 1 PDF) | nenhum |
| Seleção em massa | checkbox por linha + no cabeçalho | não existe |

**"Expirar compra"** e a ação de aprovar são mutantes e precisam de confirmação no nosso lado —
na Sorteamos elas são ícones diretos na linha.

---

*Observado na sessão autenticada do founder, com autorização para clicar e baixar. Nenhum
formulário salvo, nenhuma ação mutante executada, nenhum sorteio alterado. Nomes de compradores
vistos nas telas **não** foram transcritos para este documento.*
