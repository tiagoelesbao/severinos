# Criar Títulos Animados e Motion Graphics

**Task ID:** `sam-motion-title`
**Pattern:** VM-TP-001
**Version:** 1.0.0
**Last Updated:** 2026-05-10

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Títulos Animados e Motion Graphics |
| **status** | `pending` |
| **responsible_executor** | @sam-kolder-vid |
| **execution_type** | `Hybrid` |
| **input** | ["video_path (opcional)", "title_brief", "animation_style", "brand_config"] |
| **output** | ["titled_video (MP4)", "title_element (MP4 transparent, opcional)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |
| **elicit** | true |

## Estilos de Animação Disponíveis

| Style | Descrição | Uso |
|-------|-----------|-----|
| `slide-in` | Texto desliza da esquerda/direita | Hook text em Reels |
| `fade-up` | Texto sobe com fade | Títulos de seção suaves |
| `typewriter` | Texto aparece letra por letra | Tutoriais, revelações |
| `pop` | Texto escala de 0 para 100% com bounce | Momentos de destaque |
| `lower-third` | Barra inferior com nome/título | Entrevistas, apresentações |
| `kinetic` | Texto em movimento sincronizado com ritmo | Reels musicais |
| `caption-highlight` | Palavra-chave muda de cor em destaque | Reels educativos |

## Input

- **video_path** (path): Vídeo base para compositar o título. Se ausente, gera elemento standalone. Required: No
- **title_brief** (object): Texto, subtítulo, duração da animação, posição na timeline. Required: Yes
- **animation_style** (string): Um dos estilos da tabela acima. Required: Yes
- **brand_config** (path): `data/clients/<slug>/brand-config.yaml` (resolvido via --client) para cores e fontes. Required: Yes

## Output

- **titled_video** (MP4): Vídeo com título animado composito
- **title_element** (MP4 transparent): Elemento de título isolado com canal alpha (para reutilização)

## Action Items

### Step 1: Definir Parâmetros da Animação
Extrair do title_brief: texto, duração (in/hold/out), posição (x,y), tamanho.
Carregar brand_config: fonte, cor primária, cor de destaque.
Selecionar animation_style e configurar keyframes.

### Step 2: Gerar Animação com Movis ou MoviePy
**Via Movis (recomendado para animações complexas):**
```python
import movis as mv
comp = mv.layer.Composition(size=(1080,1920), duration=3.0)
text_layer = comp.add_layer(mv.layer.Text("Texto do Título"))
text_layer.position.enable_motion()
text_layer.position.append(0.0, (0, 1920))  # fora do frame
text_layer.position.append(0.3, (540, 200))  # posição final
```

**Via MoviePy (para animações simples):**
```python
from moviepy import TextClip, CompositeVideoClip
txt = TextClip("Texto", fontsize=70, color='white', font='Arial-Bold')
txt = txt.with_position(('center', 100)).with_duration(3)
```

### Step 3: Compositar no Vídeo
Se video_path fornecido: sobrepor animação no vídeo usando CompositeVideoClip (MoviePy) ou overlay (FFmpeg).
Posicionar na timeline conforme title_brief.start_time.

### Step 4: Gerar Elemento Standalone (opcional)
Exportar título como MP4 com fundo preto ou com canal alpha (ProRes 4444 ou WebM com VP9).
Nomear: `title_element_{style}_{slug}.mp4`.

### Step 5: Export Final
Exportar vídeo composito em MP4 H.264.
Verificar que animação está em sincronia com o início esperado.

## Acceptance Criteria

- [ ] **AC-1:** Animação segue o estilo selecionado sem artefatos visuais
- [ ] **AC-2:** Tipografia e cores respeitam brand_config
- [ ] **AC-3:** Timing correto — animação não corta nem extrapola o clip
- [ ] **AC-4:** Elemento standalone gerado para reutilização futura (se solicitado)

---
_Task Version: 1.0.0 | Pattern: VM-TP-001 | Last Updated: 2026-05-10_
