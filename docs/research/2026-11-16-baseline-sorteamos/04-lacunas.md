# 04 — Tabela de paridade: Sorteamos contra lotemania

> A coluna **Sorteamos** herda a procedência de `01-api.md` a `03-telas.md`.
> A coluna **lotemania** foi **lida no código** em 2026-11-16, arquivo por arquivo — não é
> relato nem inferência. Onde a leitura contradiz um comentário do próprio repositório, a
> leitura ganha e a contradição está anotada.

**Veredito:** `existe` = paridade funcional · `parcial` = esqueleto ou subconjunto ·
`ausente` = não há nada · `invenção` = o lotemania tem, a Sorteamos não se sabe se tem.

---

## Sumário: onde a paridade dói

| Frente | Veredito |
|---|---|
| Esqueleto de telas e domínio | **bom** — 27 páginas, 8 arquivos de schema, vocabulário certo |
| Núcleo transacional (título, reserva, propriedade de cota) | **parcial** — a lógica está certa, o índice não existe e não há transação |
| **Pagamento real** | **ausente** — o webhook termina num `TODO`; ninguém nunca comprou nada |
| **Atribuição por pedido** | **ausente** — zero dos 14 campos de rastreio |
| **Baixa manual** | **ausente** — sem o campo, a tela de Faturamento é impossível |
| **Export de 25 colunas** | **ausente** — os relatórios renderizam tabela em tela, não exportam arquivo |
| **API de leitura para o nosso ETL** | **ausente** — nenhuma rota |
| 12 ações do menu de sorteio | **1 de 13** existe (Editar) |

---

## 1. Sorteio (`product`)

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Título, descrição, preço por título, total de títulos, data do sorteio | sim | `products.title/description/pricePerNumber/totalNumbers/drawDate` | **existe** |
| Slug da página pública | `friendlyURL`, **padrão irregular, nunca derivável do título** | `products.slug`, único por `(tenantId, slug)`, gerado por `lib/slugify.ts` | **parcial** — o gerador não reproduz as irregularidades históricas; migração de sorteio antigo quebra link |
| Status | `active`, `done` | enum `draft \| active \| finished \| canceled` | **parcial** — vocabulário divergente; `draft` e `finished` não foram observados na Sorteamos |
| Privacidade | `public`, `private` | enum igual | **existe** |
| **Múltiplas imagens** | `imageUrls` — **array** | `products.imageUrl` — **uma só** (`text`) | **parcial** — perda de dado na migração |
| Chamada da vitrine | `statusText` | `advancedSettings.statusText` | **existe** |
| Aparecer na home | `showHome` | `advancedSettings.showOnHomepage` | **existe** |
| **Destaque na vitrine** | `highlight` | — | **ausente** |
| Prêmios | `awards` — array de string livre | `advancedSettings.prizes` — array de string | **existe** |
| **Ganhadores declarados** | `winners[]` com `number` + `award`, **dentro do produto** | tabela `winners` separada e **sem nenhuma server action que escreva nela** — só a loja lê | **parcial** — leitura existe, não há como declarar ganhador |
| Contadores de título | `qtyFree/qtyPaid/qtyReserved/qty` vindos prontos | contados por agregação sobre `product_numbers` | **existe** — equivalente funcional |
| Expiração da reserva | `expirationSeconds` (**segundos**) | `advancedSettings.reservationExpiryMinutes` (**minutos**) | **parcial** — granularidade perdida |
| Mín./máx. de títulos por pedido | `numbersConfig.min/max` (máx. observado 25) | `advancedSettings.minPerReservation/maxPerReservation` (padrão 1/1000) | **existe** |
| Favoritar / duplicar / excluir | `[NÃO OBSERVADO]` se existem | `toggleProductFavorite`, `duplicateProduct`, `deleteProduct` | **invenção** até confirmar |
| Categoria | `[NÃO OBSERVADO]` | `products.category` + filtro fixo `Dinheiro/Eletrônicos/Veículos/Outros` | **invenção** |

---

## 2. Título (`number`)

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Uma linha por título vendável | implícito | `product_numbers` com `status available \| reserved \| sold` | **existe** |
| **Formato do número** | **string de 2 dígitos** com zero à esquerda | `integer` | **parcial** — formatação na borda (`padStart(2,'0')`); perde a identidade de string |
| Escolha consciente pelo comprador | `order.numbers` | `reserveSelectedNumbers` + `product_numbers.orderId` | **existe** |
| Seleção aleatória | `advancedSettings.showRandomSelectionOption` no clone; na Sorteamos `[NÃO OBSERVADO]` | toggle existe | **parcial** |
| Reserva atômica | `[NÃO OBSERVADO]` como é feita | `UPDATE ... WHERE status = 'available'` condicional | **existe** — e bem desenhado |
| **Índice em `product_numbers`** | n/d (MongoDB) | **NÃO EXISTE.** O comentário no schema diz "Indexed by (productId, number)" — **li a definição da tabela e não há índice nenhum** | **ausente** — e é o risco de contenção número um |
| Transação | n/d | **zero transações** — o driver `neon-http` não as suporta | **ausente** |

> **Achado verificado por mim, não herdado.** Em `src/db/schema/raffles.ts`, `productNumbers` é
> declarada sem array de índices, ao contrário de `products`, `users` e outras cinco tabelas que
> declaram `uniqueIndex`. O comentário acima da tabela afirma o contrário. Com 100 títulos
> esgotando em 18 minutos e 5 rodadas simultâneas, isso é varredura sequencial no caminho quente.

---

## 3. Compra (`order`) — a maior lacuna da baseline

| Campo da Sorteamos | lotemania | Veredito |
|---|---|---|
| `_id`, `productId`, `userId`, `quantity`, `total` | `orders.id/productId/userId/quantity/amount` | **existe** |
| `status` (`paid`, `waiting-payment`, `expired`) | enum `pending \| paid \| expired \| refunded \| canceled` | **parcial** — `pending` em vez de `waiting-payment`; `refunded`/`canceled` são invenção |
| `createdAt`, `paymentAt` | `orders.createdAt`, `orders.paidAt` | **existe** |
| `price` (unitário congelado na compra) | — | **ausente** |
| `discount` | — | **ausente** |
| **`approvedBy`** (`paysure` \| `pay2m` \| **`admin`**) | — | **ausente** — ver §6 |
| `expiredBy` | — | **ausente** |
| `paymentId` | — | **ausente** |
| `paymentEndToEndId` (end-to-end do PIX) | — | **ausente** |
| `eventId` (id de evento do Pixel, compartilhado com o navegador) | — | **ausente** |
| `fbc` | — | **ausente** |
| `fbp` | — | **ausente** |
| `gclid` | — | **ausente** |
| `ttclid` | — | **ausente** |
| `utmSource` | — | **ausente** |
| `utmMedium` | — | **ausente** |
| `utmCampaign` | — | **ausente** |
| `utmContent` | — | **ausente** |
| `utmTerm` | — | **ausente** |
| `affiliate` | `orders.affiliateId` (uuid, não código) | **parcial** |
| `ip` | — | **ausente** |
| `userAgent` | — | **ausente** |

**Contagem:** dos ~24 campos conhecidos do pedido, o lotemania tem 7 equivalentes, 2 parciais e
**15 ausentes**. Catorze dos quinze ausentes são de pagamento ou de atribuição.

**O que isso custa concretamente.** Sem `eventId`, a deduplicação do Pixel com o navegador não
funciona (hoje 99,69%). Sem `fbc`/`fbp`/`ip`/`userAgent`, a EMQ do CAPI cai de 7,4 para perto do
chão. Sem `paymentEndToEndId`, não há conciliação de PIX. Sem `approvedBy`, não há Faturamento.

---

## 4. Participante (`user`)

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Telefone como login | **confirmado** (`userId.login` é o telefone) | `users.phone` único por tenant + `username` | **parcial** — suporta, mas não é a chave declarada |
| Nome | 100% preenchido | `users.name` | **existe** |
| **Nome Social** (coluna 12 do export) | existe no export | `users.socialName` | **existe** |
| **Data de Nascimento** (coluna 13) | existe no export | `users.birthDate` | **existe** |
| E-mail (~37%) | sim | `users.email` | **existe** |
| CPF (~19%) | sim | `users.cpf` | **existe** |
| País (100%, sempre `br`) | `phoneDetails.country` | — (fixo implícito) | **parcial** |
| Telefone em E.164 pronto | `phoneDetails.e164` | — (guarda bruto) | **parcial** |
| Endereço | `[NÃO OBSERVADO]` | 6 campos (CEP, rua, número, bairro, complemento, cidade/UF) | **invenção** até confirmar |
| Bloqueio de usuário | `[NÃO OBSERVADO]` | enum `active \| inactive \| blocked` + `blocked_numbers` | **invenção** |
| 2FA | banner "Ativar 2FA" `[RELATO]` | `twoFactorEnabled` + `twoFactorSecret` (campos; fluxo não verificado) | **parcial** |
| Anti-spam por reserva não paga | aba "Anti Spam" existe | `consecutiveUnpaidReservations` + `blockedUntil`, 3 reservas → 30 min | **parcial** — mecanismo é desenho do clone |

---

## 5. Pagamento

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| **Fechar o pedido ao receber confirmação** | funciona em produção, ~R$ 90 mil/dia | **`TODO` no lugar do fechamento.** A rota valida HMAC, grava auditoria, devolve `{ok:true}` e **não marca nada como pago** | **ausente** |
| Validação de assinatura do webhook | `[NÃO OBSERVADO]` | HMAC-SHA256 sobre o corpo cru, `timingSafeEqual`, header `x-webhook-signature` | **existe** — e melhor que o que sabemos do original |
| Auditoria de webhook recebido | `[NÃO OBSERVADO]` | `payment_webhook_events`, grava inclusive assinatura inválida | **invenção** (melhoria) |
| **Gateway em produção: paysure** | **confirmado** (`approvedBy`) | **`paysure` NÃO está no enum de 18 provedores** | **ausente** — o gateway real do cliente não é representável |
| Gateway pay2m | confirmado | `pay2m` está no enum | **existe** |
| Credenciais por operador | n/d (single-tenant) | `credentialsEncrypted` por `(tenant, provider)` | **invenção** (melhoria multi-tenant) |
| Checkout real | sim | `simulatePayment(orderId)` — **pagamento simulado** | **ausente** |
| Transações bancárias / saque | item "Bancos" na barra lateral | `bank_accounts`, `banking_transactions`, `payment_requests` + tela "Transações Bancárias" | **parcial** — tabelas e tela existem; não sei se correspondem ao que "Bancos" faz |

> O enum de 18 provedores e a afirmação de que o original tinha "18 rotas `/api/<provider>/webhook`
> dedicadas" são `[RELATO]` de quem escreveu o clone. **Não confirmei nenhum dos dois** — e a
> ausência do `paysure` nessa lista é motivo para desconfiar da lista inteira.

---

## 6. Baixa manual e Faturamento

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Marcar compra como paga na mão (`approvedBy = admin`) | **confirmado** — 647 títulos em 10 dias | nenhuma action, nenhum campo | **ausente** |
| Separar faturamento automático de manual | modal **Faturamento** | o relatório `faturamento` devolve **2 colunas**: total e contagem de pagos | **ausente** |
| Ação "Revisar pagamentos" | existe no menu | — | **ausente** |

Busquei no código inteiro do lotemania por `baixa`, `manual`, `approvedBy`, `revisar pagamento`:
as únicas ocorrências de "manual" são `reservationModel: manual`, `drawMechanism: manual` e um
rótulo de link de desconto. **Não há nada.**

---

## 7. Relatórios e export

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Vendas por dia | ação no menu | `vendas_por_dia` → Data, Pagos, Reservados, Expirados, Faturamento | **parcial** |
| Relatório de Vendas | ação no menu; **provável origem do export de 25 colunas** | `relatorio_vendas` → **4 colunas**: Sorteio, Data, Quantidade, Valor | **parcial** |
| Relatório de Expirados | ação no menu | `relatorio_expirados` → 4 colunas | **parcial** |
| Relatório de Participantes | ação no menu | `relatorio_participantes` → Participante (**8 primeiros caracteres do uuid**), Compras, Títulos, Total Gasto | **parcial** — identifica a pessoa por fragmento de uuid |
| Faturamento | modal com baixa automática × manual | 2 colunas | **ausente** |
| **Export para arquivo (CSV)** | **25 colunas, separador `;`** | **nenhum.** A tela renderiza `<Table>`; não há `Content-Disposition`, não há blob, não há botão de download | **ausente** |
| Top 10 diário | ação no menu | — (a home tem "Top 5 Compradores no total", que é outra coisa) | **ausente** |
| Porcentagem | ação no menu | — (há um `ProgressRing` na linha do sorteio) | **ausente** |
| Menor ou maior | ação no menu | — | **ausente** |
| Dashboard do sorteio | ação no menu | — (há um modal de estatísticas com 3 contadores) | **parcial** |
| Export de usuários | `[NÃO OBSERVADO]` | `export-users-button.tsx` (38 linhas) | **invenção** |

**Correção a um relato interno:** o `README.md` do lotemania diz "`reports` com 22 linhas contra
3 exports na Sorteamos". Li os arquivos: as 22 linhas são da **página**; a lógica tem 118 linhas e
**5** tipos de relatório, e a Sorteamos tem **5** relatórios no menu, não 3. O relato subestima o
que existe e erra a contagem do original.

---

## 8. Atribuição e rastreio

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Campos de rastreio no pedido | 14 campos (com 3 defeitos conhecidos) | **zero** | **ausente** |
| Links UTM gerenciados | `[NÃO OBSERVADO]` | tabela `utm_links` + `registerUtmClick` + `utm-link-row.tsx`… mas **`utm-links/page.tsx` é arquivo vazio** | **parcial** — backend sem tela |
| Contagem de visitas | cartões "Visitas Hoje/Ontem/Total" `[RELATO]` | tabela `page_views` alimentando os três cartões | **parcial** |
| Analytics | item da barra lateral | **`analytics/page.tsx` é arquivo vazio** (0 bytes); existe um `analytics-chart.tsx` de 20 linhas órfão | **ausente** |
| Integração Meta Ads / CAPI nativa | CAPI nativa envia em lote horário | `meta-ads` no enum de integrações; nenhum envio implementado | **ausente** |
| **API de leitura para o nosso ETL** | 3 endpoints REST que consumimos há meses | **nenhuma rota.** Só existem `/api/auth/{login,logout,refresh}` e `/api/webhooks/payment/[tenant]/[provider]` | **ausente** |

---

## 9. Afiliados, descontos, capitalizadoras e conteúdo

| Capacidade | Sorteamos | lotemania | Veredito |
|---|---|---|---|
| Afiliados (cadastro, comissão, ativar) | item da barra lateral | tabela + tela + `createAffiliate` + `toggleAffiliateActive` + autocadastro na loja | **parcial** — forma existe, regra de comissão real desconhecida |
| Links de desconto | item da barra lateral | tabela com 7 parâmetros + tela + diálogo | **parcial** — parâmetros são desenho do clone |
| Capitalizadoras | item da barra lateral + aba do editor | tabela (`susepProcessNumber`, `terms`, `isActive`) + tela | **parcial** |
| Comunicados | item da barra lateral | tabela + tela + ativar/desativar | **parcial** |
| Perguntas Frequentes | item da barra lateral | tabela com ordenação + tela | **parcial** |
| Contatos | item da barra lateral | tabela + tela + `resolveContact`… mas **`contact-card.tsx` é arquivo vazio** | **parcial** |
| Integrações | item da barra lateral | 10 provedores no enum + tela + webhooks de saída | **parcial** — o clone cita 21 rotas no original; não confirmei |
| Usuários | item da barra lateral | tela de 148 linhas + criar + status + números bloqueados… mas **`users-filters.tsx` é arquivo vazio** | **parcial** |
| Certificado / Filantropia / Termos / Privacidade / Sobre / Tema / Redes Sociais / Atualizações | **não estão na barra lateral relatada** | telas existem (Redes Sociais com **page e form vazios**) | **invenção** até confirmar |

---

## 10. O que o lotemania tem e a Sorteamos não se sabe se tem

Marcado como **invenção** acima. Vale isolar, porque é onde o esforço pode estar sendo gasto fora
do alvo de paridade:

| Item | Peso no clone | Evidência na Sorteamos |
|---|---|---|
| **Jogos bônus**: caixa premiada, roleta, raspadinha — 6 tabelas, 2 arquivos de action, `bonus-game-section.tsx` de 214 linhas, player na loja | alto | **nenhuma.** Não aparece em campo de API, em menu, em aba do editor, nem no briefing |
| **Multi-tenant**: `tenantId` em toda tabela, domínio customizado, tema por operador | estrutural | nenhuma — a Sorteamos aparenta ser single-operator |
| Endereço completo do participante | 6 campos | nenhuma |
| Favoritar / duplicar / categoria de sorteio | — | nenhuma |
| Auditoria de webhook, refresh token rotativo, HMAC | — | nenhuma (são melhorias, não paridade) |

Nada disso é necessariamente errado — multi-tenant é a tese do produto. Mas **jogos bônus são a
maior massa de código sem nenhum alvo de paridade correspondente**, e "Títulos Premiados", que a
Sorteamos tem e tem ação própria no menu, existe no clone apenas como o booleano
`instantPrizesEnabled`, sem mecanismo algum.

---

## 11. Páginas vazias e ausência de teste — verificado

Oito arquivos com **0 bytes**:

```
dashboard/analytics/page.tsx        <- item da barra lateral da Sorteamos
dashboard/social/page.tsx
dashboard/social/social-form.tsx
dashboard/utm-links/page.tsx
dashboard/utm-links/utm-link-form.tsx
dashboard/settings/settings-tabs.tsx
dashboard/users/users-filters.tsx
dashboard/contacts/contact-card.tsx
```

`dashboard/page.tsx` tem 5 linhas. Não há script de `test` nem de `typecheck` no `package.json`,
e não encontrei um único arquivo de teste — em 189 arquivos de fonte. O próprio README reconhece
e chama de primeiro item de dívida, "crítico porque vamos mexer em propriedade de cota e rateio
de prêmio". Confirmo a leitura e concordo com a classificação.
