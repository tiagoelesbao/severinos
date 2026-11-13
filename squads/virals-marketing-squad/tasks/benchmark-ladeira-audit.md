# Auditar Copy, Persuasão e Gatilhos Textuais (Ladeira)

**Task ID:** `benchmark-ladeira-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Paulo Ladeira copywriting methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Copy, Persuasão e Gatilhos Textuais |
| **status** | `pending` |
| **responsible_executor** | @ladeira |
| **execution_type** | `Agent` |
| **input** | ["dossier_json", "transcription", "frames_dir"] |
| **output** | ["ladeira_audit_section (markdown)", "copy_score (1-10)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 5 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ladeira |
| **Rationale** | Requer análise profunda de técnicas de copywriting, gatilhos mentais, estrutura persuasiva e qualidade dos CTAs — expertise core do Ladeira como Copywriter Master BR. |

## Overview

Analisa um conteúdo de benchmark sob a lente de copy e persuasão do Paulo Ladeira. 

**Adaptação por Tipo:**
- **Se video:** Foca na retórica falada, overlays e CTAs dinâmicos.
- **Se post/carrossel:** Analisa como um copy de carrossel, focando na headline da capa, na progressão textual entre slides e nos CTAs de legenda/link. Usa `Conteudo.md` (OCR).
- Gera um Copy Score de 1 a 10.

## Input

- **dossier_json** (object)
  - Description: Dados do benchmark (URL, plataforma, metadata).
  - Required: Yes
- **transcription** (string)
  - Description: Texto (Transcrição ou Conteúdo do Post).
  - Required: Yes
- **frames_dir** (string)
  - Description: Caminho da pasta com frames (Opcional para posts).
  - Required: **SIM — OBRIGATÓRIO PARA BENCHMARK**

## Multimodal Input Validation (MANDATORY)

> ⚠️ **REGRA DE OURO**: Você NÃO pode gerar a auditoria de copy sem analisar os screenshots primeiro. Text overlay É copy.

Antes de iniciar a análise, execute:

1. **Validar frames_dir**: Verifique se o caminho existe no dossier JSON
2. **Listar arquivos**: Conte quantos screenshots existem na pasta (deve bater com `frames_count` do dossier)
3. **Abrir TODOS os screenshots**: Analise visualmente cada imagem — text overlays, headlines, CTAs visuais, palavras destacadas
4. **Cross-reference**: Cruze o texto visual nos screenshots com a transcrição — o que é dito bate com o que é mostrado?
5. **Referenciar no output**: Para cada claim sobre copy visual, cite o screenshot específico (ex: "Screenshot #2 tem overlay \"R$ 10K/mês\" — gatilho de prova")

**Se frames_dir estiver vazio ou ausente**:
- Registre: `⚠️ AVISO: Nenhum screenshot disponível. Análise de copy visual comprometida.`
- Prossiga com a análise baseada APENAS na transcrição
- Reduza o Copy Score em -2 pontos como penalidade por falta de dados visuais

**Se frames_dir existir mas agente não mencionar screenshots no output**:
- Output será considerado **INVÁLIDO** e deverá ser refeito

## Output

- **ladeira_audit_section** (markdown)
  - Description: Seção completa para o relatório final:

```markdown
## ✍️ LADEIRA COPY & PERSUASION AUDIT

### 1. Headline & Hook Textual
[Análise da primeira frase/legenda como headline de copy]
- **Headline Score:** X/10
- **Tipo:** [Curiosidade | Benefício | Prova Social | Dor | Provocação]
- **Rewrite Sugerido:** [versão otimizada]

### 2. Estrutura Persuasiva (Framework)
[Qual framework de copy está sendo usado?]
- **Framework Detectado:** [AIDA | PAS | BAB | Before-After-Bridge | Story | Outro]
- **Aderência ao Framework:** [nota ou descrição]
- **Breakdown:**
  - Abertura: [análise]
  - Desenvolvimento: [análise]
  - Fechamento: [análise]

### 3. Gatilhos Mentais Identificados
| Gatilho | Momento/Frase | Eficácia |
|---------|---------------|----------|
| [Escassez] | [trecho] | [Alta/Média/Baixa] |
| [Prova Social] | [trecho] | [Alta/Média/Baixa] |
| [Autoridade] | [trecho] | [Alta/Média/Baixa] |

### 4. CTA Analysis
[Análise dos Call-to-Actions (verbais e visuais)]
- **CTA Principal:** [transcrição exata]
- **Posição:** [início | meio | fim]
- **Clareza:** [1-10]
- **Urgência:** [1-10]
- **CTA Implícito:** [se houver]

### 5. Text Overlay & Legendas
[Análise do texto visual nos frames]
- **Quantidade de text overlays:** [número]
- **Palavras-chave recorrentes:** [lista]
- **Legibilidade:** [1-10]
- **Coerência com áudio:** [sim/não + notas]

### 6. Copy Score: X/10
[Justificativa baseada nos critérios acima]
```

## Action Items

### Step 1: Desconstruir a Headline/Hook Textual

Analisar a primeira frase falada E o primeiro text overlay visível:
- Que tipo de headline é? (Curiosidade, Benefício, Dor, etc.)
- É forte o suficiente para parar o scroll?
- Propor versão otimizada seguindo princípios de copy BR

### Step 2: Identificar Framework Persuasivo

Mapear a transcrição completa contra frameworks clássicos:
- AIDA (Atenção, Interesse, Desejo, Ação)
- PAS (Problema, Agitação, Solução)
- BAB (Before, After, Bridge)
- Story-based
- Determinar aderência e pontos de melhoria

### Step 3: Mapear Gatilhos Mentais

Percorrer transcrição e frames identificando uso de:
- Escassez, Urgência, Prova Social, Autoridade, Reciprocidade
- Novidade, Antecipação, Pertencimento, Medo de Perder (FOMO)
- Classificar eficácia de cada gatilho detectado

### Step 4: Avaliar CTAs

Identificar todos os call-to-actions:
- Verbais (na transcrição) e visuais (nos frames)
- Avaliar clareza, urgência e posicionamento
- O espectador sabe exatamente o que fazer depois?

### Step 5: Calcular Copy Score

Atribuir nota de 1 a 10 baseando-se em:
- Headline/hook strength: peso 30%
- Framework adherence: peso 20%
- Mental triggers usage: peso 20%
- CTA effectiveness: peso 20%
- Text overlay quality: peso 10%

## Acceptance Criteria

- [ ] **AC-1:** Headline (Capa ou Hook Inicial) classificada por tipo com sugestão de rewrite.
- [ ] **AC-2:** Framework persuasivo detectado com breakdown de abertura/desenvolvimento/fechamento.
- [ ] **AC-3:** Ao menos 3 gatilhos mentais identificados com trechos específicos.
- [ ] **AC-4:** CTA principal identificado com avaliação de clareza e urgência.
- [ ] **AC-5:** Copy Score fornecido como número 1-10 com justificativa.

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

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
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-24_
_Compliant: Yes_
