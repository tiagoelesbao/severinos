# Lip-sync e rota CG — o que dá para fazer, e quando

> **Material:** *We Built a FREE AI Render Engine for CG & Facial Animation*
> (MickMumpitz, 23 min) + dois workflows —
> `260603_LTX2-3_3D-RENDERING_LIP-SNYC_v08` (81 nós) e
> `260615_MICKMUMPITZ_FLUX_KLEIN_9B_V01` (49 nós).
>
> Escrito em 2026-09-11 a partir da **leitura dos JSONs**. A transcrição da aula
> estava em processamento; quando fechar, enriquece o "porquê" — mas os fatos
> técnicos abaixo vêm do grafo, que não depende dela.

---

## 1 · O que este material é

Uma **terceira rota**, diferente das duas anteriores:

| rota | controle | custo |
|---|---|---|
| CCC 4.01 | quem é o personagem | baixo |
| Movie Builder | o que acontece no plano | médio |
| **CG / render passes** | **onde cada coisa está, quadro a quadro** | alto |

Aqui a cena é montada em 3D (Blender), exportada como **passes de render** —
*clay/layout*, *depth*, *canny*, *mouth mask* — e a IA só faz o acabamento. É a
inversão: em vez de descrever e torcer, você **bloqueia** a cena e manda
desenhar por cima.

São dois workflows, e eles se dividem por viabilidade na nossa máquina.

---

## 2 · O achado que interessa: o áudio é DADO, não gerado

Essa é a resposta para a pergunta que ficou aberta.

No **Movie Builder**, o LTX *inventa* a fala: `LTXVEmptyLatentAudio` +
`LTXVAudioVAEDecode`. Você dá o timbre e ele escreve o áudio. Para comercial com
roteiro fechado, isso é risco.

No workflow de **lip-sync**, é o contrário:

```
VOICE OVER ── LoadAudio ──► LTXVAudioVAEEncode ──► AudioTimestepOverride 0.96
```

`Encode`, não `Empty`. E o `AudioTimestepOverride 0.96` trava o latente de áudio
praticamente sem ruído — ou seja, **o modelo não redesenha o som, ele sincroniza
o vídeo com o som que você deu.**

**Isso fecha o nosso laço:** nosso TTS com a voz clonada do Bruno → o texto exato
do roteiro → o LTX faz a boca acompanhar. Sem depender do que o modelo resolver
dizer.

Três detalhes do grafo que confirmam a flexibilidade:

- **`FRAME LOAD CAP 145`** a 24 fps = **6 segundos** por trecho, contra os 3,4 s
  do Movie Builder. Fala de comercial cabe.
- **`ComfySwitchNode "USE MASK VIDEO?"`** — a máscara de boca vinda do Blender é
  **opcional**; desligada, entra um `SolidMask` de quadro inteiro.
- **16 `ComfySwitchNode`** no grafo. Ele foi construído para ser rodado em
  pedaços. Rodar sem os passes 3D está previsto no desenho.

Então, no limite, o mínimo é: **frame inicial + áudio + prompt**. Blender entra
quando se quer câmera e marcação exatas, não como pré-requisito.

---

## 3 · A parede: a máquina não comporta o LTX 22B

Aqui está o número, e ele não é de ajuste fino.

**O que a rota de lip-sync carrega:**

| arquivo | tamanho |
|---|---|
| `ltx-2.3-22b-dev_transformer_only_fp8_scaled` | 21,86 GB |
| `ltx-2.3-22b-distilled-lora-384-1.1` | 7,08 GB |
| `ltx-2.3-id-lora-talkvid-3k` | 1,08 GB |
| `gemma_3_12B_it_fp8_scaled` (text encoder) | 12,30 GB |
| VAEs de vídeo + áudio | 1,69 GB |
| **total** | **≈ 44 GB** |

**A máquina:** RTX 4060 Ti **8 GB** de VRAM + **16 GB** de RAM. Contando o que o
sistema e o Python já ocupam, sobram uns 19 GB endereçáveis.

A distância é de **mais de duas vezes**. Não se resolve com tiling nem com
offload: o ComfyUI passaria a paginar em disco.

> **E isso vale para o Movie Builder também.** Fui conferir: ele carrega o mesmo
> `ltx-2.3-22b-dev_transformer_only_fp8_scaled`. A metade de imagem (Flux 2 Klein
> 9B) roda; a metade de **vídeo**, não. O primeiro plano de teste que a gente ia
> fazer esbarra aqui.

### O que existe de saída, e o que falta baixar

O próprio grafo do Movie Builder já traz o caminho de pouca VRAM:

```
UnetLoaderGGUF ["LTX-2.3-dev-Q4_K_S.gguf"]
```

**Não temos esse arquivo.** Um Q4_K_S de 22B fica em torno de 12-13 GB — ainda
acima dos 8 GB de VRAM, mas dentro do que 16 GB de RAM conseguem servir por
streaming. É a primeira coisa a baixar.

Também faltam as três IC-LoRAs de controle do workflow de lip-sync:
`ltx-2-19b-ic-lora-detailer`, `LTX-2.3-OmniNFT-RL-Lora_bf16` e
`ltx-2-19b-ic-lora-union-control-ref0.5`. Nenhuma está no acervo.

---

## 4 · O que roda hoje: o Klein com passes de controle

`260615_MICKMUMPITZ_FLUX_KLEIN_9B_V01` usa **só Flux 2 Klein 9B** — o modelo que
já está no SSD e já roda. 49 nós.

```
DEPTH ──┐
        ├─ ImageBlend(0.88, "screen") ─┐
CANNY ──┘                              ├─► Klein 9B + consistency LoRA 0.7 ─► imagem final
                    imagem de referência┘
```

O prompt tem uma abertura literal que vale copiar:

> *"Turn the depth map and canny outlines into a final colored professional 3D
> rendering:"* — e depois a descrição da cena.

E a nota dele explica o papel da LoRA:

> *"the **consistency LoRA** keeps colors and details faithful to your references
> — raise or lower its strength (default `0.7`) if edits drift too far or not
> enough."*

**Isso é útil mesmo sem Blender.** Qualquer layout que produza linha e
profundidade serve: um desenho, um print de cena montada, até um render simples.
É o caminho mais barato que temos para **controlar composição** em vez de
descrever e torcer.

---

## 5 · As três rotas, honestamente custeadas

### A · Hoje, sem gastar nada

Flux 2 Klein para tudo que é imagem: personagem (CCC), ambiente 360, passes de
controle. **Sem vídeo, sem lip-sync.** A peça sairia de imagens + montagem +
locução nossa — que é exatamente o **formato (a)**, narrado sobre takes, e não
precisa de lip-sync nenhum.

> É a rota que entrega uma peça inteira sem tocar em hardware.

### B · Upgrade de RAM + GGUF

Já está registrado que a placa-mãe tem **4 slots DDR4 com só 2 em uso**, e que o
gargalo dos modelos grandes aqui é **RAM, não VRAM**. Com 64 GB:

- o `LTX-2.3-dev-Q4_K_S.gguf` roda com folga
- o Movie Builder inteiro passa a rodar
- o lip-sync com áudio dado passa a rodar

É o desbloqueio de maior alcance, e é o mais barato dos dois investimentos.

### C · GPU alugada (RunPod)

É a resposta do próprio autor para placa fraca — ele mantém template pronto.
Faz sentido **por peça**: aluga-se pelas horas de render e devolve. Não resolve
iteração (ficar testando prompt em GPU alugada sai caro), mas resolve entrega.

**A combinação que eu faria:** iterar local em imagem (rota A), render final de
vídeo alugado (rota C), e o upgrade de RAM (rota B) quando a segunda peça
confirmar que isso vira rotina.

---

## 6 · Para a peça com o Bruno e mais personagens

O que muda com este material na mesa:

| necessidade | resposta |
|---|---|
| Bruno falando o roteiro **exato** | TTS nosso → `LTXVAudioVAEEncode`. Não é o LTX inventando |
| trecho de fala mais longo | 145 frames = **6 s**, contra 3,4 s do Movie Builder |
| **mais de um personagem em cena** | é onde o CG ganha: no Blender você marca quem está onde. Sem ele, dois personagens na mesma cena continuam sendo o problema difícil — e a outra saída é a LoRA treinada com imagens dos dois **juntos** (regra da aula do CCC) |
| coerência de cenário entre planos | ambiente 360 (já construído) |
| controle de composição | passes de controle com o Klein — roda hoje |

**A ordem que o material sugere:**

1. Fechar o **formato (a)** — narrado, sem lip-sync. Entrega uma peça de verdade
   com o que roda hoje.
2. Baixar o **GGUF do LTX** e medir. É o teste que diz se a rota B é confortável
   ou se precisa mesmo do upgrade.
3. Só então decidir entre RAM e RunPod, com número na mão em vez de estimativa.

---

## 7 · Pendências

- **Transcrever a aula** (estava rodando) e decompor o lado do Blender: quais
  passes ele exporta, em que formato, com que nomes.
- **Baixar** `LTX-2.3-dev-Q4_K_S.gguf` e as três IC-LoRAs de controle.
- **Medir** um plano do Movie Builder com o GGUF — é o número que falta para
  todo o resto do planejamento.
- Avaliar o `ltx-2.3-spatial-upscaler-x2-1.1` (0,93 GB, já no acervo) para subir
  o vídeo depois, em vez de gerar grande.
