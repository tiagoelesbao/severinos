# Task: Construir Oferta Completa @hormozi-sales

id: hormozi-offer-build
agent: "@hormozi-sales"
atomic_layer: Organism

descricao: |
  Construir oferta completa usando o framework Grand Slam Offer:
  stack de valor, precificação baseada em valor percebido,
  garantia que elimina risco de compra, e unit economics calculados.

processo:
  - step: "Mapear a transformação principal (antes × depois)"
  - step: "Quantificar o valor econômico/emocional da transformação"
  - step: "Identificar objeções primárias de compra"
  - step: "Construir stack de valor (core + complementos + bônus + fast-track)"
  - step: "Calcular preço = 5%-20% do valor da transformação"
  - step: "Validar: valor percebido ≥ 10× preço"
  - step: "Criar garantia que elimina risco de compra"
  - step: "Definir tiers se aplicável (entrada, core, high-ticket)"
  - step: "Calcular unit economics: CAC, LTV, LTV:CAC, payback period"
  - step: "Gerar Offer Document (template: offer-document-template.md)"

entrada:
  - "Descrição do produto/serviço"
  - "Público-alvo e ICP"
  - "Dados de CAC e LTV atuais (se existirem)"

saida:
  - campo: offer_document
    template: offer-document-template.md
    persistido: true

checklist: offer-launch-checklist.md

metricas:
  - "Valor percebido ≥ 10× preço"
  - "LTV:CAC ratio ≥ 3"
  - "Garantia definida e quantificada"
