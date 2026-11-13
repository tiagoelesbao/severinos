# Personagem consistente — o método por LoRA

> **Fonte:** *Create HYPERREALISTIC AI Characters That INTERACT* (MickMumpitz),
> 34 min, transcrita e decomposta em 2026-09-11. Transcrição completa e 40 telas
> em `docs/aulas/character-consistency/`.
>
> **Por que este documento existe:** o que eu improvisei no teste da influencer
> — ficha travada no prompt + semente fixa — dá semelhança, não identidade. O
> método real é outro, e é treino.

---

## 1 · A tese

**Consistência de personagem é uma LoRA, não um prompt.**

Uma LoRA é um arquivo pequeno que se acopla ao modelo grande. O modelo base já
sabe como é um humano em geral; ele não sabe como é a *sua* pessoa. Treinar é
mostrar a ele um conjunto de imagens dessa pessoa até que um **trigger word**
passe a significar esse rosto.

Isso muda a natureza do trabalho: em vez de descrever o rosto em cada prompt e
torcer, você treina uma vez e depois só cita a palavra.

---

## 2 · As cinco regras de dataset

São ditas na aula como regras, e cada uma resolve um defeito específico.

### 1. O trigger word

Uma palavra inventada, presente em **toda** legenda do dataset. Durante o
treino, **tudo o que não estiver explicitamente escrito na legenda gruda nessa
palavra**. O trigger word vira o personagem.

### 2. Varie o que você quer poder generalizar

Treinando só com close-ups, o modelo aprende que o personagem *só existe* em
close-up. O mesmo vale para luz, pose e roupa. Plano aberto tem de entrar.

### 3. Decida o que fica fixo e o que muda depois

Se o personagem sempre usa a mesma roupa, treinar sempre com ela é legítimo. Se
você quer poder trocar, varie no dataset.

### 4. A legenda decide o que você pode mudar depois

Vinte imagens com a mesma roupa **ainda** permitem trocá-la — desde que a
legenda descreva a roupa. Aí a LoRA aprende que aquela roupa **não** faz parte
do trigger word.

> **O troco:** quanto mais detalhada a legenda, mais flexível você fica — e mais
> longo o prompt terá de ser depois, porque você precisa recitar tudo o que quer
> que o personagem tenha.

### 5. Legenda é prompt ao contrário

A legenda tem de ser escrita **no mesmo estilo do prompt** que aquele modelo de
imagem espera:

| modelo | formato de legenda |
|---|---|
| **Krea 2** | linguagem natural longa e descritiva |
| **Ideogram 4** | JSON estruturado com *bounding boxes* |

Legenda no formato errado treina uma LoRA que não responde ao jeito que você vai
promptar.

---

## 3 · A esteira

    CCC 4.0          gera o dataset a partir de 1 imagem de referência
      ↓
    DATASET-TAGGER   escreve a legenda de cada imagem, no formato do modelo
      ↓
    (TAG-REVIEW)     corrige bounding box errada — só para Ideogram
      ↓
    AI Toolkit       treina a LoRA (local ou em GPU alugada)
      ↓
    KREA-2-IMG       gera as cenas com o trigger word
    IDEOGRAM         idem, com controle de posição por bounding box
    WAN-2-2-VID      idem, em vídeo

### 3.1 · CCC 4.0 — do retrato ao dataset

Entrada ideal: **uma foto de corpo inteiro, alta resolução**. O workflow extrai
um close do rosto automaticamente — importante porque, a partir de um plano
aberto, o modelo precisa do close para entender o rosto.

> **Armadilha medida na aula:** com entrada em close (sem corpo), a roupa *não*
> pode ser extraída e o modelo inventa o resto. A correção é nomear no prompt o
> que a foto não mostra — "wearing black loafers".

Modo **preview** primeiro. Só depois de o dataset estar bom é que se troca para
salvar.

**O workflow é modular de propósito.** Cada grupo de imagem pode ser copiado e
religado. Isso resolve o caso que sempre aparece: um detalhe que muda entre as
imagens. Na aula, o colar da personagem variava — a solução foi recortar o colar
do original, carregar como **terceira imagem de referência**, e criar um grupo
só de closes dele.

Até quatro imagens de referência por grupo. A combinação padrão é **T-pose +
rosto em close**, que dá a maior flexibilidade.

> **Segunda armadilha:** o prompt geral vaza. Ao gerar um close do colar, o
> modelo tentava desenhar sapatos, porque sapatos estavam no prompt geral. Dá
> para escolher **quais prompts** cada grupo recebe, não só quais imagens.

Saída em `ComfyUI/output/ccc/{nome-do-personagem}/`.

### 3.1.1 · Inserir um objeto na referência — a técnica do colar

É a parte mais reaproveitável da aula, e resolve um problema que aparece em toda
peça de cliente: **um detalhe que o modelo não acerta sozinho.** Na aula é um
colar que mudava entre as imagens. Para nós foi o logo da Império Prêmios.

**Os quatro passos, na ordem em que ele faz:**

1. **Recortar o objeto** e carregá-lo num `LoadImage` próprio — na aula,
   literalmente com a ferramenta de captura do Windows.
2. **Ligá-lo como terceira referência** no grupo de geração. Cada grupo aceita
   até quatro imagens; o CCC usa duas (corpo inteiro + rosto) e deixa `image_1`
   e `image_2` livres.
3. **Criar grupos só do objeto** — duplicar um grupo de geração e pedir close,
   ângulo lateral e outra condição de luz. Essas imagens entram no dataset: é
   assim que a LoRA aprende o detalhe.
4. **Guardá-lo num `SetNode`** para poder referenciá-lo nos grupos seguintes no
   lugar da T-pose.

**A armadilha, medida na aula:** ao gerar o close do colar, *o modelo tentava
desenhar sapatos* — porque sapatos estavam no prompt geral. A correção não é
mexer no prompt do grupo: é **escolher quais prompts o grupo recebe**. No close
do objeto, o texto vai direto do prompt manual, sem o `JoinStringMulti` que
concatena estilo + roupa.

> Palavras dele: *"you can not only choose which reference images you want to
> choose, but you can also choose the prompts that you want to reference."*

**O que a nossa aplicação acrescentou** (`apps/infra/prepara_ref_logo.py`):

| achado | por quê |
|---|---|
| A referência solta **não basta** | Arte flutuando não diz onde nem em que tamanho ela mora. A foto do personagem precisa vir **já com o objeto aplicado** — é ela que é a referência principal (`pixels`). |
| Estampa **multiplicada**, não colada | Logo chapado vira adesivo: fica reto num tecido que tem prega. Multiplicando pela luminância do tecido embaixo, a prega atravessa a arte. |
| Posição derivada do **rosto** | A caixa do rosto (YOLO) dá centro do torso e escala. Funciona em qualquer foto nova do personagem, não só na primeira. |
| O arquivo oficial **pode ter a cor errada** | O logo da Império veio para fundo magenta: coroa dourada e wordmark **branco**. Aplicado na camiseta branca, o texto some. A camiseta real da marca tem o wordmark escuro — então escurecer não é inventar cor, é reproduzir a aplicação que existe. O corte é **geométrico** (tudo abaixo do último pixel dourado), porque as estrelinhas dentro da coroa também são brancas e devem continuar brancas. |
| Onde o objeto **não** entra | Closes de rosto (não há peito no quadro) e vistas de costas (a estampa é no peito). Pendurar referência que o quadro não comporta faz o modelo tentar encaixá-la à força. |

**Texto continua sendo o limite.** Difusão reproduz forma com fidelidade
razoável e texto não reproduz de forma confiável. Com o logo como referência
direta o wordmark tem chance real nos planos próximos; nos planos abertos ele
vai borrar. Para entrega final, o wordmark legível é camada de pós — não
resultado de geração.

### 3.2 · Múltiplos personagens — o truque que faz funcionar

Rodar o CCC uma vez por personagem e jogar tudo numa pasta **não basta**.

**É preciso incluir imagens dos personagens JUNTOS na mesma cena** — só assim o
modelo aprende que são entidades separadas. Na aula: duplicar um grupo, carregar
plano aberto + close de cada personagem, concatenar, reduzir, e usar tudo como
referência, com prompt do tipo "os três personagens estão juntos…". Algumas
variações com dois, outras com três, e não só lado a lado — **interagindo**.

Na hora de legendar, o trigger word do nó fica **vazio** e as regras vão no
prompt do tagger:

    a mulher loira de bolsa é `berlin-model`
    o homem negro de gola rulê cinza é `male-model-01`
    a mulher de cabelo cacheado é `emily-05`
    se houver mais de um personagem na imagem, cite os dois trigger words,
    onde estão no quadro e como interagem

### 3.3 · Treino — os números da aula

| parâmetro | valor | observação |
|---|---|---|
| ferramenta | **AI Toolkit** (ostris) | local, ou RunPod para GPU nova |
| arquitetura | `krea2 raw` / `ideogram 4` | tem de casar com o modelo alvo |
| linear rank | **16–32** um personagem · **64** três personagens | |
| steps | 3.000 | mais do que o necessário, de propósito |
| samples | a cada 250 steps | é como se acompanha o treino |
| duração | ~80 min na RTX PRO 6000 | |

> **A melhor versão não é a última.** A aula é explícita: baixe várias versões
> intermediárias e teste. **O ponto ideal costuma ficar entre o step 1250 e o
> 2000** — depois disso começa a sobreajustar.

**Ideogram é modelo gated.** Precisa aceitar a licença no HuggingFace, criar um
token de leitura e colá-lo nas configurações do AI Toolkit.

### 3.4 · Geração

**Krea 2 gosta de prompt longo e detalhado.** O método da aula: pedir a um LLM
que escreva um prompt bem detalhado **uma vez**, e depois só ajustar a cena. O
formato se reaproveita.

**Ideogram 4 aceita bounding box** — você desenha onde cada personagem fica e o
modelo obedece. Acaba a rodada de 20 tentativas até a composição sair certa.

> **Terceira armadilha, e é fácil cair:** o Ideogram usa um formato de bounding
> box **rotacionado**. Um LLM olhando aquilo diz que está errado. **Não está.**
> É preciso dizer ao LLM que o formato é esse mesmo.

---

## 4 · O que a versão paga acrescenta

Duas etapas, e as duas atacam defeitos reais:

**Upscaler** — leva o dataset a 2K com SDXL sem mudar o rosto.

**Face detailer seletivo** — em T-pose de corpo inteiro o rosto fica pequeno
demais para o modelo gerar com fidelidade, e muda um pouco. O detalhador **não**
roda em tudo: um nó pré-seleciona só as imagens em que o rosto está pequeno.

> **Refeito, e está no repositório.** `apps/infra/adapta_ccc.py` insere as duas
> etapas no grafo e grava `CCC_4-01_BRUNO.json`. Onde a aula usa SeedVR2 (7B, de
> vídeo, que não temos), entra `ImageUpscaleWithModel` com `RealESRGAN_x2plus` —
> 2×, que é exatamente o 1024 → 2048 que ele cita; `4x-UltraSharp` passaria de 4K
> e só gastaria disco.
>
> O seletivo é o `CCC_FaceAreaBatchSplitter` (do próprio pacote dele, já
> instalado) com `area_threshold 0.15`: corpo inteiro em T-pose fica em 3-5% da
> área e entra; close fica em 40-60% e passa direto.
>
> **Dois números que não podiam ser herdados do padrão:** o FaceDetailer do
> Impact-Pack vem com `cfg 8.0` e 20 passos — Flux2 Klein é destilado e isso
> queima a imagem. Ficaram os valores do nosso `flux2-klein-pro-refino-upscale`,
> que já roda: 8 passos, cfg 1.0, euler/simple, denoise 0.35.
>
> E o modelo do detailer é o **`model clean`** (UNETLoader puro), não o `model`:
> este passa por `IdentityGuidance`, que é guia de *edição* com imagem de
> referência, e o detailer faz inpaint comum — não tem referência para dar a ele.

---

## 5 · O que muda para nós

| antes (meu teste) | agora |
|---|---|
| ficha travada no prompt + semente fixa | LoRA treinada com trigger word |
| semelhança forte, identidade não garantida | identidade real, reutilizável |
| cada cena reescreve o rosto inteiro | cita a palavra e descreve só a cena |
| dois personagens na mesma cena: impossível | treinável, com imagens conjuntas |

**O custo que aparece:** treino. ~80 min de GPU boa por personagem, mais o tempo
de montar o dataset. Em troca, o personagem passa a ser um **ativo** — treina
uma vez, usa em toda peça.

Para a influenciadora de IA isso é decisivo: um perfil precisa da mesma pessoa
em dezenas de vídeos ao longo de meses.

---

## 6 · Pendências para a nossa adaptação

- **Onde treinar.** A aula usa RunPod. Vale medir se o nosso hardware treina
  LoRA de Krea 2 em tempo aceitável antes de decidir por GPU alugada.
- **Legenda em português.** O tagger é um LLM; as regras de legendagem podem ser
  escritas em português, mas os prompts de geração seguem o formato do modelo.
- **Ligar ao nosso motor.** A saída é imagem; o `monta_curto.py` já anima foto
  com push lento e o Wan 2.2 faz I2V. O elo de lipsync vem da outra aula.
