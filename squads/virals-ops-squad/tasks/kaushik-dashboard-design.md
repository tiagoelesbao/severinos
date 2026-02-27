task: kaushikDashboardDesign()
id: kaushik-dashboard-design
agent: "@kaushik"
responsavel: "@kaushik"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Molecule

descricao: |
  Projetar a estrutura visual e lógica de um dashboard operacional
  no ClickUp ou ferramenta de BI, focando em métricas acionáveis
  e eliminando métricas de vaidade.

elicit: true

entrada:
  - campo: objetivo_dashboard
    tipo: string
    descricao: "O que este dashboard pretende monitorar?"
    obrigatorio: true
  
  - campo: publico_alvo
    tipo: string
    descricao: "Quem tomará decisões baseadas nestes dados?"
    obrigatorio: true

saida:
  - campo: blueprint_dashboard
    tipo: document
    destino: ClickUp > OPS > BI & Métricas
    persistido: true

Checklist:
  - "[ ] Identificar a OMTM (One Metric That Matters)"
  - "[ ] Selecionar métricas de apoio (Nível 1 e 2)"
  - "[ ] Definir periodicidade de atualização"
  - "[ ] Validar se cada métrica gera uma ação clara"
  - "[ ] Desenhar layout de widgets"

acceptance_criteria:
  - "O dashboard deve ser legível em menos de 30 segundos"
  - "Zero métricas de vaidade incluídas"
  - "Deve haver comparação histórica (Week-over-Week ou Month-over-Month)"
