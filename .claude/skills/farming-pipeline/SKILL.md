---
name: farming-pipeline
description: >
  Executa o pipeline de farming TikTok do squad Virals — duas portas de entrada
  (monitorar postagens recentes OU auditar um lote de perfis informado), corte por
  viral score, benchmark completo com legenda/hashtags originais, modelagem, imagens
  com gate de qualidade, takes e export.
  Use when: farming, garimpo TikTok, benchmark de criativos, auditar perfis,
  ranking de perfis, /farming-pipeline, *farm, *audit.
user-invocable: true
argument-hint: "{nicho} [--entry=profiles --profiles=@a,@b | --entry=monitor] [--min-score=1000]"
agent: farming-chief
---

# farming-pipeline

Pipeline de aquecimento de contas TikTok. **A task é a fonte de verdade.**

## Task SOT

`squads/virals-farming-squad/tasks/farm-pipeline-run.md`

Guia de uso passo a passo (fluxo completo e parcial): `squads/virals-farming-squad/docs/como-rodar.md`

Leia-a antes de executar. Ela define as duas portas de entrada, as regras de cada gate
e o que é obrigatório reportar.

## Decisão de entrada

Antes de rodar, decida a porta — e pergunte se estiver ambíguo:

| O usuário disse | Porta |
|:---|:---|
| colou lista de URLs/@handles, "esses perfis", "já mapeei" | `--entry=profiles` |
| "o que está bombando", "posts recentes", "descobre perfis" | `--entry=monitor` |

## Execução

```bash
# curadoria — lote de perfis, ranking de todo o acervo, corte por score
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche={nicho} --entry=profiles --profiles={lista} --items=40 --min-score=1000 --mode=auto

# monitoramento — postagens recentes do nicho
node squads/virals-farming-squad/scripts/farm-run.js \
  --niche={nicho} --entry=monitor --source=both --mode=auto
```

Use `--dry-run` primeiro sempre que o usuário quiser ver o plano antes de gastar cota.

## Avisos que você DEVE dar

- **Custo de tempo:** a F2 leva ~63s por criativo. Diga o total estimado antes de rodar
  uma seleção grande (240 criativos ≈ 4h).
- **`--min-score=1000` é permissivo:** 10k views já o alcançam. Se o usuário quiser
  recorte duro, sugira `--min-outlier=1.5` junto.
- **Teto de sessão:** a F2 trunca em 20 criativos (`max_creatives_per_benchmark`). Para
  seleções maiores, rode em lotes com `--ranks=`.

## Gates que não podem ser pulados

| Gate | Fase | Regra |
|:---|:---|:---|
| Nota de corte | `f1s` | só passa quem atinge `--min-score` |
| Aprovação do dono | após `f3` | a modelagem é o gate mais barato do pipeline |
| Qualidade de imagem | `f4q` | `FAIL` não segue para F5 |

## Relato final

Leia o **disco**, não os logs: sessão, packs completos vs. selecionados, vereditos do
gate (e quais reprovaram), itens degradados com motivo técnico, cota por provider.
Nunca reporte sucesso sem arquivo em disco.

## Comandos relacionados

Ative `@farming-chief` para o modo interativo com comandos `*` (`*farm`, `*audit`,
`*select`, `*benchmark`, `*publication`, `*quality`, `*status`).
