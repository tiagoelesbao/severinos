task: popReview()
id: pop-review
agent: "@dalio ou @wickman"
responsavel: "@wickman"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Molecule

descricao: |
  Revisão periódica (semestral ou sob demanda) de um POP existente para garantir
  que ele ainda reflete a realidade operacional e continua sendo seguido pelo time.

elicit: true

entrada:
  - campo: id_pop
    tipo: string
    descricao: "ID ou Nome do POP a ser revisado"
    obrigatorio: true
  
  - campo: motivo_revisao
    tipo: string
    opcoes: ["revisao_periodica", "mudanca_processo", "falha_execucao"]
    obrigatorio: true

saida:
  - campo: pop_atualizado
    tipo: document
    formato: "POP Template"
    destino: ClickUp > OPS > POPs
    persistido: true

Checklist:
  - "[ ] Executar o processo seguindo o POP atual"
  - "[ ] Identificar passos obsoletos ou ausentes"
  - "[ ] Coletar feedback de quem executa o processo diariamente"
  - "[ ] Atualizar versão (MAJOR.MINOR.PATCH)"
  - "[ ] Notificar time sobre as mudanças"

acceptance_criteria:
  - "O POP revisado deve eliminar pelo menos uma ambiguidade identificada"
  - "Deve haver um registro claro do que mudou em relação à versão anterior"
