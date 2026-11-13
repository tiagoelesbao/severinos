# Movie Builder — o método plano a plano

> **Fonte:** *You can now build entire movies shot by shot locally* (MickMumpitz),
> ~11 min, transcrita em 2026-09-11. Transcrição e telas em
> `docs/aulas/movie-builder/`.
>
> **Estudado junto:** os três JSONs — `MOVIE-BUILDER_1-0`, `MOVIE-BUILDER_1-1`
> (140 nós) e, o mais valioso, **`BUG-SKY_EXAMPLE-MOVIE_v01`** (418 nós, 9
> planos), que é o filme completo dele montado. Quase tudo o que está abaixo vem
> de ler esse arquivo, não a aula.

---

## 1 · A tese

> *"This is genuinely a new way of making movies because **nothing is baked in**.
> Let's say we want to switch out the protagonist for a different character. It's
> as easy as switching out the reference image and voice sample."*

Cada plano puxa de **um único grupo de referência**. Troca-se a foto e a amostra
de voz, não se toca em nenhum prompt, e o mesmo filme sai com outro ator. É isso
que transforma um workflow em **framework de produção** — e é exatamente o que
nos interessa: uma peça para a Império hoje, a mesma estrutura para outro cliente
amanhã.

---

## 2 · A anatomia

```
LOAD LTX MODELS  ·  LOAD FLUX MODELS      modelos
SETTINGS                                  resolução, passos, fps
LOAD PROTAGONIST IMAGES                   rosto + corpo → folha de referência
AUDIO REFERENCE 01 / 02                   4 s de voz por personagem
  ├─ SHOT 01 ─ IMAGE GEN → VIDEO GEN → ShotVideoOutput
  ├─ SHOT 02 ─ (+ ColorMatch referenciando o plano anterior)
  ├─ Asset Creator                        props, cenários, cartelas
  └─ SHOT 03…09
FINAL MOVIE OUTPUT                        ShotAssembler → SaveVideo
```

**Dois modelos, dois papéis.** Flux 2 Klein faz o **frame inicial** de cada plano
(é o mesmo motor do CCC — referência por `ReferenceLatent`, até 4 imagens). LTX
2.3 transforma esse frame em **vídeo com áudio e lip-sync**.

A escolha do LTX é declarada na aula: o Wan dá mais controle mas é lento; o LTX
2.3 fechou a distância de qualidade com as LoRAs da comunidade, é
arquiteturalmente mais rápido, **gera áudio** e tem a *LTX ID Lora*, que mantém a
voz consistente entre planos.

### Os números, tirados do filme de exemplo

| | valor |
|---|---|
| imagem | 1920×1080 (latente 1920×1088) · **4 passos** · CFG 1 · FluxGuidance 1 |
| vídeo | 1280×736 · **24 fps** · **81 frames** |
| **duração do plano** | **81 ÷ 24 = 3,4 s** |
| amostra de voz | `TrimAudioDuration [0, 4]` — **4 segundos** |
| sampler de vídeo | `euler_ancestral_cfg_pp` + `euler_cfg_pp`, CFG 1, 4 passos |

> **3,4 s por plano** é o número que mais muda o planejamento. Um comercial de
> 30 s são **9 ou 10 planos** — e o filme de exemplo tem exatamente 9. Quem
> escrever o roteiro precisa pensar em blocos dessa duração, não em cenas longas.

---

## 3 · A folha de referência

Entram **duas** imagens: um close de rosto e um corpo inteiro. O subgrafo
`REMOVE BG` faz o resto:

```
rosto ─► RMBG-1.4 ─► AutoCropFaces [2.8, shift 0.58] ─► 1024 ─┐
corpo ─► RMBG-1.4 ─────────────────────── 1024 ──────────────┴─► ImageConcanate("right") ─► 1 MP
```

Saem **três** referências reutilizáveis: `FACE`, `BODY` e a **combinada**.

> *"...both combined, **which is the one that usually works best for most
> shots**."*

**A dica que vale ouro e é fácil de perder:**

> *"One small tip for the full body reference, use a shot where your character is
> **turned slightly**. This helps the model to understand what your character
> looks like from the side and just improves consistency a lot."*

Ou seja: o corpo inteiro **não deve ser frontal chapado**. É a mesma dor do 45°
que medimos no CCC, e aqui ele resolve com uma escolha de foto.

---

## 4 · O plano — e os DOIS prompts

Todo plano tem **dois** `Text Prompt`, e confundi-los é o erro mais caro.

### 4.1 · Prompt de imagem (Flux 2 Klein) — longo e cinematográfico

A fórmula, lida dos 9 planos do exemplo:

```
[quem] + [o que faz] + [onde, com detalhe de cenário]
[luz — de preferência duas temperaturas de cor colidindo]
Shot on a 35mm lens, [enquadramento] from [ângulo].
Cinematic 2.39:1 anamorphic framing.
Style: grounded contemporary thriller realism, muted desaturated palette, subtle film grain
Mood: awestruck, terrifying
```

A linha **`Style:`** se repete **literalmente igual** em todos os planos. É a
âncora de consistência visual do filme inteiro — não é enfeite, é o que impede
cada plano de virar um filme diferente.

Exemplo real (SHOT 06):

> *"The person from the reference image stands in a suburban driveway at dawn,
> the open garage door behind him, face tilted up toward the sky, eyes wide in
> stunned disbelief. […] Pale evening light still clings to the horizon behind
> them, warm against the cold blue darkness night sky cast from high above — **two
> colliding color temperatures on their skin**. […] Shot on a 35mm lens, tight
> medium framing on the face, low angle looking slightly up. Cinematic 2.39:1
> anamorphic framing. Style: […] Mood: awestruck, terrifying."*

**Mantenha a descrição do personagem VAGA.** Dito na aula:

> *"I'm keeping their character description pretty vague **because I want to be
> able to easily switch out the protagonist later** without having to rewrite
> every single prompt."*

No exemplo ele escreve *"the person from the reference image"* — nunca um nome,
nunca um tipo físico. É isso que torna a troca de ator gratuita.

### 4.2 · Prompt de vídeo (LTX 2.3) — o formato de três campos

```
[VISUAL]: movimento de câmera + ação do personagem
[SPEECH]: "a fala literal, entre aspas"
[SOUNDS]: ambiência, efeitos — E A DIREÇÃO DE TOM
```

Exemplos do filme:

```
[VISUAL]: A cinematic handheld medium shot on the person as they speak,
          their hands moving expressively with each phrase.
[SPEECH]: "They're coming. And we are not ready."
[SOUNDS]: silence
```

```
[VISUAL]: A person speaking and slightly raising the blaster. A cinematic
          handheld shot slightly moving forward. She looks seriously at the end.
[SPEECH]: "Time to call the exterminator."
[SOUNDS]: She speaks in a badass and slow tone
```

> **Repare no último `[SOUNDS]`.** Ele não descreve som ambiente: descreve **como
> a frase deve ser dita**. Esse é o canal de direção de atuação — e é por ali que
> se resolve entonação, não trocando a amostra de voz. Ver §7.

Plano sem fala deixa `[SPEECH]` vazio e usa `[SOUNDS]` para ambiência
(*"Deep atmospheric rumble, crackling flames, distant screams"*).

### 4.3 · O que mais entra num plano

| nó | função |
|---|---|
| `ColorMatch ["mvgd", 0.5]` | casa a cor com o plano anterior. Existe a partir do SHOT 02 e pode ser bypassado |
| `Set_OUT_NN` | o frame inicial vira referência para planos seguintes — *"I reference not only my character reference, but also the previous shot because I basically just want to zoom in"* |
| `SaveImage("startimages/")` | o frame inicial é gravado à parte |
| `ShotVideoOutput [ordem, ativo]` | posição do plano na montagem |
| `easy cleanGpuUsed` | limpa VRAM entre imagem e vídeo |

**Rodar um plano só:** clicar no `SaveImage` (ou `SaveVideo`) daquele grupo e dar
play — o ComfyUI computa apenas os nós necessários. Não se roda o filme inteiro
para corrigir um plano.

---

## 5 · Asset Creator — props, cenários e cartelas

Grupo duplicável, colocado **acima do plano onde o objeto aparece primeiro**.
Gera sem referência ou a partir de um desenho.

Três usos no filme de exemplo, e são três receitas diferentes:

**Prop** — linguagem de foto de produto:

> *"A handcrafted jury-rigged futuristic laser blaster laid horizontally on a
> seamless pale grey studio backdrop, shot in profile from the side. […] Even,
> soft studio lighting from a large overhead softbox, no harsh shadows. Shot on
> an 85mm lens […] product photography clarity. **Use the drawing as rough
> layout.**"*

**Desenho → realidade** — ele fotografa/rabisca e manda o modelo converter:

> *"Remove everything except for the creature on the chalkboard. Turn the drawing
> on the green chalkboard into a realistic depiction of the creature in front of
> a dark neutral grey background."*

**Cartela de título** — tipografia também é gerada:

> *"A title card on a pure black background. The words 'BUG SKY' rendered in
> large, centered, all-caps typography — the letterforms sculpted from glistening
> chitinous insect shell […] **Use the surface of the alien concept for the
> letters.**"*

O asset vira um `SetNode` e é referenciado nos planos, igual ao personagem.

---

## 6 · Montagem

`ShotAssembler ["crop_to_largest", true, "nome-da-versao"]` recolhe a saída de
todos os `ShotVideoOutput` e monta na ordem definida ali. O booleano salva também
**cada plano separado numa pasta** — é o que se leva para o DaVinci. E o terceiro
campo versiona o corte.

---

## 7 · Voz — o ponto que mais confunde

**A amostra dá o TIMBRE. A direção vem do prompt.**

São 4 segundos (`TrimAudioDuration [0, 4]`), um `SetNode` por personagem, e um
`Enable Voice Reference` ligável por plano. O que sai da boca do personagem é o
`[SPEECH]`; **como** sai é o `[SOUNDS]`.

Consequência prática: **uma gravação de assunto pesado serve de referência para
uma peça alegre.** Não é preciso ter o ator gravando "em tom comercial" — é
preciso escrever a direção:

```
[SOUNDS]: He speaks warmly and with a smile in his voice, unhurried, like
          someone telling good news to a friend.
```

Ainda assim o trecho escolhido importa, e por três razões que **não** são
entonação: fala contínua do começo ao fim (começar em silêncio gasta 25% da
amostra), silêncio limpo entre as palavras (é ali que se mede o ruído de fundo) e
nível estável (trecho que decai ensina uma voz que perde força).

`apps/infra/prepara_voz_ref.py` mede essas três coisas numa gravação inteira e
recorta os melhores candidatos, cortando no início e no fim de palavra — nunca no
meio de sílaba.

---

## 8 · O que a versão paga acrescenta

**Geração de ambiente 360°.** Prompt ou imagem de referência → panorama costurado.

**Environment crop.** Recorta a região do panorama que fica atrás de cada
personagem e a carrega no plano junto com a referência do personagem:

> *"...and you've got a consistent **shot reverse shot**."*

Isso resolve o problema mais difícil de diálogo: manter o cenário coerente quando
a câmera vira. **Não temos essa etapa** — e é a candidata mais forte para
recriarmos, como fizemos com o upscale e o face detailer do CCC. Uma rota
possível: gerar o panorama com Flux 2 Klein por prompt, recortar por ângulo e
guardar em `SetNode` por posição de câmera.

---

## 9 · O que falta para peça publicitária

A aula constrói **trailer de ficção**. Comercial tem outras exigências, e estas
são as lacunas que a estrutura dele não cobre:

| lacuna | o que precisa |
|---|---|
| **Duração fechada** | trailer termina quando acaba. Comercial tem 15, 30 ou 60 s cravados. 9 planos × 3,4 s = 30,6 s — o encaixe é bom, mas tem de ser contado antes, não depois |
| **Hook nos 3 primeiros segundos** | o plano 01 do trailer é exposição. Em peça de rede social, plano 01 é retenção ou não existe peça |
| **Narração sobre takes** | o formato dele é personagem falando em quadro. Locução contínua por cima de planos mudos é outra montagem: a voz não nasce no LTX, vem de TTS e amarra a duração dos planos |
| **CTA e selo de marca** | a cartela de título dele é arte. Selo de cliente é arte **fiel** — mesma dor do logo, e a resposta é a mesma: camada de pós |
| **Trilha e sound design** | o LTX gera o áudio do plano. Cama musical contínua atravessando cortes é montagem, não geração |
| **Direção** | roteiro, lista de planos, decupagem. É onde os agentes especializados entram |

### Os três formatos que queremos cobrir

**a · Narrada pelo Bruno sobre takes.** A voz é uma locução contínua; os planos
são mudos. `[SPEECH]` fica vazio em todos, `[SOUNDS]` só descreve ambiência, e a
locução entra na montagem. **A duração de cada plano passa a ser ditada pela
locução** — o inverso do fluxo da aula.

**b · Diálogo entre personagens.** Dois `LOAD PROTAGONIST IMAGES` e dois
`AUDIO REFERENCE` já existem no arquivo dele. O que falta é o *shot reverse shot*
coerente — §8.

**c · Só takes, com trilha e sound design.** O mais simples no LTX (sem lip-sync)
e o mais dependente de montagem. Aqui o `[SOUNDS]` carrega tudo.

---

## 10 · Pendências

- **Recriar o ambiente 360° + crop** (§8) — é a etapa paga com maior retorno.
- **Montar o Movie Builder da Império** com `FACE` e `BODY` aprovados do CCC.
  Atenção ao corpo inteiro: a dica da §3 pede **levemente virado**, e o nosso
  `00007` é frontal chapado — o `00012` (perfil andando) ou um 3/4 servem melhor.
- **Medir a duração real** de um plano no nosso hardware antes de fechar roteiro.
- **Escrever o gerador de lista de planos** que traduza roteiro → 9-10 blocos de
  3,4 s com os dois prompts de cada um já no formato certo.
