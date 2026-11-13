# Plano de Campanhas — Wave 1 — Império Prêmios

**Data:** 2026-10-05
**Status técnico:** Pixel/Dataset ativo, CAPI validado com envio real (`events_received=5`, 2026-10-05), conta de anúncio criada (CA IP Realiza), 3 audiências já setadas em Clientes Existentes.
**Orçamento baseline:** R\$1.000/dia (o cliente já investe isso hoje) — meta verbalizada de escalar pra R\$2.000-3.000/dia.
**Fontes:** `docs/meta_mba/MODULO_01...md` (Kickoff Kit, seção 6-7), `docs/meta_mba/Apostila/MODULO_05...md` (Performance 5/Advantage+), `docs/meta_mba/Apostila/MODULO_07...md` (protocolo 3:2:2), `PLANEJAMENTO_ESTRATEGICO_90DIAS.md`, pedido de funil do cliente (mensagem do founder, 2026-10-05), `gates-status.yaml`.

---

## 1. Por que R\$1.000/dia é seguro mesmo sem a conversa de margem fechada

Você apontou que o cliente provavelmente tem custos além da MC que não capturamos aqui, e que a educação sobre margem ainda está em andamento. Isso é real, mas o número já levantado dá uma folga confortável:

| Meta de margem líquida | CAC máximo (90 dias) | CAC máximo/dia |
|---|---|---|
| 20% | inviável (MC 17,65% < meta) | — |
| **15% (conservador)** | R\$253.264 | **~R\$2.814/dia** |
| 10% | R\$731.744 | ~R\$8.130/dia |

**Mesmo no cenário mais conservador (15%, "manobra apertada"), o teto de mídia é ~R\$2.814/dia** — acima dos R\$2-3k que o cliente quer atingir. Mesmo que existam custos fixos não capturados na MC (equipe, ferramentas, estrutura — o próprio `PLANEJAMENTO_ESTRATEGICO_90DIAS.md` seção 2.1 já avisa que o 5,67x de ROAS_BE cobre só custo variável, não a operação inteira), a margem de manobra entre R\$1k-3k/dia e o teto de R\$2.814/dia é estreita o bastante pra merecer monitoramento, mas folgada o bastante pra **não travar o lançamento esperando a conversa de margem fechar**. Decisão: seguir com R\$1.000/dia agora, reavaliar o teto quando a meta de margem for formalizada.

**Ação de acompanhamento:** ao bater R\$2.500/dia de investimento, pausar e reconfirmar a margem com o cliente antes de seguir pra R\$3k — ali a folga do cenário conservador começa a apertar de verdade.

---

## 2. Estrutura de campanhas — 3 campanhas, consolidadas (não 5+)

O funil que você descreveu (atração → topo → meio → fundo) é a lógica certa de **conteúdo e mensagem**, mas não deve virar 4 campanhas/públicos separados no Ads Manager com R\$1.000/dia total — isso fragmenta demais pro Módulo 03 (Learning Phase): cada conjunto precisa de `(50/7) × custo_por_conversão` de orçamento diário só pra sair do aprendizado.

**Atualização 2026-10-05:** o cliente ficou alguns dias sem rodar campanha — não há histórico recente de CPA/ROAS pra usar como baseline. Isso **não muda a estrutura abaixo**, mas reforça o ponto do Módulo 03: tratar isso como **cold start de verdade**, não como "retomada". Nos primeiros 7 dias, resista à tentação de ajustar cedo demais — o algoritmo precisa reconstruir sinal do zero.

Por isso a Wave 1 usa a arquitetura do Performance 5 (Módulo 01 seção 4, Módulo 05) — **3 campanhas, 1 conjunto cada**, e o funil do cliente vira a **lógica de criativo dentro delas**, não a estrutura de públicos:

```
Orçamento total: R$1.000/dia
├── Campanha 1 — Advantage+ Vendas (Prospecção)         R$700/dia (70%)
├── Campanha 2 — CBO Teste de Criativos                 R$200/dia (20%)
└── Campanha 3 — Retargeting (Site)                     R$100/dia (10%)
```

Isso é deliberadamente **mais simples** que pedir 4 campanhas de funil — e também mais simples que o protocolo 3:2:2 "completo" do Módulo 07 (que pede 2 conjuntos de ângulo na campanha de teste). Com R\$1.000/dia total, 1 conjunto por campanha é o que o Módulo 03 chama de "estrutura líquida" — a fragmentação em mais conjuntos fica pra quando o budget escalar pra R\$2-3k/dia (seção 7 abaixo).

### 2.1 Campanha 1 — Advantage+ Vendas (Prospecção) — R\$700/dia

| Config | Valor |
|---|---|
| Objetivo (ODAX) | `OUTCOMES_SALES` |
| Tipo de campanha | Advantage+ Sales (estrutura unificada — **nunca** "ASC" legado, ver Módulo 01 nota sobre nomenclatura) |
| Otimização | **VALUE** (não volume) — com concentração de 85,3% do faturamento nos 10% maiores compradores (achado do plano de 90 dias), otimizar por `OFFSITE_CONVERSIONS` puro deixaria o leilão cego pra esse padrão |
| Evento de conversão | `Purchase` (via Pixel + CAPI, já validado) |
| Audiência | **Advantage+ Audience (broad)** — não restringir manualmente |
| Sinal de audiência | Lookalike 1-3% usando **"Clientes Gerais"** (1.529 contatos, tem coluna `value` — melhor semente que a de 420 pra Lookalike por valor) como *sugestão*, não trava |
| **Estratégia de ciclo de vida do cliente** | **"Obter conversões de todos os públicos"** (sem restrição) — ⚠️ **correção 2026-10-05 (2ª volta):** o cap em % não é mais um campo dedicado (Existing Customer Budget Cap do ASC foi descontinuado, item D-04 da base do MBA), mas achamos o equivalente real: **Regras de Valor** (abaixo), que reduz o *lance* por rótulo de público em vez de excluir. É mais fino que o binário "todos/excluir" e bate com a preferência de não cortar o cliente existente de vez. |
| **Regras de valor** | Reduzir lance em **50%** (preset "Padrão" da própria Meta) quando o público tiver os rótulos **"Clientes Alto Valor"** + **"Clientes Gerais"**. **Não incluir "Clientes Desinteressados"** na regra — são 550k contatos dormentes, reduzir lance pra eles não evita desperdício (não estão convertendo mesmo) e pode atrapalhar uma reativação orgânica. Usar Regras de Valor **em vez de** excluir no ciclo de vida — as duas juntas são redundantes. |
| **Meta de desempenho (otimização)** | Pedido: **Maximizar o valor de conversão**. ⚠️ **Bloqueado em contas novas** até Business Verification ou algumas semanas de histórico — ver seção 13. Até desbloquear, sobe com "Maximizar o número de conversões" mesmo (não é escolha, é limite da conta) |
| Criativo dinâmico | **Desativado** nesta wave — só 1 criativo por enquanto, nada pra combinar. Reavaliar quando a Campanha 2 validar 2-3 ganchos |
| Modelo de atribuição | **Padrão** — Incremental exige histórico/volume que uma conta em cold start não tem; é relatório, não o que de fato otimiza o lance |
| Posicionamentos | Advantage+ (todos) |
| Orçamento | CBO R\$700/dia, 1 conjunto |

**Criativo desta campanha** (mapeando seu pedido de topo+meio de funil):
- Vídeos explicativos "como funciona pra comprar" / "como funciona o resultado" → ângulo **Confiança**
- Bônus "primeiro depósito" / "primeira compra" → ângulo **Acessibilidade**
- Vídeos de venda direta, fotos/vídeos de "rapidinha" → ângulo **Prêmio**

### 2.2 Campanha 2 — CBO Teste de Criativos — R\$200/dia

| Config | Valor |
|---|---|
| Objetivo | `OUTCOMES_SALES`, otimização VALUE (mesma lógica — manter consistência de sinal) |
| Estrutura | CBO, **1 conjunto único** nesta wave (não 2 — ver nota de orçamento mínimo abaixo), público amplo |
| Propósito | Validar ângulos/ganchos novos ANTES de injetar na Campanha 1. Vencedor comprovado migra manualmente pra Campanha 1 |
| Orçamento | R\$200/dia |

**Criativo desta campanha** (os ângulos que a Campanha 1 ainda não cobre + os pedidos de "atração"):
- "Grana grátis pra entrar no grupo" → ângulo **Comunidade** (hook de baixa fricção, bom pra teste)
- Depoimento/prova de ganhador (se houver direito de imagem resolvido — decisão do founder, não minha) → ângulo **Prova**
- Variações de hook sobre o mesmo conceito de "rapidinha" → mede qual gancho dos 3 primeiros segundos performa melhor

Quando o budget total escalar (seção 7), **aí sim** desdobrar em 2 conjuntos de ângulo (protocolo 3:2:2 completo do Módulo 07).

### 2.3 Campanha 3 — Retargeting (Site) — R\$100/dia

| Config | Valor |
|---|---|
| Objetivo | `OUTCOMES_SALES`, otimização VALUE |
| Audiência | Custom Audience de **Website — visitantes 30 dias** (PageView) |
| **Pré-requisito a confirmar** | O Pixel precisa estar capturando `PageView` de verdade no site — confirmar no Events Manager antes de ativar (é diferente do `Purchase` que já validamos) |
| Exclusão | **Excluir** `audiencia_recompra_90dias.csv` (1.538 contatos ≥2 compras) — já são recorrentes, não vale pagar CAC de novo por eles aqui |
| Orçamento | R\$100/dia, 1 conjunto |

**Criativo desta campanha** (seu "fundo de funil"):
- App de estatísticas / benefício por ser cliente → ângulo **Prova** + retenção
- Remarketing direto de oferta ativa (a rapidinha do momento)

**Nota sobre "Clientes Desinteressados" (550.763 contatos):** não entra na Wave 1. Com R\$100/dia, usar essa base junto do retargeting de site dilui demais os dois públicos e nenhum sai do aprendizado. Fica pra uma campanha de reativação dedicada quando o orçamento total escalar (seção 7) — reativar base dormente pede mensagem própria ("sentimos sua falta", oferta de retorno), não dá pra misturar com retargeting de visita recente.

---

## 3. Matemática do orçamento mínimo (Módulo 01, seção 4.4)

```
Budget_mínimo/dia ≈ (50 / 7) × CPA_alvo
```

Não temos ainda o CPA real das campanhas atuais do cliente (sem histórico recente — ver seção 2). Usando o ticket médio por COMPRA individual (não por usuário) como proxy — `faturamento_total / compras_totais` = R\$9.569.598 / 164.561 ≈ **R\$58,16** — e a margem de contribuição por compra (R\$58,16 × 17,65% ≈ R\$10,27) como teto de CPA sustentável:

| Campanha | Orçamento/dia | CPA_alvo p/ sair do aprendizado em 7d |
|---|---|---|
| 1 — Advantage+ | R\$700 | até R\$98 |
| 2 — CBO Teste | R\$200 | até R\$28 |
| 3 — Retargeting | R\$100 | até R\$14 |

O nicho ajuda aqui: compra de bilhete é barata e frequente (o Módulo 01 seção 7.2 já observa isso), então é plausível que as 3 campanhas gerem os 50 eventos/semana necessários mesmo nesses orçamentos. Mas **isso é estimativa, não garantia** — se alguma campanha ficar em "Learning Limited" por mais de 7 dias, a ação é **consolidar** (reduzir pra 2 campanhas, não forçar as 3) antes de aumentar budget.

---

## 4. Checklist de pré-lançamento (cruzar com `dr-campaign-launch-checklist.md`)

Itens que **ainda bloqueiam** (ou merecem confirmação antes de escalar):

- [ ] **Confirmar dedup entre CAPI nativa da plataforma e nosso pipeline** (achado 2026-10-05, seção 9) — não impede subir campanha com volume baixo, mas impede automatizar `send_backlog.py` em agendamento contínuo até confirmar
- [ ] **Confirmar `PageView` sendo capturado pelo Pixel** — necessário só pra Campanha 3
- [ ] **Confirmar que as 3 audiências aparecem como Custom Audience selecionável** dentro da criação de conjunto (não só como "Clientes Existentes" da conta) — são coisas diferentes no Ads Manager
- [ ] Criar a Custom Audience de Lookalike 1-3% a partir de "Clientes Gerais" (ainda não existe — "Clientes Existentes" ≠ Lookalike)
- [ ] UTM aplicada em 100% das URLs de anúncio — direto no campo Website URL do Ads Manager (`utm-convention.md`, já pronto; não precisa do recurso "Links UTM" da plataforma pra isso, ver seção 11)
- [x] Criativos da Wave 1 selecionados — `creatives/campanha-1-advantage-vendas/` (4 vídeos + 1 foto, com título/descrição sugeridos). Falta só revisar copy final e subir no Ads Manager.
- [ ] **Business Verification no Business Manager** (achado 2026-10-05, seção 13) — desbloqueia otimização por VALOR, prioridade alta

**Não bloqueia, resolver em paralelo:** domínio verificado no Business Manager (relevância baixa agora — ver seção 10), parecer jurídico.

Itens já **resolvidos**: Pixel/Dataset, System User/token, conta de anúncio, CAPI validado com evento real (2026-10-04/05), 3 audiências carregadas na conta, age-gate 18+ na LP (confirmado 2026-10-05).

---

## 5. Produção de criativos — ordem de prioridade

| # | Ângulo (MBA) | Conteúdo (pedido do cliente) | Campanha | Formato sugerido |
|---|---|---|---|---|
| 1 | Confiança | Como funciona pra comprar / como funciona o resultado | 1 | UGC ou motion explicativo |
| 2 | Prêmio | Rapidinha — venda direta | 1 | Foto/vídeo direto, reaproveita o que já convertia |
| 3 | Acessibilidade | Bônus 1º depósito / 1ª compra | 1 | Estático ou motion curto |
| 4 | Comunidade | "Grana grátis" pra entrar no grupo | 2 (teste) | UGC Reels |
| 5 | Prova | App de estatísticas / benefício de cliente | 3 (retargeting) | Motion/captura de tela do app |

Confiança é o ângulo que o Módulo 01 (seção 7.3) chama de "mais valioso e mais negligenciado neste nicho" — priorizar a produção #1 mesmo que pareça menos chamativo que os de prêmio direto.

Taxonomia de nome (já em `utm-convention.md`): `{angulo}_{gancho}_{formato}_{AAAAMMDD}`.

---

## 6. UTM — reaproveitar o já definido

Ver `utm-convention.md` — todo anúncio das 3 campanhas leva os 4 parâmetros (`utm_source=meta`, `utm_medium=paid-social`, `utm_campaign`, `utm_content`, `utm_term`) via macros do Ads Manager. Isso resolve o achado do plano de 90 dias (0% de UTM histórico) a partir do primeiro anúncio desta wave.

---

## 7. Gatilho de evolução pra R\$2.000-3.000/dia

Não é uma data fixa — é condicionada a evidência (Módulo 12, decisão por CPA marginal):

1. Rodar R\$1.000/dia por **mínimo 7 dias corridos sem edição significativa** (fase de aprendizado, Módulo 03) — não mexer nos conjuntos nesse intervalo.
2. Calcular CPA marginal ao subir orçamento: `CPA_marginal = ΔGasto / ΔConversões`. Se `CPA_marginal <= CAC_máximo` → escalar 15-20% por janela de 48-72h (nunca dobrar de uma vez, Módulo 02 — choque de algoritmo).
3. Ao escalar, desdobrar a Campanha 2 nos 2 conjuntos de ângulo do protocolo 3:2:2 completo, e considerar uma 4ª campanha de reativação pra "Clientes Desinteressados" (550k) com mensagem própria.
4. Reconfirmar a meta de margem líquida com o cliente antes de passar de R\$2.500/dia (ver seção 1).

---

## 8. O que eu NÃO fiz (de propósito)

Não criei nenhuma campanha de verdade no Ads Manager — isso é execução com dinheiro real, fica pra você/operador (JP Queiroz) revisar e ativar manualmente, cruzando com o checklist da seção 4. Minha parte foi desenhar a estrutura, a matemática de orçamento e o plano de criativo a partir do que já documentamos.

---

## 9. Achado 2026-10-05 — a plataforma já tem CAPI nativa (muda a arquitetura de tracking)

O painel do site (`painel.imperiopremioss.com/dashboard/settings/analytics`) tem uma integração Facebook Pixel + Conversions API **nativa da plataforma Sorteamos**, separada do pipeline que construímos:

| | Nossa implementação | Nativa da plataforma |
|---|---|---|
| Pixel ID | 2276849516022676 | **mesmo ID** (2276849516022676) |
| Token CAPI | `META_IMPERIO_PREMIOS_ACCESS_TOKEN` (nosso .env) | Token próprio, cadastrado direto no painel |
| Regra de envio de `Purchase` | Todo pedido pago, sem condição | **Condicional**: "quando conter FBC e não for de campanhas de links bio/group/community/stories" |
| Cobertura | 100% dos pedidos pagos (inclusive os 68% "pixel sem clique") | Provavelmente só os com `fbc` — a fatia com clique confirmado (~24,5% do faturamento) |

**Isso muda duas coisas:**

1. **Nosso pipeline não é redundante** — se a regra nativa realmente exige `fbc`, ela não cobre a maior parte do volume (compra recorrente orgânica, sem clique). Nosso `collector.py`/`capi_client.py` segue sendo o jeito de garantir que *todo* pedido pago chegue ao Meta, não só o atribuído a clique.
2. **Risco de contagem duplicada não verificado.** Se as duas implementações mandam `Purchase` pro mesmo Pixel ID para o mesmo pedido com `event_id` diferentes, a Meta **não deduplica** e a conversão conta duas vezes — inflando artificialmente o ROAS que aparece no Ads Manager (e distorcendo o aprendizado do algoritmo, que é o oposto do que queremos).

**Ação antes de automatizar:** abrir Events Manager → Diagnostics (ou a aba de Deduplicação) e conferir, pra um pedido recente com `fbc`, se aparece como 1 evento deduplicado (bom) ou 2 eventos separados (duplicado). Até confirmar isso, **não deixe `send_backlog.py` rodando em agendamento automático** — usar só sob demanda/manual, como fizemos hoje (5 eventos de teste).

---

## 10. Domínio verificado — por que não é urgente

Relevância real do "Domain Verification" no Business Manager: define quem controla a configuração compartilhada de eventos quando mais de um negócio usa o mesmo domínio, e prioriza os 8 eventos de conversão usados no **Aggregated Event Measurement (AEM)** — que só entra em ação pra usuários **iOS 14.5+ com rastreamento limitado** (ATT recusado). Não afeta Pixel padrão, não afeta CAPI (o que já validamos funcionando), não afeta Android (que é provavelmente a maioria do público desse nicho, dado o perfil de ticket baixo e volume alto).

**Recomendação:** peça ao cliente pra configurar em paralelo (meta tags ou upload de arquivo no domínio — ele escolhe), sem travar nada. Só vira prioridade real se, mais pra frente, os dados mostrarem uma fatia relevante de conversão iOS.

---

## 11. UTM — usar o Ads Manager direto, não o "Links UTM" da plataforma

A plataforma tem um recurso próprio de **Links UTM** (`painel.imperiopremioss.com/dashboard/links`) — cria links com Título/Content/Source fixos (ex: "Hora do pix" → content=`horadopix`, source=`facebookads`). É útil pra **destinos fixos e reutilizados fora de anúncio individual** (o link do grupo/comunidade do "grana grátis", um link de broadcast de WhatsApp, etc.) — não pra UTM de cada anúncio.

**Pros anúncios das 3 campanhas da Wave 1: seguir só o `utm-convention.md`**, direto no campo "Website URL" de cada anúncio no Ads Manager, usando as macros dinâmicas (`{{campaign.name}}`, `{{ad.id}}` etc.) — não precisa criar nada no painel da plataforma pra isso. **Use o "Links UTM" da plataforma só para o link do grupo/comunidade do ângulo Comunidade** (Campanha 2) — aí sim um link fixo e reutilizável faz sentido, criar algo como Título "Grupo VIP Ads", Content `comunidade-ads`, Source `facebookads`.

**Nota sobre o toggle "Persistir UTMs por 24h"** (ligado): é a janela de atribuição *interna da plataforma* pras colunas `UTM_Source`/`UTM_Campaign` etc. que o nosso `client_api.py` já extrai — 24h é razoável e não precisa mexer.

---

## 12. Achado à parte — webhook quebrado (fora do nosso escopo, mas vale seu olhar)

Na mesma varredura, a página de Webhooks da plataforma mostra um webhook `order.paid` apontando pra `oraclwa-imperio-production.up.railway.app` com **1.083 falhas em 24h**. Não sei o que esse sistema faz (parece infra própria, talvez de WhatsApp/automação) e não mexi nele — é claramente de outro projeto/responsável. Só flagando porque 1.083 falhas em 24h é bastante coisa quebrando silenciosamente.

---

## 13. Achado 2026-10-05 — otimização por VALOR bloqueada em conta nova

Ao tentar selecionar "Maximizar o valor das conversões" no conjunto de anúncios, a opção aparece desabilitada com o aviso: *"Ad accounts owned by businesses new to Meta products can select value as the performance goal for their ads after several weeks of following our policies. If you don't want to wait, verify your business."*

Isso é um **lockout de conta nova**, não erro de configuração. Como o plano inteiro depende de otimizar por VALOR (dada a concentração de 85,3% do faturamento em 10% dos compradores — seção 2.1), **verificar o negócio no Business Manager é prioridade alta agora**, mais urgente que a verificação de domínio da seção 10:

- Ir em Configurações do Negócio → Informações da Empresa → Iniciar Verificação
- Geralmente pede CNPJ e documentos da empresa
- Até confirmar, a Campanha 1 roda com "Maximizar o número de conversões" (volume) — funcional, mas não é o que o plano recomenda. Trocar pra VALUE assim que desbloquear, sem precisar recriar a campanha.

**Ação:** iniciar a verificação do negócio hoje, se tiver os documentos à mão.
