# analyze-benchmark
description: "Analisa um dossiê de benchmark gerado pelo motor de ETL, focando em retenção, hooks e DNA viral."
elicit: true
args:
  dossier: "Nome do arquivo de dossiê em .aiox/handoffs/ (ex: benchmark_123.json)"

workflow:
  - step: load-dossier
    instruction: "Leia o arquivo JSON do dossiê em `.aiox/handoffs/{{dossier}}` para entender quais ativos (vídeo, áudio, frames) estão disponíveis."
    action: read_file
    path: ".aiox/handoffs/{{dossier}}"

  - step: analyze-visuals
    instruction: |
      Acesse a pasta de frames indicada no dossiê. 
      Analise a sequência de imagens para identificar:
      1. Dinâmica de cortes (frequência).
      2. Elementos de retenção visual (legendas dinâmicas, emojis, B-roll).
      3. O Hook Visual (os primeiros frames que param o scroll).
    
  - step: analyze-narrative
    instruction: |
      Ouça o áudio (ou leia a transcrição se o agente tiver capacidade de gerá-la internamente).
      Identifique a estrutura narrativa:
      - O Hook Sonoro (a primeira frase).
      - O Open Loop (o que mantém o espectador curioso).
      - O Payoff (a entrega da promessa).

  - step: generate-viral-report
    instruction: |
      Com base na análise multimodal (Visual + Áudio), gere um relatório no estilo Jimmy (MrBeast-MK):
      
      # 🚀 VIRAL DNA REPORT: [Nome do Conteúdo]
      
      ## 🪝 THE HOOK (0-3s)
      [Análise técnica do que parou o scroll]
      
      ## 📉 RETENTION ENGINEERING
      [Como o vídeo mantém a atenção após o hook? Quais gatilhos visuais/sonoros foram usados?]
      
      ## 🧬 VIRAL DNA
      [Por que esse conteúdo performa? Qual o segredo da estrutura?]
      
      ## 🛠️ ACTIONABLE INSIGHTS FOR VIRALS
      [3 coisas que nossa produção DEVE copiar ou adaptar deste benchmark]
      
      ## 🧠 PSYCHOLOGY CHECK
      [Qual gatilho psicológico está sendo explorado? (Curiosidade, Medo de perder, Autoridade, etc.)]

output:
  format: markdown
  filename: "docs/benchmarks/analysis-{{dossier}}.md"
