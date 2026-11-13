# DOCUMENTO 1 — MBA META PERFORMANCE ENGINEERING 2026
**Versão:** v2.0 — Edição 2026 (Enriquecido com Diagramas e Fórmulas)  
**Idioma:** Português  
**Status:** Arquitetura Curricular Aprovada  

---

> **O que é este documento:** A arquitetura completa do programa de formação Meta Performance Engineering. Define missão, estrutura, 10 disciplinas, 16 módulos semanais, competências-alvo, projetos práticos, sistema de maturidade, trilha de certificação e capstone. Este documento é a âncora curricular — todo conteúdo da apostila deve mapear de volta para ele.

---

## 0. MISSÃO E IDENTIDADE DO PROGRAMA

### 0.1 O Profissional que Queremos Formar: META PERFORMANCE ENGINEER

```mermaid
graph TD
    MPE["META PERFORMANCE ENGINEER"]
    
    MPE --> P1["1. Economia do Negócio e Unit Economics"]
    MPE --> P2["2. Inteligência Criativa e Consumer Research"]
    MPE --> P3["3. Algoritmo de Entrega e Leilão VCG"]
    MPE --> P4["4. Arquitetura de Sinais e CAPI Server-Side"]
    MPE --> P5["5. Automação via Graph API, Python e SQL"]
    MPE --> P6["6. Rigor Estatístico e Inferência Causal (GeoLift/MMM)"]
    MPE --> P7["7. Supervisão Agêntica com Claude Code e MCP"]
```

### 0.2 Hierarquia de Fontes do Programa (Tier Hierarchy)

```mermaid
flowchart TD
    T1["Tier A: Meta Official Documentation (Graph API, Engineering Blog)"] --> T2
    T2["Tier B: Meta Blueprint e Marketing Science Papers (GeoLift, Robyn)"] --> T3
    T3["Tier C: Experimentos Próprios Documentados em Conta Real"] --> T4
    T4["Tier D: Cases de Mercado com Metodologia Comprovada"]
```

---

## 1. FILOSOFIA DO MÉTODO: O CICLO CIENTÍFICO DO GESTOR

```mermaid
flowchart TD
    OBS["1. OBSERVAÇÃO (Métricas da Conta)"] --> QUEST["2. PERGUNTA (O que gerou a variação?)"]
    QUEST --> HYP["3. HIPÓTESE (Se alterarmos X, a conversão Y subirá)"]
    HYP --> METRIC["4. MÉTRICA (Definição de KPI primário e secundário)"]
    METRIC --> EXP["5. EXPERIMENTO (Grupo de Controle vs Tratamento)"]
    EXP --> DATA["6. COLETA (Logs CAPI e Marketing API)"]
    DATA --> ANALYS["7. ANÁLISE (Z-score, Intervalo de Confiança)"]
    ANALYS --> EVID["8. EVIDÊNCIA (Causalidade vs Correlação)"]
    EVID --> DECISION{"9. DECISÃO"}
    
    DECISION -->|CPA > Cap| KILL["🔴 KILL (Pausar)"]
    DECISION -->|Gancho Forte| ITERATE["🔵 ITERATE (Reformular)"]
    DECISION -->|Estável| HOLD["🟡 HOLD (Manter)"]
    DECISION -->|iROAS Alto| SCALE["🟢 SCALE (Escalar)"]
    
    KILL & ITERATE & HOLD & SCALE --> OBS
```

---

## 2. OS 7 PILARES DO META PERFORMANCE OS

```mermaid
graph BT
    P1["01 — BUSINESS (Unit Economics, CAC, LTV, Break-even)"] --> P2
    P2["02 — MARKET (Consumer Psychology, JTBD, Branding)"] --> P3
    P3["03 — MEDIA (Auction VCG, Pacing, Advantage+)"] --> P4
    P4["04 — DATA (CAPI, SHA-256, Datasets, Webhooks)"] --> P5
    P5["05 — SCIENCE (GeoLift, Robyn MMM, Stat Significance)"] --> P6
    P6["06 — ENGINEERING (Graph API, Python, Polars, SQL)"] --> P7
    P7["07 — AI (Agents, Claude Code, MCP Connectors)"] --> DECISION["ENGINE DE DECISÃO DE ESCALA"]
```

---

## 3. AS 10 DISCIPLINAS DO PROGRAMA

| Disciplina | Categoria | Pergunta Central | Entregável Principal |
| :--- | :--- | :--- | :--- |
| **01 — Meta Ads Engineering** | Core | Como gerar performance dentro do leilão VCG? | Estrutura de Conta Advantage+ Shopping |
| **02 — Meta Developers** | Core | Como controlar a plataforma programaticamente? | Cliente Python Graph API v26.0 |
| **03 — Data Science** | Core | Como transformar dados de anúncios em evidência? | Detector de Anomalias (Z-score/Isolation Forest) |
| **04 — Marketing Science** | Core | Como provar o efeito incremental do marketing? | Estudo de Incrementalidade via GeoLift / iROAS |
| **05 — AI Engineering** | Core | Como ampliar a capacidade com Agentes de IA? | Servidor MCP e Agentes de IA no Claude Code |
| **06 — Decision Science** | Core | Como tomar decisões de alocação de orçamento? | Algoritmo de Decisão de CPA Marginal |
| **07 — Business & Unit Economics**| Comp. | Quanto podemos pagar por um cliente? | Modelagem de $ROAS_{BE}$ e $CAC_{max}$ |
| **08 — Market Science** | Comp. | Como entender o consumidor e a audiência? | Mapeamento de JTBD e Ângulos de Copys |
| **09 — Creative Intelligence** | Comp. | Como comunicar para converter no Reels? | Taxonomia e Creative Diversity Score |
| **10 — Operations & Governance**| Comp. | Como executar com segurança e conformidade? | Playbook Engine & Arquitetura Multi-BM |

---

## 4. O CRONOGRAMA DE 16 SEMANAS

```mermaid
gantt
    title Cronograma de Formação de 16 Semanas do MBA
    dateFormat  YYYY-MM-DD
    section Bloco 1 - Fundamentos
    Sem 01 - Ecossistema e ODAX        :a1, 2026-01-01, 7d
    Sem 02 - Auction VCG e Total Value :a2, after a1, 7d
    Sem 03 - Pacing e Learning Phase   :a3, after a2, 7d
    Sem 04 - Otimizacao e Bid Strategies:a4, after a3, 7d
    section Bloco 2 - Automacao e Sinais
    Sem 05 - Advantage+ Unified Engine :a5, after a4, 7d
    Sem 06 - Creative Diversity        :a6, after a5, 7d
    Sem 07 - Creative Testing e CRO    :a7, after a6, 7d
    Sem 08 - Tracking CAPI e EMQ       :a8, after a7, 7d
    section Bloco 3 - Science e Scale
    Sem 09 - CAPI Offline e Webhooks   :a9, after a8, 7d
    Sem 10 - Atribuicao 2026           :a10, after a9, 7d
    Sem 11 - GeoLift e Robyn MMM       :a11, after a10, 7d
    Sem 12 - Escala e CPA Marginal     :a12, after a11, 7d
    section Bloco 4 - Meta OS e Capstone
    Sem 13 - Data Science e Polars     :a13, after a12, 7d
    Sem 14 - CRM Loop e Governanca     :a14, after a13, 7d
    Sem 15 - Agentes de IA e MCP       :a15, after a14, 7d
    Sem 16 - Capstone Project Final    :a16, after a15, 7d
```

---

## 5. OS AGENTES ESPECIALIZADOS DO META OS

```mermaid
graph LR
    ORCH["ORQUESTRADOR META OS"]
    
    ORCH --> A1["Meta Analyst: Analisa anomalias de CPA/CPM"]
    ORCH --> A2["Creative Analyst: Mede fadiga e diversidade"]
    ORCH --> A3["Campaign Auditor: Audita tracking e EMQ"]
    ORCH --> A4["Meta Scientist: Desenha testes GeoLift"]
    ORCH --> A5["Meta Operator: Executa mudanças com Guardrails"]
```

---
*Fim do Documento 1.*
