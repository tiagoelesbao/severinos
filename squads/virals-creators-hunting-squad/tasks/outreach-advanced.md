# Task: Outreach & Closing Avançado (Fase 3)

**ID:** VH-TASK-300
**Phase:** 3 — Outreach & Closing
**Agent:** @hunter-closer (Brittany)
**Execution Type:** Worker (pipeline-outreach.js)
**Status:** active

---

## Objetivo

Transformar a lista de creators qualificadas e selecionadas (marcadas com `[x]` no dossier da Fase 2) em um pacote completo de abordagem pronto para execução humana. A Brittany orquestra:

1. Extração das creators aprovadas do dossier de qualificação
2. Personalização IA de cada DM (OpenRouter free) — TikTok como canal primário
3. Geração de sequência completa: DM TikTok → WhatsApp → Follow-ups D+1/D+3/D+7 → Closing Guide
4. Criação automática de cards no ClickUp (Space Comercial → Hunter ADS System → Prospecção)

## Input

- Slug do cliente (ex: `juvelina-organics`) — o pipeline localiza automaticamente o dossier mais recente em `data/scorecards/`.
- Creators devem estar marcadas com `- [x]` na coluna "Seguir?" do dossier de qualificação.

## Output

- **Dossier de Outreach** em `data/outreach/dossier-outreach-{cliente}-{date}.md`
  - Scripts DM TikTok personalizados por IA
  - Scripts WhatsApp de conversão
  - Sequência de follow-up (D+1, D+3, D+7)
  - Closing guide por creator
- **Batch JSON** em `data/outreach/outreach-batch-{cliente}-{date}.json`
- **Cards ClickUp** na lista Prospecção (status: `contacted`) — 1 card por creator

## Action Items

1. Iniciar o pipeline de outreach avançado:
   ```bash
   node squads/virals-creators-hunting-squad/scripts/pipeline-outreach.js {cliente}
   ```
   *Ou usar o comando nativo `@hunter-closer *outreach-all {cliente}`.

2. Para testar sem salvar ou criar cards no ClickUp:
   ```bash
   node squads/virals-creators-hunting-squad/scripts/pipeline-outreach.js {cliente} --dry-run
   ```

3. Para pular o sync do ClickUp (apenas gerar dossier):
   ```bash
   node squads/virals-creators-hunting-squad/scripts/pipeline-outreach.js {cliente} --skip-clickup
   ```

4. O script automaticamente:
   - Lê o dossier mais recente de `data/scorecards/`
   - Extrai apenas creators com `- [x]`
   - Seleciona variação Walker (Ganho / Social Proof / Escassez) por perfil
   - Chama OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`) para personalizar cada DM TikTok
   - Gera template WhatsApp (sem IA — estruturado)
   - Gera follow-ups D+1/D+3/D+7
   - Gera closing guide por creator
   - Cria cards no ClickUp com status `contacted`

## Agentic Performance

- **Modelo:** `meta-llama/llama-3.3-70b-instruct:free` (via OpenRouter)
- **Fallback:** `openrouter/auto` (roteamento automático free)
- **Chave:** `OPENROUTER_API_KEY` em `.env` raiz do projeto
- **Degradação Graciosa:** Se OpenRouter indisponível, usa templates base sem personalização IA — pipeline não para.

## Acceptance Criteria

- [ ] Todas as creators marcadas `[x]` no dossier foram processadas
- [ ] Cada creator tem: DM TikTok + WhatsApp + Follow-ups D+1/D+3/D+7 + Closing Guide
- [ ] Dossier de Outreach gerado em `data/outreach/`
- [ ] Cards criados no ClickUp com status correto (contacted)
- [ ] Scripts marcados com `[PERSONALIZAR]` onde requerem revisão humana
- [ ] Nenhuma creator duplicada no ClickUp

## Notas Operacionais

- **Canal primário:** TikTok DM (não Instagram)
- **Horário ideal de envio:** Segunda a Quarta, 10h-12h ou 18h-20h
- **Máximo de follow-ups:** 3 (D+1, D+3, D+7) — nunca mais que isso
- **Se respondeu NÃO:** Parar sequência imediatamente e marcar como `rejected` no ClickUp
- **Se taxa de resposta < 10%:** Acionar @walker-launch para revisão na L10 Meeting
