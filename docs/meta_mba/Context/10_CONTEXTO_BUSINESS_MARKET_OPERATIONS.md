# DOCUMENTO 10 — CONTEXTO: BUSINESS, MARKET & OPERATIONS (2026)
**Programa:** Meta Performance Engineering  
**Versão:** v2.0 — 29/09/2026 (Enriquecido com Diagramas e Fórmulas)  
**Referências:** B-01 a B-06, E-01 a E-06, G-01 a G-05 (ver Documento 2)  
**Módulos da apostila:** 15, 16, 17  

---

## 1. ESTRUTURA DE PODS AUTÔNOMOS EM AGÊNCIAS DE PERFORMANCE

```mermaid
graph TD
    LEAD["LEAD PERFORMANCE ENGINEER (Estratégia & Arquitetura)"]
    
    LEAD --> POD1["Data & Signals Engineer (CAPI, SQL, Models)"]
    LEAD --> POD2["Creative Intelligence Engineer (Hooks, Angles, CRO)"]
    LEAD --> POD3["AI Agent & Automation Engineer (MCP, API, Monitoring)"]
```

---

## 2. TOPOLOGIA DE BM E PREVENÇÃO DE RISCOS (GOVERNANÇA)

```mermaid
graph TD
    BM_ASSETS["BM MATRIZ DE ATIVOS (Pixels, Catálogos, Páginas)"]
    BM_PAYMENT["BM DE PAGAMENTOS (Cartões Corporativos)"]
    
    BM_ASSETS -. Permissão de Uso .- BM_EXEC1["BM de Execução 01 (Contas Ativas)"]
    BM_ASSETS -. Permissão de Uso .- BM_EXEC2["BM de Execução 02 (Contas Contingência)"]
    
    BM_PAYMENT -. Conecta Cartão .- BM_EXEC1
    BM_PAYMENT -. Conecta Cartão .- BM_EXEC2
```

---
*Fim do Documento 10 (Versão Expandida com Diagramas Mermaid).*
