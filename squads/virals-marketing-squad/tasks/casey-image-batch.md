# Processar Lote de Imagens (Resize, Brand, Export)

**Task ID:** `casey-image-batch`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Processar Lote de Imagens |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **input** | ["input_dir", "operations", "format_presets", "brand_config (opcional)"] |
| **output** | ["output_dir", "batch_report (JSON)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## Input

- **input_dir** (path): Pasta com imagens brutas. Required: Yes
- **operations** (array): `["resize", "brand", "export", "convert", "optimize"]`. Required: Yes
- **format_presets** (array): `["1:1", "4:5", "9:16", "16:9"]`. Required: Yes
- **brand_config** (path): Brand config se "brand" incluído em operations. Required: No

## Output

- **output_dir**: Subpastas por formato: `output/1x1/`, `output/4x5/`, `output/9x16/`
- **batch_report** (JSON): Total processado, erros, warnings, tempo total

## Action Items

### Step 1: Scan e Validar Input
Listar assets em input_dir (JPG, PNG, WebP, TIFF). Estimar tempo e exibir resumo: "X imagens | Operações: Y | Formatos: Z".

### Step 2: Aplicar Pipeline de Operações
Para cada imagem via Pillow + OpenCV:
- `resize`: crop inteligente para cada formato alvo
- `brand`: aplica logo + overlay (usa casey-image-brand internamente)
- `convert`: converte formato
- `optimize`: comprime (PNG: otimize=True, WebP: quality=85)
- `export`: salva com nomenclatura padronizada

### Step 3: Organizar Output por Formato
```
output/
  1x1/   → 1080x1080
  4x5/   → 1080x1350
  9x16/  → 1080x1920
  16x9/  → 1920x1080
```
Nomear: `{nome-original}_{formato}.{ext}`

### Step 4: Gerar Batch Report JSON
```json
{
  "total_input": N, "total_processed": N, "total_errors": 0,
  "operations_applied": [], "formats_exported": [],
  "processing_time_s": 45, "output_dir": "path/"
}
```

### Step 5: Verificar Amostras
Validar 10% aleatório: dimensões, qualidade, branding.

## Acceptance Criteria

- [ ] **AC-1:** 100% dos assets elegíveis processados sem crash
- [ ] **AC-2:** Estrutura de output organizada por formato
- [ ] **AC-3:** batch_report.json com métricas completas
- [ ] **AC-4:** Erros documentados com path e causa

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
