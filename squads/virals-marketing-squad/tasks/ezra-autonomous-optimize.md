# Task: Otimização Autônoma de Campanha Brand @ezra

id: ezra-autonomous-optimize
agent: "@ezra-firestone"
atomic_layer: organism

descricao: |
  Gestão autônoma do ecossistema de brand e funil — monitoramento diário
  até a expansão estratégica de audiências, sem intervenção humana,
  com logs no ClickUp.

processo:
  - step: "Verificar tamanho e crescimento de cada camada do funil"
  - step: "Verificar saturação (frequency) de cada audiência"
  - step: "Identificar conteúdo orgânico para boosting (CTR > 3%)"
  - step: "Ajustar distribuição de budget entre fases (topo, meio, fundo)"
  - step: "Registrar estado do funil no ClickUp"
  - step: "Gerar relatório semanal de saúde do funil"

escalacao:
  - "Score de qualidade de conta caiu → alertar urgente"
  - "Budget atingirá limite antes do prazo → alertar"
  - "Queda de alcance > 40% sem mudança → alertar"

metricas:
  - "Evolução da audiência de retargeting semanal"
  - "CPM consolidado por fase vs. meta"
