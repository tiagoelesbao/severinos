# Task: Otimização Autônoma de Campanha DR @perry

id: perry-dr-autonomous-optimize
agent: "@perry-marshall"
atomic_layer: organism

descricao: |
  Otimização autônoma diária e semanal das campanhas de direct response ativas,
  dentro dos parâmetros aprovados, com logs no ClickUp.

processo:
  - step: "Coletar dados das últimas 24h de todas as campanhas ativas"
  - step: "Comparar CPA/ROAS de cada adset vs. meta"
  - step: "Aplicar regras automáticas (pausar, escalar, ajustar)"
  - step: "Registrar todas as ações no ClickUp"
  - step: "Gerar relatório semanal completo de performance"

escalacao:
  - "Conta suspensa/restringida → pausar tudo + alertar"
  - "CPA > 3x meta por 48h → pausar campanha + alertar"
  - "Budget esgotado antes do planejado → alertar urgente"

metricas:
  - "ROAS geral semanal vs. meta"
  - "CPA consolidado por produto"
