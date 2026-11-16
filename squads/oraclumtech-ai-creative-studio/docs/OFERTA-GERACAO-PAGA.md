# Geração paga — o que dá para vender, e quanto custa

> Levantamento de 2026-09-12. A cobrança é toda em **USD**; a coluna em reais é
> conversão nossa.
>
> **Taxa usada: R$ 5,50 por dólar.** O dólar estava em ~R$ 5,17 em setembro/2026;
> os R$ 5,50 embutem **IOF e spread do cartão**, que é o que de fato chega na
> fatura. Confira a taxa do dia antes de fechar proposta — e se o pagamento for
> por PIX/boleto de algum intermediário, o efetivo cai.
>
> Tudo o que está marcado como **medido** saiu da máquina ou do código; o resto
> saiu das páginas oficiais e está com fonte no fim.

---

## Sumário: as três camadas compram coisas diferentes

| | o que compra | o que preserva do nosso trabalho | modelo de custo |
|---|---|---|---|
| **GPU alugada** | velocidade e VRAM | **tudo** | por hora, paga o ocioso |
| **API de modelo fechado** | qualidade de movimento | frame inicial, voz, montagem | por geração |
| **Higgsfield** | o pacote pronto | quase nada | assinatura + créditos |

A decisão não é "qual é melhor". É **onde o dinheiro compra diferença visível**,
e a resposta é sempre a mesma: **no movimento**. Plano parado com locução por
cima roda local de graça e ninguém nota. Plano com câmera andando e pessoa
falando é onde o modelo fechado ganha.

---

## 1 · GPU alugada — compra velocidade

### Preços por hora

| provedor | placa | VRAM | US$/h | **R$/h** |
|---|---|---|---|---|
| **Vast.ai** (marketplace) | várias | — | a partir de **0,03** | **0,17** |
| Vast.ai | A100 80GB | 80 GB | a partir de 0,67 | 3,69 |
| **RunPod** Community | RTX 4090 | 24 GB | **0,34** | **1,87** |
| RunPod Community | A100 PCIe | 80 GB | 1,19 | 6,55 |
| RunPod Community | H100 PCIe | 80 GB | 1,99 | 10,95 |
| RunPod Secure (com SLA) | RTX 4090 | 24 GB | 0,69 | 3,80 |
| RunPod Secure | H100 PCIe | 80 GB | 2,89 | 15,90 |
| **Comfy Cloud** | RTX PRO 6000 | **96 GB** | **3,49** | **19,20** |

O RunPod cobra **por segundo** e não cobra tráfego. O Vast.ai é marketplace
(mais barato, menos previsível). O Comfy Cloud é o mais caro por hora, mas é o
único que já vem com o ComfyUI montado e **5 rodadas grátis** para testar.

### O que isso resolve para nós, concretamente

A nossa parede de ontem: o LTX 2.3 22B pede ~44 GB de pesos e a máquina tem
8 GB de VRAM + 16 GB de RAM. Numa **A100 de 80 GB a US$ 1,19/h**, essa parede
deixa de existir — e roda o **nosso** grafo, com o **nosso** Bruno, a **nossa**
voz e os **nossos** ambientes 360.

**Retrabalho: zero.** É a única camada que preserva tudo. O MickMumpitz inclusive
mantém template pronto de RunPod para o Movie Builder.

### Onde dói

Você paga o **tempo ocioso**. Ajustar prompt em GPU alugada é queimar dinheiro
olhando a tela. A disciplina que isso impõe: **itera local, renderiza alugado.**

---

## 2 · API de modelo fechado — compra qualidade de movimento

### A descoberta: já está tudo instalado

O ComfyUI de vocês tem **40 provedores de API oficiais** em
`comfy_api_nodes/`, entre eles:

```
bytedance (Seedance + Seedream)   kling      runway     veo2/sora
luma      minimax   pixverse      vidu       wan        wavespeed
elevenlabs  fishaudio  heygen  sync_so      ← voz e lip-sync
topaz  magnific  bria  recraft  krea        ← acabamento
```

Isso muda a arquitetura da oferta: **não é preciso sair do nosso workflow.** O
nó de API entra no meio do grafo, ao lado dos nossos nós locais.

### O que os nós da ByteDance expõem (medido no código)

| nó | o que faz |
|---|---|
| `ByteDance2ReferenceNodeV2` | **Seedance 2.5 ou 2.0 com referência** — vídeo a partir de imagens/vídeos de referência |
| `ByteDance2FirstLastFrameNode` | primeiro e último frame → vídeo |
| `ByteDance2TextToVideoNode` | texto → vídeo |
| `ByteDanceImageToVideoNode` | Seedance 1.0 / 1.5 pro, 3 a 12 s, 480p/720p/1080p, trava de câmera |
| `ByteDanceSeedAudio` | áudio |
| `ByteDanceVideoEnhanceNode` | super-resolução **até 8K** |
| `ByteDanceSeedream*` | imagem, até 4K, e separação de camadas |

O endpoint é `proxy/byteplus-seedance2` — **é BytePlus mesmo**, intermediado
pelo ComfyUI. Você não precisa abrir conta lá; paga em créditos do ComfyUI.

O Seedance 2.5 aceita uma pilha de referência de **30 imagens, 10 vídeos e 10
áudios**, e gera **30 segundos em passada única com áudio**. Proporções incluem
**9:16**.

> **Isto responde a pergunta de consistência.** Não é preciso escolher entre a
> nossa LoRA e a API: o Seedance 2.5 aceita referência direta, e o frame inicial
> continua saindo do nosso Klein com o Bruno certo.

### Preço, convertido

A tabela do ComfyUI é em créditos. A conversão sai da própria página de GPU
deles — **736,39 créditos/hora = US$ 3,49/h**, logo:

> **1 crédito = US$ 0,004739**

| modelo | tarifa | **5 s · US$** | **5 s · R$** |
|---|---|---|---|
| **Veo 3.1 lite** 720p sem áudio | 6,33 cr/s | **0,15** | **0,83** |
| **Luma ray-3.2** 720p | 63,3 cr/run | **0,30** | **1,65** |
| **Runway gen4_turbo** | 15,09 cr/s | **0,36** | **1,98** |
| **Kling v3-omni** 720p | 17,72 cr/s | **0,42** | **2,31** |
| Kling v3-omni 1080p | 23,63 cr/s | 0,56 | 3,08 |
| **Kling 3.0 turbo** 1080p | 29,54 cr/s | 0,70 | 3,85 |
| **Luma ray-3.2** 1080p | 253,2 cr/run | 1,20 | 6,60 |
| **Seedance 2.5** 720p | 348,8 cr/5s | **1,65** | **9,08** |
| Runway aleph2 | 84,48 cr/s | 2,00 | 11,00 |
| **Veo 3.1** 4K com áudio | 126,6 cr/s | **3,00** | **16,50** |

O Seedance 2.5 cobra por **token**: `(duração entrada + saída) × largura ×
altura × fps ÷ 1024`. Ou seja, dobrar a resolução **quadruplica** o custo —
mais do que dobrar a duração.

**Não há tier gratuito** nos nós de API. Crédito é pré-pago e a execução falha
com saldo zero.

---

## 3 · Higgsfield — compra o pacote

### O que a plataforma entrega

**Modelos** sob o mesmo teto: Kling 3.0, Sora 2, Veo 3.1, Seedance 2.0,
WAN 2.6, MiniMax Hailuo 02, Soul 2.0 (engine barata para rascunho), e para
imagem Nano Banana Pro, Flux 2, Seedream.

**Consistência de personagem — Soul ID.** Identidade treinada que se aplica
sozinha em vídeo e imagem, atravessando sessões e **modelos diferentes**. Pede
de 3-5 imagens semente no mínimo (as fontes divergem; há relato de 20+ para
resultado bom). É o análogo direto da nossa LoRA — com a diferença de que o
personagem passa a morar na conta deles.

**Câmera.** Cinema Studio 2.0 com física óptica e **70+ presets** de movimento
(crash zoom, bullet time, 360, dolly, whip pan).

**Voz e sincronia.** Lip-sync em 8+ idiomas pelo Seedance 2.0, *Voice Binding*
que segura a voz do personagem por seis cortes e cinco idiomas, e integração
com **ElevenLabs** para clonagem.

**Ferramentas pontuais** (5-20 créditos cada): Face Swap, Lipsync Studio,
Product Placement, Outfit Swap, Angles 2.0 — dentro de uma biblioteca que eles
anunciam como 80+ apps.

**Conector MCP** que permite o Claude Code disparar gerações. Isso é
operacionalmente relevante para nós.

### Planos e créditos

| plano | mensal US$ | anual US$ | **anual R$/mês** | créditos/mês | **US$/cr** |
|---|---|---|---|---|---|
| Passe de teste | 3 uma vez | — | **~R$ 17** | 40 + 2 dias de Soul 2.0 ilimitado | — |
| Starter | 19 | 19 | **105** | 270 | **0,070** |
| Plus | 59 | **47** | **259** | 1.200 | **0,039** |
| Ultra | 129 | **99** | **545** | 3.000 | **0,033** |

### Custo por geração (no Ultra anual, US$ 0,033/crédito)

| ação | créditos | US$ | **R$** |
|---|---|---|---|
| Kling 3.0 · 5 s · 720p | ~7 | **0,23** | **1,27** |
| Sora 2 · 4 s · 720p | ~10 | 0,33 | 1,82 |
| Veo 3.1 Fast · 4 s | ~11 | 0,36 | 1,98 |
| Seedance 2.0 Fast · 5 s · 720p | ~17 | **0,56** | **3,08** |
| Seedance 2.0 · 5 s · 1080p | ~45 | 1,49 | 8,20 |
| Kling 3.0 · 5 s · 4K | ~30 | 0,99 | 5,45 |
| Cinema Studio + movimento + upscale | 80+ | 2,64+ | 14,52+ |
| Face swap / lipsync / outfit / ângulos | 5-20 | 0,17-0,66 | 0,94-3,63 |

### A comparação que importa

**Por clipe, o Higgsfield é 2 a 3 vezes mais barato que o mesmo modelo pela API
do ComfyUI:**

| 5 s, 720p | via ComfyUI | via Higgsfield Ultra | diferença |
|---|---|---|---|
| Kling | US$ 0,42 · R$ 2,31 | **US$ 0,23 · R$ 1,27** | 1,8× |
| Seedance | US$ 1,65 · R$ 9,08 (2.5) | **US$ 0,56 · R$ 3,08** (2.0 Fast) | 2,9× |

Eles compram em atacado e subsidiam para reter assinatura. **O preço da
diferença é a assinatura** — e ela tem pegadinhas.

### As pegadinhas, e elas são reais

- **Créditos não acumulam.** O que não se usa no mês **zera**.
- Pacotes avulsos expiram em **90 dias**.
- As janelas de "ilimitado" (ex.: 7 dias de Kling 3.0) **resetam por ciclo** e
  depois voltam a consumir crédito.
- Sora 2 e Veo 3.1 **sempre** consomem crédito, sem cota livre.
- Reembolso só em 7 dias e se nenhum crédito foi usado. Renovação não devolve.
- Uso comercial é permitido em todos os planos pagos.

O Ultra a US$ 99/mês é **piso**, não teto: você paga usando ou não.

---

## 4 · A escada de preço por tipo de peça

Base de cálculo: **peça vertical de 30 segundos**, que são **6 planos de 5 s**
(ou 9 de 3,4 s no ritmo do Movie Builder). Inclui uma margem de 2× para
regeração — na prática você descarta metade do que gera.

| nível | o que é | conta | **US$/peça** | **R$/peça** |
|---|---|---|---|---|
| **0 · Local** | Wan I2V + upscale + interpolação, CCC, voz clonada, ambiente 360. Tudo nosso | só energia | **≈ 0** | **≈ 0** |
| **1b · GPU alugada barata** | RTX 4090 community · ~4 h | 0,34 × 4 | ≈ 1,40 | **≈ 8** |
| **2 · Frame local + API econômica** | Veo 3.1 lite 720p · 6 planos | 0,15 × 6 × 2 | **≈ 2** | **≈ 11** |
| **1 · GPU alugada** | o mesmo, numa A100 80GB · ~3 h | 1,19 × 3 | **≈ 4** | **≈ 22** |
| **2b · API intermediária** | Kling v3-omni 720p · 6 planos | 0,42 × 6 × 2 | **≈ 5** | **≈ 28** |
| **3 · Higgsfield** | Seedance 2.0 720p + Soul ID + Cinema Studio | 0,56 × 6 × 2 | **≈ 10** | **≈ 55** + assinatura |
| **2c · API premium** | Seedance 2.5 720p · 6 planos | 1,65 × 6 × 2 | **≈ 20** | **≈ 110** |
| **2d · API topo** | Veo 3.1 4K com áudio · 6 planos | 3,00 × 6 × 2 | **≈ 36** | **≈ 198** |

### Lendo a escada

**O salto de qualidade não é linear com o preço.** De 0 para 1 você compra
**viabilidade** (o que não rodava passa a rodar). De 1 para 2 você compra
**movimento crível** — é o salto que o cliente enxerga. De 2c para 2d você
compra **4K e áudio nativo**, que a maioria das peças de rede social não usa.

**Onde eu colocaria cada tipo de peça:**

| peça | nível |
|---|---|
| Teste interno, prova de conceito, storyboard animado | **0** |
| Conteúdo de volume (dark channel, cortes, esteira diária) | **0** ou **1b** |
| Peça de cliente pequeno, rede social, 30 s | **2** ou **2b** |
| Comercial de cliente com movimento e fala | **2c** |
| Filme de marca, institucional, mídia paga | **2d** ou **1** em resolução cheia |
| Piloto para fechar contrato (rápido e bonito) | **3** |

### Repasse ao cliente

Custo de geração é **a menor parte** do preço de uma peça — roteiro, direção,
curadoria e montagem é que custam. Um multiplicador de 1,5× a 2× sobre o custo
direto cobre desperdício e variação cambial sem precisar de planilha.

O que **não** se deve fazer: vender por "quantidade de vídeos". Vende-se a peça
pronta. O cliente não compra geração, compra resultado — e o número de
tentativas é problema nosso.

---

## 5 · Relatório pessoal — a máquina

### O que está aí (medido)

| | |
|---|---|
| Placa-mãe | **Gigabyte B550M AORUS ELITE** (micro-ATX, AM4) · 4 DIMM · 2× M.2 · 4× SATA |
| CPU | **Ryzen 7 5700X** · 8C/16T · Zen 3 |
| RAM | **2 × 8 GB @ 2400 MT/s** (2 slots livres) |
| GPU | **RTX 4060 Ti 8 GB** |
| C: | ADATA LEGEND 710 · NVMe · 477 GB · **0 retentativas** |
| D: | Kingston SA400 · SATA · 112 GB · **6.336 retentativas em 24 h** |
| E: | WD5000AAKX · SATA · 466 GB · **759 retentativas em 24 h** |

### Upgrade 0 — grátis, e é o primeiro (X.M.P.)

**A RAM está rodando a 2400 MT/s.** Um B550 com Ryzen 5000 roda DDR4 a
**3200-3600** tranquilamente. Você está perdendo uns **30% de banda de memória**
por perfil desligado.

**Importante: na Gigabyte/Aorus não se chama DOCP.** DOCP é nomenclatura ASUS,
EXPO é de DDR5 e A-XMP é da MSI. Na sua B550M AORUS ELITE o nome é
**Extreme Memory Profile (X.M.P.)** — escrito com pontos mesmo.

### O caminho exato na sua BIOS

1. Reinicie e aperte **DEL** repetidamente na tela do logo Aorus.
2. Se abrir o **Easy Mode** (tela colorida com resumo), aperte **F2** para ir ao
   **Advanced Mode**. O X.M.P. às vezes aparece já no Easy Mode, num botão no
   canto — se aparecer, dá para ligar por ali mesmo.
3. Vá na aba **Tweaker** (a primeira à esquerda, no Advanced Mode).
4. Logo no topo, procure **Extreme Memory Profile (X.M.P.)** e troque de
   `Disabled` para **`Profile1`**.
5. **Confira o resultado ali mesmo, sem sair:** desça a lista e olhe o
   **System Memory Multiplier** ou a frequência informada. Tem de deixar de
   marcar 2400 e passar para 3200 ou 3600.
6. **F10** → `Yes` para salvar e reiniciar.

### Como saber se funcionou, e o que fazer se não

Depois de subir, me chame que eu confirmo pelo sistema — ou rode você mesmo:

```powershell
Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator, ConfiguredClockSpeed
```

Tem de sair **3200** ou mais no lugar de 2400.

**Se não houver perfil X.M.P. para escolher**, os pentes são JEDEC 2400 de
fábrica e não há o que ligar — nesse caso o ganho só vem trocando a memória, o
que já está previsto no Upgrade 1 abaixo.

**Se a máquina não der boot** depois de ligar: desligue na fonte, espere uns
segundos e ligue de novo — a placa volta sozinha ao padrão depois de duas
tentativas falhas. Se insistir, o jumper **CLR_CMOS** na placa zera tudo. Não é
comum com Profile1, mas é bom saber antes de mexer.

**Isso importa muito** no nosso caso, porque modelo grande em placa pequena vive
de trânsito RAM↔VRAM — é literalmente o gargalo que travou o LTX ontem.

### Upgrade 1 — RAM · o maior desbloqueio por real gasto

Você tem **4 slots e 2 livres**, e a plataforma vai a 128 GB.

**Não compre 2×4 GB.** Levaria a 24 GB, que não resolve o fp8 de 44 GB e ainda
arrisca cair para *flex mode* misturando capacidades.

**Compre 2×16 GB (→ 48 GB) ou substitua por 2×32 (→ 64 GB).** Com 48-64 GB:

- o LTX 22B em GGUF Q4 roda confortável
- o Movie Builder inteiro passa a rodar local
- o lip-sync com áudio dado passa a rodar

Compre o **mesmo modelo e velocidade** dos que já estão lá, ou troque o conjunto.

### Upgrade 2 — um NVMe, e ele resolve dois problemas

A placa tem **dois M.2**: o `M2A_CPU` é **PCIe 4.0 x4** direto na CPU (é onde o
ADATA está) e o `M2B_SB` é **PCIe 3.0 x2** pelo chipset — mais lento, mas muito
melhor que o SATA doente.

Um NVMe de 1-2 TB no slot livre:

1. **aposenta o Kingston D:**, que está com 6.336 retentativas e é o disco onde
   moram todos os modelos hoje
2. dá espaço para o acervo ativo sem a dança de mover do HD

É o upgrade que eu faria **antes** da GPU, porque o D: é risco de perda, não
só de lentidão.

> **Antes de comprar qualquer coisa: confira os cabos SATA.** Os **dois** discos
> SATA registram retentativas e o NVMe registra zero. Dois discos falhando ao
> mesmo tempo é menos provável que um problema no caminho comum — cabo, porta ou
> alimentação. E você mexeu no gabinete há poucos dias para instalar o E:.

### Upgrade 3 — GPU, e só depois dos outros

A **4060 Ti de 8 GB** é o teto de tudo. Mas é o upgrade mais caro e o que menos
resolve sozinho: com 8 GB você não roda o 22B **nem com 128 GB de RAM**.

Ordem de custo-benefício:

| opção | VRAM | o que muda |
|---|---|---|
| RTX 4060 Ti **16 GB** | 16 | mesma placa, dobro de VRAM — GGUF Q4 cabe quase todo |
| RTX 5060 Ti 16 GB | 16 | idem, geração nova, mais banda |
| **RTX 3090 usada** | **24** | melhor VRAM por real do mercado; LTX fp8 quase cabe |
| RTX 4090 / 5090 | 24 / 32 | resolve tudo, preço de outra máquina |

**A 3090 usada de 24 GB** é a escolha racional se o objetivo é rodar o 22B
local. Consome mais e esquenta mais, mas VRAM é o que falta.

### A conta que decide entre comprar e alugar

Uma A100 80GB no RunPod custa **US$ 1,19/h (R$ 6,55)**. No Brasil, um upgrade de
RAM + NVMe fica em torno de **R$ 1.400 a 1.900**; uma 3090 usada soma outros
**R$ 3.500 a 4.500**.

> **R$ 1.600 de RAM+SSD equivalem a ~245 horas de A100 alugada.**
> **R$ 5.500 com a 3090 equivalem a ~840 horas.**

(Peças no Brasil não seguem a conversão do dólar — os valores acima são de
mercado local, não conversão dos preços em USD.)

Se a operação usar **menos de ~20 h de render por mês**, alugar é mais barato
por um bom tempo — e você sempre tem a placa mais nova.

**Minha recomendação:** faça o **Upgrade 0** (grátis, hoje), o **Upgrade 2**
(NVMe, porque é risco de perda) e o **Upgrade 1** (RAM). Deixe a GPU para
depois e **alugue** enquanto o volume não justificar. Isso põe a máquina em
condição de trabalhar sem travar, sem gastar o valor de uma placa nova.

---

## Nota sobre a conversão

Os valores em reais usam **R$ 5,50/US$** — dólar de ~R$ 5,17 (setembro/2026)
mais IOF e spread de cartão. Três coisas para lembrar ao usar isto em proposta:

- **A taxa muda.** Refaça a conta no dia. Uma peça de US$ 20 varia R$ 10 entre
  câmbio de 5,20 e 5,70.
- **Peça de hardware não segue o dólar.** A seção de upgrades usa preço de
  mercado brasileiro, não conversão.
- **Assinatura é custo fixo em dólar.** O Higgsfield Ultra a R$ 545/mês sobe
  sozinho se o câmbio subir, mesmo sem você gerar nada. Isso é risco cambial
  recorrente, diferente do pagamento por geração.

## Fontes

- [ComfyUI · Partner Node Pricing](https://docs.comfy.org/tutorials/partner-nodes/pricing)
- [Comfy Cloud · Pricing](https://comfy.org/pricing/)
- [RunPod · Cloud GPUs](https://www.runpod.io/product/cloud-gpus)
- [RunPod vs Vast.ai (Spheron, 2026)](https://www.spheron.network/blog/gpu-cloud-pricing-comparison-runpod-vs-vastai-2026/)
- [Higgsfield AI Review 2026 · pricing e créditos](https://aifunnelinsider.com/higgsfield-ai-review-2026/)
- [Higgsfield · Soul ID](https://higgsfield.ai/blog/sould-id-best-character-consistency)
- [Seedance 2.5 no ComfyUI · nós, limites e custos](https://www.instasd.com/post/seedance-2-5-comfyui-30-second-videos)
- [Gigabyte B550M AORUS ELITE · especificações](https://www.gigabyte.com/Motherboard/B550M-AORUS-ELITE-rev-10-11-12/sp)
- [Cotação USD/BRL · Investing](https://br.investing.com/currencies/usd-brl)
- [Como ativar X.M.P. em placas Gigabyte](https://www.technewstoday.com/xmp-gigabyte-bios/)
- Dados da máquina e dos nós de API: medidos localmente em 2026-09-12
