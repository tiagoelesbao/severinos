# EPIC-MKT-Creative-Intelligence — Motor de Análise & Planejamento

**Status:** Aprovado pelo dono · 2026-05-17 — PRIORIDADE (antes do Editor)
**Autor:** @marketing-chief + @architect

## O problema
O pipeline atual é mecânico: `deep_modeler` extrai o benchmark **slide a slide**, o `recast_engine` reescreve **1:1**, e renderiza. **Nenhuma etapa decide o que o post Virals deveria ser** — ele espelha o benchmark.

Sintomas reais observados:
- O #03 (garyvee) saiu com **slide 2 redundante** — cópia do slide 1 + "@GARYVEE". No benchmark original os 2 slides fazem sentido no contexto dele; copiados 1:1, não.
- Kicker genérico **"ABERTURA"** — ninguém *planejou* esse texto.
- Sem decisão de arco narrativo, sem corte de redundância, sem coerência holística.

**Causa raiz:** falta um cérebro de **análise + planejamento** entre a extração e a produção.

## A visão — 2 motores separados

```
benchmark  →  [1. ANÁLISE & PLANEJAMENTO]  →  Plano de Conteúdo  →  [2. PRODUÇÃO]  →  render
```

### Motor 1 — Análise & Planejamento (o cérebro)
- **Análise holística** (não slide-a-slide): tema central, arco narrativo, o que fez o benchmark performar, estrutura, redundâncias, gancho.
- **Planejamento do post Virals**: dado a análise + a `virals-brand-identity.yaml`, DECIDE o escopo do post — quantos slides, papel de cada um, o que cortar/fundir, kicker contextual de cada slide, arco narrativo.
- **Saída: o Plano de Conteúdo** — um artefato que descreve o post Virals a ser produzido. NÃO é cópia da estrutura do benchmark.

### Motor 2 — Produção
- Recebe o Plano de Conteúdo.
- Produz cada slide conforme o plano, aplicando **templates + checklists de qualidade** (composição, logo, enquadramento, hierarquia de texto, fit de copy, coerência).
- O `recast_engine` deixa de classificar/estruturar e vira **executor de copy do plano**.

## O Plano de Conteúdo (artefato central)
Para cada post, descreve: arquétipo, nº de slides decidido (com justificativa de cortes/fusões), e por slide → papel, kicker contextual, direção de copy, direção de imagem.

## Stories
- **MCI-01 — Análise Holística do Benchmark.** Eleva o `deep_modeler`: além de extrair, produz uma análise estruturada (tema, arco, estrutura, redundâncias, fatores de performance).
- **MCI-02 — Motor de Planejamento.** Dado a análise + identidade Virals, gera o Plano de Conteúdo (estrutura decidida, não copiada; kicker contextual; cortes).
- **MCI-03 — Checklists de Produção + Loop de Auto-Correção (self-healing).** Define os checklists de qualidade; checklist crítico reprovado dispara correção automática + revalidação, em loop, até passar — sem bloqueio manual.
- **MCI-04 — Integração.** O `*design-creative` passa a ser benchmark → análise → planejamento → produção (com self-healing) → render. `recast_engine` vira executor do plano.
- **MCI-05 — Adapter `bench_type=video` → Segmentação em Slides.** (Done) Benchmarks de vídeo são segmentados em slides na Etapa 1, evitando o abort "Nenhum slide encontrado".
- **MCI-06 — Fidelidade Factual Terminal + Gate Bloqueante.** (InReview)
- **MCI-07 — Fidelidade Qualitativa + Tratamento do Autor do Benchmark.** (InReview) Impede o autor do benchmark de virar personagem (sanitização clause-aware) e detecta/repara fabricação qualitativa (marcas/datas/entrevistas sem lastro). Guard anti-fabricação de números roda por último (terminal), gate bloqueia render de copy FAIL/PENDING_RECAST, retry de JSON e sanitização de `@handle` do autor.

## Relação com o que já existe
- `deep_modeler` → vira a base de extração que alimenta a Análise (MCI-01).
- `recast_engine` → vira o executor de copy da Produção, guiado pelo Plano (MCI-02/04).
- Templates por arquétipo (MKT-MEDIA-11) e Pexels (MKT-MEDIA-07) → continuam, agora dirigidos pelo Plano.

## Decisões (resolvidas pelo dono · 2026-05-17)
1. **Ordem:** ✅ Este epic (Creative-Intelligence) vem ANTES do Editor (EPIC-MKT-Creative-Editor).
2. **Plano de Conteúdo:** ✅ Interno — passa direto para a produção, sem etapa de revisão manual.
3. **Checklists:** ✅ Gate com **self-healing**: reprovação dispara correção automática + revalidação em loop até passar (sem bloqueio manual). Limite de iterações para evitar loop infinito.
4. **Nº de slides:** ✅ O planejamento PODE alterar a contagem do benchmark (cortar redundância, fundir slides).

## Dependências
- `virals-brand-identity.yaml` ✔ · pipeline atual MKT-MEDIA-05..12 ✔ · acesso a LLM (OpenRouter) ✔

## Estimativa
4 stories · epic de porte **L–XL**. É a evolução mais estruturante do sistema — faz o motor *errar menos na origem*.
