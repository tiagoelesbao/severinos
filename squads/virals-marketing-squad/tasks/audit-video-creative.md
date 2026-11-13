# Task: audit-video-creative

**Tipo:** Quality Gate (auditoria pós-automação)
**Squad:** Virals Marketing
**Quando:** após a automação montar a timeline do vídeo (Fase B) e ANTES do export.
**Checklist:** [`video-creative-quality-gate.md`](../checklists/video-creative-quality-gate.md)

## Propósito
Auditar — como etapa do FLUXO, não como painel do editor — o vídeo montado
automaticamente a partir do benchmark + materiais gravados. Garante qualidade
superior na entrega: legendas corretas, cortes congruentes, ordem dos clips,
composição on-brand e integração com o template base.

## Entradas
- `client`, `creative` (slug do criativo em `outputs/{client}/video-plans/{creative}`).
- `transcript.json` (transcrição das gravações) + `Plano-de-Criativo.md`.
- Timeline montada (via `ingestCreative`).

## Passos
1. **Carregar contexto** — `ingestCreative` (timeline), `loadTranscript`, roteiro do Plano.
2. **Rodar o motor de auditoria** — `apps/video-studio/src/lib/audit.ts` → `buildAudit`:
   - Gate A (congruência gravação↔plano) + Gate B (legendas: ritmo/palavras; edição:
     playbackRate extremo, clips curtos, gaps) + **score 0–100**.
3. **Revalidar pós-gravação** — `scripts/revalidate.ts`:
   - congruência %, roteiro readequado proposto; `--apply` reescreve o Plano se aprovado.
   - Comando: `node apps/video-studio/scripts/revalidate.ts {client} {creative}`
   - Artefato: `outputs/{client}/video-plans/{creative}/revalidation.md`.
4. **Preencher o checklist** `video-creative-quality-gate.md` com a evidência (score,
   congruência, achados abertos).
5. **Veredito:**
   - **PASS** (score ≥ 85 e 0 erros) → liberar para export (MVC-11).
   - **CONCERNS** (avisos de produto/refinamento) → entregar com ressalvas registradas.
   - **FAIL** (erros: gaps, material ausente, legendas erradas) → voltar ao ajuste fino
     no `/studio` (ou regravar) antes de exportar.

## Saídas
- Checklist preenchido (PASS/CONCERNS/FAIL + notas).
- `revalidation.md` (se houver divergência plano↔gravação).
- Plano readequado (se `--apply`).

## Notas
- O motor (`audit.ts`/`revalidate.ts`) é **reutilizável e determinístico** — a mesma
  timeline gera a mesma auditoria.
- Esta task **substitui** o antigo painel de auditoria do frontend: auditoria é
  responsabilidade do FLUXO (squad), não do editor manual.
