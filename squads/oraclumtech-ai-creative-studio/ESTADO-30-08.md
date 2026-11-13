# Onde paramos — 30/08, madrugada

Deixado aqui para você ler ao acordar. O que está feito, o que a noite deve ter
produzido, e o comando exato para retomar.

---

## A noite

Você disparou o `RODAR-NOTURNO.bat` (12 takes do Airbnb, preset `validado`) às
23:05, enquanto uma fila de narração ainda rodava. Reorganizei para os dois não
disputarem: **parei de enfileirar narração** e deixei a madrugada inteira para o
Airbnb. O job de TTS que já estava na máquina terminou normalmente.

Motivo: com 3,3 GB de RAM livre, alternar entre TTS e Wan força recarregar o
modelo do disco a cada troca — os dois renderiam menos do que um sozinho.

**Ao acordar, confira:**

```
type assets\comfyui\_noturno-*.log
```

Se aparecer *"3 falhas seguidas — parando"*, a causa é de ambiente: verifique a
RAM livre e se o modelo do preset está presente. Se aparecer *"INTERROMPIDO"*,
alguém cancelou — a fila agora para em vez de seguir produzindo material que
seria descartado.

---

## Narrações — 11 de 12

| Peça | male02 | clone |
|---|---|---|
| LA1-disciplina | ✅ | ✅ |
| LA2-ansiedade | ✅ | ✅ |
| LA3-tempo | ✅ | ✅ |
| LB1-aceitar | ✅ | ✅ |
| LB2-paz-interior | ✅ | ✅ |
| LB3-primeiros-minutos | terminou na madrugada — conferir | **falta** |

Cada lote usa o clone do vídeo que ele modela: lote A → `ref_video_limpo.wav`
(vídeo 1, práticas); lote B → `ref_v2_1200.wav` (vídeo 2, reflexões).

**Retomar a que falta** (~20 min, precisa do ComfyUI aberto):

```
cd squads\oraclumtech-ai-creative-studio\assets\comfyui
python run_batch.py --only narpro-lb3-primeiros-minutos-clone
```

E converter para mp3 o que estiver só em `.flac`:

```
ffmpeg -i "C:\...\ComfyUI\output\narracao\LB3-primeiros-minutos-clone_00001.flac" -c:a libmp3lame -b:a 192k "C:\...\narracao\LB3-primeiros-minutos-clone.mp3"
```

---

## O passo seguinte — legendas e timelines

**Feche o ComfyUI antes.** 16 GB não comportam ele e o Whisper juntos.

```
python fecha_pecas.py                 # as 6 peças, voz clone  (~45 min)
python fecha_pecas.py --voz male02    # idem na voz publicável
```

Ele alinha as legendas ao áudio real e só então monta a timeline — nessa ordem,
porque sem o `.captions.json` não é só a legenda que sai da sincronia com a voz,
é a janela das imagens também.

Depois: `cd apps\video-studio && npm run dev`

---

## Pronto e esperando sua inspeção

- **Pack visual do lote B** — 33 imagens, identidade bronze-carmesim.
  Folhas em `assets/canal-estoico/LB*-cru.jpg`.
- **Pack visual do lote A** — 33 imagens, identidade mármore-templo.
  Folhas em `assets/canal-estoico/LA*-cru.jpg`.
- **Os 6 roteiros longos**, medidos entre 18m23s e 20m23s.

Só depois da sua inspeção vale gastar acabamento PRO — são ~4 h de máquina, e
anatomia errada não se conserta com upscale.

---

## Documentação

| Documento | Para quê |
|---|---|
| `docs/GUIA-MANUAL.html` | pipeline inteiro na mão, com o porquê de cada decisão |
| `docs/PIPELINE-LITE.md` | só os comandos, para modelo pequeno |
| `.opencode/GUIA-OPENCODE.html` | como usar o OpenCode com modelo free |
| `MEMORY-ESSENCIAL.md` | os números que não podem ser reinventados |
