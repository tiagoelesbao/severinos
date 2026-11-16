# Task: Executar o pipeline de farming (produção)

**Agente executor:** `@farming-chief` (Kane)
**Motor:** `squads/virals-farming-squad/scripts/farm-run.js`
**Saída:** sessão em `workspaces/businesses/virals/farming/{data}/{session-id}/`

Esta task é a fonte de verdade do fluxo em escala. O orquestrador encadeia as fases;
esta task define **o que é obrigatório em cada porta de entrada e em cada gate**.

---

## 1. Escolher a porta de entrada

O fluxo tem duas entradas. Elas convergem no mesmo contrato — `ranking-{niche}-{date}.json` —
e daí em diante o pipeline é idêntico. **Pergunte ao usuário se não estiver claro qual usar.**

| Porta | `--entry` | Quando usar | O que faz |
|:---|:---|:---|:---|
| Monitoramento | `monitor` | não se sabe ainda quais perfis modelar | varre hashtags e âncoras do nicho atrás de postagens **recentes**, aplica a nota de corte do nicho e entrega um ranking já podado |
| Curadoria | `profiles` | o usuário já tem os perfis mapeados | ranqueia **todas** as postagens capturadas de cada perfil informado, sem reprovar nada; o corte vem depois |

Sinais de que a porta é `profiles`: o usuário cola uma lista de URLs/@handles, diz "esses
perfis", "meus perfis", "já mapeei". Sinais de `monitor`: "o que está bombando", "posts
recentes", "descobre perfis", "novidades do nicho".

---

## 2. Rodar

### Curadoria (lote de perfis)

```bash
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche={nicho} --entry=profiles \
  --profiles={lista} --items=40 --min-score=1000 --mode=auto
```

`--profiles` aceita URL completa, `@handle` ou `handle`, separados por vírgula. Para listas
grandes use `--from-file={arquivo}` (um por linha, `#` vira comentário).

### Monitoramento (postagens recentes)

```bash
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche={nicho} --entry=monitor --source=both --mode=auto
```

### Fases

| Fase | Porta | O que produz | Bloqueante |
|:---|:---|:---|:---|
| `f1` | monitor | ranking podado pela nota de corte do nicho | sim |
| `f1p` | profiles | dossiê por perfil + índice + hashtags | sim |
| `f1s` | profiles | seleção por `--min-score` → ranking | sim |
| `f2` | ambas | packs de benchmark (vídeo, frames, áudio, transcrição) | sim |
| `f2p` | ambas | `publicacao.md` por pack + índice de publicações | **não** |
| `f3` | ambas | plano de modelagem, prompts, `modeling.json` | sim |
| `f4` | ambas | imagens 9:16 | sim |
| `f4q` | ambas | gate de qualidade de imagem | sim |
| `f5` | ambas | takes de vídeo | sim |
| `f6` | ambas | montagem e export | sim |

`--from=fN` / `--to=fN` / `--only=f1,f3` recortam a execução. `--dry-run` mostra o plano.

---

## 3. Regras de execução (não negociáveis)

### Nota de corte

O padrão é `--min-score=1000`. **Score 1000 é permissivo**: com os pesos do religioso
(views×0,1 + likes + comentários×5), 10k views sozinhas já o alcançam. Numa auditoria real
de 8 perfis, 241 de 320 criativos passaram. Se o usuário quiser um recorte mais duro, use
`--min-outlier=1.5` junto — ele exige que o post tenha rompido a linha de base do próprio
canal, que é o sinal de formato vencedor.

Avise o usuário quando a seleção passar de ~40 criativos: a F2 leva **~63s por criativo**
(download + frames + áudio + transcrição), então 240 criativos são cerca de 4 horas.

### Teto de sessão

`max_creatives_per_benchmark` (em `config/scoring-weights.yaml`, default 20) trunca a F2.
Para seleções maiores, rode a F2 em lotes de 20 com `--ranks=`. **Não** remova o teto sem
o usuário pedir: ele existe para impedir varredura acidental de horas.

### Gate de qualidade (f4q) — o ponto que protege a cota

Bloqueante de propósito. A F4 só valida que o arquivo existe, tem tamanho e está em 9:16 —
nada disso diz se a imagem presta. O gate responde as duas perguntas que faltam:

- **técnica** (`ffmpeg signalstats`): imagem preta, estourada, chapada, faixa dinâmica curta;
- **semântica** (visão contra `takes[].cena`): imagem perfeita mas fora do briefing.

Vereditos: `PASS` · `CONCERNS` (passa com aviso) · `FAIL` (não segue para F5). Com
`--strict-quality`, CONCERNS também reprova.

**Texto na imagem tem dois pesos.** Sobreposto (legenda, marca d'água) é FAIL — o pipeline
aplica texto na montagem e imagem escrita não tem conserto. Incidental (placa de rua,
letreiro ao fundo) é CONCERNS — faz parte da cena fotografada. Confundi-los zera o gate:
a primeira versão reprovava imagens de aderência 10/10 por causa de uma placa no fundo.

### Publicação (f2p)

Todo pack precisa de `publicacao.md` com a legenda e as hashtags **literais** do autor.
É não bloqueante (não depende de rede nem cota), mas roda logo após a F2 para o pack já
nascer completo. Legenda vazia significa que o autor publicou sem legenda — o documento
declara a ausência em vez de omiti-la.

---

## 4. Relatar (obrigatório)

Ao final, reporte **lendo o disco**, nunca os logs das fases:

1. Sessão criada e caminho.
2. Criativos selecionados vs. criativos com pack completo.
3. Vereditos do gate: PASS / CONCERNS / FAIL, e **quais** packs reprovaram e por quê.
4. Itens degradados com o motivo técnico real (`_degraded.md`, `_STATUS.md`).
5. Cota consumida por provider.

**Nunca reporte sucesso sem arquivo em disco.** Se uma fase não produziu nada, diga que
não produziu — um pipeline que "concluiu" sem arquivos não concluiu nada.

---

## 5. Armadilhas conhecidas

| Sintoma | Causa real |
|:---|:---|
| "nenhum frame extraído" reincidente no mesmo item | arquivo é MP3 com extensão .mp4 — post em **photo mode**. Reprocessar não resolve |
| ranking vazio no modo monitor | âncora do nicho parada. Rode `farm-monitor.js --check-anchors` antes de suspeitar do nicho |
| pack reprovado por falta de `video.mp4` | nenhuma fase lê esse arquivo; ele pode ser apagado para liberar disco (`diskComplete` não o exige) |
| prompt de imagem contraditório | `visual_style` do nicho colado sobre cena traduzida. O nicho deve usar `visual_grading` para acabamento |
| todas as imagens urbanas reprovadas | gate confundindo texto incidental com sobreposto |

---

## Referências

- **Guia de uso (passo a passo): `squads/virals-farming-squad/docs/como-rodar.md`**
- Decisões e porquês: `squads/virals-farming-squad/docs/pipeline-guide.md`
- Nichos: `squads/virals-farming-squad/data/niches/*.yaml`
- Providers e cascata: `squads/virals-farming-squad/config/ai-providers.yaml`
- Checklists por fase: `squads/virals-farming-squad/checklists/`
