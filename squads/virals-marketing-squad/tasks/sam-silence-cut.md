# Corte Automático de Silêncio

**Task ID:** `sam-silence-cut`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Corte Automático de Silêncio |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Agent` |
| **input** | ["video_path", "content_type", "threshold_pct", "preview_mode"] |
| **output** | ["cut_video (path)", "cut_report (JSON)"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 3 criteria |
| **elicit** | false |

## Thresholds por Tipo de Conteúdo

| Tipo | Threshold | Rationale |
|------|-----------|-----------|
| `reel` / `tiktok` | 4% | Conteúdo dinâmico — cortes agressivos |
| `interview` | 8% | Preservar respirações e pausas naturais |
| `podcast` | 10% | Cortar só silêncios longos |
| `tutorial` | 6% | Balanceado entre ritmo e clareza |
| `webinar` | 12% | Muito conservador — preservar contexto |

## Input

- **video_path** (path): Vídeo bruto para silence-cut. Required: Yes
- **content_type** (enum): `"reel"` | `"interview"` | `"podcast"` | `"tutorial"` | `"webinar"`. Required: Yes
- **threshold_pct** (float): Override manual do threshold (0-100%). Required: No (usa tabela acima)
- **preview_mode** (boolean): Se true, mostra preview sem salvar. Padrão: `false`. Required: No

## Output

- **cut_video** (path): Vídeo com silêncios removidos
- **cut_report** (JSON): Duração original, duração final, % de tempo salvo, N de cortes

## Action Items

### Step 1: Análise Prévia
Detectar content_type e selecionar threshold da tabela (ou usar override manual).
Executar auto-editor em modo `--preview` para mostrar resultado antes de aplicar.
Exibir: "Original: {dur_orig} → Estimado após corte: {dur_est} ({pct_salvo}% reduzido)"

### Step 2: Confirmar e Executar Silence-Cut
Se preview_mode=false: confirmar com usuário antes de processar.
Executar:
```bash
auto-editor {video_path} --silent-threshold {threshold}% --output {output_path}
```
Monitorar progresso com barra Rich.

### Step 3: Validar Output
Verificar que o vídeo gerado tem áudio contínuo sem cortes abruptos indesejados.
Reproduzir aleatoriamente 3 pontos do vídeo para verificar qualidade dos cortes.

### Step 4: Gerar Cut Report
```json
{
  "input": "raw_video.mp4",
  "output": "cut_video.mp4",
  "duration_original_s": 2700,
  "duration_output_s": 1980,
  "time_saved_pct": 26.7,
  "cuts_applied": 145,
  "threshold_used": 8,
  "content_type": "interview"
}
```

## Acceptance Criteria

- [ ] **AC-1:** Vídeo output sem silêncios perceptíveis acima do threshold configurado
- [ ] **AC-2:** Cortes não removem palavras (sem clipping de fala)
- [ ] **AC-3:** cut_report.json com métricas de redução documentadas

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
