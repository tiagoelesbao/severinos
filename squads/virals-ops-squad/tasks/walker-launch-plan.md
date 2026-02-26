task: walkerLaunchPlan()
id: walker-launch-plan
agent: "@walker-launch"
responsavel: "@walker-launch"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Criar o plano completo de um lançamento de produto da Virals —
  cronograma, sequência de conteúdo, responsáveis por área,
  gates de go/no-go e métricas de acompanhamento.

elicit: true

entrada:
  - campo: produto
    tipo: string
    obrigatorio: true
  
  - campo: tipo_lancamento
    tipo: string
    opcoes: ["seed", "internal", "jv", "evergreen"]
    obrigatorio: true
  
  - campo: data_abertura_carrinho
    tipo: date
    obrigatorio: true
  
  - campo: meta_receita
    tipo: number
    descricao: "Meta de receita do lançamento (R$)"
    obrigatorio: true
  
  - campo: tamanho_lista
    tipo: number
    descricao: "Tamanho da lista de contatos a ser ativada"
    obrigatorio: false

saida:
  - campo: plano_lancamento
    tipo: document
    formato: "Launch Plan Template"
    destino: ClickUp > OPS > Lançamentos
    persistido: true
  
  - campo: cronograma_detalhado
    tipo: object
    descricao: "Timeline completo com responsáveis"
    persistido: true
  
  - campo: gates_go_nogo
    tipo: array
    descricao: "3 gates with critérios definidos"
    persistido: true

Checklist:
  - "[ ] Definir produto, tipo e meta"
  - "[ ] Criar cronograma reverso"
  - "[ ] Briefar squads envolvidos"
  - "[ ] Definir gates de Go/No-Go"
  - "[ ] Configurar tracking de métricas"

pre_conditions:
  - "Produto e oferta definidos (envolver virals-vendas-squad se necessário)"
  - "Data de abertura do carrinho definida"
  - "Budget aprovado"

post_conditions:
  - "Plano completo do lançamento documentado"
  - "Cronograma reverso criado (da data de abertura para trás)"
  - "Responsáveis de cada área confirmados"
  - "3 gates de go/no-go with critérios claros"
  - "Métricas de acompanhamento configuradas"

acceptance_criteria:
  - "Todo item do cronograma tem dono e prazo"
  - "Gates são verificáveis (binário: passou/não passou)"
  - "Plano de contingência definido para os 3 principais riscos"
  - "Todos os squads envolvidos foram briefados"

squads_envolvidos:
  virals_ops: "Orquestração geral, cronograma, gates"
  virals_marketing: "Conteúdo PLC, copy, criativos"
  virals_vendas: "Oferta, página de vendas, argumentário de suporte"
  virals_produto: "Entrega do produto, onboarding pós-compra"

duracao_esperada: "2-4 horas para plano inicial. Refinamento iterativo ao longo das semanas."
