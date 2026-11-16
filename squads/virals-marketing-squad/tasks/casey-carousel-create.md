# Criar Carrossel Informativo Multi-Slide

**Task ID:** `casey-carousel-create`
**Pattern:** VM-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Carrossel Informativo Multi-Slide |
| **status** | `pending` |
| **responsible_executor** | @casey-neistat-img |
| **execution_type** | `Hybrid` |
| **input** | ["carousel_brief", "brand_config", "slide_count (3-15)", "content_data"] |
| **output** | ["slides_dir (PNG/WebP por slide)", "carousel_manifest (JSON)", "zip_export"] |
| **action_items** | 7 steps |
| **acceptance_criteria** | 6 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Hybrid |
| **Pattern** | VM-EP-003 |
| **Executor** | @casey-neistat-img |
| **Rationale** | Decisão criativa na estrutura narrativa + execução automatizada de todos os slides |

## Regra Narrativa do Carrossel (OBRIGATÓRIO)

> ⚠️ **REGRA DE OURO**: Todo carrossel segue a estrutura: Hook → Valor → CTA

```
Slide 1 (Hook):     Promessa irresistível + visual de parada de scroll
Slides 2 a N-1:     Um conceito/benefício por slide — consistência visual
Slide N (CTA):      Chamada clara + reforço de marca + next step
```

**Coerência visual entre slides:**
- Mesma paleta de cores em todos os slides
- Tipografia consistente (variações de peso, não de família)
- Elementos de marca nos mesmos pontos em cada slide
- OpenCV aplica filtro de cor unificado em batch para harmonia

## Input

- **carousel_brief** (object)
  - Description: Tema, objetivo, tom (educativo/inspiracional/promocional), referências
  - Required: Yes
- **brand_config** (path)
  - Description: Caminho para `data/clients/<slug>/brand-config.yaml` (resolvido via --client, default `virals`)
  - Required: Yes
- **slide_count** (integer)
  - Description: Número total de slides incluindo capa e CTA (padrão: 7, máx: 15)
  - Required: Yes
- **content_data** (array)
  - Description: Array com conteúdo de cada slide [{slide_n, headline, body, visual_ref}]
  - Required: Yes

## Output

- **slides_dir** (directory)
  - Description: Pasta com cada slide numerado — `slide_01.png`, `slide_02.png`, etc.
- **carousel_manifest** (JSON)
  - Description: Manifesto com estrutura narrativa, paths, tokens aplicados
- **zip_export** (file)
  - Description: ZIP com todos os slides prontos para upload direto no Instagram/Meta

## Action Items

### Step 1: Validar Briefing e Estrutura Narrativa

Verificar carousel_brief: tema, objetivo e tom identificados.
Confirmar slide_count (mín 3, máx 15).
Mapear conteúdo por slide: Slide 1 é hook, último é CTA, intermediários são valor.
Se content_data incompleto: elicitar do usuário as informações faltantes por slide.

### Step 2: Planejar Layout Master

Definir grid master que será replicado em todos os slides:
- Posição do número de slide (superior esquerdo)
- Safe zone para texto (marg. 60px mínimo)
- Posição do logo (superior direito ou rodapé)
- Área de imagem vs área de texto
- Cor de fundo padrão + variações para slides de destaque

### Step 3: Gerar/Processar Imagens de Cada Slide

Para slides com imagem:
- Verificar se imagem foi fornecida ou gerar via IA (FLUX/Diffusers)
- Aplicar crop para formato 1:1 (1080x1080) mantendo ponto de interesse
- Pré-processar via OpenCV para equalizar brilho e saturação entre slides

Para slides texto-over-color:
- Gerar fundo com gradiente da paleta do brand_config
- Definir contraste suficiente para o texto

### Step 4: Compor Cada Slide com Pillow

Para cada slide (iteração automatizada):
1. Aplicar background (imagem processada ou cor de marca)
2. Overlay semi-transparente se necessário para legibilidade
3. Headline do slide — fonte, tamanho, posição do template master
4. Body text (máx 3 linhas — brevidade é lei no carrossel)
5. Número do slide (ex: "3/7") em posição padronizada
6. Elementos vetoriais PyCairo (bordas de cor, separadores)
7. Logo em posição consistente

### Step 5: Aplicar Coerência Visual em Batch via OpenCV

Após gerar todos os slides individualmente:
- Carregar todos os slides em memória
- Calcular histograma médio de cor do conjunto
- Aplicar correção de cor em cada slide para harmonizar a série
- Garantir que a transição visual entre slides seja fluida

### Step 6: Exportar e Empacotar

- Salvar cada slide como PNG (qualidade máxima) e WebP
- Numerar sequencialmente: slide_01, slide_02, ... slide_0N
- Gerar carousel_manifest.json com estrutura narrativa e paths
- Criar ZIP com todos os slides em ordem

### Step 7: Validar Carrossel Completo

Revisar sequência completa:
- Slide 1 é visualmente impactante e cria curiosidade?
- Transição visual entre slides é harmoniosa?
- Slide final tem CTA claro e visível?
- Nenhum slide tem texto cortado ou ilegível?
- ZIP está organizado e pronto para upload?

## Acceptance Criteria

- [ ] **AC-1:** Slide 1 (hook) com visual de impacto + headline que cria curiosidade
- [ ] **AC-2:** Todos os slides intermediários com um conceito único cada (não sobrecarga)
- [ ] **AC-3:** Último slide com CTA explícito e visível
- [ ] **AC-4:** Coerência visual entre todos os slides (paleta, fontes, layout)
- [ ] **AC-5:** carousel_manifest.json gerado com estrutura narrativa documentada
- [ ] **AC-6:** ZIP exportado pronto para upload direto (slides em ordem correta)

## Validation Checklist (VM-TP-001)

- [x] `task_name` follows "Verb + Object" format
- [x] `status` is one of: pending | in_progress | completed
- [x] `responsible_executor` is clearly specified
- [x] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [x] `input` array has at least 1 item
- [x] `output` array has at least 1 item
- [x] `action_items` has clear, actionable steps
- [x] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: VM-TP-001_
_Last Updated: 2026-05-10_
_Compliant: Yes_
