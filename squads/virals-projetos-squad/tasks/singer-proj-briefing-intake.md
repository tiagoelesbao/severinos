---
description: Análise profunda de briefing com Intelligence Council multi-agente
---
# Task: Briefing Intake & Project Intelligence v2.0

**Agent:** @singer-proj
**Trigger:** Recebimento de briefing de novo projeto (interno ou externo).

## Entradas
- Task ID do projeto na lista "Projetos Internos" (`901324798951`)
- Briefing em custom field (`e76db335-41b1-4c05-bc84-cacf67dc46d9`)
- Produtos correlatos em custom field (`500c9145-016e-43b6-bc5d-b5449c846b62`)

---

## Pipeline de Execução (5 Fases)

### Fase 1: Coleta Profunda
1. Acessar Space "Projetos" (`901312966335`) → Folder "Painel de Projetos" (`901316668858`) → Lista "Projetos Internos" (`901324798951`).
2. Ler **integralmente** o campo Briefing (texto + anexos).
3. Analisar os Produtos correlatos para identificar dependências.
4. Extrair a descrição, comentários e histórico de interações na task.
5. Pesquisar referências externas relevantes ao briefing (benchmarks de mercado, estudos, cases similares).

### Fase 2: Shaping & Appetite (Singer)
1. Aplicar o framework Shape Up para definir **Appetite** (quanto tempo o projeto merece).
2. Delimitar fronteiras claras: o que está INCLUSO vs EXCLUÍDO.
3. Identificar **Rabbit Holes** (riscos ocultos que podem explodir o escopo).
4. Mapear dependências técnicas e operacionais.

### Fase 3: Intelligence Council (Multi-Agent)
Convocar os seguintes agentes para análises independentes:

| Agente | Squad | Foco da Análise |
|--------|-------|----------------|
| `@hormozi-sys` | Operações | ROI, alavancagem, gargalos operacionais, escalabilidade |
| `@mrbeast-mk` | Marketing | Viralidade, hooks, CTR, retenção de audiência |
| `@garyvee-mk` | Marketing | Marca, distribuição, pillar content, presença multi-plataforma |
| `@cagan-produto` | Produto | 4 Riscos (Valor, Usabilidade, Viabilidade, Negócio), outcomes vs outputs |

Cada agente deve gerar:
- **Análise** (3-5 parágrafos focados na sua especialidade)
- **Recomendações** (3-5 ações concretas)
- **Alertas** (riscos ou oportunidades identificados)

### Fase 4: Síntese & Consolidação
1. Consolidar todas as análises do Council em um documento unificado.
2. Resolver conflitos entre recomendações (ex: velocidade vs qualidade).
3. Preencher o template `termo-abertura-template.md` v2.0 (12 seções).
4. Calcular projeções financeiras (CAC, LTV, Break-even, ROI).
5. Construir a RACI matrix com departamentos e responsáveis.
6. Preencher a tabela de riscos e mitigações.

### Fase 5: Publicação & Persistência
1. Executar `scripts/project_intelligence.js` para gerar o Google Doc profissional.
2. Documento é criado na pasta Oraclum → Termos de Abertura (`1XIFzCCHvk3BrkEynHHhQS6UPwe4JEW7a`).
3. Compartilhar com o Owner (`tn.elesbao@gmail.com`) como Editor.
4. Persistir o link no ClickUp — campo "Termo de Abertura do Projeto" (`803878f4-1035-4ba8-bb5f-7d7ce468ecdf`).
5. Seguir o checklist `analise-briefing-interno-checklist.md` v2.0 (8 fases, 32 itens).

---

## Saídas
- Documento profissional no Google Drive (12 seções, formatação avançada).
- Tarefa no ClickUp atualizada com o link do Termo de Abertura.
- Checklist v2.0 preenchido e validado.
- Análises individuais dos 4 agentes do Council documentadas.
- Lista de perguntas abertas e gaps identificados.
- Handoff para `@sutherland-proj` para criação de marcos.
