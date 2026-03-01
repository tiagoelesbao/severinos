# Task: Revisão Semanal de Performance de Vendas

id: sales-performance-review
agents: "Todos os agents do squad"
atomic_layer: Organism
cadencia: "Toda segunda-feira, 10h"

descricao: |
  Revisão semanal integrada de performance de vendas.
  Combina análise de pipeline (@ross, @blount), scripts
  (@belfort, @thiago), oferta (@hormozi) e define prioridades.

processo:
  - step: "Coletar dados de pipeline da semana anterior (ClickUp)"
  - step: "@ross + @blount: analisar números (deals, receita, close rate, ciclo, velocity)"
  - step: "@belfort + @thiago: avaliar performance de scripts e objeções"
  - step: "@hormozi: revisar tickets médios e objeções de preço"
  - step: "Gerar relatório integrado (4 seções)"
  - step: "Definir top 3 ações da próxima semana"

saida:
  relatorio_integrado:
    secao_1_numeros:
      - "Deals abertos, fechados (ganhos e perdidos), em andamento"
      - "Receita da semana vs. meta"
      - "Close rate geral e por produto"
      - "Ciclo médio e pipeline velocity"
    secao_2_qualidade:
      - "Objeções mais comuns e taxa de superação"
      - "Estágio com maior vazamento"
      - "Scripts com melhor e pior performance"
    secao_3_oferta:
      - "Tickets médios por produto"
      - "Objeções de preço: percepção ou price point?"
      - "Recomendação de ajuste de oferta"
    secao_4_proxima_semana:
      - "Top 3 ações de melhoria com dono e prazo"
      - "Deals prioritários para fechar"
      - "Treinamento necessário"
      - "Teste a realizar"

template: sales-report-template.md

metricas:
  - "Relatório entregue toda segunda-feira"
  - "Top 3 ações definidas com dono e prazo"
