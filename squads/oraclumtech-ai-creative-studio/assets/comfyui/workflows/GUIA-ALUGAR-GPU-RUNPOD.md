# Alugar GPU e rodar o MiniMax H3 — do zero

> Passo a passo operacional, do cadastro ao vídeo na sua máquina.
> O **porquê** de cada escolha está em `TESTE-H3-GPU-ALUGADA.md`; aqui é o
> **como**. Câmbio: R$ 5,50/US$.

**Tempo total:** ~40 minutos. **Custo:** ~US$ 0,25 (≈ R$ 1,40) numa RTX 4090.

---

## Antes de abrir o navegador — o que levar daqui

Separe estes quatro arquivos numa pasta. Você vai arrastá-los para o pod.

```
MINIMAX-H3-IMPERIO.json     squads/oraclumtech-ai-creative-studio/assets/comfyui/workflows/
bruno-face.png              ComfyUI/input/
bruno-body.png              ComfyUI/input/
placa-rua.png               ComfyUI/input/   (opcional, só se for testar 360 lá)
```

> **Não leve modelo.** Os 41 GB descem do HuggingFace **dentro** do datacenter,
> a 200-500 MB/s. Subir daqui pela sua banda levaria horas e custaria tempo de
> GPU parada.

---

## 1 · Conta e crédito

1. Crie a conta em **runpod.io**.
2. **Billing → Add credits.** Comece com **US$ 10** — dá para umas 30 sessões
   de teste. Cartão internacional; o IOF entra na fatura.
3. Não assine nada mensal. RunPod cobra **por segundo** de uso.

---

## 2 · Subir o pod

**Pods → Deploy.**

| campo | escolha | por quê |
|---|---|---|
| Tipo | **Community Cloud** | metade do preço do Secure; teste não precisa de SLA |
| GPU | **RTX 4090 (24 GB)** | US$ 0,34/h. Se der OOM, refaça com **RTX 5090 32 GB** |
| Template | **ComfyUI** (ou "ComfyUI + Manager") | vem pronto; instalar do zero é placa queimando à toa |
| Disco do container | **80 GB** | os modelos são 41 GB; sem folga o download falha no fim |
| Network volume | **não**, na primeira vez | só compensa da 4ª sessão em diante |

Clique **Deploy**. Leva 2-4 minutos. Quando o status ficar verde, use
**Connect → HTTP Service [Port 8188]** para abrir o ComfyUI, e
**Connect → Web Terminal** para o terminal.

> **O relógio começa no Deploy**, não no primeiro clique em Executar. Tenha os
> arquivos em mãos antes.

---

## 3 · Baixar os modelos (no Web Terminal)

```bash
pip install -U "huggingface_hub[hf_transfer]"
export HF_HUB_ENABLE_HF_TRANSFER=1
cd /workspace/ComfyUI/models

hf download Comfy-Org/MiniMax-H3 \
  diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors \
  text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors \
  vae/minimax_h3_video_vae_fp16.safetensors \
  vae/minimax_h3_audio_vae_fp32.safetensors \
  loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors \
  --local-dir .
```

A estrutura de pastas do repositório **já é a do ComfyUI** — por isso
`--local-dir .` dentro de `models/` acerta cada arquivo sozinho, sem mover nada.

**Confira antes de seguir:**

```bash
du -sh diffusion_models text_encoders vae loras
# esperado, somando:  ~41 GB
```

Se algum vier curto, rode o mesmo comando de novo — ele retoma.

---

## 4 · Subir as imagens do Bruno

Na aba do ComfyUI, o jeito mais simples: qualquer nó `LoadImage` tem
**"choose file to upload"**. Suba `bruno-face.png` e `bruno-body.png` por ali.

Pelo terminal, se preferir: `/workspace/ComfyUI/input/` é o destino.

---

## 5 · Rodar

1. **Arraste** o `MINIMAX-H3-IMPERIO.json` para a tela do ComfyUI.
2. Aperte **R** para ele reler as pastas de modelo.
3. Confira três coisas — e só três:

| | |
|---|---|
| switch do **turbo** | **ligado** (4 passos, não 20) |
| `ResolutionSelector` | **9:16 (Vertical)** e **0,4** megapixel |
| os dois `LoadImage` | achando `bruno-face.png` e `bruno-body.png` |

4. **Executar.**

A primeira geração demora mais (carrega 19,5 GB na VRAM). As seguintes são o
tempo real do modelo — **é esse número que você quer anotar.**

---

## 6 · Trazer o resultado

Os vídeos caem em `/workspace/ComfyUI/output/video/`.

- **Poucos arquivos:** clique no nó `SaveVideo`, o preview tem botão de
  download.
- **Vários:** no terminal, `cd /workspace/ComfyUI/output && zip -r saida.zip
  video/` e baixe pelo gerenciador de arquivos do template.

---

## 7 · Desligar — e isto custa dinheiro se esquecer

**Pods → o seu → Terminate**, não apenas *Stop*.

> **Pod parado ainda cobra o disco** (~US$ 0,10/GB/mês). Com 80 GB isso é
> US$ 8/mês por uma máquina que você não usa. **Terminate** apaga tudo e zera a
> cobrança — e é por isso que não vale guardar modelo no disco do container.
>
> Se for repetir toda semana, aí sim vale um **network volume**: ~US$ 0,07/GB/mês,
> ~US$ 3/mês pelos 41 GB, e os modelos ficam prontos entre sessões.

---

## Se der errado

| sintoma | causa provável | o que fazer |
|---|---|---|
| **OOM ao carregar o text encoder** | `nvfp4` é formato Blackwell; a 4090 é Ada e precisa desquantizar | refaça o pod numa **RTX 5090** (nvfp4 nativo) ou **L40S 48 GB** |
| **OOM no sampler** | 0,4 MP já é baixo; resta baixar a duração | `PrimitiveFloat` de 5 s para 3 s |
| **modelo não aparece na lista** | ComfyUI indexou antes do download | aperte **R** na aba; se não bastar, reinicie o ComfyUI pelo template |
| **download parou no meio** | rede do pod | rode o `hf download` de novo — ele retoma de onde parou |
| **vídeo sai sem o Bruno** | prompt sem as tags | o prompt **precisa** dizer `<Picture 1>` e `<Picture 2>`; sem elas ele ignora as referências e não dá erro |
| **rosto deriva** | referência em modo econômico | troque `ref_image_size` de `match` para **`max`** (2048 px, melhor fidelidade, várias vezes mais lento) |

---

## A conta, para você conferir na fatura

| | minutos | US$ | R$ |
|---|---|---|---|
| deploy + boot | 4 | 0,02 | 0,12 |
| download dos modelos | 6 | 0,03 | 0,19 |
| primeira geração | 5 | 0,03 | 0,16 |
| 8 clipes de teste | 15 | 0,09 | 0,47 |
| folga para atrapalho | 10 | 0,06 | 0,31 |
| **total na 4090** | **40** | **0,23** | **≈ R$ 1,25** |

Na **RTX 5090** (US$ 0,90/h), a mesma sessão dá ~US$ 0,60 ≈ **R$ 3,30**.

---

## Sobre a licença, já que o resultado é para usar

O H3 **permite uso comercial** no Brasil, abaixo de US$ 20 M/ano de receita,
com **"MiniMax H3" exibido na interface** do produto comercial. A saída é sua —
*"MiniMax claims no rights over the Outputs you generate"*.

Para post em rede social: crédito na descrição resolve. Detalhe e leitura
completa em `LICENCAS-E-TIER-MVP.md`.

---

## Vast.ai, se quiser espremer mais

Marketplace em vez de rate card: a mesma 4090 sai por **US$ 0,25-0,35/h**, às
vezes menos. O troco é previsibilidade — máquina de terceiro, disco e rede
variáveis, e a instância pode ser interrompida.

Para teste de 40 minutos a diferença é de centavos. **Não vale a complicação
na primeira vez.** Vale quando virar rotina de render.
