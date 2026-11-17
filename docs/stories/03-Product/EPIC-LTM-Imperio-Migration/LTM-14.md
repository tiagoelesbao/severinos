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
| 2026-11-17 | 1.0 | Nasce das telas que o founder capturou do fluxo real de compra. | @aiox-master |
