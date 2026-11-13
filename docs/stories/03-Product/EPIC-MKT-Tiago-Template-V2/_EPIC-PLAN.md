# EPIC-MKT-Tiago-Template-V2 — Refundação Visual + Recalibragem de Voz

**Status:** Aprovado pelo dono · 2026-05-25 — Path C (refundação completa)
**Autor:** @marketing-chief
**Trigger:** Output do `*design-creative` no `14-pablomarcal1-e129b8` (tiago-elesbao) com problemas concretos validados em screenshot do dono.

## O problema (observado em sessão real)

Após MCI-05 destravar o pipeline para vídeo→carrossel, o primeiro output real revelou 2 defeitos sistemáticos no template `carousel-step` (`tiago-step`) e na voz:

### Visual (template StepListSlide V1)
- **Slide 1 (HOOK):** 65% da altura é foto Pexels random (teto/janela de escritório) sem sujeito ou composição. Todo o texto desce ao rodapé. Vasta área morta superior. Gradiente âmbar parece acidente.
- **Slides 2-4 (STEP):** Estrutura Hormozi-style correta (número GIGANTE + linha + headline + body), mas fundo é **vazio preto** com só uma aurora âmbar diffusa. Zero textura, zero grain, zero elementos secundários — descumpre a tendência 2026 de "sensory-driven, tactile design".
- **Slide 4:** Renderizou como STEP padrão em vez do CTA_THINK (pergunta provocativa centralizada). **Bug de mapping no recast_engine.**
- **Acentos não-usados:** o brand-identity registra `accent_alt: #FF4D2E` (urgência), nunca explorado no template.
- **Hierarquia tipográfica plana:** só Outfit Black em tudo. Falta fonte secundária (mono ou serif) para números/labels.

### Conteúdo (plan_creative + recast_engine)
- **Slide 1 headline:** "PARA ALCANÇAR O EXTRAORDINÁRIO, É PRECISO DEIXAR O AMBIENTE QUE TE CRIOU" — viola "SEM RODEIO". É poético-motivacional, deveria ser direto + específico.
- **Slide 4 body:** "Comente 'SAI' se está pronto para deixar a **zona de conforto**" — duplo violação: (a) "zona de conforto" é cliché, (b) "Comente X" é literalmente listado em `cta_estilo.exemplos_proibidos` do brand-identity.
- **Slides 2-3 estão na voz Tiago** (NÚMERO + BASTIDOR + processo) — mostram que o motor consegue, mas não há gate que force isso.

## A visão — 2 frentes ortogonais

```
[V2-01 Design System Spec] ─┬─→ [V2-03 StepListSlide V2] ─┐
                            ├─→ [V2-04 FounderDiary cal.] ─┼─→ [V2-05 Audit + Re-render]
[V2-02 Voice Reinforcement] ┴─────────────────────────────┘
```

### Frente A — Visual (V2-01 + V2-03 + V2-04)
Construir um **Design System V2** documentado para Tiago, depois aplicar em 2 templates (StepListSlide V2 + FounderDiarySlide calibrado). Inspirações validadas via web research: Hormozi, Justin Welsh, Sahil Bloom + tendência 2026 de grain/textura/hand-drawn.

### Frente B — Voz (V2-02)
Injetar o léxico Tiago como **contexto rígido** nos prompts de `plan_creative.py` e `recast_engine.py`. Adicionar **blacklist de clichês** + **C8** no quality_gate (NÚMERO ou BASTIDOR obrigatório). Eliminar CTAs proibidos (per brand-identity).

### Frente C — Validação (V2-05)
Re-render do mesmo benchmark `14-pablomarcal1` com V2 + comparativo lado-a-lado V1 vs V2 + audit cruzado contra referências externas.

## Stories

| ID | Título | Owner | Pts | Depende de |
|----|--------|-------|-----|-----------|
| TIAGO-V2-01 | Design System V2 — pesquisa + spec | @casey-neistat-img | 3 | — |
| TIAGO-V2-02 | Voice Reinforcement em plan/recast/quality_gate | @ladeira + @hormozi-sales + @dev | 5 | — |
| TIAGO-V2-03 | StepListSlide V2 — implementação visual | @dev | 8 | V2-01 |
| TIAGO-V2-04 | FounderDiarySlide — calibração V2 | @dev | 5 | V2-01 |
| TIAGO-V2-05 | Audit cruzado + re-render comparativo | @marketing-chief | 3 | V2-03, V2-04 |

**Total:** 24 pontos · epic de porte **L-XL** · execução em ondas (V2-01+V2-02 paralelo → V2-03 → V2-04 → V2-05).

## Decisões (resolvidas pelo dono · 2026-05-25)

1. **Escopo:** ✅ Path C (refundação completa) escolhido sobre Path A (quick patch) e Path B (só template).
2. **Inspirações:** ✅ Hormozi, Welsh, Bloom, GaryVee (web research + brand-identity já mapeia).
3. **Templates atacados:** ✅ `carousel-step` (V2 completo) + `carousel-founder-diary` (calibração).
4. **Voz:** ✅ Reforço sistemático no motor — não tratar caso-a-caso.

## Relação com o que já existe

- **MCI-05** ✔ — destravou vídeo→carrossel; sem ela não chegaríamos a ver o defeito visual.
- **MCI-01..04** ✔ — análise + plano + recast plan-aware continuam usados.
- **Quality Gate (MCI-03)** será estendido com **C8** (não substituído).
- **`templates.yaml`** do Tiago já registra os 2 templates (V2-03 e V2-04 não mexem no registry, só nos componentes).
- **AGENTS.md** de `apps/creative-design/` exige leitura de `node_modules/next/dist/docs/` antes de codar — V2-03 e V2-04 respeitam.

## Dependências externas

- `node_modules/next/dist/docs/` (Next.js custom, leitura obrigatória pré-impl)
- Acesso a LLM (OpenRouter free → Gemini → OpenAI) — V2-02 reforça prompts
- Render service no ar (apps/creative-design `:3000` ou `:3001`) para V2-05

## Estimativa

5 stories · 24 pontos · epic L-XL. Maior epic do squad desde MCI (4 stories, 24 pts). Execução em pelo menos 2 sessões longas — onda 1 (V2-01+V2-02+V2-03) + onda 2 (V2-04+V2-05).

## Critério de sucesso da epic

Re-render do `14-pablomarcal1-e129b8` com:
- Visual significativamente mais "considerado" (grain, hierarquia, accents)
- Slide 1 com sujeito visual claro e headline específica
- Slide 4 corretamente como CTA_THINK provocativo (não "Comente X")
- Zero clichês motivacionais detectados pelo C8
- Audit cruzado com nota ≥ 8/10 em "fit à voz Tiago"
