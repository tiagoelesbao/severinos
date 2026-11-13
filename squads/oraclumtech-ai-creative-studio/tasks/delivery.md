---
task_name: delivery
status: ready
responsible_executor: exec-producer
execution_type: agent
tipo: estagio
stage_id: delivery
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-017
executor_alternativo: 'studio-chief em P4 e P6 (sem exec-producer — ADR-006)'
pipelines: [P1, P2, P3, P4, P5, P6]
input: |
  - {job}/15-gate/gate-verdict.md com veredito PASS ou CONCERNS aceito
  - {job}/14-assembly/master/ e cutdowns (ou 11-stills/finalizadas/ em P6)
  - {job}/01-brief/brief.yaml — canal de destino e presets exigidos
  - registros persistentes a atualizar: series/{serie-id}/, canais/{canal}/
output: |
  - {job}/16-delivery/entrega/              os arquivos finais por canal
  - {job}/16-delivery/publishing-kit.md     como publicar: copy, título, tags, horário
  - {job}/16-delivery/delivery-manifest.yaml (templates/delivery-manifest-tmpl.yaml)
  - {job}/job.json → status: delivered
  - write-back nos registros persistentes (P3, P5)
gate: checklists/gate-delivery.md
failure_modes: |
  - Entregar sem publishing-kit — trabalho pela metade
  - Fechar como concluído com peça faltando
  - Promover canon ao registro sem gate PASS
  - Entregar arquivo fora de especificação de canal sem avisar
  - Em P6 embutido, fazer delivery próprio e cobrar duas vezes
  - Perder o episódio porque o write-back falhou
acceptance_criteria: |
  - Todo arquivo do manifesto existe em disco, com hash
  - Publishing-kit presente e completo
  - Entrega parcial declara no manifesto o que falta e por quê
  - Write-back só com gate PASS
  - job.json fecha com status coerente com o que foi entregue
---

# delivery — Empacotamento, entrega e promoção de canon

O `exec-producer` fecha o job: empacota o aprovado, escreve como publicar, atualiza os
registros que vivem acima do job e marca o estado final.

## Comando

```text
@exec-producer
*deliver {job-id}
*manifest {job-id}       # só o manifesto
*writeback {job-id}      # só a promoção ao registro persistente
```

## A peça só existe quando é publicável

Um master em disco não é entrega. Entrega é master **mais** o que a pessoa precisa para
publicar: copy, título, descrição, tags, thumb, formato por canal e horário sugerido.

> Export sem publishing-kit ao lado é trabalho pela metade — nunca é reportado como pronto.

É a mesma regra da F6 do farming, e existe porque o modo de falha é sempre o mesmo: o job
"termina", e três dias depois alguém descobre que ninguém sabia o que escrever na legenda.

## O manifesto é a prova, não o relatório

`delivery-manifest.yaml` (via `templates/delivery-manifest-tmpl.yaml`) lista arquivo por
arquivo, com **hash**. Montar o manifesto lendo o disco é o que impede o job de fechar
com peça faltando — a mesma armadilha do pipeline que reportava "10 ok / 0 failed" com
zero arquivo.

Entrega parcial é legítima, desde que **declarada**: o manifesto diz o que falta e por quê.
O que não é legítimo é fechar como concluído escondendo a falta.

## Write-back: o que atravessa o job

Em P3 e P5 existe estado que vive **acima** do job. O `delivery` é onde ele é atualizado —
e a regra é única:

> **Nada entra no registro sem gate PASS.**

Um sheet reprovado que vaza para `data/characters/{character-id}/` contamina todos os
episódios seguintes, porque a deriva se acumula. Canon promovido por engano é mais caro
que episódio atrasado.

Se o write-back falhar (lock preso, registro corrompido), a **entrega segue** e o job
fecha como `delivered_pending_canon` / `delivered_pending_registry`, com a pendência em
`job.json`. Nunca se perde a peça por causa do registro; nunca se promove canon sem gate.

## Action Items

1. **Ler o `gate-verdict.md`.** PASS ou CONCERNS aceito pelo founder. FAIL não chega aqui.
2. **Selecionar o aprovado.** Item reprovado sai do pacote; o lote entrega o que passou.
3. **Derivar por canal** conforme os presets do brief — formato, codec, resolução, safe area.
4. **Montar `entrega/`** e conferir **lendo o disco**, não o manifesto anterior.
5. **Escrever o `publishing-kit.md`** — copy, título, descrição, tags, thumb, horário.
6. **Gerar o `delivery-manifest.yaml`** com hash por arquivo.
7. **Fazer o write-back** nos registros persistentes, quando o pipeline tiver (P3, P5) —
   só com PASS.
8. **Liberar o lock** (`series/{serie-id}/.lock` em P3).
9. **Fechar `job.json`** com `status: delivered` e o sumário lido do disco.
10. **Rodar `checklists/gate-delivery.md`.**

## Variações por pipeline

| Pipeline | O que muda na entrega |
|---|---|
| **P1 brand-film** | Master 16:9 mais os cutdowns e o derivado 9:16, cada um com seu preset. O publishing-kit cobre múltiplos canais — é a entrega com mais variantes de formato. |
| **P2 ugc-ads** | Um diretório **por variação**, cada um com master, thumb, copy de anúncio, headline, CTA e o hook atacado. Mais o `plano-de-teste.md`: qual variação testa qual hipótese e o que cada resultado significa. Lote sem plano de leitura gera número sem aprendizado. Nenhuma variação aprovada → o job **volta para script**; não se entrega lote vazio com relatório. |
| **P3 nicho-series** | Write-back para `series/{serie-id}/`: bíblia com o canon novo, sheets aprovados promovidos em `data/characters/{character-id}/`, `episodes.json`, `continuity-log.md` e o léxico da bolha. Libera o `.lock`. Capa ausente → chama `wf-image-lab.yaml` embutido antes de fechar. |
| **P4 oraclum-institucional** | Sem exec-producer (ADR-006): quem empacota é o `studio-chief`. Se o job cresceu para campanha, reclassificar como `lancamento-produto` (backlog) e convocar o exec-producer. |
| **P5 dark-room** | Write-back para `canais/{canal}/`: `episodes.json`, `title-patterns.md` (para não repetir título) e `fontes-confiaveis.md`. O publishing-kit carrega título, descrição, tags, thumb e horário segundo o `channel-brief`. |
| **P6 image-lab** | **Autônomo:** entrega normal, com derivados por formato. **Embutido: NÃO HÁ delivery** — o caminho do arquivo já foi devolvido ao pai em `_result.yaml` e o job encerrou como `closed_embedded`. Fazer delivery próprio aqui é cobrar duas vezes a mesma peça e criar dois manifestos para o mesmo asset. |

## Gate

`checklists/gate-delivery.md`, mais:

- [ ] Todo arquivo do manifesto existe em disco, com hash
- [ ] `publishing-kit.md` presente e completo
- [ ] Presets de canal respeitados, ou a divergência declarada
- [ ] Entrega parcial declara o que falta e por quê
- [ ] Write-back só com PASS; lock liberado
- [ ] `job.json` fechado com sumário lido do disco

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Entrega sem publishing-kit | Ninguém publica. O kit é parte da entrega, não anexo. |
| Job fechado com peça faltando | Montar o manifesto lendo o disco, sempre. |
| Canon promovido sem PASS | Contamina todos os episódios seguintes. Só com PASS. |
| Arquivo fora de especificação entregue calado | Entregar o master e **registrar a pendência** de derivação. Nunca entregar fora de spec em silêncio. |
| P6 embutido fazendo delivery | Cobrança duplicada e dois manifestos. Em embutido, `_result.yaml` e encerra. |
| Write-back falha e o episódio se perde | A entrega segue; a pendência fica em `job.json`. Peça e registro são independentes. |
| Lock não liberado (P3) | Trava a temporada inteira. Liberar sempre, inclusive em falha. |

## Handoff

`{job}/16-delivery/entrega/` + `publishing-kit.md` → **founder / cliente / canal**.
Registros atualizados → os **próximos jobs** da série ou do canal.
