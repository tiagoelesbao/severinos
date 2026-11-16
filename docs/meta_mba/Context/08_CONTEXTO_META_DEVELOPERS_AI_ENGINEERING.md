# DOCUMENTO 8 — CONTEXTO: META DEVELOPERS E AI ENGINEERING
**Programa:** Meta Performance Engineering  
**Versão:** v2.1 — 29/09/2026 (Sintaxe Mermaid Corrigida)  
**Referências:** D-01 a D-12, I-01 a I-09 (ver Documento 2)  
**Módulos da apostila:** 8, 15  

---

## 1. MODEL CONTEXT PROTOCOL (MCP) E META ADS AI CONNECTORS

```mermaid
graph TD
    USER["Engenheiro de Performance / Claude Code"] --> MCP_CLIENT["MCP Client (Transport / Auth Layer)"]
    
    MCP_CLIENT --> MCP_SERVER["Meta Ads MCP Server (mcp.facebook.com/ads)"]
    
    MCP_SERVER --> TOOL1["get_campaign_analytics"]
    MCP_SERVER --> TOOL2["audit_account_structure"]
    MCP_SERVER --> TOOL3["propose_budget_reallocation"]
    
    TOOL3 --> GUARD{"Guardrail Engine: Budget Change <= 20%?"}
    GUARD -->|Sim| SLACK["Solicita Aprovação Humana no Slack"]
    GUARD -->|Não| REJECT["Rejeita Alteração por Segurança"]
    
    SLACK -->|Aprovado| API["Graph API Meta v26.0 (Execução em Conta Real)"]
```

---
*Fim do Documento 8.*
