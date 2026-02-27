task: hormoziSysAudit()
id: hormozi-sys-audit
agent: "@hormozi-sys"
responsavel: "@hormozi-sys"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Auditoria sistêmica de alavancagem operacional da Virals.
  Identifica onde a empresa está perdendo dinheiro e tempo por falta
  de sistemas, processos manuais e gargalos de dono/gestor.

elicit: true

entrada:
  - campo: area_foco
    tipo: string
    descricao: "Área de análise (ex: vendas, onboarding, marketing)"
    obrigatorio: true
  
  - campo: horas_semanais_fundador
    tipo: number
    descricao: "Quantas horas o fundador/gestor dedica a esta área atualmente?"
    obrigatorio: false

saida:
  - campo: blueprint_escala
    tipo: document
    destino: ClickUp > OPS > Saúde Operacional
    persistido: true
  
  - campo: multiplicador_alavancagem
    tipo: number
    descricao: "Quanto a área melhora se automatizada/sistematizada"
    persistido: true

Checklist:
  - "[ ] Mapear fluxos de trabalho manuais"
  - "[ ] Identificar gargalos (onde o humano é o único caminho)"
  - "[ ] Calcular ROI operacional (horas x custo/hora)"
  - "[ ] Priorizar automações"
  - "[ ] Definir o stack de alavancagem (código, capital, conteúdo, colaboração)"

acceptance_criteria:
  - "O plano deve reduzir o tempo de envolvimento humano direto em pelo menos 20%"
  - "Deve propor uma automação ou sistema de baixo custo e alto impacto"

processo:
  step_1_mapeamento:
    titulo: "Mapeamento da Ineficiência"
    acoes:
      - "Listar todas as tarefas recorrentes da área"
      - "Cronometrar o tempo médio de cada execução"
      - "Identificar a frequência semanal"
  
  step_2_classificacao:
    titulo: "Eliminar / Simplificar / Automatizar / Delegar"
    acoes:
      - "Eliminar: O que não deveria estar sendo feito?"
      - "Simplificar: Como reduzir o esforço em 50%?"
      - "Automatizar: O que o software pode fazer 24/7?"
      - "Delegar: O que pode ser passado para um colaborador com POP?"
