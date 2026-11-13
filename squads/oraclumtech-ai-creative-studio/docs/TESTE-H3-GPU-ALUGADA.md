# Teste do MiniMax H3 em GPU alugada — pelo menor custo possível

> Escrito em 2026-09-12. Tamanhos e nomes de arquivo vieram da **API do
> HuggingFace**; o grafo veio do template nativo que já está instalado.
> Câmbio: **R$ 5,50/US$** (dólar ~5,17 + IOF e spread).

---

## Por que o H3 e não outro

É o único modelo de vídeo de ponta com **peso aberto** que serve para nós:

- A licença comunitária **exclui EUA, UE, Reino Unido e Coreia do Sul** do
  self-host. **O Brasil não está na lista.**
- Roda pelo **preço da hora da placa**, não por segundo de vídeo gerado.
- Gera **áudio junto**, inclusive fala.

**Uso comercial é permitido** — eu havia reportado o contrário, lendo resumo de
terceiros em vez do `LICENSE`. O texto oficial libera venda dentro do território,
abaixo de US$ 20 M/ano de receita, com **"MiniMax H3" exibido na interface** do
produto comercial. Detalhe completo em `LICENCAS-E-TIER-MVP.md`.

O único limite técnico:

| | |
|---|---|
| **768 px de lado menor** | o módulo `H3-Regenerate-2K` não foi liberado. Os 2K só existem na API deles |

---

## O que baixar — 41,38 GB

Rota **ref2v** (referência → vídeo), que é a nossa: entram o rosto e o corpo do
personagem, sai o plano.

| arquivo | pasta | GB |
|---|---|---|
| `minimax_h3_ref2va_pruned_int8_convrot.safetensors` | `diffusion_models/` | **19,53** |
| `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | `text_encoders/` | **14,61** |
| `minimax_h3_video_vae_fp16.safetensors` | `vae/` | 4,85 |
| `minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors` | `loras/` | 1,82 |
| `minimax_h3_audio_vae_fp32.safetensors` | `vae/` | 0,56 |
| | | **41,38** |

Todos em `Comfy-Org/MiniMax-H3`. O `pruned_int8` é ~40% menor que o int8 comum
— é a razão de caber numa placa alugada barata.

---

## Qual placa alugar

| opção | VRAM | US$/h | R$/h | risco |
|---|---|---|---|---|
| **RTX 4090** (RunPod Community) | 24 GB | **0,34** | **1,87** | aperta; ver a ressalva do nvfp4 |
| RTX 4090 (Vast.ai) | 24 GB | ~0,25-0,35 | 1,40-1,90 | marketplace, menos previsível |
| **RTX 5090** | 32 GB | ~0,90 | ~4,95 | **Blackwell: nvfp4 nativo** |
| L40S / A6000 | 48 GB | ~0,80-1,00 | 4,40-5,50 | folgado |
| A100 80GB | 80 GB | 1,19 | 6,55 | folga total |

> **A ressalva que decide:** o text encoder é **nvfp4**, formato nativo de
> Blackwell (RTX 50xx, B200). Em Ada ou Ampere o ComfyUI precisa
> desquantizar, e os 14,6 GB incham. Como o encoder roda **antes** e é
> liberado, uma 4090 de 24 GB provavelmente segura — mas é o ponto onde o teste
> pode estourar.
>
> **Comece pela 4090.** Se der OOM no encoder, suba para a 5090 (nvfp4 nativo,
> e ainda mais barata que a A100).

---

## Os dois barateadores, e já estão ligados no nosso JSON

**1 · Turbo LoRA de 4 passos.** O template traz `minimax_h3_ref2v_turbo_4step`
atrás de um switch que vem **desligado** (20 passos). Ligado, são **4** —
**cinco vezes menos tempo de GPU** pelo mesmo clipe. No
`MINIMAX-H3-IMPERIO.json` ele já está ligado.

**2 · 0,4 megapixel.** É o padrão do template, não 1,0. Em 9:16 dá uns
512×896. Para responder *"o modelo serve?"*, 0,4 MP responde pelo menor preço.
Subir depois é um clique no `ResolutionSelector`.

---

## A conta de uma sessão de teste

| etapa | tempo |
|---|---|
| subir o pod com template de ComfyUI | 3-5 min |
| baixar os 41,38 GB (datacenter faz 200-500 MB/s) | 3-8 min |
| primeira geração (carrega modelo + 4 passos) | 3-5 min |
| mais 8 clipes de teste | ~15 min |
| **total** | **~35-40 min** |

> **RTX 4090 a US$ 0,34/h → US$ 0,23 ≈ R$ 1,25 a sessão inteira.**
> Numa L40S de 48 GB, US$ 0,59 ≈ R$ 3,25.

Menos de dois reais para saber se o H3 serve. Vale mais medir do que discutir.

---

## Sete disciplinas que seguram o custo

1. **Não itere na GPU alugada.** O `MINIMAX-H3-IMPERIO.json` já foi montado e
   conferido aqui, com os nós nativos do seu ComfyUI 0.35. Chega pronto.
2. **Community Cloud, não Secure.** Metade do preço, e teste não precisa de SLA.
3. **Template com ComfyUI pré-instalado.** Instalar do zero é tempo de placa
   queimando sem gerar nada.
4. **`HF_HUB_ENABLE_HF_TRANSFER=1`** no download — multiplica a velocidade, e
   cada minuto de download é minuto de GPU pago.
5. **Baixe só a rota ref2v.** O `fl2va` é outro checkpoint de 19,5 GB que não
   usamos.
6. **Desligue o pod, não só pare.** Pod parado ainda cobra o disco.
7. **Se for repetir**, use *network volume* (~US$ 0,07/GB/mês → ~R$ 16/mês
   pelos 41 GB) e pule o download nas próximas sessões. Abaixo de umas 4
   sessões/mês, baixar de novo sai mais barato.

---

## Passo a passo

### 1 · No pod, baixar os modelos

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

A estrutura de pastas do repositório **já é** a do ComfyUI — por isso
`--local-dir .` dentro de `models/` põe cada arquivo no lugar certo sozinho.

### 2 · Subir os dois assets

`bruno-face.png` e `bruno-body.png` vão para `ComfyUI/input/`. São os mesmos
que o Movie Builder usa — o close `00015` e o corpo inteiro `00007`, ambos
aprovados na auditoria.

### 3 · Carregar e rodar

Arraste o `MINIMAX-H3-IMPERIO.json`. Confira só três coisas antes de executar:

- o switch do **turbo** ligado (4 passos)
- `ResolutionSelector` em **9:16** e **0,4 MP**
- os dois `LoadImage` achando os arquivos

### 4 · O que olhar no resultado

| | |
|---|---|
| **identidade** | é o Bruno? Se derivar, troque `ref_image_size` de `match` para `max` — usa 2048 px de lado e é o modo de melhor fidelidade, ao custo de ficar várias vezes mais lento |
| **a estampa** | a coroa sobreviveu? O wordmark quase certamente não |
| **a fala** | o H3 gera áudio. A voz vai ser inventada, não a do Bruno — é o que a nossa rota de TTS resolve depois |
| **o tempo** | anote os segundos por clipe. É o número que decide se vale network volume |

---

## Sobre as tags do prompt — isto quebra silenciosamente

O H3 **não adivinha** qual referência é qual. Elas entram numeradas pelos slots
(`ref_image_0`, `ref_image_1`) e o prompt **precisa citá-las**:

```
Use <Picture 1> for the man's face and <Picture 2> for his body and clothing
```

Prompt sem as tags roda, não dá erro, e **ignora as referências**. O nosso já
está com elas.

---

## O que este teste decide

Se o H3 entregar identidade e movimento a 0,4 MP com 4 passos, a escada de
preço muda de forma:

| | por clipe de 5 s |
|---|---|
| H3 self-hosted, 4090 alugada | **~R$ 0,10** |
| Kling via ComfyUI | R$ 2,31 |
| Seedance 2.5 via ComfyUI | R$ 9,08 |
| H3 pela API deles (US$ 0,13/s) | R$ 3,58 |

Vinte a noventa vezes mais barato — **e comercializável**, dentro do território,
abaixo de US$ 20 M/ano e com a atribuição na interface. O que não se resolve com
hardware é o teto de 768 px: para entrega em 2K, a API deles continua sendo o
caminho.
