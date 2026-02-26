task: popCreate()
id: pop-create
agent: "@dalio ou @wickman (qualquer um do virals-ops-squad)"
responsavel: "@wickman"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Molecule

descricao: |
  Criar um novo POP (Procedimento Operacional Padrão) para um processo
  da Virals. POPs garantem que processos funcionem independente de quem
  executa — são a memória operacional da empresa.

elicit: true

versioning:
  sistema: "MAJOR.MINOR.PATCH adaptado"
  regras:
    MAJOR: "Mudança completa no processo (fluxo diferente)"
    MINOR: "Adição de etapas ou responsabilidades"
    PATCH: "Correções, clarificações, pequenos ajustes"
  
  nota_aios_insight: |
    Inspirado no versionamento semântico do sistema AIOS DevOps:
    assim como código evolui com MAJOR.MINOR.PATCH,
    POPs evoluem com a mesma lógica — permitindo rastrear
    quando um processo mudou fundamentalmente vs. foi apenas refinado.

entrada:
  - campo: nome_processo
    tipo: string
    obrigatorio: true
  
  - campo: area
    tipo: string
    opcoes: ["marketing", "vendas", "produto", "ops", "backoffice"]
    obrigatorio: true
  
  - campo: dono_processo
    tipo: string
    descricao: "Pessoa responsável pela execução e manutenção"
    obrigatorio: true
  
  - campo: gatilho
    tipo: string
    descricao: "O que inicia este processo?"
    obrigatorio: true

saida:
  - campo: pop_documento
    tipo: document
    formato: "POP Template"
    destino: ClickUp > OPS > POPs
    persistido: true

Checklist:
  - "[ ] Identificar e mapear processo"
  - "[ ] Criar rascunho seguindo template"
  - "[ ] Testar com pessoa neutra"
  - "[ ] Aprovar com o dono do processo"
  - "[ ] Publicar e versionar"

pre_conditions:
  - "Processo existe e é executado regularmente (senão, definir antes de documentar)"
  - "Dono do processo disponível para validar"

post_conditions:
  - "POP completo com todas as seções obrigatórias"
  - "Testado com alguém que não conhece o processo"
  - "Aprovado pelo dono"
  - "Registrado no ClickUp com versão 1.0.0"

acceptance_criteria:
  - "Qualquer pessoa nova consegue executar o processo só com o POP"
  - "Todas as decisões possíveis estão mapeadas (árvore de decisão se necessário)"
  - "Tempo estimado de execução está correto"
  - "Ferramentas e acessos necessários estão listados"

checklist_qualidade_pop:
  - "[ ] Objetivo claro em uma frase"
  - "[ ] Gatilho definido (o que inicia)"
  - "[ ] Pré-condições listadas"
  - "[ ] Passo a passo sem ambiguidade"
  - "[ ] Responsável de cada etapa definido"
  - "[ ] Ferramentas e acessos listados"
  - "[ ] O que fazer em caso de erro"
  - "[ ] Tempo estimado por etapa"
  - "[ ] Aprovação do dono registrada"

duracao_esperada: "1-3 horas dependendo da complexidade do processo"
