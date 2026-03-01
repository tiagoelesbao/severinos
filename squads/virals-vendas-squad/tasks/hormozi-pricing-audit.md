# Task: Auditar Precificação e Stack @hormozi-sales

id: hormozi-pricing-audit
agent: "@hormozi-sales"
atomic_layer: task

descricao: |
  Auditar oferta existente: precificação, stack de valor,
  garantia e unit economics. Identificar por que a oferta
  não está convertendo e gerar recomendações de ajuste.

processo:
  - step: "Levantar dados atuais: close rate, ticket médio, objeções de preço"
  - step: "Avaliar se o valor percebido está ≥ 10× o preço"
  - step: "Verificar se a garantia é forte o suficiente"
  - step: "Analisar unit economics: CAC, LTV, LTV:CAC, payback"
  - step: "Comparar preço vs. valor da transformação para o cliente"
  - step: "Identificar itens do stack com alto custo e baixo valor percebido"
  - step: "Gerar relatório de diagnóstico com recomendações"

diagnostico_automatico:
  se_ltv_cac_menor_3: "Gerar relatório de diagnóstico + recomendações de oferta"
  se_churn_alto: "Revisar se a oferta entrega a transformação prometida"
  se_ticket_medio_caindo: "Revisar posicionamento e stack de valor"

saida:
  - campo: pricing_audit_report
    persistido: true

metricas:
  - "Diagnóstico com causa raiz identificada"
  - "Mínimo 3 recomendações acionáveis"
