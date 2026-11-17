# Paridade visual da loja — valores medidos, não impressões

Medido em 2026-11-17 na loja real (`rapidinhas24hr.com`), **viewport mobile**, lendo
`getComputedStyle` de cada elemento. Não é "parecido com": é o valor que o navegador aplica.

A loja é pública, então nada aqui exigiu sessão. A seleção de número usada para capturar o estado
*selecionado* é **client-side** — nenhuma reserva foi criada, e ela foi desfeita ao final
(conferido: zero células selecionadas ao sair).

---

## 🔴 O achado que explica a queixa

**O deploy de 26/10 servia os valores exatos da Sorteamos. O código-fonte de hoje não.**

Comparando o HTML que a produção servia **antes** do redeploy de 2026-11-17 com o fonte atual:

| | Produção de 26/10 | Fonte atual |
|---|---|---|
| Célula livre | `bg-[#37495d]` | `bg-muted` |
| Célula reservada | `bg-[#ffeb3b]` | `bg-yellow-400` (`#facc15`) |
| Célula paga | `bg-[#4caf50]` | `bg-emerald-500` (`#10b981`) |
| Raio da célula | `rounded-[4px]` | `rounded-md` (6px) |
| Sombra | `shadow-[0_0_2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.12)]` | **nenhuma** |
| Legenda | `rounded-[5px]` | `rounded-full` |
| Botão Prêmios | `bg-[#6c757d] rounded-[5px]` | — |

Em algum momento o `number-grid.tsx` foi reescrito de **valores hex exatos** para **tokens
semânticos do Tailwind**. E o redeploy de 2026-11-17 levou essa regressão para produção: **antes
dele a loja estava fiel**.

É exatamente o que o founder descreveu — *"cores divergentes, luzes, sombras"*. Não é uma
impressão: é uma regressão medível, com data.

---

## A grade de números — os quatro estados

| Estado | Cor medida | Texto | Cursor |
|---|---|---|---|
| **Livre** | `rgb(55, 73, 93)` → `#37495D` | branco | `pointer` |
| **Reservado** | `rgb(255, 235, 59)` → `#FFEB3B` | **preto** | `default` |
| **Pago** | `rgb(76, 175, 80)` → `#4CAF50` | **preto** | `default` |
| **Selecionado** | `rgb(38, 108, 88)` → `#266C58` | branco | `pointer` |

Comuns aos quatro:

```
border-radius: 4px
box-shadow:    rgba(0,0,0,0.2) 0 0 2px 0, rgba(0,0,0,0.12) 0 12px 24px -4px
transition:    background-color 0.3s ease-in-out
font-size:     16px
font-weight:   400          ← não é fonte monoespaçada
border:        none
```

> **Três divergências do nosso fonte que ninguém notaria sem medir:** o peso é **400**, não 500;
> a fonte **não é monoespaçada** (hoje temos `font-mono`); e a transição é **300 ms
> `ease-in-out`**, não o `transition-colors` padrão de 150 ms. O estado selecionado **não tem
> anel** — hoje temos `ring-2 ring-offset-2`.

## Rodapé de seleção

Aparece quando há ao menos um número selecionado.

| | Valor medido |
|---|---|
| Container | `position: fixed`, `bottom: 0`, `left/right: 0`, `z-index: 999` |
| Fundo | `rgb(22, 28, 36)` → `#161C24` |
| Raio | `16px 16px 0 0` — arredondado **só em cima** |
| Sombra | **nenhuma** |
| Altura | ~109 px (faixa de chips + botão) |

**Chips dos números escolhidos:** `rgb(25, 135, 84)` → `#198754`, raio **6px**, sem sombra, texto
branco. Note que é **diferente** do verde da célula selecionada (`#266C58`) — são dois verdes, de
propósito.

**Botão "Quero participar":**

```
background:    #198754
height:        60px
border-radius: 5px
font-size:     14px
font-weight:   700
padding:       6px 16px
box-shadow:    0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12)
```

Valor total alinhado à direita: **16px / peso 600**. Rótulo: **16px / peso 400**, sem
`text-transform`.

> Hoje o nosso é uma barra `sticky bottom-4` com borda e `shadow-lg`, dentro do fluxo. **O certo é
> `fixed` colado no rodapé, sem borda, com o topo arredondado.** É a diferença entre "parece um
> cartão flutuando" e "é a barra do app".

## Página e cabeçalho

| | Valor |
|---|---|
| Fundo do `body` | `rgb(22, 28, 36)` → `#161C24` |
| Fonte | **`Montserrat`**, com `Public Sans` de reserva |
| Cabeçalho | `position: sticky`, altura **70px**, fundo **transparente**, **sem sombra** |

**`Montserrat` é o achado tipográfico.** O painel usa Public Sans (herança do Minimal UI); a loja
usa Montserrat por cima. São duas famílias, uma por aplicação.

## Botão "Prêmios"

```
background:    #6C757D
border-radius: 5px
font-size:     13px        ← não 14
font-weight:   700         ← não 500
padding:       4px 10px
text-transform: capitalize
box-shadow:    0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12)
largura:       100%
```

Essa sombra de três camadas é a **elevação 2 do Material**. Ela aparece no botão Prêmios e no
"Quero participar" — é a assinatura de luz da loja, e é o que o founder chamou de *"luzes e
sombras"*.

## Grade: colunas

Sete colunas no mobile medido. Cada célula ocupa 1,8/12 da grade do MUI
(`MuiGrid-grid-xs-1.8`), o que dá **6,66 colunas** — por isso o alinhamento tem aquela folga
característica à direita. Hoje usamos `grid-cols-7` fixo.

---

## O modal de Checkout

Capturado das telas do founder, **não** medido — abrir o modal num sorteio ativo exige verificar
se ele cria reserva no servidor, e isso não foi feito. **Os valores abaixo são leitura visual e
precisam ser confirmados por medição** antes de virarem critério de aceite.

**Cabeçalho:** ícone de carrinho + "**Checkout**" + X, com divisória abaixo.

**Banner de estado — muda de cor conforme o comprador foi identificado:**

| Estado | Cor | Ícone | Texto |
|---|---|---|---|
| Não identificado | azul | ⓘ | "Você está adquirindo **N** unidade(s) do produto {título}" |
| Identificado | **verde** | ✓ | o mesmo texto |

**Não identificado:** campo de telefone com seletor de país (bandeira do Brasil + chevron), rótulo
"Informe seu telefone *", e **banner âmbar de aviso** com ⚠️ "Informe seus dados para continuar".

**Identificado:** divisória, cartão do comprador com avatar, nome e telefone, divisória, e o link
"**Alterar conta**" em verde abaixo do botão.

**Sempre:** letra miúda *"Ao efetuar este pagamento e confirmar a compra deste título de
capitalização, declaro que li e concordo com os termos de uso"* — com **"termos de uso"** em link
verde. Depois, botão verde **"Concluir Reserva"** com seta circular à direita.

> **"Título de capitalização" é vocabulário jurídico, não decoração.** Precisa sair igual.

---

## O que falta medir

| Item | Por quê |
|---|---|
| O modal de Checkout | Verificar antes se abri-lo cria reserva no servidor. Se criar, medir num sorteio concluído ou com autorização |
| Hero e sobreposição do título | A arte ocupa a largura toda e o título fica por cima, com recorte — não medido |
| Menu hambúrguer aberto | Não aberto |
| `Meus títulos`, login e cadastro do comprador | Telas próprias, não visitadas |
| Animações e estados de `hover`/`active` | `getComputedStyle` dá o estado em repouso; transição precisa de captura em movimento |

---

*Medido com `getComputedStyle` na loja real, viewport mobile. Nenhuma reserva criada, nenhum
sorteio ativo alterado, nenhuma compra iniciada.*
