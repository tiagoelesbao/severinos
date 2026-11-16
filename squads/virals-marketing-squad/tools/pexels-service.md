# Tool: Pexels Service (`pexels_service.py`)

**Tool ID:** `pexels-service`
**Version:** 1.0.0
**Last Updated:** 2026-05-19
**Used By:** `creative-render` (PHASE-6 do `design-creative.workflow.md`)
**Source:** `squads/virals-marketing-squad/tools/pexels_service.py`

## Responsibility

Curadoria e download de imagens reais do Pexels para os slides do criativo Virals. Orientation-aware (HOOK ⇒ portrait; demais ⇒ landscape). Retorna até 15 candidatos por query para o curador escolher pelo melhor contexto.

## Inputs

- `query` (string) — frase/palavra-chave derivada do slide (`pexels_query` ou `_fallback_query`).
- `output_dir` (path) — destino `apps/creative-design/public/render-assets/`.
- `stem` (string) — prefixo de arquivo (`px_{slug}_{slide_n}_{ts}`).
- `orientation` (enum) — `portrait` | `landscape`.

## Outputs

- Arquivo `.jpg/.png` salvo em `output_dir`. Retorno: path absoluto.

## Failure Modes

| Cenário | Comportamento |
|---|---|
| `PEXELS_API_KEY` ausente | Skip silencioso (slide segue sem imagem) |
| Query sem resultados | Skip silencioso |
| Rate limit / 429 | Skip silencioso (slide segue sem imagem) |

## Configuração

- `PEXELS_API_KEY` — em `.env` (gitignored, NUNCA em arquivo tracked).

## Boundary

Não-fatal — falha de Pexels NUNCA derruba o batch de render.
