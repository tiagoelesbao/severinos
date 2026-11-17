# Glossário

O vocabulário do domínio deste repositório. Um termo entra aqui quando uma decisão o resolve —
não antes, e nunca com detalhe de implementação junto. Convenção em `docs/agents/domain.md`.

---

## Sorteios (lotemania · Império Prêmios)

### Título

Um número vendável de um sorteio. É como o cliente chama; no código a tabela é
`product_numbers`. **Número**, **cota** e **bilhete** são sinônimos que aparecem na interface —
o operador escolhe qual exibir por sorteio —, mas em conversa de domínio o termo canônico é
**título**.

### Cota inteira

Um título comprado por uma única pessoa, que concorre sozinha a 100% do prêmio. É o modelo
único até 2026-11-17.

### Meia cota

Metade de um título. Um título dividido tem **duas metades**, vendáveis separadamente a duas
pessoas, cada uma concorrendo a 50% do prêmio.

Características decididas em 2026-11-17:

- Só existe em sorteio de **prêmio em dinheiro** — o sistema recusa habilitá-la em sorteio cujo
  prêmio não seja divisível.
- Custa **exatamente metade** do preço do título, sem ágio.
- Habilitada **por sorteio**, nunca por título. Num sorteio com meia cota, todo título é
  divisível; num sem, nenhum é.
- Duas metades do mesmo título compradas pela mesma pessoa **continuam sendo duas metades** —
  não se fundem em cota inteira.

### Sorteio divisível

Sorteio em que a meia cota está habilitada. Oposto: **sorteio de cota inteira**.

A razão de negócio da divisibilidade é baixar a barreira de entrada para viabilizar prêmios
maiores (100 mil, 200 mil) sobre a mesma quantidade de títulos.

### Metade órfã

Metade de um título cuja outra metade não foi vendida até o sorteio.

Se um título com metade órfã é sorteado, **o dono da metade vendida leva o prêmio inteiro**.
Decidido em 2026-11-17: qualquer outra saída ou pagaria menos a quem não teve culpa, ou mudaria
a chance do bilhete depois de vendido — o que é prática enganosa.

### Rateio

A divisão do prêmio entre os donos das metades de um título sorteado. Metades iguais ⇒ rateio
igual. Uma pessoa dona das duas metades recebe os dois rateios, não um pagamento único — ver
**Meia cota**.

### Sorteio (o evento)

O ato de escolher o título vencedor. **Acontece fora deste sistema** — o lotemania não sorteia
nada. O operador registra o resultado depois, e `drawDate` é data de exibição, não gatilho.

### Unidade (do sorteio)

A coisa que se conta naquele sorteio. Em sorteio de cota inteira a unidade é o **título**; em
sorteio divisível é a **metade**.

Toda contagem usa a unidade do seu sorteio — limites por comprador, mínimo e máximo por reserva,
cartões de compra rápida, barra de progresso, quantidade do pedido, colunas de relatório — e a
interface **escreve o nome da unidade** em vez de deixar o número solto. O perigo nunca foi a
contagem mudar; é mudar sem dizer.

### Congelamento da divisibilidade

A divisibilidade de um sorteio é editável até a **primeira venda** e somente-leitura a partir
dela. Habilitar no meio faria quem comprou antes ter comprado sob regra diferente de quem compra
depois; desabilitar deixaria metades já vendidas sem destino.

### Metade marcada

Convenção de exibição: uma metade **nunca** aparece como número nu em relatório, export ou
interface. Quem tem a metade do título 42 e o 43 inteiro aparece como `42 (metade)` e `43`.
Export que devolve `42` para uma metade é ambiguidade que vira disputa com o ganhador.

---

## Pagamento

### Cobrança

Um pedido de pagamento PIX criado no gateway. No provedor em produção (Paysure) nasce de
`POST /v1/pix/qrcode` e é identificada pelo nosso `external_id`, que é o id do pedido.

### Aviso (de pagamento)

A notificação que o gateway envia quando o estado da cobrança muda. Chamado *webhook* no código
e *postback* na documentação da Paysure. Pode ser reentregue — o identificador estável para
deduplicar é o `reference_code` do provedor.
