# Task: Criar Treinamento de Closers @belfort-sales

id: belfort-closer-training
agent: "@belfort-sales"
atomic_layer: Organism

descricao: |
  Criar módulo completo de treinamento para closers:
  materiais, roleplays, guia de tonalidade e quiz de certificação.

processo:
  - step: "Compilar materiais de referência (offer doc, scripts, objeções)"
  - step: "Criar guia de tonalidade (certeza, curiosidade, escassez, empatia)"
  - step: "Criar 3 roleplays graduais (fácil, médio, difícil)"
  - step: "Definir critérios de avaliação (nota 1-10 em cada roleplay)"
  - step: "Criar quiz de certificação (conhecimento do produto + processo)"
  - step: "Montar o Playbook do Closer (template: playbook-closer-template.md)"

saida:
  - campo: playbook_closer
    template: playbook-closer-template.md
    persistido: true

checklist: closer-onboarding-checklist.md

metricas:
  - "Playbook completo e aprovado"
  - "3 roleplays com cenários realistas"
  - "Quiz de certificação funcional"
