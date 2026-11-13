# Narração local — TTS na máquina do founder

> **Status:** validado em 2026-08-28 na workstation do founder (RTX 4060 Ti 8 GB,
> ComfyUI 0.33.1, TTS-Audio-Suite 5.8.7). Os dois engines rodaram de verdade e as
> amostras estão em `assets/comfyui/samples/`.
>
> Este documento fecha a lacuna de prioridade 1 do `data/local-generation-stack.yaml`.
> Ele destrava o **P5 dark-room** e o **P7 novela-recap** inteiros.

---

## 1. O que este workflow resolve

O pipeline de novela é: roteiro de ~7 minutos → SRT de entrada → TTS → áudio **+
`Adjusted_SRT`** → pré-composição já montada, com legenda sincronizada e slots
esperando os takes.

A peça crítica não é o áudio. É o **`Adjusted_SRT`**: o timing REAL do que foi
falado, não o estimado que você escreveu no roteiro. Sem ele, alguém sincroniza
legenda na mão, todo dia, por episódio. Com ele, a timeline sai montada.

**Workflow:** `assets/comfyui/workflows/tts-narracao-srt.json`

```
{{ROTEIRO_SRT}} ──┐
                  ├─→ 📺 TTS SRT ─┬─→ narracao.flac          (master de áudio)
ENGINE A ou B ────┤               ├─→ narracao-adjusted.txt  (Adjusted_SRT)
                  │               ├─→ timing_report
{{VOZ_REFERENCIA}}┘               └─→ generation_info
```

Placeholders: `{{ROTEIRO_SRT}}`, `{{VOZ_REFERENCIA}}`, `{{TEXTO_DA_REFERENCIA}}`, `{{JOB}}`.
As saídas caem em `ComfyUI/output/{{JOB}}/` e o operador move para `{job}/13-audio/entregues/`.

---

## 2. O que está instalado

Nada precisou de `pip`. A suíte já estava instalada; os pesos baixam sob demanda
no primeiro uso. **`numpy 2.2.6` e `torch 2.13.0+cu126` continuam intactos** —
conferidos antes e depois.

### ENGINE A — ChatterBox Official 23-Lang (PADRÃO)

Nó: `⚙️ ChatterBox Official 23-Lang Engine` · `model_version=v3` · `language=Portuguese`

| Arquivo | Pasta | Tamanho |
|---|---|---|
| `t3_mtl23ls_v3.safetensors` | `models/TTS/chatterbox_official_23lang/Official 23-Lang/` | 2,14 GB |
| `s3gen.safetensors` | idem | 1,06 GB |
| `ve.safetensors` | idem | 5,7 MB |
| `Cangjie5_TC.json` | idem | 1,9 MB |
| `mtl_tokenizer.json` + `grapheme_mtl_merged_expanded_v1.json` | idem | 138 KB |
| `conds.pt` | idem | 107 KB — **é a voz embutida**, ver §5 |
| **Total** | | **3,0 GB** |

Licença **MIT**. É o único critério que não é negociável aqui: o canal é
monetizado, então licença é requisito técnico, não preferência.

### ENGINE B — F5-TTS PT-BR (alternativa)

Nó: `⚙️ F5 TTS Engine` · `language=F5-PT-BR` (repo `firstpixel/F5-TTS-pt-br`)

| Arquivo | Pasta | Tamanho |
|---|---|---|
| `model_last.safetensors` | `models/TTS/F5-TTS/F5-PT-BR/pt-br/` | 1,35 GB |
| vocoder `vocos/pytorch_model.bin` | `models/TTS/F5-TTS/vocos/` | 54 MB |
| **Total** | | **1,4 GB** |

> **Cuidado com disco:** o download deixa uma **cópia duplicada** de 1,3 GB em
> `~/.cache/huggingface/hub/models--firstpixel--F5-TTS-pt-br`. O arquivo em
> `models/TTS/` é real (não é symlink), então a cópia do cache pode ser apagada.
> Já foi apagada nesta instalação e o modelo continua carregando.

**Custo total permanente em disco: 4,4 GB.**

---

## 2.5 VOZ CANÔNICA DO CANAL — decisão do founder (2026-08-29)

> **A narração padrão é a ChatterBox 23L com a VOZ EMBUTIDA, sem clonagem.**
> Amostra escolhida: `04-chatterbox23L-pt-voz-embutida.mp3`
> (= `ComfyUI/output/tts-samples/cb23L-vozPadrao_00001.mp3`, MD5 `087a3b03…`)

O founder ouviu as cinco amostras utilizáveis e escolheu esta. A escolha é a de menor
risco e maior reprodutibilidade das cinco, e vale registrar por quê:

| Critério | Por que esta voz ganha |
|---|---|
| **Fidelidade ao roteiro** | WER **0,0 %** — falou exatamente o que estava escrito. É a métrica que decide, porque roteiro é o produto do dark. |
| **Sem clonagem** | Não depende de voz de referência de ninguém. Não há titular, não há autorização a obter, não há pergunta de direito de voz para o `fact-checker` responder. |
| **Reprodutível** | Mesma voz, todo episódio, sem depender de um arquivo de referência sobreviver a um backup. |
| **Licença** | MIT, sem asterisco, contra canal monetizado. |

**Por que isso importa mais do que parece.** O `craft-references.yaml` do dark-room já
dizia: *"a voz é o ativo do canal — trocar de locutor entre episódios reseta o
reconhecimento acumulado"*. Uma voz embutida e determinística é o que garante isso ao
longo de meses. Voz clonada depende de um `.wav` de referência que pode se perder,
mudar de versão ou levantar questionamento de origem.

**Regra operacional:** episódio do P5/P7 usa esta voz por padrão. Clonagem só entra
quando o job PEDIR uma voz específica (cliente com locutor próprio, personagem), e aí
passa pelo `fact-checker` em `*rights` antes de gerar.

---

## 3. Veredito: qual engine usar

### O teste

Mesma frase, mesma voz de referência (`voices_examples/female/female_01.wav`),
mesmo SRT de 3 cues, mesmo seed 42, `timing_mode=concatenate` (sem esticamento,
para ouvir a voz crua):

> *"A semana começa quente em Três Graças. Absolutamente nada ficará no lugar, e
> a vilã manipuladora dá as cartas."*

Além do ouvido, mediu-se **WER** (taxa de erro de palavra) transcrevendo o áudio
gerado de volta com Whisper em `pt`. WER alto = o modelo não falou o que estava
escrito, e é aí que o roteiro morre.

| # | Amostra | Engine | Voz | Duração | WER | Leitura |
|---|---|---|---|---|---|---|
| 01 | `01-chatterbox23L-pt-ref-female01.mp3` | ChatterBox 23L | ref. inglesa | 7,86 s | **0,0 %** | perfeito |
| 02 | `02-f5ptbr-pt-ref-female01.mp3` | F5-PT-BR | ref. inglesa | 5,68 s | **36,8 %** | quebrado |
| 03 | `03-f5ptbr-pt-ref-ptbr.mp3` | F5-PT-BR | ref. PT-BR | 7,11 s | 5,3 % | bom |
| 04 | `04-chatterbox23L-pt-voz-embutida.mp3` | ChatterBox 23L | embutida (sem clonagem) | 7,86 s | **0,0 %** | perfeito |
| 05 | `05-chatterbox23L-pt-voz-attenborough.mp3` | ChatterBox 23L | Attenborough (masculina) | 9,86 s | 5,3 % | bom, grave |
| 08 | `08-timing-stretch_to_fit.mp3` | ChatterBox 23L | ref. inglesa | 11,0 s | **15,8 %** | ver §4 |

O que a amostra 02 falou, transcrito: *"Semana começa quente em três graças.
Absolutamente **a na** ficará no lugar e a **vilão** manipuladora **da Ascar**."*
Além disso saiu com pico em 1,0 — clipando.

### A decisão

**ChatterBox Official 23-Lang é o PADRÃO.** Não é empate:

1. **PT-BR é nativo, não adaptado.** O `language=Portuguese` é uma das 23 línguas
   do modelo, e ele funciona **cross-lingual**: aceita uma voz de referência em
   inglês e fala português correto com o timbre dela. Isso vale ouro — abre o
   banco inteiro de vozes prontas (§5) para o canal em português.
2. **F5-PT-BR só funciona com referência em português.** Com referência inglesa
   ele desmonta (36,8 % de WER). É um modelo PT-BR treinado do zero, não
   multilíngue: ele espera texto de referência em português e não perdoa.
3. **Licença MIT limpa**, sem asterisco, contra o canal monetizado.
4. **Ritmo mais narrativo.** ChatterBox entregou 7,86 s contra 5,68 s da F5 para
   a mesma frase. A F5 fala corrido; para resumo de novela, o ritmo mais
   pausado da ChatterBox é o certo. A F5 tem `speed` nativo para compensar —
   a ChatterBox não tem —, mas o ponto de partida da ChatterBox já é melhor.

**Quando usar a ENGINE B (F5-PT-BR):**
- Quando velocidade importa mais que qualidade. Depois de aquecida, a F5 gerou
  os 3 cues em **5 s** contra **45 s** da ChatterBox — cerca de 9x mais rápida.
  Para um roteiro de 7 minutos essa diferença é uma noite contra dez minutos.
- Quando precisar de controle nativo de velocidade de fala (`speed`).
- **Sempre com uma referência em português e o `{{TEXTO_DA_REFERENCIA}}` exato.**

---

## 4. Os modos de timing SRT

Isto é o que amarra o áudio à pré-composição. São quatro; três importam.

### `smart_natural` — **o padrão da narração**

Respeita o áudio natural. Se sobra tempo no cue, preenche com silêncio; se falta,
ajusta dentro da `timing_tolerance` (2 s) e empurra os cues seguintes; só estica
dentro de `max_stretch_ratio` / `min_stretch_ratio`.

Medido no teste (11 s de SRT contra 8 s de fala natural):

```
1. alvo 3,50s | natural 2,72s → sem esticar, +0,780s de silêncio → 3,500s
2. alvo 3,50s | natural 2,68s → sem esticar, +0,820s de silêncio → 3,500s
3. alvo 4,00s | natural 2,48s → sem esticar, +1,520s de silêncio → 4,000s
Segmentos esticados: 0/3
```

**Use este.** Com `max_stretch_ratio = 1.0` a fala nunca é desacelerada
artificialmente — ele prefere silêncio a distorção, que é exatamente o que
narração longa precisa.

### `pad_with_silence` — quando o SRT já tem folga garantida

Coloca o áudio natural no start exato de cada cue e preenche o resto com
silêncio. Zero processamento no sinal. **Risco:** se o áudio gerado for mais
longo que o cue, ele **invade o cue seguinte** — não trunca, sobrepõe. Só use
quando você controla o SRT de entrada e sabe que há folga.

### `stretch_to_fit` — **não usar em narração longa**

Força o áudio a caber exatamente no cue, esticando ou comprimindo. A suspeita já
estava levantada; agora tem número. No mesmo teste:

```
1. 2,72s → 3,50s  [expandir 1,29x]
2. 2,68s → 3,50s  [expandir 1,31x]
3. 2,48s → 4,00s  [expandir 1,61x]
Fator médio: 1,40x
```

**WER da mesma frase: 0,0 % → 15,8 %.** O esticamento não só soa artificial —
degrada a inteligibilidade a ponto de a transcrição começar a errar palavra.

E tem uma armadilha extra: neste modo o **`Adjusted_SRT` reporta a duração
PRÉ-esticamento**. Os inícios de cue batem, os fins não. Ou seja, justamente no
modo que mais mexe no áudio, a saída que o pipeline consome fica inconsistente.
Mais um motivo para ficar longe.

### `concatenate` — para gravar voz de referência

Ignora o timing de entrada, emenda tudo naturalmente e gera um SRT novo com os
tempos reais. Útil quando o SRT de entrada é só ordem de leitura, e é o modo
usado para produzir as amostras de comparação (§3) — nenhum processamento
mascarando a voz.

---

## 5. Vozes prontas — o que existe sem clonar nada

O founder perguntou se dá para começar sem gravar voz. Dá, por três caminhos.

### 5.1 Voz embutida da ChatterBox (`conds.pt`) — zero setup

O modelo vem com um condicionamento de voz padrão embutido em `conds.pt` (107 KB).
Basta deixar `narrator_voice = none` e **não** conectar `opt_narrator`.

**Testado:** amostra `04-chatterbox23L-pt-voz-embutida.mp3` — **WER 0,0 %**, 7,86 s.
É a rota de menor atrito que existe: PT-BR limpo, sem arquivo de referência,
sem transcrição, sem nada.

> Não confunda com "sem voz": é uma voz específica e sempre a mesma. Para um
> canal dark que precisa de identidade sonora estável entre episódios, isso é
> vantagem, não limitação.

### 5.2 Banco de vozes que vem com a suíte — 16 vozes

Ficam em `custom_nodes/TTS-Audio-Suite/voices_examples/` e aparecem no dropdown
`narrator_voice` do nó `📺 TTS SRT` e no nó `🎭 Character Voices`:

| Grupo | Vozes |
|---|---|
| Personagens | `Clint_Eastwood CC3`, `David_Attenborough CC3`, `Morgan_Freeman CC3`, `Sophie_Anderson CC3` |
| Genéricas | `female/female_01`, `female/female_02`, `male/male_01`, `male/male_02` |
| Higgs Audio | `belinda`, `broom_salesman`, `chadwick`, `en_man`, `en_woman`, `mabel`, `vex`, `zh_man_sichuan` |

**Todas são em inglês** — e é exatamente aí que o cross-lingual da ChatterBox 23L
importa: elas funcionam para narração em português. Testado com Attenborough
(amostra `05`, WER 5,3 %, timbre grave e pausado — cara de canal dark).

Cada voz tem um par de arquivos:
- `nome.wav` — o áudio de referência
- `nome.reference.txt` — a transcrição exata (**é o que a F5 exige**)
- `nome.txt` — metadados/licença

**Regra de reconhecimento:** um `.wav` sem `.txt` de mesmo nome **não** aparece
como personagem. Se você adicionar voz e ela não surgir no dropdown, é isso.

### 5.3 Voz própria — pasta `models/voices/`

Coloque `minhavoz.wav` + `minhavoz.reference.txt` em
`ComfyUI/models/voices/{pasta}/`. Aparece no dropdown junto com as de fábrica.

> **Cache do dropdown:** a lista de vozes é cacheada. Arquivo novo não aparece
> sozinho — use o nó `♻️ Refresh Voice Cache` ou reinicie o ComfyUI. **Via API
> isso não é problema:** use `LoadAudio` (lê de `ComfyUI/input/`) ligado ao
> `opt_audio_input` do `🎭 Character Voices`, que é como o workflow do squad faz.
> Esse caminho não passa pelo cache.

### 5.4 Bootstrap de referência PT-BR

Se você quiser uma referência em português para alimentar a **F5** e não tem
gravação humana: gere a frase na ChatterBox em `concatenate`, salve o `.wav` e
escreva o `.reference.txt` com o texto exato. Foi assim que a amostra `03` foi
feita (WER caiu de 36,8 % para 5,3 %). Não é ideal — é uma voz sintética
clonando outra voz sintética —, mas destrava a F5 sem estúdio.

---

## 6. Operação

### 6.1 Pela interface

1. Suba o ComfyUI: `run_nvidia_gpu.bat`.
2. Arraste `tts-narracao-srt.json` para a tela.
3. Cole o SRT no nó **Roteiro em SRT**.
4. Escolha a voz: ou deixe `narrator_voice = none` (voz embutida), ou carregue um
   `.wav` no nó **Voz de referência** e preencha `{{TEXTO_DA_REFERENCIA}}`.
5. Troque `{{JOB}}` nos dois nós de saída pelo id do job.
6. Queue Prompt.

### 6.2 Pela API (o caminho do pipeline)

```
POST http://127.0.0.1:8188/prompt     → devolve prompt_id
GET  http://127.0.0.1:8188/history/{prompt_id}
```

O `Adjusted_SRT` sai por **dois caminhos**, de propósito:
- **arquivo:** `ComfyUI/output/{{JOB}}/narracao-adjusted_00001.txt` (nó `SaveText`)
- **resposta:** no `/history/{prompt_id}`, em `outputs` do nó `PreviewAny` ligado
  ao slot 3 do `📺 TTS SRT`

O orquestrador pode ler o que for mais conveniente. O arquivo é a evidência que
fica no job; a resposta da API é o que evita ir ao disco.

### 6.3 Trocar de engine

O `TTS_engine` do nó `📺 TTS SRT` é o **único** ponto de troca:
1. Ligue a saída da ENGINE A **ou** da ENGINE B nele.
2. Coloque a engine não usada em Bypass (Ctrl+B).

---

## 7. Armadilhas medidas

### 7.1 Trocar ENGINE A → ENGINE B na mesma sessão quebra a F5

Reproduzido em duas instâncias limpas. Depois que a ChatterBox roda, a F5 falha
em GPU com:

```
RuntimeError: F5-TTS generation failed: Expected all tensors to be on the same
device, but got index is on cuda:0, different from other tensors on cpu
```

**É unidirecional.** B → A funciona normalmente (a ChatterBox rodou sem problema
depois da F5, em 45 s). Só A → B quebra.

**Pior:** a run é reportada como `status=success`, e o `SaveAudio` grava um
arquivo de **~1 segundo** de áudio morto. Quem só olhar o status vai achar que
deu certo.

**Contorno:**
- Reinicie o ComfyUI antes de trocar A → B; ou
- Rode a ENGINE B em `device=cpu`. Funciona, e custou **346 s** contra 5 s em
  GPU (~60x mais lento).

**Consequência para o pipeline:** não alterne engines dentro de um lote. Escolha
a engine no início do job e vá até o fim com ela.

### 7.2 O cache de áudio pode esconder engine quebrada

Com `enable_audio_cache = true` (o padrão, e é o certo para retomar trabalho),
um segmento já gerado com os mesmos parâmetros volta do cache mesmo com o modelo
em estado inválido — a run reporta `cached segments` e sucesso. Ao investigar
falha de engine, **desligue o cache ou mude o seed**, senão você testa o cache,
não o modelo.

### 7.3 Cache de nó do ComfyUI vs. arquivo apagado

Se você apagar o arquivo de saída e reenfileirar o mesmo prompt, o ComfyUI
devolve o resultado cacheado e **não regrava o arquivo**. Mude o `{{JOB}}` (ou
qualquer entrada) para forçar a reescrita. Não é bug — é o cache de execução
fazendo o trabalho dele.

### 7.4 Padding de segmento curto da ChatterBox

O nó `⚙️ ChatterBox TTS Engine` (o de idioma único, **não** o 23-Lang) tem um
`crash_protection_template` porque texto com menos de ~21 caracteres estoura
tensor no CUDA. O nó 23-Lang que usamos não expõe esse campo, mas a regra de
higiene vale: **evite cue de SRT com duas ou três palavras soltas.** Junte no cue
vizinho.

### 7.5 Uma instância só

O ComfyUI trava o `comfyui.db` e a porta 8188. Se subir uma segunda, ela carrega
tudo e morre no fim com `Port 8188 is already in use` — e você fica falando com a
instância velha, que pode nem ter os custom nodes que você acabou de instalar.
Confira `GET /object_info/UnifiedTTSSRTNode` antes de acusar o workflow.

---

## 8. Consumo de disco

| Item | Tamanho | Permanente? |
|---|---|---|
| ChatterBox Official 23-Lang v3 | 3,0 GB | sim |
| F5-TTS PT-BR + vocoder | 1,4 GB | sim |
| **Subtotal de pesos** | **4,4 GB** | |
| Cópia duplicada da F5 no cache HF | 1,3 GB | **apagada** |
| Whisper `small` (ferramenta de aferição, §3) | 672 MB | opcional — `~/.cache/whisper` |

O `pagefile.sys` cresceu para 35 GB durante a sessão (16 GB de RAM + pinned
memory do ComfyUI). Ele encolhe sozinho; não confunda com consumo do stack.

---

## 9. O que ainda não foi testado

- **Roteiro de 7 minutos inteiro.** Os testes foram com 3 cues (11 s). O tempo de
  geração da ChatterBox escala com o texto; extrapolando os ~45 s por 8 s de
  fala, um roteiro de 7 min deve custar algo na casa de 30–40 min de GPU. É
  render noturno, o que está dentro do modo de operação — mas precisa ser medido
  antes de virar promessa.
- **`vibevoice`** (long-form de 90 min) e **`qwen3-tts`** continuam por testar. Nota
  do `LANGUAGE_SUPPORT.md` da suíte sobre a Qwen3: *"suporta pt-BR só com
  instruction; o modelo base sempre sai em pt-PT"* — o que a coloca atrás das duas
  já validadas.
- **Emenda com o InfiniteTalk** (lip-sync). O `Adjusted_SRT` é a ponte prevista,
  mas o par ainda não rodou junto.

---

## 10. Amostras

`assets/comfyui/samples/` — MP3 320k, todas com a mesma frase, para escuta
comparativa. Ver a tabela do §3 para o que cada uma testa.

```
01-chatterbox23L-pt-ref-female01.mp3      ENGINE A, referência inglesa       WER  0,0%
02-f5ptbr-pt-ref-female01.mp3             ENGINE B, referência inglesa       WER 36,8%
03-f5ptbr-pt-ref-ptbr.mp3                 ENGINE B, referência PT-BR         WER  5,3%
04-chatterbox23L-pt-voz-embutida.mp3      ENGINE A, voz embutida             WER  0,0%
05-chatterbox23L-pt-voz-attenborough.mp3  ENGINE A, voz pronta masculina     WER  5,3%
06-timing-smart_natural.mp3               modo padrão
07-timing-pad_with_silence.mp3            modo alternativo
08-timing-stretch_to_fit.mp3              modo proibido                      WER 15,8%
```

Escute 01 contra 02 primeiro: é a decisão inteira em dez segundos.
