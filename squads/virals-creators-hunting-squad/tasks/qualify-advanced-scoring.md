# Task: Qualificação e Scoring Avançado (Fase 2)

**ID:** VH-TASK-200
**Phase:** 2 — Qualificação
**Agent:** @hunter-analyst (Gil)
**Execution Type:** Worker (pipeline-qualify.js)
**Status:** active

---

## Objetivo

Transformar a lista bruta de descobertas (Fase 1) em um ranking qualificado de elite. O Gil aplica o motor de scoring proprietário (7 dimensões), filtra por geolocalização e engajamento real, e classifica as creators em Tiers (Gold/Silver/Bronze).

## Input

- Descobertas estruturadas em `data/discoveries/discovery-{cliente}-{date}.json`.
- Configuração de pesos: `config/scoring-weights.yaml`.

## Output

- **Dossier de Qualificação** em `data/scorecards/dossier-qualificacao-{cliente}-{date}.md`.
- Arquivo JSON de scorecards para integração com CRM.

## Action Items

1. Iniciar o pipeline de qualificação para o cliente:
   ```bash
   node squads/virals-creators-hunting-squad/scripts/pipeline-qualify.js {cliente}
   ```
2. O Gil lê os dados numéricos (likes, views, comments, saves) de cada prospect.
3. Aplica a fórmula ponderada de 7 dimensões:
   - Engagement Rate (25%)
   - Content Authenticity (20%)
   - Face Presence (15%)
   - Niche Alignment (15%)
   - Posting Frequency (10%)
   - Audience Demographics (10%)
   - Growth Trend (5%)
4. Classifica os perfis:
   - **Tier Gold/Silver (Score >= 7)**: Prontos para abordagem.
   - **Tier Bronze/Rejected (Score < 7)**: Listados na base para histórico, mas não priorizados.
5. Gera o relatório Markdown final para o time de Marketing.

## Acceptance Criteria

- [ ] Todos os perfis da Fase 1 foram processados pelo motor de scoring.
- [ ] O Dossier de Qualificação separa claramente os "Top Qualificados" dos demais.
- [ ] A geolocalização e o engagement rate foram auditados numericamente.
- [ ] Perfis com Score < 7 são mantidos na seção final do relatório para integridade da base.
