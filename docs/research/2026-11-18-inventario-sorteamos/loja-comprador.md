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

> ### ⚠️ Contei **7 colunas**, e a instrução registrada foi **6**
>
> Nesta campanha (100 números, `00`–`99`), a grade tem **sete** por linha: `00 01 02 03 04 05 06`,
> depois `07`…`13`, e a última linha fica com `98 99`.
>
> O founder instruiu, em 2026-11-17: *"primeiro quero apenas 6 colunas conforme modelo original"* —
> e o lotemania foi ajustado para `grid-cols-6`.
>
> **Não vou mudar nada por causa disto.** As duas leituras podem estar certas: a hipótese mais
> provável é que **a grade se ajusta à largura do número** — um sorteio de 1.000 cotas tem números
> de três dígitos e caberia menos por linha. Nesse caso 6 e 7 são o mesmo desenho em sorteios
> diferentes, e `grid-cols-6` fixo erraria nos dois.
>
> **[NÃO CONFIRMADO]** — a hipótese precisa de uma campanha ativa com 3 dígitos para ser testada, e
> as que tentei estavam concluídas ou com slug que não acertei. É a primeira coisa a fazer na
> próxima sessão, e está registrada aqui em vez de virar mudança por palpite.

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
| **O fluxo de compra** — seleção, rodapé de seleção, formulário de reserva, tela de pagamento | Exige clicar num número de sorteio **ao vivo**, o que pode criar pedido real. **Fora da autorização.** Ver abaixo |
| Confirmar a hipótese das colunas | Precisa de campanha ativa com números de 3 dígitos |
| `Meus títulos`, `Ganhadores`, `Afiliados`, `Comunicados`, `Suporte`, `Termos` | as seis páginas do menu, não abertas |
| Painéis `Prêmios` e `Descrição/Regulamento` abertos | só a barra fechada foi vista |
| O modo `Números Aleatórios` | o sorteio observado é de escolha manual |

### A saída para o fluxo de compra — decisão do founder

O **sorteio de teste** (`ZZ TESTE TECNICO`) já existe, é privado e está com vendas agendadas para
**18/11/2027**. Mudar essa data para hoje o tornaria **comprável por quem tiver o link** — e foi
exatamente o risco que o founder nomeou ao autorizar a criação.

**Três caminhos, e nenhum é meu para escolher:**

1. **Não observar.** O fluxo de compra fica `[NÃO OBSERVADO]` e a `LTM-14` continua se apoiando nas
   quatro telas que o founder capturou em 2026-11-17 — que já cobrem o essencial.
2. **Abrir o sorteio de teste por alguns minutos**, observar e fechar. Risco: o link está só neste
   repositório e no histórico desta conversa; ninguém de fora o tem. Mas "ninguém tem" é suposição,
   e a trava do protocolo foi feita para não depender de suposição.
3. **O founder faz uma compra de teste** no sorteio de teste e eu observo o resultado no painel —
   sem eu tocar no fluxo.

**Recomendação:** o caminho 1 por enquanto. As quatro telas que o founder já capturou cobrem
reserva, PIX e espera, que é o que a `LTM-14` precisa. O fluxo ao vivo só vira necessário se
aparecer divergência entre o que as telas mostram e o que implementarmos.
