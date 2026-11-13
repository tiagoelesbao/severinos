# Benchmark — dois canais dark de curiosidades

> Levantado em 2026-09-07 a partir de dois canais indicados pelo founder.
> O que está aqui é **método**: estrutura, ritmo e camadas gráficas medidos no
> material. Nenhum roteiro deles é reproduzido — o que se copia é a forma, que
> não é de ninguém; o texto é de quem escreveu.

---

## Os dois canais

| | **@mundoanimalcurioso-u1l** | **@darkniche1** |
|---|---|---|
| Inscritos | 214 mil | **1,47 mi** |
| Vídeos | 320 | 235 |
| Idioma | português | inglês |
| Frequência | ~1 upload/semana | — |
| Receita estimada (vidIQ) | US$ 146/mês | — |
| Views em 7 dias | 519 mil | — |
| Formato | top 5 / curiosidade animal | placa de aviso + revelação |

O primeiro tem **6,9× menos inscritos** e uma frequência baixa. O segundo é o
que escalou, e é também o mais sistematizável — por isso o grosso deste
documento é sobre ele.

---

## O formato do @darkniche1, camada por camada

Medido no vídeo `lUxdIPrPycc` (38,3 s, 1440×2560, 30 fps).

### As cinco camadas

| Camada | O que é | Onde |
|---|---|---|
| **1. Fundo** | clipes curtos de acervo, **sem relação entre si** | todo o vídeo |
| **2. Placa** | losango/círculo amarelo, borda vermelha, pictograma preto, montada num poste | 0-5 s e volta no fecho |
| **3. Seta** | seta vermelha grossa apontando para a placa | entra ~2,5 s |
| **4. Legenda** | 2 linhas, caixa-alta, palavra-chave em **verde neon** com glow, resto branco | contínua |
| **5. Reação** | emoji flutuante (😲 😢 ❤️) ancorado perto da legenda | nos picos |

**A descoberta que torna isto escalável:** os clipes de fundo **não contam uma
história visual**. Floresta, cachorro, filhotes, homem numa cerca — nada se
conecta. A história inteira está na NARRAÇÃO e nas LEGENDAS; o vídeo é
ilustração solta.

Isso significa que o formato **não depende de material específico**. Qualquer
acervo serve, desde que o ritmo e as camadas gráficas estejam certos.

### O ritmo — medido, não estimado

```
43 trocas de plano em 38,5 s  →  uma a cada 0,9 s
```

Contra os ~2,7 s do nosso motor de curtos. **É três vezes mais picotado.**

### A locução — medida

| | Referência | Nosso motor hoje |
|---|---|---|
| Ritmo | **233,3 palavras/min** | 196 |
| Pausas > 0,35 s | **2 em 38 s** (maior: 0,66 s) | várias |
| Variação de RMS | **4,3 dB** | maior |

Três números que descrevem o mesmo estilo: **rápido, contínuo e comprimido**.
Não é interpretação — é leitura corrida, sem respiro e sem pico dramático. Isso
é reproduzível com voz de banco ajustando `atempo` e a compressão; não depende
de clonar ninguém.

### A estrutura narrativa

| Trecho | Função |
|---|---|
| 0-5 s | **Hook.** A placa misteriosa aparece com a seta. A pergunta é feita e não respondida |
| 5-13 s | **Adiamento.** "Eu te conto, mas primeiro..." — com um bicho reativo na tela |
| ~13,5 s | **CTA NO MEIO**, embrulhado num filhote fofo |
| 17-25 s | **Apelo emocional** + pedido de compartilhamento |
| 29-38 s | **Retorno à placa** e o desfecho |

> **O CTA no meio é a escolha mais interessante do formato.** A convenção manda
> pedir inscrição no fim; eles pedem aos 13 s, ou seja, a um terço — e pagam o
> custo de retenção com um filhote na tela. Quem larga ali já viu um terço; quem
> fica, viu o pedido no ponto de maior atenção.

O **primeiro frame** é sempre a imagem mais estranha que existir no vídeo — no
`@mundoanimalcurioso` isso é explícito nas capas: mão gigante segurando um
bicho, cobra na parede, animal deformado.

---

## O que dá para reaproveitar, e o que não

**Formato não é de ninguém.** Estrutura de hook, ritmo de corte, CTA no meio,
placa + seta, legenda com palavra em destaque — tudo isso é gramática de nicho,
e copiar gramática é o que todo canal do mundo faz. É exatamente o que este
squad já fez ao modelar o canal estoico e o de futebol.

**O que não entra na esteira:** republicar o arquivo de vídeo deles com a marca
removida, e clonar a voz do narrador. O primeiro é redistribuir a obra; o
segundo é usar a identidade vocal de uma pessoa específica. Nenhum dos dois é
necessário para o resultado — o item abaixo mostra por quê.

**E não precisamos mesmo.** A própria análise mostra que o fundo é acervo solto
sem relação entre si. Nós já temos: `acervo_curto.py` (Pexels vertical, com
folha de contato e guarda de tom), ComfyUI para gerar o que o acervo não tem, e
um banco de vozes com `pode_publicar: sim`. O que falta é só a camada gráfica.

---

## O que precisa ser construído

O motor de curtos (`monta_curto.py`) já entrega **quatro** das cinco camadas:
corte curto com movimento, legenda em libass com palavra em destaque, zona
segura medida e trilha com ducking. Falta:

| Item | Esforço | Nota |
|---|---|---|
| **Placa de aviso** como overlay | baixo | é PNG com alpha sobre o vídeo — o mesmo caminho das cartelas do futebol |
| **Seta vermelha** animada | baixo | `overlay` com posição por expressão; o desenho já existe em `thumb/estilos.html` |
| **Emoji reativo** | trivial | `drawtext` já suporta; o motor de curtos já tinha um |
| **Corte a 0,9 s** | trivial | `--corte 0.9` |
| **Locução a 233 wpm** | baixo | `--voz` mais alto + compressão no mix |
| **CTA no meio** | baixo | hoje a chamada é só no fim; passa a aceitar posição |
| **Cor de destaque verde neon** | trivial | é config de canal, como o âmbar e o amarelo |

Nada aqui é pesquisa. É um canal novo no dicionário `CANAIS` e uma camada de
overlay gráfico — provavelmente uma tarde de trabalho, e ele nasce herdando as
correções de zona segura, baseline e karaokê que os outros dois já pagaram.

---

## O que ainda não sei

**O vídeo do `@mundoanimalcurioso` não baixou** — o YouTube devolveu 403 em duas
rotas. Do print do canal dá para ver o formato (top 5, legenda amarela/verde
queimada, capa com zoom em bicho), mas **não medi o ritmo nem a locução dele**.
Se ele importa para a decisão, o caminho é o founder baixar e me passar o
arquivo.

**Não há dado de retenção.** Tudo aqui é estrutura observável; o que faz esses
canais performarem pode estar na escolha de assunto, na distribuição ou na
frequência, e isso o vídeo não conta.
