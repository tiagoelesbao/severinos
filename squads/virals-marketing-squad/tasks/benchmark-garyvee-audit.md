# Auditar Contexto, Branding e Distribuição (GaryVee)

**Task ID:** `benchmark-garyvee-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (GaryVee content strategy methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Contexto, Branding e Distribuição |
| **status** | `pending` |
| **responsible_executor** | @garyvee-mk |
| **execution_type** | `Agent` |
| **input** | ["dossier_json", "transcription", "frames_dir"] |
| **output** | ["garyvee_audit_section (markdown)", "context_score (1-10)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 5 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @garyvee-mk |
| **Rationale** | Requer análise de cultural relevance, audience empathy, shareability triggers e platform-native adaptation — expertise core do GaryVee. |

## Overview

Analisa um conteúdo de benchmark sob a lente de branding e contexto cultural do GaryVee. 

**Adaptação por Tipo:**
- **Se video:** Avalia platform-native fit, vibe e distribuição baseada no tempo e movimento.
- **Se post/carrossel:** Foca na estética visual dos slides (Vibe do Design), autenticidade do texto e platform-native fit do formato estático (ex: PDF Viewer no LinkedIn). Usa o arquivo `Conteudo.md` como base.
- Gera um Context Score de 1 a 10.

## Input

- **dossier_json** (object)
  - Description: Dados do benchmark (URL, plataforma, metadata). Verifique o campo `type`.
  - Required: Yes
- **transcription** (string)
  - Description: Texto extraído (Transcrição ou Post Content).
  - Required: Yes
- **frames_dir** (string)
  - Description: Caminho com frames do vídeo (Opcional para posts).
  - Required: **SIM — OBRIGATÓRIO PARA BENCHMARK**

## Multimodal Input Validation (MANDATORY)

> ⚠️ **REGRA DE OURO**: Você NÃO pode gerar a auditoria de contexto/vibe sem analisar os screenshots primeiro.

Antes de iniciar a análise, execute:

1. **Validar frames_dir**: Verifique se o caminho existe no dossier JSON
2. **Listar arquivos**: Conte quantos screenshots existem na pasta (deve bater com `frames_count` do dossier)
3. **Abrir TODOS os screenshots**: Analise visualmente cada imagem — qualidade de produção, cores, branding, ambiente
4. **Cross-reference**: Cruze a vibe visual com o tom emocional da transcrição
5. **Referenciar no output**: Para cada claim sobre estética/vibe, cite o screenshot específico (ex: "Screenshot #5 mostra ambiente cru — vibe raw/authentic")

**Se frames_dir estiver vazio ou ausente**:
- Registre: `⚠️ AVISO: Nenhum screenshot disponível. Análise de vibe/branding comprometida.`
- Prossiga com a análise baseada APENAS na transcrição
- Reduza o Context Score em -2 pontos como penalidade por falta de dados visuais

**Se frames_dir existir mas agente não mencionar screenshots no output**:
- Output será considerado **INVÁLIDO** e deverá ser refeito

## Output

- **garyvee_audit_section** (markdown)
  - Description: Seção completa para o relatório final:

```markdown
## 🥤 GARYVEE CONTEXT AUDIT

### 1. Cultural Relevance & Vibe
[High-Production vs Raw/Authentic? Trend-riding ou Evergreen?]
- **Vibe Classification:** [Raw | Polished | Hybrid]
- **Trend Alignment:** [Descrição]

### 2. Audience Empathy Map
[Para quem é este conteúdo? O que essa pessoa sente ao assistir?]
- **Target Persona:** [Descrição]
- **Emotional Journey:** [Antes → Durante → Depois de assistir]
- **Value Delivered:** [Entretenimento | Educação | Inspiração | Utilidade]

### 3. Shareability Trigger Analysis
[Por que alguém compartilharia isso?]
- **Primary Trigger:** [Ego | Utilidade | Entretenimento | Identidade | Polêmica]
- **Share Mechanic:** [Como o compartilhamento é incentivado]
- **Virality Potential:** [Low | Medium | High] — Justificativa

### 4. Platform-Native Fit
[Como este conteúdo performa nativamente na plataforma de origem]
| Platform | Native Fit | Adaptation Needed |
|----------|-----------|-------------------|
| Instagram Reels | X/10 | [notas] |
| TikTok | X/10 | [notas] |
| YouTube Shorts | X/10 | [notas] |
| LinkedIn | X/10 | [notas] |

### 5. Content Repurposing Opportunities
[Como fatiar este conteúdo para outras plataformas]
- **Quote Cards:** [momentos quotáveis]
- **Thread Potential:** [tópicos que dão thread]
- **Audio/Podcast Clip:** [viabilidade]

### 6. Context Score: X/10
[Justificativa baseada nos critérios acima]
```

## Action Items

### Step 1: Classificar a Vibe do Conteúdo

Examinar os frames e a transcrição para determinar:
- É conteúdo raw/autêntico ou altamente produzido?
- Segue alguma tendência cultural ou é evergreen?
- Qual o mood predominante (educativo, inspiracional, entretenimento)?

### Step 2: Mapear Empatia com Audiência

Identificar:
- Quem é o público-alvo provável deste conteúdo?
- Qual a jornada emocional: o que a pessoa sente antes, durante e depois?
- Que tipo de valor real é entregue ao espectador?

### Step 3: Analisar Gatilhos de Compartilhamento

Determinar:
- Qual o gatilho primário de compartilhamento (Ego, Utilidade, Identidade)?
- O conteúdo tem mecanismo explícito de share (CTA, tag a friend)?
- Qual o potencial real de viralidade orgânica?

### Step 4: Avaliar Platform-Native Fit

Para cada plataforma major (IG Reels, TikTok, YT Shorts, LinkedIn):
- O conteúdo parece nativo ou transplantado?
- Que adaptações seriam necessárias?
- Dar nota de fit por plataforma

### Step 5: Calcular Context Score

Atribuir nota de 1 a 10 baseando-se em:
- Cultural relevance: peso 25%
- Audience empathy depth: peso 25%
- Shareability mechanics: peso 25%
- Platform-native fit: peso 15%
- Repurposing potential: peso 10%

## Acceptance Criteria

- [ ] **AC-1:** Vibe classificada com justificativa (Design/Design System para Posts ou Edição para Vídeos).
- [ ] **AC-2:** Audience Empathy Map com persona, jornada emocional e tipo de valor.
- [ ] **AC-3:** Shareability trigger primário identificado com mecânica de share.
- [ ] **AC-4:** Platform-native fit avaliado para ao menos 3 plataformas (incluindo adaptação de formato estático se necessário).
- [ ] **AC-5:** Context Score fornecido como número 1-10 com justificativa.

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
