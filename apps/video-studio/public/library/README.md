# Biblioteca de assets (Frente C)

Solte aqui os arquivos que ficam disponíveis no picker de **camadas extras** do `/studio`:

- `sfx/` — efeitos sonoros (whoosh, pop, impact…) — `.mp3 .wav .ogg .m4a .aac`
- `music/` — trilhas sonoras de fundo — mesmos formatos
- `overlays/` — vídeos/elementos de sobreposição — `.mp4 .mov .webm`

São servidos estaticamente pelo Next em `/library/<caminho>` e listados por `GET /api/assets`.
Subpastas são lidas recursivamente. (Além destes, os **materiais do próprio criativo** também aparecem no picker.)

## Kit inicial sintetizado (F4)

`sfx/` e `music/` já vêm com um **kit inicial gerado** (áudio 100% original, sem
direitos autorais) — pode substituir por assets curados quando quiser.

**Convenção de nomes** (a ponte de sound design resolve por substring do nome):
- SFX nomeados pela **categoria** do plano: `whoosh, swoosh, impact, boom, riser,
  pop, click, notification, ambient, transition` → `sfx/<categoria>.wav`.
- Trilhas nomeadas pelo **mood**: `tense, uplifting, lo-fi, chill` → `music/<mood>.wav`.

Quando o `plan_video_creative` pede um SFX `impact @hook`, o editor pré-monta o
clipe e casa com `sfx/impact.wav` automaticamente (F4.3). Arquivos cujo nome
contenha a categoria/mood também casam (ex.: `sfx/impact-heavy.wav`).

**Regenerar o kit:**
```
python squads/virals-marketing-squad/tools/gen_sfx_library.py
```
