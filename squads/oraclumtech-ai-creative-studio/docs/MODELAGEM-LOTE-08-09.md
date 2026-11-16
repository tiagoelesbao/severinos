# Modelagem do lote de 08/09 — 15 vídeos dos dois canais

> **O que é.** Transcrição e decomposição de 15 vídeos validados: 8 do canal
> PT de curiosidades e 7 do canal EN de placas. O objetivo não é copiar texto —
> é extrair a **forma**, que é gramática de nicho, e produzir conteúdo nosso
> dentro dela.
>
> Transcrições completas: `%TEMP%/lote_txt/` (faster-whisper `small`).

---

## 1 · `curiosidades-animais` — a contagem regressiva

**8 vídeos, 53 a 73 s.** A estrutura é rígida a ponto de dar para escrever a
gramática:

    TÍTULO FALADO   "Animais que [X]." | "Os animais mais [X] do mundo."
    ITEM (×3 a 5)   "Número N." + "[Bicho]." + duas frases de explicação
    (sem CTA, sem fecho — o último item termina e o vídeo acaba)

### O que a decomposição mostrou

| observação | número |
|---|---|
| o título falado é **uma frase só**, 2,0 a 3,5 s | 8 de 8 |
| o nome do bicho vem **separado** do número, em fala própria | 8 de 8 |
| a explicação são **duas frases**, quase sempre | 7 de 8 |
| a contagem é 5→1, 4→1 ou 3→1 | 3 / 4 / 1 |
| **não há CTA nenhum** | 8 de 8 |
| o vídeo termina no item nº 1, sem fecho | 8 de 8 |

**A ausência de CTA é uma escolha, não um esquecimento.** O canal aposta na
contagem regressiva como retenção: quem entra no "número 5" fica para ver o
"número 1". Pedir alguma coisa no meio quebraria justamente isso.

> **A nossa variação, decidida em 08/09:** mantemos a contagem, mas entram os
> gestos do TikTok — SEGUE no meio e COMENTA no fecho — porque os perfis são
> novos e precisam converter seguidor, não só reter. É desvio consciente do
> modelo, e está registrado como tal.

### Os oito assuntos do lote modelado

1. Animais que matam com um golpe · casuar, zebra, girafa, urso
2. Animais que estão desaparecendo (pt.2) · pardal, vagalume, abelhas
3. Animais estranhos do mar · polvo-dumbo, olho-de-barril, lula-vampira, tubarão-duende
4. Animais que matam com uma mordida · hipopótamo, crocodilo, tubarão-branco, orca
5. Animais que são verdadeiros amigos · sapo+tarântula, camarão-pistola+gobídeo, corvo+lobo, pica-boi+búfalo
6. Melhor faro da natureza · lobo, elefante, urso-pardo, urso-polar, urubu
7. Os mais pesados do mundo · hipopótamo, rinoceronte, elefante, tubarão-baleia, baleia-azul
8. Os mais rápidos de cada ambiente · guepardo (terra), …

**O padrão de assunto:** um **superlativo mensurável** (mais pesado, mais
rápido, melhor faro, mais forte) ou uma **relação inesperada** (parceria,
desaparecimento). Nunca "curiosidade genérica" — sempre uma lista ordenável.

---

## 2 · `placas-de-aviso` — o gancho em seis blocos

**7 vídeos, 31 a 40 s.** A rigidez aqui é ainda maior: os seis blocos aparecem
na mesma ordem, com as mesmas funções, em 7 de 7.

| bloco | tempo | função | fala típica |
|---|---|---|---|
| 1 | 0–4 s | **placa + ordem** | "If you ever see this sign [onde], turn back and run immediately" |
| 2 | 4–8 s | **reação** | grito + "Bro, is that [leitura absurda]?" |
| 3 | 8–12 s | **isca + CTA** | "I'll tell you, but first, if you think this cat is cute, like and subscribe" |
| 4 | 12–21 s | **insert emocional** | animal abandonado, faminto, tremendo |
| 5 | 19–25 s | **pedido de coração** | "leave a heart emoji in the comments, because a kind person like you will surely be blessed" |
| 6 | 25–40 s | **payoff** | a explicação real da placa |

### As três descobertas que importam

**1. A placa é REAL, e o payoff é honesto.** Mosquito gigante, pessoa caindo de
penhasco, monstro do Lago Ness, humano montando dinossauro, Godzilla. Em todos,
o bloco 6 explica o que a placa realmente é — atração turística, aviso bem-humorado,
sinalização real de risco. **O gancho é o estranhamento, não a mentira.**

**2. A frase de CTA é literalmente a mesma nos sete vídeos**, com variação
mínima: *"if you think this cat is cute, like and subscribe"* e *"a kind person
like you will surely be blessed"*. Não é preguiça — é fórmula testada, dita no
mesmo lugar toda vez.

**3. O insert emocional não tem relação com a placa.** É sempre um bicho
abandonado, e o roteiro descreve o sofrimento em duas ou três frases. Ele existe
para pagar o pedido de comentário, não para ilustrar o assunto.

> **A nossa variação (07/09), e por quê.** No nosso piloto o insert **rima com
> o assunto**: vídeo sobre animal que perde a autonomia → bicho dependente na
> beira da estrada. É desvio deliberado — nos três vídeos que medimos em
> `METODO-INSERT-ANIMAL.md` a rima existia, e é o que faz o insert não parecer
> enxerto. O founder também decidiu usar o registro dependente/magro em vez do
> ferido.

### Os sete assuntos do lote modelado

| placa | payoff real |
|---|---|
| mosquito gigante na floresta | aviso bem-humorado sobre mosquitos transmissores |
| pessoa caindo | área de penhasco, aviso real para caminhantes |
| criatura no lago | monstro do Lago Ness — atração turística |
| humano montando dinossauro | decoração / festa temática |
| Godzilla na ponte | decoração e atração turística |
| placa noturna | (payoff visual: a câmera vira) |
| placa na estrada | (payoff visual: a câmera vira) |

**Dois dos sete têm payoff VISUAL, não verbal** — "when the camera turns, this
is what you'll see". É a variante mais barata de produzir e a mais difícil de
replicar sem o take real; o nosso payoff fica no verbal.

---

## 3 · O que vale replicar e o que não

| replicar | não replicar |
|---|---|
| a estrutura em blocos, com as marcas de tempo | o texto — é deles |
| a fórmula de CTA dita sempre no mesmo lugar | "like and subscribe" (é YouTube; ver `CANAIS-TIKTOK-DARK.md` §5) |
| a placa real com payoff honesto | payoff visual que depende de take que não temos |
| o insert emocional pagando o pedido de comentário | insert sem relação com o assunto — o nosso rima |
| a contagem regressiva sem CTA no meio | a ausência total de CTA — os perfis são novos |

---

## 4 · Os 15 packs deste lote

Os assuntos abaixo são **nossos**. A forma veio do benchmark; o conteúdo é de
história natural amplamente documentada, e onde não havia certeza de número
escrevemos a faixa em vez de inventar precisão (Artigo IV — No Invention).

### `curiosidades-animais`

| slug | assunto | itens |
|---|---|---|
| `CUR-p01` | 5 bichos mais perigosos da Amazônia | *(piloto, feito em 07/09)* |
| `CUR-l02` | animais que enxergam o que a gente não vê | 4 |
| `CUR-l03` | os animais mais venenosos do mundo | 4 |
| `CUR-l04` | animais que vivem mais de cem anos | 4 |
| `CUR-l05` | bichos que se defendem de um jeito absurdo | 4 |
| `CUR-l06` | os maiores predadores dos rios | 4 |
| `CUR-l07` | animais que mudam de cor | 4 |
| `CUR-l08` | os bichos mais barulhentos do planeta | 4 |
| `CUR-l09` | animais que quase não precisam beber água | 4 |

### `placas-de-aviso`

| slug | placa | payoff |
|---|---|---|
| `AVI-p01` | não alimentar os animais | *(piloto, feito em 07/09)* |
| `AVI-l02` | travessia de cangurus | sinalização real australiana |
| `AVI-l03` | cuidado com os pinguins | sinalização real, colônias urbanas |
| `AVI-l04` | queda de cocos | risco real em praia tropical |
| `AVI-l05` | não faça selfie com o bisão | Yellowstone, aviso real |
| `AVI-l06` | atenção: patos atravessando | sinalização real |
| `AVI-l07` | rota de evacuação de tsunami | sinalização real do Pacífico |
| `AVI-l08` | cuidado com hipopótamos | sinalização real africana |
