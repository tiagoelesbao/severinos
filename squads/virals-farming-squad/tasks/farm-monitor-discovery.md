---
task_name: farm-monitor-discovery
status: ready
responsible_executor: farming-scout
execution_type: worker
phase: f1-discovery
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - niche: id em data/niches/ (obrigatório)
  - source: hashtags | profiles | both (default: both)
  - hours: janela de lookback (default: do nicho)
  - items: itens por alvo (default: do nicho)
output: |
  - ranking-{nicho}-{date}.md — relatório humano
  - ranking-{nicho}-{date}.json — dados para a F2
  - session.json — manifesto com phases.f1_discovery
pre_conditions: |
  - data/niches/{nicho}.yaml existe
  - yt-dlp disponível em services/ETL/bin/ ou no PATH
post_conditions: |
  - O ranking existe e traz as 4 seções obrigatórias
  - Falhas de captura estão reportadas em seção própria
acceptance_criteria: |
  - Todo aprovado tem score, engajamento e modelabilidade
  - Todo reprovado tem motivo específico e acionável
  - Itens sem métrica estão separados dos sem engajamento
  - checklists/discovery-cutoff-checklist.md passa
---

# F1 — Garimpo de Perfis e Hashtags

Varre o TikTok dentro de um nicho, aplica a nota de corte e entrega um ranking em que cada
linha é um **candidato real a modelagem** — não uma lista de links.

## Comando

```bash
node squads/virals-farming-squad/scripts/farm-monitor.js --niche={nicho} [flags]
```

| Flag | Efeito |
|:---|:---|
| `--source=hashtags\|profiles\|both` | rota de descoberta |
| `--hours=N` | janela de lookback |
| `--items=N` | itens por alvo |
| `--handles=a,b` | varre handles avulsos, sem editar o YAML |
| `--headed` | navegador visível na rota de hashtag |
| `--dry-run` | lista os alvos e sai, sem rede |
| `--test-search[=termo]` | testa só a rota de busca e sai |
| `--skip-serper` | força o fallback gratuito (DuckDuckGo) |

## Estado das rotas de descoberta

Verificado em **2026-07-26** com yt-dlp 2026.07.04; busca revalidada em **2026-07-27**:

| Rota | Estado | Observação |
|:---|:---:|:---|
| Perfil (`/@handle`) | ✅ | `--flat-playlist` traz views, likes, comentários, timestamp, track |
| Busca via Serper | ✅ | rota primária por termo; exige `SERPER_API_KEY` (2.500 buscas grátis) |
| Busca via DuckDuckGo | ⚠️ | só fallback: em rajada devolve 202 (0 de 6 termos no teste real) |
| Google Custom Search (CSE) | ⛔ | API **fechada a novos clientes**, EOL 2027-01-01 — 403 permanente, não configurável |
| Hashtag (`/tag/x`) via yt-dlp | ❌ | `No working app info is available` |
| Hashtag via Playwright | ⚠️ | cascata de 3 estratégias; hoje barrada por anti-bot |
| Vídeo único (`--dump-json`) | ❌ | `Unable to extract universal data for rehydration` |

**Custo da rota primária:** 2 créditos por termo (2 páginas × 10 resultados). Um nicho de
11 hashtags gasta 22 por varredura; os 4 nichos, ~90. O free tier cobre ~28 varreduras
completas antes do primeiro pagamento.

**Consequência de arquitetura:** a rota de hashtag descobre **handles**; as métricas vêm
sempre da rota de perfil, que é a confiável. Assim, qualquer estratégia de hashtag que
volte a funcionar já alimenta o ranking completo, sem mudar o resto.

## Action Items

1. **Carregar o nicho** — `data/niches/{nicho}.yaml`. Se não existir, listar os disponíveis e parar.
2. **Montar os alvos** — hashtags seed e/ou `anchor_profiles`, mais handles de `--handles`.
3. **Rota de hashtag** (se aplicável) — cascata de estratégias por alvo. Falha vira registro
   explícito, nunca silêncio.
4. **Rota de perfil** — âncoras + avulsos + até `--max-handles` descobertos por hashtag.
5. **Aplicar a nota de corte** do nicho: score, views, engajamento, idade, modelabilidade.
6. **Diversificar** — dedupe por id, teto por handle, teto por nicho.
7. **Emitir** ranking `.md` + `.json` + atualizar `session.json`.
8. **Propor** hashtags novas vistas nas legendas e handles a promover para `anchor_profiles`.
9. **Rodar** `checklists/discovery-cutoff-checklist.md`.

## Nota de corte

Vem de `data/niches/{nicho}.yaml → cutoff`, sobrescrevendo `config/scoring-weights.yaml`.

## Modelabilidade preliminar

A F1 só tem metadados, então calcula apenas os sinais de `metadata_stage`
(duração, trilha identificada, legenda extensa). Os sinais que exigem o vídeo em disco —
cortes, take único, rosto — entram na **F2**. O relatório declara `stage: preliminary`
para que ninguém leia o número como definitivo.

## Quando zero criativos passam

Não é falha automaticamente. Na ordem:

1. Há falhas de captura? → problema de coleta, não de corte.
2. Os reprovados chegaram perto? → o corte pode estar rigoroso demais.
3. Todos reprovados por idade? → amplie `--hours`.
4. `anchor_profiles` vazio e hashtag falhou? → **não havia o que varrer.**

## Handoff

`ranking-{nicho}-{date}.json` → **@farming-analyst** (F2).
