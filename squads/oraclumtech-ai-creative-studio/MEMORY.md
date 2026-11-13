# MEMORY — Oraclum Tech · AI Creative Studio

> Índice do que o squad **tem em disco e já validado**. Um agente que precise
> executar qualquer estágio começa aqui: encontra o arquivo, o estado de validação
> e a armadilha conhecida, sem reabrir investigação já feita.
>
> **Regra:** todo asset novo entra aqui na mesma linha em que nasce. Asset que não
> está indexado não existe para o elenco.
>
> Arquitetura (tasks, workflows, gates, tiers) fica em `ARCHITECTURE.md` e
> `_BLUEPRINT.md`. Este arquivo é sobre **matéria-prima**, não sobre processo.

**Última atualização:** 2026-09-05 — entraram o **canal de futebol Bora de Bola**
(§6.4, primeiro episódio publicado), a **live de futebol** (§6.5) e o método de
**derivação de curtos** (§6.6).

---

## 1 · Stack local de geração

Tudo roda em `C:\Users\Pichau\Desktop\ComfyUI_windows_portable`, numa RTX 4060 Ti
de 8 GB com 16 GB de RAM. **A máquina é o limite real do squad** — o que não cabe
nela não é uma opção, por melhor que seja o modelo.

| Arquivo | O que resolve |
|---|---|
| `data/local-generation-stack.yaml` | Inventário do que está instalado, licença de cada modelo e as lacunas conhecidas |
| `data/model-routing.yaml` | Qual modelo para qual tarefa |
| `assets/comfyui/run_batch.py` | Enfileira qualquer workflow do squad via API. Converte formato-UI → formato-API lendo o `/object_info` em tempo de execução |
| `assets/comfyui/workflows/` | Os workflows abríveis no ComfyUI — o humano gera, o squad dirige (§3.1 do `_BLUEPRINT`) |

**Armadilha do `run_batch.py`:** o guard `if __name__ == "__main__"` fica **sempre no
fim do arquivo**. Já aconteceu duas vezes de um bloco de jobs entrar depois dele e os
jobs simplesmente não existirem quando `main()` rodou.

**Bloqueio de hardware conhecido:** Qwen-Image / Qwen-Image-Edit (a rota certa para
consistência de personagem) está travado por **RAM**, não por VRAM nem por disco.

### Os modelos vivem em `D:\ComfyUI_Models` — 2026-09-05

O disco C: encheu (chegou a 292 MB livres) e os **66 GB de modelos foram movidos
para D:**. `ComfyUI/models` virou um **symlink** para `D:\ComfyUI_Models`.

**Nada no pipeline precisou mudar, e o motivo importa:** os workflows referenciam
modelo por **nome** (`4x-UltraSharp.pth`, `flux-2-klein-4b-Q8_0.gguf`), não por
caminho — o symlink resolve de forma transparente. Verificado: listar
`ComfyUI/models/upscale_models/` mostra o conteúdo de D:.

**O que NÃO foi para D:, e é fácil procurar no lugar errado:**

| Item | Onde está de verdade |
|---|---|
| RIFE (interpolação) | `custom_nodes/ComfyUI-Frame-Interpolation/ckpts/rife/rife49.pth` |
| Vozes do TTS | `custom_nodes/TTS-Audio-Suite/voices_examples/` |
| Referências de clone | `ComfyUI/input/` — `ref_video_limpo.wav`, `ref_v2_1200.wav`, `voz_male_02.wav` |
| `input/` e `output/` | continuam em C: |

A pasta `D:/ComfyUI_Models/frame_interpolation/` está **vazia** (só o placeholder).
Isso não é defeito: o RIFE nunca morou em `models/`, e procurá-lo lá leva à
conclusão errada de que a interpolação quebrou com a mudança.

---

## 2 · Imagem

| Arquivo | Estado |
|---|---|
| `data/imagem-refino-playbook.yaml` | Mineração dos cursos **+** `validacao_no_stack_local` (medido) **+** `anomalias_reais_medidas_no_pack_estoico` |
| `data/prompt-architectures.yaml` | Arquitetura de prompt por ferramenta |
| `workflows/flux2-klein-t2i.json` | Geração crua |
| `workflows/flux2-klein-lite-upscale.json` | **Roda LITE** — upscale 2×, sem detailer. ~175 s |
| `workflows/flux2-klein-pro-refino-upscale.json` | **Roda PRO** — detailer + upscale 3×. ~360 s |
| `assets/comfyui/gera_workflows_refino.py` | Gera os dois workflows. Não editar o JSON à mão |
| `assets/comfyui/monta_folha_contato.py` | Folha de contato de N sementes, para escolha humana |
| `assets/comfyui/monta_lite_vs_pro.py` | Compara as duas rodas em zoom 100%. A região de interesse é **achada**, não chutada |

### As duas rodas (decididas com o founder em 2026-08-29)

**LITE** — `cru → upscale 2×`. Volume, teste, thumbnail, prova de conceito.
**PRO** — `cru → detailer → upscale 3×`. Peça final.

A mesma imagem crua alimenta as duas, e nada é regerado: **a escolha de roda pode
acontecer depois da escolha de semente.**

### Parâmetros fixados por medição — não mexer sem medir de novo

| Campo | Valor | Por quê |
|---|---|---|
| `FaceDetailer.denoise` | 0.35 | acima de ~0.45 o rosto vira outro rosto |
| `FaceDetailer.feather` | 24 | degrau na borda da máscara cai de 1,44 para 1,14 /255 |
| `cfg` (ambos) | 1.0 | klein é destilado; acima disso queima |
| `UltimateSDUpscale.denoise` | **0.10** | em 0.18 o ladrilho **inventa** rachadura e lasca no mármore |
| `tile` | 1024 | resolução nativa do klein |

### Os dois limites duros

**Os detectores YOLO não enxergam mármore.** O de rosto dispara em estátua (a
geometria facial é próxima o bastante); o de **mão não dispara nunca**. Para estética
não-fotográfica não existe rota automática de conserto de mão — é máscara manual +
inpaint. A rota automática só serve em peça fotorrealista com pessoa na cena.

**Inspeção estrutural vem ANTES de inspeção de textura.** Contar membros, contar
elementos repetidos, e perguntar de cada objeto "isto tem função na cena?". Textura
ruim se conserta com upscale; anatomia e arquitetura erradas exigem geração nova.
Descobrir isso depois de gastar upscale é jogar fora o tempo mais caro do pipeline.

### Quatro erros de prompt que já custaram caro

1. **Adjetivo atmosférico vira ruído.** `floating dust motes` produziu exatamente as
   "poeirinhas" que o founder reportou como defeito. Contra fundo preto e depois de
   um codec de vídeo, `dust`/`haze`/`particles`/`grain` viram sujeira.
2. **Objeto não nomeado é objeto inventado.** O busto sem apoio declarado ganhou uma
   cunha escura flutuando sob a base.
3. **Estado não substitui forma.** `unrolled scroll` descreve um estado; o modelo
   resolveu o estado e perdeu o objeto (virou um tubo oco).
4. **Nunca pedir superfície escrita.** `showing its written surface` fez o modelo
   escrever texto ilegível de IA — a pior anomalia do catálogo, a única que o
   espectador consegue *ler*. Pergaminho **em branco**; tipografia entra depois.

---

## 3 · Voz e locução

| Arquivo | Estado |
|---|---|
| `data/voice-packs/_INDEX.yaml` | Banco por narrador **+ `validacao_do_founder`** (autoridade) |
| `data/voice-packs/VALIDACAO.md` | Preenchido pelo founder em 2026-08-29 |
| `data/bancos-de-voz.yaml` | Catálogos externos e situação de licença |
| `data/oratoria-e-prosodia.yaml` | 8 alavancas e 9 técnicas. O SRT é a partitura |
| `workflows/tts-narracao-srt.json` | Narração dirigida por SRT |

### O que o founder decidiu

**Não haverá voz canônica.** Portfólio em dois conjuntos: **oficial** (publicável) e
**estudo** (clones aprovados de ouvido, mas sem base de direito para publicar).

**Rejeitados e fora do portfólio:** `04-male-01`, `05-chadwick`, e `09-female-01` no
engine F5-TTS — a mesma voz é aprovada no 23-Lang, então o defeito é do engine.

**`stretch_to_fit` está proibido.** Rejeitado de ouvido ("atrasa a fala e distorce") e
a medição já apontava (WER 15,8%). Restam `smart_natural` e `pad_with_silence`.

### A síntese que muda a prioridade

Em **9 das 10** observações escritas pelo founder a queixa é de **prosódia** — pausa
no lugar errado, sílaba tônica errada, ponto final onde não havia. Quase nenhuma é de
timbre. **Trocar de voz não resolve um problema de direção.** A alavanca é a pontuação
do texto de entrada e a fronteira de cue do SRT.

Próximo teste de maior retorno: mesma voz aprovada, variando **só** a pontuação e as
fronteiras de cue, nas frases exatas que o founder citou.

---

## 4 · Trilha, ambiência e SFX

`data/trilhas-and-sfx/` — **21 peças, aprovadas em bloco pelo founder em 2026-08-29**,
organizadas em segmento / tipo / intenção. Todas geradas aqui: **nenhum sample de
terceiro, nenhuma pendência de licença de biblioteca musical.**

| Arquivo | Papel |
|---|---|
| `_INDEX.yaml` | Catálogo com intenção de uso por peça — é o campo `intencao` que decide |
| `assets/comfyui/pecas_audio.py` | Catálogo-fonte. Peça nova entra aqui |
| `assets/comfyui/organiza_audio.py` | Gera o `_INDEX.yaml` e a `VALIDACAO.md`. Não copiar arquivo à mão |
| `assets/comfyui/faz_loops.py` | Gera as versões em loop |

### Três coisas aprendidas medindo

**O Stable Audio Open compõe uma peça, não uma cama.** Recebe a duração no
condicionamento e escreve um arco: entra, sustenta e **desvanece**. Três dos quatro
leitos caíram 20 a 35 dB nos últimos 15 s. **Para uso como leito, o entregável é o
loop**, não o arquivo cheio.

**Loop não pode ser MP3.** MP3 carrega atraso de codificador nas bordas — abre buraco
na volta do loop e, de quebra, **torna impossível medir a emenda**, porque as amostras
das pontas não são as que você escreveu. Loops saem em **WAV**.

**Os níveis saem incomparáveis do gerador.** As ambiências vieram a −42 dB de média.
As cópias do diretório vão niveladas a −18 LUFS (SFX por pico a −1 dBFS). Esse é o
nível de **audição**; o de mixagem é do editor.

---

## 5 · Vídeo (I2V)

| Arquivo | Papel |
|---|---|
| `workflows/wan22-i2v-max.json` | Wan 2.2 I2V, qualidade máxima |
| `workflows/wan22-i2v-fast.json` | Passada rápida |
| `data/camera-moves.yaml` | 39 movimentos, com risco de IA e custo por movimento |
| `assets/insumos/airbnb/PLANO-DE-TAKES.md` | 4 takes planejados sobre as fotos **reais** |

**Regra de resolução:** o quadro que alimenta o I2V **não** é o upscalado. O Wan
trabalha por volta de 1280×704 — upscalar antes é gastar tempo que o modelo joga fora.
O 4K serve para a peça estática e para o editor empurrar zoom, não para o I2V.

---

## 6 · Playbooks de nicho

| Arquivo | Nicho |
|---|---|
| `data/dark-estoicismo-playbook.yaml` | Dark de estoicismo — abertura em 10 movimentos, 152 wpm |
| `apps/canal-futebol/ESTEIRA.md` | **Dark de futebol — é o runbook executável do canal Bora de Bola (§6.4)** |
| `data/lives-niches-playbook.yaml` | Novela, esporte e música. Inclui os **15 itens recusados** e o porquê |
| `data/brand-film-playbook.yaml` | Filme de marca |
| `data/genre-catalog.yaml` | Catálogo de gêneros — é ele que decide o pipeline |
| `data/pipeline-profiles.yaml` | Perfis P1..P7 |
| `data/craft-references.yaml` | Referências de ofício |

---

## 6.1 · Canal dark de estoicismo — referências e roteiros

As **duas** peças de referência foram transcritas por inteiro. Não são mais leitura
por amostragem: existe texto, SRT e métrica em `docs/referencias/estoico/`.

| Referência | Duração | Palavras | wpm | Pausas >250 ms |
|---|---|---|---|---|
| `v1-praticas` | 34m15s | 4368 | **127,5** | **2** |
| `v2-reflexoes` | 42m17s | 6391 | **151,1** | 16 (mediana 0,72 s) |

**O playbook dizia 152 wpm e atribuía isso à v1. Estava errado** — o 152 é da v2.
Duração de episódio se calcula pelo ritmo DA ESTRUTURA. Corrigido em
`dark-estoicismo-playbook.yaml` → `medicao_completa`.

**Duas pausas em 34 minutos** na v1, com variação de 8 wpm. Isso não é respiração
humana; reforça muito a hipótese de TTS que o playbook levantava.

| Arquivo | Papel |
|---|---|
| `data/roteiros/estoico/_INDEX.yaml` | As 6 peças, com números **medidos** |
| `data/roteiros/estoico/*.md` + `*.srt` | Roteiros e partituras de prosódia |
| `assets/comfyui/conta_roteiros.py` | Mede o texto narrado e **reescreve o cabeçalho**. Número em cabeçalho nunca é digitado |
| `assets/comfyui/pack_visual_estoico.py` | As 39 imagens, uma por marcador `[img NN]` |
| `assets/comfyui/monta_folha_canal.py` | Folha de inspeção por peça |
| `assets/comfyui/transcreve_referencias.py` | ETL das referências. **Não rodar com o ComfyUI carregado** |

**A inversão que separa as duas estruturas:** na A a citação vem no MEIO da abertura,
confirmando a tese; na B ela ABRE cada bloco, como epígrafe.

**Este gênero não usa SFX.** O pack `04-sfx/` aprovado não entra nas peças estoicas —
whoosh e impacto quebram a atmosfera. Aqui é narração + leito contínuo, sem corte.


---

### Os SEIS longos — lote A (v1) e lote B (v2)

| Peça | Estrutura | Duração prevista |
|---|---|---|
| `LA1-disciplina` · A disciplina que não depende de vontade | A | 20m23s |
| `LA2-ansiedade` · Pare de carregar o que não é seu | A | 20m23s |
| `LA3-tempo` · O tempo que ainda sobra | A | 19m57s |
| `LB1-aceitar` · Aceitar o que já chegou | B | 19m31s |
| `LB2-paz-interior` · A paz que ninguém pode tirar | B | 19m06s |
| `LB3-primeiros-minutos` · Os primeiros minutos do dia | B | 18m23s |

O **lote B** é outra gramática, não o lote A com outra cor. Cada reflexão abre
com **citação nominal**, conduz uma prática guiada em segunda pessoa, usa cenário
imaginado no lugar da anedota histórica, e fecha com **ressalva ética** — o passo
que protege o conselho de virar conformismo. Não tem desafio com prazo nem like
no miolo: os CTAs ficam todos empilhados na abertura.

Pack visual: `pack_visual_lote_b.py` **importa** a coluna FIEL de
`modelagem_takes_v2.py` em vez de copiar os prompts. Duas versões do mesmo prompt
divergiriam na primeira correção feita em só uma delas. Sementes 9400/9500/9600 —
fora da faixa do lote A (9100-9300), senão os dois lotes sairiam parecidos.

**Duas vozes por peça.** `male02` (publicável) e `clone` (`ref_v2_1200.wav`,
`pode_publicar: nao` — estudo). O founder prefere a clone; as duas são geradas
para ele escolher no editor trocando só a faixa de áudio.

### Lote A longo — 3 peças de ~20 min, escritas 2026-08-30

`LA1-disciplina` (20m17s) · `LA2-ansiedade` (20m10s) · `LA3-tempo` (19m58s).
Estrutura A a **127,5 wpm** — não 152, que é a v2. Cada peça: abertura de 10
movimentos, **6 práticas**, intermezzo na metade, fecho com recapitulação.

O que a versão curta não comportava e a longa exige:

- **objeção respondida** em cada prática, logo antes do desafio — é onde o
  ouvinte desliga, e antecipar o motivo dele é o que segura;
- **intermezzo** na metade, com imagem própria — respiro de tom, não de
  conteúdo. Se dividisse imagem com a prática vizinha, leria como erro;
- **recapitulação** das seis no fecho — quem entrou no meio sai com a lista.

Pack visual: `assets/comfyui/pack_visual_lote_a.py` — 11 marcadores, **as três
peças dividem o catálogo e não o quadro** (semente por peça, base 9100/9200/9300).
A identidade é a coluna FIEL da v1: colunata creme contra vazio teal, corte
descentrado, partícula e vinheta — **não** o fundo preto do pack curto, que a
extração de takes desmentiu.

### O WPM da referência NÃO prevê a duração da nossa peça — 2026-08-30

Custou uma geração inteira. O `LA1` foi escrito para 20m17s a **127,5 wpm**, que
é o ritmo medido na peça v1, e saiu com **14m56s**. Não houve truncamento: 84 de
84 blocos, texto integral, do primeiro cue ao último.

O motor `male02` fala a **171,6 wpm**. São dois números com usos diferentes:

| número | o que é | para que serve |
|---|---|---|
| `WPM_REFERENCIA` | ritmo de quem modelamos | entender o gênero — quantos blocos cabem, onde o ritmo cai |
| `WPM_MOTOR` | ritmo da nossa voz | **prever duração** — é o único que serve para isso |

`palavras_alvo = minutos × WPM_MOTOR`. Para 20 min: **3.432 palavras**, não 2.550.

Medir o motor é barato e obrigatório na primeira peça de cada voz: o
`Adjusted_SRT` que o workflow devolve já traz o tempo real de cada bloco.

### Narração PRO: parágrafo, não cue — e sem workflow novo

`UnifiedTTSSRTNode` tem `timing_mode: concatenate`, que ignora o timing de
entrada, emenda o áudio natural e devolve um SRT com os tempos reais. Alimentado
com um SRT cujos cues são os **parágrafos**, ele faz exatamente o que a rota PRO
pede — prosódia contínua dentro do parágrafo, que é o que não se reconstrói
depois de cortada.

`assets/comfyui/narracao_pro.py` monta esse SRT. Ele **corta em fronteira de
frase** o que passa de 55 palavras: gerações muito longas degradam no fim, e
cortar no meio de uma frase produz entoação de ponto final onde não havia ponto
— que é o defeito que a rota PRO existe para evitar.

### A janela das imagens também tem que vir do áudio

As legendas já vinham do áudio; a janela dos clipes de imagem continuava vindo
do SRT escrito. É a mesma dessincronia com outro nome, e ela ficou visível
assim que o wpm de previsão foi corrigido: o A1 acusou **76,5 s** de descompasso
entre visual e narração.

`gera_timeline_dark.py` agora reconstrói os cues a partir do `.captions.json`
quando ele existe. A contagem de palavras continua sendo a chave — é ela que casa
com os marcadores `[img NN]` —, só que com o tempo real de cada palavra.

### Três defeitos silenciosos no caminho do texto — 2026-08-30

Os três apagavam ou acrescentavam texto **sem erro nenhum**. Foram achados
porque a contagem de palavras mudou entre duas execuções, não porque algo quebrou.

**1 · `\1` virou `\x01`.** Um patch anterior escreveu `r"\1"` dentro de um
heredoc de shell; o `\1` foi interpretado antes de chegar ao Python e o byte de
controle 0x01 ficou gravado no `re.sub`. O efeito: **o conteúdo em negrito e em
itálico era apagado da narração.** Nas peças do lote A isso removeu a frase-CTA
(`hoje eu começo mesmo sem vontade`) e os seis rótulos `O desafio:` — as
narrações tiveram de ser regeradas.
*Patch com regex não vai por heredoc de shell. Vai por arquivo `.py`.*

**2 · Blockquote: nota de cabeçalho vs. citação narrada.** A estrutura B abre
cada reflexão com uma citação em `>`, que **é narrada**. O filtro descartava todo
`>`. Ao remover o filtro, a nota técnica do cabeçalho — que usa a mesma marca —
passou a contar como fala: o primeiro bloco do LA1 virou *"Estrutura A longa,
modelada em docs/referencias…"*.
O que separa os dois não é a marca, é a **posição**: a nota vem antes da primeira
seção. O corte passou a ser no primeiro `## `.

**3 · Camadas "em loop" que não davam volta.** Leito e atmosfera eram declarados
como **um** clipe com a duração da peça. O rótulo dizia `(loop)`, mas nada fazia
o loop: um clipe de 1193 s apontando para um arquivo de 10 s toca 10 s e some —
a atmosfera desaparecia nos primeiros 0,8% de um vídeo de 20 min. A repetição
agora é explícita (`repete_para_cobrir`), com fade **só nas pontas**: uma rampa
por volta seria um pulso audível a cada 45 s.

### Duas convenções de pasta para o pack, e as duas valem

Peças curtas usam o prefixo (`A1-ordem` → `A1`); as longas usam o nome inteiro
(`LA1-disciplina`), porque com três lotes o prefixo deixou de identificar a peça.
Procurar só pelo prefixo fazia as 11 imagens aparecerem como FALTANDO **com o
pack inteiro no disco** — e o único sinal era a lista de faltantes no fim da
execução, fácil de ler como "ainda não gerei".

### Cada lote usa o clone do vídeo que ELE modela — 2026-08-30

Erro meu, apontado pelo founder antes de custar as seis narrações do lote B.

O nome `ref_v2_1200.wav` **parece** dizer "versão 2 da referência". O `v2` ali é
**VÍDEO 2** — a peça de reflexões, origem do lote B. Usei essa voz nas três
clones do lote A, que modela o vídeo 1.

| Lote | Modela | Clone | Duração da ref |
|---|---|---|---|
| **A** — LA1/LA2/LA3 | vídeo 1 · 10 práticas | `ref_video_limpo.wav` | 14 s |
| **B** — LB1/LB2/LB3 | vídeo 2 · 10 reflexões | `ref_v2_1200.wav` | 20 s |

`limpo` e não `cru`: a versão crua carrega a trilha do vídeo por baixo da fala, e
o clone aprende a trilha junto com a voz.

O mapeamento virou `CLONE_DO_LOTE` em `run_batch.py`, resolvido pelo prefixo do
roteiro — não dá mais para escolher a voz errada digitando o nome do arquivo.

### RIFE em bfloat16, não float16 — 2026-08-31

Em 31/08 o take do Airbnb passou do KSampler (progresso: na noite anterior morria
lá por OOM) e **derrubou o ComfyUI inteiro**:

    Windows fatal exception: access violation
    File "...vfi_models
ife\__init__.py", line 227 in vfi

`access violation` é crash **nativo**. Não é `OutOfMemoryError` — esse o PyTorch
captura e reporta. O processo morre e o servidor cai junto.

A resposta está escrita no próprio nó:

    # float32 is safe, float16 is ~2x faster/half VRAM,
    # bfloat16 is safer than float16 on Ampere+ GPUs (RTX 30xx+)

A GPU é uma **RTX 4060 Ti** (Ada Lovelace = Ampere+). O autor da extensão diz com
todas as letras que bfloat16 é mais seguro nessa família.

**A conta de memória não muda**: bfloat16 tem os mesmos 16 bits. O que muda é a
faixa de expoente, que é a do float32 — por isso ele não satura onde o float16
satura. Voltar para float32 também estabilizaria, mas dobra o pico e leva o
preset `validado` de 6,4 GB para 12,8 GB, desfazendo o ganho.

Os três presets de I2V foram regerados. `gera_workflows_wan.py` é a fonte.

### Detecção por substring num blob que contém código — 2026-08-31

Custou uma madrugada inteira, e o defeito era meu.

Eu tinha escrito o guard "a fila para quando o job é interrompido" procurando a
substring `interrupt` em todas as mensagens do history. O traceback de
**qualquer** erro do ComfyUI contém:

    _async_map_node_over_list(..., allow_interrupt=True, ...)

`allow_interrupt` é um parâmetro interno do executor. Resultado: **todo erro
virava "interrompido"** e parava a fila.

Na noite de 30/08 o primeiro take do Airbnb falhou com `torch.OutOfMemoryError`
— falha recuperável, que a própria regra de 3 falhas seguidas trataria. O guard
classificou como interrupção e os outros **11 jobs nunca chegaram a rodar**.

Correção: ler o `exception_type` da mensagem de erro. Interrupção real tem tipo
próprio (`InterruptProcessingException`).

*A lição não é sobre esse campo. É que buscar substring num blob que contém
código-fonte encontra a palavra no lugar errado — e o falso positivo é
silencioso, porque o comportamento "parou" parece intencional.*

### Parar de enfileirar não libera a GPU

Na mesma noite: parei a fila de narração para dar a madrugada ao Airbnb, mas o
job de TTS **já em execução** levou mais 12 minutos e continuou segurando VRAM.
O Wan começou nesse intervalo e morreu de OOM com 2,93 GB já alocados.

Parar o enfileiramento não basta. Para entregar a máquina a outra família de
modelo é preciso **esperar o job atual terminar e então chamar `/free`** —
senão o próximo carrega por cima do anterior.

### A fila para quando o job é interrompido

`POST /interrupt` cancela o job em execução no ComfyUI, mas o `run_batch.py` não
sabia disso: via um job com erro e passava para o próximo. **Duas vezes seguidas**
isso gerou narrações de 20 min com texto desatualizado, depois de eu ter mandado
parar justamente porque o texto tinha mudado.

Interromper é sempre intencional. Agora `rodar()` distingue `interrompido` de
`erro` (lendo as mensagens do history) e a fila aborta. Três falhas seguidas
também abortam — aí a causa é do ambiente, não do job. Falha **isolada** continua
não parando: numa fila de 30 imagens, uma que falhou não justifica descartar 29.

## 6.2 · Modelagem de referência — o fluxo que virou rotina

**Task SOT:** `tasks/modelar-referencia.md`. Antes de modelar qualquer nicho novo,
leia essa task — ela carrega as armadilhas que já custaram tempo aqui.

| Ferramenta | O que faz |
|---|---|
| `assets/comfyui/transcreve_referencias.py` | Transcrição integral + ritmo, pausas e wpm por bloco |
| `assets/comfyui/extrai_takes_referencia.py` | Takes, tempo em tela e ponto da 1ª reciclagem |
| `assets/comfyui/modelagem_takes_v1.py` | Exemplo de catálogo com as **3 variações** |
| `assets/comfyui/monta_storyboard.py` | Storyboard de validação: real × fiel × intermediária × autoral |
| `data/identidades-visuais.yaml` | A trava de look de um canal — paleta, ambiente, transição, legenda |

### As duas armadilhas técnicas

**Detecção de corte não serve.** `select=gt(scene,...)` devolveu **zero cortes** numa
peça de 34 min: ela não corta, **dissolve**. Use amostragem uniforme. De graça isso
já diz que a transição padrão daquele formato é dissolve, nunca corte seco.

**Compare com a amostra ANTERIOR, não com a primeira do grupo.** O zoom lento faz o
hash derivar; comparando com a primeira, a mesma imagem virou 230 "takes" numa peça
que tem 99.

### Três variações por take — regra do founder, 2026-08-30

**Fiel** (o mais próximo do original) · **Intermediária** (look do nosso canal) ·
**Autoral** (reinterpretada). **Semente FIXA entre as três** — se a semente variar
junto com o prompt, a comparação não distingue direção de acaso.

*Uma variação só não permite escolher; permite aceitar.*

### Dimensionar o pack pelo tempo em tela, não pela contagem

A 1ª reciclagem acontece em **8:44** (v1) e **6:00** (v2). Os 30 maiores cobrem 41% e
63%. Então: **PRO nos ~20 que carregam o vídeo, LITE na cauda** — 2 h de máquina em
vez de 9, e a diferença não aparece em tela.

### O desvio de temperatura

Nossas imagens saem **mais quentes e mais saturadas** que a referência, que é cinzenta
e dessaturada. Só ficou visível lado a lado — nenhuma, vista sozinha, parecia errada.
A variação FIEL corrige com `desaturated, muted palette, cool grey marble`.


### Escultura vira gente: a negação é que fecha a porta — 2026-08-30

Na rev.1 da v2, **todo close de busto saiu como retrato de homem vivo** — pele,
poro, barba real — em T02, T03, T08 e T09. O prompt positivo dizia "bronze" nos
quatro. Não bastou: o prior do modelo para *bearded bust facing camera* é
fotografia de pessoa, e adjetivo não vence prior.

O que resolveu foi negativo explícito — `human skin, skin pores, living person,
real man, portrait photograph, flesh` — somado a um reforço de **superfície**
(`chisel marks, micro-chipping, matte inorganic finish`).

**E o reforço de superfície não pode citar material.** A primeira versão dizia
`hard STONE surface, matte MINERAL texture`: acabou com a carne e **branqueou
tudo**, jogando o bronze quase preto da v2 para mármore claro — apagando
justamente o que separa a v2 da v1. A cor voltou por um dicionário `MATERIAL`
por take, colocado **depois** do reforço, para ser a última palavra do prompt.

### Quando o adjetivo não resolve, tire o objeto da cena

O marcador "duas mãos de mármore segurando um pergaminho" saiu com **pele
humana em três rodadas seguidas**, com `carved from marble, not flesh` no
positivo e `human skin, flesh` no negativo. Foi reescrito como pergaminho
aberto sobre laje, `no hands and no people anywhere in frame`. Saiu certo de
primeira nas três peças.

*Prior forte não se corrige com qualificador; corrige-se removendo o gatilho.*

### O ComfyUI não sobrescreve — e isso mostrava a rodada errada

Regerar produz `_00002_` **ao lado** do `_00001_`. Tanto o storyboard quanto o
acervo da timeline pegavam `sorted(...)[0]` — ou seja, exibiam exatamente a
versão que se acabou de corrigir. Os dois passaram a usar `max(..., key=mtime)`.
O mesmo defeito aparece quando um marcador **troca de slug**.

---

## 6.3 · Ponte para o `apps/video-studio`

`assets/comfyui/gera_timeline_dark.py` — roteiro vira composição.

```bash
python gera_timeline_dark.py A1-ordem --voz male02
# abre em http://localhost:3000/studio?client=canal-estoico&creative=A1-ordem
```

**O canal é o CLIENTE no studio.** Clientes são descobertos por diretório em
`outputs/<slug>/video-plans`, e o nome de exibição sai do slug em title-case —
`canal-estoico` vira "Canal Estoico". Não há registro a manter.

### O que a ponte exige do studio, e que não é óbvio

**Tudo tem que estar em `Materiais Brutos/`.** O player roda no navegador e não lê
disco: os arquivos são servidos por `/api/media/{cliente}/{criativo}/{arquivo}` e
citados pelo **nome puro**. O emissor copia imagens, narração, leito e overlay.

**`studio-edit.json` é o arquivo autoritativo.** Se ele existe, o studio o usa e
**pula a ingestão fresca** — que é do modelo de farming e destruiria a montagem.
Sem ele, a peça dark seria reingerida como se fosse criativo de farming.

**O endpoint de timeline devolve 404 se `Materiais Brutos/` não existir**, mesmo
com `studio-edit.json` presente.

### Dois defeitos do studio que o dark revelou, e a correção

**`SmartFrame` só conhecia vídeo.** No farming a espinha é sempre mp4; no dark é
IMAGEM PARADA. Um PNG caía no `<Video>` e o Player devolvia *"Mídia incompatível
neste clipe (formato/codec)"* — a peça inteira ficava preta. Corrigido com deteção
de extensão de imagem e `<Img>`, sem `playbackRate`/`startFrom`/`volume`, que não
existem para imagem. O Ken Burns continua no wrapper, igual para os dois casos.

**O palco tinha `aspectRatio: "9 / 16"` fixo.** O dark entrega 1920×1080 para
YouTube e aparecia espremido numa caixa vertical. Agora deriva da timeline —
retrato cresce pela altura, paisagem pela largura. **As alças de manipulação medem
a partir dessa caixa**, então não bastava deixar o Player fazer letterbox.


---

### Ecossistema de FX no studio — quatro grupos separados

Documento completo: `apps/video-studio/docs/ECOSSISTEMA-FX.md`.
Fonte única: `src/lib/fxCatalog.ts`.

| Grupo | Escopo | Onde vive |
|---|---|---|
| **Transição** (16) | dois takes — fim de um, começo do outro | `clip.transitionIn` |
| **Animação** (10) | um elemento, sozinho — entrada e saída | `elemento.animateIn/Out` |
| **Efeito** (11) | camada sobreposta, não altera o clipe | camada extra |
| **Câmera** (10) | o próprio quadro se movendo | `clip.camera` |

**O `kenBurns` era um número sem direção.** O renderer já respeitava o sinal
negativo, mas o clamp do setter era `Math.max(0, …)` e o slider começava em zero:
o zoom-out era literalmente inalcançável pela interface. Agora há direção
nomeada, **peso** (calmo/médio/agressivo → ×0,6 / ×1 / ×1,9) e curva.

Nas transições o peso mexe também na **duração** (×1,6 / ×1 / ×0,55): agressivo é
mais curto, não só mais forte — um whip de 20 frames é lento, não agressivo.

Duas regras que o catálogo garante sozinho:
- **escala nunca abaixo de 1** — sob 1 aparece o fundo do palco. `zoom-out` é
  modelado como "começa ampliado e assenta";
- **todo movimento lateral tem folga de escala** — pan sem folga mostra a borda.

**O modo de mesclagem é o que faz o efeito existir.** Sem ele, o preto do overlay
apenas escurece a imagem — é a queixa de "o efeito não aparece". A aba Efeitos
monta a camada com blend, opacidade calibrada e a repetição para cobrir a peça
(arquivo de 10 s, peça de 20 min, loop perfeito). Prova em `assets/overlays/PROVA.jpg`.

### O player travava porque o playhead era estado do React — 2026-08-30

O console do founder mostrava `[Violation] 'message' handler demorou Nms` (×30) e
`mousedown` de **294 ms**. A causa não estava na Remotion nem na mídia.

Durante a reprodução, o `frameupdate` virava `setCurrentFrame` na página do
studio. Isso re-renderizava, **30 vezes por segundo**: as ~2.000 linhas de JSX de
`/studio`, a `Timeline` inteira (com `Filmstrip` e `Waveform` de cada faixa e uma
célula por cue de legenda — 386 numa peça de 20 min) e `estimateLevel`, que varre
toda a timeline para desenhar o VU. O clique ficava lento porque disputava a
mesma árvore sendo remontada.

**Nada disso precisava re-renderizar.** O único elemento que muda a cada quadro é
a posição da linha do playhead.

Correção (`src/lib/playhead.ts` + `components/Playhead.tsx`):
- o frame vira um **store externo** com `subscribe`/`getSnapshot`, consumido por
  `useSyncExternalStore` — só quem assina re-renderiza;
- `LinhaPlayhead`, `ContadorTempo` e `ComFrame` são os únicos assinantes, todos
  nós folha;
- `Timeline`, `Filmstrip` e `Waveform` ganharam `React.memo`, e a `Timeline`
  **deixou de receber `currentFrame` como prop**;
- quem precisa do frame para **agir** (handlers) lê `currentFrameRef.current`.

**Context não serviria:** ele propaga para todos os consumidores dentro do
provider, o que traria o problema de volta assim que alguém consumisse no meio da
árvore. O store notifica exatamente quem se inscreveu.

Há um teste de arquitetura em `playhead.test.ts` que falha se alguém voltar a
passar `currentFrame` para a `Timeline` — é a regressão mais fácil de cometer,
porque não quebra nada, só fica lento de novo.

### Guia manual em HTML — `docs/GUIA-MANUAL.html`

Backup operacional pedido pelo founder: como rodar o pipeline inteiro **na mão**,
sem agente nenhum, com o comando exato de cada etapa. 17 seções, do ComfyUI ao
editor, incluindo uma tabela de armadilhas já pagas (sintoma → causa real →
correção).

No OpenCode, `/pipeline-manual` (em `.opencode/commands/`) conduz por esse guia
passo a passo, sem persona — é o caminho para modelo fraco ou sessão sem contexto.
`/studio-chief` ativa o squad completo. `opencode.json` passou a carregar este
MEMORY.md em `instructions`.

## 6.4 · Canal dark de futebol — Bora de Bola

**Primeiro episódio publicado em 2026-09-05.** O canal saiu do papel: existe peça no
ar, esteira executável e pack de publicação fechado. Esta seção é o índice de onde
tudo mora — um agente que receba "faz o próximo episódio do Bora de Bola" começa aqui
e não precisa reabrir nenhuma investigação.

> **O runbook é `apps/canal-futebol/ESTEIRA.md`.** Ele tem a ordem dos comandos,
> etapa por etapa, do fato ao vídeo publicado. Leia-o antes de executar qualquer
> episódio. Esta seção diz o que existe e por quê; a ESTEIRA diz como rodar.

### O que este canal é — e por que não é o dark de estoicismo

Os dois são "dark room", mas o gênero de destino é outro e isso muda quase tudo:

| | Estoicismo | Bora de Bola |
|---|---|---|
| Fonte da pauta | atemporal, escolhida | **notícia do dia** — tem prazo de validade |
| Imagem | gerada por IA | **acervo + foto de portal + cartela**. Zero IA |
| Ritmo de corte | contínuo, sem corte | **corte seco a ~5 s** |
| SFX | não usa | não usa |
| Gate dominante | `gate-stills` | **`gate-factcheck`** — cada afirmação com âncora de fonte |
| Prazo | nenhum | o assunto morre em ~48 h |

A consequência prática: **a embalagem vem antes do roteiro**, porque o roteiro
cumpre a promessa do título. E o `claim-ledger.json` não é burocracia — é o que
separa canal de notícia de canal de boato.

### Os quatro apps que compõem a esteira

| App | Papel | Entrada da esteira |
|---|---|---|
| `apps/pauta-futebol/` | Acha o que merece virar vídeo hoje | etapa 0 |
| `apps/regra-de-3/` | Título e thumb pelo pontuador dos 3 pilares | etapa 1 |
| `apps/canal-futebol/` | Narração, b-roll, áudio, montagem, ponte | etapas 3-7 |
| `apps/live-futebol/` | Painel de live (§6.5) | fora da esteira de VOD |

Cada um tem README ou doc próprio. Os quatro docs do `canal-futebol` valem leitura
antes de decidir qualquer coisa de formato:

| Doc | Responde |
|---|---|
| `ESTEIRA.md` | **como se executa um episódio** (é o runbook) |
| `METODO-REGRA-DE-3.md` | como título e thumb são pontuados |
| `GUIA-DIAS-DE-JOGO.md` | que dia tem jogo de que liga — decide o calendário |
| `ANALISE-REFERENCIA.md` | o que foi modelado dos canais de referência |

### O canal em disco

`workspaces/businesses/virals/creative-studio/canais/bora-de-bola/`

| Arquivo | O que trava |
|---|---|
| `channel-brief.yaml` | **Sem ele o dark-room não abre episódio** (regra do `wf-dark-room`) |
| `voice-lock.yaml` | O perfil de voz do canal. Voz não se re-escolhe por episódio |
| `thumb-system.yaml` | Os estilos E3/E5/E7/E10 — travados, não se inventa um quinto |
| `title-patterns.md` | Padrões de título que já passaram pelo pontuador |
| `fontes-confiaveis.md` | De quem se aceita âncora de fonte |
| `episodes.json` | Índice dos episódios e do desempenho de cada um |
| `episodios/{slug}/` | O pack de 7 pastas + `publicacao.yaml` como índice |

**O pack tem 7 pastas fixas** (`00-pauta` … `06-final`) e o `publicacao.yaml` é o
índice do episódio: cada estágio lê dele e escreve de volta. `pack.py estado {slug}`
responde a qualquer momento o que falta.

### As armadilhas já pagas — não reabrir

Todas foram medidas ou custaram uma execução inteira.

**Texto e voz**
- Número por extenso **trava o motor de TTS**. Vão em dígitos, ou em frase curta separada.
- A narração submete **bloco a bloco**. O roteiro inteiro faz o nó devolver
  `No adjusted SRT available` — com o ComfyUI reportando `success` mesmo assim.
- Cache por **hash do texto**: reordenar ou inserir bloco não invalida o resto.
- **`audita_narracao.py` não é opcional.** Áudio que toca não prova que diz o que o
  roteiro escreveu — o motor já comeu frase inteira em silêncio. OK até 12% de WER
  (o piso não é zero porque o transcritor também erra). O piloto fechou em 7,9% no
  pior bloco.

**Imagem em movimento**
- **A cartela é CAMADA, nunca fundo.** A primeira versão usou fundo chapado com texto
  por cima: onde o texto acaba sobra cor crua, e onze minutos disso é apresentação de
  slides. Modos: `faixa` (padrão) e `painel` (véu escuro, só quando o **dado** é a
  informação principal).
- O PNG da cartela precisa de `omit_background=True` no Playwright, senão o Chromium
  pinta branco onde o CSS pediu transparente.
- **Foto leva zoom, vídeo não** (vídeo já se move). E o zoom se calcula em 2560×1440
  reduzido para 1080 — direto em 1080p o `zoompan` arredonda para pixel inteiro e o
  movimento anda em degraus. **Medido: 68% de variação contra 28% com a correção.**
- **Consulta de acervo descreve a CENA, não o assunto.** `football fans cheering`
  trouxe duas pessoas com bandeira num estúdio; `soccer ball hitting net goal` trouxe
  uma **cesta de basquete**. E a API da Pexels devolve **403 sem `User-Agent`**.
- **Foto de portal é editorial**, não livre: plano de apoio, nunca thumb nem abertura;
  o `fotos.json` guarda veículo e URL da matéria.

**Áudio e montagem**
- `concat -c copy` **misturou 24 kHz com 44,1 kHz** e o container passou a mentir a
  duração. As três guardas (`audita_narracao`, `mixa`, `monta`) comparam contra a
  duração **medida**, nunca a declarada — foi assim que o defeito apareceu.
- O `loudnorm` já comeu **38 s de silêncio** sem avisar.
- O leito é de **geração própria** (`data/trilhas-and-sfx/`). Num canal dark isso
  importa mais que a qualidade da peça: reclamação de direito autoral em áudio é
  automática e desmonetiza antes de qualquer análise.

### Ponte para o `apps/video-studio` — quatro campos que erram calados

`broll/para_studio.py {slug}` → `outputs/bora-de-bola/video-plans/{slug}/`.
O plano sai de `monta.planeja()`, **a mesma função que renderiza o mp4**: o que se
abre para editar é o que se assistiu.

Estes quatro o studio aceita sem reclamar, e depois desenha errado:

| Errado | Certo | Sintoma |
|---|---|---|
| `x: 0, y: 0` | **`x: 50, y: 50`** | **50 é o CENTRO.** O `ElementWrap` faz `translate(x-50%, y-50%)`; com 0/0 a camada sai meia tela na diagonal |
| `animIn` / `animOut` | `animateIn` / `animateOut` | animação nunca roda |
| `"slide"` | `"sobe"` | **não existe** em `fxCatalog.AnimacaoId` e cai em "nenhuma" |
| `startFromSeconds` | `trimStartFrames` (quadros) | todo take começa do zero |

- **O studio lê `studio-edit.json`, não `timeline.json`.** Só com o timeline ele
  refaz o ingest do zero, em 1080×1920 e em ordem alfabética.
- **Validar sem browser: `apps/video-studio/scripts/still-do-save.ts <client>
  <creative> [frames...]`.** Renderiza o projeto salvo pelo próprio motor. O
  `render-stills.ts` **não serve** para isso — ele monta o timeline por
  `ingestCreative`, ou seja, renderiza o que o studio produziria sozinho, não o que
  foi importado. Conferir pelo preview do browser também não funciona: a página muda
  de escala a cada captura.
- **Os materiais vão por HARDLINK, não cópia.** `Materiais Brutos` é uma segunda
  porta para os mesmos bytes; a cópia duplicava ~186 MB por episódio.
- Cliente novo precisa de linha em `DISPLAY` no `src/app/api/clients/route.ts` — o
  title-case do slug daria "Bora De Bola".
- Gradação e vinheta do ffmpeg **não** viajam: o studio tem o próprio sistema de FX,
  e reproduzi-las criaria um segundo lugar onde a cor se decide.

### O que ainda NÃO é automático

Decisão editorial, de propósito — quem escreveu é quem escolhe:

- **A foto de cada bloco** está em `monta.py:FOTOS_POR_BLOCO`.
- **A marcação de cartelas** está em `broll/cartelas.py:cartelas_do_episodio()`.
  Episódio novo exige escrever a dele — o gerador **recusa slug sem marcação** em vez
  de inventar.

---

## 6.5 · Live de futebol — painel de dados ao vivo

**Estado: montado e ensaiado, ainda não foi ao ar.** O código está completo em
`apps/live-futebol/`; o que falta é operação, não engenharia.

> **Retomada combinada com o founder: ~2026-09-12**, uma semana depois da publicação
> do piloto do VOD. Dois critérios de saída, ambos obrigatórios:
> 1. **Os testes de OBS que faltam** para operacionalizar de fato.
> 2. **Validar um jogo completo, do início ao fim** — não um trecho.

### Isto destrava o `live-stats-panel` do catálogo

O `genre-catalog.yaml` listava este gênero como `backlog` com um bloqueio nomeado:

> *"Capturar a tela de um provedor de placar é violação de termos de serviço; a rota
> correta é API licenciada renderizada em painel próprio. É o principal bloqueio a
> resolver antes de sair do backlog."*

**Esse bloqueio foi resolvido**, e exatamente pela rota que o catálogo apontava:
painel desenhado por nós, alimentado pelos endpoints públicos que a própria ESPN usa
no site. Nada de captura de tela. Status atualizado para `piloto`.

### Por que não uma API paga — a conta que fecha o assunto

Uma partida dura ~110 min; consultando a cada 30 s são **220 requisições por jogo**.
API-Football e KickoffAPI dão **100 por dia** — não cobrem *um* jogo. TheSportsDB só
tem livescore no plano pago; football-data.org dá placar atrasado e sem eventos.
**Não é economia: é o único tier que atende ao volume.**

### O que a live tem

| Peça | Arquivo |
|---|---|
| Servidor e overlay | `servidor.py` · `overlay.html` (Browser Source 1920×1080) |
| Narração | `narrador.py` · `voz.py` · `banco_falas.py` |
| Chat | `chat.py` · `chat_triagem.py` |
| Torcida | `faz_loop_torcida.py` · leito com ducking |
| Operação | `README.md` · `GUIA-OPERACAO.html` |

### Armadilhas de operação já mapeadas

- **"Desligar a fonte quando não estiver visível" tem que ficar DESMARCADO** no OBS —
  senão o overlay recarrega do zero a cada troca de cena e a narração para.
- **Capture o áudio pela FONTE, nunca pela área de trabalho**, senão notificação do
  Discord entra na transmissão. Browser Source → "Controlar áudio pelo OBS", e
  "Monitoramento desligado" para o som ir à live sem sair nas caixas.
- **`/saude` é o único jeito de saber se algo parou.** A live não tem tela de erro —
  ela para em silêncio. A rota devolve tempo no ar, hora da última leitura, placar em
  tela, fila de falas e mensagens lidas.
- **`--chat-teste`** injeta mensagens simuladas a cada 18 s: exercita a interação
  antes de existir canal, que é a situação do ensaio.
- **Retrato de jogador existe para 6,5% do elenco.** A camisa do stitcher é o
  substituto — não construir tela que dependa de foto de jogador.
- Nada do chat é lido literalmente ao ar; só o nome do autor vai.
- No navegador comum use `?fundo=1`, senão a transparência aparece como branco.

---

## 6.6 · Derivação de curtos a partir dos longos

**Método completo: `docs/DERIVACAO-CURTOS.md`.** Estudo fechado em 2026-09-05 com
números medidos. O resumo do que decide:

**A unidade de derivação é estrutural, não temporal.** Um longo rende tantos curtos
quantas unidades autocontidas tiver — não "1 a cada 5 minutos".

| Canal | Unidades por peça | Curtos | Prazo |
|---|---|---|---|
| Estoico A | 6 práticas + tese da abertura | **7** | nenhum |
| Estoico B | 5 reflexões + abertura | **6** | nenhum |
| Futebol | 6 blocos, ~4 autossuficientes | **4** | **~48 h** |

A densidade é quase igual (1 curto a cada ~3 min nos dois); o que difere é o tamanho
da peça e o prazo. **Estoque hoje: 21 unidades** nos 3 LA publicados.

**O curto tem roteiro PRÓPRIO** (decisão do founder). O longo é fonte de matéria-prima
e autoridade, não de áudio — recortar herda um começo no meio do raciocínio, sem hook
nem CTA de vertical. O `@head-of-copy` escreve, com rota já configurada para
`@mrbeast-mk` (hook e retenção) e `@garyvee-mk` (plataforma).

**As faixas** (a 171,6 wpm): 15 s ≈ 42 palavras · 30 s ≈ 85 · 60 s ≈ 171 · 3 min ≈ 514.
A unidade inteira tem 380-494 palavras, então **"curto de 3 min" é escrever mais uma
peça A/B** — formato que já existe e já está validado (A1-A3, B1-B3: 3m08 a 4m33).
**A mesma unidade não vira 15+30+60 no mesmo feed** — isso é canibalização, não escala.

**O gargalo é a imagem, não o roteiro.** Todo o acervo é horizontal (estoico 1344×768,
futebol 1920×1080) e os longos usam 11 imagens em 20 min. Cada curto precisa de 3-5
imagens em 9:16 — rota escolhida: regenerar em 768×1344 (~175 s cada, ~1 h por longo).

**I2V só no take do hook.** É onde o movimento paga. Três coisas antes da primeira fila
vertical: **nenhum preset atual é 9:16** (os sete geram 960×720), **o tempo por take não
está medido**, e câmera parada é o que evita deformação.

**A fila da madrugada já existe:** `assets/comfyui/RODAR-NOTURNO.bat` — espera o
ComfyUI, limpa fila residual, roda um job por vez, loga, e para após 3 falhas seguidas.

**Duas armadilhas medidas:** o `.blocos.srt` deriva 35-71 s do áudio real (é o SRT
escrito, não o medido) — use o `fx-plan.json`, que tem timing palavra a palavra batendo
em 0,6 s. E o RIFE vai em **`bfloat16`**: o float16 derrubou o ComfyUI com
`access violation` em 31/08.

### 6.6.1 · A esteira do curto, executada — LA1 inteiro em 06/09

Sete curtos do LA1 fechados no mesmo dia. **Cinco scripts, nesta ordem**, todos em
`apps/canal-estoico/`:

| Passo | Script | O que entrega |
|---|---|---|
| 1 | `gera_srt_curto.py --todos` | `01-roteiro/narracao.srt` a partir do `roteiro.md` |
| 2 | `run_batch.py --only narracao-clone-v1` | as narrações no ComfyUI |
| 3 | `fecha_narracao_curto.py --todos` | `vo.mp3` no pack + `fala-real.json` |
| 4 | `acervo_curto.py --todos` | takes verticais de acervo + `_CONFERIR.jpg` |
| 5 | `monta_curto.py {slug}` | `04-final/curto.mp4` |

**O SRT deixou de ser digitado.** O do LA1-P1 foi feito à mão; isso não escala para
sete, porque cada correção de texto obriga a recalcular todas as marcas depois dela.
Agora o `roteiro.md` é a única fonte e o SRT é derivado.

**A fila de narração deixou de ser escrita curto a curto.** O `run_batch.py` varre a
pasta `curtos/`: quem tem `narracao.srt` e não tem `vo.mp3` entra. Rodar de novo não
refaz o que já existe.

### 6.6.2 · Grafia do roteiro, tempo do áudio — a regra dos dois donos

O `fala-real.json` é transcrição do Whisper, e o Whisper **erra grafia**. No primeiro
corte ele ouviu "não faz" e escreveu "não faço": erro de concordância na terceira
palavra do vídeo, pego pelo founder.

**O áudio é autoridade sobre QUANDO. O roteiro é autoridade sobre O QUÊ.** Nenhum dos
dois manda nos dois. `alinha()` casa as duas listas com `difflib`; nos trechos em que
divergem, o tempo é interpolado entre as âncoras vizinhas — perde-se décimo de segundo
em algumas palavras e ganha-se a grafia correta em todas.

É a mesma regra do canal de futebol (`fala_real.py`), agora do outro lado.

### 6.6.3 · O que fez o curto virar curto de feed

Quatro defeitos apontados pelo founder no primeiro corte, e o que cada um exigiu:

| Queixa | Causa real | Correção |
|---|---|---|
| "muito lento, parece vídeo longo" | 4 planos, um de 22 s | corte ~2,6 s + movimento diferente por segmento + voz a 1,10× |
| "legendas com defeito nas trocas" | +0,08 s de respiro no fim de cada grupo | o fim de um grupo **é** o início do próximo |
| "não temos overlays" | — | rótulo 3 s, chamada final, vinheta |
| "destaque travado" e desalinhado | âmbar fixo por heurística; drawtext por palavra | **karaokê por palavra em libass** (ver §6.6.5) |
| "barra amarela aleatória" | régua de progresso trazida para dentro da zona segura | **removida** — ver abaixo |

**A régua de progresso não cabe neste formato, e o motivo é estrutural.** Barra de
progresso só lê como progresso quando está *encostada na borda* do quadro, que é onde
todo player desenha a dele. Mas a borda é exatamente onde a UI do app passa por cima
(topo: status e abas; base: perfil e legenda). Trazida para dentro da zona segura, ela
perde a referência de borda e vira um traço solto no terço inferior — foi assim que o
founder a descreveu. Não há posição que resolva: ou some sob a interface, ou não lê como
progresso. A retenção fica por conta do corte curto e do hook picotado.

### 6.6.4 · Acervo vertical — o que ele entrega e o que não entrega

`acervo_curto.py` (Pexels, `orientation=portrait`). **Três rodadas para chegar à
conclusão**, e ela é do material, não de gosto:

**Acervo de banco não entrega figura antiga em registro estoico.** Vieram mármore rosa,
colunata turística com palmeira, estátua em vitrine de museu com luz roxa, templo sob
refletor azul, bosque com poste de rua, mão humana sobre a pedra, tinta verde neon,
tecido vermelho e um panfleto em inglês pregado no tijolo.

**O que ele entrega com consistência é textura abstrata** — pedra em macro, água,
areia, vela, céu de tempestade, rastro de estrelas, fumaça. Nenhuma pode ser
anacrônica, porque não há objeto a datar. **O banco é uma lista fechada e conferida**,
não um sorteio a cada rodada.

> **A regra de consulta:** nomear um OBJETO ("paper", "window", "marble") traz o objeto
> no mundo de hoje, com mão e tudo. Nomear um FENÔMENO ("sand falling", "storm clouds",
> "stars time lapse") traz o fenômeno, que não tem época nem dono.

**Duas guardas, e o limite de cada uma.** A automática mede luma e saturação na
miniatura que a API já devolve — take reprovado não custa download. Calibrada em 13
takes: `luma ≤ 110` e `saturação ≤ 0,18` separa as duas populações. **Onde ela não
alcança:** a floresta verde ensolarada mediu 88,2/0,131, indistinguível da ruína
enevoada (97,8/0,114), que é boa. Cor e brilho não dizem se o assunto é deste canal —
por isso a folha de contato continua obrigatória.

**A assinatura desses curtos não está na imagem**, e isso é deliberado: está na
tipografia em âmbar, na régua, no rótulo e na `GRADE_ACERVO`, que estão em todo quadro.
Figura antiga continua saindo do I2V próprio — e `monta_curto.py` **prefere**
`03-takes/*.mp4` sobre o acervo, então gerar os takes depois e remontar não muda uma
linha de código.

### 6.6.5 · Legenda vertical — o padrão, e os dois erros que o produziram

**A legenda vertical é libass (`.ass`), não `drawtext`.** O motivo é específico.

O `drawtext` posiciona o TOPO da caixa do texto, e a altura da caixa depende
dos glifos. "VOCÊ" com circunflexo tem ascendente maior que "SABE", então a
caixa é mais alta e a palavra **desce**. Desenhando uma `drawtext` por palavra —
que era como o karaokê estava feito —, toda palavra acentuada sentava mais
baixo que as vizinhas. Em português isso é quase toda frase.

O libass desenha a **linha**, não a palavra: a cor entra como tag `\c` dentro do
texto e o layout — baseline, espaço, quebra — é idêntico em todas as janelas do
grupo. O karaokê vira uma `Dialogue` por palavra, sempre com a linha inteira,
mudando só qual palavra está em âmbar. Nada pula quando o destaque anda.

`Alignment=5` (centro/meio) com `\pos`: o ponto mira o CENTRO do bloco, o que
torna a posição previsível com uma ou com duas linhas.

**Zona segura — a conta, não o número herdado.**

| Faixa que o app cobre | Medida (1080×1920) |
|---|---|
| Perfil / legenda / áudio na BASE | **420 px** |
| Coluna de botões à DIREITA | **180 px** |
| Status + abas no TOPO | ~130 px |

Os dois primeiros vêm do farming (`farm-assemble.js`), medidos na interface
real. **Mas a margem lateral do farming não serve aqui.** Eles usam 120 px, o
que com texto centrado põe a linha cheia até x=960 — e a coluna começa em 900.
Nos 120 funcionam porque a legenda deles tem corpo 56 e raramente enche a
linha; a nossa tem corpo 92 em caixa-alta e enche sempre. **A margem correta é
190** (área livre 0–900, texto de 190 a 890, 10 px de folga).

Posição: **58% da altura**. A versão anterior punha a legenda em 67% e a
chamada final em 82% — esta última DENTRO da faixa de base, ou seja, existia no
arquivo e não existia no feed.

**O `Fontsize` do `.ass` não é o corpo em pixels, e o fator depende da
família.** O farming mede 0,728 e diz explicitamente que é da Montserrat.
Herdado sem medir, saiu 20% menor que o pedido. **Medido para a Impact:
0,8168** (`Fontsize 100 → 628 px de tinta`; `137,36 → 861 px`).

> **A guarda:** `apps/canal-estoico/prova_zona_segura.py` desenha as três
> faixas em vermelho sobre três frames do vídeo pronto. Não dá para "testar
> publicando"; dá para desenhar na medida certa e olhar. Foi ela que pegou os
> 120 px e a régua no topo — os dois estavam certos no arquivo e errados no
> feed.

### 6.4.1 · Duas armadilhas que voltaram em 07/09

**O base64 URL-safe mordeu de novo, em outro template.** Em 06/09 ele deixou 6
de 20 cartelas 100% transparentes e a correção entrou no `cartela.html`. Em
07/09 o mesmo defeito apareceu no `thumb/estilos.html`, que também usa `atob`.

O modo de falhar é o pior possível: **depende de o payload conter `-` ou `_`**.
As nove primeiras variações renderizaram bem; ao mudar UMA string do dicionário
todas passaram a cair no `catch`, que troca o `<body>` pela mensagem de erro. O
Playwright então falha com *"timeout esperando o locator #alvo"* — que não diz
absolutamente nada sobre base64.

> **A regra:** todo template que recebe dado por query string precisa do
> `replace(/-/g,"+").replace(/_/g,"/")` antes do `atob`. Os dois do canal já
> têm; qualquer template novo nasce com ele.

**Nome de bloco não pode carregar subtítulo.** `## BLOCO 1 — O primeiro pênalti`
lê melhor que `## BLOCO 1`, mas esse nome é a **chave** que o
`monta.FOTOS_POR_EPISODIO` e o `cartelas.py` usam. Com o subtítulo junto, 8 dos
13 blocos casaram com nada e teriam ido ao ar sem uma foto e sem uma cartela.

Corrigido em `blocos_do_roteiro`, que é onde os três lados leem o identificador
— e não em cada consumidor. O roteiro fica livre para ter subtítulo.

### 6.4.2 · Thumb de confronto — legenda por painel

`estilos.html` ganhou `legenda_a` / `legenda_b`: uma frase presa ao rodapé de
**cada metade**. Resolve o que a faixa única não resolve — com dois personagens
no quadro, faixa de largura total não diz de QUEM é a frase.

**Medido:** legenda por painel não se lê aos 168 px. Meio quadro não comporta
texto grande: no maior corpo que ainda cabe em uma linha (60 px, para 20
caracteres), a letra vira 7,9 px no feed. Isso é limite do desenho, não ajuste
que faltou. **As variações com faixa são as únicas que entregam leitura de
longe**; nelas a faixa trabalha no feed e a legenda recompensa quem abre grande.

**Dois painéis pedem dois RECORTES, não `object-position`.** Tentar enquadrar
cada um deslocando a mesma foto larga não funciona: com `cover`, um painel de
640×720 a partir de 1280×840 escala pela altura e a faixa visível fica com
747 px do original — larga o bastante para conter os dois jogadores. As nove
variações saíram com o mesmo par repetido dos dois lados.

### 6.4.3 · Âncora de cartela — casar por caractere, dentro do bloco

Duas correções em 07/09, e as duas nasceram de **medir**, não de olhar.

**O casamento é por CARACTERE, não por palavra.** Duas das 26 cartelas não
resolviam, e as duas por defeito do transcritor:

| Âncora escrita | O que o Whisper transcreveu |
|---|---|
| `Cruzeiro 3 Athletico Paranaense 1` | `cruzeiro 3 atletico para naense 1` |
| `O Corinthians teve 62 por cento de posse de bola` | `o corinthians teve 62 de posse de bola` |

Palavra **partida** (`para naense`) destrói qualquer casamento por token, e
palavra que **some** (`por cento`) desalinha a janela dali para a frente. Não há
tolerância por palavra que resolva os dois. Concatenando os caracteres, os dois
viram diferença pequena: `paranaense` e `para naense` ficam idênticos sem o
espaço, e `athletico` difere de `atletico` em 1 de 9.

**A busca é restrita ao BLOCO da cartela.** Ratio alto não garante posição
certa — e isso só apareceu ao medir. No episódio de 06/09 a âncora
`"se inscreve no canal"` casou com **ratio 0,850**, alto, aos **605 s**, no
FECHO — e a cartela é do CTA, aos 120 s. A frase existe nos dois lugares.

A cartela já declara o bloco, e o bloco tem início e fim conhecidos. Procurar
fora dele nunca foi útil: era só superfície para errar.

**Efeito na tela do defeito antigo:** cartela sem âncora resolvida cai no
espalhamento uniforme do bloco. Em 07/09 isso fez a **mesma cartela aparecer
três vezes** no BLOCO 6, intercalada com outra — que na tela lê como piscada.

> **A guarda não pegava.** O `audita_camadas.py` olha cada intervalo isolado:
> a cartela repetida aparecia e permanecia nos três, e ele aprovou 28
> intervalos para 26 cartelas sem reclamar. Repetição não-contígua da mesma
> cartela dentro de um bloco é defeito que ele ainda não mede.

Depois da correção: **26 intervalos para 26 cartelas** em 07/09, e 20 para 20 no
episódio de 06/09 — que também tinha o defeito e ninguém tinha visto.

**Limiar 0,72, medido.** Dentro do bloco, as âncoras boas ficaram entre 0,738 e
0,941 nos dois episódios. Abaixo disso é âncora escrita diferente do que foi
falado, e aí o espalhamento uniforme é o comportamento correto.

---

## 6.7 · Canais dark do TikTok — `curiosidades-animais` e `placas-de-aviso`

Dois perfis novos, modelados em canais validados do YouTube/TikTok, publicando
**só no TikTok** até liberar o Shop. O motor é o mesmo `monta_curto.py`; o que
muda é o formato.

> **O método completo, com todos os números medidos, está em
> `docs/CANAIS-TIKTOK-DARK.md`.** Aqui fica só o que não se descobre lendo o
> código.

### O que estes canais acrescentaram ao motor (07-08/09)

| peça | arquivo | o que faz |
|---|---|---|
| CTA por gesto do TikTok | `apps/canal-estoico/camadas_curto.py` | pílula com aberração cromática; `gesto()` e `grupo()` |
| placa de aviso + seta | `apps/canal-estoico/placa_aviso.py` | a assinatura do canal de placas, em primitivas do PIL |
| hook gerado | `apps/canal-estoico/hook_imagem.py` | a cena improvável do primeiro plano, no Flux2-Klein |
| remoção de legenda | `apps/video-tools/limpa_legenda.py` | entrega o original limpo ao lado do nosso corte |
| guarda de conteúdo do acervo | `acervo_curto.py` | `exige` + vetos, pela slug do Pexels |
| âncora de take e de camada | `monta_curto.py` | tudo entra no trecho da fala que o pede |

### As cinco decisões do founder que não estão no código

1. **A voz é a do vídeo que ele indicou.** Clonada, e a montagem **não** corrige
   pitch nem velocidade em cima dela (`voz: 1.0`, `pitch: 1.0`).
2. **CTA é gesto do TikTok**, nunca do YouTube. Primeiro SEGUE; depois COMENTA
   ou o trio. **SALVAR fica de fora** — não move seguidor nem alcance agora.
3. **O visual do CTA é a aberração cromática**, não a cor da marca. Pílula
   vermelha chapada com ícone branco "ainda parece de YouTube".
4. **Tapar legenda não é remover.** A entrega tem de reconstruir o fundo.
5. **O primeiro take é imagem gerada**, estática, com o absurdo do benchmark —
   e, quando recebe camada por cima, o fundo dela tem de ser limpo.

### A armadilha que voltou três vezes em dois dias

**Passo que relata sucesso sem ter feito o trabalho.** O cache de narração
dizia `(mantido)` com a voz velha; o `fala-real.json` valia por existir e
alinhava a legenda a um áudio que não estava mais lá; o `delogo` recusava
`w=iw-2`, o ffmpeg devolvia o quadro cru e a medição comparava o vídeo com ele
mesmo dando 1,00 sempre.

Em todos, o console dizia que deu certo. A regra que ficou: **artefato derivado
compara data com o pai, cache contém todas as entradas na chave, e medição de
efeito confere que o efeito foi aplicado.**

---

## 7 · Packs prontos

| Pack | Estado |
|---|---|
| `assets/pack-estoico-yt/` | 16:9 para YouTube. 4 cenas × 3 sementes. Anomalias do v1 corrigidas. `VALIDACAO.md` aguarda escolha de semente |
| `assets/pack-estoico/` | Pack quadrado v1 — **legado**, serve como registro do que deu errado |
| `data/trilhas-and-sfx/` | 21 peças aprovadas |
| `data/voice-packs/` | Portfólio validado |
| `workspaces/.../canais/bora-de-bola/` | **Canal de futebol ativo** — brief, voice-lock, thumb-system e o pack do piloto publicado (§6.4) |
| `apps/live-futebol/` | Overlay de live completo — montado e ensaiado, aguardando primeira transmissão (§6.5) |

---

## 8 · Como o squad é acionado

`/oraclum-studio` — skill em `.claude/skills/oraclum-studio/SKILL.md`. Classifica o
gênero, instancia o pipeline e conduz os estágios. Ela aponta para **este arquivo**
como primeira leitura, justamente para não reabrir investigação já feita.

Planos e documentos vivos:

| Documento | Assunto |
|---|---|
| `docs/PLANO-COMPOSICAO-DARK-16x9.md` | Próximo marco — montar a peça estoica no `apps/video-studio` |
| `docs/PIPELINES.md` | Os seis pipelines |
| `docs/APRENDIZADOS-CURSOS.md` | Mapa da mineração dos cursos |
| `docs/NARRACAO-LOCAL.md` | Como rodar narração no stack local |
| `apps/canal-futebol/ESTEIRA.md` | **Runbook do episódio de futebol** — do fato ao vídeo publicado (§6.4) |
| `apps/live-futebol/README.md` | **Operação da live** — OBS, áudio, chat, `/saude` (§6.5) |

Há também skills próprias que entram **antes** do `/oraclum-studio` na esteira de
futebol, e que resolvem estágios específicos:

| Skill | Estágio |
|---|---|
| `/pauta-futebol` | etapa 0 — acha o que merece virar vídeo hoje |
| `/packaging` | etapa 1 — título e thumb pela Regra de 3, **antes** do roteiro |

---

## 9 · Pendências abertas

### Curtos derivados — o primeiro lote

- **Lote de calibração LA1 — EXECUTADO em 06/09.** Os 7 curtos estão montados em
  1080×1920 (§6.6.1). Faixas: 1×15 s, 3×30 s, 3×60 s. **Aguarda aprovação e
  publicação do founder.**
- **Seis dos sete saíram de acervo, não de I2V.** O P1 tem take próprio e lê
  visivelmente melhor. A troca é de graça (`monta_curto.py` prefere `03-takes/*.mp4`),
  então a ordem é: publicar, medir retenção aos 3 s, e gastar GPU só no que provou.
- **Preset Wan vertical não existe.** Os sete presets I2V geram a 960×720. Curto 9:16
  exige um preset novo (provavelmente 720×1280), validado contra a tabela de pico de
  memória do `gera_workflows_wan.py` **antes** de enfileirar uma madrugada.
- **Tempo por take de I2V nunca foi medido.** Nenhum doc registra segundos por take.
  Medir UM antes de montar fila grande — uma fila de 20 takes com tempo desconhecido
  pode não caber na noite.
- **O que medir depois do lote:** retenção aos 3 s **por faixa**. É o número que diz se
  o formato de 15 s é sonda útil ou desperdício, e ele decide o resto do plano.

- **O corte de título do `pilares.py` está fixo em 55 caracteres**, que é o do feed
  do YouTube longo. Em **Shorts o corte é 35** (material de tráfego orgânico,
  importado em 06/09 — ver `docs/DERIVACAO-CURTOS.md` §9.1). Um título aprovado
  para o longo **não está aprovado** para o curto derivado dele. Deveria ser
  parâmetro por plataforma, não constante.

### Canal de futebol e live — as com data marcada

- **URL do piloto no `publicacao.yaml`** — o vídeo foi publicado em 2026-09-05, mas
  `url`, `canal_id` e `publicado_em` continuam vazios porque só o founder tem o link.
  Sem eles o `episodes.json` não fecha.
- **Desempenho do piloto em D+7 (≈2026-09-12) e D+28** — impressões, CTR e retenção
  média. **O CTR do piloto é a linha de base do canal:** sem ele nenhum título futuro
  tem contra o que ser medido, e a Regra de 3 fica sem realimentação.
- **Live de futebol — retomar ≈2026-09-12**, uma semana depois da publicação do
  piloto. Dois critérios de saída, combinados com o founder:
  1. os **testes de OBS que faltam** para operacionalizar;
  2. **validar um jogo completo, do início ao fim** — não um trecho.
  O código está pronto; a pendência é de operação, não de engenharia (§6.5).
- **Episódio 2 do Bora de Bola** — a esteira está executável ponta a ponta
  (`ESTEIRA.md`). Falta só a decisão de pauta, que depende do calendário de jogos
  (`GUIA-DIAS-DE-JOGO.md`).
- **`apps/live-futebol/README.md` está sem acentuação** ("nao", "audio",
  "configuracao"). É doc de operação que será lido sob pressão, ao vivo. Correção
  cosmética, não urgente.

### Demais

- **Escolha de semente** do pack 16:9 — só o founder decide
- **O detailer se paga?** Teste `cru → upscale` contra `cru → detailer → upscale` ainda não rodado
- **Teste de prosódia isolada** — a maior alavanca do pack de voz, ainda não feito
- **Takes do Airbnb** com Wan — planejados, não gerados
- **Composição no `apps/video-studio`** — próximo marco da peça estoica
- **Contradição do `gate-audio` AU-A-07** — exige origem de voz licenciada ou autorizada, e a voz embutida do ChatterBox não é nenhuma das duas. Precisa de decisão do founder
- **Stems e trilha acima de 60 s** — não existem no pack de áudio
- **Paleta ciano da Oraclum** — `video-templates.yaml` pinta em ciano contra um brand-config sem ciano
- **Escolha do nível da v2** — `assets/fidelidade-v2/STORYBOARD.md`, uma variação por take. Trava o lote B (3 peças de ~20 min na estrutura B, 151,1 wpm)
- **Inspeção do pack do lote A** — `assets/canal-estoico/LA{1,2,3}-*-cru.jpg`. Só depois de aprovado é que vale gastar acabamento PRO
- **Narração dos 3 longos** — ~60 min de áudio, rota PRO por `.blocos.json`. Ainda não gerada; sem ela a timeline das peças longas não fecha
- **Ecossistema de transições e catálogo de efeitos** no `apps/video-studio` — pedido do founder (dinâmica CapCut: entrada/saída como uma coisa + objeto de transição entre dois takes), não iniciado
