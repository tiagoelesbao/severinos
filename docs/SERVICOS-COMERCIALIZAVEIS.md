# Catálogo de Serviços Comercializáveis — Projeto Virals

> Mapa das capacidades técnicas já construídas neste repositório que podem ser
> empacotadas e vendidas como **serviços prestados** (agência, SaaS, produtos
> avulsos ou retainers). Cada item aponta para o ativo real que o sustenta.
>
> _Documento de referência — data: 2026-07-14._

---

## 1. Inteligência Competitiva & Benchmark de Criativos

**O que é:** monitoramento diário multi-rede + engenharia reversa dos criativos
que mais performam no nicho do cliente.

**Ativos que sustentam:**
- Pipeline ETL completo (`services/ETL/`): Extract → Transform → Load.
- Scrapers próprios para **Instagram, TikTok, YouTube e LinkedIn**
  (`services/ETL/Extract/scrapers/`), incluindo login de sessão, carrossel e
  discovery de perfis.
- `*daily-monitor` (Marketing Chief): ranking diário multi-rede.
- `*creative-benchmark`: ETL profundo dos top criativos — transcrição, extração
  de frames, análise de imagem e classificação de conteúdo
  (`Transform/analyzers/`, `Transform/video-intelligence/`).

**Como vender:**
- Relatório de benchmark competitivo (one-shot ou assinatura mensal).
- "Radar de tendências" do nicho — entrega recorrente de o que está viralizando.
- Auditoria de concorrentes antes de um lançamento.

---

## 2. Geração de Criativos Estáticos a partir de Benchmark (Design-Creative)

**O que é:** transformar um criativo de referência em um template on-brand e
gerar posts/carrosséis novos, fiéis à estrutura vencedora, com a copy e a marca
do cliente.

**Ativos que sustentam:**
- App **`apps/creative-design`** (Next.js): design system + studio de edição,
  presets de template, sistema de camadas (`src/lib/layers.ts`,
  `templatePresets.ts`).
- Pipeline Python de criativo (`squads/virals-marketing-squad/scripts/`):
  `plan_creative.py`, `design_creative.py`, `generate_template_from_benchmark.py`,
  `orchestrate_carousel.py`, `orchestrate_post_single.py`, `deep_modeler.py`,
  `quality_gate.py` (guarda de fidelidade de fatos).

**Como vender:**
- Fábrica de criativos sob demanda (pacote de X posts/mês).
- Serviço "clone a estrutura que vende" — template a partir de referência.
- Produção de carrosséis educacionais/venda em escala.

---

## 3. Produção de Vídeo Viral Automatizada (Video Studio)

**O que é:** montagem automatizada de Reels/TikToks on-brand — timeline, FX,
legendas word-by-word, motion e export headless em MP4.

**Ativos que sustentam:**
- App **`apps/video-studio`** (Remotion + Next): motor de render headless
  1080×1920, composições on-brand por marca (`brand-config.yaml`), editor de
  timeline, biblioteca de FX e módulo de legendas performáticas (foco recente
  de vários commits: karaokê por letra, fontes reais, tratamentos fiéis).
- Pipeline Python de vídeo: `plan_video_creative.py`, `deep_modeler_video.py`,
  `generate_video_overlays.py`, `benchmark_video_render.py`,
  `run_podcast_to_reel_pipeline.py` (podcast → Reel), `quality_gate_video.py`.
- Transcrição local + análise de áudio/vídeo (`video-intelligence/`).

**Como vender:**
- Edição de Reels em escala para creators e infoprodutores.
- "Podcast to Reels" — repurpose de conteúdo longo em cortes verticais.
- Legendagem premium animada como serviço avulso.
- Export para **DaVinci Resolve** (`export_to_davinci.py`, `.edl`) para clientes
  que querem finalizar em NLE profissional.

---

## 4. Agência de Vídeo com IA Generativa (100% Free-Tier)

**O que é:** pipeline de vídeo publicitário luxury/minimalista usando apenas
ferramentas gratuitas + IA generativa, do briefing à timeline pronta.

**Ativos que sustentam:**
- Squad **`virals-free-video-agency-squad`**: 4 agentes (estrategista de marca,
  diretor de arte, diretor de fotografia, verificador de qualidade).
- `free_video_pipeline.py`: gera imagens, vídeos e timeline `.edl` para DaVinci.

**Como vender:**
- Produção de VT publicitário de baixo custo para pequenas marcas.
- Serviço white-label para agências que querem terceirizar criação com IA.

---

## 5. Recrutamento e Gestão de Micro-Creators (Influencer Sourcing)

**O que é:** encontrar, qualificar e gerenciar micro-creators para UGC e
campanhas de marca, a partir do ICP-C (Ideal Creator Profile).

**Ativos que sustentam:**
- Squad **`virals-creators-hunting-squad`**: pipeline de 4 fases (discovery,
  scoring proprietário "Creator Score", outreach, gestão/CRM).
- Discovery social (`Extract/scrapers/social-discovery.js`).
- Integração com **ClickUp** como CRM (`services/clickup/`).

**Como vender:**
- Serviço de casting de creators / influencer sourcing.
- Gestão de campanhas de UGC (recrutamento + onboarding + performance tracking).

---

## 6. Páginas de Alta Conversão (Landing/Sales Page Modeling)

**O que é:** engenharia reversa da estrutura de conversão de páginas de big
players e remodelagem para a marca/produto do cliente — entregando HTML pronto.

**Ativos que sustentam:**
- Skill **`deliverables/skills/conversion-page-modeler`**: brand kit, estrutura
  seção-a-seção, copy na voz da marca, HTML responsivo, playbook de conversão,
  objection handling, template de landing page.

**Como vender:**
- Criação de landing/sales pages sob demanda.
- Auditoria + remodelagem de páginas existentes.
- Produto empacotável (a skill já está zipada para distribuição).

---

## 7. Copywriting & VSL de Alta Conversão

**O que é:** copy de vendas, headlines, scripts de VSL e roteiros de vídeo
modelados em autoridades do mercado.

**Ativos que sustentam:**
- Squad **`virals-vendas-squad`** e agentes de marketing: `@ladeira` (master
  copywriter), `@georgi` (VSLs e scripts), `@hormozi-sales` (ofertas),
  `@belfort-sales` (fechamento), `@blount-sales` (prospecção).
- Bridge de copy → design (`bridge_ladeira_to_casey.py`).

**Como vender:**
- Pacotes de copy (páginas, e-mails, anúncios).
- Roteirização de VSL e scripts de vídeo de vendas.
- Construção de ofertas irresistíveis (framework Hormozi).

---

## 8. Gestão de Tráfego Pago (Direct Response & Brand)

**O que é:** estruturação e gestão de campanhas de tráfego, tanto direct
response quanto brand/funil.

**Ativos que sustentam:**
- Agentes `@perry-marshall` (DR traffic), `@ezra-firestone` (brand & funil).
- Workflows: "DR Campaign Lifecycle" e "Brand Funnel Lifecycle"
  (`squads/virals-marketing-squad/ARCHITECTURE.md`).

**Como vender:**
- Gestão de mídia paga (retainer mensal).
- Estruturação de funis de aquisição.

---

## 9. SEO & Estratégia de Conteúdo Orgânico

**O que é:** pesquisa de audiência, arquitetura de conteúdo e estratégia de
crescimento orgânico.

**Ativos que sustentam:**
- Agente `@fishkin-mk` (SEO e audience research), `@garyvee-mk` (distribuição e
  presença social), `@mrbeast-mk` (retenção/arquitetura de conteúdo viral).

**Como vender:**
- Consultoria/estratégia de conteúdo orgânico.
- Calendário editorial e arquitetura de canais.

---

## 10. Business Intelligence & Dashboards de Métricas

**O que é:** painéis de observabilidade e BI acionável a partir dos dados
coletados e das operações.

**Ativos que sustentam:**
- App **`apps/dashboard`** (Next.js): observabilidade em tempo real.
- App **`apps/BI`** e agente `@kaushik` (BI e métricas acionáveis).
- Integrações de dados: **ClickUp** (`services/clickup`), **Google Drive**
  (`services/google-drive`).

**Como vender:**
- Setup de dashboard de métricas para o cliente.
- Relatórios de performance recorrentes (analytics-as-a-service).

---

## 11. Consultoria de Operações, Produto e Projetos (Advisory)

**O que é:** frameworks de gestão modelados em autoridades, prestados como
consultoria/mentoria.

**Ativos que sustentam:**
- **Operações** (`virals-ops-squad`): `@dalio` (princípios/decisão),
  `@wickman` (EOS/tração), `@walker-launch` (lançamentos), `@hormozi-sys`
  (escala operacional), `@kaushik` (BI).
- **Produto** (`virals-produto-squad`): `@cagan-produto` (gestão de produto),
  `@torres-produto` (discovery contínuo), `@eyal-produto` (hábito/engajamento),
  `@wes-bush-produto` (onboarding/PLG), `@lincoln-produto` (customer success).
- **Projetos** (`virals-projetos-squad`): `@singer-proj` (shaping/betting),
  `@sutherland-proj` (sprints/velocidade), `@allen-proj` (GTD/portfólio),
  `@catmull-proj`, `@lencioni-proj`.

**Como vender:**
- Mentoria/consultoria por vertical (lançamento, onboarding, OKRs, sprints).
- Diagnóstico + plano de ação com framework proprietário.

---

## 12. Plataforma / Framework como Produto (AIOX + Squads)

**O que é:** o próprio motor de orquestração de agentes de IA (AIOX) e a
biblioteca de squads podem ser licenciados/implantados em outras operações.

**Ativos que sustentam:**
- Framework **AIOX** (`.aiox-core/`): CLI, agentes de engenharia, Constitution,
  code intelligence, graph dashboard.
- **`squad-creator`**: criação e gestão de squads sob medida.
- Biblioteca completa de squads de negócio (marketing, vendas, produto, ops,
  projetos, hunting, video agency).

**Como vender:**
- Implantação do sistema de agentes/squads em operações de terceiros (setup +
  treinamento).
- Licenciamento white-label da "Máquina de Viralidade".
- Criação de squads customizados como serviço.

---

## Resumo por Modelo de Receita

| Modelo | Serviços aplicáveis |
|--------|---------------------|
| **One-shot / projeto** | Benchmark competitivo (1), landing pages (6), copy/VSL (7), consultoria diagnóstica (11) |
| **Assinatura / retainer** | Radar de tendências (1), fábrica de criativos (2), edição de vídeo em escala (3), tráfego pago (8), BI recorrente (10) |
| **Performance / campanha** | Influencer sourcing (5), lançamentos (11), gestão de mídia (8) |
| **Produto / licença** | Skill de conversão empacotada (6), free-video-agency white-label (4), framework AIOX + squads (12) |

---

### Observações de maturidade

- **Prontos / avançados:** ETL + benchmark (1), creative-design (2), conversion
  page modeler (6), squads de advisory (11).
- **Em evolução ativa:** video-studio (3) — legendas e render on-brand foram o
  foco dos commits mais recentes; editor de timeline (MVC-10) ainda em frente
  aberta.
- **Depende de integração externa:** hunting squad (5) usa ClickUp como CRM;
  BI (10) depende dos conectores de dados.

> Antes de comercializar qualquer frente, validar limites de scraping/ToS das
> plataformas (item 1 e 5) e a fidelidade de fatos nas entregas de copy/criativo
> (guards `quality_gate*.py` já existem para isso).
