---
task_name: brief
status: ready
responsible_executor: brief-strategist
execution_type: agent
tipo: estagio
stage_id: brief
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-002
pipelines: [P1, P2, P3, P4, P6]
ausente_em: 'P5 — o brief do dark-room é por CANAL (channel-brief.yaml), não por peça (ADR-007)'
input: |
  - {job}/00-intake/pedido.md
  - brand-identity.yaml e brand-config.yaml do cliente
  - registros persistentes quando houver (series.yaml, channel-brief.yaml)
output: |
  - {job}/01-brief/brief.yaml         objetivo, avatar, insight, KPI, canal, restrição
  - {job}/01-brief/brand-lock.yaml    SNAPSHOT da identidade (ADR-004)
  - {job}/01-brief/objections.md      só em P2
gate: checklists/gate-brief.md
failure_modes: |
  - brand-lock como ponteiro em vez de snapshot — quebra a reprodutibilidade
  - Avatar genérico ("empreendedores") que não gera insight
  - KPI que a peça não consegue mover sozinha
  - Brief que descreve o que a peça É em vez do que ela precisa FAZER
  - Restrição de marca não extraída do brand-identity
acceptance_criteria: |
  - brand-lock.yaml é conteúdo copiado, não caminho
  - O avatar é específico o bastante para gerar um insight humano
  - O KPI é atribuível à peça
  - As restrições de léxico e de imagem do cliente estão explícitas
---

# brief — Brief formal e trava de marca

Converte pedido bruto em documento de trabalho. O `brief-strategist` (método Jon Steel)
faz uma coisa que nenhum outro estágio faz: encontra o **insight humano** — a verdade
sobre a pessoa que torna a mensagem inevitável.

Um brief que só reorganiza o pedido não serviu para nada.

## Comando

```text
@brief-strategist
*brief {job-id}
*brand-lock {job-id}    # só o snapshot de identidade
```

## O brand-lock é snapshot, não ponteiro

> ADR-004 — `brand-lock.yaml` é snapshot da identidade no início do job, não ponteiro.

O job precisa ser **reproduzível depois**. Se a marca trocar de paleta em três meses,
uma peça reaberta com ponteiro renderiza diferente do que foi entregue e aprovado.
Copiar o conteúdo custa nada e resolve isso para sempre.

O `brand-lock` carrega, no mínimo: paleta, tipografia, arquétipo, léxico próprio, **léxico
proibido** e restrições de imagem. O léxico proibido é o que o `fact-checker` vai usar
como V5 — se não estiver aqui, o gate não tem contra o que comparar.

## Objetivo ≠ descrição

| ❌ Brief ruim | ✅ Brief que funciona |
|---|---|
| "Vídeo institucional moderno" | "Fazer diretor de marketing de e-commerce médio pedir uma reunião" |
| "Público: empreendedores" | "Quem já tentou automatizar com no-code e desistiu na integração" |
| "Aumentar awareness" | "CTR acima de 1,2% no criativo frio de Meta" |

## Action Items

1. **Ler `pedido.md`** e o `brand-identity.yaml` do cliente.
2. **Tirar o snapshot** — copiar identidade e config para `brand-lock.yaml` (ADR-004).
   Cliente sem `brand-identity` → **BLOQUEIA**: sem marca-guia não existe peça de marca.
3. **Estreitar o avatar** até virar uma pessoa reconhecível, não um segmento.
4. **Encontrar o insight humano** — a verdade sobre esse avatar que a peça vai usar.
   É o entregável que justifica o estágio.
5. **Definir o KPI** que a peça consegue mover sozinha. KPI que depende de landing page,
   preço e follow-up não é KPI de criativo.
6. **Extrair as restrições** do `brand-identity`: léxico proibido, o que a marca nunca
   faz, e — para a Oraclum — a regra **sem case fabricado**.
7. **Escrever `brief.yaml`** e rodar `checklists/gate-brief.md`.

## Variações por pipeline

| Pipeline | O que o brief carrega a mais |
|---|---|
| **P1 brand-film** | O que a peça precisa fazer o público SENTIR, além de pensar. Verba, prazo e o padrão de acabamento esperado — a peça-vitrine é julgada por acabamento. |
| **P2 ugc-ads** | `objections.md` — a matriz de objeções do avatar. Cada objeção vira candidata a hook no `script`. Brief sem objeção mapeada produz N hooks iguais com outra roupa. Dor genérica → derivar de comentários e reviews reais coletados no `research`, marcada como hipótese a validar em mídia. |
| **P3 nicho-series** | A **bolha**, estreitada até caber em uma frase que só quem é da bolha entende. Bolha ampla demais mata a série: sem jargão comum não há piada interna. |
| **P4 oraclum-institucional** | Herda o dossiê do monitoramento diário e grava `{job}/02-research/dossie-herdado.md` — não há estágio `research` aqui (ADR-006). O `brand-lock` é o da Oraclum, com a regra sem case fabricado em destaque. |
| **P5 dark-room** | **Estágio ausente.** O brief é por canal: `canais/{canal}/channel-brief.yaml`, escrito uma vez e revisado por temporada (ADR-007). Ainda assim, `open-job` cria `01-brief/` para o `brand-lock` — o snapshot é obrigatório em todo job. |
| **P6 image-lab** | Destino e formato são o coração do brief: eles definem composição, safe area e tamanho mínimo de leitura. Em modo embutido o estágio é PULADO e o brief é herdado do pai (copiado, não referenciado). |

## Gate

`checklists/gate-brief.md`, mais:

- [ ] `brand-lock.yaml` é conteúdo copiado, não caminho
- [ ] Léxico proibido presente e explícito
- [ ] Avatar específico o bastante para gerar insight
- [ ] KPI atribuível à peça
- [ ] Insight humano declarado, não só demografia

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| `brand-lock` como ponteiro | O job deixa de ser reproduzível. Copiar o conteúdo (ADR-004). |
| Avatar genérico | Não gera insight, e sem insight o `concept` produz formato em vez de ideia. Estreitar até doer. |
| KPI fora do alcance da peça | O criativo é julgado por algo que ele não controla. Escolher KPI de criativo. |
| Brief que descreve a peça | O brief diz o que precisa ACONTECER; a peça é resposta, não premissa. |
| Restrição de marca esquecida | O `factcheck` reprova tarde, com a peça pronta. Extrair no brief é barato. |
| Cliente sem `brand-identity` | BLOQUEIA. Não improvisar marca-guia. |

## Handoff

`{job}/01-brief/brief.yaml` + `brand-lock.yaml` → **research** (ou **concept** em P4, ou
**design** em P6 embutido).
