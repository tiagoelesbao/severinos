# Criar Template Visual Reutilizável

**Task ID:** `casey-template-create`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Template Visual Reutilizável |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Hybrid` |
| **input** | ["template_brief", "brand_config", "template_type"] |
| **output** | ["template_py (script)", "template_preview (PNG)", "template_metadata (YAML)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | true |

## Input

- **template_brief** (object): Nome, propósito, variáveis (campos que mudam por uso), formato. Required: Yes
- **brand_config** (path): `data/clients/<slug>/brand-config.yaml` (resolvido via --client, default `virals`). Required: Yes
- **template_type** (enum): `"post-single"` | `"carousel-slide"` | `"stories"` | `"thumbnail"`. Required: Yes

## Output

- **template_py**: Script Python comentado que gera a imagem a partir de variáveis
- **template_preview**: Preview da imagem gerada com dados de exemplo
- **template_metadata** (YAML): Nome, variáveis expostas, formato, versão

## Action Items

### Step 1: Definir Variáveis do Template
Identificar todos os campos que mudam por uso: headline, body_text, image_path, cta_text, accent_color.
Definir campos fixos de marca: logo, font_family, primary_color, layout_grid.
Documentar variáveis com tipo e valor padrão.

### Step 2: Definir Grid e Layout
Mapear posições de cada elemento em pixels para o formato alvo.
Definir safe zones (margens mínimas de 60px).
Definir z-order das layers (background, imagem, overlay, texto, logo).

### Step 3: Gerar Script Python Base
Criar `templates/{template_name}.py` com:
- Classe `Template{Name}` com método `render(variables: dict) -> PIL.Image`
- Cada layer como método separado (legível e extensível)
- Docstrings em cada método explicando o que faz
- Comentários inline para facilitar customização
- Exemplo de uso no bloco `if __name__ == "__main__"`

### Step 4: Gerar Preview com Dados de Exemplo
Instanciar o template com valores de exemplo realistas.
Salvar preview em `templates/previews/{template_name}_preview.png`.
Gerar também versão anotada (com labels indicando cada variável).

### Step 5: Documentar em YAML
Criar `templates/{template_name}.yaml`:
```yaml
name: template-nome
type: post-single
format: "1:1"
version: "1.0.0"
variables:
  - name: headline
    type: string
    max_chars: 60
    required: true
  - name: image_path
    type: path
    required: false
    default: "assets/default-bg.png"
preview: "previews/template-nome_preview.png"
script: "template-nome.py"
```

## Acceptance Criteria

- [ ] **AC-1:** Script Python roda sem erro e gera imagem idêntica ao preview
- [ ] **AC-2:** Todas as variáveis documentadas no YAML com tipo e required
- [ ] **AC-3:** Preview gerado com dados de exemplo realistas
- [ ] **AC-4:** Script comentado e legível — não requer conhecimento prévio de Pillow

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
