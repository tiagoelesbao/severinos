# Aplicar Color Grading com LUTs

**Task ID:** `sam-color-grade`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Aplicar Color Grading com LUTs |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Agent` |
| **input** | ["video_path", "lut_preset", "intensity_pct", "base_correction"] |
| **output** | ["graded_video (MP4)", "grade_report (JSON)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## LUTs Disponíveis (`sam-lut-library.yaml`)

| Preset | Mood | Uso Recomendado |
|--------|------|-----------------|
| `cinematic-warm` | Quente, âmbar, cinematográfico | Reels de lifestyle, viagem, motivacional |
| `neutral-grade` | Cor correta, neutro | Entrevistas, tutoriais, podcasts |
| `cool-blue` | Frio, azul, high-tech | Tech, finanças, SaaS |
| `matte-fade` | Desbotado, matte, editorial | Moda, lifestyle premium |
| `high-contrast` | Contraste alto, preto profundo | Esporte, fitness, ação |
| `vintage-film` | Grão de filme, sépia suave | Conteúdo nostálgico, storytelling |

## Input

- **video_path** (path): Vídeo para aplicar grading. Required: Yes
- **lut_preset** (string): Nome do LUT de `sam-lut-library.yaml`. Required: Yes
- **intensity_pct** (integer): Intensidade do LUT (0-100%). Padrão: 85. Required: No
- **base_correction** (boolean): Aplicar correção base antes do LUT (normalizar exposição/WB). Padrão: `true`. Required: No

## Output

- **graded_video** (MP4): Vídeo com grading aplicado
- **grade_report** (JSON): LUT usado, intensidade, correção base, antes/depois de histogram

## Action Items

### Step 1: Analisar Imagem Base
Extrair frame representativo do vídeo (frame no 25% da duração).
Analisar histogram de luminância e distribuição de cor.
Identificar problemas: subexposição, dominante de cor, baixo contraste.

### Step 2: Aplicar Correção Base (se base_correction=true)
Via FFmpeg filtros `eq` e `colorbalance`:
- Normalizar exposição (brightness/contrast)
- Corrigir white balance se dominante de cor identificada
- Equalizar luminância para compatibilidade com o LUT

```bash
ffmpeg -i input.mp4 -vf "eq=brightness=0.05:contrast=1.1:saturation=1.1" corrected.mp4
```

### Step 3: Carregar e Aplicar LUT
Resolver path do LUT a partir de `sam-lut-library.yaml`.
Aplicar via FFmpeg lut3d:
```bash
ffmpeg -i corrected.mp4 -vf "lut3d={lut_path}" -b:v 10M graded.mp4
```

Para intensidade < 100%: usar `mix` filter para blending:
```bash
-vf "lut3d={lut_path},blend=all_expr='A*{intensity}+B*(1-{intensity})'"
```

### Step 4: Validar Resultado Visual
Extrair frame do vídeo gradado e comparar com frame original.
Verificar: tons de pele naturais (se houver pessoa), negros profundos, brancos limpos.
Gerar comparação lado a lado como imagem de validação.

### Step 5: Export e Grade Report
Exportar vídeo final com qualidade preservada (bitrate ≥ original).
Gerar grade_report.json com LUT, intensidade, histogram antes/depois.

## Acceptance Criteria

- [ ] **AC-1:** LUT aplicado — diferença visual clara e intencional em relação ao original
- [ ] **AC-2:** Tons de pele naturais (se pessoa presente) — sem dominante de cor artificial
- [ ] **AC-3:** Intensidade respeitada — LUT a 50% não deve parecer 100%
- [ ] **AC-4:** grade_report.json com LUT identificado e intensidade documentada

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
