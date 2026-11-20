# A loja, pelo lado do comprador

**Data:** 2026-11-18, 20h · `rapidinhas24hr.com` · Tudo **[OBSERVADO]** salvo onde marcado.
**Complementa:** `docs/research/2026-11-17-paridade-visual-loja.md`, que mediu cores e espaçamentos.

> **Nenhuma reserva foi feita.** Observar a grade não cria pedido; clicar num número livre de um
> sorteio ao vivo **poderia** criar, e isso está fora da autorização. Ver *O que falta*.

---

## A rota

```
rapidinhas24hr.com/                      catálogo
rapidinhas24hr.com/campanha/{slug}       a campanha
```

**Estado 404:** faixa vermelha com *"Erro 404 - Campanha não encontrada"*, dentro do mesmo cartão
da loja, com cabeçalho e menu intactos.

## Cabeçalho e moldura, iguais em toda página

- Barra preta com a logo (`IMPÉRIO PRÊMIOS`) centralizada e **hambúrguer** à direita
- **Dois botões flutuantes verdes** à direita, empilhados: **`Grupo`** e **`WhatsApp`**, ambos com
  ícone do WhatsApp. É o widget de suporte da aba *Suporte* (`support.whatsappGroup` + `whatsapp`)
- Container estreito, centralizado, com fundo escuro ao redor — **a loja é desenhada para o
  celular** e apenas centralizada no desktop

## A campanha **ativa** — a tela que mais importa

De cima para baixo:

| Bloco | Conteúdo |
|---|---|
| Imagem | arte da campanha, largura total do container |
| Faixa sobre a imagem | selo de estado + **título** + subtítulo (o `statusText`) |
| Barra preta | 🛒 **`Meus títulos`** |
| Preço | **`Por apenas`** + pílula com `R$ 10,00` |
| **`🏆 Prêmios`** | barra clicável — painel retrátil |
| **Três contadores** | pílulas: `50 Livres` (cinza) · `21 Reservados` (amarela) · `29 Pagos` (verde) |
| **A grade** | os números |
| **`Descrição/Regulamento`** | barra clicável — painel retrátil |
| Compartilhar | Facebook · Twitter · Telegram · WhatsApp |

### A grade

- Números **com zero à esquerda**: `00`, `01`, … `99`
- Pílulas arredondadas, não quadrados
- **Três estados por cor:**

| Estado | Cor |
|---|---|
| livre | cinza-azulado escuro |
| reservado | **amarelo** |
| pago | **verde** |

> ### ⚠️ Contei **7 colunas**, a instrução era **6** — e o founder decidiu **6**
>
> **O que foi medido [OBSERVADO]:** nesta campanha (100 números, `00`–`99`), a grade da Sorteamos tem
> **sete** por linha: `00 01 02 03 04 05 06`, depois `07`…`13`, e a última linha fica com `98 99`.
> Contado em **duas** campanhas de 100 números.
>
> **O que foi decidido:** o founder instruiu em 2026-11-17 *"primeiro quero apenas 6 colunas conforme
> modelo original"*, e **reafirmou em 2026-11-19 (decisão `D4` do epic): manter 6 colunas.**
>
> **As duas coisas ficam registradas porque são duas coisas.** Medi 7; a decisão é 6. Isso **não é
> contradição a resolver** — é o founder escolhendo o desenho dele em cima de uma medição que ele
> conhece. A medição não deixa de valer por isso, e é por ela que a hipótese abaixo continua de pé.
>
> **A hipótese continua `[NÃO CONFIRMADO]` — e deixa de ser bloqueio.** A explicação mais provável
> para 6 contra 7 é que **a grade da Sorteamos se ajusta à largura do número**: um sorteio de 1.000
> cotas tem números de três dígitos e caberia menos por linha. Nesse caso 6 e 7 são o **mesmo
> desenho** em sorteios diferentes. Testar isso exige uma campanha ativa com 3 dígitos, e as que
> tentei estavam concluídas ou com slug que não acertei.
>
> **Com a `D4` tomada, confirmar a hipótese passou de pré-requisito a curiosidade útil:** ela não
> muda o que se implementa (6 está decidido), só diria se a Sorteamos é responsiva. Fica na lista de
> *o que falta*, sem prioridade.
>
> ### ⚠️ E a `D4` não fecha tudo: o lotemania tem **dez** colunas no desktop
>
> Conferido no código em 2026-11-19 — `src/app/loja/[tenant]/[productSlug]/number-grid.tsx:119`:
>
> ```
> grid grid-cols-6 gap-1.5 sm:grid-cols-10
> ```
>
> **São 6 no celular e 10 a partir de `sm` (640px).** A `D4` responde *6 contra 7*; ela **não
> responde 6 contra 10**, porque ninguém levantou essa pergunta — a instrução de 11-17 foi lida e
> aplicada como `grid-cols-6`, e o `sm:grid-cols-10` que já estava ali não foi tocado.
>
> E a comparação aponta para uma divergência: **a loja da Sorteamos é desenhada para o celular e
> apenas centralizada no desktop** (ver *Cabeçalho e moldura*, acima), em container estreito — o que
> sugere que ela **não** muda a contagem de colunas no desktop. **[NÃO OBSERVADO]** no desktop,
> porém: eu não medi a grade dela em viewport largo.
>
> **Registrado, não corrigido.** Mexer nisso é mudar a loja por dedução, e o `sm:grid-cols-10` pode
> ter sido escolha deliberada de quem importou o app. É pergunta para o founder, não conserto meu.
> ⚠️ **E ela toca a `LTM-08`**, que vai partir a célula da grade para a meia cota: a contagem de
> colunas e a célula partida se encontram no mesmo arquivo.

### O nome do comprador aparece ao passar o mouse

Passando o cursor sobre um número **pago**, aparece um balão com o **nome do comprador**.

> **É o `showPaidParticipantNames` do editor, em funcionamento** — e é a primeira das 36
> configurações cujo efeito na loja foi **visto**, não deduzido. Para a `LTM-18`, isso tira o campo
> do terreno da suposição: o comportamento é *tooltip no número pago*, não uma lista em outro lugar.

## A campanha **concluída** — o AC2 da `LTM-15`, observado

Uma campanha concluída mostra, no lugar da grade:

- selo cinza **`Concluído`** sobre a imagem
- seção **`🎉 Ganhadores`** — um cartão por ganhador
- `Descrição/Regulamento` e os botões de compartilhar

**Nenhuma grade. Nenhum seletor. Nenhum botão de compra.** É exatamente o que o `AC2` da `LTM-15`
exige — e agora está observado em duas campanhas distintas.

### O cartão de ganhador, campo a campo

```
<foto ou placeholder cinza>   Marcus ***
                              Prêmio: R$ 27.000,00
                              Número da sorte: 58
                              Data da premiação: 11/10/2026
                              Telefone: (96) ****-****
```

**Confere com o exemplo registrado na `LTM-15`**, inclusive o placeholder cinza quando não há foto.

**As duas máscaras, de novo:**

| Onde | Formato |
|---|---|
| cartão de ganhador | `Primeiro ***` · `(DD) ****-****` |
| tela de pedido (`LTM-14`) | `Primeiro ***` · `(DD) 9****-****` |

O `maskPhone` do lotemania implementa o primeiro. Confirmado pela terceira vez que **são dois
formatos**, e que `src/lib/mask.ts` precisa dos dois.

## O menu da loja

`Início` · `Campanhas` · `Comunicados` · `Meus títulos` · `Ganhadores` · `Afiliados` ·
`Termos de uso` · `Suporte` — oito itens.

---

## O que falta, e por que

| Item | Por quê |
|---|---|
| ~~**O fluxo de compra**~~ | ✅ **OBSERVADO em 2026-11-19**, com autorização do founder — ver `fluxo-de-compra.md`. Os cinco passos, o modal de Checkout, a disputa pelo número ao vivo e a tela de PIX inteira |
| Confirmar a hipótese das colunas | Precisa de campanha ativa com números de 3 dígitos. ⬇️ **Sem prioridade** depois da `D4`: não muda o que se implementa |
| **A grade dela no desktop** | Nunca medida em viewport largo. É a pergunta de 6 contra 10 que a `D4` não alcança |
| `Meus títulos`, `Ganhadores`, `Afiliados`, `Comunicados`, `Suporte`, `Termos` | as seis páginas do menu, não abertas |
| Painéis `Prêmios` e `Descrição/Regulamento` abertos | só a barra fechada foi vista |
| O modo `Números Aleatórios` | o sorteio observado é de escolha manual |

### A saída para o fluxo de compra — **resolvida em 2026-11-19, por um quarto caminho**

Os três caminhos registrados aqui em 11-18 (não observar · abrir o sorteio de teste por alguns
minutos · o founder fazer uma compra de teste) **saíram todos da mesa**, e por um motivo melhor:
**o founder autorizou observar o fluxo numa campanha ao vivo.**

> *"Pode observar o fluxo de compra completo clicando em sorteio ao vivo e seguir o fluxo de criação
> de uma reserva real também"* — founder, 2026-11-19.

**Feito no mesmo dia**, e registrado em `fluxo-de-compra.md`: os cinco passos, o modal de Checkout
campo a campo, a disputa real pelo número (o `03` foi tomado por outra pessoa entre a seleção e o
envio), a tela de PIX inteira com os sete blocos da `LTM-14` confirmados, e **duas medições que
valeram mais que a descrição** — a janela de 30 minutos cronometrada e o BR Code apontando para
`pix.banprime.com.br`, que é a origem da decisão **D1** e da `LTM-24`.

**Nenhum pagamento foi feito.** A reserva criada (pedido `6afede7ffd2ffe1c9e74a905`, número 95)
expirou sozinha às 09:02:49 e devolveu o número ao estoque.

### E o sorteio de teste: **decisão `D5`, 2026-11-19 — fica como está**

O `ZZ TESTE TECNICO` continua no painel do cliente, privado, `Em breve`, com vendas em 18/11/2027 e
**sem caminho de compra**. **O motivo é o achado do §2 do `README.md`: a Sorteamos não exclui
sorteio** — procurado em seis lugares. Os outros dois caminhos (pedir ao suporte do fornecedor,
encerrar) **saíram da lista**: abrir chamado no fornecedor **do cliente** era decisão dele, e ele
decidiu não abrir. Ver `README.md` §10 e a `LTM-19`.
