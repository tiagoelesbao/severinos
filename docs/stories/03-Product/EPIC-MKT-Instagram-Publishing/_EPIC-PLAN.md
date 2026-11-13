# EPIC-MKT-Instagram-Publishing — Do "para agendar" ao post real no Instagram

**Status:** Draft (aguardando validação do dono)
**Autor:** Claude · 2026-08-18
**Origem:** Pedido do founder ao ver os 4 primeiros criativos chegarem em "Agendamento, Publicações & Disparos" com o pack aprovado já visível no card — falta o último passo: publicar de verdade.

## Visão

O pipeline hoje entrega um criativo aprovado, com pack final (imagem/vídeo, ordem certa) visível na task de Agendamento. Este épico fecha o elo que falta: publicar esse criativo no Instagram de verdade, disparado do terminal, com o mínimo de fricção possível e ZERO chance de publicar algo que o founder não queira publicar.

Decisão de arquitetura já validada com o dono (ver conversa de 2026-08-18):

1. **Instagram Graph API oficial, não Playwright.** Para a conta própria (Oraclum), a API de Content Publishing funciona sem App Review completo (basta a conta ser admin/tester do App em Development). Playwright contra o Instagram é ToS-risk real — a Meta ativamente detecta e pode aplicar checkpoint/ban na conta oficial da marca. Não é aceitável pra conta de produção.
2. **Reusa a mídia que JÁ está no ClickUp.** A API do Instagram exige uma URL pública (ela mesma faz o `curl` da mídia no momento da publicação — não é upload direto, exceto vídeo grande via upload resumível). As URLs de anexo do ClickUp (`t{workspace}.p.clickup-attachments.com`, geradas pelo trabalho de hoje no campo "Pack de Criativos Aprovados") são públicas e não expiram (`signed: false`, confirmado por teste direto). **Não precisamos construir hospedagem nova** — o pack que já sobe pro card de aprovação é a própria fonte de mídia da publicação.
3. **Fases, não tudo de uma vez.** Primeiro o publish manual (founder aciona, confirma, publica) — só depois de validado é que entra a automação de agendamento (disparo sozinho na hora certa). Publicar errado numa conta real é irreversível; a ordem existe pra conter esse risco.

## Princípios

- **Confirmação explícita sempre.** Nenhuma chamada de publish real acontece sem o founder confirmar o que vai ser postado, onde, e com qual legenda — pedido explícito do founder ("sem nenhuma duvida").
- **A conta é ativo do negócio.** Qualquer automação aqui tem que ser reversível de intenção (fácil cancelar antes de publicar) mesmo que a publicação em si não seja (não existe "despublicar" limpo).
- **Reuso > reinvenção.** Mídia via anexo do ClickUp já existente; status já modelado nos 3 valores reais da list ("para agendar", "agendado", "publicado"); nenhuma infra nova além do necessário pra falar com a Graph API.
- **Setup de acesso é do founder, não do agente.** Criar o App Meta, conectar a conta, gerar token — exige login na conta do founder. Meu papel é documentar o caminho exato e validar o resultado, não fazer por ele.

## Frentes de Atuação

| Frente | Objetivo | Stories | Prioridade |
|--------|----------|---------|------------|
| **F1 — Acesso + motor de publicação** | Setup de credenciais + publish manual funcionando ponta a ponta | IG-01, IG-02 | **P0** |
| **F2 — Rastreamento** | Card do ClickUp reflete o que foi publicado de verdade (link, data) | IG-03 | **P0** |
| **F3 — Agendamento autônomo** | Dispara sozinho na Data de Publicação, sem o founder precisar lembrar | IG-04 | **P1** |

## Roadmap (Stories)

### F1 — Acesso + motor de publicação (P0)
- [x] **IG-01** — Setup de acesso à Instagram Graph API (runbook guiado — founder executa, Claude documenta e valida) — **Ready for Review** (2026-08-18: @oraclumtech conectado via Instagram Login, `.env` validado com chamadas reais; expiração do token não confirmada — pendência aberta pra IG-04)
- [x] **IG-02** — Motor de publicação (`publish-instagram.js`) + comando `*publish-creative` manual, com confirmação explícita antes de qualquer publish real — **Ready for Review** (2026-08-18: 3 publicações reais em @oraclumtech — imagem, carrossel de 4, vídeo/Reels — + teste de cancelamento; gotcha de polling de imagem encontrado e corrigido)

### F2 — Rastreamento (P0)
- [x] **IG-03** — Campo "Link da Publicação" + `recordPublished` (status+link+comentário num só lugar) — **Ready for Review** (2026-08-18). `*atualize-status-publishes` adiado por falta de caso real (sem invenção).

### F3 — Agendamento autônomo (P1)
- [x] **IG-04** — Disparo automático na "Data da Publicação" — **Ready for Review** (2026-08-18). Migrado de processo destacado pra Windows Task Scheduler (`schtasks`) — sobrevive a reboot (`StartWhenAvailable`), sem limite de dias de antecedência. Validado com disparo real (funcionou) + 2 bugs reais do motor de publicação encontrados no mesmo teste (media_type de vídeo em carrossel, polling do container pai) e corrigidos.

## Sequenciamento e Dependências

```
IG-01 (acesso) ──► IG-02 (motor + publish manual) ──► IG-03 (rastreamento)
                                                    └─► IG-04 (agendamento autônomo)
```

Ordem obrigatória: **IG-01 → IG-02 → IG-03 → IG-04**. Nenhuma story de código começa sem IG-01 concluída (não há como testar nada sem token de acesso real).

## Fora de Escopo (por ora)

- Outras redes sociais (TikTok, LinkedIn) — pedido do founder foi "comecando pelo da oraclum" no Instagram; generalizar antes de validar 1 rede é invenção.
- Stories/Reels com efeitos avançados (trial reels, `graduation_strategy`) — a API suporta, mas os criativos de hoje são feed post/carrossel; entra quando houver um caso real.
- Analytics/Insights pós-publicação (curtidas, alcance) — outro épico, não faz parte de "publicar corretamente".
- Multi-conta (outros clientes além de Oraclum) — a arquitetura do motor (IG-02) já é por `clientSlug` como o resto do pipeline, então generalizar depois é natural, mas não é este épico.

## Riscos

- **[Alto] Token de acesso expira.** Token de Página do Facebook de vida longa dura ~60 dias por padrão; sem renovação, a publicação para de funcionar silenciosamente. IG-01 precisa decidir entre token de longa duração com renovação manual documentada, ou token de System User (Business Manager) que não expira — preferível se disponível.
- **[Médio] Setup do Meta App é o maior ponto de fricção.** É tela de terceiro, sujeito a mudança de UI/política da Meta a qualquer momento — o runbook de IG-01 pode precisar de ajuste manual mesmo bem documentado.
- **[Médio] Vídeo exige polling de status antes de publicar.** Container de vídeo/reels não fica pronto instantaneamente (`status_code`: `IN_PROGRESS` → `FINISHED`) — IG-02 precisa desse polling; publicar cedo demais falha.
- **[Baixo] Rate limit de 100 posts/24h.** Sem risco no volume atual (poucos criativos por Lote), mas o motor deve checar `content_publishing_limit` antes de lotes maiores no futuro.

## Referências

- Pipeline que alimenta este épico: `services/ETL/Load/approve-design-creative.js`, campo "Pack de Criativos Aprovados" (`services/ETL/Load/_clickup_config.js`)
- Docs oficiais: `developers.facebook.com/docs/instagram-platform/content-publishing`
- Conversa de origem: 2026-08-18, founder pediu explicitamente Graph API sobre Playwright após comparação de trade-offs

---
*O pack chega pronto. Falta só apertar o botão certo, com confiança de que é o botão certo.*
