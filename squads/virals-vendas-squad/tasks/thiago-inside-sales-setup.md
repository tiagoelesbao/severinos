# Task: Estruturar Inside Sales @thiago-reis

id: thiago-inside-sales-setup
agent: "@thiago-reis"
atomic_layer: Organism

descricao: |
  Estruturar processo completo de inside sales para produto,
  adaptado ao mercado brasileiro: WhatsApp como canal primário,
  psicologia do comprador BR, e estratégia de parcelamento.

processo:
  - step: "Definir modelo de venda (lançamento, evergreen, high-ticket)"
  - step: "Adaptar pipeline de @ross-sales para contexto BR"
  - step: "Criar scripts de primeiro contato adaptados ao público"
  - step: "Definir estratégia de parcelamento (sempre apresentar parcelas antes do total)"
  - step: "Mapear objeções específicas BR e criar respostas"
  - step: "Criar framework de coleta de prova social local"
  - step: "Definir plataformas (Hotmart, Kiwify, etc.) e integrações"
  - step: "Treinar equipe nas especificidades do mercado BR"

psicologia_comprador_br:
  desconfianca_inicial: "Prova social local resolve"
  decisao_por_relacionamento: "Rapport antes de apresentação"
  sensibilidade_ao_preco: "Sempre apresentar em parcelas"
  urgencia_cultural: "Urgências reais, não artificiais"

saida:
  - campo: inside_sales_setup
    persistido: true

metricas:
  - "Processo adaptado para WhatsApp como canal primário"
  - "Scripts em linguagem natural brasileira"
  - "Estratégia de parcelamento definida"
