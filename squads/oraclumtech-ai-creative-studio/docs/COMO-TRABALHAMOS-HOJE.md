# Como trabalhamos hoje

> **Documento de situação real.** Descreve a cadeia de produção que de fato roda em
> 2026-08-29, com o stack local em ComfyUI na máquina do founder ao lado das rotas de
> nuvem que o squad já usava.
>
> Autor: reconciliação de 2026-08-29 · Status: vivo, revisar a cada mudança de stack
>
> **Para quem chega novo no squad, leia este primeiro.** O `_BLUEPRINT.md` explica por que
> o squad existe e como ele é desenhado; este arquivo explica o que acontece na prática
> quando um job entra.

---

## 0. O que este documento é, e o que ele não é

**É:** a foto de como o trabalho acontece hoje — quais ferramentas são operadas, em que
ordem, por quem, e qual o critério para escolher entre elas.

**Não é:**
- Não é o inventário. O que está instalado, com qual licença e em quantos GB, está em
  `data/local-generation-stack.yaml`.
- Não é a matriz de recomendação. Qual rota usar para cada tipo de asset está em
  `data/model-routing.yaml`.
- Não é o plano de testes. O que falta provar está em `docs/PLANO-DE-VALIDACAO.md`.
- **Não é uma promessa.** Boa parte do que está aqui é capacidade *instalada*, não
  capacidade *provada*. A §7 separa uma coisa da outra sem eufemismo.

**Em conflito:** o inventário vence sobre o que está instalado; o `model-routing` vence
sobre qual rota usar; o `_CONVENTIONS.md` vence sobre nomenclatura. Este documento vence
sobre **como o trabalho é sequenciado no dia a dia**.

---

## 1. A regra que não mudou, e que explica todo o resto

> **O squad NÃO gera a imagem, o vídeo nem a voz. O squad DIRIGE a geração.**
> — `_BLUEPRINT.md` §3.1, decisão do founder

O stack local **não mexe nisso**. Ele muda qual ferramenta o humano opera, e nada mais.
Antes o operador abria o Krea numa aba do navegador; agora ele pode abrir o ComfyUI na
própria máquina. Nos dois casos, quem monta o grafo, escolhe a seed, olha o resultado,
descarta e decide o retake é **pessoa**.

O que isso implica na prática:

| | |
|---|---|
| `stills` (imagem) | `executor: human`, sempre. Sem variante worker ou agent. |
| `takes` (vídeo) | `executor: human`, sempre. Sem variante worker ou agent. |
| geração de voz dentro de `audio` | `executor: human`, sempre. |
| avaliar o que voltou e dirigir o retake | `executor: agent` — essa parte é do agente. |

**O ComfyUI não é um worker deste squad e não entra no `worker_registry` do
`@exec-producer`.** Se alguém propuser "automatizar o s12 agora que o Wan roda local", a
resposta é não, e o motivo está escrito aqui e no `squad.yaml → golden_rule`.

O entregável dos agentes de execução continua sendo o **Pacote de Direção**
(`asset_direction`, `_BLUEPRINT.md` §3.2) — só que agora o campo
`ferramenta_recomendada` admite `ComfyUI local · {workflow}` como valor.

---

## 2. A cadeia de produção real, por tipo de asset

### 2.1 Visão geral

```
BRIEF → CONCEITO → ROTEIRO → DECUPAGEM → LOOK/DESIGN
                                              │
        ┌─────────────────────────────────────┼──────────────────────────────┐
        │                                     │                              │
   NARRAÇÃO                              IMAGEM (still)                  TRILHA/SFX
   ChatterBox 23L local                  FLUX.2 klein local              ACE-Step /
   → narracao.flac                       ou Krea/Leonardo/Gemini web     Stable Audio
   → Adjusted_SRT ────┐                        │                         local (papel)
                      │                        │ ⏸ humano aprova o quadro  │
                      │                        ▼                          │
                      │                   VÍDEO (take)                     │
                      │                   Wan 2.2 I2V max local            │
                      │                   ou Hailuo/Kling/Veo web          │
                      │                   ou procedural (ffmpeg)           │
                      │                        │                           │
                      └────────────┬───────────┴───────────────────────────┘
                                   ▼
                        MONTAGEM — apps/video-studio (Remotion)
                                   ▼
                        After Effects (motion/composição)
                                   ▼
                        Premiere Pro (corte final, mix, master, export)
```

O `Adjusted_SRT` é a peça que amarra tudo: ele entrega o timing **real** da narração, o
que permite a timeline chegar ao `@editor` já pré-montada, com legenda sincronizada e
slots vazios esperando os takes.

### 2.2 Imagem

| | |
|---|---|
| **Rota local** | FLUX.2 [klein] 4B, GGUF Q8_0 · `assets/comfyui/workflows/flux2-klein-t2i.json` |
| **Licença** | Apache 2.0 — comercial liberado, sem asterisco |
| **Config** | 4 steps, cfg 1.0, euler, sigmas via `Flux2Scheduler`, 1024×1024 |
| **Rota de nuvem** | Krea, Leonardo, Gemini web, ChatGPT (todas continuam válidas) |
| **Estado** | `instalado` — grafo conferido contra o `/object_info` real, **nenhum pixel gerado** |
| **Dono** | `@image-lead` (dirige) · operador humano (gera) |

**Local quando:** lote de stills com look já travado · peça de canal monetizado · o still
é insumo interno (o frame que vira `{{IMAGEM_DE_ENTRADA}}` do Wan) · thumb de canal em
cadência.

**Nuvem quando:** exploração de look (uma volta por vez em fila é o pior jeito possível de
descobrir a estética de uma peça) · quando há **imagem de referência** para anexar ·
quando o look aprovado pelo founder ainda vive no Krea · urgência.

**Três armadilhas que custam o render inteiro:**
1. `width`/`height` do `Flux2Scheduler` **devem** bater com os do `EmptyFlux2LatentImage`.
   É o scheduler que calcula as sigmas em função da resolução.
2. `cfg` fica em 1.0. Subir liga o negativo, dobra o tempo por step e queima a imagem.
3. Não use o nó `FluxGuidance` — o klein-4B tem `guidance_embeds: false`.

**Armadilha de licença (a mais cara):** existe FLUX.2 [klein] **9B**, ele é melhor, e é a
primeira coisa que aparece procurando GGUF de klein. É **NON-COMMERCIAL**. Mesma cilada do
`flux1-dev` e do `flux1-krea-dev`. Canal monetizado torna licença critério técnico.

### 2.3 Vídeo

| | |
|---|---|
| **Rota local** | Wan 2.2 I2V A14B, GGUF Q4_K_M, dual-stage |
| **Estado** | ✅ **VALIDADO** — lote "vovós", 6 takes renderizados e aproveitados |
| **Padrão** | `wan22-i2v-max.json` — 20 steps, cfg 4, split 0-6/6-20, **sem LoRA** |
| **Previz** | `wan22-i2v-fast.json` — 4 steps, cfg 1, com LoRAs lightx2v |
| **Rota de nuvem** | Hailuo, Kling, Veo via Gemini (web) |
| **Rota procedural** | `adapters/video/procedural.js` — Ken Burns / parallax 2.5D via ffmpeg |
| **Dono** | `@motion-lead` (dirige) · operador humano (gera) |

Esta é a **única rota local com status `validado`** no squad inteiro. Por isso ela é o
padrão de entrega de take hoje.

**Os dois workflows não são "rápido" e "lento" — são coisas diferentes.** O `fast` existe
para decidir *se* o take funciona (composição, enquadramento, se o movimento pega) antes de
gastar 5x o tempo no render de verdade. É triagem. **Nunca se entrega a partir dele.**

**Decisão travada:** as LoRAs de destilação lightx2v foram testadas e **removidas** do
fluxo principal — derrubavam a qualidade do output. Não é pendência, é decisão validada em
produção. O fluxo de entrega roda sem LoRA.

**Parâmetros:** 960×720 · 16 fps base · 32 fps final (RIFE 2x) · `length` precisa ser
**4n+1** (25, 33, 37, 49, 65) · acabamento com `4x-UltraSharp`.

**O VAE é o 2.1, não o 2.2.** O `wan2.2_vae` é do modelo TI2V 5B, não do A14B. Trocar
quebra. Não é descuido do inventário.

**A rota procedural não é degradação.** Para plano contemplativo, cartela e b-roll de
apoio, movimento de câmera sobre still é o *código correto do formato* — determinístico,
ilimitado, custo zero, e não gasta noite de máquina. Se o sujeito não precisa se mexer,
procedural entrega melhor que qualquer I2V, local ou não.

### 2.4 Narração

| | |
|---|---|
| **Rota local** | ChatterBox Official 23-Lang v3 (TTS-Audio-Suite) · `tts-narracao-srt.json` |
| **Licença** | MIT |
| **Estado** | ✅ engine **validado** (WER 0,0% medido) · roteiro longo ainda não medido |
| **Alternativa** | F5-TTS PT-BR — ~9x mais rápida, exige referência em português |
| **Rota de nuvem / humana** | gravação humana real, quando a voz precisa ser de alguém |
| **Dono** | `@sound-designer` (dirige) · operador humano (gera) |

**A voz canônica do canal é a voz EMBUTIDA da ChatterBox, sem clonagem** (decisão do
founder, 2026-08-29). Amostra: `assets/comfyui/samples/04-chatterbox23L-pt-voz-embutida.mp3`.
Para ativar: `narrator_voice = none` e não conectar `opt_narrator`.

Por que essa e não outra: WER 0,0% (falou exatamente o que estava escrito, que é a métrica
que decide quando o roteiro é o produto) · sem titular de voz a autorizar · reprodutível
episódio após episódio sem depender de um `.wav` sobreviver a um backup · licença MIT.

Isso não é detalhe técnico: o `craft-references.yaml` já dizia que **a voz é o ativo do
canal** — trocar de locutor entre episódios reseta o reconhecimento acumulado. Uma voz
determinística é o que garante isso ao longo de meses.

**Clonagem só entra quando o job PEDIR** uma voz específica (cliente com locutor próprio,
personagem), e aí passa pelo `@fact-checker` em `*rights` **antes** de gerar.

**O recurso que decide tudo é o `Adjusted_SRT`** — o timing real do que foi falado, não o
estimado que você escreveu. Sem ele, alguém sincroniza legenda na mão, todo dia.

**O SRT de entrada é uma partitura de prosódia.** A maioria alimenta TTS com texto corrido;
nós alimentamos com SRT, e isso dá alavancas que texto corrido não tem: o intervalo entre
cues é a duração da pausa, a razão duração/palavras é a velocidade do trecho, a fronteira
do cue é o ponto de respiração, e a tag `[exag:0.8]` é a intensidade emocional daquele
trecho. Ver `data/oratoria-e-prosodia.yaml`.

**`stretch_to_fit` é proibido em narração longa.** Medido: o WER da mesma frase sobe de
0,0% para 15,8%. E pior — justamente nesse modo o `Adjusted_SRT` reporta a duração
*pré*-esticamento, então o pipeline consome timing errado. O padrão é `smart_natural`.

**Não alterne engine dentro de um lote.** Trocar ChatterBox → F5 na mesma sessão quebra a
F5 e ela reporta `status=success` gravando ~1 segundo de áudio morto. Quem só olha o status
acha que deu certo.

### 2.5 Trilha, SFX e foley

| Uso | Modelo | Workflow | Estado |
|---|---|---|---|
| **Produto** — a faixa é o ativo vendido | ACE-Step v1 3.5B (Apache 2.0) | `audio-musica-acestep.json` | workflow escrito, peso não confirmado |
| **Apoio** — trilha sob a peça | Stable Audio Open 1.0 | `audio-trilha-sfx.json` | workflow escrito, peso não confirmado |
| **SFX avulso** | Stable Audio Open 1.0 | `audio-trilha-sfx.json` | idem |
| **Foley sincronizado ao take** | HunyuanVideo-Foley (Tencent) | — | **não instalado** |
| **Rota atual de verdade** | biblioteca licenciada | — | é o que roda hoje |

**Correção de prioridade que vale registrar:** o inventário classificava trilha como
prioridade 4, última. Estava errado, e a correção veio do founder — o Teste A (Airbnb)
acontece antes do teste de música e **precisa de trilha para existir**. Peça publicitária
sem trilha não é peça, é sequência de takes.

**O método que muda a economia:** montar um **banco próprio de SFX** reutilizável, em vez
de gerar por take. Mais barato e, o que importa mais, mais consistente entre episódios. Um
canal em cadência que troca o whoosh toda semana soa como três canais diferentes.

**O que a geração local resolve de direitos, e o que não resolve.** Resolve: a titularidade
que vinha dos *termos de uso* de uma plataforma desaparece — sob Apache 2.0 não há
plataforma entre o founder e o arquivo. **Não** resolve: proteção contestada de obra
puramente gerada, reivindicação de Content ID por semelhança, e política própria de
distribuidora sobre IA. Ou seja: "gerado local, logo uma das quatro ressalvas caiu" — e as
outras três vão para o `@fact-checker`.

### 2.6 Finalização — inalterada

`apps/video-studio` (Remotion: timeline auto-montada, autolegenda, FX on-brand) →
**After Effects** (motion, composição, VFX, lower-third) → **Premiere Pro** (corte final,
mix, master, export por canal).

**O ComfyUI não é elo de finalização.** É fornecedor de plano. `export_to_davinci.py`
continua legado. Motion graphics, lower-third, número animado e legenda **nunca** são
gerados — são composição, e isso vale igual para modelo local.

O que muda para o `@editor` é o **material** que chega, não a cadeia:

| O que muda | Consequência no corte |
|---|---|
| Take local sai a 32 fps, 960×720 | Normalizar na entrada. Misturar 30 e 32 fps produz micro-stutter que ninguém sabe nomear e todo mundo sente. |
| `length` em degraus de 4n+1 | Retake por duração pede o **degrau seguinte**, não "meio segundo a mais" — meio segundo não existe nesse motor. |
| Sem marca d'água | O item some do checklist para planos locais. Continua valendo para todo plano de nuvem. |
| Já vem com UltraSharp aplicado | Não reaplicar upscale na montagem — halo de borda aparece no corte, não no plano parado. |
| Render é noturno | Devolução de retake vai em **lista fechada**, nunca pingada. Pedido a conta-gotas custa uma noite por item. |

---

## 3. Local × nuvem — o critério

Não existe rota "melhor". Existe rota certa para o momento do job. **As duas continuam
vivas**, e a de nuvem não é fallback: em exploração criativa ela é a primeira escolha, e
isso não é provisório.

**Pergunte nesta ordem:**

1. **O canal é monetizado ou a peça é de cliente?**
   Então licença vira critério técnico e pesa mais que qualidade. Isso empurra para o
   local — mas só para os modelos de licença limpa do inventário. Não empurra para
   "qualquer modelo local": o klein 9B e o flux1-dev são locais e são não-comerciais.

2. **É exploração criativa ou execução de um look já aprovado?**
   Exploração → **nuvem**. Execução → **local**.

3. **Cabe na máquina?**
   Olhe o tamanho do **text encoder**, não o do UNet. Se não cabe, é nuvem, sem discussão —
   não existe workaround de RAM.

4. **Precisa hoje, com a máquina em uso?**
   Então é **nuvem**. O modo padrão do local é render noturno.

5. **Há disco livre para o modelo E para a saída?**
   Se não, é nuvem — ou limpe disco antes.

**O que o local ganha:** licença verificável arquivo por arquivo · custo marginal zero por
geração · sem marca d'água e sem teto de resolução de plano gratuito · reprodutibilidade
real (mesmo grafo, mesma seed, mesmo resultado daqui a seis meses) · nada do material do
cliente sai da máquina, que é argumento comercial e não só técnico.

**O que a nuvem ganha:** iteração — ver, descartar e refinar em minutos, que é onde a
geração de imagem de fato acontece · imagem de referência com upload direto, que é a rota
nº 1 de consistência hoje · qualidade já aprovada pelo founder no look do Krea · zero
setup, zero disco, zero noite · capacidades que o local ainda não tem (lip-sync, foley,
upscale generativo com contexto).

**Regra de transição — não migrar às cegas.** O founder já aprova o look do Krea. Antes de
migrar um tipo de asset de nuvem para local, o job roda **os dois em paralelo** por um lote
e a comparação é registrada no `_retorno.json`. Migrar sem comparar troca uma estética
aprovada por uma desconhecida, e o cliente percebe antes de nós.

---

## 4. O hardware, e o que ele impõe

| | |
|---|---|
| GPU | NVIDIA RTX 4060 Ti — **8 GB de VRAM** |
| RAM | **16 GB** |
| Disco livre | ~31 GB (medido em 2026-08-28) |
| ComfyUI | portable 0.33.1, `http://127.0.0.1:8188` |
| torch | 2.13.0+cu126 |

### 4.1 A regra que manda: qualidade máxima, aceitando lentidão

A leitura antiga — "8 GB é o teto que decide tudo" — estava mal calibrada. Com offload e
render noturno, o setup engole modelo pesado: o Wan A14B em dois estágios, 20 steps, com
RIFE e upscale 4x, é a prova. **Quantização alta vence quantização baixa mesmo custando
horas.** O gargalo é a noite, e a noite é longa. Decisão explícita do founder: tolerância a
lentidão é **alta**.

### 4.2 O limite que de fato morde: RAM, não VRAM

Descoberto ao instalar o FLUX.2 klein. O **text encoder roda na CPU** antes de subir para a
placa, e o pico é no *encode*. O encoder bf16 do klein sozinho tem **7,49 GiB** numa máquina
de 16 GB. Quantizar o UNet resolve VRAM e **não resolve isto**.

> **Regra de triagem:** ao avaliar modelo novo, olhe o tamanho do **encoder** antes do
> tamanho do UNet. É o número que decide se cabe.

### 4.3 Disco é o recurso mais apertado — e o mais mal medido

**Conte o tamanho dos arquivos, nunca o delta do espaço livre.** Durante uma única
instalação o livre caiu 18 GB enquanto o stack instalado pesava 11,81 GiB — o resto era
sessão concorrente e pagefile. Quem orça pelo delta orça errado.

Armadilha específica: download do HuggingFace pode deixar **cópia duplicada** em
`~/.cache/huggingface`. Já custou 1,3 GB de sombra numa instalação.

Limiares que valem para o **estúdio**, não para o job:
- **< 15 GB livres** → alerta ao founder antes de qualquer download novo.
- **< 8 GB livres** → bloqueio de download de modelo em *qualquer* job. Render que só
  escreve saída pode continuar; instalação, não.

### 4.4 Render noturno não é preferência, é requisito

O modo de operação padrão é: máquina livre, nenhuma tela aberta, sem uso concorrente. Não é
capricho — com sessão aberta o encoder do FLUX não cabe, e o que for medido ali é medido
errado.

Consequências operacionais:
- **Uma instância só de ComfyUI.** A segunda trava na porta 8188 e morre; você fica falando
  com a instância velha, que pode nem ter os custom nodes recém-instalados.
- **Duas peças não dividem a mesma noite.** A fila noturna é recurso compartilhado *entre
  jobs*, e por isso vive em `_state/fila-render.yaml`, não no orçamento de nenhum deles.
- **Retake pedido às 15h não volta às 16h** — volta no dia seguinte.

### 4.5 O `cu126` e o aviso de boot

O ComfyUI avisa: *"You need pytorch with cu130 or higher to use optimized CUDA
operations"*. O torch aqui é 2.13.0+cu126, então esse caminho otimizado está desligado —
para todo modelo, não só os novos. **Não é defeito e não deve ser mexido por conta
própria:** subir para cu130 arrasta o ambiente inteiro (numpy, TTS-Audio-Suite) e é decisão
do founder, não efeito colateral de instalação.

### 4.6 O orçamento mudou de moeda

O recurso escasso deste estúdio **não é crédito de API**. É **disco e noite de máquina**.
Crédito continua existindo — a rota de nuvem não foi desligada — mas virou a moeda
secundária.

O `*budget` do `@exec-producer` conta **três moedas em paralelo**, e o job estoura se
qualquer uma estourar:

| Moeda | O que ela mede |
|---|---|
| **GB de disco** | pesos baixados para o job + saída acumulada |
| **Noites de máquina** | lotes de render enfileirados × noites ocupadas |
| **Crédito de nuvem** | só dos estágios que rodaram por rota de nuvem |

Não há taxa de câmbio entre elas. E existe um estado novo, invisível para quem só olha
número de geração: **"dentro do orçamento e três noites atrasado"** — que na rota local é o
estado mais comum.

Quando o teto estourado é de **noites**, existe uma saída que não existia antes: cair para
rota de nuvem naquele estágio, com crédito autorizado. É a única forma de comprar
velocidade neste estúdio.

---

## 5. As decisões travadas

Cinco decisões que já foram tomadas e **não se reabrem sem o founder**. Elas estão aqui
porque cada uma já foi reaberta por engano pelo menos uma vez, ou tem alta chance de ser.

### 5.1 A voz canônica do canal
ChatterBox 23L com a **voz embutida**, sem clonagem. Episódio de P5 dark-room e de P7
novela-recap usa essa voz por padrão. Clonagem só quando o job pedir voz específica, e com
parecer do `@fact-checker` antes.
→ `docs/NARRACAO-LOCAL.md` §2.5

### 5.2 `wan22-i2v-max` é o padrão; `fast` é só previz
20 steps, cfg 4, **sem LoRA**. As LoRAs lightx2v foram testadas e removidas porque
derrubavam a qualidade. O `fast` existe para triagem e **nunca** entrega.
→ `data/local-generation-stack.yaml` → `instalado.video_i2v`

### 5.3 Licença é critério técnico, não preferência
O canal é monetizado. Modelo não-comercial não entra, por melhor que seja — e os melhores
costumam ser justamente os não-comerciais. Já recusados por isso: `flux1-dev`,
`flux1-krea-dev`, `flux2-klein-9B`, `flux-kontext-dev`, `echo-tts`, `fish-audio-s2-pro`,
`xtts-coqui`.

### 5.4 Otimizar por qualidade máxima, aceitando lentidão
Quantização alta vence quantização baixa mesmo custando horas. Foi por isso que o klein
entrou em Q8_0 (4,00 GiB) e não em Q4_K_M (2,43 GiB), que existe e cabe melhor.

### 5.5 A geração é humana
`_BLUEPRINT.md` §3.1. Já dito na §1 deste documento, e repetido aqui porque é a que mais se
perde quando alguém descobre que existe uma API REST no `127.0.0.1:8188`.

---

## 6. Um job atravessando isso na prática

Exemplo: um episódio de canal dark (P5).

**Durante o dia — trabalho de agente e de mesa**
1. `@research-scout` levanta a pauta; `@head-of-copy` escreve o roteiro.
2. `@head-of-copy` e `@sound-designer` escrevem o **SRT dirigido** — com as pausas, os
   pontos de respiração e as tags de intensidade já embutidos. Não é só timing.
3. `@image-lead` escreve o Pacote de Direção dos stills; `@motion-lead`, o dos takes.
4. `@exec-producer` emite os cards humanos, verifica disco e RAM livres, e **enfileira os
   lotes na noite** em `_state/fila-render.yaml`.

**À noite — máquina livre**
5. Operador roda o TTS. Sai `narracao.flac` + `narracao-adjusted.txt`.
6. Operador roda os stills no `flux2-klein-t2i`. Se o take for arriscado, roda antes o
   `wan22-i2v-fast` como previz.
7. Operador roda os takes no `wan22-i2v-max`.

**No dia seguinte**
8. `@image-lead` e `@motion-lead` avaliam o que voltou (`*drift-check`, `*consistency`,
   `*retake`). Retake vai em **lista fechada**, porque cada rodada custa a noite seguinte.
9. `@editor` monta: o `Adjusted_SRT` já entrega legenda sincronizada; os slots recebem os
   takes. Depois AE, depois Premiere.
10. `@fact-checker` e `@qa-critic` fecham. `@exec-producer` entrega e registra o consumo nas
    três moedas.

**A regra de ritmo:** em canal com cadência diária, produção é **em lote**. Uma sessão no
fim de semana cobre a semana. Orçar episódio a episódio num gênero diário é o erro que faz
a operação parecer inviável quando ela não é.

---

## 7. Estado honesto — instalado × validado

**`validado` significa uma coisa só:** rodou na máquina do founder E produziu asset
aproveitado em **job real**. Até lá é hipótese informada, por melhor que seja a conferência.

| Camada | Estado | O que falta |
|---|---|---|
| Wan 2.2 I2V max | ✅ **validado** | — (evidência: lote "vovós", 6 takes) |
| RIFE + 4x-UltraSharp | ✅ validado | — |
| ChatterBox 23L (engine + voz canônica) | ✅ validado no teste | roteiro de 7 min inteiro nunca foi gerado |
| F5-TTS PT-BR | ✅ validado no teste | — (é alternativa, não padrão) |
| FLUX.2 klein 4B | ⚠️ **instalado** | **nenhum pixel gerado** — o grafo foi conferido, não executado |
| ACE-Step / Stable Audio Open | ⚠️ workflow escrito | peso não confirmado no inventário; nenhuma faixa saiu |
| Foley (HunyuanVideo-Foley) | ❌ não instalado | lacuna de prioridade 3 |
| Lip-sync (InfiniteTalk) | ❌ não instalado | lacuna 2d |
| Consistência de personagem (LoRA / Qwen-Image-Edit / PuLID) | ❌ não validado | lacuna 2b — **a mais crítica para gênero diário** |
| Substituição de movimento (Wan-Animate / VACE) | ❌ não instalado | lacuna 2c — é também uma oferta comercial não explorada |
| Os 17 agentes | ❌ **nunca exercitados em job real** | — |
| Os 6 workflows de pipeline | ❌ nunca rodados ponta a ponta | — |
| Templates e gates | ❌ nunca preenchidos com job de verdade | — |

**A consequência operacional disso é dura e vale escrever:** enquanto um item estiver
`instalado` e não `validado`, **todo Pacote de Direção que recomendar a rota local declara a
rota de nuvem no campo `se_falhar`**. Sem exceção.

**E o buraco maior não é técnico.** É que a inteligência do squad nunca foi usada: os
agentes, o Pacote de Direção, os gates e o card de tarefa humana existem em disco e nada
passou por um job. Os testes de `docs/PLANO-DE-VALIDACAO.md` existem para isso.

---

## 8. O que ainda não sabemos

- **Quanto custa um roteiro de 7 minutos em TTS.** Os testes foram com 3 cues (11 s).
  Extrapolando, algo na casa de 30–40 min de GPU. É render noturno, cabe no modo de
  operação — mas **precisa ser medido antes de virar promessa de prazo**.
- **Se o look do FLUX.2 klein sustenta uma peça.** Nenhuma imagem saiu. E mesmo quando
  sair, a comparação com o Krea precisa ser feita em paralelo, não por substituição.
- **Se a consistência de personagem fecha local.** Sem isso, gênero de elenco fixo (P7) não
  se sustenta. O lote das "Donas" já falhou por isso uma vez.
- **Se o par TTS + lip-sync funciona.** O `Adjusted_SRT` é a ponte prevista; nunca rodaram
  juntos.
- **Quanto tempo real leva um episódio ponta a ponta.** É o número que falta para o
  `@exec-producer` orçar de verdade em vez de estimar.

---

## 9. Onde cada coisa está escrita

| Preciso saber… | Arquivo |
|---|---|
| O que está instalado, licença, tamanho, onde mora | `data/local-generation-stack.yaml` |
| Qual rota usar para cada tipo de asset (local **e** nuvem) | `data/model-routing.yaml` |
| O critério de decisão local × nuvem | `data/model-routing.yaml` → `criterio_local_vs_nuvem` |
| Tudo sobre narração: engines, veredito medido, timing, armadilhas | `docs/NARRACAO-LOCAL.md` |
| Como dirigir a prosódia pelo SRT | `data/oratoria-e-prosodia.yaml` |
| O que falta provar, e em que ordem | `docs/PLANO-DE-VALIDACAO.md` |
| Os gêneros e qual pipeline cada um ativa | `data/genre-catalog.yaml` |
| Estágios, elenco, gates e executor por pipeline | `data/pipeline-profiles.yaml` |
| O passo-a-passo operacional de cada pipeline | `docs/PIPELINES.md` |
| As regras do squad e a regra de ouro | `_BLUEPRINT.md`, `_CONVENTIONS.md` |
| De onde veio cada técnica (procedência) | `docs/APRENDIZADOS-CURSOS.md` |
| Nichos dark: o que é aproveitável e o que foi **recusado** | `data/lives-niches-playbook.yaml` |
| Ofício de campanha, movimento de câmera, arquitetura de prompt | `data/brand-film-playbook.yaml`, `data/camera-moves.yaml`, `data/prompt-architectures.yaml` |
| Os grafos que o operador carrega | `assets/comfyui/workflows/*.json` |

---

## 10. Manutenção deste documento

**Quem atualiza:** quem mexer no stack. Não há dono único — há gatilho.

**Gatilhos de atualização:**
- Item do inventário sair de `instalado` para `validado` (ou o contrário)
- Modelo novo entrar ou sair da máquina
- Mudança de hardware, de versão do ComfyUI ou do torch
- Decisão do founder que trave uma escolha (essas vão para a §5)
- Qualquer teste do `PLANO-DE-VALIDACAO` ser executado

**O que nunca se apaga daqui:** a lista de decisões travadas (§5) e a coluna de estado
honesto (§7). São as duas seções que impedem o squad de reabrir uma decisão já tomada e de
prometer capacidade que ainda não existe.
