# Task: Revisão Semanal de Pipeline @blount-sales

id: blount-pipeline-review
agent: "@blount-sales"
atomic_layer: task
cadencia: "Toda sexta-feira, última hora do dia"

descricao: |
  Revisão semanal de higiene do pipeline:
  verificar deals em aberto, descartar inativos,
  confirmar próximas ações e gerar relatório.

processo:
  - step: "Revisar todos os deals em aberto no CRM"
  - step: "Marcar deals sem atividade > 7 dias (reativar ou descartar)"
  - step: "Descartar deals com > 60 dias sem atividade"
  - step: "Confirmar que todos os deals têm próxima ação agendada"
  - step: "Atualizar probabilidade de fechamento"
  - step: "Calcular taxa de conversão por estágio vs. semana anterior"
  - step: "Registrar motivos de perda da semana"
  - step: "Gerar relatório de pipeline (template: sales-report-template.md)"

saida:
  - campo: pipeline_report
    template: sales-report-template.md
    destino: "ClickUp > Vendas > Relatórios & Métricas"
    persistido: true

checklist: pipeline-health-checklist.md

metricas:
  - "Zero deals sem próxima ação agendada"
  - "100% motivos de perda registrados"
  - "Relatório entregue toda sexta-feira"
