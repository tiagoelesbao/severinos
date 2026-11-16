# VEX-12: Suíte IA-first no editor — auto b-roll, re-cut de cadência, SFX inteligente, auto-reframe

**Status:** Draft
**Epic:** EPIC-MKT-Video-Excellence (F4 — Diferencial IA-first + escala)
**Prioridade:** **P3** — o diferencial competitivo, depois que a base (F1–F3) estiver sólida
**Complexidade:** XL (Complex — 17 pontos) — split esperado na validação (cada assistente pode ser uma sub-story)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** editor da Virals
**Eu quero** assistentes de 1 clique dentro do editor — sugerir b-roll para um trecho da fala, re-cortar o vídeo para uma cadência-alvo, achar o SFX certo por intenção e re-enquadrar para outros formatos
**Para que** o Studio faça em segundos o que diferencia a Virals: velocidade + viralidade, não só paridade com CapCut.

## Contexto (evidência da auditoria)
- `pexels_service.py` já existe no squad (usado pelo `*design-creative`) — nenhuma integração no video-studio.
- O match de SFX é substring do nome do arquivo (`pickAudio` em `soundPlan.ts`) — "whoosh" só acha arquivo chamado whoosh.
- O princípio de retenção (checkpoint ~1,5–2s) é medido na Fase A, mas o editor não oferece nenhuma ação para ATINGI-LO num material gravado com beats longos.
- Formato único 9:16; nada de 1:1/16:9 para reaproveitamento (feed, YouTube, LinkedIn).

## Decisão de arquitetura (proposta — 4 assistentes independentes atrás de um menu "✨ IA")
1. **Auto b-roll:** selecionar um trecho da fala (cue ou intervalo) → gera queries a partir das keywords do trecho (+ contexto do plano) → busca Pexels (vídeo) → grid de sugestões → inserir como overlay/insert na camada "Inserts" com janela do trecho. Serviço server-side (`/api/broll?query=`) reusando a lógica/credenciais do `pexels_service`. Guard: b-roll é ilustrativo; nunca insere texto/estatística.
2. **Re-cut para cadência-alvo:** ação "Apertar para ~2s/beat": analisa os beats atuais (clipes + transcript), propõe um plano de cortes (split de clipes longos em momentos de pausa da fala + micro-zooms alternados para não parecer repetitivo) e mostra PREVIEW de diff (lista de operações) antes de aplicar — tudo via operações existentes (`splitClip`, `setClipKenBurns`, keyframes VEX-09). 1 undo reverte tudo.
3. **SFX por intenção:** indexar `public/library/` uma vez (tags derivadas do path/nome + duração + embedding leve opcional); `findSfx(intent)` casa a intenção do plano ("reforçar o reveal") com tags — substitui o `pickAudio` por ranking com score, mantendo fallback por substring.
4. **Auto-reframe multi-formato:** presets 1:1 e 16:9: recomposição determinística por tipo de conteúdo (talking-head → crop centrado com margem; painel de tela → reposicionamento do panel; legendas re-posicionadas pela safe-zone do formato). Export com sufixo de formato. (Sem tracking de rosto nesta fase — crop estático inteligente por papel.)

## Tarefas (Checklist)
- [ ] Menu "✨ IA" no design system + infraestrutura de sugestão→preview→aplicar (padrão comum aos 4 assistentes, sempre com diff e undo).
- [ ] Auto b-roll: rota server-side + geração de query por trecho + grid de resultados + inserção ancorada (download/cache local do asset escolhido).
- [ ] Re-cut: analisador de beats + gerador de plano de operações + aplicação transacional.
- [ ] Índice de SFX com tags/score + `findSfx` substituindo `pickAudio` (com testes comparativos).
- [ ] Auto-reframe 1:1/16:9: layout por papel + legendas por safe-zone do formato + export com formato no worker (VEX-01).
- [ ] E2E de cada assistente no criativo real.

## Critérios de Aceite
- [ ] **AC1:** Selecionar uma cue e pedir b-roll retorna ≥6 sugestões relevantes; inserir posiciona na janela exata da fala.
- [ ] **AC2:** Re-cut num miolo com beats de 6s produz beats ≤2,5s com cortes SÓ em pausas de fala (nenhuma palavra clipada), aplicado como 1 transação undoable.
- [ ] **AC3:** `findSfx("impacto no reveal")` retorna um asset coerente da biblioteca mesmo sem "impact" no nome do arquivo.
- [ ] **AC4:** Export 1:1 do criativo real mantém talking-heads enquadrados e legendas legíveis dentro da safe-zone do formato.
- [ ] **AC5:** Toda ação IA mostra preview/diff ANTES de aplicar; nenhuma modifica a timeline sem confirmação.

## Escopo
**IN:** os 4 assistentes + infraestrutura comum de sugestão/aplicação.
**OUT:** geração de mídia por IA (imagem/vídeo sintético); tracking de rosto; publicação automática. Licenciamento de assets fora de Pexels/biblioteca própria.

## Dependências
- **VEX-01** (export/formats), **VEX-02** (transcript), **VEX-05** (envelopes), **VEX-06** (camada de inserts), **VEX-09** (keyframes p/ re-cut variado), **VEX-10** (safe-zones p/ reframe), **VEX-07** (UI).

## Riscos
- **[Alto] Escopo XL:** validação deve considerar split em VEX-12a (b-roll+SFX) e VEX-12b (re-cut+reframe).
- **[Médio] Qualidade das queries de b-roll** em PT: traduzir keywords para EN na query (Pexels indexa melhor em inglês).
- **[Médio] Re-cut "robótico":** alternar dispositivos (cut/zoom/insert) por heurística para não repetir o mesmo truque.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
