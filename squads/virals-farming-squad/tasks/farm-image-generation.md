---
task_name: farm-image-generation
status: ready
responsible_executor: farming-imager
execution_type: hybrid
phase: f4-images
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - prompts-imagem.md do criativo
  - screenshots/ do pack (referência visual)
  - config/ai-providers.yaml + ledger de quota
  - mode: auto | hybrid
output: |
  - images/take-N.png — 9:16 (1080×1920), uma por take
  - images/_slots.json — manifesto do que a F5 espera
  - images/_prompts-para-colar.md — só no modo híbrido
pre_conditions: |
  - prompts-imagem.md aprovado na F3
  - modo auto: ao menos um provider com credencial OU tier C disponível
post_conditions: |
  - Toda imagem declarada em _slots.json existe e está em 9:16
  - Ledger de quota atualizado com o consumo real
acceptance_criteria: |
  - Nenhuma imagem contém texto renderizado
  - Nenhuma imagem contém rosto de pessoa real
  - Seed idêntica entre os takes do mesmo criativo
  - Auto e híbrido produzem a MESMA árvore de arquivos
---

# F4 — Geração de Imagens 9:16

Transforma cada prompt em imagem vertical pronta para animar. Dois modos, ambos de
primeira classe.

## Comando

```text
@farming-imager
*generate {rank|all} [--mode=auto|hybrid] [--tier=A|B|C]
*handoff {rank}       # empacota os prompts para geração manual
*verify               # confere existência e proporção
*quota                # cota restante por provider
```

## Cascata free-first

| Tier | Provider | Quando |
|:---|:---|:---|
| **A** | Gemini 2.5 Flash Image (Nano Banana), Imagen | cota disponível e fidelidade de enquadramento importa |
| **B** | FLUX.1-schnell (Together), SDXL (Cloudflare) | tier A esgotado |
| **C** | Pollinations.ai | sempre — sem chave, sem custo |

`429` ou `quota_exceeded` **rebaixa o tier e segue**. Cota estourada não interrompe o lote.
O consumo real vai para o ledger, que é a fonte de verdade — os `daily_limit` do YAML são
configuração, não fato verificado.

## Imagem de referência muda tudo

Providers com `supports_reference_image: true` recebem o **screenshot do benchmark** junto
com o prompt. É a diferença entre descrever um enquadramento e mostrá-lo — e é por isso
que o Gemini lidera o tier A.

## Action Items

1. **Carregar** `prompts-imagem.md` e `config/ai-providers.yaml`.
2. **Consultar o ledger** — quais providers ainda têm cota hoje.
3. **Resolver o tier** — `--tier` explícito > `niche_overrides` > tier A.
4. **Modo auto:** para cada take, chamar o provider do tier corrente enviando prompt +
   negativos + seed travada + referência visual quando suportada. Em `429`, rebaixar e repetir.
5. **Modo híbrido:** escrever `images/_prompts-para-colar.md` formatado por ferramenta-alvo
   (Krea, Leonardo, Gemini, ChatGPT) e `images/_slots.json`. Parar e aguardar os arquivos.
6. **Validar** 9:16 em cada arquivo entregue.
7. **Atualizar** o ledger e reportar: imagens ok, takes sem imagem, provider por take.

## Paridade entre os modos

```text
images/
├── take-1.png
├── take-2.png
├── _slots.json                    # sempre
└── _prompts-para-colar.md         # só no híbrido
```

A F5 **não sabe** qual modo foi usado. Essa é a garantia que torna o híbrido utilizável
sem bifurcar o pipeline.

## Consistência entre takes

Takes do mesmo criativo precisam parecer o mesmo mundo: **mesma seed** e **mesmo sufixo de
estilo** (`modeling.visual_style` do nicho) em todos. Sem isso, o criativo montado parece
uma colagem de três vídeos diferentes.

## Regras invioláveis

1. Toda imagem em **9:16 (1080×1920)**.
2. **Nunca** texto renderizado — texto é da F6, onde é vetorial e corrigível.
3. **Nunca** rosto de pessoa real ou identificável.
4. `avoid_in_prompt` do nicho respeitado **antes** de qualquer chamada de API.

## Handoff

`images/` + `_slots.json` → **@farming-animator** (F5).
