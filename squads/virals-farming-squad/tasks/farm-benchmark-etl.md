---
task_name: farm-benchmark-etl
status: ready
responsible_executor: farming-analyst
execution_type: worker
phase: f2-benchmark
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - session: id da sessão da F1 (default: a mais recente do nicho na data)
  - top: quantos criativos processar (default: 8)
  - ranks: ranks específicos, alternativa a --top
  - url: URL avulsa, fora do ranking
output: |
  - benchmark/{origem}/{rank}-{handle}-{id}/ por criativo:
      video.mp4, audio.mp3, audio-description.md, benchmark.json, screenshots/
  - _degraded.md quando houver item parcial, degradado ou bloqueado
  - session.json atualizado com phases.f2_benchmark
pre_conditions: |
  - F1 executada, com ranking .json e ao menos 1 aprovado
  - ffmpeg e ffprobe disponíveis
post_conditions: |
  - Cada pack marcado como complete tem TODOS os assets em disco
  - A contagem reportada bate com o que existe no disco
acceptance_criteria: |
  - benchmark.json traz descrição e hashtags do autor
  - audio-description.md distingue música de fala original
  - Frames capturados nos cortes reais, não em intervalo fixo
  - Nicho notícias sem transcrição → status blocked
  - checklists/benchmark-completeness-checklist.md passa
---

# F2 — Benchmark ETL por Criativo

Transforma cada criativo aprovado num pack de assets organizados, pronto para a modelagem.

## Comando

```bash
node squads/virals-farming-squad/scripts/farm-benchmark.js --niche={nicho} --top=8
node ... --session={id} --ranks=1,3,7
node ... --niche={nicho} --url=https://www.tiktok.com/@x/video/123
```

| Flag | Efeito |
|:---|:---|
| `--top=N` / `--ranks=1,3,5` | seleção de criativos |
| `--no-transcribe` | pula transcrição (mais rápido) |
| `--headed` | navegador visível na captura |
| `--scene=0.30` | threshold de detecção de corte |

## Cascata de captura

Verificado em **2026-07-26**:

| Estratégia | Estado |
|:---|:---:|
| `yt-dlp` direto | ❌ `No video formats found!` |
| `yt-dlp --cookies` (sessão salva) | ❌ mesmo erro |
| `Downloader` do ETL compartilhado | ❌ degrada para `metadata_only`, sem arquivo |
| **Playwright + interceptação do CDN** | ✅ **captura o mp4 completo** |

As vias baratas continuam sendo tentadas primeiro — quando o extractor for corrigido
upstream, o pipeline volta a usá-las sozinho.

### Duas armadilhas resolvidas na implementação

1. **`res.body()` volta vazio.** O player consome o stream. Captura-se a **URL** do CDN e
   refaz-se o request pelo request context, que carrega os mesmos cookies.
2. **O CDN também serve vídeos de UI.** Pegar `ttwstatic.com/.../playback1` produz um mp4
   válido de 2 segundos — o pior tipo de falha, porque *parece* sucesso. Hosts estáticos
   são excluídos e o CDN de conteúdo tem prioridade sobre tamanho anunciado.
3. **Script de stealth quebra a reprodução.** `delete navigator.webdriver` impede o vídeo
   de tocar e, sem reprodução, o CDN nunca é chamado. A página do post é aberta **sem**
   stealth (a descoberta por hashtag é que precisa dele).

## Anatomia do pack

```text
{rank}-{handle}-{id}/
├── benchmark.json          link, métricas, descrição e hashtags do autor, cortes, takes
├── video.mp4               asset bruto
├── audio.mp3               áudio extraído
├── audio-description.md    música (título + tradução) OU transcrição integral
└── screenshots/
    ├── frame_01_at_00-00_hook.jpg
    └── frame_NN_at_MM-SS_corte-N.jpg
```

## Action Items

1. **Resolver sessão e itens** — ranking da F1, ou `--url` avulsa.
2. **Capturar** cada criativo pela cascata. Falha → `degraded` com o motivo técnico real.
3. **Validar em disco** — ffprobe confirma duração e dimensões. Arquivo curto demais é
   captura errada, não sucesso.
4. **Detectar cortes** — `ffmpeg scene-detect`. O número de cortes é **quantas imagens a
   F4 vai gerar**.
5. **Extrair frames** nos cortes + hook em 0s. Sem cortes, divide uniformemente.
6. **Extrair áudio** e classificar: `music` ou `original_speech`.
7. **Transcrever** via `LocalTranscriber` (Gemini). Falha é não-fatal, mas reportada.
8. **Gate terminal `noticias`** — sem transcrição, `status = blocked`.
9. **Completar a modelabilidade** com os sinais de `benchmark_stage`.
10. **Emitir** `benchmark.json`, `audio-description.md`, `_degraded.md` e atualizar o manifesto.
11. **Rodar** `checklists/benchmark-completeness-checklist.md`.

## Frames por corte, não por segundo

Frame a cada 5 segundos gera ruído num vídeo de 15s. O detector de cena marca os cortes
reais — e o desmonte informa a produção: `take_count = cortes + 1`.

## Música vs. fala

| Tipo | Tratamento | Efeito na F6 |
|:---|:---|:---|
| `music` | título, artista, tradução da letra | vira leito sonoro |
| `original_speech` | transcrição integral com timestamps | vira estrutura narrativa |

## Fidelidade

Campo ausente fica **ausente** e o pack é marcado como degradado. Nada é preenchido por
inferência. A contagem de completos é verificada **em disco**, não em log — um benchmark
que reporta "10 ok" com zero arquivos já aconteceu neste monorepo.

## Handoff

Packs `complete` → **@farming-modeler** (F3). Packs `partial` só com decisão explícita do
dono. Packs `degraded` e `blocked` não avançam.
