# Task: Criar Cadência de Follow-up @blount-sales

id: blount-cadencia-create
agent: "@blount-sales"
atomic_layer: task

descricao: |
  Criar cadência de follow-up multicanal para situação específica:
  inbound, outbound, reativação ou pós-venda.
  Baseado no princípio de que a maioria das vendas acontece entre
  o 5º e o 12º contato.

processo:
  - step: "Definir contexto: tipo de cadência, produto, perfil do lead"
  - step: "Calcular número de toques necessários baseado no ticket"
  - step: "Criar sequência com variedade de canal e ângulo"
  - step: "Escrever mensagens para cada toque (valor primeiro, nunca 'viu minha msg?')"
  - step: "Definir gatilhos de reativação"
  - step: "Definir critérios de saída (sucesso, pausa, encerrar)"
  - step: "Documentar usando cadencia-template.md"

regras_follow_up:
  - "Todo follow-up traz valor. Nunca 'você viu minha mensagem?'"
  - "Nunca o mesmo canal duas vezes seguidas sem resposta"
  - "Mudar o ângulo da mensagem a cada follow-up"
  - "Depois de 3 sem resposta → mudar horário"
  - "Depois de 5 sem resposta → mudar canal primário"

saida:
  - campo: cadencia
    template: cadencia-template.md
    persistido: true

metricas:
  - "Cadência com mínimo 7 toques"
  - "Variedade de canal e ângulo em cada toque"
