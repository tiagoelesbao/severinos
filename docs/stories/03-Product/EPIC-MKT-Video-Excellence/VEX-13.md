# VEX-13: Escala — render em nuvem e biblioteca de assets indexada

**Status:** Draft
**Epic:** EPIC-MKT-Video-Excellence (F4 — Diferencial IA-first + escala)
**Prioridade:** **P3** — quando o volume de clientes/criativos superar a máquina local
**Complexidade:** L (Standard — 12 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** operação Virals atendendo um pool de clientes
**Eu quero** renderizar em nuvem (paralelo, sem ocupar a máquina de edição) e ter uma biblioteca de assets (SFX/trilhas/b-roll/brand kits) organizada e indexada por cliente
**Para que** a produção escale em volume sem degradar a velocidade de edição.

## Contexto (evidência da auditoria)
- Render é 100% local e sequencial (worker da VEX-01); múltiplos exports (batch VEX-11, multi-formato VEX-12) multiplicam o tempo de espera.
- A "biblioteca" é `public/library/` plana no repo: sem metadados, sem escopo por cliente, sem licença registrada, match por nome de arquivo.
- O epic-pai já previa "render local headless e opção Lambda/Cloud Run".

## Decisão de arquitetura (proposta)
- **Render remoto:** `@remotion/lambda` (preferência — infra dedicada da Remotion) OU Cloud Run com o worker da VEX-01 containerizado (decisão de arquitetura na implementação; avaliar custo/licença Remotion para uso empresarial). O worker local vira UMA das engines atrás da mesma interface `RenderEngine { submit(job), status(id) }` — a UI não muda.
- **Assets para a nuvem:** os materiais do criativo sobem para um bucket por job (upload incremental com hash — não re-sobe o que não mudou); saída volta para `outputs/.../exports/`.
- **Fila e paralelismo:** fila simples de jobs (batch de 3 hooks × 3 formatos = 9 renders paralelos na nuvem); painel de jobs na UI (andamento, custo estimado, cancelar).
- **Biblioteca indexada:** manifesto `library.manifest.json` (gerado por scan + editável): tags, duração, mood/energia, licença/fonte, escopo (global | por cliente). UI do bin (VEX-07) ganha busca/filtros; `findSfx` (VEX-12) consome o manifesto. Assets por cliente em `library/clients/<slug>/` (um cliente nunca vê/usa asset exclusivo de outro).
- **Telemetria mínima:** duração de render, custo por job, fila — para decidir quando escalar.

## Tarefas (Checklist)
- [ ] Interface `RenderEngine` + refactor do worker local para trás dela.
- [ ] Engine remota (Lambda OU Cloud Run — spike de decisão documentado) com upload incremental de assets.
- [ ] Fila de jobs + painel de jobs na UI (status/cancel/custo).
- [ ] `library.manifest.json` + scanner + escopo por cliente + busca/filtros no bin.
- [ ] Guard de escopo: pipeline e UI só oferecem assets `global` + do cliente ativo.
- [ ] E2E: batch 3 hooks (VEX-11) renderizado em paralelo na nuvem, resultado idêntico ao render local (checksum de frames amostrados).

## Critérios de Aceite
- [ ] **AC1:** O mesmo job renderiza local e na nuvem com resultado visualmente idêntico (frames amostrados comparados).
- [ ] **AC2:** Batch de 3 variantes na nuvem termina em tempo próximo ao de 1 render local (paralelismo real).
- [ ] **AC3:** Asset marcado como exclusivo do cliente A não aparece no bin nem no `findSfx` do cliente B.
- [ ] **AC4:** Painel de jobs mostra progresso/custo e permite cancelar; falha remota aparece com log acionável.
- [ ] **AC5:** Sem credenciais de nuvem configuradas → tudo degrada para o engine local sem erro (graceful fallback, padrão do framework).

## Escopo
**IN:** engine remota, fila/painel, manifesto da biblioteca, escopo por cliente.
**OUT:** colaboração multi-usuário em tempo real; CDN de entrega; DAM completo (versão futura).

## Dependências
- **VEX-01** (worker/interface de render), **VEX-11/12** (consumidores do paralelismo), **VEX-07** (UI do bin).

## Riscos
- **[Médio] Custo/licenciamento** (Remotion company license, Lambda): spike de decisão com números antes de implementar.
- **[Médio] Upload de materiais pesados** (screen captures longos): hash + incremental é requisito, não otimização.
- **[Baixo] Divergência local×nuvem** (fontes/codecs): imagem de container fixa a versão de tudo.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
