# O menu da Lista de Compras — os 14 itens, agora todos vistos

**Data:** 2026-11-18, 19h · **Onde:** `/dashboard/invoice/6afde6282bfd48a5b86b14b9/orders`
**Complementa:** `README.md` §3 (a lista dos 14) e §4–§6 (Porcentagem, Horário Premiado, Ativar títulos premiados)

---

## ⚠️ O menu é contextual — e isso resolve a divergência de contagem

A `LTM-11` listou **13** itens; eu contei **14**. **Os dois estão certos, em momentos diferentes.**

Observado na mesma sessão, no mesmo sorteio:

| Momento | Itens |
|---|---|
| Antes de ativar títulos premiados | **14** |
| **Depois** de ativar | **13** — `Ativar títulos premiados` **desaparece** |

O item some quando já existe título premiado ativo. A `LTM-11` quase certamente observou um sorteio
que já tinha a mecânica ligada.

**Consequência para a paridade:** o menu **não é uma lista fixa**. Replicá-lo como lista estática de
13 ou de 14 erra nos dois casos — ele é montado conforme o estado do sorteio. Quantos outros itens
são condicionais fica **[NÃO OBSERVADO]**.

---

## 4. `Números` — na verdade é **Números Bloqueados** [OBSERVADO]

O subtítulo do menu diz *"Números do Sorteio"*, mas o modal se chama **"Números Bloqueados"**.

| Parte | Conteúdo |
|---|---|
| Título | `Números Bloqueados 0` — com a contagem |
| Bloqueio em massa | **Menores** `+10` `+50` `+100` · **Maiores** `+10` `+50` `+100` |
| Filtrar por | `Premiados` · `Bloqueados` · `Desbloqueados` · `Todos` |
| Ação destrutiva | **`Remover todos bloqueados`** (em vermelho) |
| Busca | campo `Filtrar número` + botão `Filtrar` |
| Vazio | *"Nenhum número bloqueado encontrado."* |
| Paginação | `Primeira` · `Anterior` · `Próximo` · `Última` |
| Adicionar | **`Adicionar Intervalo De Números`** e `Adicionar Número` (+) |

> ⚠️ **Banner na própria tela:** *"Esta funcionalidade está em versão **Beta**. Se ocorrer algum
> problema, por favor, entre em contato com o suporte imediatamente."*
>
> **É a única funcionalidade da Sorteamos que se declara Beta.** Vale para a paridade: replicar uma
> funcionalidade que o próprio fornecedor marca como instável merece decisão explícita, não cópia
> automática.

**Mapeamento:** o lotemania **já tem** a tabela `blocked_numbers` (`src/db/schema/core.ts`). O que
não existe é a tela nem a lógica.

**O que "Menores +10" significa, e por que importa:** bloquear os 10 menores números é retirar
`1`–`10` do estoque. Números baixos têm valor percebido — o filtro `Premiados` no mesmo modal sugere
que bloqueio e título premiado se cruzam. **Como se cruzam: [NÃO OBSERVADO].**

---

## 8. `Vendas por dia` [OBSERVADO]

Modal simples: cabeçalho **`Vendas por Dia`** com **`Total: R$ 0,00`** alinhado à direita, e o corpo
listando um registro por dia. Vazio: *"Nenhuma venda até o momento!"*.

Mapeia ao `vendas_por_dia` que o `reports.ts` do lotemania já calcula — mas lá é tabela numa tela
própria, aqui é modal no contexto do sorteio.

---

## 13. `Faturamento` — **separa baixa automática de baixa manual** [OBSERVADO]

```
Faturamento
  Baixa Automática
    Total Arrecadado:        R$ 0,00
    Quantidade de Transações: 0
  Baixa Manual
    Total Arrecadado:        R$ 0,00
    Quantidade de Transações: 0
  Total
    Arrecadado:  R$ 0,00
    Transações:  0
```

**Este é o achado mais importante deste documento.**

A Sorteamos **separa o dinheiro que entrou sozinho (aviso do gateway) do dinheiro que um operador
deu baixa à mão**, com total e contagem para cada. Isso confirma, de dentro do produto, três coisas
que até agora eram inferência nossa:

1. **Baixa manual existe e é frequente o bastante para ter linha própria** no painel de faturamento.
2. **A `LTM-16` (trilha de ação do operador) não é ouro sobre azul** — é a peça que falta para
   responder *quem* deu a baixa manual. A coluna `Aprovado por` do CSV (`LTM-13` AC7) é a mesma
   pergunta, pelo outro lado.
3. **A `LTM-12`** (painel por sorteio) precisa desta quebra. Um "Faturamento" único, sem separar
   automático de manual, perde a informação que o operador usa para conferir caixa.

---

## 14. `Revisar pagamentos` — silenciosa [OBSERVADO]

Subtítulo: *"Reprocessar todas compras expiradas"*.

**Executada no sorteio de teste (zero compras). O que aconteceu:**

- **Nenhum diálogo de confirmação.** Clique único e pronto.
- **Nenhum retorno.** Sem toast, sem modal, sem mensagem de "N compras reprocessadas" nem de
  "nenhuma compra para reprocessar". O menu fecha e a tela fica idêntica.

> **O efeito sobre compras expiradas de verdade continua `[NÃO OBSERVADO]`** — faltam compras
> expiradas para observar. Mas **a ausência de confirmação e de retorno é observação completa**, e
> vale por si.
>
> ⚠️ **Paridade estrita aqui seria copiar uma ação que mexe em pagamento, sem perguntar e sem
> informar.** Num sorteio com 1.000 compras expiradas, o operador clicaria e não teria como saber o
> que mudou. A `LTM-11` AC4 já manda divergir — exigindo confirmação que **diz o que vai mudar e em
> quantos registros**. Isso agora tem base observada, não só princípio.

---

## As duas mutantes, lado a lado

| | `Ativar títulos premiados` | `Revisar pagamentos` |
|---|---|---|
| Pede confirmação? | **não** | **não** |
| Dá retorno? | **sim** — toast *"Título premiado ativado com sucesso"* | **não** — nada |
| Efeito medido? | **sim** — 10 Livres → 9 Livres, 🔒1 | não (faltam compras expiradas) |
| Reversível pela interface? | **[NÃO OBSERVADO]** | **[NÃO OBSERVADO]** |

**Nenhuma das duas pergunta antes.** Uma avisa depois; a outra nem isso.

---

## O que ainda falta neste menu

| Item | Estado |
|---|---|
| `Menor ou maior` (*"Títulos vendidos"*) | clicado; **não abriu painel próprio** num sorteio sem vendas. Precisa de sorteio com vendas |
| `Top 10 diário` | observado antes (`LTM-11`), com seletor de data e tabela de ranking |
| `Dashboard`, `Editar` | navegação conhecida |
| `Relatório de Vendas / Expirados / Participantes` | formato conhecido (`LTM-13`); não rebaixados nesta sessão |
| Reversão das duas mutantes | **[NÃO OBSERVADO]** — e é o que mais falta saber antes de replicá-las |
