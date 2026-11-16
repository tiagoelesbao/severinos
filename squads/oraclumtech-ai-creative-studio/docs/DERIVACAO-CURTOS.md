# Derivação de curtos a partir dos longos

> Como um vídeo longo vira N peças verticais sem virar N recortes preguiçosos.
> Os números aqui foram **medidos** no material real em 2026-09-05. Quem mudar o
> material, mede de novo. O que ainda não foi medido está marcado como tal.

---

## 1 · A unidade de derivação não é tempo

A intuição natural é "um curto a cada 5 minutos". O material mostra por que ela erra:
**os longos não são fluxo contínuo, são feitos de blocos autocontidos.**

| | LA (estrutura A) | LB (estrutura B) | Futebol |
|---|---|---|---|
| Duração | 19m49 – 20m15 | 18m02 – 19m52 | 11m09 |
| Unidades | **6 práticas** | **5 reflexões** | **6 blocos** |
| Duração da unidade | 2m12 – 2m52 | 2m27 – 3m16 | 55 s – 124 s |
| Gancho já pronto? | não | **sim** — a citação-epígrafe abre cada bloco | **sim** — o gancho de 27 s é a notícia inteira |
| Prazo de validade | nenhum | nenhum | **~48 h** |

A unidade da estrutura A tem, por dentro: **tese → mecanismo → anedota histórica →
aplicação → objeção → desafio**. Isso é *material* para um curto, não um curto pronto —
2m30 não cabe em vertical.

**A regra: conte unidades, não minutos.**

## 2 · As faixas de duração

A 171,6 wpm — o ritmo **medido do motor `male02`**, não o da referência:

| Faixa | Palavras | O que cabe | Papel |
|---|---|---|---|
| **15 s** | ~42 | uma tese isolada, ou a citação | **Sonda.** Testa o ângulo no menor custo |
| **30 s** | ~85 | tese + aplicação | O cavalo de batalha do vertical |
| **60 s** | ~171 | tese + mecanismo + desafio | O mais completo que ainda é curto |
| **3 min** | ~514 | **a unidade inteira** | Já é outro formato — ver abaixo |
| **5 min** | ~858 | duas unidades | Peça de médio, não curto |

**A faixa de 3-5 min já existe e já está validada.** As peças `A1-A3` e `B1-B3`
(3m08 a 4m33) são exatamente isso — e não é coincidência: a unidade inteira tem
380-494 palavras, que dá ~3 min. **Derivar um "curto de 3 min" é escrever mais uma
peça A/B** com a gramática que o `_INDEX.yaml` já define. Não é problema novo.

### A armadilha da canibalização

**A mesma unidade NÃO vira 15 s + 30 s + 60 s no mesmo feed.** O mesmo espectador vê
as três, e o que parecia escala vira repetição. As faixas se justificam por três
motivos, e só:

1. **Sonda e reinvestimento.** O 15 s testa o ângulo barato; o que performa é
   reescrito em 30/60 s.
2. **A unidade escolhe a faixa.** Prática com anedota forte pede 60 s; tese seca cabe
   em 15 s. Não force a unidade na faixa.
3. **Plataforma.** TikTok tolera melhor 15-30 s; Shorts vai bem até 60 s.

## 3 · O curto tem ROTEIRO PRÓPRIO — não é recorte de áudio

**Decisão do founder, 2026-09-05.** Recortar o áudio do longo sai mais barato e paga
em retenção: a fala do minuto 7 começa no meio de um raciocínio, sem gancho próprio e
sem CTA de vertical.

O longo é **fonte de matéria-prima e de autoridade**, não fonte de áudio.

| O curto HERDA do longo | O curto ESCREVE do zero |
|---|---|
| A tese da unidade | O **hook** (os 3 primeiros segundos) |
| A anedota histórica e a fonte | A **curva de retenção** própria |
| O dado, o número, a citação | O **CTA** (que no longo é outro) |
| O léxico e a voz do canal | As transições de entrada e saída |

**Consequência:** cada curto precisa de narração nova. É barato (TTS local), mas não é
zero — e a **auditoria de WER continua valendo** (`audita_narracao.py`, teto de 12%).

## 4 · Quem escreve

O `@head-of-copy` é o dono do roteiro e **já tem as rotas configuradas**
(`agents/head-of-copy.md` → `cross_squad_handoff`):

| Rota | Quando | O que volta |
|---|---|---|
| **`@mrbeast-mk`** | o KPI é retenção, ou o hook precisa de segunda opinião | qual hook segura e onde a curva cai |
| **`@garyvee-mk`** | a mesma peça vai para 3+ plataformas | adequação nativa por cultura de plataforma |
| **`copy-squad`** | o gargalo é volume de variação, não arquitetura | variantes de ângulo |

O `@head-of-copy` **continua dono** do voice-check e da âncora dos claims, mesmo no que
voltar de fora. Handoff é arquivo em disco, não conversa.

## 5 · A matemática, por canal

| Canal | Unidades por peça | Curtos por peça | Densidade |
|---|---|---|---|
| Estoico A | 6 práticas + tese da abertura | **7** | 1 a cada ~2,9 min |
| Estoico B | 5 reflexões + abertura | **6** | 1 a cada ~3,3 min |
| Futebol | 6 blocos, ~4 se sustentam sozinhos | **4** | 1 a cada ~2,8 min |

**A densidade é praticamente a mesma nos dois canais.** O que muda é o tamanho da peça
e, sobretudo, o **prazo**: no futebol os blocos que dependem do jogo de domingo morrem
no domingo — os curtos saem junto com o longo, na janela de 48 h. No estoico podem ser
distribuídos por semanas.

**Estoque disponível hoje: 3 longos LA publicados × 7 = 21 unidades** (18 práticas +
3 teses de abertura). Os 3 LB estão escritos mas **não narrados nem publicados** —
ficam fora: curto que aponta para longo inexistente desperdiça o tráfego que gerou.

## 6 · O visual — o gargalo real

**Todo o acervo é horizontal:** estoico em 1344×768, futebol em 1920×1080, fotos de
portal em 1200×800. E os longos usam **11 imagens em 20 minutos** (1 a cada 110 s), um
ritmo que não sustenta vertical. Cada curto precisa de **3-5 imagens próprias em 9:16**.

**Rota escolhida: regenerar em 768×1344.** Custo medido: ~175 s por imagem na roda LITE.

| Lote | Imagens | GPU |
|---|---|---|
| 1 curto (média 3) | 3 | ~9 min |
| LA1 inteiro (7 curtos) | ~20 | **~1 h** |
| Os 3 LA (21 curtos) | ~60 | **~3 h** |

### Vídeo I2V — onde ele se paga, e onde não

O squad tem 7 presets Wan 2.2 I2V prontos. Mas **movimento gerado é o item mais caro do
estúdio**, e um curto de 15-30 s com imagem estática + Ken Burns já é o padrão do nicho.

**Recomendação: I2V só no primeiro take — o do hook.** É onde o movimento prende, e é
1 take por curto em vez de 3-5. O resto entra estático.

**Três coisas a resolver antes do primeiro I2V vertical:**

1. **Nenhum preset atual é 9:16.** Os sete geram `WanImageToVideo` a 960×720. Vertical
   exige um preset novo — provavelmente 720×1280 — validando o pico de memória pela
   tabela do `gera_workflows_wan.py` antes de enfileirar a noite inteira.
2. **O tempo por take não está medido.** Nenhum doc do squad registra segundos por take
   de I2V. **Medir no primeiro, antes de montar fila grande** — uma fila de 20 takes com
   tempo desconhecido pode não caber na madrugada.
3. **Câmera parada.** Movimento de câmera no I2V é o que mais deforma; para take de
   apoio em curto, o ganho não compensa o risco.

**Regras do Wan que não se descobrem de novo:**
- **`fps = 16 × multiplicador do RIFE`.** O Wan entrega 16 fps. Multiplicador 2 → 32 fps.
  Usar 32 com multiplicador 4 não dá erro: dá câmera lenta pela metade.
- **RIFE em `bfloat16`, nunca `float16`.** Em 31/08 o float16 derrubou o ComfyUI inteiro
  com `access violation` (crash nativo, não OOM). Mesma conta de memória, faixa de
  expoente do float32. Os workflows já estão corretos.
- **O quadro que alimenta o I2V não é o upscalado.** O Wan trabalha por volta de
  1280×704; upscalar antes é gastar tempo que o modelo joga fora.

## 7 · A fila da madrugada

**`assets/comfyui/RODAR-NOTURNO.bat` já é exatamente esse padrão** — não precisa ser
criado. Ele espera o ComfyUI responder, limpa fila residual e modelo preso, roda
**um job por vez**, grava `_noturno-<data>.log` e mostra o resumo no fim.

```
RODAR-NOTURNO.bat curto-la1-        # as imagens do lote
RODAR-NOTURNO.bat curto-la1- nitido # com preset de vídeo
```

O `run_batch.py` protege a noite: falha isolada não para a fila, mas **três seguidas
param** — aí a causa é do ambiente (memória, modelo ausente) e insistir gastaria a
madrugada sem produzir.

**O ComfyUI precisa estar aberto** — o `.bat` não o inicia de propósito, para não
esconder erro de inicialização no log de outro processo.

**Sequencie sempre.** RTX 4060 Ti 8 GB, 16 GB de RAM: rodar transcrição ou outro modelo
grande em paralelo derruba o ComfyUI.

## 8 · Duas armadilhas do material, medidas

**O `.blocos.srt` NÃO serve para localizar trecho.** É o SRT *escrito* (previsto pelo
wpm), não o medido:

| Peça | SRT | MP3 | deriva |
|---|---|---|---|
| LA1 | 1229,3 s | 1194,0 s | **+35,3 s** |
| LA2 | 1227,9 s | 1157,2 s | **+70,7 s** |
| LA3 | 1202,6 s | 1150,7 s | **+51,9 s** |

**Use o `fx-plan.json`**, que tem timing real palavra a palavra (3.479 palavras no LA1,
batendo com o MP3 em 0,6 s). Mesmo com roteiro novo, é ele que diz onde cada trecho
está no longo — para citar o momento certo ou apontar o espectador para lá.

## 8.1 · O que a execução do LA1 mediu (2026-09-06)

O estudo acima projetava; isto é o que aconteceu ao rodar os 7 curtos.

**A esteira, em cinco passos** — todos em `apps/canal-estoico/`:

```
gera_srt_curto.py --todos                    # roteiro.md -> narracao.srt
run_batch.py --only narracao-clone-v1        # 6 narrações: 30-90 s cada
fecha_narracao_curto.py --todos              # vo.mp3 no pack + fala-real.json
acervo_curto.py --todos                      # takes verticais + _CONFERIR.jpg
monta_curto.py {slug}                        # 04-final/curto.mp4
```

**Custo real da narração: 30 a 90 s por curto**, contra os "~2 min" projetados. Os seis
saíram em menos de 6 minutos de fila. **A narração não é o gargalo** — nunca foi.

**O gargalo previsto era a imagem, e continua sendo — mas mudou de forma.** A projeção
era regenerar 3-5 imagens por curto a ~175 s cada. Na prática a rota escolhida foi
acervo, e o custo virou **três rodadas de tentativa e erro de consulta**, não GPU.

### O acervo: o que ele entrega, e o que não

**Não entrega figura antiga em registro estoico.** Medido em três rodadas: mármore rosa,
colunata turística com palmeira, estátua em vitrine de museu com luz roxa, templo sob
refletor azul de turismo, bosque com poste de rua, mão humana sobre a pedra, tinta verde
neon, tecido vermelho, panfleto em inglês pregado no tijolo.

**Entrega bem textura abstrata**: pedra em macro, água, areia, vela, céu de tempestade,
rastro de estrelas, fumaça. Nenhuma pode ser anacrônica, porque não há objeto a datar.

> **A regra de consulta, e ela vale para qualquer canal:** nomear um OBJETO ("paper",
> "window", "marble") traz o objeto no mundo de hoje, com mão e tudo. Nomear um FENÔMENO
> ("sand falling", "storm clouds", "stars time lapse") traz o fenômeno.

**Duas guardas, com limites diferentes.** A automática mede luma e saturação na
miniatura que a API já devolve — reprovado não custa download. Calibrada em 13 takes,
`luma ≤ 110` e `sat ≤ 0,18` separa as duas populações com folga. **Onde ela não
alcança:** floresta verde ensolarada mediu 88,2/0,131, indistinguível da ruína enevoada
(97,8/0,114), que é boa. A folha de contato continua obrigatória.

**Consequência de método:** o banco de consultas virou **lista fechada e conferida**, e
a variação entre curtos vem da ordem, do movimento por segmento e da gradação — não de
sortear material novo. É assim que o LA1-P1 sustenta 55 s com quatro takes.

### I2V continua sendo o material superior — e a troca é de graça

Posto lado a lado, o P1 (takes I2V próprios: estátua, colunata) lê visivelmente melhor
que os seis de acervo. `monta_curto.py` **prefere** `03-takes/*.mp4` sobre
`03-takes/acervo/`, então gerar os takes depois e remontar não muda uma linha de código.

**A ordem de decisão que sai daqui:** publique o de acervo, meça a retenção de 3 s, e
gaste madrugada de GPU só no que provou que vale.

---

## 8.2 · O lote de futebol (2026-09-07) — a conta não é "1 por longo"

O founder estimou 3 curtos, um por longo publicado. **A conta real é outra, nos
dois sentidos.**

**Para mais:** um episódio de plantão tem blocos que são notícias INDEPENDENTES.
O de 07/09 cobre a treta do pênalti, a crise do Corinthians, o mercado do
Botafogo e a rodada dos vermelhos — quatro assuntos, quatro curtos, de um longo
só. Contar por LONGO subestima; contar por BLOCO AUTOCONTIDO acerta.

**Para menos:** o prazo de 48 h corta a maior parte do estoque antigo. Em 07/09,
o episódio de 04/09 (punição do Abel, já cumprida) e o grosso do de 06/09
(arbitragem de um jogo específico) estavam mortos. Derivar deles hoje seria
publicar notícia velha.

**O filtro que resolve os dois:** *este bloco depende do JOGO ou do PERSONAGEM?*

| Depende de | Prazo | Exemplo |
|---|---|---|
| **jogo** | 48 h | "o árbitro errou nesse lance", "a punição sai domingo" |
| **personagem** | semanas | "o Hulk quase foi para o Vasco" |
| **número da temporada** | semanas | "o Palmeiras acumula R$ 49 mi em premiação" |

Só o segundo e o terceiro aguentam derivação fora da janela. Foi assim que dois
curtos saíram de episódios vencidos sem publicar conteúdo morto.

**O lote entregue: 6 curtos** — 4 do episódio do dia, 1 de 06/09, 1 de 04/09.
Faixas: 1×60 s, 4×~40 s, 1×15 s.

### O motor é o mesmo dos dois canais

`monta_curto.py --canal {estoico|futebol}`. O que muda é **identidade** — cor de
realce, trilha, rótulo, chamada, gradação. Corte curto, movimento por segmento,
voz acelerada, karaokê em libass e zona segura são do FORMATO vertical, não do
assunto. Um motor só significa que as correções chegam nos dois.

**A narração do curto sai do `narra_comfy.py --curto`**, o mesmo do episódio: o
corte tem de ter a MESMA VOZ do longo, e duplicar o narrador seria a forma mais
rápida de a voz divergir na primeira troca de preset.

### Quatro armadilhas medidas neste lote

**A regra do acervo NÃO se herda entre canais.** No estoico o banco só entrega
textura abstrata (não existe figura antiga em registro estoico). No futebol o
assunto é contemporâneo e o banco tem estádio, torcida e gramado aos milhares.
Importar a regra do outro canal entregaria fumaça e areia num vídeo sobre
pênalti. **A guarda de tom também não se herda:** `luma ≤ 110` foi calibrada no
escuro do estoico e reprovaria o acervo inteiro do futebol, que é claro de
propósito.

**O pool VERTICAL de futebol é pequeno.** A folha de contato devolveu gaivotas
dentro do gol, vista aérea de cidade como "luz de estádio", e um lineout de
**rugby** para "soccer players celebrating goal". A saída foi herdar o acervo do
EPISÓDIO, que já passou por conferência — recortado 9:16 no centro, o que para
estádio e gramado não custa nada.

**`scale=L:A` puro DEFORMA.** Com acervo vertical passava despercebido (já vem
9:16); com o acervo do episódio a 1920×1080 espremeria o estádio numa coluna.
Agora é `force_original_aspect_ratio=increase` + `crop`.

**Curto herdando o mesmo acervo sai idêntico ao vizinho.** Seis curtos liam a
lista na mesma ordem e os quatro primeiros tinham os mesmos planos nos mesmos
momentos. O giro por slug já existia no `acervo_curto.py`; faltava aqui, onde o
material vem pronto.

### 8.2.1 · A dinâmica do curto de futebol NÃO é a do estoico

Três correções pedidas pelo founder depois do primeiro lote, e as três saem da
mesma diferença de material.

**1. Take de futebol não roda de trás para frente.** O pingpong (frente + reverse)
existe para dobrar um take curto sem corte visível, e no estoico funciona: fumaça
subindo, água ondulando — o retorno passa despercebido.

Em futebol ele denuncia na hora: o jogador corre de costas, a bola volta para o
pé, a torcida senta. **Atmosfera não tem vetor; jogada tem.** Onde há vetor,
inverter o tempo inverte o sentido. Virou opção de canal (`pingpong: False`).

O que substitui: **entrada variável**. Cada segmento entra num offset diferente
do mesmo take, então pedaços diferentes aparecem. Corte seco entre eles é a
linguagem do esporte — não é defeito ali.

**2. Take não pode repetir em sequência.** O seletor antigo escolhia por faixa
(`int(i/n_seg × len(takes))`) e trocava a cada três segmentos: o mesmo take
ficava oito segundos no ar em três pedaços. Agora a regra é explícita — **nunca
repete a fonte anterior** — e o motor imprime quantas repetições consecutivas
sobraram (zero nos seis curtos).

**3. Precisa de foto REAL do fato, não de gramado genérico.** Esta é a maior das
três. No estoico o take é atmosfera e qualquer um serve, porque nenhum afirma
nada. No futebol o curto fala de um jogo, de dois jogadores, de uma proposta com
valor — e o espectador veio ver *aquilo*.

O episódio já baixa e confere essas fotos (`fotos_do_fato.py`). O curto declara
em `curto.yaml` de que **blocos** do episódio ele veio, e herda a lista que já
foi conferida foto a foto contra o título da matéria.

> **Por que por bloco e não por termo.** A primeira versão filtrava por
> substring no nome do arquivo. Filtrando `cruzeiro` veio a arte de divulgação
> de *"Corinthians × Cruzeiro FEMININO"* — outro jogo, outro campeonato, e
> justamente uma das que o mapa do episódio tinha excluído. Curadoria já feita
> não se refaz por substring.

**Um `except` que escondeu o erro.** O carregamento do mapa do episódio falhava
com `ModuleNotFoundError` (o `monta.py` do futebol importa `narra_comfy` e a
pasta dele não estava no path). O `except` engolia e caía no fallback por
substring **sem uma linha de aviso** — e a arte do feminino continuou entrando
depois de eu "corrigir". Só apareceu ao contar as fotos: 9 do fallback onde o
mapa daria 6.

### E uma que custou GPU

**O roteiro de curto tem notas de método; o de episódio não.** O
`blocos_do_roteiro` lia o arquivo inteiro e narrou "o que muda em relação ao
longo" em voz alta: o primeiro curto saiu com **297 palavras e 1min32** no lugar
de 213 e ~65 s — um terço do áudio era a justificativa editorial do roteiro.
Agora `--curto` lê só a seção `## ROTEIRO`.

---

## 9 · O que já existe e não precisa ser construído

| Peça | Onde | Estado |
|---|---|---|
| Composição 9:16 | `apps/video-studio` | **nativo** — `TARGET_H=1920`, zonas seguras, legenda caixa-alta a 18 caracteres |
| Motor de montagem vertical | `squads/virals-farming-squad/scripts/farm-assemble.js` | pronto, com `_editspec.js` e `_studio-mirror.js` |
| Narração + auditoria | `narra_comfy.py` · `audita_narracao.py` | pronto |
| Fila noturna | `assets/comfyui/RODAR-NOTURNO.bat` | pronto |
| Rotas de copy para hook | `head-of-copy.md` → `cross_squad_handoff` | configuradas |

---

## 9.1 · O que veio do material de tráfego orgânico (Ruyter)

Importado em 2026-09-06 de `Recursos/Métodos/Ruyter/03 - Tráfego Orgânico.md`
(escrito em nov/2025). Fica aqui **o que muda decisão**; o resto do material é
sobre operação de página, não sobre o motor.

### A mecânica que explica por que os 3 primeiros segundos decidem

A plataforma entrega em **janelas de ~200 pessoas**. Se a amostra retém ou
compartilha, abre outra janela; se não, morre ali. **Não é sorte, é um teste
sequencial** — e o que se está otimizando não é "o vídeo", é a passagem pela
primeira janela.

> **Formato viral = tempo de retenção + interação/compartilhamento.**

Isso confirma a métrica que já tínhamos escolhido (retenção aos 3 s) e explica
por que ela é a certa: é ela que decide se existe segunda janela.

### Os limiares do TikTok, convertidos para as nossas faixas

O material dá dois números operacionais: **30% do vídeo assistido = aceitável;
50% = a plataforma entrega mais.** Traduzindo para o que produzimos:

| Faixa | 30% (piso) | 50% (alavanca) |
|---|---|---|
| 15 s | 4,5 s | 7,5 s |
| 30 s | 9 s | 15 s |
| 60 s | 18 s | 30 s |

**São metas por faixa, não uma meta só.** Um curto de 60 s precisa segurar 30 s
para ganhar entrega; um de 15 s precisa de 7,5. É por isso que a faixa curta é
sonda barata: o limiar absoluto é muito mais fácil de bater.

### O dilema da duração — e por que ele valida a matriz de faixas

O material registra a tensão explicitamente: **vídeo abaixo de 1 minuto tem mais
chance de ser visto 100%, mas não monetiza**; vídeo mais longo monetiza mas
retém menos. A recomendação dele é **postar em durações variadas**, que é
exatamente a decisão do founder de trabalhar 15/30/60 s e 3-5 min.

Isso deixa de ser preferência e passa a ter razão: as faixas curtas compram
alcance, as longas compram receita. Uma grade só de 15 s cresce sem monetizar.

### As seis emoções dos 3 primeiros segundos

O hook precisa produzir **uma** destas, e o roteirista deve saber qual antes de
escrever:

| Emoção | Serve bem para |
|---|---|
| Raiva / indignação | futebol (arbitragem, injustiça) |
| Surpresa / choque | dado contra-intuitivo |
| Curiosidade / mistério | estoico (a tese antes da explicação) |
| Emoção / empatia | reconhecimento ("você já reparou que…") |
| Admiração / desejo | resultado, transformação |
| **Contradição / choque de lógica** | **a mais forte para os dois canais** |

A "contradição" é a que o LA1-P1 já usa sem nomear: *"você sabe exatamente o que
precisa fazer — e mesmo assim não faz"*. E é a mesma do episódio de futebol de
06/09: *quem ganhou é quem está reclamando*.

### O corte de título muda por plataforma — e o nosso pontuador usa o número errado para Shorts

O `pilares.py` pontua contra **55 caracteres**, que é o corte do feed do YouTube
longo. O material aponta que **em Shorts o título deve ter até 35 caracteres**, e
que ali o título e a capa são a *única* porta: Shorts não tem um "para você" que
empurre o vídeo por descoberta passiva do mesmo jeito.

**Consequência prática:** um título aprovado para o vídeo longo não está aprovado
para o curto derivado dele. Ao derivar, repontue com o corte de 35.

*(Pendência: o corte está fixo no `pilares.py`. Deveria ser parâmetro por
plataforma — anotado em §9 do MEMORY.)*

As **palavras de impacto** listadas no material (`como, faça, veja, isso, saiba,
por que, nunca, pare, segredo, descubra, quando, antes, depois, agora, sempre,
verdade, erro, motivo, ninguém, aqui`) já estão quase todas nos gatilhos do
`pilares.py` — o que é uma confirmação independente de que a régua está calibrada.

### O formato lista, que serve direto ao estoico

"Conteúdos em lista, parte 1 a 6, com CTA de *segue para a parte 2*" — vídeos de
1 minuto ou mais, contando algo que prende.

**O LB é isso de fábrica.** Uma peça de estrutura B tem 5 reflexões numeradas;
derivar como série de 5 partes com CTA encadeado é o formato nativo do material,
sem forçar nada. Vale testar contra a derivação avulsa.

### Fast Vertising = o canal de futebol

Aproveitar notícia recém-saída, rápido, enquanto o assunto está quente. É
literalmente a operação do Bora de Bola, com a janela de ~48 h já registrada em
§6.4. O material reforça: **a velocidade é o ativo** — e por isso os curtos de
futebol saem junto com o longo, não depois.

### O que NÃO importamos, e por quê

| Prática do material | Por que fica de fora |
|---|---|
| "Replicar vídeos americanos de sucesso em português" | é reconto de obra de terceiro. Modelar **estrutura** é o que fazemos (`modelar-referencia.md`); copiar peça é outra coisa |
| "Republicar virais do ViralHog até viralizarem de novo" | ViralHog é **licenciador** — republicar sem licença é violação, e o `gate-audio`/licença do squad barra |
| Transformar artigo de portal em vídeo com ChatGPT | o roteiro é do `@head-of-copy`, com `claim-ledger` e âncora de fonte. O canal de futebol já vive disso, mas **com atribuição** |
| **10 a 15 vídeos/dia, meta de 24** | incompatível com o nosso gargalo. Cada curto custa GPU: ~1 h de imagens por longo, ~57-90 min por take de vídeo. O material assume produção por recorte/reciclagem, de custo marginal quase zero; o nosso motor **gera**. São economias diferentes |

**A tensão de fundo, dita com clareza:** o material otimiza para **volume** —
quantidade alta de peças baratas, apostando que uma pega. O nosso motor é o
oposto: poucas peças caras, cada uma com pack visual próprio. Não dá para adotar
a cadência dele sem mudar o motor.

Onde isso nos deixa: as faixas de 15 e 30 s são o nosso ponto de aproximação —
são as mais baratas (2-3 imagens) e as que mais se beneficiam do teste sequencial
por janelas. **Se for para buscar volume, é por ali.**

---

## 10 · O primeiro lote — LA1, para calibrar

Não fazer as 21 unidades de uma vez. **LA1 primeiro**, 7 unidades, nas três faixas.

| # | Unidade | Faixa | Por quê |
|---|---|---|---|
| 1 | Tese da abertura — disciplina é estrutura, não vontade | 15 s | tese seca, sem anedota |
| 2 | Prática 1 — Comece antes de estar pronto | 60 s | a anedota de Marco Aurélio é forte |
| 3 | Prática 2 — Faça a coisa difícil primeiro | 30 s | — |
| 4 | Prática 3 — Pratique a privação de propósito | 30 s | — |
| 5 | Prática 4 — Transforme a decisão em regra | 15 s | tese autossuficiente |
| 6 | Prática 5 — Separe o que é seu do que não é | 60 s | é a dicotomia do controle, pede desenvolvimento |
| 7 | Prática 6 — Feche o dia em revista | 30 s | — |

**Custo:** ~20 imagens (≈1 h de GPU) + ~4 min de narração + 7 roteiros.
**Mais 1 take I2V de teste**, para medir o tempo por take antes de qualquer fila grande.

**O que medir depois:** retenção aos 3 s **por faixa**. É isso que diz se 15 s é sonda
útil ou desperdício — e a resposta muda o resto do plano.
