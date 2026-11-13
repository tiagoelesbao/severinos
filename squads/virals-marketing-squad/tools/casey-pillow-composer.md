# Casey Pillow Composer Tool

**Tool ID:** `casey-pillow-composer`
**Agente:** @casey-neistat-img
**Versão:** 1.0.0

## Descrição

Interface de composição de imagens via Pillow + OpenCV + PyCairo.
Abstrai as operações de baixo nível em métodos declarativos para o agente.

---

## Operações Disponíveis

### `compose_post(config: dict) → PIL.Image`

Compõe um post completo a partir de uma configuração de layers.

```python
# Exemplo de uso
from tools.casey_pillow_composer import compose_post

result = compose_post({
    "canvas": {"width": 1080, "height": 1080, "background": "#1A1A2E"},
    "layers": [
        {
            "type": "image",
            "path": "assets/hero.png",
            "position": (0, 0),
            "size": (1080, 1080),
            "opacity": 1.0,
            "blend_mode": "normal"
        },
        {
            "type": "color_overlay",
            "color": "#000000",
            "opacity": 0.4
        },
        {
            "type": "text",
            "content": "Headline do Post",
            "font": "fonts/Outfit-Bold.ttf",
            "font_size": 72,
            "color": "#FFFFFF",
            "position": "center",
            "max_width": 900
        },
        {
            "type": "logo",
            "path": "assets/logo-white.png",
            "position": "bottom-right",
            "size": (120, 40),
            "margin": 40
        },
        {
            "type": "vector_element",
            "shape": "line",
            "color": "#FF6B6B",
            "position": (90, 400),
            "size": (900, 4)
        }
    ]
})
result.save("output/post_1080x1080.png")
```

---

### `batch_apply_brand(dir: str, brand_config: dict) → list[str]`

Aplica brand identity em lote em uma pasta de imagens.

```python
paths = batch_apply_brand(
    dir="assets/raw/",
    brand_config=load_brand_config("data/clients/virals/brand-config.yaml")  # resolva via --client em produção
)
# Retorna lista de paths dos arquivos brandados
```

---

### `harmonize_palette(images: list[PIL.Image]) → list[PIL.Image]`

Aplica correção de cor batch via OpenCV para harmonizar paleta entre imagens.
Usado para garantir coerência visual entre slides de carrossel.

```python
slides = [PIL.Image.open(f) for f in slide_paths]
harmonized = harmonize_palette(slides)
for i, img in enumerate(harmonized):
    img.save(f"output/slide_{i+1:02d}.png")
```

---

### `render_vector(config: dict) → PIL.Image`

Renderiza elementos vetoriais via PyCairo e retorna como PIL.Image para composição.

```python
vector_img = render_vector({
    "shapes": [
        {"type": "rectangle", "x": 90, "y": 900, "w": 900, "h": 4, "color": "#FF6B6B"},
        {"type": "circle", "cx": 540, "cy": 200, "r": 80, "fill": "#2D2D5E", "stroke": "#FF6B6B"}
    ],
    "canvas_size": (1080, 1080)
})
```

---

### `export_formats(image: PIL.Image, slug: str, formats: list) → dict`

Exporta uma imagem nos formatos configurados.

```python
manifest = export_formats(
    image=composed_image,
    slug="lancamento-produto",
    formats=["1:1", "4:5", "9:16"]
)
# Retorna: {"1:1": {"png": "path", "webp": "path"}, ...}
```

---

## Dependências Python

```txt
Pillow>=10.0.0
opencv-python>=4.8.0
pycairo>=1.24.0
Wand>=0.6.0
numpy>=1.24.0
PyYAML>=6.0
```

## Instalação

```bash
pip install Pillow opencv-python pycairo Wand numpy PyYAML
```

> **Nota:** PyCairo requer libcairo instalada no sistema.
> - Windows: `pip install pycairo` (wheel incluído)
> - Linux: `sudo apt install libcairo2-dev && pip install pycairo`

---

_Tool Version: 1.0.0_
_Last Updated: 2026-05-10_
