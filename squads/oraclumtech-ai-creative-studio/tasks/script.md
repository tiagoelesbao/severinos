---
task_name: script
status: ready
responsible_executor: head-of-copy
execution_type: agent
tipo: estagio
stage_id: script
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-006
pipelines: [P1, P2, P3, P4, P5]
ausente_em: 'P6 — image-lab não tem roteiro; o texto da arte vem do brief'
input: |
  - {job}/03-concept/territorio-criativo.md (P1, P3, P4)
  - {job}/04-story/arco-episodio.md e biblia.yaml (P3)
  - {job}/02-research/hooks-em-veiculacao.md (P2) · fontes.json (P5)
  - {job}/01-brief/brief.yaml e brand-lock.yaml — léxico proibido
output: |
  - {job}/05-script/roteiro.md
  - {job}/05-script/claim-ledger.json   o razão de claims (ADR-003)
  - {job}/05-script/hooks.md            (P2)
  - {job}/05-script/mapa-broll.md e titulo.md (P5)
gate: checklists/gate-script.md
failure_modes: |
  - Não escrever o claim-ledger — o factcheck fica sem o que auditar
  - Claim de resultado sem prova
  - Léxico proibido do brand-lock escorregando para o texto
  - N hooks que atacam a mesma objeção com a mesma prova
  - Frase sem fonte "suavizada" em vez de cortada
acceptance_criteria: |
  - claim-ledger.json existe e toda afirmação tem âncora
  - Nenhuma palavra do léxico proibido no roteiro
  - O roteiro cabe na duração-alvo
  - Em P2, hooks.md prova que os hooks são distintos
---

# script — Roteiro, voz e razão de claims

O `head-of-copy` é o dono da voz. Escreve o roteiro e — igualmente importante — o
**claim-ledger**, que é o que torna a peça auditável.

## Comando

```text
@head-of-copy
*script {job-id}
*hooks {job-id}      # P2: N hooks sobre o corpo único
*ledger {job-id}     # só o razão de claims
```

## O claim-ledger é criado aqui (ADR-003)

`{job}/05-script/claim-ledger.json` nasce neste estágio e é o objeto de auditoria do
`factcheck`. Cada afirmação do roteiro vira uma entrada, com **âncora**: transcrição do
benchmark, fonte primária em `fontes.json`, ou documento do cliente.

Sem o ledger, o `factcheck` não tem contra o que comparar — e o estágio não fecha.

O ledger não é burocracia: é o que permite reprovar uma frase **antes** de ela virar
locução gravada, take gerado e corte montado.

## Claim sem prova: cortar, não suavizar

| ❌ | ✅ |
|---|---|
| "Triplique seu faturamento" | "Como o fluxo de automação funciona, passo a passo" |
| "A maioria das empresas falha nisso" | (cortar, ou trazer a fonte) |
| "Nossos clientes relatam..." | (Oraclum não tem case — cortar) |

Reescrever em **linguagem de mecanismo** ("como funciona") no lugar de promessa de
resultado resolve a maior parte dos casos. Onde não resolve, a frase sai. Não existe
versão suavizada de claim sem fonte.

## Action Items

1. **Ler o insumo do estágio anterior** — território, arco, hooks concorrentes ou fontes.
2. **Carregar o `brand-lock.yaml`** e ter o léxico proibido à vista enquanto escreve.
3. **Escrever o roteiro** na duração-alvo do brief, na voz da marca ou do personagem.
4. **Abrir o `claim-ledger.json`** conforme escreve: toda afirmação verificável vira
   entrada com âncora. Afirmação sem âncora → reescrever como mecanismo, ou cortar.
5. **Varrer o próprio texto** contra o léxico proibido.
6. **Conferir a duração** — leitura em voz alta, não contagem de caracteres.
7. **Rodar `checklists/gate-script.md`.**

## Variações por pipeline

| Pipeline | O que o script entrega a mais |
|---|---|
| **P1 brand-film** | Roteiro que serve à big idea aprovada, não que a explica. A peça-vitrine tolera menos texto: se a ideia precisa ser explicada, o `concept` não fechou. |
| **P2 ugc-ads** | Estratégia **1 corpo × N hooks** — o padrão já validado no `plan_video_creative.py`. `hooks.md` é o artefato que PROVA a distinção: uma linha por hook com a objeção atacada, a promessa e o pattern interrupt. Duas linhas com a mesma objeção e a mesma prova são o mesmo hook com outra roupa. Sem objeções distintas suficientes, **reduzir o número de hooks e dizer por quê** — nunca inflar o lote. |
| **P3 nicho-series** | Fala dentro do **jargão da bolha**, com os tiques do personagem travados na bíblia. Sátira que explica a piada não é sátira. Fala fora do léxico → reescrever com o `lexico-da-bolha.md`. |
| **P4 oraclum-institucional** | Roteiro **dor → solução**. Escorregou para promessa de resultado → reescrever como demonstração de método. É a regra central do brand-identity da Oraclum, e o motivo mais comum de reprovação aqui. |
| **P5 dark-room** | Três artefatos além do roteiro: `claim-ledger.json` (cada frase apontando para `fontes.json`), `mapa-broll.md` (liga cada bloco de locução à imagem, com a antecipação de 0,5–1s do gênero — **substitui a decupagem**, já que P5 não convoca film-director) e `titulo.md` (3 candidatos contra `title-patterns.md` do canal, marcando o que já foi usado). Claim sem fonte → **a frase sai do roteiro**. |
| **P6 image-lab** | **Estágio ausente.** O texto que vai na arte vem do brief e é composto na fase `stills.finish`. |

## Gate

`checklists/gate-script.md`, mais:

- [ ] `claim-ledger.json` existe e toda afirmação tem âncora
- [ ] Nenhuma palavra do léxico proibido
- [ ] Duração conferida por leitura, não por contagem
- [ ] P2: `hooks.md` prova a distinção entre hooks
- [ ] P5: toda frase aponta para `fontes.json`; `mapa-broll.md` completo

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Ledger não escrito | O `factcheck` não tem o que auditar e o estágio não fecha. Escrever junto com o roteiro, não depois. |
| Claim suavizado | "Muitos dizem que..." continua sendo claim sem fonte. Cortar. |
| Léxico proibido no texto | V5 reprova no `factcheck`, com a peça pronta. Varrer aqui é barato. |
| N hooks iguais (P2) | Queima N vezes o trabalho humano e produz teste que não ensina nada. Reduzir e explicar. |
| Roteiro longo demais | O `assembly` descobre no corte, tarde. Ler em voz alta. |
| Case fabricado como exemplo | Se o leitor pode entender como case real, é case fabricado. |

## Handoff

`{job}/05-script/roteiro.md` + `claim-ledger.json` → **decupagem** (P1, P3, P4),
**character** (P2) ou **stills** (P5).
