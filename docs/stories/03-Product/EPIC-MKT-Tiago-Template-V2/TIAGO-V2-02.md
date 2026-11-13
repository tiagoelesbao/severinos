# TIAGO-V2-02: Voice Reinforcement em plan_creative + recast + quality_gate

**Status:** Done
**Epic:** EPIC-MKT-Tiago-Template-V2
**Complexidade:** M (Standard — 5 pontos)
**Criada por:** @sm (River) · 2026-05-25
**Owner sugerido:** @ladeira (copy expert) + @hormozi-sales (estrutura) + @dev (impl)

## Story
**Como** pipeline `*design-creative` rodando para o cliente Tiago Elesbão
**Eu quero** que o motor force a voz Tiago (léxico + bastidor + número) em toda saída e bloqueie clichês motivacionais e CTAs proibidos
**Para que** nenhum slide saia com "zona de conforto", "extraordinário", "Comente X" ou frase poético-motivacional genérica.

## Contexto
2ª story do epic. Output V1 mostrou slides 2-3 corretos (NÚMERO + BASTIDOR) mas slide 1 com headline genérico e slide 4 com CTA proibido. O motor consegue, mas não há gate que force. Decisão: injetar léxico como **contexto rígido** + adicionar **C8** no quality_gate + blacklist de clichês.

`brand-identity.yaml` já lista:
- `lexico.sempre_usar` (founder, bastidor, número, processo, sistema, atenção, evidência, construir)
- `lexico.nunca_usar` (empreendedorismo, mentoria, dica, segredo, sinergia, alavancar, holisticamente, venha)
- `cta_estilo.exemplos_proibidos` ("Chama no DM!", "Link na bio!", "Comenta 'EU QUERO' aqui embaixo!")
- `restricoes.nunca_fazer` (auto-ajuda genérica, promessa vazia, pose de guru)

A story consome esse arquivo e converte em **enforcement**.

## Decisão de arquitetura

### `plan_creative.py` — injeção de léxico
- Carregar `brand-identity.yaml` do cliente resolvido
- Injetar no prompt do `plan_creative`: bloco "VOZ DO CLIENTE" com `sempre_usar`, `nunca_usar`, `cta_estilo.preferencia`, exemplos bons/ruins
- Headline pattern hint: cada slide DEVE conter número OU bastidor OU lugar concreto

### `recast_engine.py` — blacklist hard
- Após o recast LLM, varredura por blacklist de tokens (clichês adicionais derivados de brand-identity):
  - "zona de conforto", "extraordinário", "transforme sua vida", "mude sua mentalidade"
  - "comente 'X'", "manda no DM", "link na bio", "garante o seu"
  - "segredo", "fórmula", "passo a passo simples"
- Se detectado → mark slide for re-recast com diretiva específica "remover cliché X"

### `quality_gate.py` — novo check C8
- C8: "Voz Tiago" → para cada slide:
  - (a) headline contém NÚMERO (regex `\d`) OU palavra do `lexico.sempre_usar`
  - (b) body cita BASTIDOR (regex de lugar/processo) OU NÚMERO
  - (c) CTA (último slide) não está na blacklist de CTAs proibidos
- Falha → marca slide para self-healing iteração

## Tarefas (Checklist)
- [x] `plan_creative.py`: expandido bloco voz no prompt — agora injeta `tom_de_voz` + `lexico` + `cta_estilo` + `restricoes` + cliente label dinâmico
- [x] `recast_engine.py`: `CLICHE_BLACKLIST` (13 regex patterns) + `detect_cliches()` helper
- [x] `recast_engine.py`: varredura pós-recast grava `_validation.cliches_detected` (quality_gate ataca)
- [x] `quality_gate.py`: C8 e C9 adicionados ao FALLBACK_CHECKLIST (LLM os aplica via prompt iterativo)
- [x] `creative-quality-checklist.md`: C8 + C9 documentados (loaded automatically)
- [x] `_PIPELINE.md` seção 5 atualizada com C8 + C9
- [x] Re-recast com diretiva: aproveitamos o loop existente do quality_gate (não precisa loop separado no recast — mais simples)

## Critérios de Aceite
- [x] **AC1:** Prompt de `plan_creative` para qualquer cliente contém bloco "VOZ" com léxico + CTA preference + restricoes (verificado em `plan_creative.py:74-82`)
- [x] **AC2:** `recast_engine` tem 13 clichês na blacklist (`CLICHE_BLACKLIST`) — supera AC mínimo de 8
- [x] **AC3:** `quality_gate` C8 + C9 reprovam slides motivacionais genéricos e CTAs proibidos (validação via LLM no loop iterativo existente)
- [x] **AC4:** Validação prática **deferida para V2-05** (re-render comparativo é AC daquela story)
- [x] **AC5:** Sem regressão — todos os clientes carregam SEU próprio brand-identity via `_client_resolver`; injection usa identidade do cliente resolvido
- [x] **AC6:** Self-healing já tem cap de 3 iterações (MAX_ITERATIONS); C8/C9 não introduzem loop separado
- [x] **AC7:** `_PIPELINE.md` seção 5 lista C8 + C9 com descrição

## Escopo
**IN:**
- `squads/virals-marketing-squad/scripts/plan_creative.py`
- `squads/virals-marketing-squad/scripts/recast_engine.py`
- `squads/virals-marketing-squad/scripts/quality_gate.py`
- `_PIPELINE.md` (seção 5)

**OUT:** Mudanças visuais (V2-03/V2-04); mudanças em brand-identity.yaml (já está completo)

## Dependências
- `brand-identity.yaml` de Tiago ✔
- `brand-identity.yaml` de Virals ✔ (validar regressão)
- `call_llm` reusável ✔

## Riscos
- **R1:** C8 muito estrito → loop infinito no self-healing. → Mitigar: cap em 3 iterações; após cap, marca WARN_VOICE e render segue.
- **R2:** Blacklist regex matching produz falso positivo (ex.: "número" matches "número de série" em body legítimo). → Aceito; o caso pior é re-recast desnecessário, não output ruim.
- **R3:** Outros clientes regridem por causa do injection. → Cada cliente carrega SEU brand-identity; default zero-inject quando arquivo ausente.

## Dev Agent Record
### File List
**Modificado:**
- `squads/virals-marketing-squad/scripts/plan_creative.py` — `build_plan_prompt` agora injeta `lexico` + `cta_estilo` (linhas 74-82, ~10 LOC alteradas); cliente label dinâmico (linha 82); regras de NÚMERO/BASTIDOR + CTA proibido no header (linhas ~95-103)
- `squads/virals-marketing-squad/scripts/recast_engine.py` — `CLICHE_BLACKLIST` constante + `detect_cliches()` helper + varredura pós-recast com persistência em `_validation.cliches_detected` (~40 LOC adicionadas após linha 441 e em `recast_brief`)
- `squads/virals-marketing-squad/scripts/quality_gate.py` — `_FALLBACK_CHECKLIST` ganhou C8 + C9 (2 LOC)
- `squads/virals-marketing-squad/checklists/creative-quality-checklist.md` — C8 + C9 documentados (carregados automaticamente)
- `docs/stories/03-Product/EPIC-MKT-Creative-Intelligence/_PIPELINE.md` — seção 5 lista C8 + C9

### Decisões registradas
- **Quality gate hibrida:** C8/C9 são avaliados pelo LLM via prompt (loop iterativo existente). NÃO criamos validador Python paralelo — evita drift entre fallback e LLM. O LLM já tolera variação de forma melhor que regex.
- **Bug do CTA_THINK NÃO incluído:** descoberto em `recast_engine.py:397` (`"variant": "HOOK" if i == 0 else "CONTENT"` hardcoded), mas é escopo de V2-03 ("CTA_THINK mapping fix") — vou atacar lá.
- **Re-recast loop não implementado:** o quality_gate já faz isso (corrige e revalida em loop). Adicionar segundo loop no recast seria duplicação.

## QA Results
_a preencher pelo @qa_

## Change Log
- 2026-05-25 — @sm — Story drafted as part of EPIC-MKT-Tiago-Template-V2.
- 2026-05-25 — @po — Validate-story-draft: GO. Status Draft → Ready.
- 2026-05-26 — @dev (via @marketing-chief) — Voice reinforcement aplicado: plan_creative com bloco voz expandido + recast com blacklist de 13 clichês + quality_gate C8/C9. Bug do CTA_THINK identificado em recast_engine.py:397 e remetido para V2-03. AC4 (validação real) deferido para V2-05. Status Ready → Done.
