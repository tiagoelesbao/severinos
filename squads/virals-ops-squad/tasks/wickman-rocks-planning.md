task: wickmanRocksPlanning()
id: wickman-rocks-planning
agent: "@wickman"
responsavel: "@wickman"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Facilitar o planejamento de Rocks trimestrais da Virals usando
  o framework EOS/Traction. Define as 3-7 prioridades absolutas
  para os próximos 90 dias, com donos e critérios de sucesso claros.

elicit: true

entrada:
  - campo: trimestre_alvo
    tipo: string
    exemplo: "Q2 2026"
    obrigatorio: true
  
  - campo: revisao_trimestre_anterior
    tipo: object
    descricao: "Rocks do trimestre anterior e seus status"
    obrigatorio: false
  
  - campo: metas_anuais
    tipo: array
    descricao: "Metas do V/TO para o ano"
    obrigatorio: false

saida:
  - campo: rocks_trimestrais
    tipo: array
    formato: "Rock Template"
    destino: ClickUp > OPS > Rocks Trimestrais
    persistido: true
  
  - campo: scorecard_atualizado
    tipo: object
    destino: ClickUp > OPS > Scorecard
    persistido: true

Checklist:
  - "[ ] Revisar trimestre anterior"
  - "[ ] Brainstorm de candidatos"
  - "[ ] Selecionar 3-7 Rocks"
  - "[ ] Definir donos e critérios"
  - "[ ] Registrar no ClickUp"

pre_conditions:
  - "V/TO da Virals disponível (ou resumo das metas anuais)"
  - "Revisão do trimestre anterior concluída"
  - "Stakeholders relevantes disponíveis para input"

post_conditions:
  - "3-7 Rocks definidos, cada um com: descrição, dono, prazo (último dia do trimestre), critério de conclusão binário"
  - "Cada Rock aprovado pelo responsável"
  - "Rocks registrados no ClickUp"

acceptance_criteria:
  - "Todo Rock tem UM único dono (não um time)"
  - "Todo Rock tem critério de conclusão binário (feito ou não feito)"
  - "Rocks estão alinhados com pelo menos uma meta do V/TO"
  - "Não mais que 7 Rocks no total"
  - "Prazo de todos os Rocks = último dia do trimestre"

processo:
  step_1_revisao:
    titulo: "Revisão do Trimestre Anterior"
    acoes:
      - "Revisar cada Rock do trimestre anterior: ✅ Completo / ❌ Incompleto / 🔄 Moved"
      - "Para incompletos: causa raiz + decisão (encerrar, mover ou revisar)"
      - "Celebrar os completos genuinamente"
    output: "Resumo de trimestre anterior (% conclusão)"
  
  step_2_brainstorm:
    titulo: "Identificar Candidatos a Rocks"
    acoes:
      - "Listar tudo que é prioritário para o próximo trimestre (brain dump)"
      - "Aplicar filtro: isso move o negócio significativamente em 90 dias?"
      - "Eliminar to-dos disfarçados de Rocks"
    output: "Lista de 10-20 candidatos"
  
  step_3_priorizacao:
    titulo: "Priorizar e Selecionar"
    acoes:
      - "Filtrar: impacto × viabilidade em 90 dias"
      - "Selecionar no máximo 7"
      - "Definir dono para cada Rock (uma pessoa, não um time)"
    output: "Lista final de 3-7 Rocks"
  
  step_4_refinamento:
    titulo: "Refinar com Donos"
    acoes:
      - "Para cada Rock: dono confirma responsabilidade e viabilidade"
      - "Definir critério de conclusão: 'Este Rock está completo quando...'"
      - "Criar subtasks de apoio no ClickUp (opcional)"
    output: "Rocks refinados e validados pelos donos"
  
  step_5_registro:
    titulo: "Registro e Publicação"
    acoes:
      - "Criar tasks no ClickUp > OPS > Rocks Trimestrais"
      - "Compartilhar com toda a empresa"
      - "Agendar check-in de Rocks na L10 semanal"
    output: "Rocks publicados e time alinhado"

duracao_esperada: "2-4 horas (sessão de planejamento trimestral)"
