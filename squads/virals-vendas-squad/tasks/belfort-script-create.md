# Task: Criar Script de Vendas @belfort-sales

id: belfort-script-create
agent: "@belfort-sales"
atomic_layer: Organism

descricao: |
  Criar script de vendas completo usando o Straight Line System.
  5 fases: Rapport → Diagnóstico → Apresentação → Fechamento → Objeções.
  Script base + versão WhatsApp adaptada por @thiago-reis.

processo:
  - step: "Ler o Offer Document do produto (@hormozi-sales)"
  - step: "Definir o ICP e contexto da conversa (canal, ticket)"
  - step: "Criar Fase 1 — Rapport (abertura, matching de tonalidade)"
  - step: "Criar Fase 2 — Diagnóstico (5+ perguntas-chave, BANT embutido)"
  - step: "Criar Fase 3 — Apresentação (eco da dor, ponte, prova)"
  - step: "Criar Fase 4 — Fechamento (assumptive, summary, trial close)"
  - step: "Criar Fase 5 — Mapa de objeções (framework 5 passos)"
  - step: "Adicionar guia de tonalidade por fase"
  - step: "Enviar para @thiago-reis adaptar versão WhatsApp BR"
  - step: "Validar contra script-quality-checklist.md"

entrada:
  - "Offer Document do produto"
  - "Canal primário (WhatsApp / ligação / videochamada)"
  - "Perfil do lead (nível de consciência)"

saida:
  - campo: script_principal
    template: sales-script-template.md
    persistido: true

checklist: script-quality-checklist.md

metricas:
  - "Script aprovado no checklist de qualidade"
  - "Versão WhatsApp adaptada por @thiago-reis"
