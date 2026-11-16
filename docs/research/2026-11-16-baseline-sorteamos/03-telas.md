# 03 — As telas do painel da Sorteamos

> **Este é o documento mais incompleto da baseline, e é por desenho.** Nenhuma tela foi aberta
> nesta sessão: a plataforma tem sessão única e o founder estava com o painel aberto. A
> observação ao vivo acontece por navegação no Chrome já autenticado dele — e
> `05-pendente-de-observacao.md` é o roteiro dessa passada.
>
> O que está aqui vem de três fontes: a navegação relatada no briefing, uma tela cujo conteúdo
> aparece citado no nosso código de produção, e as URLs públicas que o nosso pipeline usa.
> **Tudo o mais está marcado "não observado" — e isso é a informação, não a falta dela.**

---

## 1. Navegação — a barra lateral

13 itens, em ordem. `[BRIEFING]`

| # | Item | Sabemos o que mostra? |
|---|---|---|
| 1 | **Início** | `[NÃO OBSERVADO]` — ver §4 |
| 2 | **Sorteios** | parcialmente — ver §2 |
| 3 | **Afiliados** | `[NÃO OBSERVADO]` |
| 4 | **Bancos** | `[NÃO OBSERVADO]` |
| 5 | **Links De Desconto** | `[NÃO OBSERVADO]` |
| 6 | **Relatórios** | `[NÃO OBSERVADO]` |
| 7 | **Contatos** | `[NÃO OBSERVADO]` |
| 8 | **Usuários** | `[NÃO OBSERVADO]` |
| 9 | **Integrações** | `[NÃO OBSERVADO]` |
| 10 | **Capitalizadoras** | `[NÃO OBSERVADO]` |
| 11 | **Comunicados** | `[NÃO OBSERVADO]` |
| 12 | **Perguntas Frequentes** | `[NÃO OBSERVADO]` |
| 13 | **Analytics** | `[NÃO OBSERVADO]` |

**Observação sobre o que não está na lista.** A barra lateral da Sorteamos **não** tem, pelo que
foi relatado: Webhooks, Links UTM, Redes Sociais, Certificado, Filantropia, Termos de Uso,
Privacidade, Sobre, Personalizar Tema, Configurações, Atualizações. O clone (`lotemania`) tem
todos esses onze itens extras numa segunda seção chamada "Configurações".

Dois desses onze, no entanto, **existem na Sorteamos** e portanto estão em algum lugar que não a
barra lateral relatada:

- **Webhooks** — o caminho `dashboard/webhooks` é citado no nosso código de produção (§3). Logo
  existe. Provavelmente **dentro de Integrações**. `[INFERIDO]`
- **Configurações** — o painel tem banners de "Ativar 2FA" e "Ativar Captcha" que levam a algum
  lugar configurável. `[RELATO]`, via comentário no clone; **não confirmado**.

Isso significa que **a barra lateral de 13 itens provavelmente tem submenus que não foram
relatados.** É o primeiro item de `05`.

---

## 2. Tela de Sorteios

**O que sabemos com confiança, e por que.** Esta tela é alimentada por `GET /api/products`, que
o nosso pipeline consome em produção. Então os **filtros** e a **paginação** da tela podem ser
lidos de volta a partir dos parâmetros que a API aceita. `[INFERIDO]` dessa correspondência —
forte, mas ainda inferência.

| Elemento | O que é | Procedência |
|---|---|---|
| Paginação | **25 linhas por página**, página começando em 0 | `[PROD]` (parâmetros reais) |
| Filtro: título | busca por título | `[PROD]` (campo `filters.title`) |
| Filtro: status | com opção "todos" | `[PROD]` (campo `filters.status`, valor `all`) |
| Filtro: privacidade | pública / privada, com opção "todos" | `[PROD]` (campo `filters.privacy`) |
| Filtro: data do sorteio | `[PROD]` (campo `filters.drawDate`) | |

**Dados disponíveis por linha** — os campos que a API devolve e que fariam sentido numa listagem:
título, imagem, status, privacidade, data do sorteio, data de criação, preço por título, e os
quatro contadores (`qty`, `qtyPaid`, `qtyReserved`, `qtyFree`). **Quais destes a tela realmente
exibe, e em que ordem, é `[NÃO OBSERVADO]`.**

---

## 3. O menu de ações por sorteio

`[BRIEFING]`. **Atenção:** o briefing descreve "menu de ações por sorteio (12)" mas lista **13**
itens. Reproduzo a lista como recebida e sinalizo a divergência em vez de escolher um dos dois —
é exatamente o tipo de detalhe que, resolvido por palpite, vira tela errada.

| # | Ação | Classe | O que faz |
|---|---|---|---|
| 1 | **Editar** | navegação | abre o editor do sorteio (ver §5) |
| 2 | **Dashboard** | visualização | painel do sorteio individual. `[NÃO OBSERVADO]` |
| 3 | **Top 10 diário** | visualização | ranking de compradores do dia. `[NÃO OBSERVADO]` |
| 4 | **Porcentagem** | visualização | `[NÃO OBSERVADO]` — provável progresso de venda; **o nome não diz de quê** |
| 5 | **Horário Premiado** | configuração | `[NÃO OBSERVADO]` — provável prêmio atrelado a janela de horário |
| 6 | **Menor ou maior** | visualização ou jogo | `[NÃO OBSERVADO]` — **não tenho nem hipótese confiável** |
| 7 | **Vendas por dia** | relatório | série diária de vendas |
| 8 | **Relatório de Vendas** | relatório | provável origem do export de 25 colunas |
| 9 | **Relatório de Expirados** | relatório | reservas que venceram |
| 10 | **Relatório de Participantes** | relatório | agregado por participante |
| 11 | **Ativar títulos premiados** | ação de escrita | liga o prêmio instantâneo da rodada |
| 12 | **Faturamento** | visualização | ver §4 — é a única cujo conteúdo conhecemos em parte |
| 13 | **Revisar pagamentos** | ação de escrita | `[NÃO OBSERVADO]` — **provavelmente é onde a baixa manual acontece** |

**As duas ações de escrita (#11 e #13) são as mais importantes de observar**, porque são as que
mudam dinheiro e resultado de sorteio, e são as que o clone não tem de forma alguma.

### O modal de Faturamento

A única tela cujo **conteúdo** temos, e ainda assim só a estrutura. `[BRIEFING]`:

> O faturamento separa **baixa automática** de **baixa manual**.

Isso casa exatamente com o campo `approvedBy` do pedido (`[PROD]`): valor de gateway
(`paysure`/`pay2m`) contra `admin`. Então o modal, no mínimo, mostra duas linhas de faturamento —
o que veio de cliente e o que o operador fechou na mão.

Se tem total consolidado, percentual, contagem de títulos, recorte por período, ou prêmio
descontado: `[NÃO OBSERVADO]`.

**Por que isto é a tela mais crítica de toda a paridade:** `[PROD]` — 647 títulos de baixa manual
em 10 dias / 295 sorteios, com 11 casos em que o título de baixa manual ganhou o prêmio do dia. É
dinheiro e é resultado de sorteio no mesmo lugar. O lotemania **não tem o campo `approvedBy`**,
logo não pode construir esta tela nem aproximadamente — ver `04-lacunas.md`.

---

## 4. Tela de Webhooks

A única tela de que temos conteúdo citado textualmente no nosso código de produção. `[PROD]`:

| Elemento | O que é |
|---|---|
| Caminho | `{painel}/dashboard/webhooks` |
| Seção | **"Exemplos de payload"**, com um exemplo por evento |
| Exemplo conhecido | **`Order.Paid`** — o payload está transcrito em `01-api.md` §5 |
| Campo de cadastro | **"Authorization"** — o valor digitado aqui volta no header `X-AUTH-WEBHOOK` de cada chamada |

**O que falta:** a **lista completa de eventos assináveis**. Sabemos que há mais de um, porque o
nosso handler filtra por `event == "order.paid"` e ignora o resto. Quais são os outros é um dos
itens de maior valor em `05` — eventos de saída são a ponte natural para o nosso ETL.

---

## 5. O editor de sorteio

`[RELATO]` — a lista de abas abaixo vem de um comentário em
`apps/lotemania/src/lib/validations/product-settings.ts`, que diz replicar "o editor de produto
de 14 abas do original". **Não é observação minha e não está no briefing.** Trato como pista de
investigação, não como baseline:

```
Geral · Títulos · Imagens · Prêmios · Afiliados · Títulos Premiados · Pagamento ·
Promoções · Alertas · Upsell · Anti Spam · Suporte · Capitalizadora · Restrições
```

Três abas têm correspondência **confirmada** com campos reais da API, o que dá alguma
credibilidade ao resto da lista:

| Aba | Campo real correspondente | Procedência |
|---|---|---|
| Títulos | `numbersConfig` (`qty`, `price`, `min`, `max`, `expirationSeconds`) | `[PROD]` |
| Prêmios | `awards` | `[PROD]` |
| Geral | `statusText`, `showHome`, `highlight`, `privacy`, `description` | `[AMOSTRA]` / `[PROD]` |
| Imagens | `imageUrls` | `[AMOSTRA]` |

As outras dez abas não têm **nenhum** campo conhecido na API. Tudo que o clone implementou nelas
é desenho dele.

---

## 6. As telas públicas da loja

O que o nosso pipeline toca ou mediu. `[PROD]`

| URL | O que é | O que se sabe |
|---|---|---|
| `rapidinhas24hr.com/` | home | **não carrega o GTM e descarta a query string** — é a origem do UTM em 0%. Medido 2026-10-10 |
| `rapidinhas24hr.com/campanhas` | lista de sorteios | mesmo problema: sem GTM, descarta query string |
| `rapidinhas24hr.com/campanha/{friendlyURL}` | **página do sorteio** | **carrega GTM-58RGNFCK**, dispara `view_item` no dataLayer, grava o cookie `ic_origem`. É a única página rastreável — por isso o nosso catálogo aponta direto para cá |
| `imperiopremioss.com/sorteio/{id}` | página do sorteio (domínio antigo) | padrão de URL citado em doc de 2026-10 anterior à troca de domínio. **Os dois padrões (`/sorteio/{id}` e `/campanha/{slug}`) aparecem em datas diferentes** — não sei se ambos funcionam hoje |
| `{loja}/compra/{id}` | confirmação da compra | hipótese (não provada) de ser onde o pixel de Purchase redispara ~1,6x por recarga |

**Páginas públicas que existem mas nunca observamos:** cadastro, entrada/login do participante,
"meus títulos", ganhadores, comunicados, suporte, termos, painel do afiliado. `[NÃO OBSERVADO]` —
sei que precisam existir pela natureza do produto, não porque vi.

**A SPA perde a query string em navegação interna.** `[PROD]` — foi a primeira hipótese para o
UTM zerado, e foi **descartada** como causa única: 25 pedidos com clique de minutos antes também
chegaram sem UTM, logo o problema é a plataforma não persistir, não a SPA perder.

---

## 7. Resumo honesto de cobertura

| Tela | Existência | Filtros | Ações | Dados por linha |
|---|---|---|---|---|
| Sorteios | confirmada | **4 inferidos da API** | **13 relatados (contagem divergente)** | campos disponíveis conhecidos; layout não |
| Faturamento (modal) | confirmada | — | — | **estrutura de 2 linhas confirmada** |
| Webhooks | confirmada | — | cadastro com campo Authorization | 1 exemplo de payload transcrito |
| Lista de Compras | confirmada | **11 inferidos da API** | — | campos disponíveis conhecidos; layout não |
| Editor de sorteio | confirmada | — | 14 abas `[RELATO]`, 4 corroboradas | — |
| Início | confirmada | — | — | **nada** |
| Outras 10 da barra lateral | confirmada | — | — | **nada** |

Onze das catorze telas do painel têm cobertura **zero** de conteúdo. É o maior buraco desta
baseline, e está todo endereçado em [`05-pendente-de-observacao.md`](05-pendente-de-observacao.md).
