# Gate de Estágio — Stills (`gate-stills`)

> **Estágio:** `stills` · **Dono:** `@image-lead` · **Executor:** `human` (REGRA DE OURO)
> **Roda:** duas vezes. **Parte A** antes do card ir ao humano; **Parte B** quando o humano devolve.
> **Artefatos validados:**
> · Parte A — `{job}/11-stills/_direction/{asset-id}.yaml` + `{job}/_cards/{card-id}.md`
> · Parte B — `{job}/11-stills/entregues/` + registro de rastreabilidade
> **Libera:** estágio `takes` (ou `assembly`, em `image-lab`)

> **Regra de Ouro (§3.1 do blueprint).** O squad **não gera** a imagem. O `@image-lead`
> entrega o **Pacote de Direção**; um operador humano gera; o agente **avalia** e dirige o
> retake. Nunca simular a execução humana.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o card não sai (Parte A) ou o asset não é aceito (Parte B) |
| `BLOQUEANTE NON-WAIVABLE` | Nem o `@studio-chief` derruba |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

# PARTE A — Qualidade do Pacote de Direção (antes do card)

> **Esta parte vale por si.** Um pacote vago é **FALHA mesmo que o asset saia bom por
> sorte**: acerto sem direção não se repete no próximo lote, no próximo episódio nem com
> outro operador. Aqui não se avalia imagem nenhuma — não existe imagem ainda.

- [ ] **STL-A-01** · `BLOQUEANTE` — Existe um `asset_direction` por plano que precisa de still.
  **Teste:** cruzar `{job}/06-decupagem/storyboard.yaml` (planos com `asset_id` a gerar) com os arquivos em `{job}/11-stills/_direction/`. Os conjuntos coincidem.
  **Falha se:** falta pacote para algum plano, ou existe pacote sem plano.

- [ ] **STL-A-02** · `BLOQUEANTE` — Todos os campos do schema `asset_direction` (§3.2) estão preenchidos.
  **Teste:** por arquivo, conferir presença de: `asset_id`, `destino`, `ferramenta_recomendada`, `prompt`, `prompt_negativo` (ou `n/a` da ferramenta), `parametros`, `tecnica`, `armadilhas_conhecidas`, `criterio_de_aceite`, `quantas_variacoes`, `pos_processamento`, `se_falhar`.
  **Falha se:** falta qualquer campo. O conteúdo de cada campo é avaliado nos itens seguintes.

- [ ] **STL-A-03** · `BLOQUEANTE` — O `prompt` é colável sem edição.
  **Teste:** varrer por `<`, `>`, `{{`, `[inserir`, `TODO`, `XXX`, "adaptar conforme".
  **Falha se:** encontrar qualquer marcador de preenchimento.

- [ ] **STL-A-04** · `BLOQUEANTE` — O `prompt` carrega look e art-spec, não só o conteúdo do plano.
  **Teste:** o prompt reflete os parâmetros fechados em `gate-look` (luz, lente, paleta) e em `gate-design` (cenário, props, wardrobe).
  **Falha se:** o prompt descreve só o assunto ("uma pessoa usando o notebook") e deixa o resto para o modelo decidir.

- [ ] **STL-A-05** · `BLOQUEANTE` — `parametros` traz aspect, resolução-alvo e política de seed.
  **Teste:** os três presentes; a resolução-alvo é ≥ à exigida pelo destino final.
  **Falha se:** falta algum, ou a resolução é a padrão da ferramenta sem conferir o destino.

- [ ] **STL-A-06** · `BLOQUEANTE` — A âncora de consistência está no pacote quando há personagem.
  **Teste:** o pacote referencia a reference sheet aprovada em `gate-character` e o valor da âncora (seed/arquivo).
  **Falha se:** há personagem e o pacote não referencia a âncora.

- [ ] **STL-A-07** · `BLOQUEANTE` — `criterio_de_aceite` é binário e verificável por terceiro.
  **Teste:** cada critério responde sim/não olhando a imagem devolvida.
  **Falha se:** há critério com adjetivo de gosto ("premium", "clean", "impactante") sem tradução em teste observável.

- [ ] **STL-A-08** · `BLOQUEANTE` — `armadilhas_conhecidas` traz ≥ 2 itens específicos do modelo escolhido, com contorno.
  **Teste:** cada armadilha nomeia o defeito e como evitá-lo.
  **Falha se:** são genéricas, sem contorno, ou repetidas em todos os pacotes sem relação com o plano.

- [ ] **STL-A-09** · `BLOQUEANTE` — `se_falhar` muda ferramenta ou abordagem.
  **Teste:** ler o plano B.
  **Falha se:** diz "tentar de novo", "ajustar o prompt" ou "avisar o time".

- [ ] **STL-A-10** · `BLOQUEANTE` — Texto legível **não** é delegado ao gerador de imagem.
  **Teste:** se o plano tem texto legível, o pacote instrui a gerar a base sem texto e compor a tipografia depois.
  **Falha se:** o prompt pede que o modelo escreva a headline.

- [ ] **STL-A-11** · `BLOQUEANTE` — O card humano está completo e aponta a devolução.
  **Teste:** o card segue `templates/human-task-card-tmpl.md` e traz: o que fazer, por quê, insumos anexos, critério de aceite, quantas variações, **onde devolver** e **com que nomenclatura**, e prazo.
  **Falha se:** falta qualquer um — principalmente destino e nomenclatura, sem os quais o retorno se perde.

- [ ] **STL-A-12** · `ATENÇÃO` — `quantas_variacoes` ≥ 2 (≥ 3 em peça de destaque).
  **Teste:** ler o campo.
  **Falha se:** 1, ou faixa aberta.

- [ ] **STL-A-13** · `ATENÇÃO` — Ordem de geração declarada.
  **Teste:** o lote indica qual plano-âncora gerar primeiro.
  **Falha se:** ausente — a coerência entre planos vira sorte.

- [ ] **STL-A-14** · `ATENÇÃO` — Custo estimado do lote dentro do orçamento.
  **Teste:** somar variações × custo estimado por geração; comparar com `job.json.orcamento_creditos`.
  **Falha se:** estoura sem decisão registrada.

### Veredito da Parte A

- **LIBERA CARD** — nenhum `BLOQUEANTE` reprovado → o card vai ao operador humano.
- **RETÉM** — devolve ao `@image-lead`. **O card não sai.** Mandar humano gerar com pacote
  incompleto queima crédito e tempo de pessoa, e é o desperdício mais caro do pipeline.

---

# PARTE B — Qualidade do asset devolvido pelo humano

> Roda quando o operador devolve. Aqui se avalia a imagem **contra o pacote**, não contra
> o gosto de quem revisa.

- [ ] **STL-B-01** · `BLOQUEANTE` — Todo asset esperado foi devolvido.
  **Teste:** cruzar `asset_id` dos pacotes com os arquivos em `{job}/11-stills/entregues/`.
  **Falha se:** falta asset e não há registro de `se_falhar` acionado.

- [ ] **STL-B-02** · `BLOQUEANTE` — Nomenclatura conforme o card.
  **Teste:** conferir os nomes contra o padrão declarado.
  **Falha se:** há arquivo fora do padrão — a montagem não vai encontrar.

- [ ] **STL-B-03** · `BLOQUEANTE` — Cada asset passou em todos os `criterio_de_aceite` do seu pacote.
  **Teste:** marcar sim/não por critério, asset por asset.
  **Falha se:** algum asset foi aceito reprovando um critério, sem waiver registrado.

- [ ] **STL-B-04** · `BLOQUEANTE NON-WAIVABLE` — A rastreabilidade está completa.
  **Teste:** por asset — ferramenta + modelo/versão, **prompt efetivamente usado**, parâmetros (incl. seed), **operador humano nomeado**, data-hora.
  **Falha se:** falta qualquer campo, ou o operador registrado é um agente.
  **Por quê:** sem isto o acerto não é reproduzível e a Regra de Ouro não é auditável.

- [ ] **STL-B-05** · `BLOQUEANTE` — Resolução nativa ≥ resolução de entrega.
  **Teste:** conferir as dimensões do arquivo original.
  **Falha se:** houve ampliação além do nativo sem o upscale previsto em `pos_processamento`.

- [ ] **STL-B-06** · `BLOQUEANTE` — Sem marca d'água, selo ou assinatura da ferramenta.
  **Teste:** inspecionar bordas e cantos.
  **Falha se:** encontrar.

- [ ] **STL-B-07** · `BLOQUEANTE` — Anatomia correta onde há pessoa em destaque.
  **Teste:** contar dedos, conferir simetria de olhos, dentes e orelhas nos assets em que rosto ou mão ocupam mais de 1/4 do quadro.
  **Falha se:** há deformação perceptível em exibição normal.

- [ ] **STL-B-08** · `BLOQUEANTE` — Sem logo, marca ou texto alucinado no cenário.
  **Teste:** varrer o fundo de cada asset.
  **Falha se:** encontrar — é defeito visual e risco de marca de terceiro.

- [ ] **STL-B-09** · `BLOQUEANTE` — Consistência de personagem com a reference sheet.
  **Teste:** comparar cada asset com a folha de referência aprovada.
  **Falha se:** há deriva perceptível de identidade, wardrobe ou idade aparente.

- [ ] **STL-B-10** · `ATENÇÃO` — Variações entregues conforme `quantas_variacoes`.
  **Teste:** contar aprovadas + descartadas registradas por `asset_id`.
  **Falha se:** veio uma só onde o pacote pedia N ≥ 2.

- [ ] **STL-B-11** · `ATENÇÃO` — Descartes registrados com motivo.
  **Teste:** conferir o registro de descarte.
  **Falha se:** ausente — a armadilha do modelo não vira conhecimento do estúdio.

- [ ] **STL-B-12** · `ATENÇÃO` — O pacote foi atualizado quando houve retake.
  **Teste:** `asset_id` com múltiplas rodadas tem registro do que mudou na direção.
  **Falha se:** 3+ tentativas com a mesma direção e o mesmo prompt.

- [ ] **STL-B-13** · `ATENÇÃO` — Asset aprovado promovido a âncora.
  **Teste:** o still que fecha o look/personagem foi arquivado como referência dos próximos.
  **Falha se:** não foi.

### Veredito da Parte B

- **ACEITO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **RETAKE DIRIGIDO** — o `@image-lead` atualiza o pacote com o que falhou e reemite o card.
  Retake sem atualizar a direção é proibido: repete o erro e consome crédito.

---

## Registro

| Campo | Valor |
|:---|:---|
| Planos com still / pacotes escritos | |
| Cards emitidos / devolvidos | |
| Operador(es) humano(s) | |
| Assets aceitos / em retake | |
| Rodadas de retake por asset | |
| Itens reprovados — Parte A (IDs) | |
| Itens reprovados — Parte B (IDs) | |
