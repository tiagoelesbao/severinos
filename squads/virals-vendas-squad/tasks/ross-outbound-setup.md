# Task: Configurar Prospecção Outbound @ross-sales

id: ross-outbound-setup
agent: "@ross-sales"
atomic_layer: task

descricao: |
  Criar cadência de prospecção outbound cirúrgica:
  ICP definido, sequência multicanal de 14 dias,
  regras de personalização e métricas de acompanhamento.

processo:
  - step: "Definir ICP: indústria, porte, cargo decisor, dor, triggers de compra"
  - step: "Criar lista de prospects qualificados"
  - step: "Criar sequência outbound de 14 dias (email, LinkedIn, WhatsApp, ligação)"
  - step: "Criar templates personalizáveis para cada toque"
  - step: "Definir regras de personalização (primeiros 2 parágrafos customizados)"
  - step: "Configurar tracking de respostas"

sequencia_outbound:
  dia_1: "Email personalizado (1-3 parágrafos, valor específico, CTA único)"
  dia_3: "LinkedIn connection + mensagem de follow-up"
  dia_6: "Email 2 (ângulo diferente — case study de perfil similar)"
  dia_10: "WhatsApp ou ligação breve (se sinal de interesse)"
  dia_14: "Email de 'break-up' (última tentativa, escassez)"

regras_de_ouro:
  - "Nunca fale do produto no primeiro contato — fale da dor ou resultado"
  - "Um CTA por mensagem. Nunca dois."
  - "Personalize os primeiros 2 parágrafos. O resto pode ser template."
  - "Foco na pessoa, não na empresa."

metricas:
  - "ICP documentado e validado"
  - "Sequência de 5 toques em 14 dias criada"
  - "Taxa de resposta target: ≥ 5%"
