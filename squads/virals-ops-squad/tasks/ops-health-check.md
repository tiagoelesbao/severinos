task: opsHealthCheck()
id: ops-health-check
agent: "@wickman (primário) + @dalio (revisão)"
responsavel: "@wickman"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Diagnóstico trimestral de saúde operacional da Virals.
  Avalia os 6 componentes EOS + métricas de alavancagem sistêmica.
  Resultado: nota de saúde operacional e plano de ação.

entrada:
  - campo: trimestre
    tipo: string
    obrigatorio: true

saida:
  - campo: relatorio_saude
    tipo: document
    destino: ClickUp > OPS > Saúde Operacional
    persistido: true
  
  - campo: nota_saude
    tipo: number
    descricao: "Score de 0-100 por componente e geral"
    persistido: true
  
  - campo: top3_prioridades_melhoria
    tipo: array
    persistido: true

Checklist:
  - "[ ] Avaliar componente: Visão"
  - "[ ] Avaliar componente: Pessoas"
  - "[ ] Avaliar componente: Dados"
  - "[ ] Avaliar componente: Issues"
  - "[ ] Avaliar componente: Processos"
  - "[ ] Avaliar componente: Tração"
  - "[ ] Calcular nota final e plano de ação"

avaliacao_por_componente:
  visao:
    perguntas:
      - "Todos sabem onde a empresa quer chegar em 3-10 anos?"
      - "V/TO está atualizado e compartilhado?"
      - "Todos entendem o core values e os aplicam?"
    escala: "0-10 por pergunta"
  
  pessoas:
    perguntas:
      - "Temos as pessoas certas nos lugares certos? (GWC test)"
      - "Accountability chart reflete a realidade atual?"
      - "Issues de pessoas estão sendo endereçados, não ignorados?"
    escala: "0-10 por pergunta"
  
  dados:
    perguntas:
      - "Scorecard com métricas semanais atualizado?"
      - "Todos sabem sua métrica principal?"
      - "Decisões são baseadas em dados ou em feeling?"
    escala: "0-10 por pergunta"
  
  issues:
    perguntas:
      - "Issues list está sendo mantida honestamente?"
      - "IDS está sendo aplicado nas L10s?"
      - "Issues crônicos estão sendo resolvidos ou evitados?"
    escala: "0-10 por pergunta"
  
  processos:
    perguntas:
      - "Processos críticos estão documentados como POPs?"
      - "POPs estão sendo seguidos ou são 'decoração'?"
      - "Novos processos são documentados antes de escalar?"
    escala: "0-10 por pergunta"
  
  tracao:
    perguntas:
      - "L10s acontecem toda semana no horário combinado?"
      - "Rocks estão sendo executados com disciplina?"
      - "Accountability está presente (pessoas entregam o que prometem)?"
    escala: "0-10 por pergunta"

duracao_esperada: "Half-day da sessão trimestral"
