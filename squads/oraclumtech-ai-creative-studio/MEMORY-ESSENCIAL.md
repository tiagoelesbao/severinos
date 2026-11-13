# Oraclum Studio — o essencial

> Versão curta do `MEMORY.md` (30 KB), para caber na janela de modelos pequenos.
> São só os números medidos e as armadilhas que custam refazer trabalho. O
> arquivo completo continua sendo a fonte — leia-o quando a janela permitir.

## A regra de ouro

**O squad DIRIGE a geração; quem GERA é o humano**, no ComfyUI local. Nenhuma
task produz pixel ou áudio sozinha. O que roda de verdade é
`assets/comfyui/run_batch.py`.

## Limites da máquina

- 16 GB de RAM. **O gargalo é RAM, não VRAM.**
- **Uma tarefa pesada por vez.** Duas filas simultâneas ficam mais lentas que uma.
- **Não rode Whisper com o ComfyUI carregado.**

## Números medidos (não reinventar)

| O quê | Valor |
|---|---|
| CFG do FLUX.2 klein | **1.0** — o modelo é destilado; subir queima a imagem |
| Resolução 16:9 / 9:16 | 1344×768 / 768×1344 |
| Denoise do upscale | **0.10** — em 0.18 ele *inventa* dano na superfície |
| wpm da referência v1 / v2 | 127,5 / 151,1 — serve para **modelar estrutura** |
| wpm do motor `male02` | **171,6** — o único que **prevê duração** |
| Wan: fps do CreateVideo | `16 × multiplicador do RIFE` |
| Wan: dtype do RIFE | **float16** — o pico é na saída do RIFE, não na geração |
| Pausa útil na narração | 0,4 a 0,8 s |

## Proibições

- **`stretch_to_fit`** em narração: 1,29× a 1,61× de esticamento, WER de 0% para 15,8%.
- **Difusão em foto de imóvel real**: alterar o que existe é publicidade enganosa.
  Use `imagem-superres-fiel.json` (ESRGAN puro).
- **Vozes clonadas de referência**: `pode_publicar: nao`. A restrição é de direito
  de voz, e ouvir não resolve direito. Para publicar: `voz_male_02.wav`.
- **Pedir superfície escrita** (pergaminho, placa, livro): entra sempre em branco,
  ou o modelo inventa glifos ilegíveis.

## As armadilhas que mais custaram

| Sintoma | Causa real | Correção |
|---|---|---|
| Jobs novos "não existem" | bloco anexado *depois* do `if __name__` | toda lista vai **acima** do guard |
| Peça sai mais curta que o previsto | wpm da referência usado para prever a nossa voz | `palavras = minutos × 171,6` |
| Legenda atrasa mais a cada bloco | tempo vindo do SRT escrito | `legendas_do_audio.py` |
| Imagem fora de sincronia com a voz | janela das imagens vinha do SRT | cues do `.captions.json` |
| Storyboard mostra a versão antiga | ComfyUI gera `_00002_` ao lado, não sobrescreve | `max(…, key=mtime)` |
| Busto sai com pele humana | prior do modelo vence adjetivo no positivo | negativo anti-carne + reforço de **superfície** que não cita material |
| Estátua com três pernas | contagem não declarada | "exactly two legs… complete anatomically correct body" |
| Overlay não aparece | falta modo de mesclagem | `blend: screen` (`soft-light` em textura) |
| "Mídia incompatível neste clipe" | `fx-plan.json` sem os três renderers | incluir `hookRenderer`, `captionRenderer`, `motionRenderers` |
| Vídeo em câmera lenta | fps não bate com o RIFE | `fps = 16 × multiplicador` |
| Camada do studio meia tela na diagonal | `x:0,y:0` — **50 é o centro** | `x:50, y:50` (`translate(x-50%, y-50%)`) |
| Animação do studio não roda | campo `animIn`/`animOut` | `animateIn`/`animateOut`; e `"slide"` não existe, é `"sobe"` |
| Take do studio começa sempre do zero | `startFromSeconds` é ignorado | `trimStartFrames` (em quadros) |
| Cartela vira apresentação de slides | cartela usada como **fundo** | cartela é **camada** sobre take real |
| Zoom da foto anda em degraus | `zoompan` arredonda para pixel inteiro | calcular em 2560×1440 → reduzir p/ 1080 (68% → 28% de variação) |
| TTS trava no meio da frase | número escrito **por extenso** | dígitos, ou frase curta separada |
| Narração devolve `No adjusted SRT available` | roteiro inteiro submetido de uma vez | submeter **bloco a bloco** |
| Pexels devolve 403 | falta `User-Agent` | mandar UA — o 403 não diz isso |

## Sementes

**Fixa** entre variações do mesmo take (senão a comparação não distingue direção
de acaso). **Nova** ao refazer algo que saiu errado (repetir a mesma tende a
repetir o mesmo defeito).

## O caminho de um episódio

```
conta_roteiros.py --srt  →  run_batch.py --only <pack>  →  monta_folha_canal.py
  →  narracao_pro.py  →  run_batch.py --only narpro-  →  legendas_do_audio.py
  →  gera_timeline_dark.py  →  npm run dev
```

Detalhe de cada passo: `docs/PIPELINE-LITE.md` (comandos) e
`docs/GUIA-MANUAL.html` (com o porquê).

## O caminho de um episódio de FUTEBOL (outro canal, outra ordem)

```
pauta.py + fonte_api.py  →  regra-de-3/gerador.py + thumb/gera_thumb.py
  →  roteiro  →  narra_comfy.py  →  audita_narracao.py (WER ≤ 12%)
  →  broll/{acervo,fotos_do_fato,cartelas}.py  →  mixa.py  →  monta.py
  →  broll/para_studio.py
```

**A embalagem vem ANTES do roteiro** — o roteiro cumpre a promessa do título.
Runbook completo: `apps/canal-futebol/ESTEIRA.md`. Índice: `MEMORY.md` §6.4 (canal)
e §6.5 (live).

**Três guardas comparam contra a duração MEDIDA, nunca a declarada:**
`audita_narracao.py` (o motor comeu frase), `mixa.py` (o `loudnorm` comeu 38 s
calado), `monta.py` (o vídeo acabou antes da fala).
