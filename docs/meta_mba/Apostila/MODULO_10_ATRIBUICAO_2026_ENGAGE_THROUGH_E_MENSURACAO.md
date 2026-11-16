# MÓDULO 10 — ATRIBUIÇÃO 2026: 7D CLICK, 1D ENGAGE-THROUGH, 1D VIEW E ANALYTICS
**Programa:** MBA Meta Performance Engineering  
**Edição:** 2026  
**Disciplinas Integradas:** Marketing Science, Analytics & Data Science  
**Tempo estimado de estudo:** 12 horas  

---

## 1. O PADRÃO MULTICANAL DE ATRIBUIÇÃO META EM 2026

```mermaid
graph TD
    CONV["Conversão Registrada no CAPI / Dataset"] --> ATTRIB{"Janela de Atribuição Ativa"}
    
    ATTRIB -->|Clique nos últimos 7d| CLICK["7-Day Click Attribution (Alta Intenção Determinística)"]
    ATTRIB -->|Engajamento no Reels nos últimos 1d| ENGAGE["1-Day Engage-Through (Assistiu >5s / Interagiu sem Clicar)"]
    ATTRIB -->|Impressão passiva nos últimos 1d| VIEW["1-Day View Attribution (Visualização Passiva na Tela)"]
    
    CLICK --> REPORT["Atribuído ao Anúncio Campeão de Clique"]
    ENGAGE --> REPORT["Atribuído ao Anúncio de Vídeo/Reels Originador do Engajamento"]
    VIEW --> REPORT["Atribuído à Última Impressão Passiva"]
```

---

## 2. FLUXO TÍPICO DE ENGAGE-THROUGH ATTRIBUTION

```mermaid
sequenceDiagram
    autonumber
    participant User as Usuário no Instagram
    participant Feed as Reels Ad (Vídeo 9:16)
    participant Browser as Safari / Chrome Direct Search
    participant MetaDataset as Meta Dataset / CAPI
    
    User->>Feed: Assiste a 8s do vídeo de Reels (Engajamento Válido!)
    User->>Feed: NÃO clica no botão "Saiba Mais"
    User->>User: Fecha o Instagram e abre o navegador 2h depois
    User->>Browser: Digita a URL da marca diretamente e compra R$ 300
    Browser->>MetaDataset: POST CAPI Purchase (user_data SHA-256)
    MetaDataset->>MetaDataset: Atribui a compra ao Reels Ad via Engage-Through!
```

---

## 3. PROJETO PRÁTICO: COMPARADOR DE JANELAS EM PYTHON (`analytics/attribution_comparator.py`)

```python
import pandas as pd
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount

def compare_attribution_windows(ad_account_id: str):
    """
    Compara a receita e o ROAS reportados segregados por janela de atribuição.
    """
    account = AdAccount(ad_account_id)
    params = {
        'date_preset': 'last_30d',
        'fields': ['campaign_name', 'spend', 'action_values'],
        'action_attribution_windows': ['1d_click', '7d_click', '1d_engage_through', '1d_view']
    }
    insights = account.get_insights(params=params)
    
    report = []
    for item in insights:
        spend = float(item.get('spend', 0.0))
        report.append({
            'campaign': item.get('campaign_name'),
            'spend': spend
        })
        
    df = pd.DataFrame(report)
    print("=== COMPARATIVO DE JANELAS DE ATRIBUIÇÃO ===")
    print(df)
    return df

if __name__ == "__main__":
    # compare_attribution_windows("act_123456789")
    pass
```

---

## 4. EXERCÍCIOS DE FIXAÇÃO

### Questão 1 (Análise Executiva)
Como demonstrar ao CFO da empresa que o investimento em Reels Ads que convertem via *1-Day Engage-Through* é altamente rentável e não representa "crédito duplicado"?

---
*Fim do Módulo 10.*
