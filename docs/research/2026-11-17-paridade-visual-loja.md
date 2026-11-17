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

## O modal de Checkout — **medido** em 2026-11-17

Autorizado pelo founder. Fluxo exercitado até o modal abrir e **parado ali**: o "Concluir
Reserva" **não** foi clicado, o modal foi fechado pelo X e a seleção desfeita. Conferido ao final:
zero células selecionadas, zero reserva criada.

> **Confirmado de passagem:** abrir o modal **não** reserva. A reserva só nasce no "Concluir
> Reserva" — o "Conectando no Servidor..." da barra inferior é identificação de comprador, não
> bloqueio de número.

| Elemento | Valor medido |
|---|---|
| **Overlay** | `rgba(0,0,0,0)` — **transparente**, sem `backdrop-filter`. O escurecimento que se vê nas telas vem do `box-shadow` do painel, não de um véu |
| **Painel** | `rgb(33,43,54)` → **`#212B36`**, raio **16px**, `padding: 0`, largura máx. **600px** |
| **Sombra do painel** | `rgba(0,0,0,0.24) -40px 40px 80px -8px` — deslocada para a **esquerda e para baixo**, é a assinatura do Minimal UI |
| **Título "Checkout"** | **18px / peso 700**, branco |
| **Banner (identificado)** | fundo `rgb(8,102,13)` → **`#08660D`**, texto `rgb(233,252,212)` → **`#E9FCD4`**, raio **8px**, padding `6px 16px`, 14px / peso 400 |
| **Nome do comprador** | **18px / peso 700**, branco |
| **"Concluir Reserva"** | `#198754`, raio **5px**, altura **48px**, **15px / peso 700**, `text-transform: capitalize`, largura total, elevação 2 do Material |
| **"Alterar conta"** | `#198754`, **14px / peso 600**, sem sublinhado |

**`#212B36` é o `background.paper` do Minimal UI**, e `#E9FCD4` sobre `#08660D` é o par
`success.lighter` / `success.darker` do mesmo tema. O modal não é estilizado à mão — é o tema do
template aplicado.

### O que continua sem medir no modal

O estado **não identificado** (banner azul com ⓘ, campo de telefone com seletor de país, banner
âmbar de aviso) não apareceu, porque a sessão do founder já identifica o comprador. Os valores
daquele estado seguem sendo **leitura das telas**, não medição — e precisam de uma passada em
janela anônima para fechar.

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

---

## 🔴 A paleta base nunca foi alinhada — e é o achado de maior alcance

A grade e o rodapé eu já consertei com valores exatos. Mas eles são **exceções escritas à mão por
cima de um tema que diverge na raiz**. Em `apps/lotemania/src/app/globals.css`:

| Token | lotemania | Sorteamos (medido) | |
|---|---|---|---|
| `--background` | `#0d1117` | **`#161C24`** | dark do GitHub contra o do Minimal UI |
| `--card` | `#171e2b` | **`#212B36`** | `background.paper` do Minimal UI |
| `--primary` | `#10b981` | **`#198754`** | esmeralda do Tailwind contra o verde da loja |
| `--muted` | `#1a2230` | — | sem correspondente direto |
| `--font-sans` | genérica | **Montserrat** (loja) · **Public Sans** (painel) | duas famílias, uma por app |

**Nenhuma destas foi ajustada.** Conferido em 2026-11-17: `D:	est` (o projeto original) está
**idêntico** ao que importamos, exceto pelos quatro arquivos que mexemos hoje — não existe um
conjunto de ajustes perdido para recuperar.

**Por que isto importa mais que a grade:** toda tela que usa `bg-background`, `bg-card`,
`text-primary` ou `border` herda o desvio. É a explicação para a queixa sobre o **dashboard**, onde
não há valores hex escritos à mão para compensar — lá o tema é tudo o que existe.

**Consequência para o plano:** alinhar `globals.css` aos valores medidos é **uma edição de um
arquivo** que aproxima dezenas de telas de uma vez, e deve vir **antes** de qualquer paridade tela
a tela. Fazer o contrário é escrever exceção à mão em cada tela para compensar um tema errado — que
é precisamente como a grade acabou com `bg-muted`.

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

---

## O catálogo tem TRÊS seções, não uma

Observado nas telas do founder em 2026-11-17. Eu tinha modelado o catálogo como uma lista só de
campanhas ativas. São três blocos empilhados:

### 1. Campanhas ativas

Primeira em destaque com arte grande (proporção **1,23**, raio 8px); as demais em linha com
miniatura **90×110**. Badge verde **"Adquira Já!"** (`#198754`, 8px/600, `2.5s infinite blink`).

### 2. Campanhas concluídas

Mesma forma de linha, **badge cinza "Concluído"** no lugar do verde. Uma delas aparece com
`RESULTADO NOS NOSSOS GRUPOS!!!` — é o `statusText` do sorteio, não um estado fixo.

São sorteios **do dia que já fecharam** e ainda aguardam definição de ganhador. **Hoje o nosso
catálogo filtra `status = 'active'` e simplesmente não os mostra** — o comprador perde a prova
social de que a casa entrega.

### 3. 🎉 Ganhadores sortudos

Cartões com foto (placeholder quando não há), e:

```
Marcus ***                          ← nome mascarado
🏆 01° RAPIDINHA VALENDO R$ 27.000,00!
Prêmio: R$ 27.000,00
Número da sorte: 58
Data da premiação: 11/10/2026
Telefone: (98) ****-****            ← telefone mascarado
```

> **O mascaramento é da Sorteamos**, não da captura. Nome e telefone saem truncados na página
> pública. É decisão de produto deles e vale copiar: a lista de ganhadores é prova social, e prova
> social não precisa de CPF nem de telefone inteiro.

A tabela `winners` do lotemania **já tem** `winnerName`, `phone`, `prizeDescription`,
`prizeAmount`, `winningNumber` e `announcedAt` — tudo o que esses cartões mostram. Falta a tela.

### Dois defeitos nossos que isso expôs

1. **O badge esticava a largura toda.** Era `<span>` dentro de um `flex-col`, então ele herdava
   `align-items: stretch`. Corrigido com `w-fit self-start`. Pequeno, mas é o tipo de coisa que
   faz a tela inteira parecer errada.
2. **Os cartões da lista não tinham respiro lateral** — encostavam na borda. Corrigido com `mx-3`.
