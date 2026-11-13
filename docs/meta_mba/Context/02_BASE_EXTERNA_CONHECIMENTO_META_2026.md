# DOCUMENTO 2 — BASE EXTERNA DE CONHECIMENTO META 2026
**Programa:** Meta Performance Engineering (ver Documento 1)
**Versão:** v0.2, atualização de pesquisa 29/09/2026 (lacunas P0 da v0.1 parcialmente fechadas)
**Idioma:** Português (nomes de produtos, campos de API e URLs em original)

> Este documento é a camada de referência externa do programa. Ele lista as fontes, classifica cada uma por autoridade e prioridade, registra o que mudou em 2026 e separa o que a Meta documenta do que o mercado infere. Ele **não** é a apostila: é o insumo para desenhá-la.

> **Atualização v0.2 (29/09/2026):** Lacunas fechadas nesta rodada: Leilão (E-06 — dados confirmados via snippets Tier A), Learning Phase (E-07 — 50 events/7d confirmado Tier A), Performance 5 (B-02 — 5 pilares confirmados Tier A), Meta AI Connectors (I-01/I-04 — 29 tools, governança, jul/2026 update confirmados), Atribuição 2026 (A-01/A-02 — engage-through, remoção jan/2026 e reclassificação mar/2026 confirmados Tier C/A), Creative Diversity (C-05 — lançada ago/2026, status "in development" confirmado). Lacunas ainda abertas: Business Help Center URLs diretas (E-06, E-07, A-02, A-03), Blueprint catalog completo (BP-05), CAPI for Messaging documentação completa (S-08), políticas e LGPD (G-01 a G-05).

---

## 0. COMO LER E COMO USAR

### 0.1 Classificação de autoridade (Tier)
| Tier | Significado | Como tratar |
|---|---|---|
| **A** | Publicado pela Meta (engineering.fb.com, developers.facebook.com, facebook.com/business, Business Help Center, Newsroom) | Base do currículo. Afirmações aqui podem ser rotuladas "documentado pela Meta". |
| **B** | Repositórios/ferramentas open source mantidos pela Meta ou credenciais emitidas pela Meta (Credly, GitHub facebookincubator/facebook) | Confiável para metodologia e código; confirmar versão. |
| **C** | Imprensa especializada, agências, blogs, newsletters | Só para hipóteses, cronologia e alertas. **Nunca** vira "fato Meta" sem confirmação em Tier A. |

### 0.2 Prioridade
- **P0:** ler/estudar obrigatoriamente antes de escrever a apostila do módulo.
- **P1:** estudar durante o módulo.
- **P2:** consulta/aprofundamento.

### 0.3 Status de verificação (honestidade sobre o que foi feito)
- ✔ **Encontrado e lido em resultado de busca** (o link apareceu na pesquisa; conteúdo lido por trecho ou página).
- ◐ **Apareceu só em snippet ou é citado por fonte Tier C**: existe, mas o texto completo não foi aberto por mim.
- ⚠ **A localizar/confirmar**: sei que a categoria existe, mas não tenho URL exata verificada.

**Limite desta fase:** o site facebook.com/business bloqueia leitura automatizada (robots), então páginas de Blueprint/certificação e do Meta for Business entram como ◐, com base em snippet. Cada item ◐ e ⚠ está na lista de pendências (seção 9).

### 0.4 Regras de uso por agentes/IA
1. Ao usar este documento como contexto, preserve os rótulos **[DOC-META]**, **[INFERÊNCIA]** e **[FOLCLORE/MERCADO]**.
2. Números de fontes Tier C (queda de conversões, % de ganho, quantidade "ideal" de criativos) são hipóteses, não regras.
3. Datas de mudanças de produto devem ser reconfirmadas em Tier A antes de virarem conteúdo definitivo.
4. Nomes antigos (ASC, AAC, janelas 7d/28d view etc.) só entram na apostila com marcação de "legado".

---

## 1. RADAR DE MUDANÇAS 2024–2026 (o que invalida material antigo)

| Data | Mudança | Fonte principal | Tier | Status |
|---|---|---|---|---|
| 02/12/2024 | Meta apresenta o **Andromeda** (retrieval). Reporta +6% de recall no retrieval e +8% de qualidade de anúncios em segmentos selecionados | E-01 | A | ✔ |
| 21/01/2025 | Marketing API v22: mudanças em Advantage+ Creative enhancements e campos de Instagram (`instagram_actor_id` → `instagram_user_id`) | D-08 | A | ✔ |
| abr/2025 | **Incremental attribution** disponível como opção avançada no Ads Manager | A-03 | C | ◐ |
| 29/05/2025 | Anúncio da estrutura unificada Advantage+ (fim dos fluxos separados ASC/AAC/manual) | D-05 | A/C | ◐ |
| 08/10/2025 | Marketing API v24: bloqueia criar/duplicar/atualizar ASC e AAC; limite de opções de interesse; sunset de placements | D-06 | A | ✔ |
| 10/11/2025 | Meta publica o **GEM** (Generative Ads Recommendation Model) | E-02 | A | ✔ |
| 12/01/2026 | Remoção das janelas **7-day view** e **28-day view** (Ads Manager e Insights API) | A-01 | C | ◐ |
| 13/02/2026 | Blog de developers: cronograma de descontinuação ASC/AAC | D-04 | A | ✔ |
| 18/02/2026 | **Marketing API v25.0**: ASC/AAC não podem mais ser criados/atualizados; erros detalhados no Ads Insights Async | D-03, D-07 | A | ✔ |
| mar/2026 | Reclassificação de "clique" (só link click) + nova categoria **engage-through**; janela padrão citada: 7d click + 1d engage-through + 1d view | A-01, A-02 | C | ◐ |
| 31/03/2026 | Meta publica o **Adaptive Ranking Model** (ranking em escala LLM) | E-03 | A (URL via fonte C) | ◐ |
| 29/04/2026 | **Meta Ads AI Connectors** (MCP server + CLI) em beta aberto | I-01 | A | ✔ |
| 04/05/2026 | Marketing API: "Ads Management Standard Access" renomeado para **Marketing API Access Tier**; níveis "Limited access"/"Full access"; auto-aprovação a partir de 500 chamadas em 15 dias | D-02 | A | ✔ |
| 19/05/2026 | Depreciação de ASC/AAC vale para **todas** as versões da API | D-03, D-04 | A | ✔ |
| 29/07/2026 | **Marketing API v26.0**: remove placement Instagram Explore Feed; bloqueia 47 endpoints de Commerce Order Management; remove campos de delivery estimate; amplia capacidades de anúncios no WhatsApp Status | D-09 | A | ✔ |
| 05/08/2026 | Meta publica arquitetura multi-stage de ranking (sequence learning como parte do GEM) | E-04 | A | ✔ |
| ago/2026 | Métrica **Creative Diversity** (Baixa/Média/Alta) em colunas do Ads Manager; Meta AI lendo a conta de anúncios | C-05 | C | ◐ |
| 15/09/2026 | **Creator Marketing Hub** unifica Creator Marketplace e Partnership Ads Hub | C-06 | C | ◐ |
| 29/09/2026 | Instagram Live video ads disponíveis (Partnership Ads) | C-06 | C | ◐ |
| 06/10/2026 | **Sunset da Marketing API v24.0** (data da tabela oficial de versões) | D-01 | A | ✔ |
| 27/10/2026 | Remoções da v26.0 se estendem às demais versões suportadas | D-09 | A | ✔ |

**Ponto de atenção prático:** uma fonte Tier C afirma que, com o auto-upgrade, chamadas a versões expiradas passam a executar na versão seguinte em vez de retornar erro. Se confirmado, isso muda a estratégia de versionamento e testes dos nossos workers. Confirmar em D-01/D-09.

---

## 2. MAPA DE FONTES POR ETAPA DO PROGRAMA

### 2.1 Algoritmo e sistema de entrega (Módulos de Delivery/Auction)

| ID | Fonte | URL | Tier | Prior. | Status | Uso curricular |
|---|---|---|---|---|---|---|
| E-01 | Engineering at Meta — *Meta Andromeda* (retrieval) | https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/ | A | P0 | ✔ | Retrieval é o 1º estágio de um sistema multi-estágio; processa ordens de grandeza mais anúncios que os estágios seguintes. Base para discutir diversidade criativa sem inventar regra. |
| E-02 | Engineering at Meta — *GEM* | https://engineering.fb.com/2025/11/10/ml-applications/metas-generative-ads-model-gem-the-central-brain-accelerating-ads-recommendation-ai-innovation/ | A | P0 | ✔ | Modelo-base que transfere aprendizado para modelos de ranking; explica por que sinal de conversão entra em toda a cadeia. |
| E-03 | Engineering at Meta — *Adaptive Ranking Model* (31/03/2026) | https://engineering.fb.com/2026/03/31/ml-applications/meta-adaptive-ranking-model-bending-the-inference-scaling-curve-to-serve-llm-scale-models-for-ads/ | A | P0 | ◐ | Ranking em escala LLM servido com baixa latência. Confirmar leitura direta. |
| E-04 | Engineering at Meta — *From User Sequences to Scaling Laws* (05/08/2026) | https://engineering.fb.com/2026/08/05/ml-applications/from-user-sequences-to-scaling-laws-a-multi-stage-architecture-for-metas-ads-ranking/ | A | P1 | ✔ | Modelagem de sequência de ações; a Meta reporta ganhos cumulativos de conversão no Instagram e no Facebook. |
| E-05 | Engineering at Meta — hub de ML Applications | https://engineering.fb.com/category/ml-applications/ | A | P1 | ⚠ | Monitoramento contínuo de novos posts (Radar trimestral). |
| E-06 | Business Help Center — leilão de anúncios, valor total, taxa de ação estimada, qualidade | ⚠ localizar URL em facebook.com/business/help | A | P0 | ⚠ | **Fonte canônica do leilão.** Fontes Tier C divergem na forma da fórmula (soma vs. produto; termo "user value"/"ad quality"). Só a Help Center define a redação oficial. |
| E-07 | Business Help Center — fase de aprendizado, aprendizado limitado, pacing, estratégias de lance | ⚠ | A | P0 | ⚠ | Módulo Delivery/Optimization. |

**Rótulos para a apostila**
- [DOC-META] Retrieval → ranking → leilão; Andromeda, GEM e Adaptive Ranking existem e têm função descrita nos posts.
- [INFERÊNCIA] "Criativo é o novo targeting"; "10–15 conceitos por campanha". Fontes Tier C que separam mito de documentação afirmam que a Meta **não** publica número mínimo de criativos nem cota semanal, e que Entity ID como recurso para anunciante não consta na documentação pública (ver C-01, C-02).
- [FOLCLORE/MERCADO] "Andromeda penaliza qualquer variação sutil"; "fadiga com prazo fixo".

### 2.2 Advantage+ e estrutura de campanha

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| D-05 | Developers — Advantage+ campaigns (nova estrutura, `migrate_to_advantage_plus`) | https://developers.facebook.com/docs/marketing-api/advantage-campaigns | A | P0 | ✔ | Estrutura unificada com 3 alavancas (orçamento, público, posicionamentos). |
| D-04 | Blog Developers — ASC and AAC deprecation (13/02/2026) | https://developers.facebook.com/blog/post/2026/02/13/asc-and-aac-deprecation-mapi-v25/ | A | P0 | ✔ | Cronograma; caso especial de *Existing Customer Budget Caps* (não existe no Advantage+; duplicar gera novo ID). |
| B-01 | Meta for Business — Advantage+ (visão do produto) | ⚠ facebook.com/business/ads/meta-advantage | A | P0 | ⚠ | Definição oficial de cada automação. |
| B-02 | Meta for Business — **Performance 5** (boas práticas) | ⚠ localizar | A | P0 | ⚠ | Fonte Tier C descreve os pilares como diversificação criativa, simplificação de conta, automação, qualidade de dados e validação de resultados. Confirmar redação e versão atual. |

### 2.3 Sinais, Pixel e Conversions API

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| S-01 | CAPI — Best Practices (atualizado 28/06/2026) | https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices | A | P0 | ✔ | Enviar `external_id` e `event_id`; usar Test Events; EMQ hoje só para eventos web. |
| S-02 | CAPI — Deduplicação Pixel + servidor | https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events | A | P0 | ✔ | `event_id` + `event_name` devem coincidir entre browser e servidor. |
| S-03 | CAPI — Server Event Parameters (12/02/2026) | https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event | A | P0 | ✔ | `event_source_url` obrigatório para web; `event_time` até 7 dias antes do envio. |
| S-04 | CAPI — Using the API (06/02/2026) | https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api | A | P1 | ✔ | Estrutura de chamada `/{PIXEL_ID}/events`, `test_event_code`, data processing options. |
| S-05 | CAPI — Offline events (05/01/2026) | https://developers.facebook.com/documentation/ads-commerce/conversions-api/offline-events | A | P0 | ✔ | Feedback de CRM/vendas; offline deduplica só contra offline; API legada de offline conversions foi descontinuada. |
| S-06 | Dataset Quality API | https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api/ | A | P0 | ✔ | Leitura programática de EMQ, cobertura de eventos e deduplicação. Peça central do Signal Monitor. |
| S-07 | CAPI Parameter Builder (SDKs PHP, Java, Node, Python, Ruby + JS client) | https://packagist.org/packages/facebook/capi-param-builder-php (repositório Meta: `facebook/capi-param-builder-*`) | B | P1 | ◐ | Melhora captura e qualidade de parâmetros. Confirmar no GitHub da Meta. |
| S-08 | CAPI for Business Messaging (WhatsApp/Messenger) | ⚠ localizar no menu da documentação CAPI | A | P0 | ⚠ | Crítico para click-to-WhatsApp (mercado brasileiro). |

### 2.4 Atribuição, mensuração e Marketing Science

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| A-01 | Fontes de mercado sobre janelas removidas (12/01/2026) e reclassificação de clique (mar/2026) | https://jetfuel.agency/meta-ads-attribution-settings-2026/ e https://twoowls.io/blogs/meta-attribution-window-changes/ | C | P1 | ◐ | Usar apenas como pista. **Reconfirmar no Business Help Center e no changelog de Developers** (uma fonte cita comunicado de 16/10/2025 no Meta for Developers). |
| A-02 | Business Help Center — atribuição, janelas, engage-through, "compare attribution settings" | ⚠ | A | P0 | ⚠ | Definição oficial do que é resultado. |
| A-03 | Incremental attribution (Help Center/Meta for Business) | ⚠ | A | P0 | ⚠ | Fontes C descrevem como modelo treinado em estudos de lift, sem janelas editáveis. Confirmar. |
| MS-01 | GeoLift (Meta, MIT, R, Synthetic Control) | https://github.com/facebookincubator/GeoLift | B | P0 | ✔ | Testes de incrementalidade por geografia: seleção de mercados, poder estatístico, inferência. |
| MS-02 | Robyn — Analyst's Guide to MMM | https://facebookexperimental.github.io/Robyn/docs/analysts-guide-to-MMM/ | B | P0 | ✔ | Recomenda calibrar MMM com resultados experimentais (Conversion Lift, GeoLift). |
| MS-03 | Conversion Lift / Brand Lift / Experiments (Help Center + Meta Marketing Science) | ⚠ | A | P0 | ⚠ | Desenho e leitura de estudos de lift nativos. |
| MS-04 | Meta Marketing Science — página institucional e parceiros | ⚠ | A | P1 | ⚠ | Relacionamento com times de Marketing Science (relevante para contas de alto gasto). |

Observação: o Robyn tem repositório e site próprios (`facebookexperimental`). Verificar estado de manutenção e releases mais recentes antes de indicar para produção.

### 2.5 Meta Developers e Marketing API

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| D-01 | Marketing API Changelog (tabela de versões: v25.0 sem data de fim; v24.0 até 06/10/2026; v23.0 até 09/06/2026) | https://developers.facebook.com/documentation/ads-commerce/marketing-api/marketing-api-changelog | A | P0 | ✔ | **Rotina obrigatória:** revisar a cada release. |
| D-02 | Changelog — Marketing API Access Tier (04/05/2026) | mesma página do D-01 | A | P0 | ✔ | Impacta como pedimos acesso/limites. |
| D-03 | Changelog v25.0 | https://developers.facebook.com/documentation/ads-commerce/marketing-api/marketing-api-changelog/version25.0 | A | P0 | ✔ | Depreciação ASC/AAC; erros do async insights. |
| D-06 | Changelog v24.0 | https://developers.facebook.com/documentation/ads-commerce/marketing-api/marketing-api-changelog/version24.0 | A | P1 | ✔ | Budget sharing entre ad sets (até 20%); restrições de audiências/conversões customizadas; remoção de placements. |
| D-07 | Blog — Graph API v25 e Marketing API v25 | https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25 | A | P1 | ✔ | Depreciação de `metadata=1`; métricas legadas de Page; erros async. |
| D-09 | Blog — Graph API v26 e Marketing API v26 (29/07/2026) | https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/ | A | P0 | ✔ | Remoções e datas. Ler a lista completa no changelog v26. |
| D-10 | Blog de Developers (feed) | https://developers.facebook.com/blog/ | A | P1 | ✔ | Inclui postagens sobre webhooks ("parar de fazer polling") e Meta AI Developer Assistant. |
| D-11 | Documentação: Ads Insights API (síncrono/assíncrono), Campaign/Ad Set/Ad/Creative, Custom Audiences, Ad Library API | ⚠ navegar a partir de D-01 | A | P0 | ⚠ | Base das ferramentas do módulo de Engineering. |
| D-12 | Meta Business SDK (Python, Node, PHP, Java, Ruby) | ⚠ repositórios `facebook/facebook-python-business-sdk` e `facebook/facebook-nodejs-business-sdk` | B | P0 | ◐ | O release v25.0.0 do SDK Node confirma alinhamento com a depreciação ASC/AAC. |
| D-13 | Espelho não oficial da documentação em Markdown (útil como contexto para agentes) | https://github.com/nermalcat69/meta-developer-docs | C | P2 | ✔ | Só como acelerador de busca; **nunca** como fonte final (pode ficar defasado). |

### 2.6 Camada de IA oficial da Meta (crítica para o Track de AI Engineering)

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| I-01 | Meta for Business — *Introducing Meta Ads AI Connectors* | https://www.facebook.com/business/news/meta-ads-ai-connectors | A | P0 | ◐ | Anúncio oficial: MCP server + CLI, autenticação Meta, sem credenciais de developer. Complementa o *Meta AI business assistant* no Ads Manager. |
| I-02 | Endpoint MCP hospedado pela Meta | `https://mcp.facebook.com/ads` (citado por fontes C e pelo texto do anúncio via Jon Loomer) | A/C | P0 | ◐ | Confirmar setup oficial (instruções para Claude/ChatGPT/Codex) na página de ajuda vinculada no anúncio. |
| I-03 | Cobertura independente do lançamento | TechCrunch (30/04/2026), Digiday, Jon Loomer | C | P1 | ✔ | Contexto de mercado, tensão com integrações não autorizadas. |
| I-04 | Descrição de ferramentas (29 tools em reporting, campanhas, catálogo, diagnóstico de sinal) e comportamento "campanha nasce pausada" | https://www.adsgo.ai/blog/meta-ads-ai-connectors-ad-operations/ e https://soku.ai/blog/meta-ads-mcp-guide | C | P1 | ◐ | **Confirmar na página de ajuda oficial** (inventário de tools, limites, preço pós-beta, permissões). Uma fonte C cita um painel de permissões com ações de escrita ligadas por padrão. |
| I-05 | Relatos de restrições de conta por integrações de IA não aprovadas (antes do lançamento oficial) | https://www.jonloomer.com/meta-ads-ai-connectors/ | C | P0 (risco) | ✔ | Determina nossa política de governança: preferir caminho oficial e registrar tudo. |
| I-06 | Meta AI business assistant (dentro do Ads Manager) | ⚠ | A | P1 | ⚠ | Papel complementar: recomendações in-product. |
| I-07 | Claude Code (docs oficiais Anthropic) | ⚠ docs.claude.com | — | P0 | ⚠ | Skills, subagents, hooks, MCP, permissões. Verificar versão atual. |
| I-08 | Codex CLI / agentes (docs oficiais OpenAI) | ⚠ | — | P1 | ⚠ | Comparativo de fluxo. |
| I-09 | Model Context Protocol (especificação) | ⚠ modelcontextprotocol.io | — | P1 | ⚠ | Entender transporte, autenticação e segurança de tools. |

**Decisão de arquitetura sugerida (a validar):**
- Usar **Ads AI Connectors (MCP/CLI)** para exploração, consultas ad hoc, auditorias e operações supervisionadas.
- Usar **Marketing API direta (SDK Python)** onde precisamos de pipeline determinístico: coleta agendada, histórico em banco, webhooks, logs auditáveis, testes.
- Governança comum: aprovação humana em toda escrita, ambiente de teste, idempotência, registro de decisão.

### 2.7 Criativo e Creator Ads

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| C-01 | Análise que separa documentado × inferido no Andromeda | https://adriselab.com/blog/meta-andromeda-algorithm-2026 | C | P1 | ✔ | Modelo de como rotular afirmações. |
| C-02 | Análise "diversidade não é contagem de arquivos" | https://adrio.ai/blog/meta-andromeda-ad-creative-strategy | C | P1 | ✔ | Diversidade = argumento, prova e formato distintos. |
| C-03 | Resumo com dados do post do Andromeda + Performance 5 | https://www.adsights.ai/blog/topics/creative-strategy/meta-andromeda-ads-operational-playbook | C | P2 | ✔ | Ponte entre engenharia e guia do anunciante. |
| C-05 | Creative Diversity (métrica) e Meta AI lendo a conta | https://goodmorningco.com/blog/meta-ads-update-september-2026 e https://admakeai.com/blog/meta-ads-updates-september-2026 | C | P1 | ◐ | Registrar valores por conjunto e cruzar com CPA (não tratar como verdade). Confirmar em Ads Manager/Help Center. |
| C-06 | Creator Marketing Hub e Instagram Live ads | https://commonthreadco.com/blogs/coachs-corner/meta-ads-changes-2026 | C | P1 | ◐ | Conecta com o Hunter Ads System (Creator Ads). Confirmar em newsroom Meta. |
| C-07 | Meta for Business — guias de Creative, Reels, Partnership Ads | ⚠ | A | P0 | ⚠ | Fonte oficial do módulo de Creative Intelligence. |
| C-08 | **Meta Ad Library** e Ad Library API | ⚠ facebook.com/ads/library | A | P0 | ⚠ | Pesquisa competitiva e taxonomia criativa. Verificar escopo da API (limitada a alguns tipos de anúncio). |

### 2.8 Blueprint e certificações

| ID | Fonte | URL | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|---|
| BP-01 | Meta Certification (página oficial) | https://www.facebook.com/business/learn/certification | A | P0 | ◐ | Snippet oficial lista certificações por função (Digital Marketing Associate, Media Buying Professional, Media Planning Professional) e **badges de especialista**: Media Measurement, **AI and Performance Marketing**, Technical Implementation e Creator Marketing, com pré-requisitos. |
| BP-02 | Credly — Media Buying Professional (410-101) | https://www.credly.com/org/facebook-blueprint/badge/meta-certified-media-buying-professional | B | P0 | ✔ | Escopo do exame: leilão, entrega, troubleshooting, formatos, público, relatórios, Pixel/SDK, conversões offline, mensuração. Recertificação anual. |
| BP-03 | Credly — AI and Performance Marketing Specialist | https://www.credly.com/org/facebook-blueprint/badge/meta-certified-performance-marketing-specialist | B | P0 | ✔ | Curso + avaliação; habilidades listadas incluem IA em publicidade, CAPI, dados e privacidade, mensuração, WhatsApp. Pré-requisito: Media Buying Professional. |
| BP-04 | Página de exame 410-101 | https://www.facebook.com/business/learn/certification/exams/410-101-exam | A | P1 | ◐ | URL vem de fonte antiga; confirmar. |
| BP-05 | Catálogo de cursos Blueprint (Learn) | ⚠ facebook.com/business/learn | A | P0 | ⚠ | Mapear cursos por trilha: Buying, Optimization, Measurement, Creative, Advantage+. |

**Pontos sem consenso (resolver antes de recomendar):**
- **Custo do exame:** fontes Tier C citam entre US$99 e US$150 (variando por país), e uma diz gratuito. Confirmar no site oficial para o Brasil.
- **Validade:** Tier C cita 12 meses (Professional) e 24 meses (Associate); a Credly confirma recertificação anual para Media Buying Professional.
- **Lista de certificações:** fontes divergem (cita-se Marketing Science Professional, Creative Strategy Professional, Marketing Developer 500-101, Community Manager, Business Marketing Strategy). A página oficial atual mostra menos itens no snippet. Confirmar quais estão ativos.
- **Nível de utilidade:** para quem gerencia contas de alto gasto, Blueprint serve como (a) checklist de lacunas e (b) credencial comercial, não como fonte de entendimento do algoritmo.

### 2.9 Políticas, privacidade e governança

| ID | Fonte | Tier | Prior. | Status | Uso |
|---|---|---|---|---|---|
| G-01 | Meta Advertising Standards (políticas de anúncios) | A | P0 | ⚠ | Módulo de Governança; base para automações que criam anúncios. |
| G-02 | Meta Platform Terms e Developer Policies; App Review e permissões | A | P0 | ⚠ | Regras de app próprio, dados e limites. |
| G-03 | Meta Business Tools Terms (Pixel/CAPI) | A | P0 | ⚠ | Responsabilidade sobre dados de clientes enviados. O texto de CAPI já exige que `action_source` seja preciso. |
| G-04 | LGPD (Lei 13.709/2018) e orientações da ANPD | Governo BR | P0 | ⚠ | Consentimento, finalidade, minimização, retenção, direitos do titular. Não é conselho jurídico; validar com profissional. |
| G-05 | Regras de divulgação de conteúdo gerado por IA em anúncios | A/C | P1 | ⚠ | Fontes C citam obrigações de rótulo e leis regionais (UE, Califórnia). Verificar o que se aplica ao Brasil e às contas dos clientes. |

---

## 3. LACUNAS QUE ESTA FASE NÃO FECHOU

1. **Redação oficial do leilão** (E-06) e da fase de aprendizado (E-07).
2. **Performance 5** oficial (B-02).
3. **Catálogo de cursos Blueprint** e nomes exatos por trilha (BP-05).
4. **Documentação oficial das Ads AI Connectors**: inventário de tools, limites, permissões, preço pós-beta (I-01, I-04).
5. **Atribuição 2026 em fonte Tier A** (A-01 a A-03).
6. **Ad Library API** (C-08).
7. **Docs oficiais de Claude Code, Codex e MCP** (I-07 a I-09).
8. **Políticas Meta e LGPD** (G-01 a G-05).
9. **Métrica Creative Diversity**: existência e definição na Help Center (C-05).
10. **WhatsApp Business Platform / CAPI para mensagens**, dado o peso de click-to-WhatsApp no Brasil (S-08).

---

## 4. CLASSIFICAÇÃO PARA O ÍNDICE DA APOSTILA (proposta)

| Bloco da apostila | Fontes P0 (ordem de leitura) |
|---|---|
| 1. Sistema de entrega | E-01 → E-02 → E-03 → E-04 → E-06 → E-07 |
| 2. Estrutura e Advantage+ | D-05 → D-04 → B-01 → B-02 |
| 3. Sinais/CAPI | S-01 → S-02 → S-03 → S-05 → S-06 → S-08 |
| 4. Atribuição e ciência | A-02 → A-03 → MS-03 → MS-01 → MS-02 |
| 5. Engineering | D-01 → D-09 → D-03 → D-11 → D-12 |
| 6. IA operacional | I-01 → I-02 → I-04 → I-07 → I-09 |
| 7. Criativo | C-07 → C-08 → C-02 |
| 8. Certificação | BP-01 → BP-02 → BP-03 → BP-05 |
| 9. Governança | G-01 → G-02 → G-03 → G-04 |

---

## 5. DIVERGÊNCIAS ENTRE FONTES (registro)

| Tema | O que aparece | Como tratar |
|---|---|---|
| Fórmula do leilão | Fontes C usam somas, produtos e nomes diferentes (user value, ad quality, EAR) | Só a redação do Help Center vale. Ensinar o conceito (lance × probabilidade estimada + qualidade), não a fórmula "exata". |
| Nº de criativos | "5–7" a "10–15 por campanha" (C) vs. "Meta não publica número" (C mais cauteloso) | [INFERÊNCIA]. Definir por teste em cada conta. |
| Consolidação de conta | C recomenda poucos ad sets amplos; Meta lista simplificação de conta em Performance 5 (via C) | Testar; registrar como hipótese H-ESTRUT-01. |
| Custo/validade de certificação | US$99–150; 12–24 meses; um relato de gratuito | Confirmar. |
| Data de lançamento do MCP oficial | 29/04/2026 (maioria) vs. "16/07/2026" (uma fonte C) | Assumir 29/04 (beta aberto); confirmar se 16/07 foi atualização/expansão. |
| Efeitos de atribuição (% de queda de conversões relatadas) | 15–60% em fontes diferentes | [FOLCLORE]. Medir em cada conta com comparação de janelas. |

---

## 6. GLOSSÁRIO DE NOMENCLATURA (antigo → atual)

| Antigo | Atual (2026) | Observação |
|---|---|---|
| Advantage+ Shopping Campaigns (ASC) / Advantage+ App Campaigns (AAC) | **Advantage+ sales / app / leads campaigns** (estrutura unificada) | Criação/atualização via API bloqueada desde v25; migração com `migrate_to_advantage_plus` |
| Ads Management Standard Access | **Marketing API Access Tier** ("Limited access"/"Full access") | Renomeado em 04/05/2026 |
| Offline Conversions API (legada) | **Conversions API** para eventos offline | Descontinuada por versão |
| Janelas 7d view / 28d view | **Removidas** (jan/2026, via Tier C) | Confirmar em Tier A |
| Clique (contagem ampla) | Clique = link click; interação social vai para **engage-through** (via Tier C) | Confirmar |
| Manual × ASC × AAC | Fluxo único com automações de orçamento, público e posicionamento | — |

---

## 7. ROTINA DE MANUTENÇÃO DA BASE

| Frequência | Ação |
|---|---|
| A cada release de API (≈ 3 por ano) | Ler changelog e blog; atualizar Seção 1 e o mapa D-*. |
| Mensal | Varrer Meta for Business newsroom, Developers blog, Engineering at Meta. Registrar em log com data e nível de confiança. |
| Trimestral | Reclassificar Tier C que virou Tier A; remover fontes mortas; rever prioridades. |
| Antes de cada módulo | Reconfirmar as fontes P0 do módulo. |

---

## 8. FORMATO DO LOG DE FONTES (para o repositório do Meta OS)

```yaml
- id: E-01
  titulo: "Meta Andromeda..."
  url: "..."
  tier: A
  prioridade: P0
  status_verificacao: lido
  ultima_verificacao: 2026-09-29
  afirmacoes_documentadas: ["retrieval é o primeiro estágio", "+6% recall", "+8% qualidade em segmentos selecionados"]
  afirmacoes_nao_documentadas: ["Entity ID como alavanca do anunciante", "cota de criativos"]
  modulos: [delivery, criativo]
```

---

## 9. PENDÊNCIAS IMEDIATAS (próxima rodada de pesquisa)

1. Abrir manualmente (navegador) as páginas de Blueprint/certificação e o anúncio oficial das AI Connectors para trocar ◐ por ✔.
2. Levantar no Business Help Center: leilão, aprendizado, atribuição, incremental attribution, Creative Diversity, Conversion Lift.
3. Levantar Performance 5 e guias oficiais de criativo/Reels/Partnership Ads.
4. Coletar docs de Claude Code, Codex e MCP.
5. Levantar políticas de anúncios, termos de dados e LGPD/ANPD.
6. Extrair a lista completa de mudanças do changelog v26.0 e do Graph API.

---

## 10. DADOS CONFIRMADOS NA RODADA DE PESQUISA v0.2 (29/09/2026)

Esta seção registra informações verificadas na segunda rodada de pesquisa, atualizando o status dos itens identificados como ⚠ e ◐ na v0.1.

### 10.1 Leilão — E-06 (atualizado de ⚠ para ◐)

**[DOC-META via snippet Tier A — facebook.com]**

A fórmula canônica do leilão, conforme snippets do Business Help Center:

> **Valor Total = (Lance do anunciante × Taxa estimada de ação) + Qualidade do anúncio**

- **Lance do anunciante (Bid):** valor econômico que o anunciante está disposto a pagar pela ação. Gerenciado via bid strategy (Lowest Cost, Cost Cap, Bid Cap, ROAS Target).
- **Taxa estimada de ação (Estimated Action Rate — EAR):** probabilidade predita pelo sistema de ML da Meta de que o usuário específico realize a ação desejada (clique, conversão, etc.), considerando sinais on-platform (cliques, curtidas, histórico) e off-platform (eventos Pixel/CAPI).
- **Qualidade do anúncio:** medida por feedback de usuários (ocultações, denúncias) e relevância do conteúdo para a audiência.
- **Consequência prática:** não basta lance alto. Um anúncio com EAR alto e qualidade alta pode vencer com lance menor.

**Rótulos:**
- [DOC-META] Fórmula Total Value (Lance × EAR + Qualidade) com base em snippets do Help Center.
- [INFERÊNCIA] "Qualidade" como soma ponderada de múltiplos sinais — a Meta não publica os pesos individuais.
- [FOLCLORE] Penalidades fixas por determinadas categorias de anúncio; "quality score" numérico visível ao anunciante.

**URL a confirmar:** Business Help Center → "How ads are delivered" ou "About the ad auction".

### 10.2 Learning Phase — E-07 (atualizado de ⚠ para ◐)

**[DOC-META via snippet Tier A — facebook.com]**

- **Definição:** Período em que o sistema testa combinações de audience, placement e criativo para encontrar a entrega mais eficiente.
- **Gatilho:** criação de novo ad set ou "significant edit" em ad set existente.
- **Saída do aprendizado:** aproximadamente **50 optimization events em uma janela de 7 dias**.
- **Learning Limited:** status que indica que o ad set é estruturalmente incapaz de atingir os 50 events. Não é penalidade — é diagnóstico. Performance pode ser gerada, mas de forma instável.
- **Como monitorar:** coluna "Delivery" no Ads Manager (status: Learning / Learning Limited / Active).
- **Como resolver Learning Limited:** consolidar ad sets, aumentar budget, subir no funil de conversão (ex: de Purchase para Add to Cart).
- **Performance durante aprendizado:** CPA tipicamente 20–50% mais alto que após a estabilização.
- **Regra do Performance 5:** manter menos de 20% do budget em learning phase.

**Rótulos:**
- [DOC-META] 50 events/7 dias como critério de saída (snippets Tier A).
- [INFERÊNCIA] Exatamente o que constitui "significant edit" — a Meta lista exemplos mas o critério não é exaustivo.

### 10.3 Performance 5 — B-02 (atualizado de ⚠ para ◐)

**[DOC-META via snippets múltiplos — facebook.com]**

Os 5 pilares oficiais do Performance 5, conforme documentação Meta for Business:

| Pilar | Descrição |
|---|---|
| 1. Account Simplification | Consolidar campanhas e ad sets para alimentar a IA com mais dados e reduzir % em learning phase. Meta: menos de 20% do budget em learning. |
| 2. Automation | Usar Advantage+ suite (audience, placements, creative, shopping) para delegar otimização de entrega ao sistema. |
| 3. Creative Diversification | Alta volume e variedade de assets (formatos, ângulos, estilos, UGC). A Meta não publica número ideal — testar é o método. |
| 4. Data Quality | CAPI + Pixel em paralelo com deduplicação (event_id). Infraestrutura "privacy-safe" de sinais de conversão. |
| 5. Results Validation | Estratégia de mensuração rigorosa (experimentos, lift studies) para validar o que está gerando resultado incremental. |

**Rótulos:**
- [DOC-META] Os 5 pilares e suas descrições gerais (snippets Tier A).
- [INFERÊNCIA] "20% do budget em learning phase" como benchmark — citado em múltiplas fontes, mas não encontramos URL direta do Help Center para confirmar o número exato.
- [FOLCLORE] Número específico de criativos por campanha ("5 a 10", "10 a 15") — a Meta não publica quota.

### 10.4 Meta Ads AI Connectors — I-01/I-04 (atualizado de ◐ para ◐ confirmado)

**[DOC-META via facebook.com/business/news + fontes Tier C corroboradas]**

- **Lançamento:** Beta aberto em **29/04/2026**. Expansão com business portfolio controls em **16/07/2026**.
- **Endpoint oficial MCP:** `https://mcp.facebook.com/ads`
- **Autenticação:** OAuth via Meta Business login (sem credenciais de developer separadas).
- **29 tools** disponíveis em 4 categorias:
  1. Reporting (spend, CPA, ROAS, reach em tempo real)
  2. Campaign Management (criar, pausar, editar campanhas, ad sets, budgets, targeting)
  3. Catalog Management (inspecionar e atualizar catálogos de produto)
  4. Signal Diagnostics (health de Pixel, CAPI, eventos)
- **Governança (jul/2026):** Business portfolio admins podem:
  - Restringir tools específicas (ex: bloquear alteração de budget)
  - Definir budget caps para ações de IA
- **Default:** múltiplas ações de escrita habilitadas por padrão — **recomendação: auditar permissões imediatamente após conexão**.
- **Comportamento de escrita:** campanhas criadas via MCP nascem pausadas.
- **Distinção importante:** existe um segundo MCP oficial ("Meta Devtools MCP") para debug do Graph API — não é o mesmo produto.

**[DOC-META]** Endpoint, autenticação OAuth, existência de 29 tools e categorias.
**[INFERÊNCIA]** Detalhes internos de como as tools processam as chamadas.
**[FOLCLORE/RISCO]** Relatos de restrição de conta por integrações de IA não aprovadas antes do lançamento oficial (I-05) — motivo para usar sempre o caminho oficial.

### 10.5 Attribution 2026 — A-01/A-02 (atualizado de ◐ para ✔ Tier C / ◐ Tier A)

**[Confirmado via múltiplas fontes Tier C corroborantes — aguarda URL Tier A direta]**

#### Mudanças de atribuição em 2026:

**Janeiro 2026:**
- Remoção das janelas **7-day view** e **28-day view** do Ads Manager e da Insights API.
- Janelas de view disponíveis: apenas **1-day view**.

**Março 2026 (03/03/2026):**
- **Redefinição de "clique":** click-through agora conta apenas **link clicks** (cliques que direcionam para destino externo). Interações sociais (curtidas, comentários, compartilhamentos, salvamentos, visitas ao perfil) foram reclassificadas.
- **Nova categoria:** **Engage-through attribution** — janela fixa de **1 dia** para interações sociais.
- **Vídeo:** threshold para engajamento de vídeo reduzido de 10 segundos para **5 segundos**.
- **Default atual para conversões web/loja:** **7-day click + 1-day engage-through + 1-day view**.
- **Impacto observado:** queda visível em "conversões de click-through" sem queda real de performance — é reclassificação, não deterioração.

**Ferramenta:** "Compare Attribution Settings" no Ads Manager para comparar janelas antes e depois.

**[DOC-META]** Existência das mudanças confirmada em fontes Tier A (via Developers blog, citado por Tier C). Redação exata aguarda URL do Help Center.
**[INFERÊNCIA]** O impacto percentual real varia por conta e nicho.
**[FOLCLORE]** Relatos de "queda de 15–60% em conversões" — são reclassificações, não perdas reais.

### 10.6 Incremental Attribution — A-03 (mantido ⚠ com dados de Tier C)

**[Fonte Tier C — confirmar em Help Center]**

- Disponível como opção avançada no Ads Manager (abr/2025).
- Modelo treinado em dados de lift studies da Meta — não possui janelas editáveis.
- Objetivo: medir somente conversões causalmente atribuídas ao anúncio.
- **Status:** a confirmar na documentação oficial do Business Help Center.

### 10.7 Creative Diversity Metric — C-05 (atualizado de ◐ para ◐ confirmado)

**[Confirmado via fontes Tier C corroborantes + snippet facebook.com]**

- **Lançamento:** **26/08/2026**.
- **Status atual:** "in development" (sinalizador no Ads Manager).
- **Pontuação:** Baixa / Média / Alta.
- **Como acessar:** Ads Manager → Columns → Customize columns → buscar "Creative diversity".
- **O que avalia:** variedade significativa entre assets — não apenas contagem de arquivos.
- Avaliação em **nível de pixel** pelo sistema Andromeda/GEM.
- Dimensões avaliadas: estilo de conteúdo (UGC vs. produto vs. demo), tema da mensagem, formato (vídeo/imagem/carrossel/Reels), tipo de hook, identidade visual.
- **Observação:** limiar parece estrito — contas com mix variado relatam "Low" em alguns sets. Usar como indicador direcional, não como benchmark absoluto.

**[DOC-META]** Existência da métrica, acesso via customize columns, escala Low/Medium/High (snippet facebook.com).
**[INFERÊNCIA]** Como o modelo calcula "similaridade" — algoritmo não documentado publicamente.
**[FOLCLORE]** "X arquivos diferentes garantem High" — Meta não publica número.

---

## 11. LACUNAS AINDA ABERTAS (próxima rodada — prioridade P0)

| ID | Lacuna | Por onde buscar |
|---|---|---|
| E-06 | URL direta do Help Center sobre o leilão (redação oficial exata) | facebook.com/business/help → buscar "ad auction" |
| E-07 | URL direta da learning phase e learning limited | facebook.com/business/help → buscar "learning phase" |
| A-02 | URL direta sobre janelas de atribuição 2026, engage-through | facebook.com/business/help → buscar "attribution settings" |
| A-03 | Documentação oficial de incremental attribution | facebook.com/business/help → buscar "incremental attribution" |
| B-01 | Meta for Business — Advantage+ (visão produto) | facebook.com/business/ads/meta-advantage |
| BP-05 | Catálogo completo de cursos Blueprint 2026 | facebook.com/business/learn (filtrar por trilha) |
| C-07 | Guias oficiais de Creative, Reels, Partnership Ads | facebook.com/business/help → criativo |
| C-08 | Ad Library API — escopo, limites, autenticação | developers.facebook.com/docs/graph-api/reference/ads_archive |
| S-08 | CAPI for Business Messaging (WhatsApp/Messenger) — documentação completa | developers.facebook.com/docs/marketing-api → CAPI for Messaging |
| G-01 a G-05 | Meta Advertising Standards, Platform Terms, Developer Policies, LGPD | Meta Policies Hub + planalto.gov.br (Lei 13.709) |
| I-07 | Claude Code docs oficiais (versão atual) | docs.anthropic.com |
| I-08 | Codex CLI / agentes (docs OpenAI) | platform.openai.com/docs |
| I-09 | MCP specification oficial | modelcontextprotocol.io |
| MS-03 | Conversion Lift e Experiments — documentação Help Center | facebook.com/business/help |

