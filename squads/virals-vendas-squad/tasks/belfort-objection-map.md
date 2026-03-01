# Task: Mapear Objeções @belfort-sales

id: belfort-objection-map
agent: "@belfort-sales"
atomic_layer: task

descricao: |
  Mapear as top 10 objeções para um produto específico e criar
  respostas padronizadas usando o framework de 5 passos.
  Identificar a objeção REAL por trás da declarada.

processo:
  - step: "Coletar objeções mais frequentes (dados de CRM, feedback de closers)"
  - step: "Classificar: objeção declarada vs. objeção real"
  - step: "Para cada objeção: criar script usando o framework 5 passos"
  - step: "Incluir third-party stories para as top 5 objeções"
  - step: "Enviar para @thiago-reis adaptar linguagem WhatsApp BR"
  - step: "Compilar mapa de objeções no Playbook do Closer"

framework_5_passos:
  passo_1: "Reconhecer: 'Entendo perfeitamente'"
  passo_2: "Qualificar: 'Fora isso, você enxerga valor?'"
  passo_3: "Isolar: 'Se eu resolver [objeção], você avança?'"
  passo_4: "Resolver com prova ou garantia"
  passo_5: "Retestar: 'Isso faz sentido?'"

saida:
  - campo: objection_map
    persistido: true

metricas:
  - "10 objeções mapeadas com respostas"
  - "Cada resposta trata objeção real, não declarada"
