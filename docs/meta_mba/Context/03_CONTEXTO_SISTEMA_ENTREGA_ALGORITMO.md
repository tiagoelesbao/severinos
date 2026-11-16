# DOCUMENTO 3 — CONTEXTO: SISTEMA DE ENTREGA, LEILÃO E ALGORITMO (2026)
**Programa:** Meta Performance Engineering  
**Versão:** v2.0 — 29/09/2026 (Enriquecido com Diagramas e Fórmulas)  
**Referências:** D-01 a D-08, B-01 a B-06 (ver Documento 2)  
**Módulos da apostila:** 1, 2, 3  

---

## 1. O LEILÃO MULTIVARIADO DA META E A FÓRMULA DO VALOR TOTAL

```mermaid
graph TD
    USER["Usuário Visualiza Feed/Reels"] --> AUCTION["Motor de Leilão Meta Ads"]
    
    AUCTION --> BID["Bid: Lance do Anunciante (R$)"]
    AUCTION --> EAR["EAR: Estimated Action Rate P(Conversão)"]
    AUCTION --> QUAL["Quality Score Q (Feedback - Penalidades)"]
    
    BID & EAR & QUAL --> EQUATION["V = (Bid × EAR) + Q"]
    EQUATION --> RANKING["Ordenação dos Anunciantes por Total Value (V)"]
    
    RANKING --> WINNER["Vencedor Ganha a Impressão"]
    RANKING --> VCG["Cálculo VCG: Preço Pago = (V_segundo - Q_vencedor) / EAR_vencedor"]
```

### 1.1 Equação Matemática do Valor Total
$$V = (Bid \times EAR) + Q$$

### 1.2 Mecanismo VCG (Vickrey-Clarke-Groves)
No leilão VCG, a estratégia dominante é a **revelação sincera de valor (truthfulness)**. O vencedor paga apenas a quantia estritamente necessária para superar a pontuação do segundo colocado:

$$\text{Preço Pago pelo Vencedor} = \frac{V_{\text{segundo colocado}} - Q_{\text{vencedor}}}{EAR_{\text{vencedor}}}$$

---

## 2. O ALGORITMO DE PACING (DESCONTO DINÂMICO)

```mermaid
flowchart LR
    SPEND_RATE{Ritmo de Consumo de Orçamento} -->|Acelerado demais| LOW_BID["w_t < 1.0 -> Reduz Lance Efetivo no Leilão"]
    SPEND_RATE -->|Atrasado demais| HIGH_BID["w_t > 1.0 -> Aumenta Lance Efetivo no Leilão"]
    SPEND_RATE -->|Ideal| SMOOTH["w_t = 1.0 -> Ritmo Homogêneo em 24h"]
```

---

## 3. FASE DE APRENDIZADO (LEARNING PHASE) E LIQUIDITY FRAMEWORK

```mermaid
stateDiagram-v2
    [*] --> CriacaoAdSet: AdSet Ativado
    CriacaoAdSet --> FaseAprendizado: Início de Entrega
    
    state FaseAprendizado {
        [*] --> ContagemConversoes
    }
    
    FaseAprendizado --> AprendizadoConcluido: >= 50 Eventos em 7 Dias (CPA Estável)
    FaseAprendizado --> LearningLimited: < 50 Eventos em 7 Dias (Alta Variância)
    
    LearningLimited --> ConsolidacaoLiquida: Unificar AdSets em CBO Broad (Liquidez)
    ConsolidacaoLiquida --> AprendizadoConcluido
```

---
*Fim do Documento 3 (Versão Expandida com Diagramas Mermaid).*
