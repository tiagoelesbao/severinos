task: dalioPrinciplesAudit()
id: dalio-principles-audit
agent: "@dalio"
responsavel: "@dalio"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Auditoria de princípios operacionais da Virals. Verifica se as decisões
  e processos atuais estão alinhados com a cultura de transparência radical
  e meritocracia de ideias de Ray Dalio.

elicit: true

entrada:
  - campo: area_auditoria
    tipo: string
    descricao: "Área específica para auditar (ex: contratação, feedback, produto)"
    obrigatorio: true
  
  - campo: incidentes_recentes
    tipo: array
    descricao: "Lista de problemas ou decisões recentes para análise"
    obrigatorio: false

saida:
  - campo: relatório_auditoria
    tipo: document
    destino: ClickUp > OPS > Saúde Operacional
    persistido: true

Checklist:
  - "[ ] Identificar decisões chave do período"
  - "[ ] Confrontar decisões com os princípios documentados"
  - "[ ] Identificar desvios (onde a realidade foi ignorada)"
  - "[ ] Propor novos princípios ou ajustes nos existentes"
  - "[ ] Documentar aprendizados no Post-Mortem"

pre_conditions:
  - "Princípios da Virals documentados e acessíveis"
  - "Dados reais sobre os incidentes (sem filtros)"

post_conditions:
  - "Relatório de auditoria gerado com nota de alinhamento cultural"
  - "Mínimo 2 ajustes de princípios propostos"

acceptance_criteria:
  - "A análise não deve ser complacente; deve buscar a 'verdade brutal'"
  - "Cada falha identificada deve ter uma causa raiz sistêmica mapeada"

processo:
  step_1_coleta:
    titulo: "Coleta de Realidade"
    acoes:
      - "Ouvir as partes envolvidas no incidente"
      - "Coletar dados brutos (logs, métricas, mensagens)"
      - "Remover opiniões subjetivas da análise inicial"
  
  step_2_confronto:
    titulo: "Confronto com Princípios"
    acoes:
      - "Qual princípio deveria ter governado esta decisão?"
      - "O princípio foi seguido? Se não, por quê?"
      - "O resultado foi ruim por causa do princípio ou da execução?"
  
  step_3_sistematizacao:
    titulo: "Sistematização da Dor"
    acoes:
      - "Dor + Reflexão = Progresso"
      - "Transformar a falha em um padrão documentado para evitar repetição"
