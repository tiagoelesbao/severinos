task: walkerPrelaunchSequence()
id: walker-prelaunch-sequence
agent: "@walker-launch"
responsavel: "@walker-launch"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Molecule

descricao: |
  Desenhar a sequência de conteúdo e emails do pré-lançamento (PLC 1, 2, 3 e 4)
  para gerar antecipação, autoridade e prova social antes da abertura do carrinho.

elicit: true

entrada:
  - campo: produto
    tipo: string
    obrigatorio: true
  
  - campo: publico_alvo
    tipo: string
    obrigatorio: true
  
  - campo: duracao_dias
    tipo: number
    default: 10
    obrigatorio: false

saida:
  - campo: plano_sequencia_plc
    tipo: document
    destino: ClickUp > OPS > Lançamentos
    persistido: true

Checklist:
  - "[ ] Definir tema do PLC 1 (A Oportunidade)"
  - "[ ] Definir tema do PLC 2 (A Jornada)"
  - "[ ] Definir tema do PLC 3 (A Experiência)"
  - "[ ] Definir tema do PLC 4 (O Script de Abertura)"
  - "[ ] Mapear gatilhos mentais por etapa"
  - "[ ] Criar cronograma de disparos"

acceptance_criteria:
  - "Cada PLC deve responder 'Por que isso?' e 'Por que agora?'"
  - "Deve haver uma call-to-action (CTA) clara em cada vídeo/email"
  - "A sequência deve culminar logicamente na abertura do carrinho"
