# Task: Criar Playbook WhatsApp de Vendas @thiago-reis

id: thiago-whatsapp-playbook
agent: "@thiago-reis"
atomic_layer: Organism

descricao: |
  Criar playbook completo de vendas via WhatsApp para o
  contexto brasileiro. Adaptar scripts de @belfort-sales
  para a gramática, ritmo e etiqueta do WhatsApp.

processo:
  - step: "Receber script base de @belfort-sales"
  - step: "Adaptar linguagem para tom conversacional BR"
  - step: "Criar sequência de primeiro contato WhatsApp (5 mensagens)"
  - step: "Criar versões em áudio estratégico (35-90s) para fases-chave"
  - step: "Adaptar objeções para formato WhatsApp (respostas curtas)"
  - step: "Criar cadência de follow-up WhatsApp (regra dos 3 dias)"
  - step: "Incluir orientações sobre emojis (moderação) e formatação"
  - step: "Validar: nenhum bloco de texto > 4 linhas"

adaptacoes_whatsapp:
  principios:
    - "Mensagem curta primeiro. Nunca abrir com bloco de texto."
    - "Áudios estratégicos (35-90s) — mais pessoal que texto"
    - "Emojis com moderação para clareza, não decoração"
    - "Nunca enviar pdf/proposta sem confirmar interesse verbal"
    - "Ler o tom do lead e espelhar (formal/informal)"

  regra_dos_3_dias:
    dia_1: "Menção ao interesse demonstrado (não 'você viu a proposta?')"
    dia_3: "Case study curto de cliente similar em áudio ou texto"
    dia_7: "Pergunta de requalificação"

saida:
  - campo: whatsapp_playbook
    persistido: true

metricas:
  - "Playbook WhatsApp completo e adaptado culturalmente"
  - "Nenhuma mensagem > 4 linhas"
  - "Prova social com depoimentos de clientes brasileiros"
