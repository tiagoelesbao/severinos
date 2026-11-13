# Pack estoico — os três estágios do pipeline de imagem

Primeira execução **real** da cadeia completa no ComfyUI local, em 2026-08-29.
Até aqui existia planejamento; agora existe pixel.

**Workflow:** `assets/comfyui/workflows/flux2-klein-refino-upscale.json`
**Jobs:** `run_batch.py --only ref-e01` … `ref-e04`
**Arquivos em resolução cheia:** `ComfyUI/output/pack-estoico/{cru,refinado,final}/`
(ficam fora do repo — só as folhas de comparação vieram para cá)

---

## O que olhar, e nesta ordem

| Arquivo | O que ele mostra |
|---|---|
| `comparativo-3-estagios.jpg` | As 4 imagens nos 3 estágios. Retângulo verde = região que o detailer redesenhou. |
| `zoom-100pct-e02.jpg` | **A folha mais importante.** Mesma região, mesma escala na tela. É o único jeito honesto de ver o ganho do upscale. |
| `zoom-100pct-e01.jpg` | O mesmo, num rosto pequeno dentro de corpo inteiro. |
| `zoom-100pct-e04.jpg` | Cena sem rosto — só o upscale atua. Serve para você ver o que o upscale faz sozinho. |
| `ajuste-denoise-do-upscale.jpg` | O experimento que mudou os parâmetros. Ver seção "O erro que corrigi". |

---

## Os três estágios

**1 · CRU** — geração pura. FLUX.2 klein 4B Q8, 1024×1024, 4 passos, cfg 1.0.
Prompt negativo já suprimindo texto, dedo extra e saturação. ~25 s por imagem.

**2 · REFINADO** — `FaceDetailer`. Um detector YOLO acha o rosto, recorta, redesenha
aquele pedaço numa resolução maior e cola de volta com máscara suavizada.
`denoise 0.35` — é o teto antes de o rosto virar **outro** rosto.

**3 · FINAL** — `UltimateSDUpscale`. Amplia 2× com ESRGAN e depois passa o modelo de
difusão em ladrilhos de 1024, com `denoise 0.10`, para reconstruir textura real.
Saída 2048×2048.

**Custo:** ~120 s por imagem para os estágios 2 e 3 juntos.

---

## Quanto cada imagem realmente ganhou no estágio 2

| Imagem | Área redesenhada | Leitura |
|---|---|---|
| e01 · filósofo sentado | **1,97%** | rosto pequeno no quadro — ganho pontual |
| e02 · busto em perfil | **13,76%** | rosto domina o quadro — maior ganho do pack |
| e03 · mãos com pergaminho | **0,00%** | não tem rosto |
| e04 · templo noturno | **0,00%** | não tem rosto |

Os dois zeros não são falha: o detailer fez o que devia, que era não tocar em nada.
Mas eles apontam para o achado abaixo.

---

## O achado que muda o planejamento

**Os detectores YOLO não enxergam mármore.**

Troquei o detector de rosto pelo de **mão** e rodei a imagem das mãos de mármore
segurando o pergaminho. Resultado: **zero detecção, zero pixel alterado.**

Os modelos do Impact Pack foram treinados em fotografia de pessoa real. O rosto de
estátua dispara porque a geometria facial é próxima o bastante. A mão de estátua não.

O que isso significa na prática:

- Para o **dark estoico** — e para qualquer estética não-fotográfica — a rota
  automática de conserto de mão **não existe** no stack local. O caminho é máscara
  manual no MaskEditor + inpaint.
- Isso na verdade **devolve** o gesto que o curso ensina e que a seleção automática
  eliminava: deixar um dedo correto dentro da máscara, como guia de proporção.
- A rota automática segue valendo para peça **fotorrealista com pessoa na cena** —
  retrato, lifestyle, produto com modelo. Lá o detector de mão dispara.

Registrado em `data/imagem-refino-playbook.yaml` → `validacao_no_stack_local`.

---

## O erro que corrigi no meio do caminho

Comecei o upscale com `denoise 0.18`. O ladrilho **inventou rachaduras e lascas** no
mármore da bochecha — dano que não existia na imagem crua. Ele estava criando, não
ampliando.

Baixei para **0.10**: a pele fica limpa e a barba continua ganhando fio a fio.
`ajuste-denoise-do-upscale.jpg` mostra os dois lado a lado.

Isso também resolve uma contradição que os dois cursos deixaram em aberto — um dizia
que o upscaler conserta a mão, o outro que ele detona. Não é aleatório: **é o denoise.**
Acima de ~0.15 o ladrilho tem liberdade para redesenhar, e o que ele redesenha pode
sair melhor ou pior. Abaixo disso ele só resolve textura, e é previsível.

**Se a mão está errada, o upscale não é a ferramenta. O inpaint é.**

Também subi o `feather` do detailer de 5 para 24. Medido: o degrau de luminância na
borda da máscara caiu de 1,44/255 para 1,14/255. Nenhum dos dois é visível a olho —
mas 24 é de graça.

---

## O que ainda não foi exercitado

- A cadeia numa peça **fotorrealista com pessoa** — é o que testa o detector de mão
  de verdade.
- O detailer sobre **texto/rótulo** (placa, nome de loja) — a anomalia mais citada
  nos cursos, que este pack de mármore não contém.
- Uma **segunda passada** de upscale (4096) — se compensa ou se satura.
- O **Airbnb**: as fotos são reais, então lá não há geração — o pipeline de imagem
  entra só se você quiser peça estática. O plano de lá é I2V (`assets/insumos/airbnb/PLANO-DE-TAKES.md`),
  e por sua ordem o vídeo fica por último.
