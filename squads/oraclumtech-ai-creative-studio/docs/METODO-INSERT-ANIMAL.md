# O método do insert de animal — medido em três vídeos

> Levantado em 2026-09-07 sobre três vídeos do `@darkniche1` (1,47 mi de
> inscritos). O founder apontou o insert de animal como o que faz o método
> funcionar. A medição confirma — e mostra que é mais sistemático do que
> "às vezes fofo, às vezes machucado".

---

## Não é variação. É template travado.

Os três vídeos têm a **mesma estrutura, quase segundo a segundo**:

| Bloco | d1 · lagarta | d2 · espuma do mar | d3 · olho |
|---|---|---|---|
| **Hook** — placa + seta + círculo | 0-5 s | 0-4 s | 0-5 s |
| **Animal reativo** ⁉️ | cachorro · 6-12 s | husky · 5-9 s | gato · 6-12 s |
| **Animal fofo** + LIKE/SUBSCRIBE | gatinhos · 13-15 s | gatinho · 10-12 s | gato c/ flores · 13-15 s |
| **Animal sofrendo** + 😢 ❤️❤️❤️ | gato triste · 16-28 s | cão paralisado · 13-23 s | **gato cego** · 16-27 s |
| **Retomada** da placa | 29-31 s | 24-26 s | 28-29 s |
| **Payoff** — o assunto de verdade | 32-42 s | 27-36 s | 30-42 s |
| Duração total | 43 s | 37 s | 43 s |

**Os inserts ocupam 22 a 23 s dos 37-43 s — cerca de 55% do vídeo.** Mais da
metade da peça não é sobre o assunto anunciado no hook.

---

## O detalhe que quase ninguém veria

**O animal sofredor RIMA com o assunto do vídeo.**

| Vídeo é sobre | O animal é |
|---|---|
| olhos saltados / visão | um gato **cego** |
| pessoas presas na espuma, sem conseguir se mover | um cão **paralisado**, arrastando as patas na faixa |
| lagarta que causa irritação na pele | um gato visivelmente **doente** |

Não é acaso — é rima temática. O insert não é só "um bicho triste para dar pena":
é o mesmo problema do vídeo, num corpo pequeno e indefeso.

É por isso que ele não parece enxerto. **A escolha do animal é escolha de
roteiro, não de acervo.**

---

## As três funções, e por que nessa ordem

| Insert | Função real | Pedido |
|---|---|---|
| **1. Reativo** (olhos arregalados, ⁉️) | personificar o espanto do espectador logo depois do hook | nenhum |
| **2. Fofo** (3 s, o mais curto) | pagar o custo de retenção do CTA | inscrição |
| **3. Sofredor** (11-13 s, o mais longo) | criar dívida emocional | coração no comentário, compartilhar |

**O bloco mais longo é o que pede mais.** O sofredor tem 4× a duração do fofo, e
é onde entram os dois pedidos que valem mais para o algoritmo — comentário e
compartilhamento.

E o CTA fica **aos 10-13 s**, a um terço do vídeo, não no fim. Quem larga ali já
viu um terço; quem fica, recebeu o pedido no ponto de maior atenção.

---

## As camadas gráficas

| Camada | Descrição |
|---|---|
| **Placa** | losango amarelo, borda vermelha, pictograma preto, montada em poste, sobre o cenário |
| **Círculo + seta** | círculo vermelho fino em volta da placa + seta vermelha grossa; entram ~1,5 s depois da placa |
| **Legenda** | 2 linhas, caixa-alta, palavra-chave em **verde neon com glow**, resto branco; algumas palavras em **vermelho** |
| **Emoji** | ⁉️ no reativo, 😢 no sofredor, ❤️❤️❤️ no pedido de comentário |
| **Botão** | LIKE / SUBSCRIBE / SHARE desenhados no meio do quadro |
| **Marca** | `@darkniche1` discreta no topo |

**Ritmo:** 43 trocas de plano em 38,5 s — **uma a cada 0,9 s**.

---

## A locução — e a pergunta da voz

Medido nos dois vídeos do `@mundoanimalcurioso` e num do `@darkniche1`:

| | animal a1 | animal a2 | darkniche |
|---|---|---|---|
| F0 médio | 137,1 Hz | 140,7 Hz | 183,0 Hz |
| Desvio de F0 | 32,7 | 36,3 | 68,1 |
| **Variação de RMS na fala** | **2,0 dB** | **2,0 dB** | **2,0 dB** |
| Ritmo | — | — | **233 palavras/min** |
| Pausas > 0,35 s | 6 em 72 s | 5 em 73 s | 2 em 38 s |

**O que os números sugerem.** O F0 médio dos dois vídeos do canal animal difere
em 2,6% — dois dias diferentes de um locutor humano variam mais que isso. E
2,0 dB de variação dinâmica dentro da fala é compressão que voz humana não tem
sem processamento pesado.

**A leitura mais provável é TTS, não locutor.** É inferência forte, não prova —
mas se estiver certa, não existe "voz de pessoa" para clonar: existe um perfil
sintético, e perfil se reproduz.

**E o nosso já está perto.** Medindo a narração real do curto de futebol contra
a referência:

| | F0 | RMS dev |
|---|---|---|
| referência (canal animal) | 137-141 Hz | 2,0 dB |
| **nossa voz do Bora de Bola** | **159,4 Hz** | **2,1 dB** |

A compressão bate quase exata. O pitch está ~15% acima — ajustável, e
provavelmente nem precisa.

> **O que falta para chegar no som deles não é a voz. É o ritmo:** 233 wpm
> contra os 196 do nosso motor, e quase nenhuma pausa. Isso é `--voz` e
> parâmetro de pausa, não clonagem.

---

## Um achado colateral no nosso banco de vozes

Ao medir as amostras para comparação, `01-voz-casa-ptbr` e `03-male-02`
devolveram números **idênticos até a primeira casa decimal** — F0 81,1 Hz,
desvio 9,0, mesma fração de trecho com voz detectada. Os arquivos têm md5
diferentes, mas o conteúdo de áudio é indistinguível.

**Duas fichas do banco parecem apontar para a mesma amostra.** Quem escolher voz
comparando esses dois arquivos está comparando um com ele mesmo.

Também vale registrar: o F0 de 81 Hz é grave demais para fala normal e pode ser
o detector travando num sub-harmônico. **Não usei esse número para decidir nada**
— a comparação que vale é a da narração real, que é o mesmo tipo de arquivo das
referências.

---

## O que isso vira, na prática

Um canal novo no `CANAIS` do `monta_curto.py` mais uma camada de overlay
gráfico. Quatro das cinco camadas o motor já tem. O que é novo:

1. **Placa + círculo + seta** — PNG com alpha, o mesmo caminho das cartelas
2. **Emoji reativo** — `drawtext`, já existia
3. **Botões LIKE/SUBSCRIBE/SHARE** — PNG com alpha, com tempo próprio
4. **CTA no meio** (hoje só existe no fim)
5. **Corte a 0,9 s** e **voz a ~233 wpm** — parâmetros
6. **Verde neon** como cor de realce — config de canal

E, do lado do roteiro, uma regra nova que o motor não resolve sozinho:
**o animal do bloco 3 tem que rimar com o assunto**. Isso é decisão de quem
escreve, e é o que separa o formato bem feito do enxerto.

---

## O que não medi

**Retenção.** Nada aqui diz onde as pessoas largam. A estrutura é observável; o
desempenho não.

**Se o insert é obrigatório.** Três vídeos do mesmo canal mostram consistência,
não causalidade. Pode ser que o canal performe apesar do insert, não por causa
dele — só um teste A/B nosso responde.

**A origem dos clipes de animal.** Não sei de onde eles vêm. Para nós isso é
decisão à parte: acervo licenciado, geração própria, ou material do founder.
