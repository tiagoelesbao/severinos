# Aplicar Identidade de Marca em Assets Existentes

**Task ID:** `casey-image-brand`
**Pattern:** VM-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Aplicar Identidade de Marca em Assets Existentes |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Agent` |
| **input** | ["assets_dir (path)", "brand_config", "brand_mode"] |
| **output** | ["branded_dir (path)", "branding_report (MD)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | false |

## Input

- **assets_dir** (path)
  - Description: Pasta com imagens brutas para receber branding
  - Required: Yes
- **brand_config** (path)
  - Description: `data/clients/<slug>/brand-config.yaml` (resolvido via --client) — paleta, fontes, logo, posições
  - Required: Yes
- **brand_mode** (enum)
  - Description: `overlay` (logo + cor) | `full` (composição completa) | `minimal` (logo apenas)
  - Required: Yes

## Output

- **branded_dir** (directory)
  - Description: Pasta `branded/` com versões processadas de cada imagem
- **branding_report** (markdown)
  - Description: Relatório com lista de assets processados, tokens aplicados e warnings

## Action Items

### Step 1: Inventariar Assets

Listar todos os arquivos em assets_dir (PNG, JPG, WebP).
Verificar dimensões mínimas (1080px mínimo no menor lado) — assets abaixo são upscalados ou ignorados com warning.
Contar total de arquivos e estimar tempo de processamento.

### Step 2: Carregar Brand Config

Extrair do brand-config do cliente (`clients/<slug>/brand-config.yaml`):
- Logo path e variantes (colorido, branco, preto)
- Paleta primária e secundária (hex values)
- Fontes headline e body (paths locais)
- Posições padrão de logo (canto, rodapé, etc.)
- Opacidade de overlay

### Step 3: Processar Cada Asset (Pillow + OpenCV)

Para cada imagem (loop batch automatizado):
- Modo `overlay`: adicionar logo em posição padrão + overlay de cor semi-transparente com cor primária da marca
- Modo `full`: crop para formato 1:1, aplicar overlay completo com headline space e logo
- Modo `minimal`: logo em posição padronizada, mínima interferência no original

Garantir que o logo seja redimensionado proporcionalmente para cada imagem.

### Step 4: Salvar e Nomear

Salvar em `branded/` com prefixo `branded_`:
- `branded_imagem-original.png`
- `branded_imagem-original.webp`
Preservar nomes originais para rastreabilidade.

### Step 5: Gerar Branding Report

Criar `branding_report.md` com:
- Total de assets processados
- Brand mode aplicado
- Lista de tokens de marca aplicados
- Warnings (imagens ignoradas por baixa resolução)
- Timestamp e brand_config version

## Acceptance Criteria

- [ ] **AC-1:** 100% dos assets elegíveis processados sem erro
- [ ] **AC-2:** Logo aplicado em posição consistente em todos os assets
- [ ] **AC-3:** Modo de branding aplicado corretamente conforme configuração
- [ ] **AC-4:** branding_report.md gerado com lista completa e warnings documentados

---

_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
