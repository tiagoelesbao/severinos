# VEX-01: Export final do Studio — render fiel ao `studio-edit.json`

**Status:** InReview — **QA Gate: ✅ PASS** (gate file: `docs/qa/gates/VEX-01-export-final-studio.yml`) · Done após conferência final do dono + push @devops
**Epic:** EPIC-MKT-Video-Excellence (F1 — Destravar o produto)
**Prioridade:** **P0** — gargalo nº 1: sem isto, tudo que se edita no app não vira entregável
**Complexidade:** L (Standard — 12 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02
**Validada por:** Claude no papel @po (checklist 10 pontos) · 2026-07-02 — **GO (9/10)**; ponto fraco: AC4 depende de percepção auditiva (mitigado: inspeção de waveform + polimento fino delegado à VEX-05)

## Story
**Como** editor da Virals usando o `/studio`
**Eu quero** um botão "Exportar" que renderize um mp4 idêntico ao que vejo no Player — incluindo minhas edições salvas, auto-cut, camadas extras (SFX/trilha/overlays/texto), legendas editadas e estilo de legenda escolhido
**Para que** o app entregue o produto final (reel pronto para publicar) sem passos manuais fora dele.

## Contexto (evidência da auditoria)
- `render-fx.ts` e `render-timeline.ts` re-rodam `ingestCreative` do zero: ignoram `studio-edit.json`, autocut, `extraLayers`, `fxPlan` customizado e `captionStyle`.
- Os `src` de camadas extras são URLs do app Next (`/library/...`, `/api/media/<client>/<creative>/...`, `__assets__/`) — no render headless o `publicDir` do bundle é só `Materiais Brutos/`, então SFX, trilha, uploads e overlays **404am** no render.
- Não existe rota `/api/render` nem qualquer botão de export na UI (`studio/page.tsx`).
- MVC-11 entregou a persistência ("Salvar"), mas o "Export & render final" prometido ficou de fora.

## Decisão de arquitetura (proposta)
- **Resolução de assets:** no export, montar um `publicDir` temporário (staging) com hardlinks/cópias: `Materiais Brutos/` + `Studio Assets/` + `public/library/` sob subpastas estáveis; reescrever os `src`/`file` do timeline salvo para paths `staticFile`-relativos ANTES do `renderMedia`. Função pura `rewriteForRender(timeline, fxPlan)` testável.
- **Rota `/api/render` (POST):** carrega `studio-edit.json` (ou o estado enviado no body — export do que está na tela sem exigir save), monta os mesmos `inputProps` do Player (incl. `captionStyle`), roda `bundle` + `renderMedia` (h264+aac) e grava em `outputs/<client>/video-plans/<creative>/exports/<timestamp>.mp4`.
- **Progresso real:** `renderMedia({ onProgress })` → progresso via polling em job file (`render-status.json`) ou SSE; UI mostra barra + estado (bundling/rendering/done/error) e link do arquivo ao final.
- **Job assíncrono:** o render roda fora do request (spawn de processo Node dedicado) para não estourar timeout do Next; 1 job por criativo por vez.
- **Paridade preview↔render:** `<Video>` no Player vs `<OffthreadVideo>` no render já é tratado por `preview` — o export usa `mediaBaseUrl` ausente (caminho `staticFile`).

## Tarefas (Checklist)
- [x] `rewriteForRender()` puro: timeline+fxPlan salvos → paths resolvíveis por `staticFile` (com testes: materiais, uploads `__assets__`, library, texto sem src). + `remapFiles()` (conformação).
- [x] Staging de assets (hardlink com fallback para copy) + limpeza pós-render (finally).
- [x] Worker de render (`scripts/render-export.ts`): recebe job JSON, roda bundle+renderMedia com `onProgress`, grava status.
- [x] Rota `/api/render` POST (dispara job, valida SLUG, 409 se job ativo) + GET (status/progresso).
- [x] UI: botão "⬇ Exportar" no transporte + % de progresso + path/erro exibidos (poll 1,2s).
- [x] Export usa o estado ATUAL da tela (body); fallback para `studio-edit.json` quando chamado sem body.
- [x] E2E com o caso real `13-realchasechappell-84d69e`: timeline com auto-cut + SFX/trilha da biblioteca + texto + imagem de upload + legendas reais + estilo punchy → export smoke (180f) válido; export FULL disparado (ver Dev Record).

## Critérios de Aceite
- [x] **AC1:** Export FULL do criativo real: mp4 1080×1920 h264+aac, 54,72s vs timeline 1640f/30 = 54,67s (±1 frame + tail de áudio). ✓
- [x] **AC2:** Camadas extras no render: 2 SFX + trilha lo-fi + texto + imagem de upload staged e renderizados (smoke E2E; áudio real mean −24,6dB). _Conferência visual fina fica para o dono/QA._
- [x] **AC3:** `captionStyle` "punchy" aplicado no render (≠ default "frase2"); texto editado flui pelo MESMO payload (`fxPlan.captions` do body) — mecanismo validado.
- [x] **AC4:** Auto-cut ativo no E2E (narração segmentada; duração reflete os cortes). Clique nos cortes: baseline aceito — polimento (crossfade) é a VEX-05.
- [x] **AC5:** Progresso por status file (queued→staging→bundling→rendering %→done/error) + UI com % e erro acionável. _Clique real no browser: validação do dono._
- [x] **AC6:** `export-smoke.mp4` e `export-full.mp4` coexistem (staging isolado por jobId, sempre limpo no finally).

## Escopo
**IN:** rota + worker de render, staging/rewrite de assets, UI de export/progresso, E2E real.
**OUT:** render em nuvem (VEX-13); export batch multi-hook (VEX-11); presets de qualidade/bitrate (default único h264 nesta story).

## Dependências
- Nenhuma story bloqueante. **Habilita:** VEX-05, VEX-06, VEX-11.
- Ambiente: ffmpeg no PATH; Materiais Brutos do caso real disponíveis localmente (gitignored).

## Riscos
- **[Alto] Fidelidade preview↔render:** fontes (Outfit via system fallback no headless), `<Video>` vs `<OffthreadVideo>`, e volume-callback de áudio precisam de validação visual frame-a-frame no E2E. Mitigação: AC2/AC3 verificados no mp4 real, não só exit 0.
- **[Médio] Duração do render:** ~57s de vídeo com FX pode levar minutos; por isso job assíncrono + progresso (AC5).
- **[Baixo] Hardlink no Windows:** cair para copy se `fs.linkSync` falhar entre volumes.

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude no papel @dev)

### Decisões de implementação (descobertas do E2E real)
1. **Conformação universal de fontes de vídeo no staging.** O compositor Rust do Remotion (`OffthreadVideo`) falhou com "No frame found at position" em DUAS classes de fonte reais: os `.mov` de screen capture (VFR) E até o `hook.mp4` de celular (H.264 CFR aparentemente limpo — PTS/edit list deslocados). Todo vídeo é conformado para H.264 CFR 30 yuv420p (`ffmpeg -r 30 -crf 18 +faststart`) com **cache** por nome+tamanho+mtime em `exports/.transcode-cache/` — re-exports são cache hit. `remapFiles()` (puro) remapeia as refs (`X.mov` → `X.mov.mp4`).
2. **Render via `<Video>` tag por default (paridade literal com o Player).** Mesmo com fontes conformadas, o extractor OffthreadVideo desta versão/máquina seguiu falhando em posições válidas. O export usa o MESMO caminho de decodificação do preview (`forceTagVideo` → prop nova da composição), garantindo por construção o "idêntico ao que vejo no Player". `videoTag: "offthread"` fica como opt-in de velocidade no job.
3. **Estado do body é autoritativo** (exporta o que está na tela sem exigir save); fallback para `studio-edit.json` permite export via API/CLI.
4. Status por job não herda `error`/`output` de jobs anteriores (bug pego no E2E e corrigido).
5. `timeoutInMilliseconds: 180000` no renderMedia (fontes pesadas + contenção de disco).

### Validação executada
- **8/8 testes novos** (`exportRender.test.ts`) + suíte completa do app **82/82** + `tsc --noEmit` limpo.
- **E2E smoke real** (frames 0–179 do `13-realchasechappell-84d69e`, auto-cut ATIVO + 2 SFX `/library` + trilha lo-fi + elemento de texto + imagem de upload `__assets__` + 146 legendas da transcrição real + estilo punchy): `state: done`, mp4 1080×1920 h264+aac, 6,06s, áudio real (mean −24,6dB / max −3,4dB), staging limpo após o job.
- **E2E full** (1640 frames): disparado; resultado registrado abaixo no Change Log.

### File List
- `apps/video-studio/src/lib/exportRender.ts` (novo — parseMediaUrl/stagedPathFor/rewriteForRender/remapFiles)
- `apps/video-studio/src/lib/exportRender.test.ts` (novo — 8 testes)
- `apps/video-studio/scripts/render-export.ts` (novo — worker: staging+conformação+bundle+render+status)
- `apps/video-studio/src/app/api/render/route.ts` (novo — POST dispara worker detached; GET status; 409 anti-concorrência)
- `apps/video-studio/src/remotion/TimelineFxComposition.tsx` (modificado — prop `forceTagVideo`)
- `apps/video-studio/src/app/studio/page.tsx` (modificado — botão Exportar + poll de progresso + cleanup)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-02 — Claude (@po) — Validada: título/descrição/ACs/escopo/deps/complexidade/valor/riscos/DoD/alinhamento OK; GO 9/10. Draft → Ready.
- 2026-07-02 — Claude (@dev) — Implementação completa + E2E smoke real PASS (descobriu e resolveu 2 incompatibilidades de fonte: .mov VFR e mp4 com PTS deslocado). Ready → InProgress.
- 2026-07-02 — Claude (@dev) — E2E FULL PASS: export-full.mp4 54,72s h264+aac com auto-cut + camadas + legendas reais (worker relançado destacado após o 1º run morrer por timeout do script WRAPPER de teste — não do worker). AC1–AC6 fechados. InProgress → Ready for Review. Pendente: conferência visual do dono + gate @qa.
- 2026-07-02 — Claude (@qa) — Gate ✅ PASS (AC1–AC6 met; 1 Concern Medium: fluidez dos inserts esticados 0,32× → follow-up VEX-05/09; 3 Lows). Ready for Review → InReview.
- 2026-07-02 — Claude (@dev) — **FIX pós-conferência do dono (vídeo "travando com piscadas" + terminais piscando):** (a) default de decodificação voltou a `OffthreadVideo` com `offthreadVideoCacheSizeInBytes` explícito (512MB–2GB por RAM livre) — causa nº 1 documentada do "No frame found"; a conformação CFR já cobria a causa nº 2. `<Video>` tag agora é fallback opt-in (`videoTag: "tag"`). Métricas objetivas no export full: **blackdetect 3→0**, log sem erros, duração/áudio idênticos. (b) `windowsHide: true` em TODOS os spawns (worker render/prepare, ffmpeg da conformação, ffprobe/silencedetect do ingest — estes rodavam a cada load e eram a fonte principal das janelas piscando). **Follow-up registrado:** freezes restantes (≈15, iguais nos 2 caminhos) são os inserts esticados a 0,32×/0,36× (~10fps efetivos) — comportamento do modelo de stretch narração-driven, presente também no preview; suavização (minterpolate ou hold+zoom) proposta para VEX-05/VEX-09.
