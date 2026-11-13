# Guia de Uso Completo: Virals Creators Hunting Squad 🎯

Bem-vindo ao guia definitivo de uso do Squad de Hunting de Creators. Este sistema automatiza e orquestra todo o processo de identificação, qualificação, abordagem e gestão de micro e nano creators para produção autêntica de UGC (User Generated Content) para as marcas parceiras da Virals.

Este squad foi desenhado seguindo o padrão AIOX e implementa o processo documentado no `POP-HUNTER-001`.

---

## 1. Visão Geral da Arquitetura

O squad funciona como uma agência de hunting altamente eficiente, onde as responsabilidades são divididas entre **5 agentes especializados** inspirados em experts reais da indústria.

Todo o processo — chamado de pipeline — é **"ICP-C Driven"** (Ideal Creator Profile - Customer). Isso significa que **nenhuma ação começa sem um ICP-C bem definido e preenchido**. O ICP-C é o DNA que dita as hashtags para mineração, os thresholds de qualificação, o tom de voz da abordagem e os termos da parceria.

### As 4 Fases do Pipeline

O pipeline opera em 4 fases sequenciais (+ 1 fase zero de preparação):

1.  **Fase 0 — Preparação:** Transformar as necessidades do cliente (ICP-C) em heurísticas de busca para as IAs e scrapers.
2.  **Fase 1 — Identificação:** Mineração bruta no TikTok, Instagram e Meta Ads usando os critérios gerados.
3.  **Fase 2 — Qualificação:** Filtragem implacável aplicando o "Creator Score Proprietário" (Score > 7 avança).
4.  **Fase 3 — Abordagem:** Geração de scripts persuasivos e hiper-personalizados baseados na "Walker Sequence", culminando na execução humana do contato (DM/WhatsApp).
5.  **Fase 4 — Gerenciamento:** Onboarding via ClickUp, acompanhamento de entregáveis da creator e geração do reporte executivo (L10) de performance do pipeline.

---

## 2. Conhecendo seu Time (Os Agentes)

Cada agente pode ser ativado a qualquer momento no seu terminal/IDE em caso de necessidade de decisões complexas ou para dar continuidade a uma fase específica.

| Agente | Personagem | Inspirado em | Papel Principal | Foco da Fase | Comando de Ativação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **@hunter-chief** | Joe | Joe Gagliese (Viral Nation) | **Orquestrador** | Fase 0 / Macro | `/virals-hunter-chief` |
| **@hunter-scout** | Mae | Mae Karwowski (Obviously) | **Discovery** | Fase 1 | `/virals-hunter-scout` |
| **@hunter-analyst**| Gil | Gil Eyal (HYPR) | **Scoring** | Fase 2 | `/virals-hunter-analyst` |
| **@hunter-closer** | Brittany | Brittany Hennessy (Hearst) | **Outreach** | Fase 3 | `/virals-hunter-closer` |
| **@hunter-manager**| Jason | Jason Falls (Winfluence)| **CRM / L10** | Fase 4 | `/virals-hunter-manager` |

---

## 3. Passo a Passo do Fluxo de Trabalho (End-to-End)

Abaixo descrevemos como operar o pipeline inteiro, assumindo uma simulação de "início de mês" ou entrada de um novo cliente.

### Etapa A: Start do Hunting (Fase 0 - Digestão Automática)

A "Fase 0" agora é quase 100% automatizada. Você não precisa mais preencher o template do ICP-C na mão caso já tenha um briefing do cliente.

1.  **Receba o Briefing:** Pegue o escopo/briefing livre do cliente (txt, pdf, markdown) e salve como um arquivo Markdown dentro da pasta `data/icp-briefings/`. O formato de escrita é livre.
    *Ex: `data/icp-briefings/nome-da-marca.md`*
2.  **Ative o Orquestrador:** Abra o chat (Codex / Antigravity / AIOX) e ative o Joe:
    ```bash
    /virals-hunter-chief
    ```
3.  **Inicie a Caçada:** Peça para ele fazer a ingestão do documento:
    ```
    *start-hunt ./data/icp-briefings/nome-da-marca.md
    ```
4.  **O que o Joe fará? (Automação Base):** 
    Sem você precisar tocar em nenhum script no terminal, o Joe rodará o workflow inteligente de *parser* (`scripts/briefing-to-icp.js`). 
    Ele vai isolar "dores", "benefícios", "diretrizes de marketing" e "nichos", cruzando os dados lidos com a sua base (`niches-catalog.yaml`). 
    Ele então **salvará magicamente as 3 peças cruciais**:
    - O ICP-C totalmente parametrizado e estruturado na pasta `data/icp-structured/`.
    - Os Critérios de Busca Extenuantes no formato JSON.
    - O Relatório de Aprovação (`Readiness Report`).
5.  Em segundos, o Joe retorna informando qual a nota do Readiness Report (se for ≥ 75%, ele sugere acionar a Mae para a próxima etapa).

### Etapa B: Mineração (Fase 1)

Com as heurísticas definidas na Fase 0 (armazenadas em `data/search-criteria/`), a agente Mae assume o controle para gerar volume e inteligência através do **Pipeline de Mineração Unificada**.

1.  **Ative a Mae:**
    ```bash
    /virals-hunter-scout
    ```
2.  **Inicie a Mineração Completa:**
    ```
    *mine-all juvelina-organics
    ```
3.  **O que a Mae fará? (Motor Unificado):**
    Ela rodará o script `scripts/pipeline-miner.js`, que realiza as seguintes ações em um único fluxo:
    - **Discovery por Hashtags:** Varre o TikTok/Instagram usando as hashtags ideais extraídas do briefing.
    - **Sniper de Comentários:** Monitora os perfis dos concorrentes definidos no `search-criteria` para capturar usuários reais que interagem com eles.
    - **Cálculo de Viral Score:** Classifica cada creator minerada com base em views, likes e engajamento.
    - **Filtro Geográfico (Anti-Gringo):** Filtra automaticamente creators que não performam no Brasil (conforme foco do ICP-C).
    - **Geração do Dossier:** Compila tudo em um arquivo Markdown rico em `data/miners/dossier-{cliente}-{data}.md`.

4.  **Resultado da Fase:** O Dossier gerado contém o **Ranking Viral (Foco Conversão BR)** e a **Shortlist para Peneira**, servindo de input direto para a Fase 2 de Scoring.
    Isso vai puxar a bio, % de followers e contagem dos últimos 12 vídeos das creators mineradas em `data/profiles/`.

### Etapa C: A Peneira / Scoring (Fase 2)

Temos volume. Precisamos agora de precisão e auditoria. O Gil aplica o motor de scoring proprietário para transformar a lista bruta em uma Shortlist de Elite baseada em dados reais.

1.  **Ative o Gil:**
    ```bash
    /virals-hunter-analyst
    ```
2.  **Inicie a Qualificação:**
    ```
    *score-all juvelina-organics
    ```
3.  **O que o Gil fará? (Motor de Scoring):**
    Ele rodará o script `scripts/pipeline-qualify.js`, que processa o JSON gerado na Fase 1:
    - **Auditoria Numérica:** Gil analisa as métricas de engajamento, frequência de postagem e fit de nicho sem suposições subjetivas.
    - **Cálculo das 7 Dimensões:** Aplica os pesos definidos em `config/scoring-weights.yaml` (Engagement, Autenticidade, Rosto, Nicho, Frequência, Demografia e Crescimento).
    - **Classificação em Tiers:** Separa as creators em **Gold** (Premium), **Silver** (Qualificadas) e **Bronze/Rejected**.
    - **Dossier de Qualificação:** Gera o artefato final `data/scorecards/dossier-qualificacao-{cliente}-{data}.md`.

4.  **Resultado da Fase:** O Dossier de Qualificação destaca as melhores creators no topo para abordagem imediata, mas mantém todos os perfis minerados em uma seção de "Base de Dados" (Bronze/Rejected) ao final do arquivo, garantindo que nenhum dado seja perdido e permitindo reavaliação manual se necessário. Perfis com **Score >= 7** são automaticamente aprovados para a Fase 3.
    O Gil garantirá se os scores são de público orgânico ou bots mascarando visualizações. As validadas recebem carimbo para a fase 3.

### Etapa D: Abordagem (Fase 3 - Humanos no Loop)

A Brittany vai formular armas cirúrgicas baseadas na "Walker Sequence", mas **um HUMANO aperta os botões nas redes sociais**. Nunca faremos disparo automatizado de bots em mídias orgânicas.

1.  Ative a Brittany:
    ```bash
    /virals-hunter-closer
    ```
2.  Gere as armas para a equipe (DMs em lote):
    ```
    *generate-scripts
    ```
3.  **O que a Brittany fará?** Para o batch de *creators* com Score > 7, ela criará scripts hiper-personalizados na pasta `data/outreach/`. Ex: Para *Tiers* de Prata e Ouro, ela analisa o perfil, inspeciona um dos últimos 3 posts lidos, e formula os gatilhos Ganho, Urgência ou Prova Social. Citar um último post com detalhe eleva o índice de resposta (SLA esperado: > 10%).
4.  A Brittany criará o script 1, e D+1, D+3 e D+7 de Follow Up.
5.  **Ação Humana:** Sua equipe operacional senta-se, abre o gerador gerado pela Brittany, copia, valida, dá enter no IG/TikTok em lote.
6.  Se houver conversão (responderem e pedirem mais info), peça para a Brittany formular o gancho para Whatsapp:
    ```
    *prepare-whatsapp
    ```

### Etapa E: Gerenciamento e ClickUp (Fase 4)

Com as *creators* aceitando fazer a parceria, o Jason e o processo encerram o ciclo de hunting e iniciam Gestão de Contratação.

1.  Ative o Jason:
    ```bash
    /virals-hunter-manager
    ```
2.  Hora de on-boardar e integrar contratos via ClickUp para toda a empresa enxergar:
    ```
    *onboard-creator @mariadasdores
    *sync-crm
    ```
3.  **O que o Jason fará?** Movimentará os JSONs, pegará o batch de sucesso para a lista Prospecção ou ativará a creator gerando custom fields valiosos via API no ClickUp direto para a lista **CRM Hunter (ID: 901325463813)**.
4.  Toda semana, para atualizar os founders ou gestores (metodologia L10 EOS):
    ```
    *weekly-report
    ```
    Gera as visualizações de funil em `data/reports/`.

---

## 4. Rodando os Scripts Avulsos (Guia para Ops/Devs)

Seu squad não depende exclusivamente do terminal conversacional para trabalhar. Todas as ferramentas fundamentais são scripts puros que aceitam argumentos (útil para automações `.bat` cruas ou agendamentos via crontab).

Arquivos vivem em `scripts/`. Abra um terminal de linha de base e rode:

### Scraping Básico de Nichos
\`\`\`bash
node scripts/hunt-creators.js --hashtags "#fitness,#treino" --platform tiktok --min-followers 2000 --max-followers 50000
node scripts/tiktok-creator-search.js --niche fitness
\`\`\`

### Inteligência e Extração Detalhada
\`\`\`bash
node scripts/extract-profile-data.js --handle @sendyqueiroz --platform instagram
node scripts/extract-profile-data.js --batch ./data/discoveries/discovery-hashtag-2026-04-02.json
\`\`\`

### Motor de Scoring 
Pode ser testado de forma seca, inclusive ele é capaz de autotestar baseado nos critérios raízes de `POP-HUNTER-001`.
\`\`\`bash
# Realiza um autoteste em perfis chumbados 
node scripts/score-creator.js --test
# Realiza avaliação em lote
node scripts/score-creator.js --batch ./data/discoveries/discovery-hashtag-2026-04-02.json
\`\`\`

### Geração Visual para L10 (Report Semanal)
Sem parâmetros, ele puxará os KPIs do "Monday-to-Sunday" vigente.
\`\`\`bash
node scripts/weekly-report-generator.js
\`\`\`

### ClickUp CRM Pushing (Aviso Crítico)
Antes de rodar as integrações nativas de push e pull bidirecionais de listas do ClickUp, confirme os "Custom Fields" no portal Clickup via `docs/setup-clickup-fields.md`. Crie o field e o Popule de volta em `config/clickup-ids.yaml`.
\`\`\`bash
# Testar de forma segura o CRM Sync sem causar estrago
node scripts/clickup-pipeline-sync.js --push-prospects ./data/scorecards/batch-scores-2026-04-02.json --dry-run
\`\`\`

---

## 5. Manutenção e Flexibilização (Config e Data)

Para calibrar o resultado do Squad inteiro para a maturidade de novos produtos se for preciso, sem tocar em códigos:

*   **Critérios Base:** Vá em `config/scoring-weights.yaml`. Se amanhã seguidores virar vaidade excessiva, diminua os "pesos" daquela propriedade e redistribua na "autenticidade de conteúdo".
*   **Novas Frentes de Mercado:** `data/niches-catalog.yaml`. Vai lançar um produto para bebês? Insira um novo array dentro desse YAML chamado `maternidade` e coloque hashtags como `#mae #maternidadereal` associados e deixe o orquestrador buscar por lá sozinho na próxima varredura de ICP-C.
*   **A Abordagem Morreu?:** Vá em `config/outreach-sequences.yaml` - todas as peças verbais e e-mails gerados pela Brittany herdam o que está estruturado nesses templates de variação psicológica. Atualize os templates e novos geradores sairão convertidos em 1 clique.

## 6. Integridade Regulatória (Checklists)

Quando o squad reportar erros sistêmicos bloqueantes no meio de etapas, acesse os arquivos cruéis da `checklists/`:
- `icp-readiness-checklist.md` (Gate de começo)
- `creator-qualification-checklist.md` (Score mínimo para avanço)
- `outreach-readiness-checklist.md` (Revisão da Automação DM)
- `onboarding-checklist.md` (Gate de assinatura de Contratos)
- `weekly-review-checklist.md` (Review Semanal Executiva)

É recomendável seguir e olhar os checklists na primeira rodada do Squad para entender os porquês do funil reter/excluir perfis. O processo é rígido. E é rígido por design.

---
_Gerado e documentado pela Inteligência de Sistema Antigravity / AIOX-Core._
