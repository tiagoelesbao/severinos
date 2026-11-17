# Painel da Sorteamos — o editor de sorteio e o que faltava observar

Coletado em 2026-11-17 na sessão autenticada do founder, que ele liberou para esta passada.
Navegação e leitura apenas: **nenhum formulário salvo, nenhum sorteio ativo tocado.** O sorteio
usado para abrir o editor é um **concluído** (`33° MEGA RAPIDINHA`, `6afc3c5c2bfd48a5b8692da4`).

Fecha os itens que o documento `06-observacao-ao-vivo.md` deixou pendentes.

---

## 1. As 14 abas do editor — confirmadas

Era "o maior buraco restante" da paridade. São estas, na ordem:

| # | Aba | # | Aba |
|---|---|---|---|
| 1 | Geral | 8 | Promoções |
| 2 | Títulos | 9 | Alertas |
| 3 | Imagens | 10 | Upsell |
| 4 | Prêmios | 11 | Anti Spam |
| 5 | Afiliados | 12 | Suporte |
| 6 | Títulos Premiados | 13 | Capitalizadora |
| 7 | Pagamento | 14 | Restrições |

### 🎯 O lotemania já modelou isto — e quase inteiro

O comentário em `apps/lotemania/src/db/schema/raffles.ts` diz:

> *"Everything from the other ~12 configuration tabs (Títulos, Prêmios, Pagamento, Promoções,
> Alertas, Upsell, Anti-Spam, Suporte, Capitalizadora, Restrições, ...) lives here as one
> structured blob"*

Dez das quatorze, nominalmente certas. **A paridade do editor é muito menor do que o epic supunha**
— não é construir catorze telas, é conferir campo a campo o que `advancedSettings` já cobre.

## 2. Os campos, aba a aba

Várias abas mostram **um toggle só** porque o resto só renderiza quando ele está ligado. Isso é
informação de design, não ausência de campo.

### Geral (23 campos)

`Título` · `URL Amigável` · `Breve Descrição` · `Privacidade` · `Mostrar o sorteio na página
inicial` · `Categoria` · `Modelo de Reserva` · `Modalidade` · `Modo de Descrição` · `Texto do
status` · `Início das vendas` · `Data do Sorteio` · `Encerrar automático na data do sorteio` ·
`Mostrar a data do sorteio para os participantes` · `Permite download do comprovante` · `Mostrar
o nome do participante em números pagos` · `Mostrar seleção de números aleatórios para os
participantes` · e os seis campos obrigatórios do comprador: `Nome`, `Telefone`, `CPF`, `E-mail`,
`Nome Social`, `Data de Nascimento`.

### Títulos (13)

`Preço da cota` · `Quantidade de cotas` · `Tempo para uma reserva pendente expirar` · `Campanha
gratuita` · `Adicionar taxa` · `Quantidade por Comprador` · `Quantidade de cotas por comprador` ·
`Quantidade mínima por reserva` · `Quantidade máxima por reserva` · `Quantidade inicial por
reserva` · `Mostrar barra de progresso das vendas` · `Mostrar Ranking Diário de Maiores
Compradores` · `Mostrar Ranking Geral de Maiores Compradores`

**Casa quase um-a-um** com `productSettings` do lotemania (`minPerReservation`,
`maxPerReservation`, `maxPerBuyer`, `maxQuantityPerBuyer`, `initialPerReservation`,
`reservationExpiryMinutes`, `showSalesProgressBar`, `showDailyRanking`, `showGeneralRanking`,
`freeCampaign`, `hasFee`).

### As demais

| Aba | Campos visíveis |
|---|---|
| Imagens | `Ativar vídeo` |
| Prêmios | `Disponibilizar E-book` · `Título` · `Texto` · `Link de Acesso` · `Texto do Botão` · `Mostrar Prêmios` · `Prêmio 1º colocado` |
| Afiliados | `Permite afiliados?` |
| Títulos Premiados | *(nenhum rótulo — a aba renderiza tabela/ação, não formulário)* |
| Pagamento | `Provedor de pagamentos online` |
| Promoções | `Ativar Promoções` |
| Alertas | `Ativar Alerta` |
| Upsell | *(nenhum rótulo)* |
| Anti Spam | `Ativar Anti Spam` |
| Suporte | `Tipo do Widget` · `WhatsApp` · `Grupo do WhatsApp` · `Telegram` · `E-mail` · `Discord` · `Instagram` |
| Capitalizadora | 2 campos |
| Restrições | *(nenhum rótulo)* |

A aba **Suporte** bate **exatamente** com o bloco `support` do `productSettings` do lotemania —
`widgetType`, `whatsapp`, `whatsappGroup`, `telegram`, `email`, `discord`, `instagram`. É o mesmo
bloco cujo `.default({})` estava quebrado e que o `.prefault({})` consertou em `90c8ca59`.

## 3. Três respostas que estavam pendentes

### `URL Amigável` é **editável**, não gerada

Campo de texto livre na aba Geral, com a dica *"Essa é a url que corresponderá ao sorteio"*. O
lotemania tem `products.slug` com `uniqueIndex (tenant_id, slug)` — compatível.

### Como o sorteio acontece: **Loteria Federal**

O campo `Modalidade` da aba Geral tem os valores:

- **`Baseado em Loteria Federal`** (o selecionado neste sorteio)
- `Loteria Federal (COM REGRAS DE SORTEIO)`
- `SORTEIO APÓS A VENDA DE TODOS OS NÚMEROS`

Isso **confirma e explica** o achado de que nada no código escreve em `winners`: o sorteio é
externo por desenho — amarrado à Loteria Federal — e o painel registra o resultado. Também
aparece `Modelo de Reserva: Escolhe os bilhetes manualmente`.

> **Consequência para a meia cota:** a terceira modalidade, *"sorteio após a venda de todos os
> números"*, **não se combina** com metade órfã — nela não existe órfã, porque o sorteio só
> ocorre com tudo vendido. A decisão de metade órfã (prêmio inteiro a quem tem a metade vendida)
> vale para as duas modalidades de Loteria Federal. **Não é contradição; é escopo que vale
> registrar antes de alguém achar que é.**

### Meta Ads: **nunca foi configurado**

```
GET /api/meta-ads/config  →  404  {"error":"Meta Ads config not found"}
```

Isto **encerra** a dúvida levantada na `LTM-04`. O gap de UTM não é a plataforma preenchendo outro
campo que não estamos lendo — **a integração simplesmente não existe para este cliente**. A
`LTM-04` segue exatamente como está escrita, e o Achado A (UTM vazia em 100% dos pedidos) continua
tendo a causa que já tinha: a plataforma não anexa atribuição a pedido nenhum.

## 4. As ações por sorteio — nove inline, quatro no menu

Eu supunha um menu de 12-13 itens. Errado: são **nove ícones na própria linha** mais **quatro** no
menu de três pontos.

**Inline:** `Privado` (cadeado) · `Destaque` (estrela) · `Copiar link` · `Editar` · `Resumo das
Vendas` · `Links de Campanha` · `Visualizar página` · `Compras` (carrinho) · *(um sem rótulo)*

**No menu:** `QR Code` · `Salvar cópia` · `Ordenação: 0` · `Deletar ganhadores` (em vermelho)

`Salvar cópia` é duplicação de sorteio — recurso que o Império usa muito, porque roda a mesma
rodada várias vezes ao dia. **Não existe no lotemania** e não estava em nenhuma story.

## 5. Elementos de lista que a paridade visual precisa cobrir

Da tela `/dashboard/products`, com a decisão do founder de **reconstruir à mão, pixel a pixel**:

- **Barra lateral em dois grupos:** `GERAL` (Início, Sorteios, Afiliados, Bancos, Links De
  Desconto, Relatórios, Contatos, Usuários) e `CONFIGURAÇÕES` (Integrações, Capitalizadoras,
  Comunicados, Perguntas Frequentes, Analytics, …), com cartão de perfil no topo e botão de
  recolher.
- **Filtros:** busca por título, `Status`, `Privacidade`, `Data do sorteio` (date picker), 
  `Categoria`, e um botão de limpar filtros.
- **Linha do sorteio:** miniatura da arte, título, data do sorteio, data de cadastro, badge de
  status (verde `Ativo`, escuro `Concluído`), as nove ações, e um **anel de progresso com
  percentual**. Sorteios concluídos exibem ainda `Ganhador`, `Título` e `Data da compra`.
- O anel de progresso com o número no centro é o elemento visual mais distintivo da tela.

## 6. O que continua sem observar

| Item | Por quê |
|---|---|
| Modal de Faturamento e rótulos de "Revisar pagamentos" | não alcançado nesta passada |
| Conteúdo real das abas Títulos Premiados, Upsell e Restrições | renderizam tabela ou formulário condicional, sem rótulo estático |
| A loja do comprador (`rapidinhas24hr.com`) | **é pública** — não precisa de sessão, e é trilha própria |

---

*Sessão do founder, somente leitura. O token de acesso **não** foi copiado para lugar nenhum; as
chamadas de API saíram do contexto da própria página.*
