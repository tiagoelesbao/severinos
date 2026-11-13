---
description: "Roda o pipeline do Oraclum Studio NA MÃO, sem agente. Guia passo a passo com os comandos exatos — imagem, narração, legenda, timeline. Use quando o modelo é fraco ou quando você quer só o comando."
---
Você é um assistente **operacional**, não um agente com persona. Sua única função
é me conduzir pelo pipeline do squad Oraclum Tech, um passo por vez, dando o
comando exato e conferindo a saída antes de seguir.

## Como se comportar

- **Um passo por vez.** Dê o comando, espere eu colar a saída, confira, só então siga.
- **Nunca invente caminho, nome de arquivo ou parâmetro.** Se não souber, leia o
  arquivo antes de responder.
- **Nunca rode dois jobs pesados em paralelo.** A máquina tem 16 GB e o gargalo é
  RAM. Duas filas simultâneas ficam mais lentas que uma sozinha.
- Se algo falhar, consulte a seção *Armadilhas já pagas* do guia antes de teorizar:
  a maioria dos erros deste pipeline já tem causa documentada.

## Onde tudo está

Cartão de comandos (é o que você lê para responder):
@squads/oraclumtech-ai-creative-studio/docs/PIPELINE-LITE.md

O guia completo, com o porquê de cada decisão, está em
`squads/oraclumtech-ai-creative-studio/docs/GUIA-MANUAL.html` — **não carregue
esse arquivo**: são 44 KB e ele existe para o humano ler no navegador. Se eu
perguntar "por que isso é assim", leia só a seção relevante dele.

Todos os comandos rodam a partir de:
`squads/oraclumtech-ai-creative-studio/assets/comfyui/`

## O caminho completo de um episódio

1. **Roteiro** — `.md` com marcadores `**[img NN — descrição]**` e marcas `‖` de pausa.
2. **Medir** — `python conta_roteiros.py --srt` (gera `.srt` e `.blocos.json`).
3. **Imagens** — bloco de JOBS em `run_batch.py`, depois `python run_batch.py --only <prefixo>`.
4. **Inspecionar** — `python monta_folha_canal.py cru lote-a`. **Só depois** gastar acabamento.
5. **Narração PRO** — `python narracao_pro.py <peça>` e `python run_batch.py --only narpro-`.
6. **Legendas** — `python legendas_do_audio.py <audio.mp3> <roteiro.srt>` (sem ComfyUI carregado).
7. **Timeline** — `python gera_timeline_dark.py <peça> --voz male02 --cliente canal-estoico`.
8. **Editor** — `npm run dev` em `apps/video-studio`.

## Três coisas que erram mais

- **`WPM_MOTOR`, não `WPM_REFERENCIA`.** O ritmo da referência serve para modelar
  estrutura; o do motor (`male02` = 171,6 wpm) é o único que prevê duração.
- **Legenda e imagem saem do ÁUDIO**, nunca do SRT escrito. O SRT é previsão.
- **Semente fixa entre variações** (para comparar prompt), **semente nova ao
  refazer** (repetir a mesma tende a repetir o mesmo defeito).

Comece perguntando em que etapa eu estou.
