---
task_name: classify-genre
status: ready
responsible_executor: brief-strategist
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-002
aplica_a: [P1, P2, P3, P4, P5, P6]
input: |
  - pedido bruto em linguagem natural (do founder, do cliente ou do gestor de tráfego)
  - data/genre-catalog.yaml — gêneros MVP (active) e de backlog, com o delta de cada um
  - data/pipeline-profiles.yaml — o que cada pipeline realmente faz
  - histórico do cliente, quando existir (jobs anteriores, canal, série)
output: |
  - classificacao.md ou o bloco genero_classificado dentro de {job}/00-intake/pedido.md
  - genero: id do catálogo · pipeline_ref: P1..P6 · confianca: alta|media|baixa
  - alternativa_considerada: o segundo gênero mais provável e por que foi descartado
gate: checklists/gate-intake.md
failure_modes: |
  - Classificar pelo FORMATO em vez do OBJETIVO (vídeo de 30s pode ser P1, P2, P4 ou P5)
  - Aceitar gênero de backlog como se fosse MVP
  - Forçar o pedido no gênero mais próximo em vez de devolver
  - Não perceber que o pedido é sub-rotina de P6, não job próprio
  - Ignorar que existe série ou canal e abrir job avulso
acceptance_criteria: |
  - O gênero escolhido existe em genre-catalog.yaml com status active
  - A justificativa aponta para o OBJETIVO DE NEGÓCIO, não para o formato
  - A alternativa descartada está registrada com o motivo
  - Confiança baixa dispara elicitação, não chute
---

# classify-genre — Classificação de gênero

O gênero define o pipeline; o pipeline define o elenco. Classificar errado não produz
uma peça pior: produz o **elenco errado** trabalhando com o **método errado**. Um UGC
rodando no pipeline de brand film ganha big idea e direção de fotografia — e deixa de
parecer UGC, que era o ponto.

## Comando

```text
@brief-strategist
*classify {pedido}
*classify --explain     # mostra o raciocínio e as alternativas descartadas
```

## A pergunta que classifica

Não é "que formato é isso?". É **"o que essa peça precisa fazer acontecer no negócio?"**.

| Objetivo declarado | Gênero | Pipeline |
|---|---|---|
| Desejo, marca, peça-vitrine | `brand-film` | P1 |
| Conversão medida em gerenciador de anúncios | `ugc-ads` | P2 |
| Retenção e crescimento de página de bolha | `nicho-series` | P3 |
| Autoridade e venda do serviço da própria Oraclum | `oraclum-institucional` | P4 |
| Escala de canal sem exposição pessoal | `dark-room` | P5 |
| A entrega É a imagem | `image-lab` | P6 |

O formato é consequência, não critério. Um vídeo de 30 segundos pode ser qualquer um
dos cinco primeiros.

## Os quatro desempates que resolvem quase tudo

1. **Tem oferta e conta de anúncios de destino?** → P2. Sem oferta não é anúncio, é
   conteúdo.
2. **A peça vende a própria Oraclum?** → P4, e o `brand-lock` é o da Oraclum. Se vende a
   marca de um cliente, é P1.
3. **Existe personagem que precisa voltar semana que vem?** → P3. Continuidade é o que
   distingue série de peça avulsa.
4. **Existe rosto em cena?** Se a resposta é "não, e é de propósito" → P5.

## Sub-rotina não é job

Antes de abrir um job de P6, perguntar: **essa imagem existe sozinha ou é parte de uma
peça maior?** Capa de episódio e thumbnail nascem dentro de P3 e P5 — são chamadas de
sub-rotina, não jobs próprios. Abrir job avulso para elas produz dois manifestos
apontando para o mesmo asset e a peça sendo cobrada duas vezes.

P6 é job próprio quando **o cliente comprou a imagem**.

## Série e canal têm precedência

Antes de classificar, verificar se o pedido cai dentro de algo que já existe:

- `series/{serie-id}/series.yaml` com temporada vigente → é **episódio** de P3, não peça nova
- `canais/{canal}/channel-brief.yaml` → é **episódio** de P5, não peça nova

Ignorar isso é como abrir uma nova série a cada semana: o público não acumula
reconhecimento e o registro não acumula canon.

## Action Items

1. **Extrair o objetivo de negócio** do pedido, em uma frase verificável. "Gerar
   reunião" serve; "ficar moderno" não.
2. **Identificar o destino** — onde a peça vai viver. O canal determina formato, safe
   area e duração, e às vezes já entrega o gênero.
3. **Verificar precedência** de série e canal existentes.
4. **Aplicar os quatro desempates.**
5. **Consultar `data/genre-catalog.yaml`.** Se o melhor encaixe está em `backlog`, NÃO
   promover por conta própria: apresentar o gênero MVP mais próximo, o delta declarado
   no catálogo, e deixar o founder decidir.
6. **Registrar a alternativa descartada** com o motivo. É o que permite auditar uma
   classificação ruim depois.
7. **Atribuir confiança.** `baixa` → elicitar 3 perguntas fechadas antes de seguir.
   Nunca abrir job com classificação de baixa confiança.
8. **Devolver `genero` + `pipeline_ref`** para `tasks/open-job.md`.

## Variações por pipeline

| Pipeline | Sinal que confirma a classificação |
|---|---|
| **P1 brand-film** | O pedido fala em campanha, lançamento de marca, peça-vitrine. Há verba e prazo de campanha. O sucesso é julgado por acabamento e desejo, não por CPA. |
| **P2 ugc-ads** | Existe oferta explícita, conta de anúncios e expectativa de volume. Se o pedido fala em "testar", é P2 — teste pressupõe variação. |
| **P3 nicho-series** | Aparecem palavras como personagem, episódio, temporada, sketch, sátira. Ou o pedido cita uma série que já existe. |
| **P4 oraclum-institucional** | O cliente é a própria Oraclum e o objetivo é autoridade. Cuidado: peça da Oraclum para vender no gerenciador é P2, não P4. O que decide é o objetivo, não o dono da marca. |
| **P5 dark-room** | "Sem rosto", "canal", "narração", "b-roll". Verificar se o canal já tem `channel-brief.yaml` — se não tem, o job é de fundação de canal. |
| **P6 image-lab** | A entrega final É a imagem. Se a imagem é insumo de um vídeo, é sub-rotina do pipeline daquele vídeo. |

## Gate

- [ ] Gênero existe em `genre-catalog.yaml` com `status: active`
- [ ] A justificativa cita o objetivo de negócio, não o formato
- [ ] Precedência de série e canal verificada
- [ ] Alternativa descartada registrada com motivo
- [ ] Confiança `alta` ou `media`; `baixa` só depois de elicitação
- [ ] Se o pedido é imagem, ficou decidido explicitamente entre job P6 e sub-rotina

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Classificar pelo formato | "Reels de 30s" não é gênero. Voltar à pergunta do objetivo de negócio. |
| Gênero de backlog escolhido | Apresentar o MVP mais próximo com o delta. A promoção de gênero é decisão do founder, não da classificação. |
| Forçar no gênero mais próximo | Se nenhum encaixa, DEVOLVER com as perguntas que faltam. Um pipeline errado custa o job inteiro; uma pergunta custa dez minutos. |
| Job de P6 para uma capa de episódio | Reclassificar como sub-rotina do pipeline pai. Dois manifestos para o mesmo asset é cobrança duplicada. |
| Série existente ignorada | O episódio abre como peça avulsa, sem bíblia, e o personagem muda. Sempre checar `series/` e `canais/` antes. |
| Pedido da Oraclum classificado como P4 por reflexo | Se o objetivo é conversão em gerenciador, é P2 mesmo sendo a própria marca. |

## Handoff

`genero` + `pipeline_ref` + justificativa → **tasks/open-job.md**, e o bloco
`genero_classificado` entra em `{job}/00-intake/pedido.md`.
