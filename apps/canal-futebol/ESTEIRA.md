# Esteira de um episódio — Bora de Bola

Do fato ao `video.mp4`, na ordem em que se executa. Cada etapa produz um arquivo
dentro do pack do episódio (`workspaces/.../canais/bora-de-bola/episodios/{slug}/`),
e `pack.py estado {slug}` responde a qualquer momento o que ainda falta.

> **A ordem não é sugestão.** Embalagem vem antes de roteiro porque o roteiro
> cumpre a promessa do título — o contrário produz vídeo que entrega coisa
> diferente da que foi clicada, e é isso que derruba retenção nos primeiros
> trinta segundos.

---

## 0 · Pauta — o que aconteceu

```bash
python -X utf8 ../pauta-futebol/pauta.py            # RSS: mercado, bastidor, polêmica
python -X utf8 ../pauta-futebol/fonte_api.py        # ESPN: o que o jogo em si gerou
```

Saída: `00-pauta/fato.json`. **Duas frentes de propósito** — o jogo gera pauta e o
que se fala fora dele também; nenhuma das duas cobre a outra.

## 1 · Embalagem — título e thumb, antes do roteiro

```bash
python -X utf8 ../regra-de-3/gerador.py --nicho futebol --fato 00-pauta/fato.json
python -X utf8 thumb/gera_thumb.py {slug}
```

Saída: `01-embalagem/{titulo.md, candidatos.json, thumbs/, thumb-final.png,
publicacao-seo.md}`.

O pontuador da Regra de 3 (`../regra-de-3/pilares.py`) é determinístico: os três
pilares — imediatismo, curiosidade, resolução — precisam caber **antes do
caractere 55**, que é onde o feed corta. Pilar depois do corte vale metade.

**A thumb não repete o título.** Ela mata a objeção que o título não teve espaço
para matar; repetição é o espaço mais caro do vídeo gasto duas vezes com a mesma
frase.

## 2 · Roteiro — cumprir a promessa

Saída: `02-roteiro/{roteiro.md, claim-ledger.json}`.

O roteiro **é a entrada do TTS**: números vão em dígitos ou em frase curta
separada (número por extenso trava o motor — está medido), e siglas vão
soletradas onde o motor erraria.

Toda afirmação factual tem entrada no `claim-ledger.json` com âncora de fonte.
Frase sem entrada é ligação ou **opinião declarada como opinião**. Fala entre
aspas atribuída a pessoa nomeada só existe se estiver literal na fonte.

## 3 · Narração

```bash
python -X utf8 narra_comfy.py {slug}          # ComfyUI · ChatterBox v3
python -X utf8 audita_narracao.py {slug}      # transcreve de volta e mede WER
```

Saída: `03-narracao/{vo.mp3, _blocos/}`.

- Submete **bloco a bloco**. O roteiro inteiro de uma vez faz o nó devolver
  `No adjusted SRT available` — com o ComfyUI reportando `success` mesmo assim.
- Reaproveita por **hash do texto** (`_blocos/cache/`). Reordenar ou inserir
  bloco não invalida o que não mudou.
- **A auditoria não é opcional.** Áudio que toca não prova que diz o que o
  roteiro escreveu; o motor já comeu frase inteira em silêncio. OK até 12% de
  WER — o piso não é zero porque o transcritor também erra.
- **Marcador de imagem NÃO vai no roteiro deste canal.** A marcação de b-roll
  vive em `monta.py:FOTOS_POR_BLOCO` e `broll/cartelas.py`; o roteiro é só fala.
  Escrever `**[img 01 — ...]**` no corpo (que é o padrão do canal ESTOICO) fez o
  `narra_comfy` tratar cada marcador como cue: o nó de TTS recebeu algo sem fala
  e **sintetizou o placeholder dele em inglês** — *"you need to add some text for
  me to talk"* — dentro do mp3. Foram 11 cues de lixo em 06/09, e só a auditoria
  de WER pegou (8 blocos reprovados, pior caso 266%).
  O `narra_comfy` agora **filtra linha que é só `[...]`**, mas o padrão do canal
  continua sendo roteiro sem marcador.
- **WER inflado por nome próprio é falso positivo.** No episódio de 06/09 o bloco
  NÚMEROS ficou em 14,8% e passou na inspeção: as diferenças eram todas do
  transcritor (`gol de lucho` → `codelluchio`, `davi de oliveira` →
  `da videoliveira`). Antes de refazer um bloco, **olhe o diff** — se o que
  divergiu são nomes próprios, o áudio está bom e o modelo `small` é que não os
  conhece.

## 4 · B-roll — três camadas, não uma

```bash
python -X utf8 broll/acervo.py {slug}         # vídeo genérico (Pexels)
python -X utf8 broll/fotos_do_fato.py {slug}  # as fotos que os portais publicaram
python -X utf8 broll/cartelas.py {slug}       # o texto, em camada transparente
```

Saída: `04-takes/{acervo,fotos,cartelas}/`, cada uma com seu índice JSON.

**A cartela é CAMADA, nunca fundo.** A primeira versão usou fundo verde chapado
com texto por cima: onde o texto acaba, sobra cor crua, e onze minutos disso é
apresentação de slides. Agora o take real corre por baixo e o texto entra em
`faixa` (barra inferior, padrão) ou `painel` (véu escuro, só quando o **dado** é
a informação principal do momento).

**As três camadas resolvem coisas diferentes.** O acervo dá movimento; as fotos
dos portais dão o fato — Abel, o clube, o jogo; a cartela diz o que não tem
imagem ("efeito suspensivo", "líder por um ponto").

**Consulta de acervo descreve a CENA, não o assunto.** `football fans cheering`
trouxe duas pessoas com bandeira num estúdio; `soccer ball hitting net goal`
trouxe uma cesta de basquete. `packed stadium crowd cheering` traz o
enquadramento. E a API da Pexels devolve **403 sem `User-Agent`**.

**Foto de portal é editorial**, não livre: entra como plano de apoio, nunca em
thumb nem abertura, e o `fotos.json` guarda veículo e URL da matéria.

Escudos vêm da ESPN pelo mesmo caminho gratuito que a live usa.

## 5 · Áudio

```bash
python -X utf8 mixa.py {slug}
```

Saída: `05-audio/mix.wav`. Voz a −16 LUFS, leito a −30 com **ducking**
(sidechain) — o leito recua na fala e volta na pausa. Se o espectador reparar na
música, ela está alta.

O leito é de geração própria (`squads/oraclumtech-ai-creative-studio/data/
trilhas-and-sfx/`). Num canal dark isso importa mais que a qualidade da peça:
reclamação de direito autoral em áudio é automática e desmonetiza antes de
qualquer análise.

## 6 · Montagem

```bash
python -X utf8 monta.py {slug} --rascunho    # 480p, para conferir
python -X utf8 monta.py {slug}               # 1080p
```

Saída: `06-final/video.mp4`.

- O b-roll acha o lugar dele pela **duração medida de cada bloco**, não por
  timestamp escrito à mão — renarrar não desalinha nada.
- **Corte seco**, plano de ~5 s. O gênero corta entre 4 e 8 segundos; dissolução
  é código de documentário e faz plantão parecer lento.
- **Vídeo não leva zoom** (já se move) e entra num ponto sorteado do arquivo.
  **Foto leva zoom**, calculado em 2560×1440 e reduzido para 1080 — o `zoompan`
  arredonda a posição para pixel inteiro e, direto em 1080p, o movimento anda em
  degraus. Medido: 68% de variação entre quadros contra 28% com a correção.
- Gradação e vinheta comuns a todo plano: material de quatro origens tem
  exposição diferente, e sem tratamento comum o corte denuncia a colagem.

## 7 · Projeto editável no video-studio

```bash
python -X utf8 broll/para_studio.py {slug}
```

Saída: `outputs/bora-de-bola/video-plans/{slug}/` — abre em
`localhost:3002/studio?client=bora-de-bola&creative={slug}`.

O plano de corte sai de `monta.planeja()`, **a mesma função que renderiza o
mp4**: o que se abre para editar é o que se assistiu, plano por plano.

O studio lê `studio-edit.json` — só `timeline.json` faz ele refazer o ingest do
zero, em 1080×1920 e em ordem alfabética.

**Quatro campos que o studio aceita calado e depois desenha errado:**

| Errado | Certo | Sintoma |
|---|---|---|
| `x: 0, y: 0` | `x: 50, y: 50` | **50 é o centro.** O `ElementWrap` faz `translate(x-50%, y-50%)`; com 0/0 a camada sai meia tela na diagonal |
| `animIn` / `animOut` | `animateIn` / `animateOut` | a animação nunca roda |
| `"slide"` | `"sobe"` | não existe em `fxCatalog.AnimacaoId` e cai em "nenhuma" |
| `startFromSeconds` | `trimStartFrames` (quadros) | todo take começa do zero |

**Para conferir o projeto sem abrir o browser:**

```bash
cd ../video-studio
node scripts/still-do-save.ts bora-de-bola {slug} 1966 8981
```

Renderiza o `studio-edit.json` pelo próprio motor. O `render-stills.ts` **não serve**
para isso: ele monta o timeline por `ingestCreative`, ou seja, renderiza o que o
studio produziria sozinho, não o que foi importado. E conferir pelo preview do
navegador também não funciona — a página muda de escala a cada captura.

Os materiais vão para `Materiais Brutos` por **hardlink**, não cópia: são os mesmos
bytes de `04-takes`, e copiar duplicava ~186 MB por episódio.

## 7.5 · Gate de duração — 10 minutos

**Nenhum episódio sai abaixo de 10 minutos** (founder, 06/09). O corte de 4min21
foi recusado; o piloto tinha 11min09, e esse é o patamar.

A 195,7 palavras/min (ritmo medido do motor), 10 minutos exigem **~1.960
palavras**. Conte ANTES de narrar.

**O gate de duração não revoga o de fidelidade.** Cada minuto a mais precisa de
fato novo com âncora em fonte. Se a pauta não sustenta 10 minutos, a pauta está
errada — não a duração. No episódio de 06/09 a expansão veio das estatísticas da
API da ESPN (posse, finalizações, faltas, cartões) e da repercussão internacional
da peitada, não de repetição.

## 8 · Publicação

O upload é manual. O que a esteira exige é que o registro feche:

1. **`publicacao.yaml`** → `status: publicado`, e preencher `url`, `canal_id` e
   `publicado_em`. São os três campos que só quem publicou tem.
2. **`episodes.json`** → a entrada do episódio, que é o índice do canal.
3. **Desempenho em D+7 e D+28** → `impressoes`, `ctr`, `retencao_media`.

> **O CTR do primeiro episódio é a linha de base do canal.** Sem ele, nenhum título
> futuro tem contra o que ser medido e o pontuador da Regra de 3 fica sem
> realimentação — ele ordena candidatos, mas quem diz se a régua está calibrada é o
> CTR real.

O SEO (descrição, tags, frase-alvo) sai pronto de `01-embalagem/publicacao-seo.md`.

---

## Três defeitos que o founder pegou em 06/09 — e o que mudou

**0. SEIS DE VINTE CARTELAS ESTAVAM INVISÍVEIS — e nada avisou.**
O dado da cartela vai para o template HTML em **base64 na query string**. O
alfabeto padrão do base64 usa `+`, e numa URL o `+` é lido como **espaço**: o
`atob()` do template falha, e o PNG sai **100% transparente**. Sem erro, sem
log, sem nada na tela — a camada simplesmente não existe no vídeo.

A correlação foi exata: as cartelas cujo base64 continha `+` (1, 7, 9, 14, 18,
19) foram exatamente as que saíram vazias. Depende de acento e pontuação, por
isso quebra em umas e não em outras — e vinha desde o piloto.

**Correção:** `base64.urlsafe_b64encode` no Python, e o template converte `-`/`_`
de volta antes do `atob`. E uma **guarda**: PNG com canal alfa todo zero aborta
a geração com mensagem clara. Cartela que não aparece agora falha alto.

**1. Pronúncia — a auditoria de WER NUNCA vai pegar isso.**
O Whisper **normaliza** a saída: ele transcreve "Hulk" tanto para a grafia certa
quanto para a errada, e o WER fica em zero com o áudio errado. Pronúncia só se
mede com ouvido. O que dá para automatizar é a substituição:
`narra_comfy.PRONUNCIA` troca a grafia legível pela falável no último ponto
antes do motor — o roteiro em disco continua legível e conferível.
O pior caso era o ordinal: `26ª` saía como *"vinte e seis A"*. Depois da
correção, o bloco NÚMEROS caiu de **14,8% para 8,9% de WER**.

**2. Cartela fora de sincronia — dois erros, não um.**

*Erro A: ancorada no ROTEIRO, não no áudio.* Eu usava o `roteiro.blocos.srt`,
que é estimativa a 135 wpm enquanto o motor fala a ~196. Agora existe
`fala_real.py`: transcreve o `vo.mp3` com timestamp por palavra e grava
`03-narracao/fala-real.json`. **O roteiro é a intenção; o mp3 é o fato.**
Rode-o depois de narrar e antes de montar.

*Erro B: a cartela durava UM PLANO (~5 s)* e sumia enquanto o assunto continuava
sendo falado. Agora ela tem início E fim: cobre todos os planos do trecho, até a
próxima cartela do bloco, com piso de 7 s e teto de 26 s (`CARTELA_MIN_S` /
`CARTELA_MAX_S`).

**Âncora não pode depender de número nem de nome próprio.** O transcritor ouviu
*"55 de **poste** de bola"* e comeu o "por cento". Use trecho de linguagem comum
— `"a analise dele foi esta"` funciona; `"Cinquenta e cinco por cento"` não.

**3. O acervo de vídeo também é por episódio.**
As consultas do Pexels estavam fixas com as do episódio do STJD — `gavel law
books`, `courtroom judge`, `lawyer reading papers`. Num vídeo sobre arbitragem
de campo isso vira **foto de escritório no meio do clássico**. Trocadas por
`referee showing yellow card`, `soccer referee whistle`, `players arguing with
referee`. Consulta de acervo acompanha a pauta, como as fotos e as cartelas.

**4. Cartela fora de sincronia — era o algoritmo, não o ajuste.**
As camadas eram espalhadas **uniformemente pelos planos do bloco**, na ordem em
que foram declaradas. Nenhuma relação com o que estava sendo dito. Agora cada
cartela declara `ancora` — um trecho da fala — e o `monta.py` a coloca no plano
correspondente.
**Use a posição RELATIVA, nunca o segundo do SRT.** O `roteiro.blocos.srt` tem
tempos estimados a 135 wpm e o motor fala a ~196: em 06/09 o SRT terminava em
387 s contra 261 s reais, **126 s de deriva**. A fração dentro do bloco
sobrevive à diferença de ritmo; o segundo absoluto, não.

**3. Foto que casa pelo título mas mostra outra coisa.**
As 45 fotos baixadas tinham "Fluminense" ou "Vasco" no título — e várias eram de
**mercado**: *"Santos anuncia Lima, ex-Fluminense"* trouxe o Lima com a camisa do
Santos, e ele entrou como b-roll do clássico. O nome do clube é casamento largo
demais: matéria de mercado cita o clube e mostra outro contexto, **e é a foto que
vai ao ar**. Agora `fotos_do_fato.e_do_fato()` veta o vocabulário de mercado, e o
pool de reserva do `monta.py` faz o mesmo.

**Bônus — bloco novo no roteiro ficava sem material.**
`FOTOS_POR_BLOCO` era global e trazia os blocos do episódio anterior. Ao ganhar
BLOCO 3B, 5 e 6, esses três saíram como `SEM MATERIAL` e o vídeo ficou com
**162 s a menos que o áudio**. Agora o mapa é `FOTOS_POR_EPISODIO[slug]` e existe
um **pool de reserva**: bloco sem curadoria puxa do acervo geral em vez de ficar
vazio. O pool não substitui a curadoria — impede que a falta dela quebre a
entrega.

## O acervo mente, e a única defesa é OLHAR

`broll/acervo.py` agora grava **`_CONFERIR.jpg`** na pasta do acervo — um frame
de cada take, lado a lado. **Olhe antes de montar.** Leva dez segundos e é a
única defesa que existe.

**Por que a consulta não basta, em três camadas de erro já pagas:**

**1. `football` em inglês é FUTEBOL AMERICANO.** O acervo é catalogado em inglês
americano. Sete consultas usavam a palavra e o vídeo ganhou jogada de capacete e
ombreira no meio do clássico. **Escreva sempre `soccer`.**

**2. Consulta de emoção sem esporte cai em outro lugar.** `crowd raising hands
stadium` trouxe pessoas de mãos levantadas em **culto religioso**. Toda consulta
precisa de uma palavra que ancore o assunto: `soccer`, `pitch`, `stadium`.

**3. Mesmo com `soccer`, ainda erra.** Depois de trocar tudo, vieram:

| Consulta | O que veio |
|---|---|
| `soccer referee whistle close up` | uma **corrente de crucifixo** no pescoço |
| `soccer referee running on pitch` | **rugby** |

**Consulta de OBJETO isolado é a mais perigosa** — sem gente e sem campo no
quadro, nada ancora o assunto, e o acervo casa o "close up" com qualquer objeto.
E **cena que existe em vários esportes** (`referee running on pitch`) vem
igualmente ambígua. Prefira consulta que obrigue a bola, o gol ou o jogador no
quadro: `soccer referee showing red card player`, `soccer referee with ball on
field`.

**Isso não dá para automatizar** — é julgamento visual. O que dá para
automatizar é produzir a folha, e é o que o script faz agora.

## A quarta guarda: `audita_camadas.py` — a que olha a IMAGEM

As três guardas abaixo comparam **áudio com áudio**. Nenhuma olha a tela, e foi
por isso que quatro defeitos seguidos de camada chegaram ao founder em 06/09
sem nada avisar: cartela transparente, cartela curta demais, cartela piscando, e
b-roll de outro contexto. O vídeo montava, as durações batiam, tudo "passava".

```bash
python -X utf8 audita_camadas.py {slug}     # depois de montar, antes de entregar
```

Ela amostra o **arquivo final** a cada segundo dentro do intervalo em que cada
cartela deveria estar no ar, e reprova em dois casos: **não aparece** (presença
abaixo de 70%) ou **pisca** (buraco no meio do próprio intervalo).

**A detecção é pela cor do canal (#FCCC0C)**, e isso foi aprendido errando: a
primeira versão procurava texto no rodapé ou véu escuro ao centro — assinaturas
da cartela de FRASE — e reprovou quatro cartelas boas (número gigante, lista,
etiqueta). **Guarda que reprova trabalho bom é pior que guarda nenhuma**, porque
ensina a ignorar o alarme.

O limiar é **calibrado, não chutado**: medido neste episódio, frame com cartela
tem 992 a 1.921 pixels amarelos; frame sem cartela tem 4 a 7. O corte em 300 cai
no vazio entre as duas populações.

## As três guardas que impedem entrega quebrada

| Onde | O que ela pega |
|---|---|
| `audita_narracao.py` | o motor comeu frase e não avisou |
| `mixa.py` | a cadeia de áudio encurtou a narração (o `loudnorm` já comeu 38 s calado) |
| `monta.py` | o vídeo terminou antes da fala |

Todas comparam contra a **duração medida**, não contra a declarada. Foi assim
que apareceu o defeito dos respiros a 44,1 kHz colados em blocos de 24 kHz: o
container declarava 668,9 s e o arquivo tocava 669,5 s.

---

## O que ainda não é automático

- **A escolha das fotos** por bloco está escrita em `monta.py:FOTOS_POR_BLOCO`.
  É decisão editorial — qual rosto aparece em que momento é de quem escreveu.
- **A marcação de cartelas** de cada episódio está em
  `broll/cartelas.py:cartelas_do_episodio()`. Episódio novo exige escrever a
  dele; o gerador recusa slug sem marcação em vez de inventar.
