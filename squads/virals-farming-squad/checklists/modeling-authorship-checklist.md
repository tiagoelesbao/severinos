# Modeling Authorship Checklist — Gate F3

```yaml
checklist:
  id: modeling-authorship-checklist
  version: 1.0.0
  owner: farming-modeler
  mode: blocking
  phase: f3-modeling
  purpose: "Separar modelagem de cópia, e garantir que os prompts são executáveis por um motor"
```

> Este é o gate **mais barato** do pipeline. Reprovar aqui custa uma reescrita; reprovar
> na F6 custa toda a cota de geração de imagem e vídeo já queimada.

---

## 1. Descarte de camadas (pré-tradução)

```yaml
layer_stripping:
  - id: discard-section-exists
    check: "prompts-imagem.md abre com a seção de camadas descartadas"
    type: blocking
  - id: captions-discarded
    check: "Legenda queimada e texto na tela declarados como descartados"
    type: blocking
  - id: ui-discarded
    check: "UI do TikTok declarada como descartada — botões, avatar, contadores, busca"
    type: blocking
  - id: watermark-discarded
    check: "Marca d'água do TikTok declarada como descartada"
    type: blocking
  - id: author-text-discarded
    check: "@handle e texto do autor declarados como descartados"
    type: blocking
  - id: occlusions-declared
    check: "Áreas ocluídas por sobreposição estão declaradas, não inventadas"
    type: blocking
    terminal: true
    rationale: >
      Quando uma cartela cobre metade do frame, descrever o que 'deve estar' atrás é
      invenção (Article IV). Declara-se a oclusão e descreve-se só o visível.
```

## 2. Autoria

```yaml
authorship:
  - id: structure-preserved
    check: "Ritmo, enquadramento e progressão do original preservados"
    type: blocking
  - id: content-replaced
    check: "Sujeito, cena e falas literais foram trocados"
    type: blocking
  - id: not-a-copy
    check: "O plano não reproduz a fala palavra por palavra nem a mesma pessoa em cena"
    type: blocking
  - id: no-identity-carryover
    check: "Nenhum elemento identificável do autor original sobrevive no plano"
    type: blocking
```

## 3. Executabilidade dos prompts

```yaml
prompt_quality:
  - id: one-prompt-per-take
    check: "Há um prompt de imagem e um de animação por take"
    type: blocking
  - id: dimensions-complete
    check: "Cada tradução cobre enquadramento, sujeito, fundo, luz, cor, textura e lente"
    type: blocking
  - id: no-text-requested
    check: "Nenhum prompt de imagem pede texto, letra ou tipografia"
    type: blocking
    note: "Modelo erra tipografia e texto gerado não é editável. Texto entra na F6."
  - id: no-real-faces
    check: "Nenhum prompt pede rosto de pessoa real ou identificável"
    type: blocking
  - id: seed-locked
    check: "Todos os takes do criativo compartilham a mesma seed"
    type: blocking
    note: "Sem isso, o criativo montado parece colagem de três vídeos diferentes."
  - id: niche-style-applied
    check: "O visual_style do nicho está aplicado em todos os prompts"
    type: blocking
  - id: avoid-list-respected
    check: "Nada de avoid_in_prompt do nicho aparece nos prompts"
    type: blocking
  - id: motion-has-both-specs
    check: "Cada take tem prompt de IA de vídeo E preset procedural equivalente"
    type: blocking
    note: "O tier C precisa conseguir entregar o take sem consultar ninguém."
```

## 4. Rastreabilidade (Article IV)

```yaml
no_invention:
  - id: claims-anchored
    check: "Toda afirmação do plano aponta para um frame, um trecho da transcrição ou um campo do benchmark.json"
    type: blocking
  - id: no-invented-numbers
    check: "Nenhum número, data ou estatística que não esteja no pack"
    type: blocking
```

### Gate terminal — nicho `noticias`

```yaml
fact_fidelity:
  - id: anchor-table-present
    check: "O plano traz a tabela afirmação → trecho literal da transcrição"
    type: blocking
    terminal: true
  - id: every-claim-has-quote
    check: "Nenhuma afirmação factual sem citação literal correspondente"
    type: blocking
    terminal: true
```

## 5. Guardrails do nicho

```yaml
guardrails:
  - id: rules-checked-before-writing
    check: "Os guardrails foram consultados ANTES de escrever o plano, não depois"
    type: blocking
  - id: blocked-terms-absent
    check: "Nenhum blocked_terms no plano, nos textos de tela ou na descrição"
    type: blocking
  - id: required-framing-included
    check: "Enquadramento obrigatório do nicho presente quando exigido"
    type: blocking
    conditional: "niche.guardrails.required_framing existe"
```

---

## Veredito

| Resultado | Condição | Próximo passo |
|:---|:---|:---|
| **PASS** | 100% blocking | Aprovação do dono → F4 |
| **CONCERNS** | 100% blocking, ajustes menores | Aprovação com observações |
| **FAIL** | Qualquer blocking reprovado | Reescreve — **antes** de gastar cota |
| **BLOCKED** | Gate terminal reprovado | Criativo sai do lote |

> **Aprove aqui.** Depois deste gate, cada erro custa cota de imagem e de vídeo.
