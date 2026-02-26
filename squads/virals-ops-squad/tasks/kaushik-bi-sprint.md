task: kaushikBiSprint()
id: kaushik-bi-sprint
agent: "@kaushik"
responsavel: "@kaushik"
responsavel_type: agent
versao: 1.0.0
atomic_layer: Organism

descricao: |
  Sprint de Business Intelligence de 2 semanas para analisar o estado
  atual das métricas da Virals, identificar insights acionáveis e
  definir a OMTM do próximo ciclo.

elicit: true

entrada:
  - campo: periodo_analise
    tipo: string
    exemplo: "Jan-Mar 2026"
    obrigatorio: true
  
  - campo: area_foco
    tipo: string
    opcoes: ["empresa", "marketing", "vendas", "produto", "ops"]
    obrigatorio: false
    default: "empresa"
  
  - campo: omtm_ciclo_anterior
    tipo: string
    descricao: "OMTM do ciclo anterior para comparação"
    obrigatorio: false

saida:
  - campo: relatorio_bi
    tipo: document
    formato: "BI Report Template"
    destino: ClickUp > OPS > BI & Métricas
    persistido: true
  
  - campo: omtm_proximo_ciclo
    tipo: string
    descricao: "OMTM definida para o próximo ciclo"
    persistido: true
  
  - campo: recomendacoes_acionaveis
    tipo: array
    descricao: "Mínimo 3 recomendações com dono e prazo"
    persistido: true

Checklist:
  - "[ ] Coletar e organizar dados"
  - "[ ] Analisar padrões e segmentações"
  - "[ ] Gerar insights What/So What/Now What"
  - "[ ] Definir OMTM do próximo ciclo"
  - "[ ] Produzir relatório final"

pre_conditions:
  - "Acesso aos dados do período (Google Analytics, ClickUp, CRM, financeiro)"
  - "Contexto do negócio no período (lançamentos, campanhas, mudanças)"

post_conditions:
  - "Relatório de BI produzido com análise de todas as métricas nível 1 e 2"
  - "OMTM do próximo ciclo definida e justificada"
  - "Mínimo 3 recomendações acionáveis com dono e prazo"
  - "Dashboard atualizado no ClickUp"

acceptance_criteria:
  - "Métricas apresentadas com contexto (Y/Y ou MoM comparativo)"
  - "Distinção clara entre métricas de vaidade e métricas acionáveis"
  - "OMTM tem critério de medição definido"
  - "Recomendações são específicas (não genéricas)"

processo:
  step_1_coleta:
    titulo: "Coleta e Organização de Dados"
    acoes:
      - "Extrair métricas nível 1 (empresa): MRR, CAC, LTV, Churn"
      - "Extrair métricas nível 2 (produto): DAU/MAU, Onboarding, NPS"
      - "Extrair métricas nível 3 (marketing/vendas): CPL, conversão, ROAS"
      - "Organizar em planilha com comparativo período anterior"
  
  step_2_analise:
    titulo: "Análise e Identificação de Padrões"
    acoes:
      - "Identificar tendências (subindo, caindo, estável)"
      - "Segmentar anomalias (o que explica variações inesperadas?)"
      - "Correlacionar: qual ação causou qual resultado?"
      - "Separar vaidade de ação"
  
  step_3_insights:
    titulo: "Geração de Insights"
    acoes:
      - "Para cada insight: O quê? Por quê? E daí? (what, so what, now what)"
      - "Priorizar insights por impacto potencial"
      - "Formatar como recomendações acionáveis com dono e prazo"
  
  step_4_omtm:
    titulo: "Definição da OMTM"
    acoes:
      - "Identificar o maior limitante do crescimento atual"
      - "Definir a métrica que, se melhorar, move mais o negócio"
      - "Garantir que a OMTM é mensurável semanalmente"
      - "Definir meta para a OMTM no próximo ciclo"
  
  step_5_relatorio:
    titulo: "Produção do Relatório"
    acoes:
      - "Usar BI Report Template"
      - "Dashboard visual no ClickUp"
      - "Apresentação executiva (máx. 1 página de insights)"
      - "Anexar dados brutos para referência"

duracao_esperada: "Semana 1: coleta e análise. Semana 2: insights e relatório."
