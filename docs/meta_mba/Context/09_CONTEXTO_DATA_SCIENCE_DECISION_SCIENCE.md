# DOCUMENTO 9 — CONTEXTO: DATA SCIENCE E DECISION SCIENCE APLICADOS À META ADS (2026)
**Programa:** Meta Performance Engineering  
**Versão:** v2.1 — 29/09/2026 (Sintaxe Mermaid Corrigida)  
**Referências:** DS-01 a DS-08, MS-01 a MS-05 (ver Documento 2)  
**Módulos da apostila:** 13, 14  

---

## 1. DATA PIPELINES E DETECÇÃO DE ANOMALIAS

```mermaid
graph TD
    DATA["CAPI Event Logs / Parquet Lake"] --> ENGINE["Polars / DuckDB Engine"]
    
    ENGINE --> ZSCORE["Z-Score Móvel (24h Window)"]
    ENGINE --> IFOREST["Isolation Forest (CPM, CPC, CTR, CPA)"]
    
    ZSCORE & IFOREST --> ALERT{"Z-Score > 3.0?"}
    ALERT -->|Sim| NOTIFY["🚨 Notificação no Slack / Disparo de Safeguard"]
    ALERT -->|Não| OK["Métricas Dentro do Intervalo de Confiança"]
```

---

## 2. DECISION SCIENCE E CPA MARGINAL

```mermaid
flowchart LR
    SPEND_INC["Delta Spend (Aumento de Orçamento)"] --> CONV_INC["Delta Conversões"]
    
    CONV_INC --> MARGINAL_CALC["CPA Marginal = Delta Spend / Delta Conversões"]
    MARGINAL_CALC --> DECISION{"CPA Marginal <= CAC Max?"}
    
    DECISION -->|Sim| SCALE["🟢 Escala Rentável"]
    DECISION -->|Não| HOLD["🔴 Saturação Alcançada (Hold/Revert)"]
```

---
*Fim do Documento 9.*
