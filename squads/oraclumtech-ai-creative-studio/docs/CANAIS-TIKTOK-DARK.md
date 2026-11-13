# Canais dark do TikTok — o método, medido

> **Escopo.** `curiosidades-animais` e `placas-de-aviso`, os dois perfis que vão
> **só para o TikTok** até liberar o Shop. Tudo aqui saiu de dois dias de
> produção (07 e 08/09) com o founder validando quadro a quadro. Cada número
> foi medido; cada regra existe porque um defeito apareceu na tela.
>
> **Complementa** `METODO-INSERT-ANIMAL.md` (a forma dos vídeos modelados) e
> `DERIVACAO-CURTOS.md` (o motor de curto). Este documento é o que fica ENTRE
> os dois: como usar o motor para produzir neste formato.

---

## 1 · A voz — e o erro de calibração que custou dois dias

A voz é **clonada** da referência que o founder indicou (`ref-amazonia.wav`,
extraída de dois trechos contínuos de fala, 24,4 s, com `highpass=70`,
`afftdn` leve e `loudnorm`). Fica em `ComfyUI/input/`.

**O clone estava certo desde o começo; quem estragava era a montagem.**

| etapa | F0 |
|---|---|
| referência do founder | 130,4 Hz |
| clone do ChatterBox | 127,7 Hz — já tinha chegado |
| **depois do `pitch: 0.88` do motor** | **108,6 Hz** |

`voz: 1.22` e `pitch: 0.88` foram calibrados quando a narração saía da voz da
CASA (159 Hz, ~196 wpm) e serviam para *aproximar* da referência. Com clone,
eles **desfazem** o clone. **Os dois voltam a 1.0** — está assim no `CANAIS`
do `monta_curto.py`.

O ritmo tinha o mesmo vício: o "239 wpm" da config veio do OUTRO vídeo do
benchmark. A referência real fala a **128 wpm** (155 palavras em 72,6 s).

> **Regra geral.** Ao ligar clonagem em qualquer canal, zerar as correções de
> pitch e velocidade antes de julgar o resultado — e medir o F0 do **vídeo
> final**, não o do `vo.mp3`.

### Dois caches que escondiam a troca de voz

Ambos relatavam sucesso:

1. `narra_comfy.py` chaveava o cache de bloco **só pelo texto**. Voz nova,
   mesmo texto → devolvia o mp3 antigo com `(mantido)`.
   **Corrigido:** a chave é `texto + voz_ref`.
2. `fecha_narracao_curto.py` dava o `fala-real.json` por válido **por existir**.
   Renarrando, os tempos de palavra ficavam do áudio anterior — legenda e
   âncoras alinhadas a um áudio que não estava mais lá.
   **Corrigido:** só vale se `mtime(json) >= mtime(vo.mp3)`.

---

## 2 · Os takes — a âncora e a guarda de conteúdo

### 2.1 Âncora na fala, não distribuição uniforme

Distribuição uniforme serve quando o take é atmosfera. **Não serve quando o
roteiro diz o NOME do que está na tela** — ali a imagem errada não é ilustração
fraca, é informação errada.

Cada consulta do `curto.yaml` declara em que trecho da fala ela entra:

    - {q: "stingray swimming sandy bottom", etiqueta: "5-arraia", n: 3,
       exige: [stingray, ray], ancora: "Numero cinco a arraia de agua doce"}

Três coisas que a âncora exigiu:

| | |
|---|---|
| casar por **caractere**, não por token | o transcritor parte e come palavras |
| restringir ao **bloco** | ratio alto não garante posição certa |
| normalizar **numeral por extenso → dígito** | o roteiro diz "número três", o transcritor escreve "Número 3" — o CTA sumia sem aviso |

### 2.2 `n:` — dois ou três clipes por âncora

Um clipe por âncora resolvia o take ERRADO e deixava o take PARADO: 7 takes
para 46 segmentos = **39 repetições consecutivas**. Com `n: 2` ou `n: 3` por
etiqueta, o trecho continua sendo o bicho certo e volta a ter corte.

Medido: **39 → 0** e **44 → 0** repetições consecutivas.

A âncora é por **etiqueta**, não por nome de arquivo — o `tNN-` é ordem, não
identidade, e muda quando a consulta pede mais clipes.

### 2.3 A guarda de conteúdo — a slug do Pexels

O filtro olhava duração, orientação e tom. Nunca o **assunto**. Num acervo de
29 takes aprovados havia cinco erros silenciosos: modelo de estúdio com píton
como cobra-coral, mulher nadando como sucuri, hipopótamos como sucuri, cascalho
como formiga, pôr-do-sol como cobra.

O sinal já vinha no payload — a URL do Pexels carrega descrição escrita por
gente (`/video/elegant-model-with-snake-in-studio-shoot-28879317/`):

| regra | o que barra |
|---|---|
| `exige` (por consulta) | a descrição tem de citar o assunto |
| `VETO_PESSOA` | gente/estúdio nunca é take de bicho selvagem |
| `VETO_CENA` | encantador de serpentes, zoológico, aquário: bicho certo, cena falsa |

**Duas armadilhas ao calibrar a guarda:**

1. **Casar por trecho barra o certo.** `mangrove` contém `man`; `puppies` não
   contém `puppy`. Casar por **token** e por **radical**.
2. **Veto largo come material bom sem dizer.** `street` barrava `street-dog`,
   que é o assunto do canal de placas.

### 2.4 Quando o banco não tem a espécie, gera

Cobra-coral **não existe no Pexels** — as 42 respostas das duas consultas eram
pôr-do-sol, naja, cobra-d'água e salamandra. O fallback antigo era o banco
genérico do canal, ou seja: mostrar OUTRA cobra enquanto a locução diz "coral".

`imagem:` no `curto.yaml` dispara o `hook_imagem.py` (Flux2-Klein) e o motor
anima a PNG com push lento.

---

## 3 · O hook — imagem gerada, estática

No vídeo modelado o primeiro plano é uma **onça carregando um boto-cor-de-rosa
pela ribanceira**, quase parada por 3 s enquanto as palavras do título entram.
Ela não ilustra o roteiro: ela é a **aposta**. Cena improvável o bastante para
o dedo parar antes de o cérebro decidir se é verdade.

- `hook_imagem.py` gera no Flux2-Klein, vertical nativo (1080×1920).
- Entra como segmento 0 com **push lento** (`entra`). Quadro **congelado** lê
  como travamento no feed, não como pausa dramática.
- Pan revela borda inventada; não usar.

**Armadilha:** o hook desloca o corpo. `sequencia_ancorada` precisa receber
`t0_corpo`, senão **toda** âncora entra adiantada pela duração do hook (a
arraia aparecia enquanto a locução ainda dizia "cinco bichos da Amazônia").

**Fundo de hook com camada por cima tem de ser LIMPO.** O primeiro hook do
canal de placas era um veado no meio da estrada com placas de trânsito reais
nas duas margens: a nossa placa entrava por cima e brigava com as do fundo, e
o bicho ficava atrás dela. Trocado por estrada vazia entrando na neblina, com
o terço superior vazio.

---

## 4 · As camadas — e por que elas são o formato

Medido em `METODO-INSERT-ANIMAL.md`: no benchmark o emoji cai no exato instante
da reação e o botão aparece na frase que pede a inscrição. **Não é enfeite — é
o que faz a locução ter interlocutor.** O piloto sem elas foi resumido pelo
founder como "não está nada parecido".

Cada camada ancora num **trecho da fala**, não num segundo fixo.

    camadas:
      - {tipo: placa, pict: nao-alimentar, larg: 0.60, pos: meio, dur: 4.2,
         ancora: "Se voce ver essa placa numa estrada de parque"}
      - {tipo: seta, larg: 0.30, ang: 34, pos: 1010, x: 0.10, dur: 3.4,
         atraso: 0.6, ancora: "Se voce ver essa placa numa estrada de parque"}
      - {tipo: emoji, glifo: "!?", px: 230, pos: topo, dur: 2.0,
         ancora: "Bro o que essa placa quer dizer"}
      - {tipo: gesto, gesto: seguir, px: 260, pos: baixo, dur: 2.8,
         ancora: "se voce gosta de bicho me segue aqui"}

### Slots em y (quadro de 1920, zona segura de 06/09)

| slot | y | por quê |
|---|---|---|
| `topo` | 620 | em 340 o emoji encostava no rótulo, longe de onde o olho está |
| `meio` | 780 | onde a placa se planta |
| `acima-legenda` | 900 | acima da legenda, centrada em 1114 |
| `baixo` | 1300 | acima dos 1500 onde a UI do app começa |

### Emoji é PNG, não `drawtext`

Emoji do Segoe é fonte COLR/CPAL. O `drawtext` do ffmpeg desenha a camada de
contorno e joga a cor fora — sai glifo preto chapado. O PIL lê a tabela de cor
(`embedded_color=True`).

### A seta

O `Image.rotate` do PIL gira **anti-horário**. Com `-34°` a seta apontava para
baixo-direita, para a estrada vazia. Para apontar PARA a placa (acima e à
direita de onde nasce) o ângulo é **positivo**.

---

## 5 · Os CTA — gestos do TikTok

Estes canais vão **só para o TikTok**. CTA de YouTube ali é ruído duplo: pede
um gesto que não existe na tela (não há "inscrever", há "seguir") e usa uma
marca de outro app.

### O visual é a aberração cromática, não a cor

A primeira versão era pílula vermelha chapada com ícone branco. Tinha o **verbo
certo** e o **visual errado** — o founder disse na hora que "ainda parece de
YouTube". Cor de marca sem a linguagem gráfica da marca não transfere nada.

O que faz ler como TikTok: **a mesma pílula desenhada três vezes** — ciano
(`#25F4EE`) deslocado para cima-esquerda, rosa (`#FE2C55`) para baixo-direita,
preta por cima — com o ícone numa **bolha branca** à esquerda.

### Chamar por GESTO, não por texto + ícone

`cc.gesto("seguir"|"curtir"|"comentar"|"salvar"|"compartilhar")` traz o verbo e
o ícone certos juntos. É o que impede a combinação errada — foi assim que saiu
"INSCREVA-SE" com sino do YouTube num vídeo que só vai para o TikTok.

`cc.grupo([...])` empilha o trio.

### Ordem e posição — decisão do founder, 08/09

| | |
|---|---|
| **1º CTA** | **SEGUE** — único gesto que move um perfil novo |
| **2º CTA** | COMENTA, ou o trio CURTE/COMENTA/COMPARTILHA |
| SALVAR | **fora** — não move seguidor nem alcance neste momento |

O trio ocupa três alturas de pílula: em `pos: 1120` engole a legenda (centrada
em 1114) e a tarja da chamada final. Vai em **700**.

**O roteiro acompanha:** "se inscreve no canal" → "me segue aqui"; e o fecho
pede comentário, não "salva".

---

## 6 · O original sem legenda — entregue junto

Padrão de entrega: `04-final/original-limpo.mp4` ao lado do `curto.mp4`.
Ferramenta: `apps/video-tools/limpa_legenda.py`.

### Três detectores, porque há três estilos de legenda

| sinal | pega | falha em |
|---|---|---|
| contorno duro | legenda com traço preto | texto com sombra suave |
| carimbo imóvel | marca d'água fixa | texto fino a 360 px (o antialias mata) |
| **cadência de letra** (5+ manchas de 2-26 px na linha) | legenda sem contorno | mancha clara grande e contínua |

O canal PT precisou do primeiro; o canal EN só respondeu ao terceiro (dava 0,15
no detector de contorno — o mesmo valor do fundo).

### Remoção de verdade é reconstrução

`delogo` estica a borda e `cobrir` tapa — os dois deixam marca porque inventam,
e **o founder rejeitou tapar**. A rota é **LaMa**
(`pip install --no-deps simple-lama-inpainting`; o torch já existe), 0,30 s por
quadro na CPU: ~10 min num vídeo de 60 s.

**Máscara por pixel não converge neste material.** Quatro critérios testados,
os quatro confundem legenda com cena:

| critério | falha medida |
|---|---|
| brilho | espuma do mar = 93% da faixa marcada |
| brilho + traço fino | pelo branco do cachorro entrou junto |
| cercado por contorno | só pegou pedaços de letra a 360 px |
| parado na janela | plano estático também fica parado |

Com meia máscara o LaMa tira o glifo e deixa o halo, que denuncia igual.

**O que funciona é reconstruir o BLOCO** — uma caixa só para o vídeo inteiro,
medida pelo perfil de linhas e colunas e **espelhada no centro** (legenda de
curto é centralizada). Caixa por quadro respira e a textura pisca.

**Borrar pelo tempo não funciona.** Buscar o pixel descoberto em outro quadro
parecia certo — a legenda troca de frase. Mas o doador tinha a aura da frase
anterior (trocou legenda por legenda) e, depois de um corte, pertence a outro
plano: saiu pelagem de onça no meio do rio.

**A faixa analisada precisa de 66 px de folga fixa** (26 da margem da caixa +
40 de contexto para o LaMa ler). Proporcional à altura não serve: numa faixa de
122 px daria 244 e a banda tomaria o quadro.

### Três armadilhas que davam sucesso falso

1. `dtype=int16` nos quadros: `r*299` da luminância estoura 32767 e dá a volta.
   O texto BRANCO ficava invisível para a guarda — o LaMa comia a palavra verde
   e deixava a linha branca do lado, intacta. **Apareceu duas vezes**, em
   funções diferentes.
2. `delogo` recusa `w=iw-2` — o parâmetro é inteiro, não expressão. O ffmpeg
   devolvia o quadro CRU e a medição comparava o vídeo com ele mesmo, dando
   1,00 sempre.
3. Nome de temporário fixo: duas limpezas em paralelo escrevem por cima dos
   quadros uma da outra, e uma conclui "nenhuma faixa de texto encontrada" sem
   erro nenhum. Nome com o PID resolve.

---

## 7 · A esteira, na ordem

    # 1. roteiro e curto.yaml escritos à mão
    #    (consultas + exige + ancora + camadas)

    # 2. hook gerado
    python apps/canal-estoico/hook_imagem.py {SLUG} --canal {curiosidades|avisos}

    # 3. acervo, com a guarda de conteúdo
    python apps/canal-estoico/acervo_curto.py {SLUG} --canal {curiosidades|avisos}
    #    conferir SEMPRE a folha _CONFERIR.jpg antes de montar

    # 4. narração clonada
    python apps/canal-futebol/narra_comfy.py {SLUG} --curto \
        --canal-dir {.../canais/{canal}} --voz-ref ref-amazonia.wav

    # 5. transcrição (tempos de palavra)
    python apps/canal-estoico/fecha_narracao_curto.py {SLUG} --canal {canal}

    # 6. montagem — rascunho primeiro, sempre
    python apps/canal-estoico/monta_curto.py {SLUG} --canal {canal} --rascunho
    python apps/canal-estoico/monta_curto.py {SLUG} --canal {canal}

    # 7. original sem legenda, ao lado do final
    python apps/video-tools/limpa_legenda.py "{original}.mp4" \
        -o "{pack}/04-final/original-limpo.mp4"

**Em série, não em paralelo.** A limpeza usa 8 threads de CPU; dois processos
disputando não ganham tempo e já colidiram nos temporários.

### O que conferir antes de aprovar

| | onde |
|---|---|
| take casa com o que a locução nomeia | folha de contato de 10 quadros |
| repetições consecutivas | o próprio motor imprime — tem de ser **0** |
| camadas nos instantes certos | folha de contato nos segundos das âncoras |
| F0 do vídeo final ≈ 128 Hz | medir no `curto.mp4`, não no `vo.mp3` |
| CTA não cobre a legenda | quadro no segundo do CTA |

---

## 8 · A lição que se repetiu em todas as frentes

**Número herdado de outra calibração não sobrevive à troca da fonte do sinal.**

| número | veio de | quebrou porque |
|---|---|---|
| margem 120 px | farming | linha centrada chega a x=960, a coluna começa em 900 |
| fator 0,728 | Montserrat | Impact mede 0,8168 |
| guarda luma ≤ 110 | estoico | acervo de bicho é claro |
| `pitch 0.88` | voz da casa | o clone já chega em 127,7 Hz |
| `239 wpm` | outro vídeo do benchmark | a referência fala a 128 |

E a segunda: **guarda que aprova um item por vez não vê padrão**. O
`audita_camadas.py` aprovou uma cartela que aparecia 3 vezes porque cada
intervalo passava sozinho; o filtro de acervo aprovou uma modelo de estúdio
porque duração, orientação e tom estavam certos.
