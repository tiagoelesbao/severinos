# 🌱 Como rodar o pipeline de farming

Guia operacional. Para o **porquê** de cada decisão, veja `pipeline-guide.md`.

O pipeline termina no **export da F6** (`export/criativo.mp4`). A publicação no
video-studio é comando avulso e **opcional** — não faz parte do fluxo.

---

## 1. Fluxo completo

### Porta A — curadoria (você já tem os perfis)

```bash
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche=religioso --entry=profiles \
  --profiles=@perfil1,@perfil2 --items=40 --min-score=1000 --mode=auto
```

`--profiles` aceita URL completa, `@handle` ou `handle`. Listas grandes:
`--from-file=perfis.txt` (um por linha, `#` vira comentário).

### Porta B — monitoramento (descobrir postagens recentes)

```bash
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche=religioso --entry=monitor --source=both --mode=auto
```

### O que acontece

O pipeline roda até a **F4Q** e **para na F5**, que é manual. Ele imprime as instruções
de retomada. Depois de gerar os vídeos à mão:

```bash
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche=religioso --session={ID} --from=f6
```

Sempre veja o plano antes de gastar cota:

```bash
node ... farm-run.js --niche=religioso --entry=profiles --profiles=@x --dry-run
```

---

## 2. Rodar a partir de um ponto específico

| Quero | Comando |
|:---|:---|
| Continuar de uma fase | `--from=f3 --session={ID}` |
| Parar numa fase | `--to=f4` |
| Rodar só algumas | `--only=f4,f4q` |
| Um pack específico | `--ranks=1,3` |
| Só a pasta de teste | `--origin=teste` |

`--origin` recorta pela pasta sob `benchmark/` (`perfil`, `hashtag`, `teste`). É como se
ensaia uma mudança num pack isolado sem gastar visão nos outros — vale para F3, F4, F4Q,
F5, F6 e para os publicadores.

---

## 3. Fases isoladas

| Fase | Comando | Produz |
|:---|:---|:---|
| F1-P auditoria | `farm-profiles.js --niche=X --profiles=@a,@b --items=40` | dossiê por perfil, índice, hashtags |
| F1-S seleção | `farm-profiles.js --niche=X --session=ID --min-score=1000` | `ranking-{niche}-{data}.json` |
| F2 benchmark | `farm-benchmark.js --niche=X --session=ID --top=8` | packs (vídeo, frames, áudio, transcrição) |
| F2-P publicação | `farm-publication.js --niche=X --session=ID` | `publicacao.md` + índice |
| F3 modelagem | `farm-model.js --niche=X --session=ID` | plano, prompts, `modeling.json` |
| F4 imagens | `farm-images.js --niche=X --session=ID` | `images/take-N.png` |
| F4Q gate | `farm-image-check.js --niche=X --session=ID` | `_quality.md` + veredito |
| F6 montagem | `farm-assemble.js --niche=X --session=ID --dewatermark` | `export/criativo.mp4` + kit |

Seleção manual em vez de corte por score:

```bash
node ... farm-profiles.js --niche=X --session=ID --pick=handle#1,handle#4
```

---

## 4. A etapa manual (F5)

O motor automático de vídeo está fora do pipeline: a geração local não tem qualidade
publicável e não há API paga configurada.

1. Abra `{pack}/prompts-animacao.md` — prompts **em inglês**, um bloco por motor.
2. **Desligue a geração de áudio** no motor. A trilha é o `audio.mp3` do benchmark;
   áudio gerado colide na montagem.
3. Envie `images/take-N.png` como entrada (image-to-video), nunca text-to-video.
4. Cole o negative prompt onde houver campo.
5. Salve cada resultado em `{pack}/takes/take-N.mp4`.
6. Confira: `farm-takes.js --mode=hybrid --verify`
7. Retome: `farm-run.js --from=f6`

---

## 5. Antes de fechar: preencher a frase

A F6 usa `creative_text.frase` do `modeling.json` como texto na tela. Se estiver vazia,
ela cai para a transcrição do áudio do benchmark e **avisa** — o que costuma render
ruído sem sentido quando a trilha é instrumental.

```jsonc
"creative_text": {
  "frase": "",                    // ← escreva aqui a copy autoral
  "original_detectada": [ { "take": 1, "texto": "..." } ]   // referência de ESTRUTURA
}
```

`original_detectada` é o texto que o autor do benchmark usou — serve para modelar a
forma (tamanho, tom, quebra), nunca para copiar.

---

## 6. Checar o resultado

```bash
# o export
ls {pack}/export/            # criativo.mp4 + publishing-kit.md

# houve movimento real nos takes? (0 = imagem parada)
ffmpeg -i take-1.mp4 -vf "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -

# status consolidado da sessão
cat {sessão}/benchmark/_STATUS.md
cat {sessão}/_degraded.md
```

O `publishing-kit.md` declara a **origem do texto**: "texto autoral queimado" ou um aviso
de que veio da transcrição. Leia antes de publicar.

---

## 7. Flags que evitam retrabalho

| Flag | Onde | Para quê |
|:---|:---|:---|
| `--dry-run` | todas | ver o plano sem gastar cota |
| `--dewatermark` | F6 | cortar a marca do motor I2V (7% da base) |
| `--caption-y=0.42` | F6 | altura do bloco de texto |
| `--min-outlier=1.5` | F1-S | recorte duro: só quem rompeu a linha de base do canal |
| `--skip-providers=a,b` | F4 | testar o fallback / contornar provider instável |
| `--strict` | F4Q | CONCERNS também reprova (cuidado: cena urbana quase sempre tem texto incidental) |
| `--no-vision` | F3, F4Q | rodar sem gastar cota de visão |

---

## 8. Números para dimensionar

| | |
|:---|---:|
| F2 por criativo | ~63s |
| 240 criativos na F2 | ~4h |
| Teto por sessão (F2) | 20 — acima disso, lotes com `--ranks=` |
| `--min-score=1000` | permissivo: 10k views já alcançam |

---

## 9. Acionamento por agente

```
/farming-pipeline              skill
@farming-chief                 modo interativo
```

Comandos do chief: `*farm`, `*audit`, `*select`, `*benchmark`, `*publication`, `*model`,
`*quality`, `*generate`, `*assemble`, `*status`, `*niches`, `*quota`.

A fonte de verdade do fluxo é `tasks/farm-pipeline-run.md` — agente e skill apenas a
executam.

---

## 10. Pendências conhecidas

| Item | Estado |
|:---|:---|
| Edição no video-studio | **pendente** — a ponte funciona (`farm-studio-publish.js`), mas a qualidade da edição não atingiu o padrão do export. Fora do pipeline. |
| Render pelo studio | indisponível — `render-export.ts` usa um Timeline interno que não consome o `timeline.json` da ponte |
| Geração automática de vídeo | fora do pipeline até haver API paga ou hardware local |
