# As 14 abas do editor de sorteio — todas observadas

**Data:** 2026-11-18, 19h · **Onde:** sorteio de teste `6afde6282bfd48a5b86b14b9`
**Complementa:** `README.md` §1 (abas Geral, Títulos, Imagens, Pagamento)

Tudo abaixo é **[OBSERVADO]** salvo onde marcado.

---

## ⚠️ Correção de um erro meu

No commit anterior eu afirmei que `Títulos Premiados`, `Caixas Surpresas`, `Roletas Premiadas` e
`Raspadinhas Premiadas` eram **"quatro features"**. **Está errado.**

Abrindo a aba, elas são **quatro TIPOS do mesmo título premiado**. É um registro só, com
discriminador — o que explica por que o lotemania já tem três pares de tabelas de mecânica.

---

## 1. Prêmios

- *"Informe quais os prêmios os participantes estarão concorrendo. Você pode informar até **10
  prêmios**."*
- Chaves: `Disponibilizar E-book` · `Mostrar Prêmios`
- Lista: `Prêmio 1º colocado`, com botão `Novo Prêmio`

**Mapeamento:** `prizes`, `showPrizes`, `ebookEnabled`. O limite de 10 é informação nova.

## 2. Afiliados

Uma chave só: **`Permite afiliados?`** → `allowAffiliates`. A aba inteira é um booleano.

## 3. Títulos Premiados — o maior item do grupo C

- *"Cadastre Títulos Premiados para os participantes. Você pode cadastrar de **1 até 400 títulos**."*
- `Ativar Títulos Premiados`
- `Mostrar lista de prêmios/ganhadores para os participantes`
- **Modo de exibição:** `Lista` · `Modal/Popup`
- Campo de texto: *"Texto a ser exibido para os ganhadores de Títulos Premiados."*
- `Mostrar aviso para os NÃO ganhadores?`
- Por título cadastrado: **nº do título** · **Prêmio** · **Tipo**

| Tipo | Tabela correspondente no lotemania |
|---|---|
| `Padrão` | — |
| `Caixa Surpresa` | `awarded_boxes` + `awarded_box_combos` |
| `Roleta Premiada` | `reward_spins` + `reward_spin_combos` |
| `Raspadinha` | `scratch_cards` + `scratch_card_combos` |

**O lotemania já tem as três tabelas de mecânica**, mais `bonus_game_plays`. Falta o registro de
título premiado que as discrimina — e o `instantPrizesEnabled`, que hoje não liga nada.

> Isto casa com o efeito medido em `README.md` §6: ativar títulos premiados tirou **1 número** do
> estoque vendável. Com até 400 títulos, a ação pode tirar bem mais.

## 4. Promoções

- *"Ofereça para seus clientes opções de promoções. Você pode cadastrar de **1 até 10 promoções**."*
- `Ativar Promoção em Dobro` → `doublePromoEnabled`
- `Ativar Promoções` → `promotionsEnabled`

## 5. Alertas

- *"Ative um alerta para aparecer na página de vendas com **cronômetro de início e fim**."*
- `Ativar Alerta` → `alertEnabled`

> O cronômetro é o detalhe que importa: alerta **com prazo** na página de vendas. Mesmo gênero do
> controle de `Porcentagem` (`README.md` §4) e, como ele, cai sob `.claude/rules/claims-ledger.md`
> se o prazo não for real.

## 6. Upsell

- *"Ofereça para seus clientes opções de promoções **mais atrativas**. Você pode cadastrar de 1 até
  10 promoções."*
- `Ativar Promoções Mais Atrativas` → `upsellEnabled`

**Upsell e Promoções parecem a mesma mecânica com texto diferente** — ambas dizem "de 1 até 10
promoções". A diferença fica **[NÃO OBSERVADO]**: nenhuma foi ativada e o texto não a explica.
**Não implementar por dedução.**

## 7. Anti Spam — a única que a própria tela explica

> *"O Anti Spam consiste em **bloquear temporariamente** usuários que fazem **muitas reservas sem
> pagar**. O bloqueio é feito por um tempo determinado e após o tempo de bloqueio o usuário pode
> fazer reservas normalmente."*
>
> *"Exemplo: Participante faz **3 reservas seguidas sem pagar**, ele é bloqueado e não pode fazer
> mais reservas até que o tempo de bloqueio acabe."*

- `Ativar Anti Spam` → `antiSpamEnabled`

É a **única das 36** cujo comportamento a Sorteamos documenta na interface. Os números (3 reservas,
duração do bloqueio) aparecem como **exemplo**; se são configuráveis, **[NÃO OBSERVADO]**.

> O lotemania já tem a tabela `blocked_numbers`, que pode ser a peça equivalente. **[SUPOSTO]** —
> não foi conferido o que ela guarda.

## 8. Suporte — o único mapeamento perfeito

| Campo | lotemania |
|---|---|
| Tipo do Widget: `Ícone e texto` · `Apenas ícone` | `support.widgetType: icon_text \| icon_only` ✅ |
| WhatsApp · Grupo do WhatsApp · Telegram · E-mail · Discord · Instagram | `support.*` ✅ os seis |

**Bate campo a campo, incluindo os dois valores do widget.** Não é coincidência: `support` é um dos
**cinco** campos que o lotemania de fato lê hoje.

## 9. Capitalizadora

- `Ativar Capitalizadora` → `capitalizerEnabled`
- **`Código do Sorteio (SUSEP, etc)`** → `capitalizerCode`

> **SUSEP** é a Superintendência de Seguros Privados. O campo guarda o número de autorização do
> título de capitalização — **informação regulatória**, não decoração. Um sorteio que exibe código
> SUSEP está afirmando autorização federal.

## 10. Restrições — inversão semântica, e ela importa

> *"**Apenas** os usuários com DDDs selecionados **poderão comprar** deste sorteio."*

É **lista de permissão**, não de bloqueio. O campo do lotemania chama-se **`restrictedDdds`**, nome
que sugere o oposto.

A consequência não é teórica:

| Leitura | `restrictedDdds: []` (o default) significa |
|---|---|
| bloqueio (o que o nome sugere) | ninguém bloqueado → **todos compram** |
| permissão (o que a tela diz) | nenhum DDD permitido → **ninguém compra** |

**Implementar pelo nome do campo em vez do texto da tela inverteria a regra e fecharia o sorteio
para todo mundo.** É o melhor exemplo, até agora, de por que o `AC7` da `LTM-18` existe.

---

## O grupo C da `LTM-18`, revisto

| Campo | O que a aba revelou | Tamanho real |
|---|---|---|
| `allowAffiliates` | um booleano | **trivial** |
| `antiSpamEnabled` | regra explicada na tela | **pequeno** — faltam os números |
| `capitalizerEnabled` / `capitalizerCode` | booleano + texto regulatório | **trivial em tela**, sério em significado |
| `alertEnabled` | alerta com cronômetro na página de vendas | **médio** |
| `promotionsEnabled` / `doublePromoEnabled` / `upsellEnabled` | até 10 promoções cada; Upsell parece Promoções com outro texto | **médio**, com `[CONFIRMAR]` |
| `instantPrizesEnabled` | até 400 títulos, 4 tipos, modo de exibição, textos para ganhador e não-ganhador | **grande — o maior do grupo** |
| `drawMechanism` | 3 valores, um deles *"COM REGRAS DE SORTEIO"* | **[NÃO OBSERVADO]** quais são as regras |
| `freeCampaign` / `hasFee` | chaves na aba Títulos | **[NÃO OBSERVADO]** |

**Onze itens do grupo C deixam de ser nomes e passam a ter forma.** Três continuam exigindo
observação antes de qualquer linha de código:

1. a diferença entre **Promoções** e **Upsell**;
2. as regras do **`Loteria Federal (COM REGRAS DE SORTEIO)`**;
3. os parâmetros do **Anti Spam**.
