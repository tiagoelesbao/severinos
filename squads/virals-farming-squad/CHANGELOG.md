# Changelog — Virals Farming Squad

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [1.1.0] — 2026-07-26

### Added — pipeline executável de ponta a ponta

- **Motores F3–F6**: `farm-model.js`, `farm-images.js`, `farm-takes.js`, `farm-assemble.js`.
  Com F1/F2 já existentes, as seis fases rodam de verdade.
- **`farm-run.js`** — orquestrador F1→F6. Propaga o `session_id`, para nos checkpoints
  (híbrido e aprovação da F3) e monta o sumário **lendo o disco**, não os logs.
- **`farm-doctor.js`** — 175 verificações de integridade (estrutura, manifest, agentes,
  sintaxe e API dos módulos, motores, nichos, ambiente) + auditoria opcional de sessão,
  que detecta divergência entre status declarado e assets reais.
- **`_quota-ledger.js`** — ledger de consumo por provider, fonte de verdade do roteador.
- **`_pack.js`** — contrato de packs e o mecanismo de **slots** que dá paridade real
  entre modo auto e híbrido.
- **`_vision.js`** — cascata de visão para a F3: Gemini → 4 modelos **gratuitos** do
  OpenRouter. Cota do Gemini estourada deixou de degradar o pack inteiro.
- **`_editspec.js`** — tradução de `modeling.json` em timeline, com a regra do áudio
  mandando na duração (estende o último take, nunca corta o áudio).
- **11 adapters de geração**: imagem (gemini, cloudflare, together, huggingface,
  pollinations) e vídeo (veo, fal, minimax, kling, replicate, procedural).
- **Saneamento de prompt de imagem** na F3: a visão descreve cenas reais que contêm
  placas, logos e legendas; essa descrição fiel, crua no prompt, fazia o modelo tentar
  desenhar texto. Agora o elemento é reescrito como forma gráfica sem letras — a
  composição é preservada, o pedido de texto some. Detector consciente de negação
  (`sem letras` é proibição, não pedido) e rastro de auditoria em `modeling.json`.

### Fixed

- Kit de publicação afirmava "legenda queimada" mesmo em export sem legenda. Agora
  reflete o estado real da timeline renderizada.
- Sentinelas de substituição gravadas como bytes NUL corrompiam `farm-model.js` para
  `grep` e diffs. Trocadas por token legível.
- Campos de nicho em YAML folded (`>`) carregavam quebra de linha e quebravam tabelas
  Markdown.
- Preâmbulo de documentação dos templates vazava para os artefatos renderizados.

### Estado REAL dos providers (medido em 2026-07-26, não presumido)

| Provider | Tipo | Estado |
|:---|:---|:---|
| **cloudflare-flux / sdxl** | imagem | ✅ **funciona** — 1080×1920 exato, FLUX ~1,7s. O cavalo de batalha |
| **pollinations** | imagem | ✅ funciona, sem chave — degrau final |
| **hf-flux** | imagem | ✅ funciona via `router.huggingface.co` |
| gemini-image / imagen | imagem | ❌ `limit: 0` nesta conta / exige Vertex |
| together-flux | imagem | ❌ 402, crédito esgotado |
| **procedural-motion** | vídeo | ✅ **6 presets, desvio zero de duração** — degrau garantido |
| veo | vídeo | ⚠️ chave válida, modelo `veo-3.1-generate-preview` existe; geração não exercitada |
| fal-i2v | vídeo | ⚠️ auth ok, **403 saldo esgotado** |
| minimax-hailuo | vídeo | ⚠️ auth ok, **1008 saldo insuficiente** |
| kling-i2v | vídeo | ⚠️ falta o Secret Key (a API exige Access+Secret para assinar JWT) |
| replicate-i2v | vídeo | ❌ 401 — token provavelmente stale |

**Consequência:** imagem por IA está plenamente operacional. Vídeo por IA depende de saldo;
até lá, o tier C procedural entrega o take — que é justamente o formato nativo dos nichos
de farming, não um consolo.

### Verificado

Pipeline F1→F6 rodado ponta a ponta com criativo real: benchmark → plano → imagem 1080×1920
sem texto renderizado → take → `criativo.mp4` (h264+aac, 1080×1920, 25,2s) + kit de
publicação. `farm-doctor` com auditoria de sessão: **179/179**.

## [1.0.0] — 2026-07-26

### Added

- **Manifest** `squad.yaml` com 7 agentes, pipeline de 6 fases, executor types (VF-EP-001..004)
  e contrato de reuso explícito com `services/ETL` e `apps/video-studio`.
- **7 agentes**: `farming-chief`, `farming-scout`, `farming-analyst`, `farming-modeler`,
  `farming-imager`, `farming-animator`, `farming-producer` — formato híbrido AIOX+VIRALS.
- **6 tasks** do pipeline: `farm-monitor-discovery`, `farm-benchmark-etl`, `farm-modeling-plan`,
  `farm-image-generation`, `farm-video-takes`, `farm-studio-assembly`.
- **2 workflows**: `full-farming-pipeline.yaml` (F1→F6 com checkpoints) e
  `daily-farm-discovery.yaml` (F1+F2 recorrente).
- **4 nichos** pré-configurados com hashtags seed, nota de corte própria, estética de
  modelagem e guardrails bloqueantes: religioso, pet, notícias, cartomante.
- **Cascata free-first** de IA generativa (`config/ai-providers.yaml`): tier A (melhor
  qualidade, cota limitada) → tier B (cota generosa) → tier C (sempre disponível).
  Degrau final de vídeo é animação procedural local via ffmpeg — nunca falha.
- **Scripts F1/F2**: `farm-monitor.js` (garimpo por hashtag e perfil) e `farm-benchmark.js`
  (ETL por criativo), ambos reusando os engines do `services/ETL`.
- **4 checklists** de gate e **5 templates** de output.
- Gate de **fidelidade factual bloqueante** no nicho de notícias — afirmação sem âncora
  na transcrição reprova o criativo. Terminal, não degradável.

### Notes

- `daily_limit` dos providers em `config/ai-providers.yaml` são defaults de configuração,
  não fatos verificados sobre a política de cada serviço. Confirmar antes de confiar.
- `anchor_profiles` dos nichos nascem vazios por decisão: handles reais devem sair do
  primeiro ranking por hashtag, nunca de invenção.
- F3–F6 têm tasks e contratos completos; os motores executáveis dessas fases entram na
  próxima rodada.
