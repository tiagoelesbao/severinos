# Task: Higiene Autônoma do CRM

id: crm-autonomous-hygiene
agents: "@blount-sales + @ross-sales"
atomic_layer: Organism

descricao: |
  Manutenção autônoma e sistemática do CRM/pipeline.
  Verifica higiene, gera alertas, atualiza status e entrega
  relatório de saúde do pipeline sem intervenção humana.

cadencia:
  diaria: "7h30 — verificação de urgências e alertas"
  semanal: "Sexta-feira 17h — higiene completa + relatório"
  mensal: "Dia 1 — análise de tendência e previsão"

verificacoes_diarias:
  - "Leads inbound sem primeiro contato por > 30 min → alerta URGENTE"
  - "Deals em 'negociação' sem atividade por > 3 dias → alerta"
  - "Follow-ups agendados para hoje → lista enviada para closer"
  - "Leads que visitaram a página de vendas ontem → lista para closer"

verificacoes_semanais:
  - "Deals sem atividade por > 7 dias → criar task de follow-up ou descartar"
  - "Deals em pipeline há > 2× o ciclo médio → marcar como em risco"
  - "Taxa de conversão por estágio da semana vs. semana anterior"
  - "Motivos de perda mais comuns da semana"
  - "Forecast de receita da próxima semana"

saida:
  - campo: relatorio_pipeline
    destino: "ClickUp > Vendas > Relatórios & Métricas"
    template: sales-report-template.md
    persistido: true
  - campo: alertas_urgentes
    destino: "ClickUp (task urgente com assignee do closer)"
    persistido: true
  - campo: lista_followups_prioritarios
    destino: "ClickUp > Vendas > Pipeline Ativo"
    persistido: true

escalacao:
  - "Lead qualificado sem resposta de closer por > 2h (horário comercial) → escalar"
  - "Taxa de conversão caiu > 30% vs. semana anterior → diagnóstico + notificar"

metricas:
  - "Alertas diários entregues até 8h"
  - "Relatório semanal entregue toda sexta 17h"
  - "Zero deals sem próxima ação agendada"
