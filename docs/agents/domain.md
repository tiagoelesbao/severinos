# Documentação de domínio

Como as skills de engenharia devem consumir o vocabulário deste repositório ao explorar o código.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repo — o glossário do domínio.
- **`docs/architecture/adr/`** — leia os ADRs que tocam a área em que você vai trabalhar.

Layout **single-context**: um `GLOSSARY.md` só, na raiz. Este repo é um monorepo de muitos
produtos, mas o vocabulário é compartilhado entre eles (um "take", uma "cartela", um "Lote"
significam a mesma coisa no canal de futebol, no farming e no video-studio) — é exatamente esse
compartilhamento que justifica um glossário único.

Se um desses arquivos não existir, **siga em silêncio**. Não sinalize a ausência nem proponha
criá-los de antemão. A skill `/domain-modeling` (alcançada por `/grill-with-docs` e
`/improve-codebase-architecture`) os cria sob demanda, quando um termo ou uma decisão de fato se
resolve.

## Estrutura

```
/
├── GLOSSARY.md
├── docs/architecture/
│   ├── adr/
│   │   ├── 0001-<slug>.md
│   │   └── 0002-<slug>.md
│   └── etl-service-architecture.md
└── apps/ · services/ · squads/ · .aiox-core/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (título de story, proposta de refactor, hipótese,
nome de teste), use o termo como o `GLOSSARY.md` define. Não derive para sinônimos que o
glossário evita explicitamente.

Se o conceito que você precisa ainda não está no glossário, isso é um sinal: ou você está
inventando linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (anote para
`/domain-modeling`).

## ADR vs. Constitution vs. story

Três coisas diferentes, e confundi-las custa caro:

| Artefato | Responde | Mutabilidade |
|---|---|---|
| **Constitution** (`.aiox-core/constitution.md`) | Princípio inegociável do framework | L1 — não se altera |
| **ADR** (`docs/architecture/adr/`) | Decisão técnica difícil de reverter, com contexto e alternativas | Imutável depois de aceito; se muda, vira ADR nova que supersede |
| **Story** (`docs/stories/`) | O que será feito agora e como se prova que ficou pronto | Viva até `Done` |

Se sua saída contradiz um ADR existente, traga isso à superfície em vez de sobrescrever em
silêncio:

> _Contradiz o ADR-0007 (…), mas vale reabrir porque…_
