# 📦 Documentação Completa dos Squads Virals

**Versão:** 1.0.0
**Atualizado em:** 2 de Março de 2026
**Responsável:** @architect (Aria)

---

> **Virals** é uma empresa especializada em transformar marcas D2C/DNVB em fenômenos virais através de Creators, Narrativas de Alta Conversão e Tráfego de Performance. Este documento cataloga todo o arsenal operacional dos 4 squads que compõem o motor de execução da empresa.

---

## 📑 Índice

1. [Visão Estratégica Virals](#visão-estratégica-virals)
2. [Arquitetura dos Squads](#arquitetura-dos-squads)
3. [🎯 Marketing Squad](#-virals-marketing-squad)
4. [⚙️ OPS Squad](#️-virals-ops-squad)
5. [💰 Vendas Squad](#-virals-vendas-squad)
6. [🚀 Produto Squad](#-virals-produto-squad)
7. [Interconexões Cross-Squad](#interconexões-cross-squad)
8. [Integração com Agentes AIOS Nativos](#integração-com-agentes-aios-nativos)
9. [Integração ClickUp](#integração-clickup)
10. [Referência Rápida](#referência-rápida)

---

## Visão Estratégica Virals

### Propósito
Democratizar as estratégias de viralização de marcas milionárias para marcas D2C/DNVB de alto potencial.

### Os 3 Diferenciais (Three Uniques)
| # | Diferencial | Descrição |
|---|------------|-----------|
| 1 | **Hunter Ads System** | Creators como canal de aquisição escalável (CAC 60% menor) |
| 2 | **Copy Viral Framework** | Narrativas de 7 pilares baseadas em benchmark profundo |
| 3 | **Traffic Performance Protocol** | Gestão obsessiva de ROAS integrada aos creators |

### ICP (Ideal Customer Profile)
- **Tipo:** Marcas D2C/DNVB
- **Faturamento:** R$ 30k – R$ 2M/mês
- **Estágio:** PMF alcançado, investem em mídia
- **Nichos:** Health, Beauty, Fitness, Lifestyle
- **Ticket Médio:** R$ 150 – R$ 500

### Rocks Q1 2026
1. Fechar os 3 primeiros clientes pilotos (Plano Starter)
2. Finalizar Setup do Hunter Ads System, Copy Viral Framework e Traffic Performance Protocol
3. Documentar 20% dos processos (POPs) que geram 80% do resultado
4. Validar a Big Idea da Virals no mercado (Ads Próprio)

---

## Arquitetura dos Squads

Cada squad segue uma **estrutura padronizada** gerada pelo `@squad-creator`:

```
squads/{squad-name}/
├── squad.yaml          # Configuração central (agentes, tasks, workflows, integrations)
├── README.md           # Documentação do squad
├── agents/             # Personas completas dos agentes (.md)
├── tasks/              # Workflows executáveis atômicos (.md)
├── workflows/          # Ciclos multi-fase coordenados (.yaml)
├── checklists/         # Quality gates de verificação (.md)
├── templates/          # Documentos-base padronizados (.md)
├── config/             # Configurações específicas (opcional)
├── data/               # Dados de referência (opcional)
├── scripts/            # Automações (opcional)
└── tools/              # Ferramentas específicas (opcional)
```

### Quantitativos

| Squad | Agentes | Tasks | Workflows | Checklists | Templates |
|-------|---------|-------|-----------|------------|-----------|
| 🎯 Marketing | 7 | 13 | 5 | 5 | 6 |
| ⚙️ OPS | 5 | 10 | 4 | 4 | 5 |
| 💰 Vendas | 5 | 13 | 5 | 5 | 6 |
| 🚀 Produto | 5 | 14 | 5 | 5 | 6 |
| **Total** | **22** | **50** | **19** | **19** | **23** |

---

## 🎯 Virals Marketing Squad

**ID:** `virals-marketing-squad`
**Ícone:** 🎯 | **Cor:** `#16A34A` (Verde)
**Tipo:** Growth
**Descrição:** Squad de marketing responsável por conteúdo viral, copy de alta conversão, SEO e gestão dual de tráfego pago (direct response + brand/funil).

### Agentes

| Agente | Persona | ID | Especialidade | Framework Base |
|--------|---------|-----|---------------|----------------|
| 🎬 Jimmy | MrBeast | `mrbeast-mk` | Conteúdo Viral e Retenção de Audiência | Engenharia de Atenção: Thumbnail/Título → Hook 3-30s → Open Loops → Trigger de Compartilhamento |
| 📱 Gary | Vaynerchuk | `garyvee-mk` | Estratégia de Marca e Presença Social | Documentar > Criar; distribuição multiplataforma |
| ✍️ Paulo | Ladeira | `ladeira` | Copywriter Master BR | Copy de alta conversão, Big Ideas, narrativas persuasivas |
| 🎥 Georg | Georgi | `georgi` | VSLs e Scripts de Vídeo | Roteiros de VSL, storyboards, scripts de hook a CTA |
| 🔍 Rand | Fishkin | `fishkin-mk` | SEO e Orgânico | Auditoria SEO, tráfego orgânico, autoridade de domínio |
| 🎯 Perry | Marshall | `perry-marshall` | Tráfego Direct Response (Sniper do ROI) | Princípio 80/20, CPA máximo, otimização diária, escala de budget |
| 🌊 Ezra | Firestone | `ezra-firestone` | Funil e Tráfego Brand | Construção de audiência, nurturing por cohort, funil topo→fundo |

### Tasks

#### Conteúdo & Viral
| Task | Agente | Descrição |
|------|--------|-----------|
| `mrbeast-viral-framework` | @mrbeast-mk | Aplicar framework de engenharia de atenção para criar/auditar conceito de conteúdo |
| `garyvee-content-calendar` | @garyvee-mk | Criar calendário de conteúdo multiplataforma |

#### Copy & Conversão
| Task | Agente | Descrição |
|------|--------|-----------|
| `ladeira-copy-create` | @ladeira | Criar copy de alta conversão para anúncios e landing pages |
| `georgi-vsl-write` | @georgi | Escrever roteiro de VSL completo (hook → história → CTA) |

#### SEO & Orgânico
| Task | Agente | Descrição |
|------|--------|-----------|
| `fishkin-seo-audit` | @fishkin-mk | Auditoria completa de SEO on-page, off-page e técnico |

#### Tráfego Direct Response
| Task | Agente | Descrição |
|------|--------|-----------|
| `perry-dr-campaign-create` | @perry-marshall | Lançar campanha DR (Meta/Google) com princípio 80/20 para maximizar ROAS. Calcula CPA máximo, define audiência, configura tracking |
| `perry-dr-campaign-scale` | @perry-marshall | Escalar campanha validada (+20-30% budget por ciclo) monitorando saturação |
| `perry-dr-autonomous-optimize` | @perry-marshall | Otimização autônoma diária: pausar underperformers, realocar budget, testar novos criativos |

#### Tráfego Brand/Funil
| Task | Agente | Descrição |
|------|--------|-----------|
| `ezra-funnel-build` | @ezra-firestone | Estruturar funil completo de nutrição (topo, meio, fundo) com retargeting por cohort |
| `ezra-brand-campaign-create` | @ezra-firestone | Criar campanhas de brand awareness para construção de audiência |
| `ezra-audience-architecture` | @ezra-firestone | Arquitetar audiências por temperatura (fria, morna, quente) |
| `ezra-autonomous-optimize` | @ezra-firestone | Otimização autônoma de campanhas de brand e funil |

#### Integração
| Task | Agente | Descrição |
|------|--------|-----------|
| `traffic-performance-review` | @perry + @ezra | Revisão conjunta de performance de tráfego (DR + Brand) |

### Workflows

#### 1. `viral-content-pipeline` — Pipeline de Conteúdo Viral
- **Tipo:** Contínuo
- **Coordenador:** @mrbeast-mk
- **Fluxo:** Ideação → Criação de hooks → Produção → Publicação → Análise de performance

#### 2. `dr-campaign-lifecycle` — Ciclo de Vida da Campanha DR
- **Tipo:** Por demanda
- **Coordenador:** @perry-marshall
- **Fases:**
  1. **Briefing** — Receber objetivo (CPA, budget), briefar @ladeira e @mrbeast para criativos
  2. **Produção** — @ladeira cria copy, @mrbeast cria visuais → Gate: criativos aprovados
  3. **Lançamento** — Subir campanha com budget de teste, otimização autônoma diária
  4. **Escala** — Escalar +20-30%, monitorar saturação → Gate: CPA > meta + 30% por 5 dias = suspender

#### 3. `brand-funnel-lifecycle` — Ciclo de Vida Brand & Funil
- **Tipo:** Contínuo
- **Coordenador:** @ezra-firestone
- **Fases:**
  1. **Construção permanente** — Campanhas de topo de funil + boosting de conteúdo orgânico
  2. **Aquecimento pré-lançamento** — Intensificar retargeting de meio de funil, capturar leads
  3. **Lançamento coordenado** — @ezra reduz + @perry assume; fornecer audiência quente para conversão
  4. **Pós-lançamento** — Análise de cohort, refinamento de audiências, novo ciclo

#### 4. `weekly-marketing-review` — Revisão Semanal de Marketing
- **Tipo:** Recorrente (semanal)
- **Fluxo:** Consolidar métricas de todos os canais, identificar winners/losers, decidir realocações

#### 5. `launch-traffic-coordination` — Coordenação de Tráfego para Lançamento
- **Tipo:** Por demanda
- **Coordenadores:** @perry (operação) + @ezra (audiência)
- **Integração:** Conecta com `launch-orchestration` do OPS squad
- **Timeline de 8 semanas:**
  - **Sem 1-4:** @ezra lidera — 90% brand / 10% DR — construir audiência
  - **Sem 5-6:** @ezra lidera — 80% brand / 20% DR — nutrir com conteúdo profundo
  - **Sem 7:** Transição — 60% brand / 40% DR — teste de copy DR com audiência quente
  - **Sem 8:** @perry lidera — 20% brand / 80% DR — maximizar conversão
  - **Pós:** @ezra retoma — post-mortem de atribuição, refinamento, novo ciclo

### Checklists

| Checklist | Uso |
|-----------|-----|
| `dr-campaign-launch-checklist` | Validação completa antes de subir campanha DR (oferta, criativos, config, monitoramento) |
| `brand-campaign-launch-checklist` | Validação de campanha de brand/funil |
| `copy-review-checklist` | Revisão de qualidade de copy antes de publicação |
| `content-publish-checklist` | Gate de publicação de conteúdo em qualquer canal |
| `weekly-traffic-health-checklist` | Saúde semanal do tráfego (CPM, CPA, ROAS, frequência) |

### Templates

| Template | Uso |
|----------|-----|
| `dr-campaign-brief-template` | Brief completo de campanha DR (objetivo, audiência, oferta, brief de copy/criativo, parâmetros de autonomia) |
| `brand-campaign-brief-template` | Brief de campanha de brand awareness |
| `vsl-template` | Estrutura de VSL (Video Sales Letter) |
| `email-sequence-template` | Sequência de emails para funil/lançamento |
| `content-calendar-template` | Calendário editorial multiplataforma |
| `traffic-report-template` | Relatório consolidado de performance de tráfego |

---

## ⚙️ Virals OPS Squad

**ID:** `virals-ops-squad`
**Ícone:** ⚙️ | **Cor:** `#1A4A8A` (Azul corporativo)
**Tipo:** Operational
**Descrição:** Squad operacional responsável pelos sistemas, processos, métricas e orquestração de lançamentos. Baseado nos frameworks EOS/Traction, Princípios Dalio, Analytics Kaushik, Alavancagem Hormozi e Product Launch Formula Walker.

### Agentes

| Agente | Persona | ID | Especialidade | Framework Base |
|--------|---------|-----|---------------|----------------|
| 📐 Ray | Dalio | `dalio` | Princípios e Sistemas de Decisão | Princípios → Transparência Radical → Loop (Metas → Problemas → Diagnóstico → Design → Execução) |
| ⚙️ Gino | Wickman | `wickman` | EOS/Traction | V/TO, Rocks trimestrais, L10, Scorecard, POPs com SemVer |
| 📊 Avinash | Kaushik | `kaushik` | Métricas, Analytics e BI | Digital Marketing Measurement Model, dashboards orientados a ação |
| 🔧 Lex | Hormozi | `hormozi-sys` | Sistemas e Alavancagem | Audit de sistemas, eliminação de gargalos, automação de processos |
| 🚀 Jeff | Walker | `walker-launch` | Lançamentos | Product Launch Formula (PLF): PLC → Open Cart → Close Cart |

### Tasks

#### Sistemas & Princípios
| Task | Agente | Descrição |
|------|--------|-----------|
| `dalio-principles-audit` | @dalio | Auditoria dos princípios operacionais: identificar gaps entre princípios declarados e comportamento real |
| `hormozi-sys-audit` | @hormozi-sys | Auditoria de sistemas: identificar gargalos, medir alavancagem, propor automações |

#### EOS/Traction
| Task | Agente | Descrição |
|------|--------|-----------|
| `wickman-rocks-planning` | @wickman | Planejamento de Rocks trimestrais (3-7 prioridades absolutas para 90 dias). Revisão do trimestre anterior → brainstorm → priorização → refinamento com donos → registro no ClickUp |
| `pop-create` | @wickman/@dalio | Criar POP (Procedimento Operacional Padrão) com versionamento SemVer. Processo: identificar → documentar → testar com pessoa nova → aprovar → publicar |
| `pop-review` | @wickman | Revisão e atualização de POPs existentes |
| `ops-health-check` | @wickman | Diagnóstico de saúde operacional (scorecard, POPs, processos) |

#### BI & Métricas
| Task | Agente | Descrição |
|------|--------|-----------|
| `kaushik-bi-sprint` | @kaushik | Sprint de BI: definir métricas-chave, configurar dashboard, criar relatórios automatizados |
| `kaushik-dashboard-design` | @kaushik | Design de dashboard de acompanhamento para área específica |

#### Lançamentos
| Task | Agente | Descrição |
|------|--------|-----------|
| `walker-launch-plan` | @walker | Criar plano completo de lançamento (cronograma reverso, PLCs, sequências, gates) |
| `walker-prelaunch-sequence` | @walker | Criar sequência de pré-lançamento (PLC 1-3 + open cart) |

### Workflows

#### 1. `launch-orchestration` — Orquestração de Lançamentos ⭐
- **Tipo:** Por demanda
- **Coordenador:** @walker-launch
- **Duração típica:** 6-10 semanas
- **Squads participantes:** OPS (orquestração), Marketing (conteúdo/criativos), Vendas (oferta/página), Produto (entrega/onboarding)
- **6 Fases:**
  1. **Decisão** (1 sem) — Definir produto, tipo, meta de receita, confirmar budget → Gate Go/No-Go
  2. **Planejamento** (1-2 sem) — Cronograma reverso, briefar squads, configurar métricas
  3. **Produção** (3-5 sem) — Marketing produz PLCs; Vendas finaliza oferta; Produto prepara entrega; OPS monta dashboard → Gate 1 sem antes
  4. **Pré-lançamento** (7-14 dias) — Publicar PLCs, monitorar engajamento diariamente → Gate 24h antes: checkout testado, emails agendados
  5. **Open Cart** (5-7 dias) — Sequência de emails PLF, monitorar conversão, decisões táticas → Regra: urgência REAL, suporte < 4h
  6. **Pós-lançamento** (1-2 sem) — Onboarding, post-mortem quantitativo/qualitativo, documentar como POP
- **Métricas:** Inscrições por PLC, taxa de abertura, taxa de conversão, CAC do lançamento, NPS D7

#### 2. `pop-documentation-cycle` — Ciclo de Documentação de POPs
- **Tipo:** Recorrente (contínuo + revisão semestral)
- **Coordenador:** @wickman
- **Triggers:** Novo processo > 3x uso; processo mudou; falha por falta de doc; revisão semestral
- **5 Fases:** Identificação (30min) → Rascunho (1-3h) → Teste com pessoa nova → Aprovação → Manutenção SemVer
- **Métricas:** % processos críticos documentados, % POPs usados no mês, tempo de onboarding

#### 3. `bi-sprint` — Sprint de BI
- **Tipo:** Por demanda
- **Coordenador:** @kaushik
- **Fluxo:** Definir KPIs → Configurar coleta → Montar dashboard → Automatizar reports

#### 4. `quarterly-rocks-planning` — Planejamento Trimestral de Rocks
- **Tipo:** Recorrente (trimestral)
- **Coordenador:** @wickman
- **Fluxo:** Revisão do trimestre anterior → Brainstorm → Priorização → Definição de donos → Registro no ClickUp

### Checklists

| Checklist | Uso |
|-----------|-----|
| `launch-go-nogo` | Gate de decisão para cada fase de lançamento (critérios binários de go/no-go) |
| `pop-quality-gate` | Verificação de qualidade de POP: objetivo claro, gatilho, pré-condições, passo a passo, responsáveis, ferramentas, tratamento de erro |
| `sprint-ops-review` | Revisão semanal de operações |
| `quarterly-health` | Diagnóstico trimestral de saúde operacional |

### Templates

| Template | Uso |
|----------|-----|
| `pop-template` | Template completo de POP com SemVer (objetivo, gatilho, pré-condições, passos, responsáveis, ferramentas, erros) |
| `rock-template` | Template de Rock trimestral (descrição, dono, prazo, critério de conclusão binário) |
| `launch-plan-template` | Plano de lançamento com cronograma reverso |
| `scorecard-template` | Scorecard semanal de métricas operacionais |
| `bi-report-template` | Relatório de BI com métricas-chave e insights |

---

## 💰 Virals Vendas Squad

**ID:** `virals-vendas-squad`
**Ícone:** 💰 | **Cor:** `#DC2626` (Vermelho)
**Tipo:** Revenue
**Descrição:** Squad de vendas responsável por offer architecture, pipeline management, scripts de fechamento, follow-up sistemático e gestão de receita. Frameworks: Grand Slam Offer (Hormozi), Straight Line System (Belfort), Predictable Revenue (Ross), Fanatical Prospecting (Blount), Inside Sales BR (Thiago Reis).

### Agentes

| Agente | Persona | ID | Especialidade | Framework Base |
|--------|---------|-----|---------------|----------------|
| 💎 Alex | Hormozi | `hormozi-sales` | Ofertas, Pricing, Unit Economics | Grand Slam Offer: valor percebido ≥ 10× preço, stack de valor, garantia de risco zero |
| 🐺 Jordan | Belfort | `belfort-sales` | Fechamento, Straight Line | 5 fases: Rapport → Diagnóstico → Apresentação → Fechamento → Objeções (framework 5 passos) |
| 📈 Aaron | Ross | `ross-sales` | Receita Previsível, Pipeline, SDR | Predictable Revenue, estágios de pipeline, SLAs por fase, qualificação BANT |
| 📞 Jeb | Blount | `blount-sales` | Follow-up, CRM | Cadências de 7-30 dias, reativação de 90 dias, higiene de CRM |
| 🇧🇷 Thiago | Reis | `thiago-reis` | Inside Sales BR, WhatsApp | Adaptação brasileira dos scripts, playbook WhatsApp, consultive selling |

### Tasks

#### Oferta & Pricing
| Task | Agente | Descrição |
|------|--------|-----------|
| `hormozi-offer-build` | @hormozi-sales | Construir oferta Grand Slam: mapear transformação, quantificar valor, stack de valor (core + bônus + fast-track), preço = 5-20% do valor, garantia, unit economics (CAC, LTV, LTV:CAC, payback) |
| `hormozi-pricing-audit` | @hormozi-sales | Auditoria de pricing: revisar LTV:CAC ratio, validar valor percebido vs preço, testar cenários de pricing |

#### Fechamento & Scripts
| Task | Agente | Descrição |
|------|--------|-----------|
| `belfort-script-create` | @belfort-sales | Criar script Straight Line: Rapport → Diagnóstico (5+ perguntas, BANT embutido) → Apresentação (eco da dor, ponte, prova) → Fechamento (assumptive, trial close) → Mapa de objeções. Envia para @thiago adaptar WhatsApp BR |
| `belfort-objection-map` | @belfort-sales | Mapear top 10 objeções com respostas usando framework de 5 passos |
| `belfort-closer-training` | @belfort-sales | Criar material de treinamento para closers: roleplays, quiz de certificação |

#### Pipeline & Outbound
| Task | Agente | Descrição |
|------|--------|-----------|
| `ross-pipeline-design` | @ross-sales | Definir estágios do pipeline, critérios de qualificação (ICP + BANT), volume necessário, SLA por estágio |
| `ross-outbound-setup` | @ross-sales | Configurar sistema de outbound: listas de prospecção, sequências, ferramentas, métricas |

#### Follow-up & CRM
| Task | Agente | Descrição |
|------|--------|-----------|
| `blount-cadencia-create` | @blount-sales | Criar cadências de follow-up (inbound, negociação, reativação) com timing, canal e mensagem por touchpoint |
| `blount-pipeline-review` | @blount-sales | Revisão semanal do pipeline: identificar deals parados, propor ações, reportar forecast |

#### Inside Sales BR
| Task | Agente | Descrição |
|------|--------|-----------|
| `thiago-whatsapp-playbook` | @thiago-reis | Criar playbook completo de vendas via WhatsApp: scripts adaptados para BR, templates de mensagem, timing de follow-up |
| `thiago-inside-sales-setup` | @thiago-reis | Setup de inside sales: estrutura de SDR/closer, ferramentas, métricas, onboarding |

#### Integração
| Task | Agente | Descrição |
|------|--------|-----------|
| `sales-performance-review` | Todos | Revisão semanal de performance (conversão por estágio, CAC, ticket, velocidade do ciclo) |
| `crm-autonomous-hygiene` | @blount-sales | Limpeza autônoma de CRM: identificar leads frios, mover para reativação, atualizar status |

### Workflows

#### 1. `offer-creation-cycle` — Ciclo de Criação de Oferta
- **Tipo:** Por demanda
- **Coordenador:** @hormozi-sales
- **6 Fases:**
  1. **Diagnóstico** — @hormozi mapeia transformação, quantifica valor, analisa unit economics
  2. **Arquitetura da Oferta** — Stack de valor, preço baseado em valor, garantia, tiers → Offer Document
  3. **Argumentário** — @belfort cria script Straight Line + @thiago adapta WhatsApp BR
  4. **Pipeline** — @ross define estágios, critérios BANT, volume necessário, SLAs
  5. **Cadências** — @blount cria follow-up inbound + reativação
  6. **Playbook Closer** — Compilar tudo + roleplays de treinamento + quiz de certificação

#### 2. `sales-process-lifecycle` — Ciclo de Vida da Conversa de Vendas
- **Tipo:** Contínuo
- **Coordenadores:** @thiago-reis (WhatsApp BR) / @belfort-sales (script)
- **Fluxo:** Lead entra (SLA < 5min quente) → Qualificação BANT → Apresentação Straight Line → Proposta (< 2h) → Negociação (7 follow-ups em 30 dias) → Fechamento (ganhou: onboarding + pedir indicação D7; perdeu: motivo + reativação 90 dias)

#### 3. `outbound-prospecting-cycle` — Ciclo de Prospecção Outbound
- **Tipo:** Contínuo
- **Coordenador:** @ross-sales
- **Fluxo:** Definir ICP → Gerar lista → Sequência de outreach multicanal → Qualificar → Passar para closer

#### 4. `follow-up-reactivation` — Reativação de Follow-up
- **Tipo:** Contínuo + sob-demanda
- **Coordenador:** @blount-sales
- **Fluxo:** Identificar leads frios → Categorizar motivo de perda → Sequência de reativação 90 dias

#### 5. `weekly-sales-review` — Revisão Semanal de Vendas
- **Tipo:** Recorrente (semanal)
- **Fluxo:** Pipeline overview → Conversão por estágio → Forecast → Ações para deals parados

### Checklists

| Checklist | Uso |
|-----------|-----|
| `offer-launch-checklist` | Validação antes de lançar nova oferta (stack de valor, pricing, garantia, scripts, pipeline) |
| `closer-onboarding-checklist` | Onboarding de novo closer (playbook, roleplay, quiz, sombra) |
| `deal-review-checklist` | Revisão de deal individual (qualificação, objeções, próximo passo) |
| `pipeline-health-checklist` | Saúde do pipeline (volume, velocidade, conversão, forecast) |
| `script-quality-checklist` | Qualidade do script de vendas (fases, tonalidade, objeções, legalidade) |

### Templates

| Template | Uso |
|----------|-----|
| `offer-document-template` | Documento de oferta Grand Slam (transformação, valor, stack, preço, garantia, unit economics) |
| `sales-script-template` | Script de vendas Straight Line (5 fases com guia de tonalidade) |
| `cadencia-template` | Template de cadência (touchpoints, timing, canal, mensagem) |
| `proposta-comercial-template` | Proposta comercial para envio ao prospect |
| `sales-report-template` | Relatório semanal de vendas |
| `playbook-closer-template` | Playbook completo do closer (oferta + scripts + objeções + cadências + roleplays) |

---

## 🚀 Virals Produto Squad

**ID:** `virals-produto-squad`
**Ícone:** 🚀 | **Cor:** `#7C3AED` (Roxo)
**Tipo:** Product
**Descrição:** Squad de produto responsável por estratégia, discovery, onboarding, engajamento, retenção e customer success. Frameworks: Inspired/Empowered (Cagan), Continuous Discovery Habits (Torres), Product-Led Growth (Bush), Hooked Model (Eyal), Customer Success (Murphy).

### Agentes

| Agente | Persona | ID | Especialidade | Framework Base |
|--------|---------|-----|---------------|----------------|
| 🗺️ Marty | Cagan | `cagan-produto` | Estratégia, Discovery, OKRs, Roadmap | Product Spec, roadmap orientado a outcomes, horizontes 1/2/3 |
| 🔬 Teresa | Torres | `torres-produto` | Discovery, Entrevistas, OST | Opportunity Solution Tree, entrevistas focadas em comportamento passado |
| 🚪 Wes | Bush | `wes-bush-produto` | Onboarding, Ativação, PLG | Aha Moment, jornada D0-D30, redução de fricção |
| 🪝 Nir | Eyal | `eyal-produto` | Hooked Model, Engajamento | Trigger → Ação → Recompensa Variável → Investimento |
| 🤝 Lincoln | Murphy | `lincoln-produto` | Customer Success, Retenção, Expansão | Desired Outcome, Health Score, touchpoints proativos |

### Tasks

#### Strategy & Discovery
| Task | Agente | Descrição |
|------|--------|-----------|
| `cagan-roadmap-quarterly` | @cagan | Criar roadmap de produto trimestral orientado a outcomes: revisar OKRs, analisar OST, definir outcomes, distribuir em horizontes 1/2/3 |
| `cagan-okr-product` | @cagan | Definir OKRs de produto alinhados com as metas da empresa |
| `torres-discovery-sprint` | @torres | Sprint de discovery: recrutar 5 clientes, conduzir entrevistas focadas em comportamento passado, sintetizar insights na OST |
| `torres-opportunity-tree` | @torres | Construir/atualizar Opportunity Solution Tree com oportunidades priorizadas |
| `torres-customer-interview` | @torres | Conduzir entrevista individual de discovery com cliente |

#### Onboarding & Ativação
| Task | Agente | Descrição |
|------|--------|-----------|
| `wes-bush-onboarding-design` | @wes-bush | Projetar fluxo de onboarding D0-D30: mapear jornada, identificar fricção, definir triggers de comunicação → blueprint + sequência de ativação |
| `wes-bush-activation-audit` | @wes-bush | Auditoria de ativação: medir time-to-value, taxa de ativação, identificar drop-offs |

#### Engajamento & Hábito
| Task | Agente | Descrição |
|------|--------|-----------|
| `eyal-engagement-loop` | @eyal | Projetar loops de engajamento Hooked Model: Trigger (externo/interno) → Ação simplificada → Recompensa Variável → Investimento do usuário |
| `eyal-retention-audit` | @eyal | Auditoria de retenção: curvas de retenção, cohorts, pontos de drop-off |

#### Customer Success
| Task | Agente | Descrição |
|------|--------|-----------|
| `lincoln-cs-playbook` | @lincoln | Criar playbook de CS focado em Desired Outcome: touchpoints proativos, marcos de sucesso (milestones), scripts de check-in de valor |
| `lincoln-churn-diagnosis` | @lincoln | Diagnóstico de churn: análise de motivos, correlação com health score, ações corretivas |
| `lincoln-expansion-plan` | @lincoln | Plano de expansão: upsell/cross-sell baseado em usage triggers e marcos de sucesso |

#### Integração
| Task | Agente | Descrição |
|------|--------|-----------|
| `product-health-review` | Todos | Revisão semanal de saúde do produto (NPS, ativação, retenção, churn, health score) |
| `post-launch-retrospective` | @cagan | Retrospectiva pós-lançamento: o que funcionou, o que falhou, lições para próximos ciclos |

### Workflows

#### 1. `new-product-creation-cycle` — Ciclo de Criação de Produto
- **Coordenador:** @cagan-produto
- **4 Fases:**
  1. **Discovery** (2 sem) — @torres realiza 5 entrevistas; @cagan mapeia OST → Gate: evidência de demanda real
  2. **Concepção & Spec** (1 sem) — @cagan escreve Product Spec; @wes-bush define Aha Moment → Gate: spec aprovada e alinhada com vendas
  3. **Build & Onboarding** (2-4 sem) — Produção do core; @wes-bush cria fluxo de onboarding; @eyal projeta loop de hábito
  4. **Lançamento & CS** (Mês 1) — @lincoln ativa playbook CS, monitora health score e NPS D7/D30 → Gate: retro executada

#### 2. `onboarding-lifecycle` — Ciclo de Vida do Onboarding
- **Coordenador:** @wes-bush-produto
- **Fluxo:** Welcome → Setup guiado → Aha Moment → Triggers de reengajamento → Ativação confirmada

#### 3. `continuous-discovery-cycle` — Ciclo de Discovery Contínuo
- **Coordenador:** @torres-produto
- **Fluxo:** Recrutar → Entrevistar → Sintetizar → Atualizar OST → Priorizar → Informar roadmap

#### 4. `churn-intervention-cycle` — Ciclo de Intervenção de Churn
- **Coordenador:** @lincoln-produto
- **Tipo:** Contínuo + sob-demanda
- **Gatilhos:** Health Score < 70 (check-in < 48h), Health Score < 40 (intervenção < 24h), Inatividade > 7 dias → trigger automático @eyal
- **Protocolo:** Diagnóstico (Produto vs Expectativa) → Contato empático CS → Plano de ação personalizado de 2 semanas

#### 5. `weekly-product-review` — Revisão Semanal de Produto
- **Tipo:** Recorrente (semanal)
- **Fluxo:** NPS semanal → Health scores → Ativação → Retenção → Churn → Ações

### Checklists

| Checklist | Uso |
|-----------|-----|
| `product-launch-readiness` | Readiness para lançamento de produto (produto, onboarding, CS, suporte) |
| `onboarding-quality-checklist` | Qualidade do fluxo de onboarding (time-to-value, clareza, triggers) |
| `cs-touchpoint-checklist` | Checklist de touchpoints proativos de CS |
| `discovery-sprint-checklist` | Qualidade do sprint de discovery (recrutamento, guia, síntese) |
| `product-health-checklist` | Saúde geral do produto (NPS, retenção, ativação, bugs) |

### Templates

| Template | Uso |
|----------|-----|
| `product-spec-template` | Especificação de produto (problema, solução, Aha Moment, requisitos) |
| `roadmap-template` | Roadmap trimestral orientado a outcomes |
| `customer-interview-template` | Guia de entrevista de discovery |
| `onboarding-flow-template` | Blueprint visual do fluxo de onboarding D0-D30 |
| `cs-playbook-template` | Playbook operacional de Customer Success |
| `product-health-report-template` | Relatório de saúde do produto (NPS, retenção, ativação, churn) |

---

## Interconexões Cross-Squad

### Mapa de Dependências

```
[PRODUTO] ─── produto pronto ──→ [MARKETING] (brand-funnel-lifecycle)
    │                                  │
    │                                  ├── leads qualificados ──→ [VENDAS] (sales-process-lifecycle)
    │                                  │
    │                                  └── tráfego coordenado ──→ [OPS] (launch-orchestration)
    │
    └── onboarding/CS ←── clientes fechados ──── [VENDAS]

[OPS] ─── orquestra lançamentos ──→ todos os squads
    │
    └── métricas/BI fornecidas a ──→ todos os squads
```

### Fluxos Cross-Squad Críticos

#### 1. Ciclo de Lançamento (O maior fluxo cross-squad)
```
OPS (walker)  →  define plano e timeline
                    ├── MARKETING (ezra/perry) → aquece audiência → converte
                    ├── VENDAS (hormozi/belfort) → oferta + scripts + suporte
                    └── PRODUTO (cagan/lincoln) → entrega + onboarding pós-compra
```

#### 2. Lead-to-Revenue
```
MARKETING (perry/ezra) → gera leads
    → VENDAS (ross) → qualifica no pipeline
        → VENDAS (belfort/thiago) → fecha
            → PRODUTO (wes-bush) → onboarding
                → PRODUTO (lincoln) → CS e retenção
                    → VENDAS (blount) → upsell trigger
```

#### 3. Churn ↔ Marketing Loop
```
PRODUTO (lincoln) → detecta risco de churn
    → PRODUTO (eyal) → ativa loop de reengajamento
    → MARKETING (mrbeast/garyvee) → conteúdo de valor para reativação
    → VENDAS (blount) → cadência de reativação
```

#### 4. Discovery → Oferta
```
PRODUTO (torres) → insights de discovery
    → PRODUTO (cagan) → nova spec de produto
        → VENDAS (hormozi) → nova oferta Grand Slam
            → VENDAS (belfort) → novos scripts
                → MARKETING (ladeira/georgi) → novos criativos/copy
```

#### 5. BI Centralizado
```
OPS (kaushik) → dashboards para:
    ├── MARKETING → métricas de tráfego, CPA, ROAS
    ├── VENDAS → pipeline, conversão, forecast
    └── PRODUTO → NPS, retenção, health score
```

### Handoff Points Documentados

| De | Para | Trigger | Artefato |
|----|------|---------|----------|
| Marketing → Vendas | Lead qualificado (MQL) | Lead entra no pipeline | CRM entry com UTMs |
| Vendas → Produto | Deal fechado | Pagamento confirmado | Trigger de onboarding |
| Produto → Vendas | Cliente pronto para upsell | Health Score > 80 + milestone atingido | Flag no CRM |
| Produto → Marketing | Insight de discovery | Nova oportunidade validada | Brief para conteúdo/copy |
| OPS → Todos | Início de lançamento | Decisão de lançar | Plano no ClickUp |
| Marketing → OPS | Review semanal | Toda segunda-feira | Dashboard de métricas |

---

## Integração com Agentes AIOS Nativos

Os 12 **agentes nativos AIOS** residem em `.aios-core/development/agents/` e operam como **camada de engenharia e gestão**:

### Papel de Cada Agente Nativo no Contexto Virals

| Agente AIOS | Papel nos Squads |
|-------------|-----------------|
| 👑 **AIOS-Master** | Orquestrador geral do framework, gestão de escopo e dependências |
| 🏛️ **Architect** (Aria) | Arquitetura técnica: stack, APIs, infra, deployment, review via CodeRabbit |
| 📋 **PM** (Morgan) | PRDs, stories, requisitos de produto → alimenta @cagan |
| 🎯 **PO** | Priorização de backlog, refinamento de features |
| 🔄 **SM** | Coordenação de sprints, ceremonies, remove impedimentos → conecta com @wickman |
| 💻 **Dev** | Implementação de código: dashboard, automações, scripts |
| 🧪 **QA** | Testes, validação de qualidade, cobertura |
| 📊 **Analyst** | Pesquisa e análise de mercado → alimenta @marketing e @vendas com data |
| 🚀 **DevOps** (Gage) | CI/CD, deploy, git push, GitHub Actions → único que pode fazer push |
| 🗄️ **Data Engineer** (Dara) | Schema de banco, queries, ETL → suporte a @kaushik com BI |
| 🎨 **UX Design** (Uma) | Design de interfaces → suporte ao dashboard e landing pages |
| 🏗️ **Squad-Creator** | Gera novos squads com estrutura padronizada |

### Fluxo de Interação AIOS ↔ Squads

```
PM (PRD) → Architect (arquitetura) → Dev (implementação)
                                         ↓
                                    QA (validação)
                                         ↓
                                    DevOps (deploy)

Analyst → Marketing Squad (insights de mercado)
Data Engineer → OPS Squad (suporte @kaushik com BI)
UX Design → Marketing Squad (landing pages, criativos)
Squad-Creator → gera novos squads com estrutura padronizada
```

---

## Integração ClickUp

Cada squad mapeia para um **Espaço (Departamento)** no ClickUp:

### Marketing → Espaço "Marketing"
| Pasta (Área) | Listas (Processos) |
|--------------|-------------------|
| Produção de conteúdo | Máquina de Ideias, Planejamento & Criação, Copywriting, Design e Criação, Agendamento/Publicação |
| Planejamento Estratégico | Estratégias e Funis |
| Traffic Performance & Growth | Gestão de Campanhas, Otimização, Investimentos, Trackeamento, Lab de Criativos |
| Automações e Integrações | Gestão de Fluxos, Gestão de WhatsApp |
| Desenvolvimento Web | Landing Pages, Manutenção, Domínios |

### Vendas → Espaço "Comercial / Vendas"
| Pasta (Área) | Listas (Processos) |
|--------------|-------------------|
| CRM | Gestão de Clientes, Renovação, Novas Oportunidades |
| Consultorias, Serviços & Mentorias | Prospecção Direta, Social Selling, Aplicação Direta, Reunião Closer |
| Treinamentos, Cursos & Templates | Prospecção, Social Selling, Recuperação de Vendas |
| Hunter ADS System | Mineração, Qualificação, Propostas |
| CRM Hunter | Processos CRM Hunter |

### OPS → Espaço "Operações"
| Pasta (Área) | Listas (Processos) |
|--------------|-------------------|
| Processos & POPs | Mapeamento de Processos, Construção de POPs |
| Objetivos & Metas OKR | Q1 Fundação, Q2 Tração, Q3 Autoridade, Q4 Consolidação |
| Rocks Trimestrais | Processos de Rocks |
| Lançamentos | Processos de Lançamentos |
| BI & Métricas | Processos de BI |
| Saúde Operacional | Processos de Saúde |

### Produto → Espaço "Produto"
| Pasta (Área) | Listas (Processos) |
|--------------|-------------------|
| Gestão de Produtos | Painel de Produtos, Estratégia, QA & Usabilidade, Reestruturação |
| Sucesso do Cliente | Entrada, Atendimento, NPS, Mapeamento de Problemas, Gestão de Crise, Saída |
| Gestão de Entregas | Mentorias & Consultorias, Check-ins, Prestação de Contas |

---

## Referência Rápida

### Ativar um Agente (via IDE)
```
/marketing-perry-marshall    → Perry (Sniper do ROI)
/virals-ops-wickman         → Gino (EOS/Traction)
/virals-vendas-hormozi-sales → Alex (Grand Slam Offer)
/virals-produto-cagan-produto → Marty (Roadmap & Strategy)
```

### Comandos Úteis por Squad

| Necessidade | Squad | Agente | Comando/Task |
|------------|-------|--------|--------------|
| Criar campanha de tráfego | Marketing | @perry | `perry-dr-campaign-create` |
| Criar funil de audiência | Marketing | @ezra | `ezra-funnel-build` |
| Planejar Rocks trimestrais | OPS | @wickman | `wickman-rocks-planning` |
| Orquestrar lançamento | OPS | @walker | `launch-orchestration` workflow |
| Construir oferta | Vendas | @hormozi | `hormozi-offer-build` |
| Criar script de vendas | Vendas | @belfort | `belfort-script-create` |
| Sprint de discovery | Produto | @torres | `torres-discovery-sprint` |
| Projetar onboarding | Produto | @wes-bush | `wes-bush-onboarding-design` |
| Intervenção de churn | Produto | @lincoln | `churn-intervention-cycle` workflow |

---

*Documentação gerada por Aria (Architect) — Severinos v1.0.0*
*— Aria, arquitetando o futuro 🏗️*
