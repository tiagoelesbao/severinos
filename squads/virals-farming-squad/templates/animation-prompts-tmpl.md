# Template — Prompts de Animação (F5)

```yaml
template:
  id: animation-prompts-tmpl
  version: 1.0.0
  owner: farming-modeler
  output: prompts-animacao.md
  consumed_by: farming-animator
```

---

# Prompts de Animação · {{handle}} · rank {{rank}}

**Nicho:** {{nicho}} · **Takes:** {{take_count}} · **Formato:** 9:16
**Tier preferido do nicho:** `{{video_preferred_tier}}` — {{rationale}}

> Cada take tem **duas** especificações: o prompt para IA de vídeo (tiers A e B) e o
> preset procedural equivalente (tier C). A cascata escolhe conforme cota e nicho, e o
> take sai dos dois jeitos — o tier C nunca falha.

---

## Take {{n}} — {{função}}

| Campo | Valor |
|:---|:---|
| Imagem de entrada | `images/take-{{n}}.png` |
| Duração | {{dur}}s |
| Função narrativa | {{hook / desenvolvimento / fechamento}} |

### Prompt para IA de vídeo (tier A/B)

```text
{{movimento de câmera + movimento do sujeito + intensidade + o que NÃO deve mudar}}
```

**O que não pode mudar:** enquadramento geral, paleta, identidade da cena.
**Negativos:** morphing de rosto, deformação de mãos/patas, mudança de cena, texto surgindo,
câmera frenética, corte no meio do take.

### Preset procedural equivalente (tier C)

| Campo | Valor |
|:---|:---|
| Preset | `{{slow-push-in / slow-pull-out / pan-lr / pan-ud / parallax-2p5d / breathing}}` |
| Intensidade | {{sutil / média}} |
| Direção | {{quando aplicável}} |

> Em nicho estático, o preset procedural **não é uma degradação** — é a estética nativa
> que performa. Religioso e cartomante rodam tier C por escolha.

---

## Mapa de movimento por função

| Função do take | Movimento | Preset procedural |
|:---|:---|:---|
| Hook (0–3s) | Puxa para dentro da cena | `slow-push-in` |
| Desenvolvimento | Mantém vivo sem distrair | `pan-lr` ou `breathing` |
| Fechamento | Abre e conclui | `slow-pull-out` |

---

## Regras que este documento obedece

1. **Movimento serve ao beat**, não ao efeito. Take frenético mata retenção.
2. **A duração espelha o ritmo de corte do benchmark**, não um default.
3. **Onde a IA erra** (mãos, patas, rostos em movimento), prefira enquadramento que não os
   exponha ou caia para procedural — erro de anatomia em movimento é mais visível que
   ausência de movimento.
4. **Cota de tier A** só onde o movimento **é** o conteúdo (`prefer_generated_motion: true`).
