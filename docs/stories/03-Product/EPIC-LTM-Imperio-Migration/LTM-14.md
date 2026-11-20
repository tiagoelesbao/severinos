# LTM-14: O fluxo de compra do comprador — reserva, PIX e espera

**Status:** InReview
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

- [x] Rota de acompanhamento do pedido, com os sete blocos acima.
- [x] Ampulheta animada e os dois textos de estado.
- [x] Contagem regressiva derivada de `reservedUntil`.
- [x] Os três passos, com o campo de BR Code e o botão COPIAR.
- [x] "Mostrar QR Code", respeitando `showQrCodeByDefault` do `siteConfig`.
- [x] Aviso âmbar, com o texto exato.
- [x] Reuso do cartão de campanha do catálogo.
- [x] Bloco de detalhes, **com o mascaramento**.
- [ ] Estados além de "aguardando": **pago**, **expirado** — `[CONFIRMAR]` como a Sorteamos os
      exibe. Não foram observados.

## Critérios de Aceite

- [x] **AC1 (o relógio é o da reserva):** a contagem sai de `reservedUntil` menos agora. Recarregar
      a página **não** reinicia o relógio; abrir num segundo aparelho mostra o mesmo tempo
      restante. Um contador que recomeça é o que faz o comprador achar que tem mais tempo do que
      tem.
- [x] **AC2 (o relógio chegando a zero):** ao expirar, a tela muda de estado **sozinha**, sem
      precisar de recarga, e passa a dizer que os títulos voltaram a ficar disponíveis.
- [x] **AC3 (copiar funciona de verdade):** o botão COPIAR põe o **BR Code completo** na área de
      transferência — não o texto truncado que aparece na tela. Teste lê o conteúdo copiado.
- [x] **AC4 (QR escondido por padrão respeita a config):** com `showQrCodeByDefault` falso o QR
      começa oculto; com verdadeiro, visível. Hoje o campo existe e não é lido por nada.
- [x] **AC5 (dado pessoal mascarado):** nome e telefone saem mascarados no mesmo formato
      (`Primeiro ***`, `(DD) 9****-****`), e o **telefone completo não aparece no HTML servido** —
      nem em atributo, nem em JSON de hidratação. Teste varre o HTML.
- [ ] **AC6 (pedido de outro comprador):** abrir a URL de um pedido alheio **não** revela dado
      pessoal. `[CONFIRMAR]` o que a Sorteamos faz; na dúvida, recusar.
- [x] **AC7 (sem PIX ainda, não mente):** enquanto a cobrança não existir no gateway, a tela diz
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
| 2026-11-20 | 1.2 | **Implementada.** As quatro portas verdes; 4 arquivos de teste, **64 testes** novos (suite 276 → 346, e os 6 restantes sao do agente paralelo). **Tres premissas da story sairam falsas** — a constante que o achado 1 cita ja nao existe nesse lugar, a colisao anunciada com a `LTM-03b` em `payment-status.tsx` **nao aconteceu** (o arquivo nao foi tocado), e o "mesmo componente do catalogo" do bloco 6 **nao era um componente**, era marcacao inline. **O AC5 foi revisado por decisao do founder (D9, 2026-11-19):** telefone **inteiro** na tela do proprio pedido, nome segue mascarado — o que deixa o **AC6 parcialmente superado** e por isso ele fica **aberto** para o @po reescrever. Ver Dev Agent Record. | @dev (Dex) |
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` e tres achados: (1) **o relogio da Sorteamos e de 30 min e o nosso de 15** -- divergencia de produto que ninguem decidiu, item aberto para o founder; (2) a Sorteamos usa **duas** mascaras de telefone e `mask.ts` tem uma, o que poe este arquivo em disputa com a `LTM-15`; (3) confirmado que `showQrCodeByDefault` nao e lido por nada. Registra a **colisao direta com a `LTM-03b`** em dois arquivos. | @aiox-master |
| 2026-11-17 | 1.0 | Nasce das telas que o founder capturou do fluxo real de compra. | @aiox-master |

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` — @dev (Dex), 2026-11-20, modo YOLO. Onda paralela: outro agente em
`src/lib/actions/reserve.ts` e `tests/money-path/identidade-concorrente.test.ts` — **nenhum dos
dois foi tocado aqui.**

### As quatro portas — saída real e código de saída

| Porta | Comando | Saída | Código |
|---|---|---|---|
| typecheck | `npx tsc --noEmit` (com `tsconfig.tsbuildinfo` **apagado antes**) | nenhuma linha | **0** |
| lint | `npx eslint` | `✖ 5 problems (0 errors, 5 warnings)` — as 5 são **pré-existentes**, em `dashboard/products/new`, `dashboard/users/blocked-numbers-card`, `bonus-game-player` e `actions/site-config`. **Zero** nos arquivos desta story | **0** |
| teste (só os novos) | `npx vitest run tests/loja` | `Test Files 4 passed (4)` · `Tests 64 passed (64)` · 33,8 s | **0** |
| teste (suíte inteira) | `npx vitest run` | `Test Files 26 passed \| 2 skipped (28)` · `Tests 346 passed \| 2 skipped (348)` · 607,4 s | **0** |
| build | `npx next build` | `✓ Compiled successfully in 3.2s` · `Finished TypeScript in 4.2s` · `✓ Generating static pages (33/33)` · a rota `ƒ /loja/[tenant]/[productSlug]/pedido/[orderId]` é **dinâmica** (logo nenhuma consulta roda no build) | **0** |

**A conta dos testes fecha exata:** 276 (base, commit `4dd7ae7d`) + **64** meus + 6 do agente
paralelo (`identidade-concorrente.test.ts`, contados com `grep -c`) = **346**. Nenhum teste
existente alterado, removido ou ignorado. Os 2 `skipped` são os mesmos de antes.

Meus 64, por arquivo: `mascaras.test.ts` 11 · `order-view.test.ts` 23 ·
`order-screen.test.tsx` 26 · `prazo-do-banco.test.ts` 4.

### AC por AC, com o teste que prova

| AC | Veredito | O teste que prova |
|---|---|---|
| **AC1** o relógio é o da reserva | ✅ | `order-view.test.ts` → *"reproduz a medição da Sorteamos: 08:33:19 → 09:02:49 abre em 29:17"*, *"RECARREGAR não reinicia"*, *"DOIS APARELHOS mostram o mesmo"*, *"o prazo sai de `reservedUntil` — o MENOR entre as unidades"*. E contra o Postgres: `prazo-do-banco.test.ts` → *"o prazo gravado chega como Date e vira a contagem da tela"* |
| **AC2** o relógio chegando a zero | ✅ | `order-view.test.ts` → *"prazo vencido com o pedido AINDA `pending` no banco já é expirado"*, *"o instante EXATO do prazo já conta como vencido"*; `order-screen.test.tsx` → *"a contagem no zero vira o aviso de vencimento, sem recarga"*; `prazo-do-banco.test.ts` → o mesmo com a linha do pedido lida do banco, ainda `pending` |
| **AC3** copiar funciona de verdade | ✅ | `order-screen.test.tsx` → *"o teste LÊ o conteúdo copiado, e ele é o código inteiro"* (área de transferência falsa, injetada), *"o campo da tela guarda o código INTEIRO"*, *"não existe versão curta do código em lugar nenhum da tela"* |
| **AC4** QR respeita a config | ✅ | `order-screen.test.tsx` → *"falso: o QR começa OCULTO"*, *"verdadeiro: o QR começa VISÍVEL"*, *"aberto, o aviso âmbar aparece DUAS vezes"*, *"o quadro do QR NÃO finge ter um QR"* |
| **AC5** dado pessoal | ✅ **na forma revisada pela D9** | `order-screen.test.tsx` → *"o nome vai mascarado e o telefone vai inteiro"*, *"varre o HTML servido: o nome inteiro não está lá"*, *"o que viaja para o cliente é o `OrderView`"*; `order-view.test.ts` → os 6 casos de formatação e de corte |
| **AC6** pedido de outro comprador | ⚠️ **parcialmente superado pela D9 — deixado ABERTO** | `order-screen.test.tsx` → *"nada além do que a tela mostra: sem e-mail, sem CPF, sem endereço"*. O **telefone** é a exceção, por decisão do founder. Ver a seção abaixo |
| **AC7** sem PIX ainda, não mente | ✅ | `order-screen.test.tsx` → *"mostra o aviso de geração, e NENHUM campo de código"*, *"nenhum campo vazio e nenhum código falso"* (varre por `value=""` e por `00020126`) |

### ⚠️ A decisão do founder (D9) e a incoerência que ela deixa — levada de volta

A D9, de 2026-11-19, mudou o AC5 no meio da implementação: **o telefone aparece inteiro na tela do
próprio pedido**, porque é o número da própria pessoa, numa tela que ela abriu sobre a compra dela.

Implementado como pedido. Duas consequências que **não** são minhas para resolver:

1. **O nome continua mascarado.** A decisão falou de número, e estender ao nome seria decidir pelo
   founder. O resultado é visivelmente incoerente: a tela mostra `Comprador ***` **ao lado de**
   `(00) 98765-4321` — nome escondido, telefone à mostra, mesma pessoa, linhas vizinhas. Soltar o
   nome é **uma linha** em `order-view.ts`, quando ele decidir.
2. **O AC6 deixa de valer para o telefone.** A página é endereçável por `orderId` e **não há sessão
   de comprador** (ele se identifica por telefone), então não existe quem autorizar: quem tiver o
   link vê o número inteiro. O AC6 dizia *"na dúvida, recusar"*; a D9 é posterior e explícita, então
   ela vale — mas o AC6 ficou **com texto que o código não cumpre**, e reescrevê-lo é do @po. É por
   isso que o quadradinho dele ficou **desmarcado**.

O custo está escrito **dentro** de `order-view.ts`, no bloco do topo, não só aqui — comentário de
story ninguém lê daqui a seis meses.

### Três premissas da story que saíram falsas no código

| Premissa | O que o código diz |
|---|---|
| *"O lotemania usa `RESERVATION_MINUTES = 15` (`src/lib/actions/reserve.ts:21`)"* (achado 1) | **Já não existe nesse lugar.** A `LTM-03b` moveu a janela para `reservationMinutesFor(product)` em `validations/reserve.ts`, com o padrão **privado** (`RESERVATION_MINUTES_DEFAULT`). O AC14 que a story dava como *"quase fechado"* está **fechado**, e eu não precisei tocá-lo: `page.tsx` já derivava da função, e continua — a tela nova lê o mesmo valor |
| *"⛔ COLISÃO DIRETA com a `LTM-03b` … As duas editam `page.tsx` **e** `payment-status.tsx`"* | **A metade de `payment-status.tsx` não aconteceu.** O arquivo **não foi tocado** — `git status` o confirma. Em vez de reescrever o componente (e com ele os 8 testes da `LTM-03b`), a tela nova o **compõe**: ele é renderizado só onde tem o que oferecer (gerar a cobrança, ou simular o pagamento), e o COPIAR dos três passos substitui o botão de copiar dele |
| *"O **mesmo componente** do catálogo"* (bloco 6) | **Não era um componente.** Era marcação inline em `loja/[tenant]/page.tsx`, repetida em forma parecida na grade. Virou `src/components/loja/campaign-card.tsx`, e o **catálogo passou a importar de lá** — reuso de verdade, não uma segunda cópia das medidas da Sorteamos |

E uma premissa da **nota de ondas** que eu deliberadamente não segui: ela manda usar **relógio
falso** nos testes de AC1/AC2, avisando que dois arquivos com relógio global falso na mesma suíte
colidem. Não precisei de nenhum: como a tela deriva `reservedUntil - agora`, o **"agora" é
argumento** de `buildOrderView`. Dois instantes são dois argumentos, não dois estados de um relógio
global — e o risco de colisão deixa de existir em vez de ser administrado.

### Decisões autônomas (`[AUTO-DECISION]`)

1. **A decisão saiu da página para um módulo puro.** `page.tsx` é componente de servidor
   **assíncrono**, e `renderToStaticMarkup` não renderiza componente assíncrono — com a decisão lá
   dentro, AC1, AC2, AC5 e AC7 só seriam verificáveis por leitura de fonte. Então nasceram
   `order-view.ts` (a decisão, pura) e `order-screen.tsx` (os sete blocos, síncrono). A página faz
   duas coisas: consultar e renderizar. Mesmo desenho de `payments/gateway-config.ts` e
   `raffles/expire-reservations.ts`, pela mesma razão registrada lá.
2. **O campo guarda o BR Code inteiro; a tela o corta no CSS** (AC3). A alternativa era truncar a
   **string** e manter o código completo só no botão — e aí quem seleciona o campo com o dedo e
   copia à mão leva um código quebrado. Assim os **dois** caminhos entregam código pagável, e não
   existe, em nenhum ponto do arquivo, uma versão curta para ser copiada por engano.
3. **O painel do QR diz que não desenha QR.** Nenhum codificador em `package.json`, e acrescentar
   dependência no caminho do dinheiro é decisão de @architect (a `LTM-03b` já registrou isso).
   Mandar o BR Code para um gerador de terceiros seria pior: entregaria o código de pagar a um
   serviço que não é nosso. É o AC7 aplicado a outro artefato.
4. **A varredura de expiração NÃO foi acrescentada a esta página.** A `LTM-20` escolheu dois pontos
   de entrada (a reserva e a grade) e é dela a decisão de ter um terceiro; além disso a varredura
   **debita ficha de anti-spam**, e fazê-la rodar porque o comprador abriu a tela do próprio pedido
   é consequência que não é minha para causar. A tela expira pelo **prazo**, que é o mesmo
   predicado que a varredura aplica — então ela nunca pede pagamento de reserva morta, mesmo com a
   linha ainda `pending`.
5. **Guarda de integridade na URL:** se o `tenant`/`productSlug` do endereço não descrevem o
   pedido, `notFound()`. Sem ela o mesmo pedido renderizaria sob o endereço de qualquer sorteio de
   qualquer operador, e o cartão da campanha contradiria o endereço lido.
6. **Fuso fixado em `America/Sao_Paulo`** nas datas do bloco 7. O servidor roda em UTC na Vercel, e
   `formatDate` de `lib/format.ts` não fixa fuso **nem tem segundos** — a tela observada tem os
   dois. Prazo exibido três horas adiantado é pior que prazo nenhum.
7. **`maskPhoneKeepingNinth` foi mantida, com consumidor nomeado.** A D9 tirou a tela de pedido da
   lista de quem mascara, e a função ficou sem uso de produção. Apagar jogaria fora o que custou
   caro — a medição das **duas** formas e a decisão de revelar o **dígito real** em vez de cravar um
   `9`. Quem a usa é a `LTM-21` (modal de Checkout, onde `(11) 9****-****` está medido), e
   `tests/loja/mascaras.test.ts` prende as duas formas enquanto não há tela.
8. **`CampaignCard` extraída e adotada também pelo catálogo** — ver a tabela de premissas falsas.
9. **`payment-status.tsx` intocado**, composto em vez de reescrito — idem.

### D4 (grade em 6 colunas): não se aplica a esta tela

Esta tela **não reusa** o componente da grade e não assume largura dela — o bloco 6 é o cartão da
campanha, não a grade de números. `number-grid.tsx` **não foi tocado**, inclusive a linha 119
(`sm:grid-cols-10`), que a coordenação marcou como pergunta aberta de outra story.

### Protocolo IDS — busca antes de criar

| Precisava de | Busquei | Decisão |
|---|---|---|
| máscara de nome/telefone | `src/lib/mask.ts` (achei `maskName`, `maskPhone`) | **ADAPT** — `maskName` reusada sem mudança; **acrescentei** a segunda forma sem substituir a primeira (a `LTM-15` depende dela) |
| cartão da campanha | `grep "Adquira"` → `loja/[tenant]/page.tsx` e a grade | **ADAPT** — extraí a marcação inline para `components/loja/campaign-card.tsx` e fiz o catálogo importar |
| a janela da reserva | `reservationMinutesFor` em `validations/reserve.ts` | **REUSE** — nenhuma constante nova, nenhum número cravado |
| leitura da cobrança | `readPixCharge` / `tenantHasActiveGateway` em `actions/pix-charge.ts` | **REUSE** |
| badge/botão de ação do pedido | `payment-status.tsx` (`PaymentStatusView`) | **REUSE** — composto, não reescrito |
| moeda e `siteConfig` | `lib/format.ts`, `validations/site-config.ts` | **REUSE** — `siteConfigSchema.parse`, nunca acesso cru ao jsonb |
| formatação de data com segundos | `lib/format.ts` (`formatDate` — **sem** segundos, **sem** fuso) | **CREATE** local em `order-view.ts`, com a razão escrita no lugar |
| semear pedido no teste | `tests/helpers/seed.ts`, `tests/helpers/actions.ts` | **REUSE** — nenhum helper novo, nenhum helper alterado (o agente paralelo mexe em teste de identidade; manter `helpers/` intocado foi deliberado) |

### Debug Log — o que mediu diferente do esperado

- **`reservedUntil` chega como `Date`**, não string, pelo driver neon sobre HTTP. Isso **não era
  óbvio** e é a razão de `prazo-do-banco.test.ts` existir: se um dia virar string, `deadlineOf`
  descarta o valor **em silêncio** e a tela passa a mostrar o prazo do recuo (`created_at + janela`)
  achando que leu o do banco — contagem errada, sem erro em lugar nenhum.
- **`data-countdown-expired` contém a string `data-countdown`.** A primeira versão da asserção
  *"no zero não há contador"* passava a mentir por prefixo; a asserção agora olha o atributo
  fechado (`data-countdown=""`).
- **`tsc --noEmit` só é confiável com `tsconfig.tsbuildinfo` apagado antes** (`incremental: true`
  no `tsconfig.json`). Rodado assim nas duas vezes.
- A suíte inteira leva **607 s** e estoura o teto de 10 min de uma chamada; rodada em segundo plano
  com o código de saída gravado em arquivo.

### File List

**Criados:**

- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-view.ts` — a decisão, pura (prazo, estado, mascaramento, formatação)
- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-screen.tsx` — os sete blocos, síncrono e renderizável no teste
- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/countdown.tsx` — a contagem (AC1, AC2)
- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/copy-pix.tsx` — os três passos e o COPIAR (AC3, AC7)
- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/qr-toggle.tsx` — "Mostrar QR Code" (AC4)
- `apps/lotemania/src/components/loja/campaign-card.tsx` — o cartão da campanha (bloco 6)
- `apps/lotemania/tests/loja/pedido/order-view.test.ts` — 23 testes
- `apps/lotemania/tests/loja/pedido/order-screen.test.tsx` — 26 testes
- `apps/lotemania/tests/loja/pedido/prazo-do-banco.test.ts` — 4 testes, contra o Postgres
- `apps/lotemania/tests/loja/mascaras.test.ts` — 11 testes, o contrato das duas máscaras

**Modificados:**

- `apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx` — reescrita: consulta e renderiza, nada mais
- `apps/lotemania/src/lib/mask.ts` — **acrescentada** `maskPhoneKeepingNinth`; `maskPhone` e `maskName` intocadas
- `apps/lotemania/src/app/loja/[tenant]/page.tsx` — passa a importar `CampaignCard` (a marcação inline saiu)
- `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/LTM-14.md` — este registro

**Deliberadamente NÃO tocados:** `src/lib/actions/reserve.ts` e `tests/money-path/*` (agente
paralelo), `payment-status.tsx`, `number-grid.tsx`, `tests/helpers/*`, `src/lib/format.ts`,
`package.json`, e nenhuma migração — esta story é tela, e `reservedUntil`, `orders` e
`product_numbers` já existiam.

### A tarefa que fica aberta

- [ ] **Estados além de "aguardando": pago e expirado.** O **mínimo** existe e é testado (é o que o
      AC2 exige: a tela muda sozinha e diz que os títulos voltaram), mas a **FORMA** dessas duas
      telas na Sorteamos continua `[CONFIRMAR]` — não foram observadas. O que está no ar é texto
      nosso, marcado como tal no código. Inventar o layout seria descrever o que ninguém viu.

### O que fica para o @qa olhar primeiro

1. **A D9 e o par incoerente** (`Comprador ***` ao lado de `(00) 98765-4321`), e o **AC6 com texto
   que o código não cumpre**. É decisão de produto, não técnica — e é a razão de o AC6 estar
   desmarcado.
2. **A decisão 4** (não varrer a expiração nesta página). O efeito visível: a tela pode dizer
   "expirada" enquanto `orders.status` ainda é `pending`, até alguém visitar a grade. Está
   justificado, mas é escolha de escopo entre duas stories.
3. **A decisão 2** (campo com o código inteiro, corte no CSS) contra a letra do AC3, que fala do
   *"texto truncado que aparece na tela"*. Cumpri o **propósito** do AC — nunca copiar código
   quebrado — por um caminho em que o defeito não tem como existir.
