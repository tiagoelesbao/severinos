# DOCUMENTO 6 — CONTEXTO: ATRIBUIÇÃO 2026 E MARKETING SCIENCE
**Programa:** Meta Performance Engineering  
**Versão:** v2.0 — 29/09/2026 (Enriquecido com Diagramas e Fórmulas)  
**Referências:** A-01 a A-03, MS-01 a MS-04 (ver Documento 2)  
**Módulos da apostila:** 10, 11  

---

## 1. JANELAS DE ATRIBUIÇÃO EM 2026

```mermaid
graph TD
    CONV["Conversão no CAPI / Dataset"] --> JANELA{Janela Ativa no Ad Set}
    
    JANELA --> CLICK["7-Day Click Attribution (Clique Direto no Link)"]
    JANELA --> ENGAGE["1-Day Engage-Through (Assistiu >5s Reels / Interagiu sem Clicar)"]
    JANELA --> VIEW["1-Day View Attribution (Visualização Passiva em 24h)"]
```

---

## 2. INFERÊNCIA CAUSAL E GEOLIFT

```mermaid
flowchart TD
    TOTAL_REV["Receita Total Observada"] --> BASELINE["Receita Orgânica (Controle Sintético GeoLift)"]
    TOTAL_REV --> INCREMENTAL["Receita Incremental (Tratamento - Controle Sintético)"]
    
    INCREMENTAL --> IROAS["iROAS = Receita Incremental / Gasto Meta"]
```

---
*Fim do Documento 6 (Versão Expandida com Diagramas Mermaid).*
