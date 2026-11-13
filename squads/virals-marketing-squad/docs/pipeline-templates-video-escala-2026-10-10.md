# Pipeline de Templates de Vídeo em Escala — Estudo

**Pedido do founder (2026-10-10):** avaliar a melhor forma de construir um app/pipeline de templates de vídeo pra produção de criativos em lote/larga escala, pros dois clientes de Ads (Império Prêmios, Garantido Prêmios). Estudo, não implementação — decisão de seguir ou não é do founder.

**Status 2026-10-18:** a seção 4 (menor passo) foi executada pros DOIS clientes agora, não só o Garantido. Império ganhou `video-templates.yaml` + `ad-recipes/` + `scripts/render-imperio-recipe.mjs`, espelhando exatamente o que já existia pro Garantido — `ImperioIgnicaoPunho.tsx` passou a aceitar `headlineCopy`/`hookCamera` como props opcionais (default preserva o render original pixel-idêntico). 6 variações renderizadas e verificadas (vídeo real, não maquete): 3 eixo-câmera (zoom-in/zoom-out/parada) com a copy aprovada do Ângulo Prêmio, + 3 eixo-copy (Confiança/Acessibilidade/Prova, headlines já aprovadas em `copy-angles-2026-10-09.md`, cross-aplicadas no headline de fechamento — nenhuma copy nova foi inventada). Output em `outputs/imperio-premios/video-renders/recipe-batch-2026-10-18/`. Gaps que seguem reais (não resolvidos agora): Império só tem 1 take (Garantido tem 3), o eixo de CTA/Ângulo Comunidade foi deliberadamente deixado de fora (aponta pro botão primário da LP, não o secundário — misturar quebraria a lógica de funil), e os overlays de abertura do Take 1 continuam fixos (não variam por receita ainda). Trabalho ainda sem commit (untracked).

**Refinamento 2026-10-10 (após leitura do 1º resumo):** variação não pode ser só de copy — precisa variar HOOK/MOTION também (kinetic text reveal, zoom in/out no hook, split dinâmico de texto, tela dividida com metáfora visual sincronizada, entre outros). E o founder descreveu um fluxo de app concreto (upload → template por vertical → N variações geradas → escolha → abre o video-studio pra refinamento) que este documento também precisa propor como arquitetura. Seções 1.4, 2.3 (eixo `hook_template`), 2.6 (proposta de app) e 2.7 (pré-processamento específico de sorteios) abaixo são a resposta a isso.

---

## 1. Estado real de hoje (auditoria de código, não suposição)

### 1.1 Achado central: já existe um motor de templates maduro — e ele não está sendo usado pelos criativos de Ads

O `apps/video-studio` **não é um conjunto de scripts avulsos** — é uma aplicação Next.js com editor próprio (Player, timeline, markers, playhead) construída sobre Remotion, com uma camada de dados já desenhada pra ser **declarativa e dirigida por template**:

- `src/lib/timeline.ts` (342 linhas) — tipo `Timeline`: trilha de vídeo, trilha de áudio com segmentos, camadas extras tipadas (texto/imagem/mídia), transições por clipe, animações de elemento, keyframe tracks.
- `src/lib/fxPlan.ts` — tipo `FxPlan`: brand tokens (cor, fonte, display name), `hookRenderer`, `captionRenderer`, `motionRenderers[]`, lista de captions.
- `src/remotion/TimelineFxComposition.tsx` (528 linhas, com `calculateMetadata` — duração/fps/dimensões saem dos PRÓPRIOS dados, não de constantes no componente) — é o motor de render genérico: lê `Timeline`+`FxPlan`, monta clipes com transição, aplica `ElementWrap` (posição/escala/fade/animação de entrada-saída por keyframe), renderiza texto via `TextElement` com a MESMA convenção do libass (editor e export desenham igual), aplica captions via `CaptionsOverlay`, aplica `ProgressBar`/lower-third conforme o `FxPlan` pedir.
- `src/lib/videoTemplates.ts` — carrega `video-templates.yaml` **por cliente** (`squads/virals-marketing-squad/data/clients/{slug}/video-templates.yaml`): hook packs, caption styles, transition packs, motion presets, com `scoring_match` pra resolver automaticamente qual preset usar. Já existe para `oraclum`, `tiago-elesbao`, `virals`.
- `src/lib/fxRegistry.ts`, `src/lib/fxCatalog.ts`, `src/remotion/fx/*` (`SmartFrame`, `HookFx`, `Captions`, `Motion`, `Transicoes`) — o registry que resolve um `id` de preset do YAML pra um componente Remotion de verdade.
- Cobertura de teste real: `animacoes.test.ts`, `audioEnvelopes.test.ts`, `captions.test.ts`, `cues.test.ts`, `editSpec.test.ts`, `fxCatalog.test.ts`, `fxRegistry.test.ts`, `keyframes.test.ts`, `safeZones.test.ts`, `trackMix.test.ts` e mais — não é protótipo, é sistema com rede de segurança.

Esse motor nasceu do EPIC Video-Excellence (marcadores `VEX-01` a `VEX-09` no código) pra conteúdo orgânico de canal/montagem (farming, dark-room). Ele já resolve exatamente o problema central de um sistema de templates: **uma "receita" de dados (Timeline + FxPlan) gera N vídeos sem tocar em `.tsx`**, e o motor já tem conceito de preset por cliente versionado em YAML.

### 1.2 O que NÃO está usando esse motor: os criativos de Ads (Império/Garantido)

Confirmado por 3 evidências diretas:

1. `squads/virals-marketing-squad/data/clients/imperio-premios/` e `.../garantido-premios/` **não têm `video-templates.yaml`** (só `oraclum`, `tiago-elesbao`, `virals` têm).
2. O próprio `pipeline-producao.md` (escrito nesta mesma sessão, 2026-10-09) já registra isso explicitamente: *"Pra estas duas peças específicas não há etapa de `apps/video-studio`, porque nenhum dos dois clientes tem `video-templates.yaml`/`brand-config.yaml` configurado ainda."*
3. Os componentes reais (`src/remotion/clients/imperio/ImperioIgnicaoPunho.tsx`, `src/remotion/clients/garantido/GarantidoAds.tsx` + `GarantidoTransicoes.tsx`/`PhoneMockup.tsx`/`GarantidoAppScreen.tsx`/`palette.ts`) são **composições bespoke, uma por cliente**, com constantes de copy/cor/timing majoritariamente cravadas no `.tsx`. Um único ponto de parametrização real foi aberto nesta sessão: a `Headline` da Garantido passou a receber `copy: HeadlineCopy` em vez de texto fixo — mas isso foi uma correção pontual pro pedido imediato do founder (3 headlines diferentes), não uma generalização deliberada do padrão. Paleta de cor, takes-fonte, transições e timing continuam cravados por composição.

**Conclusão da Parte 1: não existe uma lacuna de "zero pra um" — existe uma lacuna de integração.** O trabalho não é inventar um sistema de templates do zero; é decidir se os criativos de Ads entram no motor que já existe (estendendo `Timeline`/`FxPlan`/`video-templates.yaml` pra cobrir o vocabulário visual de anúncio pago — mockup de celular 3D, brasão/partículas, grade de números) ou se continuam como uma segunda linha de produto deliberadamente separada, com seu PRÓPRIO sistema de receita mais simples.

### 1.3 Esforço real de generalizar

- **Props de copy/texto**: baixo esforço — o padrão já foi usado uma vez (`HeadlineCopy` da Garantido). Replicar pra CTA, legendas sobre o take, nome da marca: horas, não dias, por composição.
- **Paleta de marca por cliente**: esforço baixo-médio — já existe o conceito (`brand.fontFamily`/`brand.accent`/`brand.primary` no `FxPlan`); os arquivos `palette.ts` do Império/Garantido já são, na prática, um `brand-config.yaml` não formalizado. Formalizar = mover pra YAML por cliente + um loader, mesmo padrão de `videoTemplates.ts`.
- **Motion graphics específico de anúncio (phone mockup, coroa/partículas, grade de números) como preset reusável**: esforço médio-alto — esses elementos hoje são JSX cravado dentro do componente da peça, não blocos registrados no `fxRegistry`. Pra virar "preset" selecionável por YAML (ex.: `motion_presets: [{id: "phone-mockup-3d"}]`), cada um precisa ser extraído como componente parametrizado (props: imagem/cor/posição) e registrado no catálogo — é o mesmo trabalho que `SmartFrame`/`HookFx` já fazem pros presets orgânicos, aplicado a um vocabulário novo.
- **Fila de geração de variações (N combinações de copy×ângulo×hook a partir de 1 template)**: não existe hoje nem no motor orgânico nem no de Ads — os `scripts/render-*.mjs` atuais rodam 1 render por invocação, parametrizado por argumento de linha de comando, não por lote. Esse é o item genuinamente novo a construir (seção 2.3).

### 1.4 Auditoria: catálogo de FX existente vs. os tipos de hook pedidos

O motor já tem um catálogo real (`src/lib/fxCatalog.ts`, 401 linhas, testado) organizado em **quatro grupos por escopo** — a separação que a memória de sessão anterior registrou: TRANSIÇÃO (16 tipos — dissolve, whip, wipe, zoom-punch, glitch etc.), ANIMAÇÃO (10 tipos — fade, sobe, desce, cresce, encolhe, pop, desfoca, todos de ENTRADA/SAÍDA de um elemento inteiro), EFEITO (11 overlays — partículas, grão, VHS, vazamento de luz), CÂMERA (10 tipos — zoom-in, zoom-out, pan, tilt, push diagonal, deriva, handheld, cada um com peso calmo/médio/agressivo e curva linear/suave/acelera/desacelera). Existe também um `HookFx` separado e menor (`src/remotion/fx/HookFx.tsx`, 32 linhas) — tratamento específico do 1º clipe, com só 3 opções (`snap-zoom`, `whip`, `hard-cut`), resolvidas por heurística de regex sobre o id do preset (`fxRegistry.ts`), não um catálogo rico como os outros quatro grupos.

**Checagem pontual do achado de memória "zoom-out inalcançável pela UI":** não é mais verdade no código atual — `src/app/studio/page.tsx:1614` mapeia `CAMERAS` inteiro (os 10 tipos, incluindo `zoom-out`) direto num `<select>` sem filtro. Ou o gap já foi corrigido em algum momento entre a sessão que gerou aquela memória e agora, ou a memória descrevia uma tela diferente. De qualquer forma, hoje os 10 movimentos de câmera estão expostos.

Mapeando contra os tipos de hook que o founder pediu, item por item:

| Pedido do founder | Existe hoje? | Onde | O que falta |
|---|---|---|---|
| **Zoom in/out no momento do hook** | **Parcialmente** | `CAMERAS` (zoom-in/zoom-out, parametrizado) já existe pro corpo do clipe; `HookFx.snap-zoom` já existe especificamente pro instante de entrada do 1º clipe (spring de escala 1.4→1) | Unificar os dois num só controle "hook de câmera" com direção (in/out) e amplitude — hoje são dois sistemas que resolvem pedaços do mesmo problema, não um "template de hook" coeso |
| **Headline em motion aparecendo (kinetic text reveal)** | **Parcialmente, e espalhado** | A técnica (stagger por palavra, cada palavra com seu próprio delay) já foi construída **3 vezes de forma independente**: `CaptionsOverlay`/`word-pop` (legenda, catálogo real), a `Headline` do Império (`ImperioIgnicaoPunho.tsx`, cravada no componente), a `Headline` da Garantido (`GarantidoAds.tsx`, parametrizada nesta sessão) | Não existe HOJE um componente de "headline cinética" reusável e registrado no catálogo — existem 3 implementações da mesma ideia, nenhuma delas um preset selecionável. Extrair uma das três pro catálogo (a da Garantido é a mais madura — já aceita contagem de palavra variável) resolve isso com re-uso, não com código novo do zero |
| **Texto se dividindo dinamicamente e recolhendo (split dinâmico)** | **Não existe** | — | Primitivo genuinamente novo. Nenhum dos 10 tipos de `ANIMACOES` faz split de string em fragmentos com movimento independente por fragmento — precisa de um componente novo no mesmo espírito do `ElementWrap`, mas operando por substring/caractere, não por elemento inteiro |
| **Tela dividida com motion exemplificando visualmente a copy (metáfora visual sincronizada)** | **Não existe** | — | É o item de maior escopo: não é animação nem efeito, é um primitivo de LAYOUT (múltiplos painéis simultâneos na tela, cada um podendo ter conteúdo próprio — vídeo, ícone, texto —, sincronizados por frame com o que a copy está dizendo naquele instante). Nada no catálogo atual compõe mais de 1 "cena" ao mesmo tempo na tela — `TimelineFxComposition` sequencia clipes um de cada vez, não os divide espacialmente |
| **"E por aí vai" (mais tipos abertos)** | — | — | O catálogo já é extensível por desenho (é literalmente uma lista TS + função de resolução) — adicionar um 11º tipo de animação ou um 17º de transição é baixo esforço incremental, o alto esforço é só nos 2 primitivos genuinamente novos acima (split dinâmico, split-screen) |

**Conclusão da auditoria:** 2 dos ~4 tipos pedidos (zoom no hook, headline cinética) já existem em peças que só precisam ser unificadas/extraídas pro catálogo — esforço baixo-médio. Os outros 2 (split dinâmico, split-screen com metáfora) são primitivos novos — esforço médio-alto cada, porque mudam a forma de composição (de "um elemento por vez" pra "múltiplos fragmentos/painéis simultâneos").

---

## 2. Arquitetura recomendada

### 2.1 Princípio: estender, não substituir

Não criar um terceiro sistema. O `Timeline`+`FxPlan`+`video-templates.yaml` já resolve "receita declarativa → N vídeos sem tocar em `.tsx`" pra conteúdo orgânico — o caminho de menor risco é dar aos criativos de Ads o mesmo tratamento, não reinventar o formato de receita.

### 2.2 Camada de "receita" por criativo

Um YAML/JSON por variação de anúncio, análogo ao que `video-templates.yaml` já faz, mas no vocabulário de Ads:

```yaml
# exemplo de receita (squads/.../garantido-premios/ad-recipes/take2-v3.yaml)
template: garantido-ad-take          # qual composição-template usar
take_file: take2_video1-fonte_sem-texto_20261008.mp4
transicao: chegada                   # id registrado no fxRegistry de Ads
headline:
  linha1: "A espera acaba rápido."
  linha2: "O pagamento também."
  destaque: "também."
cta: "Ver o que está disponível agora"
angulo: comunidade                   # rastreabilidade — liga de volta à copy-angles
brand: garantido                     # resolve brand-config.yaml (paleta, fonte)
hook_template: kinetic-reveal-v1      # NOVO — eixo independente de copy, ver 2.3
```

A composição Remotion (`GarantidoTake2Ad` e equivalentes) deixa de ter QUALQUER texto/cor cravado — tudo vem da receita. Isso é extensão direta do padrão `HeadlineCopy` já aberto nesta sessão, não uma reescrita.

### 2.3 Eixo `hook_template` — independente de copy, pra matriz completa de variação

O pedido do founder é explícito: criative diversity real (Módulo 06/07 do MBA) não é só texto diferente em cima do mesmo motion — é poder combinar QUALQUER copy/ângulo com QUALQUER template de hook. Isso exige que `hook_template` seja um eixo PRÓPRIO na receita, resolvido contra um catálogo de hooks (análogo a `video-templates.yaml`, mas com o vocabulário da auditoria 1.4), não um parâmetro dentro do template de copy.

Três exemplos de como um `hook_template` ficaria registrado (`squads/.../{cliente}/hook-templates.yaml`, mesmo padrão de carregamento do `videoTemplates.ts`):

```yaml
# hook-templates.yaml
- id: kinetic-reveal-v1
  tipo: headline-cinetica
  descricao: "Headline entra palavra por palavra, última frase com destaque"
  componente: HeadlineCinetica       # extraído da Garantido Headline (ver 1.4)
  stagger_frames: 6
  highlight: ultima-frase

- id: hook-zoom-in-v1
  tipo: camera-hook
  descricao: "Zoom in acelerado nos primeiros 12 frames, assenta e segue parado"
  camera: zoom-in
  peso: agressivo
  curva: desacelera
  duracao_frames: 12

- id: split-screen-metafora-v1
  tipo: layout-dividido               # primitivo NOVO, ver 1.4
  descricao: "Tela dividida 50/50 — esquerda o take real, direita motion ilustrando a copy"
  paineis:
    - lado: esquerda
      conteudo: take
    - lado: direita
      conteudo: motion-sincronizado   # referencia qual elemento visual acompanha qual trecho da copy
  sincronia: por-palavra               # cada painel direito muda no mesmo frame em que a palavra correspondente aparece
```

Uma receita de criativo (seção 2.2) referencia `hook_template` por id; o orquestrador de lote (2.4) multiplica `N copies × M hook_templates` pra gerar a matriz completa, não uma combinação manual por vez.

### 2.4 Fila de geração em lote (o item genuinamente novo)

Hoje cada `render-*.mjs` é 1 script = 1 peça. Pra lote real:

- Um script orquestrador (`render-batch.mjs`) que lê um diretório de receitas (`ad-recipes/*.yaml`), resolve cada uma contra o template + `video-templates.yaml` do cliente, e dispara 1 render do Remotion por receita — reaproveitando o MESMO bundle (como `render-garantido-ads.mjs` já faz pras 3 peças de hoje, só generalizado pra N).
- Naming automático e rastreável: `{cliente}_{angulo}_{hook}_{formato}_{AAAAMMDD}_{hash-da-receita}.mp4` — já existe convenção parecida em `utm-convention.md` pro nome de anúncio no Ads Manager; replicar aqui fecha o ciclo (o nome do arquivo já carrega o que precisa pra rastrear no Ads Manager depois).
- **Local primeiro, Lambda depois.** `@remotion/lambda` não está nas dependências hoje (`package.json` só tem `@remotion/bundler`/`cli`/`renderer`/`player`) — todo render desta sessão rodou local. Pra 5-20 variações por onda (volume real hoje), render local sequencial/paralelo limitado já resolve sem custo de infraestrutura nova. Lambda só se justifica quando o volume passar de dezenas simultâneas por lote (seção 3).

### 2.5 Revisão humana antes de publicar

O próprio `pipeline-producao.md` já estabelece o princípio certo pra isso (etapa 5, "Conferência contra a spec") — a MESMA disciplina usada nesta sessão pros 3 vídeos da Garantido (still extraído + conferido visualmente antes de declarar pronto, 2 bugs reais achados assim) precisa virar passo formal do lote, não prática ad-hoc do agente: **1 still por variação, grade de contato (nunca aprovar vídeo sem olhar frame real) antes de qualquer upload pro Ads Manager.** Em volume, isso vira um passo do orquestrador (gerar grade de stills automaticamente por lote), não uma decisão manual repetida.

### 2.6 Proposta de app — upload → template por vertical → variações → escolha → editor

Fluxo descrito pelo founder, traduzido em arquitetura (ainda proposta, não construído):

```
1. UPLOAD                2. SELEÇÃO DE TEMPLATE       3. GERAÇÃO              4. ESCOLHA            5. REFINAMENTO
   (take/vídeo-fonte  →     por VERTICAL do cliente  →   automática de     →    usuário clica    →    abre o video-studio
    do cliente)             (ex.: "sorteios" só         N variações            na variação             (editor que já
                             mostra templates de          (copy × ângulo ×       que quiser              existe — Player,
                             sorteios, não mistura         hook_template,                                 timeline,
                             com outro nicho)              matriz completa                                inspector)
                                                            da seção 2.3-2.4)
```

**Seletor de template por vertical (passo 2):** hoje `videoTemplates.ts` já carrega `video-templates.yaml` **por cliente** (`oraclum`, `tiago-elesbao`, `virals`), não por vertical — é uma camada acima do que existe: agrupar clientes por vertical (`sorteios` = Império + Garantido) e o seletor filtrar o catálogo de templates/hooks por esse grupo, não pelo cliente individual. Implica uma pasta de templates COMPARTILHADA entre Império e Garantido (`squads/virals-marketing-squad/data/verticals/sorteios/hook-templates.yaml`) em vez de duplicar o mesmo catálogo em cada client folder — reaproveita entre os dois clientes do mesmo nicho, que é exatamente o caso de uso descrito.

**Armazenamento das variações geradas antes da escolha (passo 3→4):** cada variação gerada no lote (seção 2.4) é um arquivo de vídeo real + a receita YAML que a gerou, guardados juntos num diretório de "lote pendente de revisão" (ex.: `outputs/{cliente}/batches/{batch-id}/`) com um índice (JSON simples) listando cada variação + seu still de revisão (2.5) + status (pendente/aprovado/descartado). O "clicar na variação" (passo 4) é navegar esse índice — não precisa de banco de dados novo pra isso, é a mesma convenção de pasta que `outputs/garantido-premios/video-renders/` já usa hoje, só com um nível de agrupamento por lote.

**Abrir no video-studio (passo 5):** o `video-studio` já é um app Next.js com editor (`src/app/studio/page.tsx`, Player + timeline + inspector) — "abrir" a variação escolhida significa carregar a receita YAML daquela variação como estado inicial do editor, reaproveitando a infraestrutura de edição que já existe pro fluxo orgânico. Esse é o ponto de maior confiança da proposta: não é um editor novo, é o mesmo editor recebendo uma origem de dado nova (receita de Ads em vez de timeline orgânica).

### 2.7 Pré-processamento específico de sorteios (antes do fluxo principal)

Confirmado em `pipeline-producao.md` (já escrito nesta sessão, cobre os dois clientes): a etapa 1 do pipeline atual — **"Seleção de corte"** — já é tratada como um estágio formal e distinto, feito ANTES de qualquer spec de motion graphics. Para a Garantido: "3 takes já extraídos e validados frame-a-frame". Para o Império: "corte confirmado em ~4,667s do `IMG_7206.MOV`". Isso bate com a suspeita do founder: existe, sim, um estágio de pré-processamento específico do vertical de sorteios que precisa ficar formalizado como etapa reconhecida ANTES do fluxo upload→template→variações:

- **Conformação do vídeo-fonte** — o take bruto enviado pelo cliente (ex. `IMG_7206.MOV`) precisa ser cortado/normalizado (resolução, fps, ponto de corte confirmado) antes de entrar como insumo de qualquer template.
- **Validação frame-a-frame** — confirmar que o take não tem texto/legenda pré-existente cravado (achado real desta sessão: os 3 takes da Garantido precisaram ser conferidos um a um por isso antes de serem usados).
- Esse estágio é **específico do vertical** (sorteios usa filmagem real de entrega de prêmio como prova social — outros verticais do `video-studio`, como o dark-room do `oraclum`, partem de material gerado, não de take real de cliente) — não deve virar etapa genérica obrigatória pra todo cliente, só pra quem o pipeline de Ads realmente trabalha com filmagem real.

No fluxo proposto em 2.6, isso entraria como um **passo 0** antes do "Upload" — ou, mais precisamente, o próprio upload (passo 1) já dispararia essa validação automaticamente quando o cliente pertencer ao vertical "sorteios", antes de liberar o take pra seleção de template.

---

## 3. Build vs. comprar

| | Estender o que já existe (Remotion + `video-studio`) | Ferramenta de terceiro (Shotstack/Creatomate/JSON2Video) |
|---|---|---|
| Custo de render | Local: ~zero (já é o que rodamos hoje). Lambda (se escalar): ~$0,01-0,02/vídeo de 10-60s ([remotion.dev/docs/lambda/cost-example](https://www.remotion.dev/docs/lambda/cost-example)) | Shotstack ~$0,20-0,40/minuto renderizado; Creatomate ~$0,84/min (1080p, plano Essential); JSON2Video ~$0,25/min (plano Professional) — todas cobram por render, não há camada gratuita real em volume |
| Licença | Remotion é open-source, mas uso comercial por empresa com 4+ pessoas precisa de licença paga ($25/assento/mês + $0,01/render automatizado, mínimo $100/mês) — **aplicável aqui**, o squad já passa de 4 "usuários" entre agentes e founder | SaaS, preço já embute a licença |
| Motion graphics bespoke (mockup 3D, coroa/partículas) | **Já funciona** — é exatamente o que construímos nesta sessão em React/Remotion | Shotstack é renderização pura via JSON (sem componente custom); JSON2Video e Creatomate são schema-declarativo com layers básicas (texto/imagem/vídeo/forma) — nenhum dos três reproduz um componente React arbitrário como o `PhoneMockup.tsx` sem reescrever a lógica na linguagem de template deles, perdendo o que já foi validado e aprovado pelo founder |
| Curva de adoção | Zero — mesma stack, mesmos devs/agentes já operando | Precisa portar toda a lógica de motion graphics já construída pro schema de terceiro |

**Recomendação: estender o que existe.** O argumento decisivo não é custo (embora também favoreça Remotion no volume atual) — é que as peças que já geraram aprovação do founder (phone mockup 3D, transições customizadas, tipografia cinética) são código React real, e nenhuma ferramenta hospedada replica isso sem reescrever do zero. Trocar de ferramenta agora jogaria fora trabalho validado esta semana.

---

## 4. Primeiros passos se o founder decidir seguir agora

Menor passo concreto pra provar a arquitetura sem comprometer o pipeline atual:

1. Pegar **1 template já aprovado** (ex.: `GarantidoTake2Ad`) e extrair tudo que hoje é texto/cor cravado pra uma receita YAML (seção 2.2) — sem mudar o resultado visual, só a fonte do dado.
2. Extrair **1 dos 2 hook_templates de esforço baixo** da auditoria 1.4 (headline cinética, puxando a implementação já madura da própria Garantido; ou zoom-in de hook, unificando `CAMERAS.zoom-in` + `HookFx.snap-zoom`) como o 1º item do catálogo de `hook-templates.yaml` — não os 2 primitivos novos (split dinâmico, split-screen), que merecem um teste próprio depois de validada a arquitetura base.
3. Escrever uma matriz pequena: 3 copies (ângulos já escritos em `copy-angles-2026-10-09.md`) × 2 hook_templates (o extraído no passo 2 + `hard-cut` como controle) = 6 variações sobre o MESMO template/take.
4. Rodar via um `render-batch.mjs` mínimo (pode ser o script de hoje, só em loop) e gerar as 6 variações sem tocar em nenhum `.tsx`.
5. Still de cada uma, revisão humana (grade de contato, seção 2.5), e só então decidir se generaliza pros outros templates (Império + os outros 2 takes da Garantido) e se vale investir nos 2 primitivos novos (split dinâmico, split-screen).

Se essa matriz 3×2 funcionar sem reabrir código, a arquitetura está provada pros dois eixos (copy E hook) — o resto é repetir o padrão e, separadamente, decidir se os primitivos de maior esforço (seção 1.4) entram depois.
