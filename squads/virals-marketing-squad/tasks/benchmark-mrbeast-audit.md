# Auditar Retenção e Engenharia de Atenção (MrBeast)

**Task ID:** `benchmark-mrbeast-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-24
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (MrBeast retention engineering methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Retenção e Engenharia de Atenção |
| **status** | `pending` |
| **responsible_executor** | @mrbeast-mk |
| **execution_type** | `Agent` |
| **input** | ["dossier_json", "transcription", "frames_dir"] |
| **output** | ["mrbeast_audit_section (markdown)", "retention_score (1-10)"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 5 criteria |
| **elicit** | true |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @mrbeast-mk |
| **Rationale** | Requer análise profunda de padrões de retenção, engenharia de hook, curva de energia e identification de open loops — expertise core do MrBeast. |

**Adapção por Tipo:**
- **Se video:** Avalia hook visual/verbal, pattern interrupts e curva de energia baseada no tempo.
- **Se post/carrossel:** Avalia a "parada de scroll" baseada na Capa (Slide 1) e o fluxo de curiosidade entre slides (Slide 2, 3...). Usa o arquivo `Conteudo.md` como fonte primária para OCR e audit de design.
- Calcula um Retention Score de 1 a 10.

## Input

- **dossier_json** (object)
  - Description: Dados do benchmark (URL, plataforma, metadata). Verifique o campo `type` (video/post).
  - Required: Yes
- **transcription** (string)
  - Description: Transcrição (para video) ou Conteúdo Textual/OCR de Slides (para post em `Conteudo.md`).
  - Required: Yes
- **frames_dir** (string)
  - Description: Caminho da pasta `Screenshots/`. Para `type: post`, contém as imagens originais de cada slide.
  - Required: **SIM — OBRIGATÓRIO PARA BENCHMARK**

## Multimodal Input Validation (MANDATORY)

> ⚠️ **REGRA DE OURO**: Você NÃO pode gerar a auditoria sem analisar os screenshots primeiro.

Antes de iniciar a análise, execute:

1. **Validar frames_dir**: Verifique se o caminho existe no dossier JSON
2. **Listar arquivos**: Conte quantos screenshots existem na pasta (deve bater com `frames_count` do dossier)
3. **Abrir TODOS os screenshots**: Analise visualmente cada imagem na sequência temporal
4. **Cross-reference**: Cruze o que você VÊ nos screenshots com o que está na transcrição
5. **Referenciar no output**: Para cada claim sobre elementos visuais, cite o screenshot específico (ex: "Screenshot #3, 00:15s")

**Se frames_dir estiver vazio ou ausente**:
- Registre: `⚠️ AVISO: Nenhum screenshot disponível. Análise visual comprometida.`
- Prossiga com a análise baseada APENAS na transcrição
- Reduza o Retention Score em -2 pontos como penalidade por falta de dados visuais

**Se frames_dir existir mas agente não mencionar screenshots no output**:
- Output será considerado **INVÁLIDO** e deverá ser refeito

## Output

- **mrbeast_audit_section** (markdown)
  - Description: Seção completa para o relatório final, contendo todas as análises abaixo:

```markdown
## 🎬 MRBEAST RETENTION AUDIT

### 1. The Pattern Interrupt (0-3s)
[Análise do hook visual e verbal nos primeiros 3 segundos]

### 2. The Hook Promise (3-10s)
[Como a promessa é formulada e conectada ao título]

### 3. Open Loops & Curiosity Gaps
[Lista com timestamps (video) ou Nro do Slide (post) de cada open loop]
| Timestamp/Slide | Open Loop | Resolved At |
|-----------------|-----------|-------------|

### 4. Micro-Rewards & Re-hooks
[Mapeamento de estímulos a cada 30-60s que mantêm atenção]

### 5. Energy Curve
[Análise do nível de energia do apresentador ao longo do conteúdo]
- Início:
- Meio:
- Fim:
- Picos de energia:

### 6. Payoff & Satisfaction
[A promessa do hook foi cumprida? O espectador sai satisfeito?]

### 7. Retention Score: X/10
[Justificativa baseada nos critérios acima]
```

## Action Items

### Step 1: Ingerir Contexto Multimodal

Ler o dossier JSON para obter metadados. Ler a transcrição completa. Examinar todos os frames disponíveis na pasta `Screenshots/` para contexto visual.

### Step 2: Desconstruir o Hook (0-10s)

Analisar os primeiros segundos do conteúdo:
- O que aparece visualmente nos frames iniciais?
- Qual a primeira frase dita (da transcrição)?
- Há pattern interrupt visual (corte rápido, zoom, emoji, texto)?
- A promessa é clara e irresistível?

### Step 3: Mapear Open Loops e Micro-Rewards

Percorrer a transcrição identificando:
- Frases que criam curiosidade sem resolver imediatamente (open loops)
- Momentos onde valor é entregue (micro-rewards)
- Criar tabela com timestamps aproximados

### Step 4: Avaliar Curva de Energia e Payoff

- O apresentador mantém alta energia ou decai?
- Onde estão os picos emocionais?
- A promessa do hook é cumprida no final?
- O espectador sairia satisfeito ou frustrado?

### Step 5: Calcular Retention Score

Atribuir nota de 1 a 10 baseando-se em:
- Hook effectiveness (0-3s): peso 30%
- Open loops quality: peso 25%
- Micro-rewards frequency: peso 20%
- Energy curve consistency: peso 15%
- Payoff satisfaction: peso 10%

## Acceptance Criteria

- [ ] **AC-1:** Hook analisado com descrição visual E verbal (Capa do Post ou 0-3s do Vídeo).
- [ ] **AC-2:** Ao menos 2 open loops identificados (com Timestamps ou Slides).
- [ ] **AC-3:** Curva de energia descrita (Variação de impacto visual/texto entre slides ou tom de voz no vídeo).
- [ ] **AC-4:** Payoff avaliado com conclusão sobre satisfação do espectador.
- [ ] **AC-5:** Retention Score fornecido como número 1-10 com justificativa.

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
