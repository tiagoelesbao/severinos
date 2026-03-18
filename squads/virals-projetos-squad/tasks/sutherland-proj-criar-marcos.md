---
description: Criação de marcos avançados com departamentos, KPIs e delegação
---
# Task: Criar Marcos Avançados (Milestones v2.0)

**Agent:** @sutherland-proj
**Trigger:** Recebimento do Termo de Abertura do Projeto aprovado (link Google Drive).

## Entradas
- Link do "Termo de Abertura do Projeto" v2.0 no Google Drive.
- Seções obrigatórias a analisar: Fases/Marcos (#7), Equipe/RACI (#9), Orçamento (#8).

---

## Pipeline de Execução (4 Fases)

### Fase 1: Análise do Termo de Abertura
1. Ler o documento completo com foco nas seções 7 (Cronograma), 8 (Orçamento) e 9 (Equipe).
2. Extrair cada marco com seus atributos: responsável, departamento, prazo, KPI.
3. Identificar dependências entre marcos (ex: Marco B depende de Marco A).

### Fase 2: Estruturação por Departamento
Para cada marco, definir:

| Atributo | Descrição |
|----------|-----------|
| **Departamento** | Marketing / Produto / Operações / Vendas / Tecnologia |
| **Ação-Chave** | A entrega concreta que define o marco como "completo" |
| **KPI de Sucesso** | Métrica mensurável que valida a entrega |
| **Responsável** | Dono do macro extraído da RACI Matrix |
| **Delegação** | Criada via script `create_milestones.js` |

### Fase 3: Criação no ClickUp
1. Acessar o Folder do projeto (ex: "Virals Starter & Growth" `901316668857`).
2. Localizar as listas de fases (v2.0):
   - **Planejamento & Preparação** (Fase 1: `901324798948`)
   - **Execução & Monitoramento** (Fase 2: `901324798949`)
   - **Finalização & Encerramento** (Fase 3: `901324798947`)
3. Para cada marco, criar uma task no ClickUp com:
   - **Nome:** `[DEPT] Marco: [Nome do Marco]`
   - **Descrição:** Ação-Chave + KPI + Dependências
   - **Due Date:** Prazo extraído do Termo de Abertura
   - **Assignees:** Responsável mapeado na RACI matrix
   - **Tags:** Departamento (Marketing, Produto, Ops, Vendas)

### Fase 4: Validação e Relatório
1. Gerar um relatório resumido com a lista de marcos criados por fase:
   ```
   Fase 1: [X marcos] | Marketing: Y, Produto: Z, Ops: W
   Fase 2: [X marcos] | ...
   ```
2. Vincular o relatório como comentário na task principal do projeto.
3. Notificar os squads responsáveis sobre os marcos delegados a eles.

---

## Saídas
- Marcos criados no ClickUp com departamento, KPI e dependências.
- Delegação automática para squads responsáveis.
- Relatório de estrutura com breakdown por fase e departamento.
- Timeline visível no Gantt do ClickUp.
