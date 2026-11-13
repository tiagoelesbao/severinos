# Pipeline — cartão de comandos

> Versão enxuta do `GUIA-MANUAL.html` (44 KB), para caber na janela de modelos
> pequenos. Só o comando e o que esperar. O porquê de cada decisão está no guia
> completo.

Todos os comandos rodam a partir de:

```
squads/oraclumtech-ai-creative-studio/assets/comfyui/
```

O ComfyUI precisa estar aberto em `http://127.0.0.1:8188`.

---

## 1 · Medir o roteiro

```
python conta_roteiros.py --srt
```
Reescreve o cabeçalho de cada `.md` com palavras/duração e grava `.srt` e
`.blocos.json` ao lado. **Duração é calculada a 171,6 wpm** (o motor), não a 127,5.

## 2 · Gerar imagens

```
python run_batch.py --list                 # ver os jobs que existem
python run_batch.py --only <prefixo>       # rodar só esses
```
Sai em `ComfyUI/output/<pasta do filename_prefix>/`. ~15–25 s por imagem.

## 3 · Inspecionar antes de gastar acabamento

```
python monta_folha_canal.py cru lote-a
python monta_storyboard.py v2              # comparativo real × 3 variações
```
A inspeção é **estrutural**: contar membros, contar elementos repetidos,
perguntar de cada objeto se tem função na cena.

## 4 · Narração (rota PRO, por parágrafo)

Cada peça sai em **duas vozes**: `male02` (publicável) e `clone`. E cada lote usa
o clone do vídeo que ELE modela — o `v2` de `ref_v2_1200.wav` é **vídeo 2**, não
"versão 2":

| Lote | Modela | Clone |
|---|---|---|
| A — LA1/LA2/LA3 | vídeo 1 · práticas | `ref_video_limpo.wav` |
| B — LB1/LB2/LB3 | vídeo 2 · reflexões | `ref_v2_1200.wav` |

```
python narracao_pro.py LA1-disciplina
python run_batch.py --only narpro-
ffmpeg -i "...\narracao\LA1-disciplina-male02_00001.flac" -c:a libmp3lame -b:a 192k "...\narracao\LA1-disciplina-male02.mp3"
```
~19 min de máquina para ~20 min de áudio.

## 5 · Fechar a peça (legendas + timeline)

**Feche o ComfyUI antes** — 16 GB não comportam ele e o Whisper.

```
python fecha_pecas.py                       todas as longas, voz clone
python fecha_pecas.py --voz male02          idem, na voz publicável
python fecha_pecas.py LB1-aceitar           só uma peça
```

Ele faz os dois passos na ordem certa: alinha as legendas ao áudio real
(~7 min por 20 min de fala; esperado 94–95% de casamento) e só então monta a
timeline. A ordem importa — sem o `.captions.json`, a janela das IMAGENS
também sai da sincronia com a voz.

Os passos avulsos, se precisar:

```
python legendas_do_audio.py "...\narracao\LA1-disciplina-clone.mp3" ..\..\data\roteiros\estoico\LA1-disciplina.srt
python gera_timeline_dark.py LA1-disciplina --voz clone --cliente canal-estoico
```

## 6 · Abrir o editor

```
cd apps\video-studio && npm run dev
```

---

## Áudio e vídeo (quando precisar)

```
python pecas_audio.py            # gera trilha/SFX
python organiza_audio.py         # organiza em data/trilhas-and-sfx/
python faz_loops.py              # camas viram loop perfeito (WAV, não MP3)
python gera_overlays.py 10       # 11 overlays de atmosfera
python prova_overlays.py         # folha de prova da mesclagem
RODAR-NOTURNO.bat                # fila da madrugada, um job por vez
```

## Modelar uma referência nova

```
python transcreve_referencias.py "C:\...\video.mp4"      # ritmo, wpm, pausas
python extrai_takes_referencia.py "C:\...\video.mp4" meu-nicho
python monta_storyboard.py meu-nicho
```

## Emergência — ComfyUI travado

```
curl -X POST http://127.0.0.1:8188/interrupt
curl -X POST http://127.0.0.1:8188/queue -H "Content-Type: application/json" -d "{\"clear\":true}"
curl -X POST http://127.0.0.1:8188/free  -H "Content-Type: application/json" -d "{\"unload_models\":true,\"free_memory\":true}"
```

`/interrupt` cancela **o job atual, não a fila do seu script**. Um
`run_batch.py` em execução continua para o próximo job — feche o terminal também.
