# Dossiê — Pipeline de Inteligência Criativa (Virals)

> **Para quem é isto:** estudo profundo do pipeline `daily-monitor → creative-benchmark → audit-benchmark`, os três estágios que antecedem a industrialização de vídeo e a modelagem de criativos estáticos/carrosséis.
>
> **Como usar para conteúdo:** cada estágio tem uma seção **📸 Vira story** com o ângulo de "prova em movimento" — o log de produção que você mostra. O pipeline inteiro É a demonstração da sua oferta.

---

## 0. Visão de 10 mil pés

O pipeline responde a uma pergunta de negócio: **"o que os melhores criadores do meu nicho estão fazendo esta semana, e como eu reaproveito isso com o meu DNA?"**

Ele tem três estágios sequenciais. Cada um consome o output do anterior:

```
┌─────────────────┐   rankings    ┌────────────────────┐   benchmark    ┌──────────────────┐
│  daily-monitor  │ ────────────▶ │ creative-benchmark │ ─────────────▶ │  audit-benchmark │
│  (o que bombou) │  .md por rede │ (baixa + analisa)  │ Transcrição +  │ (agentes julgam) │
└─────────────────┘               └────────────────────┘  Análise base  └──────────────────┘
        │                                   │                                     │
   coleta métricas                    baixa o criativo real               painel de especialistas
   + fit ranking                      + transcreve + frames               pontua vs. seu brand DNA
        │                                   │                                     │
        ▼                                   ▼                                     ▼
  _ranking-geral                      Benchmark.json                       _audit-summary
  _fit-ranking                        (item_status)                        (score + veredito)
```

Depois vêm as duas frentes de **produção** (fora deste dossiê): `*industrialize-video` (vídeo) e `*design-creative` (estático/carrossel). O pipeline de inteligência é a **bússola**; a produção é a **execução**.

**Princípio que atravessa tudo (VEX-14):** cada estágio **grita quando degrada** em vez de mentir. Um download que falha, um asset ruim, uma análise que não saiu — todos viram `degraded`, nunca `ok` falso. Isso existe porque um benchmark que mente contamina a decisão estratégica lá na ponta.

---

## 1. Estágio 1 — `daily-monitor` (o que bombou)

### O que faz
Varre uma lista curada de perfis concorrentes/referência e coleta os posts publicados nas últimas 36h, rankeando por engajamento e por fit com o cliente.

### Comando
```bash
node services/ETL/Extract/scrapers/daily-monitor.js \
  --client=tiago-elesbao --platforms=instagram,youtube --hours=36
```
Ou via agente: `@marketing-chief` → `*daily-monitor`.

### Como funciona por dentro

1. **Lê a lista de perfis** de `squads/virals-marketing-squad/data/clients/{cliente}/monitoring/monitoring-profiles.yaml`. Cada perfil tem `handle`, `url` e `priority: high/medium/low` (curadoria editorial que VOCÊ define).
2. **`SocialDiscovery`** (`services/ETL/Extract/scrapers/social-discovery.js`) instancia 4 **engines** especializados — um por rede:
   - `InstagramEngine`, `TikTokEngine`, `YouTubeEngine`, `LinkedInEngine` (em `engines/`).
   - Cada engine abre o perfil no Playwright, lê os posts recentes e extrai métricas via **camadas de fallback** (ld+json → og:description → DOM → innerText). Robusto porque o layout das redes muda toda hora.
3. **Filtra pela janela** (`isWithinWindow`): só posts entre agora e `agora − lookbackHours`.
4. **Pontua** cada post com o **Viral Score**:
   ```
   Viral Score = views × 0,1 + likes × 1 + comments × 5
   ```
   (`BaseEngine.calculateScore`). Comentário pesa 50× mais que view porque é o sinal mais caro de engajamento.
5. **Gera os documentos** em `workspaces/businesses/{cliente}/marketing/daily-monitoring/{data}/`.

### Os 5 documentos de saída

| Arquivo | O que é |
|---|---|
| `_summary-{data}.md` | Consolidado: visão por plataforma + ranking de cada rede |
| `{plataforma}-ranking-{data}.md` | Um por rede — top posts daquela plataforma por Viral Score |
| `_ranking-geral-{data}.md` | **[novo]** Ranking global cross-plataforma por **Score Normalizado** (0–100 dentro de cada rede, para comparar YouTube com IG) |
| `_fit-ranking-{data}.md` | **[novo]** Coletas ordenadas por **confluência com o SEU DNA**, não por engajamento |

### O insight central: Viral Score ≠ Fit

O Viral Score mede o quanto o **criador** engaja — não o quanto o conteúdo serve a **você**. Foi por isso que num benchmark real o top-5 por engajamento veio dominado por guru motivacional e IA-anime: alto engajamento, DNA oposto ao de um founder D2C.

O **`_fit-ranking`** corrige isso. O `fit-scorer` (`services/ETL/Transform/analyzers/fit-scorer.js`) pontua cada post 0–100 lendo o seu `brand-identity.yaml`:

- **+ léxico da marca** (`sempre_usar`: founder, sistema, prova, log, benchmark…)
- **− termos proibidos** (`nunca_usar`: mentoria, segredo, empreendedorismo…)
- **+ pilar de conteúdo** que casa (backstage-prova, learnings-aplicados…)
- **+ evidência numérica** (princípio MOSTRAR > DIZER)
- **± priority** do perfil (curadoria manual que você já fez)

Cada nota vem com o **"por quê"** — é auditável, não caixa-preta. A seção "Recomendados para benchmark (fit ≥ 60)" já entrega os shortcodes prontos para o próximo estágio.

### 📸 Vira story
- **"Como sei o que meu concorrente postou essa semana antes de abrir o Instagram"** — mostra o `_ranking-geral` saindo do terminal.
- **"Engajamento alto não significa que serve pra você"** — mostra dois posts: um viral que o fit rebaixou (guru) e um menos viral que o fit subiu (bastidor com número). Este é O conteúdo de posicionamento — explica sua tese inteira.
- **Dica de gravação:** o terminal rodando o `daily-monitor` com os 4 engines abrindo perfis é "log de produção" visual puro.

### ⚠️ Limitações honestas (para não prometer o que não entrega)
- O Instagram não expõe `views` em post estático — o Viral Score de estáticos é só likes+comments.
- A caption do IG vem da `og:description`, que traz só o **início** do texto. O fit de posts longos é parcial (o documento marca confiança "média/baixa").
- A coleta depende do Playwright navegar os perfis; perfil privado ou mudança de layout pode zerar uma rede naquele dia.

---

## 2. Estágio 2 — `creative-benchmark` (baixa + analisa)

### O que faz
Pega as URLs escolhidas (top engajamento OU top fit), **baixa o criativo real**, transcreve o áudio/analisa os slides, captura frames e produz uma base de análise por criativo.

### Comando
```bash
node squads/virals-marketing-squad/scripts/run-creative-benchmark.js \
  --client=tiago-elesbao --date=2026-07-17 --top=8 --platforms=instagram,youtube
# curadoria por fit (em vez de top-N):
  --picks="DaokUOsuGq5,Danu4Hbxouj,SyZb8lkRGgg"
```
Via agente: `@marketing-chief` → `*creative-benchmark`. **Pré-requisito:** `*daily-monitor` já rodado para a data.

### O fluxo interno, criativo por criativo

```
preflight → download → classify → analyze → scene-detect → deriva status → escreve arquivos
```

1. **Preflight** (`Extract/preflight.js`): antes de processar a fila, faz um `--simulate` numa URL real de cada plataforma. Se a plataforma estiver quebrada, aborta em ~5s (exit 2) em vez de descobrir no 11º minuto. Só sonda URLs de vídeo (post estático não é sondável por yt-dlp).
2. **Toolchain** (`Extract/toolchain.js`): se o `yt-dlp` estiver com mais de 7 dias, atualiza sozinho. Um extractor defasado é a causa nº 1 de falha silenciosa no Instagram.
3. **Download** (`Extract/downloader.js`):
   - **Vídeo** (reel/YouTube): `yt-dlp` — hoje baixa o IG **sem cookie**.
   - **Post/carrossel** (`/p/`): `instagram-embed.js` via endpoint público `/embed/` — **baixa a imagem do CDN, não fotografa a tela**. Sem sessão, sem login wall.
   - Cada download vive num **diretório por execução** (isolamento — evita adotar arquivo de outro run).
4. **Classify** (`Transform/analyzers/ContentClassifier.js`): decide o motor de análise pela URL + assets:
   - `video-short` / `video-long` → `VideoAnalyzer`
   - `image-single` / `carousel` → `ImageAnalyzer`
   - marca `degraded: true` quando não consegue classificar direito.
5. **Analyze**:
   - **`VideoAnalyzer`**: extrai áudio → transcreve com timestamps (Gemini, fallback Whisper local) → escolhe key moments → captura ~5 frames → cruza tudo.
   - **`ImageAnalyzer`**: move os slides para `Screenshots/` → analisa cada slide com visão (OCR do texto + descrição visual + gatilhos de design) → monta a transcrição estruturada.
6. **Scene-detect** (VEX-04): enquanto o vídeo existe, `ffmpeg` detecta os **cortes reais** de edição → `cut_timestamps` (a cadência verdadeira do criativo, não a segmentação da fala).
7. **Deriva o status** (`Load/benchmark-status.js` — o coração do fail-loud): o status **nunca é afirmado, é derivado das evidências**:
   - download falhou → `failed`
   - só metadados → `degraded`
   - URL de vídeo virou imagem (capa) → `degraded`
   - slides idênticos (login wall) → `degraded`
   - análise não saiu (visão fora do ar) → `degraded`
   - tudo certo → `ok`

### Output — a pasta de cada criativo

```
{data}/benchmark/{plataforma}/{rank}-{handle}-{hash}/
├── Transcrição.md    # áudio transcrito (vídeo) OU caption + análise por slide (imagem)
├── Análise.md        # base com placeholders — os agentes preenchem no estágio 3
├── Benchmark.json    # metadados + item_status + status_reason + cut_timestamps
└── Screenshots/      # frames do vídeo OU slides do carrossel
```

E dois consolidados: `_creative-benchmark-summary-{data}.md` / `.json` — com contagem `ok / degraded / failed` e **exit code ≠ 0** se houver degradado.

### Roteamento dinâmico de modelos (VEX-14)
Os modelos de visão/transcrição gratuitos do OpenRouter **morrem sem aviso** (saem do catálogo). Em vez de lista fixa, o `vision-router.js` **pergunta ao catálogo** quais modelos free existem agora, com `openrouter/free` (roteador oficial) à frente. Se a quota do Gemini estoura, cai no Whisper local. Nunca fica sem provider silenciosamente.

### 📸 Vira story
- **"O robô assistiu 233 reels do meu nicho e me disse o que funciona"** — mostra a transcrição de áudio + os frames capturados.
- **"Por que eu baixo o criativo em vez de só printar a tela"** — o print pega o modal de login; o download pega o criativo em 1080p. Ótimo "detalhe de engenheiro".
- **"O pipeline que se conserta sozinho"** — o auto-update do yt-dlp e o roteamento dinâmico de modelos. Prova de IA-first real, não hype.
- **Dica:** o `Benchmark.json` com `item_status: degraded` é uma ótima demonstração de honestidade do sistema — "ele prefere te avisar que falhou a te entregar lixo".

### ⚠️ Limitações honestas
- Vídeo removido da rede entre o monitor e o benchmark → `degraded` (correto, mas você perde aquele criativo).
- Transcrição via Whisper local (quando o Gemini estoura) é bem mais lenta (um vídeo de 30min pode levar ~13min).
- A visão de slides depende de provider de visão disponível — sem nenhum, o criativo fica `degraded` (assets ok, análise não).

---

## 3. Estágio 3 — `audit-benchmark` (os agentes julgam)

### O que faz
Um **painel de agentes-especialistas** (modelados em autoridades reais) audita cada criativo baixado, pontua contra o SEU brand DNA e produz um veredito + uma síntese estratégica cross-criativo.

### Comando
```bash
python squads/virals-marketing-squad/scripts/run_audit_benchmark.py \
  --client=tiago-elesbao --date=2026-07-17 --platforms=instagram,youtube
```
Via agente: `@marketing-chief` → `*audit-benchmark`. **Pré-requisito:** `*creative-benchmark` já rodado.

### O painel de agentes (config por cliente)

Definido em `data/clients/{cliente}/audit-config.yaml`. Cada agente é uma **lente**:

| Agente | Papel | Peso |
|---|---|---|
| `mrbeast-mk` | Retenção & Hooks (pattern interrupt, open loops, curva de energia) | 0,25 |
| `garyvee-mk` | Marca & documentar (autenticidade, personal brand) | 0,20 |
| `ladeira` | Copy de alta conversão (voz, léxico, CTA) | 0,20 |
| `casey-neistat-img` | Direção de imagem/carrossel — **só em estáticos/carrossel** | 0,20 |
| `sam-kolder-vid` | Direção de vídeo/motion — **só em vídeos/reels** | 0,15 |

O designer é escolhido pelo **tipo** do criativo (`designers_by_type`). Cada agente recebe, injetado no prompt, os blocos do seu `brand-identity.yaml` (`perfil`, `avatar`, `tom_de_voz`, `pilares`, `restricoes`…) — **o agente não inventa nada fora do seu DNA**.

### Como o score vira veredito

1. Cada agente pontua o criativo de **0 a 10** nas suas dimensões (ex.: mrbeast avalia "pattern interrupt do 1º frame", "open loops", "payoff").
2. O **score ponderado** combina as notas pelos pesos acima.
3. A **classificação** (`scoring.classification`):
   - `≥ 8,0` Excelente · `≥ 6,0` Bom · `≥ 4,0` Mediano · `< 4,0` Fraco
4. O **veredito** (`veredito_decision_table`):
   - `≥ 8` **modelar** (reaplicável direto) · `≥ 6` **adaptar** (estrutura serve, reframe) · `≥ 4` **inspirar** (pega o princípio) · `< 4` **ignorar**

### A síntese estratégica do Chief

Depois das notas individuais, o `@marketing-chief` roda um passe de LLM cross-criativo que identifica **padrões entre os criativos** (não um a um). Cada bullet **cita obrigatoriamente** o(s) criativo(s) de origem (`[cross: id1, id2]`) — regra anti-invenção. Produz:
- Padrões cross-criativo (ex.: "violação sistêmica de MOSTRAR > DIZER em [ids]")
- Criativos para **modelar / inspirar / ignorar**
- Próximos passos acionáveis (rodar `*design-creative` em X, `*industrialize-video` em Y)

### Output
```
{data}/benchmark/
├── _audit-summary-{data}.md    # ranking por score ponderado + síntese do Chief
├── _audit-summary-{data}.json  # machine-readable
└── {cada criativo}/Análise.md  # placeholders preenchidos com as 5 seções de cada agente
```

### Regra crítica (VEX-14): degradado não é auditado
O `run_audit_benchmark.py` **exclui** criativos com `item_status: degraded/failed`. Sem isso, os agentes auditariam capa/metadados e produziriam o veredito falso "falta de bastidor/evidência" — que foi exatamente o que aconteceu num benchmark real antes da correção. Você verá no log: `⏭️ {id}: ignorado (degraded — …)`.

### 📸 Vira story
- **"Coloquei o MrBeast, o GaryVee e o Ladeira pra auditar os criativos do meu nicho"** — mostra o painel de agentes rodando e as notas saindo. Conteúdo forte de "IA aplicada com caso de uso concreto".
- **"O que separa um criativo modelável de um pra ignorar"** — mostra a tabela de veredito e um exemplo de cada.
- **"O sistema recusou auditar 1 criativo — e por quê"** — o filtro de degradados. Demonstra rigor.
- **Dica:** a síntese do Chief é praticamente um roteiro de conteúdo pronto — "os padrões que separam quem cresce de quem estagna no meu nicho essa semana".

### ⚠️ Limitações honestas
- A qualidade da nota depende da qualidade do provider de LLM no momento (os modelos free variam). O roteamento dinâmico mitiga, mas uma síntese pode precisar de re-run.
- O score é uma **lente de fit**, não uma verdade absoluta — dois clientes com brand-identities diferentes dariam notas diferentes ao MESMO criativo. É essa a intenção.

---

## 4. O pipeline como demonstração da sua oferta

Isto é o ponto estratégico para as suas stories. O documento `assets/estrategia-marca-automacao-ia.md` define a tese: **"prova em movimento, não promessa no papel"**. Este pipeline É a prova.

| Estágio | O que ele PROVA para um cliente potencial |
|---|---|
| daily-monitor | "Eu monitoro seu nicho inteiro, automaticamente, todo dia" |
| creative-benchmark | "Eu sei o que performou e por quê — no detalhe do frame e da copy" |
| audit-benchmark | "Eu tenho um painel de especialistas julgando cada peça contra a SUA marca" |
| industrialize/design (produção) | "E entrego a versão pronta pra você testar" |

O **Tier 1 (benchmark one-shot)** da sua oferta é literalmente **rodar este pipeline para o nicho de um cliente e entregar o `_audit-summary`**. A sequência de stories que você vai produzir não é só conteúdo educativo — é a **demonstração pública do produto** que você vende.

### Arco sugerido de stories (do início ao fim)
1. **O problema:** "criativo é o gargalo de todo negócio que anuncia — e todo mundo testa no escuro."
2. **daily-monitor:** "primeiro, eu vejo tudo que o nicho postou."
3. **fit ranking:** "mas engajamento não é fit — deixa eu te mostrar a diferença."
4. **creative-benchmark:** "aí eu baixo e o robô disseca os melhores."
5. **audit-benchmark:** "e um painel de especialistas julga cada um contra o DNA da marca."
6. **A ponte:** "com isso na mão, produzir criativo deixa de ser chute." → gancho para as stories de produção.

---

## 5. Mapa de arquivos (referência rápida)

| Componente | Arquivo |
|---|---|
| Orquestrador daily-monitor | `services/ETL/Extract/scrapers/daily-monitor.js` |
| Coleta multi-rede | `services/ETL/Extract/scrapers/social-discovery.js` + `engines/*.js` |
| Score de engajamento | `engines/BaseEngine.js` (`calculateScore`) |
| Fit scorer | `services/ETL/Transform/analyzers/fit-scorer.js` |
| Geradores de ranking | `services/ETL/Transform/analyzers/ranking-builders.js` |
| Orquestrador benchmark | `squads/virals-marketing-squad/scripts/run-creative-benchmark.js` |
| Download (yt-dlp + embed) | `services/ETL/Extract/downloader.js`, `Extract/scrapers/instagram-embed.js` |
| Preflight / auto-update | `Extract/preflight.js`, `Extract/toolchain.js` |
| Classificação de conteúdo | `services/ETL/Transform/analyzers/ContentClassifier.js` |
| Análise de vídeo/imagem | `Transform/analyzers/VideoAnalyzer.js`, `ImageAnalyzer.js` |
| Transcrição + roteamento de modelos | `Transform/video-intelligence/local-transcriber.js`, `vision-router.js` |
| Derivação de status (fail-loud) | `services/ETL/Load/benchmark-status.js` |
| Orquestrador auditoria | `squads/virals-marketing-squad/scripts/run_audit_benchmark.py` |
| Config do painel de agentes | `data/clients/{cliente}/audit-config.yaml` |
| DNA da marca (consumido por tudo) | `data/clients/{cliente}/brand-identity.yaml` |
| Lista de perfis monitorados | `data/clients/{cliente}/monitoring/monitoring-profiles.yaml` |

---

## 6. Glossário

- **Viral Score** — engajamento bruto: `views×0,1 + likes×1 + comments×5`.
- **Score Normalizado** — Viral Score reescalado 0–100 dentro de cada rede (para comparar redes).
- **Fit Score** — aderência ao seu brand DNA (0–100), independente do engajamento.
- **item_status** — `ok / degraded / failed`, derivado das evidências (fail-loud).
- **cut_timestamps** — cortes reais de edição do vídeo (scene-detect), a cadência verdadeira.
- **Veredito** — `modelar / adaptar / inspirar / ignorar`, decidido pelo score ponderado dos agentes.
- **Painel de agentes** — especialistas-lente (MrBeast, GaryVee, Ladeira + designer por tipo) que auditam contra o brand-identity.
- **Fail-loud** — princípio de que cada estágio sinaliza degradação em vez de entregar dado ruim como sucesso.
