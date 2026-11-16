# AE Spec — Os 3 Takes de Ação Social (Garantido Prêmios)

**Contexto dos takes:** `README.md`, mesma pasta. Fonte dos 3 cortes: `takes-base/`.
**Esta spec é um documento executável por um operador humano no After Effects** — não existe
exportador de `.aep` neste repositório (ver nota em
`squads/oraclumtech-ai-creative-studio/agents/editor.md`, seção `a_validar`).

## Decisão: 1 anúncio sequencial, não 3 peças separadas

Os 3 takes vêm do **mesmo vídeo-fonte** (`video1`) e do **mesmo evento contínuo**: conversa
ao lado do guincho → abraço (take1) → chegada do carro guinchado (take2) → despedida com
gesto de "combinado" (take3). O README já documenta isso como um arco emocional único, não
três momentos desconexos.

**Decisão desta spec: montar os 3 takes em sequência, numa única peça de ~18,2s**
(7,6s + 7,1s + 3,5s), contando a entrega do prêmio como uma mini-história com começo, meio e
fim — em vez de 3 anúncios isolados testando o mesmo tipo de plano 3 vezes. Isso é coerente
com o pedido do squad de não exagerar no motion graphics aqui: o conteúdo já é genuíno e
carrega a peça sozinho, o motion serve só pra orientar quem está vendo e dar lugar pro
contato (telefone) e pro nome da marca, sem competir com a emoção real da cena.

**Se o founder preferir testar variantes A/B** (prática comum em whitelisting), a alternativa
é cortar cada take como peça isolada de 3,5-7,6s com a mesma legenda/lower-third abaixo
aplicada individualmente — fica registrado aqui como opção secundária, não como a
recomendação.

## O que NÃO existe ainda pra este cliente (e por que isso muda a spec)

A Garantido Prêmios **não tem `video-templates.yaml` nem `brand-config.yaml` configurados**
(o próprio README marca isso como pendência). Isso significa que, diferente de clientes com
registry pronto (ex. Oraclum), **nada aqui pode ser classificado como "já resolvido pelo
video-studio"** — legenda, lower-third e transição entram como composição nova no After
Effects, mesmo sendo simples. Tratar tudo como comp nova é a regra default do squad quando o
registry do cliente não existe (`motion-lead.md`, `motion_graphics_e_vfx`).

## Preparação do material-fonte

| Item | Valor |
|---|---|
| Resolução nativa dos 3 takes | 576×1024 (9:16), h264, 30fps |
| Resolução de entrega (Meta Ads) | 1080×1920 @ 30fps |
| Conform necessário | Upscale 576×1024 → 1080×1920 (fator ~1,875×). É upscale relevante —
  o material é filmagem real de celular/câmera comprimida via WhatsApp, então espere alguma
  perda de nitidez. Não aplicar sharpen agressivo por cima (cria halo em pele e silhueta);
  se precisar, um upscale por IA (Topaz ou equivalente) antes de montar dá resultado melhor
  que o scale nativo do AE/Premiere. |
| Áudio | Os 3 takes vêm com o áudio original do vídeo-fonte (conversa, ambiente). Mantê-lo —
  é parte do que dá autenticidade à cena; decisão de mixagem (nível, se entra trilha por
  cima) é do estágio de som na finalização, fora desta spec. |

## Composições

### Comp 01 — `GP_01_transicoes-entre-takes`

| Campo | Valor |
|---|---|
| **comp_id** | `GP_01_transicoes-entre-takes` |
| **duracao_frames / fps** | 2 transições de 6 frames cada @ 30fps (~0,2s cada) — nos
  pontos take1→take2 e take2→take3 |
| **entrada** | O frame final de cada take (saída) e o frame inicial do próximo (entrada) |
| **animação** | **Corte seco simples (dip-to-black curto)**, não transição elaborada:
  opacity do take de saída 100% → 0%, frames 1-3, ease-in; opacity do take de entrada 0% →
  100%, frames 4-6, ease-out. Justificativa pela Regra dos Seis do `@editor`: o beat muda
  (de cena pra cena, mesmo evento) mas a emoção é contínua — um corte seco competiria com a
  continuidade emocional, e uma transição chamativa (glitch, whip-pan) chamaria atenção pra
  si mesma num material que já é genuíno e não precisa de ênfase extra. O dip curto de 6
  frames é o meio-termo: marca a passagem de tempo sem quebrar o tom. |
| **saída** | Sem alfa — aplicado direto na timeline de montagem (pode ser feito até no
  Premiere com um crossfade/dip nativo, sem precisar necessariamente do AE; incluído aqui
  pra registrar o valor exato, 6 frames, e não deixar a cargo do "feeling" do operador). |
| **on_brand** | N/A — é um corte, não uma peça gráfica. |

### Comp 02 — `GP_02_lower-third-contato`

| Campo | Valor |
|---|---|
| **comp_id** | `GP_02_lower-third-contato` |
| **duracao_frames / fps** | 60 frames @ 30fps (2s), posicionado nos últimos 2s do take3
  (frames finais da peça, ~ segundo 16,2 ao 18,2 da timeline total) |
| **entrada** | O telefone "(11) 98156-1271" já aparece no adesivo do caminhão-guincho em
  take1 e take2, mas ilegível em tela pequena (é um detalhe de fundo, não um texto pensado
  pra leitura). Esta comp cria um lower-third legível com o mesmo contato, pra fechar a peça
  com uma ação clara. |
| **animação** | Barra/caixa semi-transparente (fundo preto `rgba(0,0,0,0.55)`, mesma lógica
  de opacidade já usada nos criativos do Império-irmão — `comunidade_...README.md`,
  `box=1:boxcolor=black@0.55`) desliza de baixo pra cima, Y: +60px → 0px, frames 1-10,
  ease-out. Texto do telefone fade-in, opacity 0% → 100%, frames 6-14. Nome "Garantido
  Prêmios" acima do telefone, mesmo tratamento, com stagger de 4 frames. Hold estático dos
  frames 14-50. Fade-out conjunto (barra + texto), opacity 100% → 0%, frames 50-60. |
| **saída** | **Com alfa** — é overlay sobre o take3 na reta final, não substitui o quadro.
  Pré-render ProRes 4444 ou PNG sequence com alfa. |
| **on_brand** | **Não existe `brand-config.yaml` da Garantido ainda** — esta spec usa um
  tratamento neutro e seguro como placeholder: texto branco (`#FFFFFF`) com leve contorno
  preto (1-2px), fonte sans bold padrão (Arial Bold ou equivalente do sistema do operador,
  mesma lógica que já foi usada nos criativos do Império-irmão antes de ele ter
  `brand-config.yaml` configurado). **Quando a Garantido tiver identidade de marca definida
  (cor, fonte, logo), este tratamento deve ser revisado** — está marcado como pendência no
  `pipeline-producao.md`. |

### Zona segura de texto

Mesmo método já usado no Império-irmão (`imperio-premios/.../campanha-1-whitelist-social/
README.md`): fonte 1080×1920, mas o corte mais apertado entre os posicionamentos do Meta é
o quadrado 1:1, que mantém só `y≈420-1500` do original. Stories/Reels cortam ~250px de UI no
topo e na base. **Todo texto desta spec (lower-third incluído) deve ficar dentro de
`y≈420-1500`** — a Comp 02 já nasce desenhada pra essa faixa (lower-third fica perto da base,
mas acima de y=1500).

## Estrutura de bins

```
01_SOURCE/
  take1_conformado.mov  (upscale 1080×1920 @ 30fps)
  take2_conformado.mov
  take3_conformado.mov
02_COMPS/
  GP_01_transicoes-entre-takes
  GP_02_lower-third-contato
03_RENDERS/
  (saída de cada comp, nomeada igual ao comp_id)
```

## Estimativa de complexidade

| Comp | Complexidade | Estimativa |
|---|---|---|
| `GP_01_transicoes-entre-takes` | Baixíssima (dip simples, pode ser feito no Premiere) | 15-20min |
| `GP_02_lower-third-contato` | Baixa (slide + fade, sem rotoscopia) | 30-45min |
| **Total** | — | **~1h de operador** — esta é a peça mais simples das duas, por decisão
  deliberada: o conteúdo genuíno carrega a peça, o motion só organiza. |

## Pendências

1. **`brand-config.yaml` da Garantido Prêmios não existe.** O tratamento tipográfico da Comp
   02 é um placeholder neutro — revisar quando a identidade visual do cliente for definida.
2. **Decisão de founder sobre peça única vs. 3 variantes A/B** — esta spec assume peça única
   sequencial (seção "Decisão" acima); se o founder quiser testar separado, a Comp 02
   (lower-third) precisa ser replicada no final de cada take isolado.
3. **Copy de anúncio** (`@ladeira`) — fora do escopo desta spec, conforme já registrado no
   `README.md` da pasta ("Próximos passos").
