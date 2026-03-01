# Task: Estruturar Pipeline de Vendas @ross-sales

id: ross-pipeline-design
agent: "@ross-sales"
atomic_layer: Organism

descricao: |
  Estruturar ou redesenhar o funil de vendas completo:
  estágios, critérios de passagem, SLAs, separação de papéis
  (SDR vs. Closer vs. CS) e métricas de pipeline.

processo:
  - step: "Definir papéis: SDR, Closer, Account Manager (ou combo)"
  - step: "Criar estágios do pipeline (Lead → Contatado → Qualificado → Apresentação → Proposta → Negociação → Fechado)"
  - step: "Definir critérios de entrada e saída para cada estágio"
  - step: "Definir SLAs temporais por estágio"
  - step: "Calcular volume necessário: meta ÷ ticket ÷ close rate ÷ qualif rate"
  - step: "Configurar pipeline no ClickUp (campos customizados)"
  - step: "Definir métricas de acompanhamento (velocity, conv. rate, ciclo)"
  - step: "Criar primeira previsão de receita bottom-up"

estagio_pipeline:
  lead: "Critério: nome + contato + interesse mínimo | SLA: < 5min inbound"
  contatado: "Critério: SDR fez contato | SLA: < 24h"
  qualificado: "Critério: BANT confirmado | SLA: < 48h pós contato"
  apresentacao: "Critério: reunião agendada e confirmada"
  proposta: "Critério: proposta enviada | SLA: < 2h pós reunião"
  negociacao: "Critério: follow-up ativo | SLA: 30 dias máximo"
  fechado: "Ganho (→ onboarding) ou Perdido (→ motivo + reativação)"

saida:
  - campo: pipeline_structure
    destino: "ClickUp > Vendas > Pipeline Ativo"
    persistido: true

checklist: pipeline-health-checklist.md

metricas:
  - "Pipeline com 7 estágios e critérios documentados"
  - "Volume calculado para a meta atual"
  - "SLAs definidos e configurados"
