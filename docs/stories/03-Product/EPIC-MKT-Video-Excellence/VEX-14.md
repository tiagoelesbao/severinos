# VEX-14: Benchmark que não mente — ETL auto-sustentável (auto-update, preflight, fail-loud)

**Status:** Ready for Review — implementada 2026-07-16 · **66 testes JS + 11 Python verdes** · E2E real: **5/5 ok** (assets ✅ + análise ✅) · Sessão do IG ELIMINADA (embed público) · Visão com roteamento dinâmico (sem lista fixa)
**Epic:** EPIC-MKT-Video-Excellence (F1 — Destravar / confiabilidade da Fase A)
**Prioridade:** **P0** — a Fase A é a bússola do épico inteiro; hoje ela entrega dados falsos SEM avisar, e todo `*creative-benchmark` vira sessão de depuração manual
**Complexidade:** L (Standard — 10 pontos) _(@po: elevada de M/8 na validação — 2 módulos novos + 6 arquivos tocados + protocolo do chief + testes; escopo comparável ao de VEX-04, que foi L)_
**Criada por:** Claude (@sm, a partir de investigação empírica) · 2026-07-16

## Story
**Como** dono da Virals rodando `*creative-benchmark` no dia a dia
**Eu quero** que o pipeline se mantenha sozinho (binário atualizado, sessão válida) e **grite alto** quando um download falhar
**Para que** eu não perca tempo renovando cookies e corrigindo erros a cada benchmark, e nunca mais tome decisão estratégica em cima de análise de thumbnail.

## Contexto (evidência empírica — investigação 2026-07-16)

Origem: benchmark de `tiago-elesbao` em `workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-07-11/benchmark` saiu 100% degradado.

### Achado nº 1 — a causa raiz NÃO era cookie (hipótese do dono refutada com teste)

Testes no mesmo reel que falhou (`instagram.com/pablomarcal1/reel/DaoHRljTgIo/`):

| Combinação | Resultado |
|---|---|
| yt-dlp 2026.03.17 (o do repo) + cookies IG | ❌ `empty media response` |
| yt-dlp 2026.03.17 + `sessionid` válido (do `instagram_session.json`) | ❌ `empty media response` |
| **yt-dlp 2026.07.04 + SEM cookie algum** | ✅ **`Downloading 1 format(s)`** |

- A sessão do IG está **VIVA**: `GET /api/v1/users/web_profile_info` com os cookies do `instagram_session.json` → **HTTP 200** com dados (requer headers `sec-fetch-*` + `x-ig-app-id`).
- `services/ETL/bin/yt-dlp.exe` está em **2026.03.17** (4 meses de defasagem); stable atual = **2026.07.04**. O IG muda o layout interno com frequência — extractor velho = falha garantida.
- YouTube já baixa com os cookies existentes (`--simulate` → `Downloading 1 format(s): 401+251`). ffmpeg 7.1.1 presente no PATH.

**Conclusão:** a renovação recorrente de cookies vinha tratando um sintoma inexistente.

### Achado nº 2 — o pipeline mente (o mais grave; independe do yt-dlp)

`_creative-benchmark-summary-2026-07-11.json`: `"total": 10, "ok": 10, "failed": 0` — **com zero vídeos baixados**.
- `run-creative-benchmark.js:175` → `return { status: 'ok', ... }` **fixo**, sem jamais consultar `download_status` (gravado 9 linhas acima, em `:166`). _(verificado @po)_
- `ContentClassifier` marca `degraded: true` (`ContentClassifier.js:47`, `:50`, `:53`) — **ninguém lê esse campo**. _(@po: corrigido de :48; são 3 pontos de degradação, não 1)_
- **Última milha (achado @po):** o protocolo do `@marketing-chief` (step 7 de `*creative-benchmark`) manda "Reportar: total processados, **ok/falha/timeout**" — ele lê o summary. Enquanto o summary mentir, o chief repete a mentira para o dono. O fail-loud só fecha se o protocolo passar a reportar degradados.
- Efeito em cascata: 5 reels do IG viraram `image-single/ig-image` (thumbnail resgatada pelo scraper); YouTube gerou `"Vídeo indisponível para download. Apenas metadados."`; o `@marketing-chief` sintetizou estratégia sobre capas e produziu "falta de bastidor/evidência" em 7 de 10 criativos — **artefato da falha, não dos criativos**.

### Achado nº 3 — bugs colaterais no `downloader.js`

- **`:483`** — `f.startsWith('content_' + Date.now().toString().substring(0,8))`: o prefixo de 8 dígitos do timestamp em ms **muda a cada ~100 segundos**. Download que demore mais que isso é concluído com sucesso e **descartado** → vira `metadata_only`. Baixa e joga fora. _(@po: corrigido de :481)_
- **`:396`** — `localCookies` resolve para `services/ETL/auth/cookies.txt`, mas esse diretório está **VAZIO**; os cookies reais estão em `services/ETL/Extract/auth/`. Como o `if (fs.existsSync(botCookies))` vem primeiro e não é por plataforma, o **Instagram acaba usando os cookies do YouTube**. _(verificado @po)_
- **`:407`** — todo download de YouTube tenta `--cookies-from-browser chrome` primeiro; com o Chrome aberto isso falha **sempre** (`Could not copy Chrome cookie database`, lock do DPAPI) — custo fixo desperdiçado por criativo. _(verificado @po)_
- **`:102` (`downloadWithBrowserCookies`) e `:259`–`:265` (`downloadWithPythonBot`)** — ambas pegam `files[0]` por mtime do `outputDir` inteiro, sem filtrar pela execução → risco de adotar vídeo de outro run. _(@po: são DOIS locais, não um; a correção por diretório temporário precisa cobrir os dois)_
- `Extract/auth/cookies.txt` tem só `csrftoken datr ds_user_id ig_did mid rur` — **sem `sessionid`**, enquanto o `instagram_session.json` (Playwright) tem o `sessionid` bom. Não existe ponte entre os dois formatos.

## Decisão de arquitetura (proposta)

- **Auto-update do yt-dlp** (`Extract/downloader.js` ou módulo irmão `Extract/toolchain.js`): no início do run, se `mtime` do binário > N dias (default 7, configurável), roda `yt-dlp -U` com timeout e **não-fatal** (falhou o update → segue com o que tem + aviso E1). Stamp em arquivo para não checar a cada URL.
- **Preflight por plataforma** (`run-creative-benchmark.js`, antes do laço): 1 `--simulate` por plataforma presente na fila, numa URL canônica. Falhou → tenta remediar (update do binário; se persistir e for auth, sinaliza refresh de sessão) → só então processa. Descobrir a quebra em ~5s em vez de 11min.
- **Fail-loud** — o princípio central: `download_status`/`degraded` **propagam** para o status do item; o summary passa a contar `degraded` separado de `ok`; o processo sai com **código ≠ 0** quando há degradados. Alinhado ao guard de fidelidade terminal já reconhecido no pipeline de copy (estágio não-fatal que entrega dado cru sem avisar é o mesmo antipadrão).
- **Cookies por plataforma + ponte Playwright→Netscape**: seleção de cookie **por plataforma** (IG→IG, YT→YT), com conversor `instagram_session.json` → formato Netscape (com `sessionid`) gerado sob demanda. Como o IG hoje funciona sem cookie, a ponte é a rede de segurança para conteúdo restrito — não o caminho principal.
- **Ordem da cadeia de fallback por probabilidade real de sucesso**: `--cookies-from-browser chrome` sai da frente (falha sempre com Chrome aberto) e vira último recurso.
- **Correção do prefixo temporal**: capturar o `Date.now()` UMA vez em variável e filtrar por ela (ou usar um diretório temporário por execução — preferível, elimina a classe inteira de bug de seleção de arquivo).

## Tarefas (Checklist)
- [x] `Extract/toolchain.js` (novo): `ensureYtDlpFresh({maxAgeDays})` — checa mtime/stamp, roda `-U` com timeout, não-fatal, `windowsHide`; backup `.bak` + `restoreYtDlpBackup` para reverter versão nova quebrada. 8 testes com stub do exec.
- [x] `downloader.js`: diretório temporário **por execução** (`createRunDir`/`collectRunFiles`/`buildResult`) — elimina o prefixo de `:483` e o `files[0]` por mtime dos DOIS locais.
- [x] `downloader.js`: `resolveCookies(platform)` — cookies por plataforma, path correto (`Extract/auth/`), sem vazar cookie de YouTube para IG.
- [x] `downloader.js`: reordenar fallback (browser-cookies por último para YouTube; Python bot antes).
- [x] `Extract/auth/session-bridge.js` (novo): `playwrightSessionToNetscape` → cookies.txt com `sessionid`; acionado só quando o erro cheira a auth (`looksLikeAuthFailure`). 10 testes.
- [x] `run-creative-benchmark.js`: `preflight(filtered)` antes do laço, com remediação (update → rollback → ponte de sessão). Exit 2 + `--skipPreflight=true` como escape.
- [x] `run-creative-benchmark.js:175`: status derivado via `deriveItemStatus` (`ok` | `degraded` | `failed`) + `item_status`/`status_reason` no Benchmark.json.
- [x] `run-creative-benchmark.js`: summary com `degraded` + `verdict` + seção de degradados no `.md` + exit code ≠ 0.
- [x] Atualizar `bin/yt-dlp.exe` no repo → **2026.07.04** (feito pelo próprio `ensureYtDlpFresh`: detectou 114,6 dias e atualizou).
- [x] `.gitignore`: artefatos do toolchain (`bin/*.bak`, stamp) e cookies derivados de sessão.
- [x] **Protocolo do `@marketing-chief`** (step 7 de `*creative-benchmark`): `exit_codes` documentados (0/1/2) + `on_degraded` com o precedente de 2026-07-11. Editado na fonte canônica e propagado às 4 cópias via `sync-agents.js`.
- [x] E2E real: benchmark de `2026-07-11` (tiago-elesbao, top=2) → **4/4 com assets reais**, os 2 reels do IG agora `video-short/ig-reel` (eram `image-single`).

### Estratégia de Testes (@po — passo 5 da validate-next-story)
- **Unitários (`node --test`, padrão do épico):** `resolveCookies(platform)` (IG nunca recebe cookie de YT), `ensureYtDlpFresh` (stub do execSync: binário novo → não atualiza; velho → atualiza; update falha → não-fatal), derivação de status (`download_status` × `degraded` → `ok|degraded|failed`), `playwrightSessionToNetscape` (fixture com `sessionid` → linha Netscape correta).
- **Regressão-âncora (AC3):** fixture reproduzindo 2026-07-11 (10 itens `metadata_only`) → summary DEVE dar `degraded: 10`, `ok: 0` e exit ≠ 0.
- **E2E real (rede):** o reel `DaoHRljTgIo` + 1 vídeo de YouTube — fora do `node --test`, rodado manualmente e registrado no Dev Record (padrão VEX-01/02/04).

## Critérios de Aceite
- [x] **AC1 (auto-update):** ✅ Validado no caminho real — `ensureYtDlpFresh` detectou **114,6 dias** no binário do repo e atualizou 2026.03.17 → **2026.07.04** sozinho. Falha de update é não-fatal (teste com `ENOTFOUND` → `reason: update-failed` + aviso E1, run prossegue). Binário novo não dispara rede (stamp).
- [x] **AC2 (o caso que motivou a story):** ✅ E2E real. Os reels do IG saíram de `image-single/ig-image` (capa) para `video-short/ig-reel` com download real e `Transcrição.md` do ÁUDIO (antes era a caption copiada). **Sem cookie** — o `DaoHRljTgIo` do AC foi coberto pelo preflight (`--simulate` OK); os processados no lote top=2 foram `DanyPAhhWSB` e `DanwJe0gcbf`. Bônus: `cut_timestamps` do VEX-04 rodou pela 1ª vez em IG (14 cortes reais).
- [x] **AC3 (fail-loud, ponta a ponta):** ✅ E2E com URL morta → `⚠️ DEGRADADO`, `Com assets reais: 0/1`, motivo nomeado e **exit code 1** (medido). Regressão-âncora em teste: o estado de 2026-07-11 reproduzido dá `ok: 0, degraded: 10, exitCode: 1` — o "10 ok / 0 failed" é impossível. Protocolo do chief com `exit_codes` + `on_degraded` propagado às 5 locações.
- [x] **AC4 (preflight):** ✅ E2E — IG+YouTube validados em **5,7s** (limite do AC: 30s/plataforma); plataforma quebrada → abort com **exit 2** + hint acionável, sem processar a fila. Escape `--skipPreflight=true`. **Desvio de design (ver Notas):** sonda até 3 URLs da fila em vez de 1 canário fixo.
- [x] **AC5 (cookies por plataforma + ponte):** ✅ `resolveCookies` testado no cenário exato do bug (só cookie de YT no disco → IG recebe `null`, jamais o do YouTube). Ponte gera Netscape com `sessionid` a partir do storageState (validado: `.instagram.com TRUE / TRUE 1800000000 sessionid abc123`), acionada só quando `looksLikeAuthFailure` reconhece o erro.

## Escopo
**IN:** auto-update do binário, preflight, fail-loud no status/summary/exit code **+ no protocolo do chief**, cookies por plataforma, ponte Playwright→Netscape, correção do prefixo temporal e do `files[0]` (2 locais), atualização do yt-dlp no repo.
**OUT:** re-auditar os criativos de 2026-07-11 com o `@marketing-chief` (execução de negócio, não engenharia — roda depois, com os dados corretos); trocar yt-dlp por Apify/outro provider (avaliar só se a defasagem voltar a morder); auto-login headless no IG (risco de bloqueio; a ponte usa a sessão que já existe).

## Dependências
- Nenhuma bloqueante. Toca `run-creative-benchmark.js`, que VEX-04 já modificou (scene-detect) — sem conflito de área: VEX-04 mexeu no trecho pré-cleanup do vídeo, esta story mexe em status/summary/preflight.
- Benefício direto para VEX-04: com download real, `cut_timestamps` finalmente terá vídeo para medir (hoje a cadência real nunca roda em IG).

## Riscos
- **[Médio] `yt-dlp -U` automático pode introduzir regressão** numa versão nova quebrada: mitigar com stamp + fallback (se o novo binário falhar o preflight, restaurar o `.exe` anterior — manter backup em `bin/.yt-dlp.bak`).
- **[Médio] Rate limit/bloqueio do IG** ao rodar N downloads em sequência: manter backoff entre itens; a ponte de sessão é só para o que exigir login.
- **[Baixo] Exit code ≠ 0 pode quebrar chamadores** que assumem sucesso: verificar quem invoca o script (`*creative-benchmark` do chief) e tratar degradado como aviso visível, não como crash silencioso.
- **[Baixo] Defasagem volta a morder** se ninguém rodar o benchmark por meses: o auto-update por mtime cobre exatamente esse caso.

## Dev Agent Record

### Agent Model Used
claude-opus-4-8 (Claude nos papéis @sm, @po e @dev)

### Notas
- A investigação que originou a story está toda em "Contexto" com comandos reproduzíveis — o @dev não precisa re-descobrir.
- Teste de sessão viva do IG (para reuso): `fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=instagram')` com jar do `instagram_session.json` + `x-ig-app-id: 936619743392459` + `sec-fetch-site: same-origin` + `referer`. Sem os headers `sec-fetch-*` → HTTP 400 `SecFetch Policy violation` (falso negativo — não confundir com sessão morta).

#### Desvios de escopo (com justificativa)

1. **Preflight sonda URLs REAIS da fila (até 3), não canários fixos.** A 1ª implementação usava canários hardcoded; ambos já estavam inacessíveis e o preflight reprovou plataformas saudáveis. Canário fixo apodrece e vira gerador de falso negativo — pior que não ter preflight, porque aborta trabalho bom. Sondar a fila testa exatamente o que será processado. O `MAX_PROBES = 3` existe porque **1 link deletado é rotina** (bloquearia o benchmark inteiro), enquanto plataforma quebrada falha em todas as sondas. Comportamento fixado em teste.
2. **`sweepStaleRunDirs` (não previsto na story).** Isolar por execução, sozinho, trocaria colisão de arquivos por vazamento de disco — o `outputDir` já acumulava **2,2 GB** de downloads órfãos do código antigo. Limpeza conservadora (só `run_*` > 6h; pasta/arquivo que não criamos é intocável, fixado em teste).
3. **Bug latente corrigido de brinde:** em `downloadWithPythonBot`, `effectiveCookies.replace(...)` era avaliado dentro do template literal mesmo quando `effectiveCookies` era `null` → `TypeError` antes de o bot rodar. Estava mascarado porque o caminho raramente executava sem cookie.
4. **`--picks` (feature NÃO prevista na story, pedida pelo dono durante a validação).** Permite curar a fila por fit em vez de aceitar o top-N por Viral Score. Motivo de fundo, que a investigação expôs: **o Viral Score mede engajamento do criador, não fit com o cliente**. O top-5 de 2026-07-11 era Pablo Marçal (guru motivacional) e IA-anime — e a auditoria então puniu os criativos por "falta de bastidor/evidência", ou seja, cobrou o DNA do Tiago de criativos que nunca foram selecionados por DNA nenhum. Aceita URL completa ou shortcode; varre o ranking inteiro (`parseDepth = 10000`) porque curadoria não vive só no topo. **Sugiro story própria** para a curadoria automática por fit (hoje a seleção é manual/LLM, não codificada).

#### Achado do dono durante a validação (2026-07-16) — buraco no próprio fail-loud

O dono viu que os prints do Instagram vinham corrompidos por um banner. A investigação mostrou algo pior, em três camadas:

1. **O fail-loud contava assets, não os auditava.** O carrossel do @garyvee gerou **15 prints byte a byte idênticos** do modal "Sign up / Log in" — e passou como `ok`, porque tinha `download: success`, classificação `carousel` e "15 screenshots". Lixo com forma de sucesso: exatamente a classe de mentira que esta story existe para matar, sobrevivendo dentro dela.
2. **Raiz real (não é banner):** o `sessionid` **não entra** no contexto do Playwright. Ele é carregado do `storageState` (verificado: `A) storageState → sessionid? true`) e o **Instagram o derruba via `Set-Cookie` na primeira navegação** — confirmado: a API responde `HTTP 200` com dados válidos E na mesma resposta expira o `sessionid`. Padrão de detecção de automação. Sem sessão → tela "Continue as viralsmarketing" → o clique de bypass não loga → post servido com login wall → o scraper fotografa o modal.
3. **Escopo do dano:** só atinge `/p/` (estáticos e carrosséis, via `CarouselScraper`+Playwright). Reels e YouTube passam por `yt-dlp` **sem login** e seguem íntegros (4/4 no E2E).

**Correções:** `auditAssets` (hash dos slides → idênticos = degradado; vazios/truncados = degradado; inexistentes = degradado), ligado ao `deriveItemStatus` via `screenshotPaths`; e guard de login wall no `CarouselScraper`, que aborta com `auth_required` **antes** de capturar — falhar cedo custa 0, falhar tarde custa 15 chamadas de visão e contamina a síntese estratégica. Validado contra o lixo real: os mesmos 15 slides → `degraded — 15 slides IDÊNTICOS`.

**Resolvido sem sessão (decisão do dono: "inviável ficar renovando manualmente").** Em vez de automatizar o login (plano B do dono) ou fechar o modal, a investigação encontrou um caminho que **elimina a dependência de sessão**:

`https://www.instagram.com/p/{shortcode}/embed/captioned/` é **público por design** — é o endpoint que sites usam para incorporar posts, e não tem login wall. O HTML embute `edge_sidecar_to_children` com `display_url` de cada slide, `is_video` e `video_url`. Novo `instagram-embed.js`:
- **baixa** a imagem do CDN em vez de **fotografar** a tela — download não sofre com modal sobreposto e vem em resolução original (1080×1440 vs. print de viewport);
- delega slides de vídeo ao `yt-dlp` (que já funciona sem cookie);
- extrai caption completa e autor do próprio blob;
- descarta o `display_url` do post pai (duplica o 1º filho) por asset id.

**E2E real sem cookie algum:** @hormozi 3 slides distintos (552/326/518 KB), @publicitarioscriativos 5 slides distintos, @garyvee 1 img + 1 vídeo, @segredosdaaudiencia 2 img + 2 vídeos — todos com caption. Inspeção visual confirmou criativo limpo e legível.

O `CarouselScraper` (com sessão) permanece como **fallback**, agora com guard de login wall. A sessão deixou de ser caminho principal — `ig-login.js` vira opcional, não rotina. **Nenhum login automatizado foi implementado**: seria correr atrás do bloqueio que o IG aplica a automação, enquanto o embed é um caminho suportado.

#### Terceira encarnação do MESMO bug: a análise que não saiu (2026-07-16)

Com os assets finalmente perfeitos (5/5 via embed, slides distintos), o benchmark declarou **5/5 ok** — e a `Transcrição.md` de 4 deles dizia:

> `_Erro Final na Visão: No endpoints found for mistralai/pixtral-12b:free._`

A cascata de visão inteira está fora do ar e ninguém percebeu:

| Provider | Erro |
|---|---|
| `gemini-2.5-flash` | **quota excedida** (free tier) |
| `gemini-2.5-flash-lite` | "high demand — try again later" |
| 4 modelos `:free` do OpenRouter (`qwen-2-vl-72b`, `llama-3.2-90b-vision`, `gemini-flash-1.5-8b`, `pixtral-12b`) | **descontinuados** — "No endpoints found" |

O padrão é idêntico às camadas anteriores, um nível acima: o estágio não-fatal **escreve o próprio erro dentro do markdown entregue**, o texto conta como "conteúdo" e o item vira sucesso. Primeiro foi o download (metadata_only → ok), depois os assets (15 prints do modal → ok), agora a análise (erro da visão → ok).

**Correção:** `auditAnalysis` — a `Transcrição.md` é auditada por conteúdo; marcador de falha conhecido (`Erro Final na Visão`, `No endpoints found`, `exceeded your current quota`, `Vídeo indisponível…`) ou arquivo ausente ⇒ `degraded`. Validado no resultado real: assets ✅ 5/5, análise ✅ **1/5**.

**Resolvido com roteamento dinâmico (decisão do dono: "roteamento automático para modelos free disponíveis no momento").**

Novo `vision-router.js`: em vez de confiar numa lista fixa, **pergunta ao catálogo** (`https://openrouter.ai/api/v1/models`, público, sem auth) quais modelos são gratuitos E aceitam imagem, agora. Cache de 6h; sem rede → cache expirado → fallback estático curto; **nunca lança** (visão pode degradar, o pipeline não pode quebrar por ela).

Achados que moldaram o design:
- **Os 4 modelos hardcoded sumiram do catálogo** — todos os 4. A lista não estava desatualizada: estava morta.
- **`openrouter/free` ("Free Models Router")** é um roteador oficial do próprio OpenRouter — resolve disponibilidade na origem. Vai na frente da cascata.
- **Catálogo mente por omissão:** 8 modelos free declaram `input_modalities:[image]`, mas `lyria` gera música e `content-safety` faz moderação — aceitam imagem para outra finalidade. Sem o filtro `serveParaDescricao`, a cascata gasta minutos com quem nunca vai responder (o `nemotron-nano-12b-v2-vl` levou 63s para dar 504).

Teste real com criativo (slide do tênis UNO): `openrouter/free` 5,4s ✅ (roteou p/ gemma-4-31b) · `gemma-4-31b:free` 3,8s ✅ · `gemma-4-26b:free` 3,6s ✅ · `nemotron-omni:free` 19,5s ✅ · `nemotron-nano-vl:free` ❌ 504.

**E2E final dos 5 posts:** `5/5 ok`, assets ✅ e análise ✅ em todos, exit 0. A análise traz OCR completo do texto do criativo + descrição visual — o insumo real do benchmark.

É o mesmo padrão desta story pela quarta vez: **dado externo copiado para dentro do código apodrece** (yt-dlp defasado → canário fixo do preflight → lista de modelos). A correção é sempre perguntar à fonte, com cache e degradação honesta.

#### Descobertas

- **O teste da regressão-âncora reprovou a 1ª versão do `deriveItemStatus`** e revelou o caso mais traiçoeiro de 2026-07-11: reel cujo scraper resgatou a thumbnail chega como `download: success` + `image-single` + 1 screenshot + **sem** `degraded` — o classifier vê "1 imagem = post estático" e nada no item denuncia que a URL era um reel. Só a promessa da URL (`probe.type`) revela. Daí o campo `expectedType`: **URL de vídeo + resultado imagem = degradado**, sempre. Sem isso, metade do modo de falha continuaria invisível.
- **O fallback do IG devolvia `status: 'success'` ao resgatar thumbnail.** Agora devolve `metadata_only` quando a URL era de vídeo: uma capa não é o criativo.
- **VEX-04 destravada de graça:** `cut_timestamps` nunca tinha rodado em Instagram (não havia vídeo para medir). No E2E: 14 cortes reais num reel, 104 e 28 nos vídeos longos.

#### Débitos / follow-ups (não bloqueantes)

- **CodeRabbit NÃO executado:** CLI exige `coderabbit auth login` interativo (`Authentication required`). Auto-revisão manual feita no lugar (escopo de variáveis, órfãs pós-refactor, consistência dos 3 caminhos de download). Sugiro rodar antes do push.
- **`devLoadAlwaysFiles` aponta para 6 arquivos inexistentes** (`docs/framework/*.md` e o fallback `docs/architecture/*.md`). Segui os padrões observados no código. Vale corrigir o `core-config.yaml` ou criar os docs — afeta todo @dev futuro.
- **2,2 GB de lixo em `.aiox/tmp/downloads/`** (arquivos soltos na raiz, anteriores a esta story). O sweep só limpa `run_*`; não apaguei o histórico por não ser meu. Sugiro limpeza manual.
- **Benchmark de 2026-07-11 reprocessado só no top=2** (4 de 10 criativos). Os ranks 3–5 de cada plataforma seguem com os dados degradados antigos. Backup do estado quebrado preservado no scratchpad da sessão.

### File List
**Novos:**
- `squads/virals-marketing-squad/scripts/model_router.py` — **descoberta dinâmica de modelos free de TEXTO** (espelho Python do vision-router; a síntese do Chief falhava com 3/4 modelos hardcoded mortos por 404)
- `squads/virals-marketing-squad/scripts/test_model_router.py` — 8 testes (funções puras sem rede + contrato de degradação)
- `squads/virals-marketing-squad/scripts/test_audit_degraded_filter.py` — 3 testes (exclui degraded/failed; preserva batch legado sem item_status)
- `services/ETL/Transform/analyzers/fit-scorer.js` — **pontua post por CONFLUÊNCIA com o DNA do cliente** (léxico da marca, pilares, evidência numérica, priority); genérico, lê do brand-identity. 8 testes.
- `services/ETL/Transform/analyzers/ranking-builders.js` — geradores dos docs `_ranking-geral` (global cross-plataforma normalizado) e `_fit-ranking` (confluência). 8 testes.
- `services/ETL/Transform/video-intelligence/vision-router.js` — **descoberta dinâmica de modelos free de visão** (catálogo OpenRouter, cache 6h, filtro de modelos inúteis, fallback)
- `services/ETL/Transform/video-intelligence/vision-router.test.js` — 5 testes
- `services/ETL/Extract/scrapers/instagram-embed.js` — **extractor de posts/carrosséis SEM sessão** (endpoint público `/embed/`; baixa do CDN em vez de printar a tela)
- `services/ETL/Extract/scrapers/instagram-embed.test.js` — 7 testes (shortcode, desescape, pai duplicado, vídeo em carrossel, caption unicode)
- `services/ETL/Extract/toolchain.js` — auto-update do yt-dlp (stamp, backup, rollback, não-fatal)
- `services/ETL/Extract/toolchain.test.js` — 8 testes
- `services/ETL/Extract/preflight.js` — preflight por plataforma com remediação em cadeia
- `services/ETL/Extract/preflight.test.js` — 3 testes
- `services/ETL/Extract/auth/session-bridge.js` — ponte Playwright→Netscape + `resolveCookies` + `looksLikeAuthFailure`
- `services/ETL/Extract/auth/session-bridge.test.js` — 10 testes
- `services/ETL/Extract/downloader.test.js` — 6 testes (runDir, collect, buildResult, sweep)
- `services/ETL/Load/benchmark-status.js` — derivação de status, summarize, seção de degradados
- `services/ETL/Load/benchmark-status.test.js` — 13 testes (inclui regressão-âncora)

**Modificados:**
- `services/ETL/Extract/downloader.js` — runDir por execução, cookies por plataforma, fallback reordenado, retry com sessão, fallback IG honesto, sweep, fix do TypeError, **embed como caminho principal de `/p/`** (CarouselScraper vira fallback)
- `services/ETL/Extract/scrapers/instagram-carousel.js` — guard de login wall (aborta com `auth_required` em vez de fotografar o modal)
- `services/ETL/Load/benchmark-status.js` — **`auditAssets`** (slides idênticos/vazios/inexistentes = degradado) + **`auditAnalysis`** (marcador de erro dentro da Transcrição.md = degradado)
- `services/ETL/Transform/video-intelligence/local-transcriber.js` — lista fixa de modelos REMOVIDA; usa `discoverFreeVisionModels()`
- `squads/virals-marketing-squad/scripts/recast_engine.py` — `OPENROUTER_MODELS` fixo REMOVIDO; `call_llm` usa `discover_free_text_models()` (compartilhado por todo o pipeline de texto: audit, plan, recast)
- `squads/virals-marketing-squad/scripts/run_audit_benchmark.py` — **exclui criativos `degraded`/`failed`** da auditoria (honra o `item_status` do fail-loud; sem isso, auditaria metadados/capa)
- `services/ETL/Extract/scrapers/daily-monitor.js` — mapa handle→priority + gera `_ranking-geral-{date}.md` e `_fit-ranking-{date}.md` (fit não-fatal se brand-identity indisponível)
- `services/ETL/Extract/scrapers/engines/{InstagramEngine,YouTubeEngine,TikTokEngine}.js` — capturam `text` (caption/título) para alimentar o fit-scorer (IG via og:description já lida; YT/TT via title)
- `squads/virals-marketing-squad/data/clients/tiago-elesbao/brand-identity.yaml` — **v2 "prova em movimento"** (backup v1 preservado): pilar cases→learnings-aplicados, avatar 4 nichos, léxico e tom refinados. Ver [[project-tiago-brand-identity-v2]]
- `services/ETL/bin/yt-dlp.exe` — 2026.03.17 → 2026.07.04
- `squads/virals-marketing-squad/scripts/run-creative-benchmark.js` — toolchain + preflight + status derivado + summary com degradados + exit code
- `.claude/commands/VIRALS/agents/marketing-chief.md` — **fonte canônica**: `exit_codes` + `on_degraded` no step 7
- `squads/virals-marketing-squad/agents/marketing-chief.md`, `.antigravity/agents/marketing-chief.md`, `.antigravity/rules/agents/marketing-chief.md`, `.gemini/commands/virals-marketing-chief.toml`, `.gemini/rules/AIOX/agents/virals-marketing-chief.md` — cópias derivadas (via `sync-agents.js`, não editadas à mão)
- `.gitignore` — artefatos do toolchain + cookies derivados de sessão

## Change Log
- 2026-07-16 — Claude (@sm) — Story criada a partir de investigação empírica do benchmark quebrado de 2026-07-11 (Draft).
- 2026-07-16 — Claude (@dev) — **Implementada.** 5 módulos novos + 39 testes verdes. E2E real: AC1 (binário com 114,6 dias → auto-atualizado p/ 2026.07.04), AC2 (reels IG `image-single` → `ig-reel` com transcrição de áudio real), AC3 (URL morta → degraded + **exit 1** medido), AC4 (preflight IG+YT em 5,7s; quebra → exit 2), AC5 (IG nunca recebe cookie do YT). 3 desvios documentados (preflight sonda fila real ×3 em vez de canário fixo; `sweepStaleRunDirs`; fix de TypeError latente). CodeRabbit NÃO executado (exige login interativo) — auto-revisão manual no lugar. Ready → **Ready for Review**.
- 2026-07-16 — Claude (@po) — Validada: **GO 9/10**, confiança Alta. Draft → **Ready**. Anti-hallucination: todos os `file:line` re-verificados contra o código; 3 referências corrigidas (ContentClassifier `:48`→`:47/:50/:53`, downloader `:481`→`:483`, `:97`→`:102`). Escopo ampliado em 2 pontos: (a) `files[0]` por mtime existe em DOIS locais (`:102` e `:259`), (b) protocolo do `@marketing-chief` (step 7) reporta ok/falha a partir do summary — sem ele o fail-loud morre na última milha (AC3 estendido). Complexidade elevada M/8 → L/10. Adicionada Estratégia de Testes com regressão-âncora do estado de 2026-07-11. Nota: `coderabbit_integration` ausente do core-config → passo 8 N/A; campos `executor`/`quality_gate` não usados pelo épico VEX (consistente com VEX-01..13) → passo 1.1 N/A por convenção do épico.
