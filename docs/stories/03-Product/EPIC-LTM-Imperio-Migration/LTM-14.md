# LTM-14: O fluxo de compra do comprador — reserva, PIX e espera

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P0** — é a tela que o comprador vê depois de pagar. Sem ela o sorteio teste não fecha o ciclo
**Complexidade:** L
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** telas do founder de 2026-11-17 (`143743`, `143753`, `143807`, `143832`)

## Story

**Como** comprador que acabou de escolher meus números
**Eu quero** saber exatamente o que fazer, quanto tempo tenho e o que acontece se eu demorar
**Para que** eu pague com confiança em vez de fechar a aba na dúvida.

## Contexto

A rota é `/compra/{orderId}` na Sorteamos. O que ela mostra, de cima para baixo:

### 1. Cabeçalho de estado

**Ampulheta animada** em dourado, ao lado de **"Aguardando pagamento!"** em negrito, com
**"Realize o pagamento"** abaixo como subtítulo.

### 2. Contagem regressiva

> Você tem **29:26** para pagar

Minuto e segundo, correndo. É o relógio da reserva — e por isso **tem que ser derivado de
`reservedUntil`**, nunca de um contador que começa quando a tela abre.

### 3. Três passos numerados

Numerais em círculo verde:

1. **Copie o código PIX abaixo.** — campo somente-leitura com o BR Code truncado + botão
   **COPIAR** verde à direita
2. **Abra o app do seu banco e escolha a opção PIX, como se fosse fazer uma transferência.**
3. **Selecione a opção PIX cópia e cola, cole a chave copiada e confirme o pagamento.**

### 4. "Mostrar QR Code"

Botão cinza em pílula, centralizado entre duas divisórias. O QR fica **escondido por padrão** —
coerente com o campo `showQrCodeByDefault` que já existe no nosso `siteConfig`.

### 5. Aviso âmbar

> ⚠️ Este pagamento só pode ser realizado dentro do tempo. Após este período, caso o pagamento
> não seja confirmado, os títulos voltam a ficar disponíveis.

### 6. Cartão da campanha

O **mesmo componente** do catálogo: miniatura, título, subtítulo e badge "Adquira Já!".

### 7. Detalhes da compra

Bloco com ⓘ **"Detalhes da sua compra"**, o id do pedido, e campos rotulados em negrito:

```
Comprador:     Tiago ***            ← mascarado
Telefone:      (11) 9****-****      ← mascarado
Situação:      Aguardando pagamento
Data/horário:  17/11/2026 às 14:37:58
Expira em:     17/11/2026 às 15:07:28
Quantidade:    1
Total:         R$ 19,00
Títulos:       ⓘ Os títulos serão disponibilizados quando o pagamento for identificado
```

> **O mascaramento é da própria Sorteamos**, não da minha captura: a tela mostra `Tiago ***` e
> `(11) 9****-****` para o próprio comprador. Essa decisão vale copiar — a página é acessível por
> URL com o id do pedido, então quem tiver o link não deveria ver o telefone inteiro.

### Três achados de 2026-11-18, conferidos no código

**1. ⏱️ O relógio da Sorteamos é de 30 minutos. O nosso é de 15.**

A tela capturada diz *"Você tem **29:26** para pagar"* — ou seja, a reserva da Sorteamos dura
**30 minutos**. O lotemania usa `RESERVATION_MINUTES = 15` (`src/lib/actions/reserve.ts:21`), e o
texto da tela de pedido repete *"por 15 minutos"* à mão (`pedido/[orderId]/page.tsx:63`).

Isto **não é defeito de código**: é uma **divergência de produto** que ninguém decidiu. E tem
consequência de dinheiro nos dois sentidos — 15 minutos devolve título mais rápido (bom para
esgotar a rodada) e dá menos tempo para o comprador achar o app do banco (ruim para converter).

> **Decisão do founder, não minha.** A `LTM-03b` já amarra a expiração da cobrança PIX à constante,
> então **trocar o valor é trocar um número em um lugar** — o custo da decisão é baixo, mas a
> decisão existe. Fica registrado aqui como item aberto; esta story usa o que a constante disser,
> qualquer que seja.

**2. 🎭 A Sorteamos usa DUAS máscaras de telefone diferentes, e nós temos uma.**

| Onde | Formato observado | Story |
|---|---|---|
| Tela de pedido | `(11) 9****-****` — **com o 9 visível** | esta |
| Cartão de ganhador | `(98) ****-****` — sem o 9 | `LTM-15` |

`src/lib/mask.ts` implementa **só o segundo**: `maskPhone` devolve `(DD) ****-****`. Então esta
story precisa de uma segunda forma, e **as duas stories não podem simplesmente "usar `maskPhone`"**
— uma delas estaria exibindo um formato que não é o observado. `maskName` (`Primeiro ***`) serve às
duas sem mudança.

**3. ✅ `showQrCodeByDefault` realmente não é lido por nada.** Confirmado: o campo existe em
`src/lib/validations/site-config.ts:29` e na tela de configurações
(`src/app/dashboard/settings/settings-tabs.tsx:282`), e **nenhum código da loja o consulta**. O AC4
está certo. A tela de pedido atual tem **69 linhas** e não tem contagem, nem máscara, nem QR — esta
story constrói os sete blocos praticamente do zero.

## Tarefas (Checklist)

- [ ] Rota de acompanhamento do pedido, com os sete blocos acima.
- [ ] Ampulheta animada e os dois textos de estado.
- [ ] Contagem regressiva derivada de `reservedUntil`.
- [ ] Os três passos, com o campo de BR Code e o botão COPIAR.
- [ ] "Mostrar QR Code", respeitando `showQrCodeByDefault` do `siteConfig`.
- [ ] Aviso âmbar, com o texto exato.
- [ ] Reuso do cartão de campanha do catálogo.
- [ ] Bloco de detalhes, **com o mascaramento**.
- [ ] Estados além de "aguardando": **pago**, **expirado** — `[CONFIRMAR]` como a Sorteamos os
      exibe. Não foram observados.

## Critérios de Aceite

- [ ] **AC1 (o relógio é o da reserva):** a contagem sai de `reservedUntil` menos agora. Recarregar
      a página **não** reinicia o relógio; abrir num segundo aparelho mostra o mesmo tempo
      restante. Um contador que recomeça é o que faz o comprador achar que tem mais tempo do que
      tem.
- [ ] **AC2 (o relógio chegando a zero):** ao expirar, a tela muda de estado **sozinha**, sem
      precisar de recarga, e passa a dizer que os títulos voltaram a ficar disponíveis.
- [ ] **AC3 (copiar funciona de verdade):** o botão COPIAR põe o **BR Code completo** na área de
      transferência — não o texto truncado que aparece na tela. Teste lê o conteúdo copiado.
- [ ] **AC4 (QR escondido por padrão respeita a config):** com `showQrCodeByDefault` falso o QR
      começa oculto; com verdadeiro, visível. Hoje o campo existe e não é lido por nada.
- [ ] **AC5 (dado pessoal mascarado):** nome e telefone saem mascarados no mesmo formato
      (`Primeiro ***`, `(DD) 9****-****`), e o **telefone completo não aparece no HTML servido** —
      nem em atributo, nem em JSON de hidratação. Teste varre o HTML.
- [ ] **AC6 (pedido de outro comprador):** abrir a URL de um pedido alheio **não** revela dado
      pessoal. `[CONFIRMAR]` o que a Sorteamos faz; na dúvida, recusar.
- [ ] **AC7 (sem PIX ainda, não mente):** enquanto a cobrança não existir no gateway, a tela diz
      que está gerando — **nunca** mostra campo de código vazio nem um código falso.

## Escopo

**IN:** a tela de acompanhamento com os sete blocos; a contagem; copiar; QR opcional; detalhes
mascarados.

**OUT:** gerar a cobrança no gateway (é a `LTM-03b`); confirmar pagamento (`LTM-03a`); os estados
pago e expirado enquanto `[CONFIRMAR]`; notificação por WhatsApp.

## Dependências

- **Depende da `LTM-03b`** para existir um BR Code real. Até lá a tela se constrói contra um
  pedido semeado — e o **AC7** é o que impede inventar código no lugar.
- **Depende da `LTM-02`** para `reservedUntil` ser confiável sob concorrência.
- Reusa o cartão de campanha da `LTM-10`/catálogo.
- **Item aberto para o founder:** o relógio é de 15 ou de 30 minutos? Ver achado 1. Não bloqueia —
  esta story deriva da constante de qualquer modo.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx       (os 7 blocos)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/payment-status.tsx
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/countdown.tsx  (novo — AC1/AC2)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/copy-pix.tsx   (novo — AC3)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/qr-toggle.tsx  (novo — AC4)
  apps/lotemania/src/lib/mask.ts                                                     (a 2a mascara, achado 2)
  apps/lotemania/tests/loja/pedido/**                                                (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — e tela; reservedUntil, orders e product_numbers ja existem
  relogio do teste  — AC1 e AC2 testam passagem de tempo. Usar tempo FALSO (fake timers), nunca
                      espera real: teste que dorme 15 minutos nao e teste, e dois testes com
                      relogio global falso na mesma suite colidem. Isolar por arquivo.

Depends-on: LTM-02 (reservedUntil confiavel), LTM-03b (o BR Code real) — ver colisao abaixo
```

- ⛔ **COLISÃO DIRETA com a `LTM-03b`.** As duas editam `pedido/[orderId]/page.tsx` **e**
  `payment-status.tsx`. Não é dependência lógica apenas — é conjunto de arquivos sobreposto, o que a
  regra proíbe na mesma onda sem exceção. A `LTM-03b` vem primeiro (é fundação, está `Ready` e é
  quem faz o BR Code existir); esta story entra na onda seguinte e constrói sobre o que ela deixar.
- ⛔ **Não pode compartilhar onda com a `LTM-15`:** as duas editam `src/lib/mask.ts` (achado 2). A
  alternativa é uma delas levar as duas máscaras — e nesse caso o @po decide qual, antes do
  despacho.
- ✅ **Pode compartilhar onda com a `LTM-10`, `LTM-11` e `LTM-12`** — painel contra loja, conjuntos
  disjuntos.
- 💡 **O AC7 é o que permite esta story começar antes do primeiro PIX real:** "sem PIX ainda, não
  mente". Ela se constrói contra pedido semeado, e o AC7 é a trava que impede inventar código no
  lugar.

## Riscos

- **[Alto] Contador que reinicia na recarga.** O comprador acha que tem 30 minutos quando tem
  dois. AC1 existe por isso, e é o erro mais comum nesse tipo de tela.
- **[Alto] Telefone inteiro no HTML.** Mascarar na exibição e mandar o valor completo no payload
  de hidratação é vazamento com aparência de proteção. AC5 varre o HTML, não a tela.
- **[Médio] COPIAR copiando o texto truncado.** Quebra o pagamento de um jeito que o comprador
  não entende e culpa a plataforma.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` e tres achados: (1) **o relogio da Sorteamos e de 30 min e o nosso de 15** -- divergencia de produto que ninguem decidiu, item aberto para o founder; (2) a Sorteamos usa **duas** mascaras de telefone e `mask.ts` tem uma, o que poe este arquivo em disputa com a `LTM-15`; (3) confirmado que `showQrCodeByDefault` nao e lido por nada. Registra a **colisao direta com a `LTM-03b`** em dois arquivos. | @aiox-master |
| 2026-11-17 | 1.0 | Nasce das telas que o founder capturou do fluxo real de compra. | @aiox-master |
