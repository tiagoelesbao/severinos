# CCC 4.01 — base AIOX

> **O que é:** o *Consistent Character Creator 4.01* do MickMumpitz com as seis
> etapas que faltavam, sem cliente nenhum dentro. Ponto de partida para qualquer
> personagem, peça ou filme.
>
> **Arquivo:** `CCC-4.01-AIOX-BASE.json` · 469 nós · gerado por
> `apps/infra/adapta_ccc.py --modelo`

---

## O que este arquivo tem que o original não tem

As duas primeiras são o que na aula é a **versão paga do Patreon**. As outras
quatro são nossas, e todas nasceram de defeito medido.

### 1 · Upscale do dataset — `RealESRGAN_x2plus`, 2×

Entre o `ImageCollectUnpack` e o `Set_FINAL`, então **tudo o que for salvo passa
por aqui**. O dataset de 1024 vira 2048, que é o alvo que ele cita na aula.

Ele usa SeedVR2 (7B, de vídeo). Não temos, e `4x-UltraSharp` passaria de 4K e só
gastaria disco.

### 2 · Face detailer seletivo

`CCC_FaceAreaBatchSplitter` com `area_threshold 0.15`: só vai para o detailer a
imagem em que o maior rosto ocupa menos de 15% da área. Corpo inteiro em T-pose
fica em 3-5% (entra); close fica em 40-60% (passa direto — e não deve ser mexido
mesmo). O `Merger` recoloca tudo na ordem original do lote.

**Dois números que não podem ser herdados do padrão:** o `FaceDetailer` do
Impact-Pack vem com `cfg 8.0` e 20 passos. Flux2 Klein é destilado e isso queima
a imagem. Aqui estão os valores do `flux2-klein-pro-refino-upscale.json`, que já
roda: **8 passos, cfg 1.0, euler/simple, denoise 0.35**.

E o modelo é o **`model clean`** (UNETLoader puro), não o `model` — este passa
pelo `IdentityGuidance`, que é guia de *edição* com imagem de referência, e o
detailer faz inpaint comum.

**`denoise 0.20`, e isto foi medido, não escolhido.** Na primeira rodada real
(27 imagens, as duas pastas casadas por conteúdo) o detailer a 0.35 **virou 5
aprovações em rejeições e não salvou nenhuma rejeição**. Cinco a zero, todas na
mesma direção: rosto mais magro, maxilar mais definido, bochecha cheia perdida —
ele puxa para o rosto **médio** do modelo.

O motivo é estrutural: todos os nós de geração recebem a **imagem** de
referência do rosto; o `FaceDetailer` não recebe imagem nenhuma, só o prompt de
texto — e a trigger word não significa nada para o modelo base **enquanto a LoRA
não existe**. Ele regenera 35% de um rosto genérico por cima de um rosto
específico.

> Depois da LoRA treinada o sinal se inverte e 0.35 volta a fazer sentido.
> Antes dela, não.
>
> **A correção de verdade:** `ApplyPuLIDFlux2` entre o `model clean` e o
> detailer, alimentado pelo `INPUT_FACE` — aí o detailer passa a ter identidade,
> como o resto do grafo já tem. Os nós estão instalados; falta medir.

### 3 · Upscale do recorte de rosto — `4x-UltraSharp`

O `AutoCropFaces` não recorta 3× o **lado**: recorta 3× a **área**.

```
sqrt(largura_rosto × altura_rosto × 3)
```

Num retrato de corpo inteiro o rosto ocupa ~1,5% do quadro, e essa conta dá algo
em torno de **320 px**. O `ImageResizeKJv2` seguinte estica isso até a resolução
de saída com lanczos puro — e lanczos não inventa detalhe, borra o que havia.

Esse recorte é lido por **23 dos 24 nós de geração**. O defeito não aparece numa
imagem: aparece em todas.

| | conta | o resize vira |
|---|---|---|
| sem upscale | 320 → 1024 | ampliação de 3,2× |
| com `x2` | 320 → 640 → 1024 | ainda ampliação |
| **com `4x`** | **320 → 1280 → 1024** | **redução — supersampling** |

Por isso 4× aqui e 2× no dataset: lá a imagem já nasce em 1024.

### 4 · A referência de rosto solta do seletor de resolução

No grafo do autor o `ResolutionSelector` governa **duas** coisas: o tamanho da
geração e o resize da referência de rosto. Em 1:1 passa despercebido. Escolhendo
9:16 para dataset vertical, a referência vira 768×1368 com `keep_proportion:
pad` — o recorte quadrado entra com 768 px de lado e mais da metade da tela vira
barra morta. **Pedir vertical encolhe a referência.**

São necessidades diferentes: a geração precisa do formato de entrega, a
referência só precisa de resolução — ninguém a enquadra, só a lê. Aqui ela é
**1024×1024 fixo** e o seletor manda só na geração.

### 5 · Três comparadores A/B

`ImageCompare` (núcleo do ComfyUI, a régua deslizante que ele usa na aula):

- **referência de rosto** — recorte cru contra o 4×
- **dataset** — antes e depois do upscale
- **rosto** — antes e depois do detailer, só nas imagens que o splitter separou

Existem porque sem eles não dá para saber se uma etapa fez alguma coisa. Já
aconteceu: o preview mostrava 636×636 e parecia que o upscale não tinha rodado,
quando tinha. O comparador troca *"parece igual"* por algo que se confere.

### 6 · Referências multi-ângulo — ligam sozinhas

**O problema que elas resolvem:** 45°, perfil e costas saem parecendo outra
pessoa. O motivo é estrutural — o modelo recebe duas referências e **as duas são
frontais**. Para um perfil ele não tem informação nenhuma sobre o lado daquele
rosto; está inventando a partir do que sabe de rostos em geral.

Cada nó aceita **quatro** referências e o CCC usa duas. As sobras (`image_1`,
`image_2`) recebem as vistas extras, **alocadas por pose** — não adianta dar a
vista de costas para um close frontal:

| pose | preferência |
|---|---|
| costas, braços erguidos | costas → 45° |
| perfil, caminhada lateral | perfil → 45° |
| closes de rosto | 45° → perfil |
| todo o resto | 45° |

**Ativação por presença de arquivo.** Coloque em `ComfyUI/input/`:

```
ref-45.png       45 graus, corpo inteiro   ← o mais informativo dos três
ref-costas.png   costas, corpo inteiro
ref-perfil.png   perfil 90°, meio corpo
```

Nada é ligado se o arquivo não existir — o modelo continua abrindo e rodando
para quem tem só uma foto, e passa a usar as vistas no instante em que elas
aparecem. Sem flag, sem editar o script. Quando o logo também está ligado, ele
tem prioridade em `image_1` e as vistas ficam com o que sobrar.

**A condição que decide tudo: mesma sessão.** Mesma roupa, mesma luz, mesmo dia,
mesmo corte. O que **varia** entre as referências o modelo entende como
variável; o que se **repete** ele entende como identidade. Um 45° com outro
cabelo ensina que o cabelo é opcional.

> Não confundir com a regra 2 da aula — *"varie o que quer poder generalizar"*.
> Aquela vale para o dataset **gerado**. Referência de entrada quer o oposto:
> constância máxima, a mesma pessoa vista de vários ângulos.

Não espelhe o 45° esquerdo para fazer o direito: inverte risca de cabelo e
assimetrias do rosto. Fundo liso e claro, luz suave e frontal — sombra dura na
referência vira parte do personagem.

**O efeito em cascata:** com as vistas ligadas, as imagens fora de eixo do
dataset passam a ficar certas — e aí podem entrar no treino. Sem elas precisam
ser descartadas, e um dataset só de frente treina uma LoRA que só sabe frente.

Se precisar de mais vistas do que slots, a aula tem a saída: concatenar várias
numa folha e reduzir antes de ligar (`ImageConcanate`, instalado). Use só quando
faltar slot — folha de contato às vezes faz o modelo copiar a grade e gerar
várias pessoas.

---

## Como usar num cliente novo

### 1 · A referência

**Corpo inteiro, alta resolução, frontal.** O workflow extrai o close do rosto
sozinho — mas ele extrai do que existe. Rosto de 160 px numa foto de 2000 px é o
teto de tudo o que vem depois.

> **Armadilha da aula:** com entrada em close (sem corpo), a roupa não pode ser
> extraída e o modelo inventa o resto. A correção é nomear no prompt o que a foto
> não mostra — *"wearing black loafers"*.

Coloque em `ComfyUI/input/` e troque no nó **ENTRADA**. O nome que está lá
(`COLOQUE-SUA-REFERENCIA.png`) não existe de propósito: falha alto se alguém
esquecer.

### 2 · Os três campos de identidade

| nó | o que pôr |
|---|---|
| **TRIGGER WORD** | palavra **inventada**, com número e grafia fora do comum. Se for só "bruno", o modelo já tem um monte de bruno e o treino briga com o que ele já sabe. |
| **ESTILO** | tipo físico + acabamento fotográfico. Entra em **todos** os prompts. |
| **ROUPA** | opcional. Vazio = copia da referência. |

### 3 · Preview antes de gravar

`Save Dataset` já vem em **2 = preview**. Só vire para `1 = save` depois que o
dataset estiver bom — é a ordem que a aula manda, e economiza uma rodada inteira
de disco.

### 4 · Os prompts

Os 24 são os originais do autor, e ele os escreveu genéricos **de propósito**:

> *"I just try to keep them like really general so they work with any kind of
> character."*

Adaptar prompt é trabalho de peça, não de modelo. Se for adaptar, a regra é:
**os estruturais ficam neutros.** T-pose, perfil, costas, closes e expressões
existem para ensinar o rosto, não para ser cena. Virando todos em cena da peça,
a LoRA aprende que o personagem só existe naquele cenário (regra 2 da aula).

---

## O que NÃO está aqui, e onde está

### Marca ou objeto do cliente

Depende de um asset que só existe quando há cliente. O mecanismo é a **técnica
do colar** da aula — objeto como terceira referência (`image_1`, que o CCC deixa
livre) mais grupos de close só dele — e está implementado em
`adapta_ccc.py :: insere_logo` + `apps/infra/prepara_ref_logo.py`.

Três coisas que só aparecem fazendo:

- **A referência solta não basta.** A foto principal tem de vir já com o objeto
  aplicado, e aplicado multiplicando pela luminância do tecido — colado chapado
  vira adesivo reto num tecido que tem prega.
- **O prompt geral vaza.** Na aula, gerando o close do colar, o modelo desenhava
  sapatos porque sapatos estavam no prompt geral. Nos grupos do objeto o texto
  vai direto do prompt manual, sem o `JoinStringMulti`.
- **A referência também vaza, para outras pessoas.** O logo apareceu nas costas
  da camiseta de uma criança que estava na cena. Referência não sabe a quem
  pertence — quem diz isso é o prompt.

Método completo: `docs/aulas/PIPELINE-PERSONAGEM-CONSISTENTE.md` §3.1.1.

### Prompts de cena

São da peça. Ver `adapta_ccc.py :: PROMPTS` para o formato — `E` para
estrutural, `C` para cena.

---

## Modelos que este arquivo exige

| pasta | arquivo |
|---|---|
| `diffusion_models` | `flux-2-klein-9b-fp8.safetensors` |
| `text_encoders` | `qwen_3_8b_fp8mixed.safetensors` |
| `vae` | `flux2-vae.safetensors` |
| `loras` | `Flux2-Klein-9B-consistency-V2.safetensors` |
| `upscale_models` | `RealESRGAN_x2plus.pth` · `4x-UltraSharp.pth` |
| `ultralytics/bbox` | `face_yolov8m.pt` |

Custom nodes: `comfyui-mickmumpitz-nodes`, `comfyui-kjnodes`,
`ComfyUI-Impact-Pack` + `Impact-Subpack`, `ComfyUI-AutoCropFaces`, `was-ns`.

---

## Regenerar

```bash
python apps/infra/adapta_ccc.py --modelo          # este arquivo
python apps/infra/adapta_ccc.py --saida X.json    # versão de cliente
```

O grafo tem 451 nós, 408 links e 24 subgrafos. A inserção é programática e
conferida antes de gravar — editar à mão quebra em silêncio, e o ComfyUI só
avisa na hora de rodar.
