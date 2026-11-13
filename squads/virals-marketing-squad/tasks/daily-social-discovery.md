# TASK: Daily Social Media Discovery & Monitoring
# ID: VM-TSK-DAILY-001
# Agent: marketing-chief
# Type: orchestrated/interactive
# Version: 2.0
# Trigger: `*daily-monitor`

status: pending
responsible_executor: marketing-chief
execution_type: interactive

description: |
  Pipeline diário de benchmarking competitivo. Captura posts publicados nas
  últimas 36h dos perfis de referência da Virals, calcula Viral Score e
  entrega rankings por plataforma + consolidado em `daily-monitoring/{YYYY-MM-DD}/`.

  Protocolo de mínima fricção: ao receber `*daily-monitor`, o agente abre UM
  checklist (multi-select de plataformas) e tudo acontece a partir daí.

# ────────────────────────────────────────────────────────────────────
# PARAMETROS DE EXECUCAO
# ────────────────────────────────────────────────────────────────────

inputs:
  client_slug: "virals"   # default; resolvido em runtime via --client
  master_profiles_yaml: "squads/virals-marketing-squad/data/clients/{client_slug}/monitoring/monitoring-profiles.yaml"
  default_lookback_hours: 36
  default_min_engagement: 10

outputs:
  base_dir: "workspaces/businesses/{client_slug}/marketing/daily-monitoring/{YYYY-MM-DD}/"
  files:
    - "_summary-{YYYY-MM-DD}.md (consolidado cross-platform com tabela executiva)"
    - "instagram-ranking-{YYYY-MM-DD}.md (se selecionado)"
    - "tiktok-ranking-{YYYY-MM-DD}.md (se selecionado)"
    - "youtube-ranking-{YYYY-MM-DD}.md (se selecionado)"
    - "linkedin-ranking-{YYYY-MM-DD}.md (se selecionado)"
  runtime_artifact: "services/ETL/Extract/Links/.runtime/profiles-{YYYY-MM-DD}.yaml (gitignored)"

# ────────────────────────────────────────────────────────────────────
# PROTOCOLO DE EXECUCAO (Claude executor)
# ────────────────────────────────────────────────────────────────────

steps:

  - id: step-0-checklist
    name: "Checklist Interativo de Plataformas"
    instructions: |
      USE A FERRAMENTA `AskUserQuestion` com:
        question: "Quais redes sociais entram no monitoramento de hoje?"
        header: "Redes"
        multiSelect: true
        options:
          - label: "Instagram"
            description: "29 perfis · Reels e Posts"
          - label: "TikTok"
            description: "16 perfis · Vídeos curtos"
          - label: "YouTube"
            description: "24 canais · Vídeos longos e Shorts"
          - label: "LinkedIn"
            description: "Perfis B2B (requer sessão autenticada)"

      Mapeie a resposta para slugs minúsculos:
        Instagram → instagram | TikTok → tiktok | YouTube → youtube | LinkedIn → linkedin

      Se o usuário não selecionar nenhuma → ABORTAR com mensagem:
        "Nenhuma plataforma selecionada. Reexecute *daily-monitor."

  - id: step-1-resolve-date
    name: "Resolver data de execução"
    instructions: |
      DATE = hoje em formato YYYY-MM-DD (timezone America/Sao_Paulo).
      Use `Get-Date -Format yyyy-MM-dd` (PowerShell) ou inferência interna.
      OUTPUT_DIR = workspaces/businesses/virals/marketing/daily-monitoring/{DATE}

  - id: step-1b-check-ig-session
    name: "Preflight da sessão do Instagram"
    condition: "instagram entre as plataformas selecionadas"
    instructions: |
      Rodar:  node services/ETL/Extract/auth/ig-session.js

      Exit 0 → sessão viva; o fallback Playwright está operante.
      Exit 1 → sessão morta. O monitor AINDA roda (a API anônima cobre parte dos
      perfis), mas os perfis que ela não devolver serão PULADOS.

      Se reprovar, avisar o dono e pedir que ELE rode (abre navegador, exige login):
        node services/ETL/Extract/scrapers/ig-login.js
      Nunca executar o login por conta própria.

      Contexto: a sessão do BROWSER morre antes da sessão da API — a API pode
      responder 200 enquanto a navegação já cai na tela "Continuar como @user"
      (observado em 2026-07-21 com sessão de 37 dias).

  - id: step-2-execute-pipeline
    name: "Executar pipeline de discovery"
    instructions: |
      Comando exato (PowerShell ou Bash):

        node services/ETL/Extract/scrapers/daily-monitor.js --platforms={CSV_PLATAFORMAS} --hours=36

      Onde {CSV_PLATAFORMAS} = lista separada por vírgula (ex: "instagram,tiktok").

      O wrapper cuida de:
        - Filtrar o YAML mestre pelas plataformas escolhidas
        - Persistir YAML runtime em .runtime/
        - Rodar SocialDiscovery (engine v3.2)
        - Gerar 1 .md por plataforma + 1 consolidado

      TIMEOUT recomendado: 600000ms (10min) — Playwright + 4 redes pode levar tempo.

  - id: step-3-validate
    name: "Validar entregas"
    instructions: |
      Após execução, verificar com `Glob` ou `ls` que existem em OUTPUT_DIR:
        - _summary-{DATE}.md (sempre)
        - {plataforma}-ranking-{DATE}.md (uma para cada selecionada)

      Se algum estiver ausente ou com 0 posts:
        - Conferir log em services/ETL/Extract/outputs/discovery_debug/run_log.txt
        - Reportar ao usuário com diagnóstico (sessão expirada, perfil bloqueado, etc.)

  - id: step-4-handoff
    name: "Apresentar resultado ao usuário"
    instructions: |
      Resumir em 5-8 linhas:
        - Plataformas executadas
        - Total de posts capturados por rede
        - Top 3 criadores virais do dia (cross-platform)
        - Caminho da pasta de output
        - Sugestão de próxima ação (ex: "ative @mrbeast-mk para auditar os top hooks").

# ────────────────────────────────────────────────────────────────────
# CRITERIOS DE ACEITACAO
# ────────────────────────────────────────────────────────────────────

acceptance_criteria:
  - "Checklist multi-select foi apresentado ao usuário antes de qualquer execução."
  - "Pasta {OUTPUT_DIR} criada com permissões corretas."
  - "1 arquivo .md por plataforma selecionada existe e contém tabela ordenada por Viral Score (decrescente)."
  - "Arquivo _summary-{DATE}.md existe e contém: visão executiva + rankings completos."
  - "Score de cada post calculado como (Views × 0.1) + (Likes × 1) + (Comments × 5)."
  - "Posts com score < 10 ou fora da janela de lookbackHours são excluídos."
  - "URLs no relatório são acessíveis (formato canonical do post)."

# ────────────────────────────────────────────────────────────────────
# TROUBLESHOOTING
# ────────────────────────────────────────────────────────────────────

failure_modes:
  - symptom: "Plataforma retorna 0 posts inesperadamente"
    diagnosis: "Sessão de cookies expirada (services/ETL/Extract/auth/{platform}_session.json)"
    action: "Acionar @devops para reautenticar via *-login.js"

  - symptom: "Perfis relevantes do Instagram somem do ranking"
    diagnosis: |
      Cascata do IG: API anônima → API autenticada → fallback Playwright.
      A API anônima leva HTTP 400 quando o IP está rate-limitado; o fallback só
      cobre a lacuna se a sessão do BROWSER estiver viva.
    action: |
      1. Conferir `_falhas-de-captura-{DATE}.md` no output do dia — ele nomeia cada
         perfil não capturado e o motivo. Se o arquivo existe, o ranking é parcial.
      2. Rodar `node services/ETL/Extract/auth/ig-session.js`.
      3. Se reprovar, o dono renova com `node services/ETL/Extract/scrapers/ig-login.js`
         e o monitor é reexecutado.

  - symptom: "Monitor demora demais no Instagram"
    diagnosis: "IP rate-limitado: cada perfil paga cooldown de API antes do browser"
    action: |
      O circuit breaker desliga a API após 3 bloqueios seguidos (sondagem a cada 10
      perfis). Ajustes por env: IG_THROTTLE_MS, IG_COOLDOWN_MS, IG_API_ATTEMPTS,
      IG_CIRCUIT_THRESHOLD. Para desligar o browser: IG_PLAYWRIGHT_FALLBACK=0.

  - symptom: "Engine LinkedIn não funciona"
    diagnosis: "LinkedIn requer sessão autenticada e validação anti-bot mais agressiva"
    action: "Confirmar linkedin_session.json válido. Se persistir, marcar como WAIVED na execução."

  - symptom: "Erro de Playwright (browser não inicia)"
    diagnosis: "Playwright não instalado ou Chromium ausente"
    action: "Rodar `npx playwright install chromium`"

# ────────────────────────────────────────────────────────────────────
# METADATA
# ────────────────────────────────────────────────────────────────────

metadata:
  framework: "Virals Daily Monitoring v2"
  priority: "high"
  changelog:
    - "v2.0 (2026-05-02): Checklist interativo, output por plataforma + consolidado, pasta dedicada do dia"
    - "v1.1: Adicionado score de engajamento ao output"
    - "v1.0: Pipeline inicial com YAML monolítico"
