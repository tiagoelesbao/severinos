# 🎯 Virals Creators Hunting Squad

> ⚠️ **LEGADO (2026-08-16).** O Hunter Ads System (hunting manual de creators) tornou-se legado — não é mais vendido para novos clientes, substituído por AI UGC & Vídeos Ecommerce (motor de criativo gerado por IA). Este squad fica preservado como referência para clientes com contrato ativo no modelo antigo, mas não deve ser usado para captar novos clientes. Não existe ainda um substituto funcional de "prospecção/outreach" no modelo novo — isso é um gap real, não uma decisão tomada; avaliar com o fundador se vale reaproveitar a infraestrutura de outreach deste squad (scripts, CRM bridge, sequências de DM) para prospecção de CLIENTES em vez de creators. Ver ADR-001 (lista ADR no ClickUp, Administrativo) para o histórico da decisão de descontinuar o Hunter Ads System.

Squad de recrutamento e gestão de micro-creators para produção de conteúdo UGC autêntico e propagandas de marcas parceiras da Virals.

## Pipeline ICP-C Driven

O input é sempre o **ICP-C (Ideal Creator Profile)** da marca cliente → desencadeia 4 fases:

| Fase | Agent | Foco |
|:-----|:------|:-----|
| 0 - Preparação | @hunter-chief (Joe) | Transformar ICP-C em critérios de busca |
| 1 - Identificação | @hunter-scout (Mae) | Mineração Unificada (Discovery + Sniper + Ranking) |
| 2 - Qualificação | @hunter-analyst (Gil) | Scoring proprietário (Creator Score > 7) |
| 3 - Abordagem | @hunter-closer (Brittany) | Gerar scripts personalizados (execução humana) |
| 4 - Gerenciamento | @hunter-manager (Jason) | CRM (ClickUp), onboarding, performance tracking |

## Agents

- **@hunter-chief** (Joe) — Inspirado em Joe Gagliese (Viral Nation) — Orquestrador
- **@hunter-scout** (Mae) — Inspirada em Mae Karwowski (Obviously) — Discovery
- **@hunter-analyst** (Gil) — Inspirado em Gil Eyal (HYPR/CreatorIQ) — Scoring
- **@hunter-closer** (Brittany) — Inspirada em Brittany Hennessy (Hearst) — Outreach
- **@hunter-manager** (Jason) — Inspirado em Jason Falls (Winfluence) — Gestão

## Quick Start

```bash
# Ativar o squad
@hunter-chief

# Iniciar hunting com ICP-C
*start-hunt ./path/to/icp-c-marca.md

# Ver status do pipeline
*pipeline-status

# Review semanal para L10
*weekly-review
```

👉 **[Ver o Guia de Uso Completo Enriquecido](docs/comprehensive-usage-guide.md)** para todos os detalhes, testes dos scripts e setup das fases de Hunting.

## Integrations

- **ClickUp:** Space Comercial > Hunter ADS System > Prospecção | CRM Hunter
- **ETL:** services/ETL/ (Social Discovery Engine v3)
- **TikTok:** Playwright scraping (API ready para futuro)
- **Meta Ads Library:** Playwright scraping

## Metas (POP-HUNTER-001)

- 50 prospects qualificados/mês
- 5 contratações/mês
- Taxa de resposta > 10%

## Version

- **Squad:** 1.0.0
- **AIOX:** 2.1.0+
- **POP:** POP-HUNTER-001 v1.0.0
