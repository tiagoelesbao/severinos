# O fluxo de compra, do clique ao PIX — observado ao vivo

**Data:** 2026-11-19, 08h33 · **Autorizado pelo founder** em 2026-11-19:
*"pode observar o fluxo de compra completo clicando em sorteio ao vivo e seguir o fluxo de criação
de uma reserva real também"*.

**Campanha:** `✅ 46º RAPIDINHA VALENDO R$200,00 NA TAMPA!` — ativa, R$ 4,00 a cota, 100 números.
**Reserva criada:** pedido `6afede7ffd2ffe1c9e74a905`, número **95**, sob a conta de comprador que
já estava autenticada no navegador (`Tiago Nunes`).

> **Nenhum pagamento foi feito.** O fluxo foi seguido até a tela de PIX e parou ali. A reserva
> expira sozinha às **09:02:49** e devolve o número 95 ao estoque.

---

## Os cinco passos

```
grade → rodapé de seleção → modal de Checkout → /compra/{orderId} → tela de PIX
```

### 1. A grade — selecionar

Clicar num número livre:

- o número vira **verde-escuro com borda** (estado *selecionado*, distinto do verde de *pago*)
- **aparece um rodapé fixo**, barra verde de largura total:
  - à esquerda, ícone de confirmação
  - ao centro, **`Quero participar`**
  - à direita, **o total correndo** (`R$ 4,00`)
- **acima da barra**, uma pílula verde pequena com **o número escolhido** (`95`) e, à direita da
  linha, um **✕** que limpa a seleção

### 2. O modal de Checkout

| Parte | Conteúdo |
|---|---|
| Cabeçalho | 🛒 **`Checkout`** + ✕ |
| Faixa verde | *"Você está adquirindo **1 unidade(s)** do produto **{título}**"* |
| Identificação | avatar + **nome** + **telefone mascarado** |
| Letra miúda | *"Ao efetuar este pagamento e confirmar a compra deste **título de capitalização**, declaro que li e concordo com os **termos de uso**."* (link) |
| Ação | **`Concluir Reserva`** — botão verde largo com ícone ▸ |
| Secundária | **`Alterar conta`** — link abaixo |

> **A máscara aqui é `(11) 9****-****`** — com o 9 visível. É a **terceira** confirmação de que a
> Sorteamos usa **duas** máscaras de telefone (a do cartão de ganhador é `(DD) ****-****`), e de que
> `src/lib/mask.ts` precisa das duas.
>
> **A letra miúda chama a compra de "título de capitalização"** — enquadramento jurídico, no mesmo
> terreno do código SUSEP da aba *Capitalizadora*. Não é texto decorativo.

### 3. A disputa pelo número, ao vivo

Na primeira tentativa o número `03` foi tomado por outra pessoa entre a seleção e o envio. A
Sorteamos devolveu, em toast vermelho no topo:

> **`O(s) número(s) [03] não estão disponíveis.`**

**Ela nomeia QUAL número falhou.** A nossa mensagem é genérica:
*"Algum dos números escolhidos acabou de ser reservado por outra pessoa. Atualize a página e tente
de novo."* (`src/lib/actions/reserve.ts`)

> Com 1 número a diferença é pequena. Com 10 selecionados e 1 perdido, a nossa obriga o comprador a
> descobrir sozinho qual foi. **Vale copiar.**

⚠️ **E a grade não se atualizou depois do erro** — o `03` continuou pintado como livre e os
contadores continuaram `54 / 14 / 32`. A Sorteamos **não recarrega a grade no conflito**. Isso é
parte do defeito, não do desenho a copiar.

### 4. `/compra/{orderId}`

Redirecionamento imediato, com tela de carregamento própria:

> **`Carregando a sua compra`** / *"Por favor, aguarde..."*

**A rota confere com o que a `LTM-14` registrou.**

### 5. A tela de PIX — os sete blocos da `LTM-14`, confirmados

| # | Bloco | Confere? |
|---|---|---|
| 1 | **Ampulheta dourada** + **"Aguardando pagamento!"** + *"Realize o pagamento"* | ✅ |
| 2 | **"Você tem `29:17` para pagar"** | ✅ |
| 3 | Três passos numerados em círculo verde + campo do BR Code + botão **`COPIAR`** verde | ✅ |
| 4 | **`Mostrar QR Code`** — pílula cinza centralizada | ✅ |
| 5 | **Aviso âmbar**, texto exato | ✅ |
| 6 | **Cartão da campanha** — miniatura, título, subtítulo, badge | ✅ |
| 7 | **`Detalhes da sua compra`** + id do pedido + campos rotulados | ✅ |

**A `LTM-14` estava certa nos sete blocos.** Nada novo, nada faltando.

#### Os textos exatos dos três passos

1. `Copie o código PIX abaixo.`
2. `Abra o app do seu banco e escolha a opção PIX, como se fosse fazer uma transferência.`
3. `Selecione a opção PIX cópia e cola, cole a chave copiada e confirme o pagamento.`

#### O aviso âmbar, exato

> *"Este pagamento só pode ser realizado dentro do tempo. Após este período, caso o pagamento não
> seja confirmado, os títulos voltam a ficar disponíveis."*

#### `Mostrar QR Code` — o que ele revela

O botão vira **`Ocultar QR Code`**. Abaixo aparece o QR em quadro branco, o título **`QR Code`** e:

> *"Acesse o app do seu banco, escolha a opção de pagar com QR Code, escaneie o código acima e
> confirme o pagamento."*

E o **aviso âmbar se repete** abaixo do QR.

#### Detalhes da compra — valores reais medidos

```
Comprador:      Tiago ***
Telefone:       (11) 9****-****
Situação:       Aguardando pagamento
Data/horário:   19/11/2026 às 08:33:19
Expira em:      19/11/2026 às 09:02:49
Quantidade:     1
Total:          R$ 4,00
Títulos:        ⓘ Os títulos serão disponibilizados quando o pagamento for identificado
```

---

## Duas medições que valem mais que a descrição

### ⏱️ A janela desta campanha é de **30 minutos**

`08:33:19` → `09:02:49` = **29 min 30 s**, com a contagem abrindo em `29:17`.

Confirma, com relógio, o que a `LTM-14` havia lido da tela do founder (*"29:26"*). **A Sorteamos
oferece 3, 4, 5, 10, 30, 60 min, 3 h e 1 dia** (`editor-14-abas.md`); esta campanha usa **30**, e
**15 — o valor cravado no lotemania — não existe na lista dela.**

### 💳 O gateway desta campanha **não é a Paysure**

O BR Code aponta para **`pix.banprime.com.br/v1/pub/...`**.

O painel mostra dois bancos cadastrados: **`Banco paysure`** e **`PAY2M`**. Esta campanha está
usando o outro — provavelmente a PAY2M sobre a Banprime.

> **Consequência para o corte:** o Império **não roda tudo na Paysure**. A escolha de gateway é por
> sorteio (campo obrigatório na criação, `README.md` §1), e as rodadas em produção usam ao menos
> dois provedores. A `LTM-03b` entregou a Paysure; **se o Império quiser manter as duas rotas, falta
> um adaptador.** É decisão do founder, e está registrada aqui em vez de ser descoberta no corte.

---

## O menu de hambúrguer — estado **logado**

Sobreposição preta de tela inteira, logo no topo, ✕ à direita.

```
<avatar>  Tiago Nunes
          (11) 9****-****
──────────────────────────
🏠  Início
📋  Campanhas
📰  Comunicados
📄  Meus títulos
🏆  Ganhadores
👤  Afiliados
📜  Termos de uso
✉️  Suporte
──────────────────────────
[  ➜ Sair  ]          ← botão verde, largura total
                2.14   ← versão, centralizada, discreta
```

Cada item é uma **linha de largura total com ícone à esquerda e divisória abaixo** — não é lista
compacta.

> **[NÃO OBSERVADO]:** o estado **deslogado** do menu. É onde devem aparecer entrar/cadastrar, e é
> exatamente o ponto que o founder apontou como divergente. Ver *O que falta*.

---

## O que falta

| Item | Por quê |
|---|---|
| **Menu deslogado** | exigiria sair da conta do founder neste navegador |
| **Cadastro de novo lead** | idem — o fluxo de cadastro só aparece para quem não tem conta |
| `Alterar conta` no checkout | não clicado |
| O que acontece **ao expirar** a reserva com a tela aberta | a reserva expira 09:02:49; vale reabrir depois |
| Modo `Números Aleatórios` | esta campanha é de escolha manual |
| Compra de **múltiplos** números | só 1 foi selecionado |

> **A reserva criada é o experimento natural para a `LTM-20`:** às 09:02:49 ela vence. Reabrir a
> grade depois disso responde se a Sorteamos libera o número **sem que ninguém tente reservar** —
> que é exatamente o defeito que o lotemania tem.
