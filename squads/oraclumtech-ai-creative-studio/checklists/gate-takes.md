# Gate de Estágio — Takes (`gate-takes`)

> **Estágio:** `takes` · **Dono:** `@motion-lead` · **Executor:** `human` (REGRA DE OURO)
> **Roda:** duas vezes. **Parte A** antes do card ir ao humano; **Parte B** quando o humano devolve.
> **Artefatos validados:**
> · Parte A — `{job}/12-takes/_direction/{asset-id}.yaml` + `{job}/_cards/{card-id}.md`
> · Parte B — `{job}/12-takes/entregues/` + registro de rastreabilidade
> **Libera:** estágio `audio`

> **Regra de Ouro (§3.1 do blueprint).** O squad **não gera** o vídeo. O `@motion-lead`
> entrega o **Pacote de Direção** por take; um operador humano gera; o agente **avalia** e
> dirige o retake. Nunca simular a execução humana.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o card não sai (Parte A) ou o take não é aceito (Parte B) |
| `BLOQUEANTE NON-WAIVABLE` | Nem o `@studio-chief` derruba |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

# PARTE A — Qualidade do Pacote de Direção (antes do card)

> **Esta parte vale por si.** Pacote vago é **FALHA mesmo que o take saia bom por sorte**.
> Vídeo generativo é o estágio mais caro do pipeline: cada tentativa às cegas queima
> crédito e tempo de pessoa. A direção existe para acertar na primeira ou segunda.

- [ ] **TK-A-01** · `BLOQUEANTE` — Existe um `asset_direction` por plano que precisa de movimento.
  **Teste:** cruzar os planos do `storyboard.yaml` com os arquivos em `{job}/12-takes/_direction/`.
  **Falha se:** falta pacote para algum plano, ou há pacote órfão.

- [ ] **TK-A-02** · `BLOQUEANTE` — Todos os campos do schema `asset_direction` (§3.2) estão preenchidos.
  **Teste:** conferir presença dos 12 campos, incluindo `se_falhar` e `pos_processamento`.
  **Falha se:** falta qualquer campo.

- [ ] **TK-A-03** · `BLOQUEANTE` — A rota do take está declarada: I2V a partir de still aprovado, ou T2V justificado.
  **Teste:** o pacote aponta o still de origem aprovado em `gate-stills`; se for T2V, o campo `tecnica` diz por quê.
  **Falha se:** é T2V sem justificativa — gerar no escuro produz deriva de look entre planos.

- [ ] **TK-A-04** · `BLOQUEANTE` — `parametros` traz duração, fps, aspect e intensidade de movimento.
  **Teste:** os quatro presentes, com valores; a duração corresponde à do plano no storyboard.
  **Falha se:** falta algum, ou a duração diverge do storyboard.

- [ ] **TK-A-05** · `BLOQUEANTE` — O movimento pretendido está descrito como instrução de câmera, não como sensação.
  **Teste:** o pacote nomeia o movimento (push-in, pan lateral, parallax, tilt, estático com micro-movimento), a direção e a intensidade.
  **Falha se:** pede "movimento dinâmico" ou "câmera cinematográfica".

- [ ] **TK-A-06** · `BLOQUEANTE` — `criterio_de_aceite` cobre o que só o vídeo pode falhar.
  **Teste:** os critérios incluem, quando aplicável: ausência de deformação ao longo do movimento, estabilidade de identidade do personagem do primeiro ao último frame, e movimento na direção pedida.
  **Falha se:** os critérios foram copiados do pacote de still e só falam da imagem parada.

- [ ] **TK-A-07** · `BLOQUEANTE` — `armadilhas_conhecidas` cobre falhas típicas de vídeo generativo.
  **Teste:** menciona, quando aplicável: derretimento em take longo, deriva de rosto/wardrobe ao longo do movimento, mãos em movimento, texto no frame se transformando.
  **Falha se:** ausentes ou copiadas do still sem adaptação.

- [ ] **TK-A-08** · `BLOQUEANTE` — `se_falhar` traz rota alternativa concreta.
  **Teste:** o plano B muda a abordagem — animação de câmera sobre o still (Ken Burns/parallax), composição em After Effects, ou troca de ferramenta.
  **Falha se:** diz "gerar de novo".
  **Nota:** conforme `data/pipeline-profiles.yaml`, movimento inaceitável em 3 tentativas troca a **rota** do plano, não abandona o plano.

- [ ] **TK-A-09** · `BLOQUEANTE` — O card humano está completo e aponta a devolução.
  **Teste:** segue `templates/human-task-card-tmpl.md` com o que fazer, insumos (still de origem anexo), critério de aceite, quantas variações, **onde devolver**, **nomenclatura** e prazo.
  **Falha se:** falta qualquer um.

- [ ] **TK-A-10** · `ATENÇÃO` — `quantas_variacoes` ≥ 2.
  **Teste:** ler o campo.
  **Falha se:** 1, ou faixa aberta.

- [ ] **TK-A-11** · `ATENÇÃO` — Duração de geração compatível com o limite da ferramenta.
  **Teste:** comparar a duração pedida com o teto do modelo escolhido.
  **Falha se:** pede além do teto sem prever a emenda no `pos_processamento`.

- [ ] **TK-A-12** · `ATENÇÃO` — Custo estimado do lote dentro do orçamento.
  **Teste:** somar variações × custo por geração; comparar com `job.json.orcamento_creditos`.
  **Falha se:** estoura sem decisão registrada.

### Veredito da Parte A

- **LIBERA CARD** — nenhum `BLOQUEANTE` reprovado → o card vai ao operador humano.
- **RETÉM** — devolve ao `@motion-lead`. **O card não sai.**

---

# PARTE B — Qualidade do take devolvido pelo humano

- [ ] **TK-B-01** · `BLOQUEANTE` — Todo take esperado foi devolvido.
  **Teste:** cruzar `asset_id` com os arquivos em `{job}/12-takes/entregues/`.
  **Falha se:** falta take sem registro de `se_falhar` acionado.

- [ ] **TK-B-02** · `BLOQUEANTE` — Nomenclatura conforme o card.
  **Teste:** conferir os nomes contra o padrão declarado.
  **Falha se:** há arquivo fora do padrão.

- [ ] **TK-B-03** · `BLOQUEANTE` — Cada take passou em todos os `criterio_de_aceite`.
  **Teste:** marcar sim/não por critério, take por take.
  **Falha se:** take aceito reprovando critério, sem waiver registrado.

- [ ] **TK-B-04** · `BLOQUEANTE NON-WAIVABLE` — Rastreabilidade completa.
  **Teste:** ferramenta + modelo/versão, prompt efetivamente usado, parâmetros (seed, duração, fps, motion), still de origem, **operador humano nomeado**, data-hora.
  **Falha se:** falta qualquer campo, ou o operador registrado é um agente.

- [ ] **TK-B-05** · `BLOQUEANTE` — Sem derretimento ao longo do movimento.
  **Teste:** assistir cada take inteiro, com atenção ao último terço, onde a deformação costuma aparecer.
  **Falha se:** há deformação progressiva de geometria, rosto ou objeto perceptível em exibição normal.

- [ ] **TK-B-06** · `BLOQUEANTE` — Identidade do personagem estável do primeiro ao último frame.
  **Teste:** comparar frame inicial e final de cada take com personagem.
  **Falha se:** o rosto, o cabelo ou a roupa mudam durante o take.

- [ ] **TK-B-07** · `BLOQUEANTE` — O movimento é o que foi pedido.
  **Teste:** comparar direção e intensidade com o pacote.
  **Falha se:** o take faz outro movimento, ou fica estático quando o pacote pedia movimento.

- [ ] **TK-B-08** · `BLOQUEANTE` — Duração e fps conforme o pacote.
  **Teste:** conferir o arquivo.
  **Falha se:** o take é mais curto que o plano precisa, ou tem fps diferente do preset — a emenda vira problema na montagem.

- [ ] **TK-B-09** · `BLOQUEANTE` — Sem marca d'água da ferramenta.
  **Teste:** inspecionar bordas e cantos, inclusive no último frame.
  **Falha se:** encontrar.

- [ ] **TK-B-10** · `BLOQUEANTE` — Sem logo, marca ou texto alucinado surgindo durante o movimento.
  **Teste:** varrer o fundo ao longo do take — elementos aparecem em movimento que não existiam no still.
  **Falha se:** encontrar.

- [ ] **TK-B-11** · `ATENÇÃO` — Coerência de look com os stills aprovados.
  **Teste:** comparar paleta, luz e grade do take com o still de origem.
  **Falha se:** o take mudou o tratamento.

- [ ] **TK-B-12** · `ATENÇÃO` — Variações entregues conforme o pacote e descartes registrados.
  **Teste:** contar por `asset_id`; conferir o motivo de cada descarte.
  **Falha se:** veio uma só, ou não há registro de descarte.

- [ ] **TK-B-13** · `ATENÇÃO` — Rota trocada após 3 tentativas, conforme o fallback.
  **Teste:** se houve 3 rodadas sem aceite, verificar se o `@motion-lead` acionou a rota alternativa.
  **Falha se:** o lote seguiu insistindo na mesma rota, queimando crédito.

### Veredito da Parte B

- **ACEITO** — nenhum `BLOQUEANTE` reprovado → libera `audio`.
- **RETAKE DIRIGIDO** — o `@motion-lead` atualiza o pacote com o que falhou e reemite o card.
  Ao terceiro insucesso, troca a rota do plano — não abandona o plano.

---

## Registro

| Campo | Valor |
|:---|:---|
| Planos com take / pacotes escritos | |
| Rota (I2V / T2V / AE) por plano | |
| Cards emitidos / devolvidos | |
| Operador(es) humano(s) | |
| Takes aceitos / em retake / com rota trocada | |
| Itens reprovados — Parte A (IDs) | |
| Itens reprovados — Parte B (IDs) | |
