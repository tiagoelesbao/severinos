# Gate de Estágio — Audio (`gate-audio`)

> **Estágio:** `audio` · **Dono:** `@sound-designer` · **Executor:** `human` para geração de voz (REGRA DE OURO) + `agent` para direção e mix-spec
> **Roda:** duas vezes. **Parte A** antes do card de voz ir ao humano; **Parte B** quando o áudio volta.
> **Artefatos validados:**
> · Parte A — `{job}/13-audio/_direction/{asset-id}.yaml` + `{job}/_cards/{card-id}.md`
> · Parte B — `{job}/13-audio/entregues/` + `{job}/13-audio/mix-spec.yaml`
> **Libera:** estágio `assembly`
> **Não se avalia aqui:** a mixagem final do master — isso é do `gate-assembly` e do gate
> de pipeline. Aqui se valida a **direção** do som e os **assets de áudio** devolvidos.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o card não sai (Parte A) ou o áudio não é aceito (Parte B) |
| `BLOQUEANTE NON-WAIVABLE` | Nem o `@studio-chief` derruba |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

# PARTE A — Direção de áudio (antes do card)

- [ ] **AU-A-01** · `BLOQUEANTE` — Existe `asset_direction` para cada peça de voz a gerar.
  **Teste:** cruzar os blocos de locução do `script.md` com os arquivos em `{job}/13-audio/_direction/`.
  **Falha se:** há bloco de VO sem pacote.

- [ ] **AU-A-02** · `BLOQUEANTE` — O pacote traz o **texto exato** a ser lido.
  **Teste:** o campo de texto é o roteiro final aprovado no `gate-script`, sem marcação de edição pendente.
  **Falha se:** o texto diverge do roteiro aprovado, ou traz variantes não resolvidas.

- [ ] **AU-A-03** · `BLOQUEANTE` — A direção de interpretação é por bloco, não global.
  **Teste:** cada bloco (abertura, desenvolvimento, virada, fechamento) tem intenção, ritmo e ênfase declarados.
  **Falha se:** há uma única instrução para a peça inteira — produz VO plana.

- [ ] **AU-A-04** · `BLOQUEANTE` — `parametros` traz voz/preset, idioma e velocidade.
  **Teste:** os três presentes com valores concretos.
  **Falha se:** falta algum, ou a voz é descrita por adjetivo ("voz masculina agradável").

- [ ] **AU-A-05** · `BLOQUEANTE` — Pronúncia de termos críticos especificada.
  **Teste:** nomes próprios, marcas, siglas e estrangeirismos têm a pronúncia indicada (fonética ou reescrita).
  **Falha se:** ausente — é o defeito nº 1 de VO sintética, e só aparece depois de gerar.

- [ ] **AU-A-06** · `BLOQUEANTE` — A voz reusa o preset dos episódios/lotes anteriores quando há continuidade.
  **Teste:** comparar com o registro anterior do mesmo personagem/canal.
  **Falha se:** mudou sem justificativa.

- [ ] **AU-A-07** · `BLOQUEANTE NON-WAIVABLE` — A voz não é clone de pessoa real sem base documentada.
  **Teste:** o pacote declara a origem da voz — biblioteca licenciada (com cláusula de uso comercial **e** de IA) ou titular com autorização.
  **Falha se:** é imitação reconhecível de locutor/celebridade, ou a licença não cobre IA.
  **Por quê:** gatilho D-VOZ do `@fact-checker`, non-waivable.

- [ ] **AU-A-08** · `BLOQUEANTE` — `criterio_de_aceite` cobre inteligibilidade e pronúncia.
  **Teste:** os critérios incluem "toda palavra compreensível sem legenda" e "termos críticos pronunciados conforme a lista".
  **Falha se:** os critérios só falam de "tom" e "energia".

- [ ] **AU-A-09** · `BLOQUEANTE` — O card humano está completo e aponta a devolução.
  **Teste:** segue `templates/human-task-card-tmpl.md`, com **onde devolver**, **nomenclatura** e prazo.
  **Falha se:** falta qualquer um.

- [ ] **AU-A-10** · `BLOQUEANTE` — SFX e trilha estão especificados com âncora.
  **Teste:** cada SFX tem momento (timecode ou beat), categoria, intenção e intensidade; a trilha tem mood, energia e política de ducking.
  **Falha se:** há SFX sem âncora, ou a trilha é "algo animado".

- [ ] **AU-A-11** · `ATENÇÃO` — A origem de cada trilha/SFX está declarada com licença.
  **Teste:** biblioteca, faixa e escopo de uso.
  **Falha se:** ausente — o `gate-factcheck` vai barrar (D-OBR).

- [ ] **AU-A-12** · `ATENÇÃO` — `quantas_variacoes` ≥ 2 para a locução principal.
  **Teste:** ler o campo.
  **Falha se:** 1 — não há escolha de interpretação.

### Veredito da Parte A

- **LIBERA CARD** — nenhum `BLOQUEANTE` reprovado.
- **RETÉM** — devolve ao `@sound-designer`. O card não sai.

---

# PARTE B — Áudio devolvido e mix-spec

- [ ] **AU-B-01** · `BLOQUEANTE` — Todos os arquivos de voz esperados foram devolvidos, na nomenclatura do card.
  **Teste:** cruzar `asset_id` com `{job}/13-audio/entregues/`.
  **Falha se:** falta arquivo, ou o nome está fora do padrão.

- [ ] **AU-B-02** · `BLOQUEANTE` — Toda palavra é compreensível sem legenda.
  **Teste:** ouvir em fone e em alto-falante de celular.
  **Falha se:** alguma palavra exige repetição.

- [ ] **AU-B-03** · `BLOQUEANTE` — Pronúncia correta em todos os termos críticos.
  **Teste:** conferir a lista do pacote, um a um.
  **Falha se:** há qualquer erro.

- [ ] **AU-B-04** · `BLOQUEANTE` — Sem artefato de síntese audível.
  **Teste:** ouvir procurando corte metálico entre frases, respiração artificial repetida, sílaba engolida, salto de timbre.
  **Falha se:** há artefato perceptível em exibição normal.

- [ ] **AU-B-05** · `BLOQUEANTE NON-WAIVABLE` — Rastreabilidade completa.
  **Teste:** ferramenta + modelo/versão, voz/preset, texto usado, parâmetros, **operador humano nomeado**, data-hora.
  **Falha se:** falta qualquer campo, ou o operador é um agente.

- [ ] **AU-B-06** · `BLOQUEANTE` — O áudio corresponde ao texto aprovado.
  **Teste:** transcrever e comparar com o roteiro.
  **Falha se:** há divergência não registrada — vira claim fora do ledger e o `factcheck` barra.

- [ ] **AU-B-07** · `BLOQUEANTE` — Existe `mix-spec.yaml` executável no Premiere.
  **Teste:** o arquivo traz níveis-alvo por camada (VO, trilha, SFX, ambiência), regra de ducking (limiar e atenuação), e alvo de loudness/pico da entrega.
  **Falha se:** ausente, ou descreve intenção sem valores.

- [ ] **AU-B-08** · `BLOQUEANTE` — Arquivos sem clipping e em formato de trabalho adequado.
  **Teste:** conferir pico e formato (WAV/AIFF em 48 kHz para o master; MP3 só como referência).
  **Falha se:** há clipping, ou a VO chegou apenas em formato comprimido de baixa taxa.

- [ ] **AU-B-09** · `ATENÇÃO` — Trilha e SFX licenciados, com comprovante anexado.
  **Teste:** conferir escopo (canal, território, prazo, uso comercial); para peça de mídia paga, a licença precisa cobrir anúncio.
  **Falha se:** falta comprovante nominal.

- [ ] **AU-B-10** · `ATENÇÃO` — Variações de interpretação entregues e a escolhida registrada com motivo.
  **Teste:** contar arquivos por bloco; conferir o registro de escolha.
  **Falha se:** veio uma só, ou não há motivo da escolha.

- [ ] **AU-B-11** · `ATENÇÃO` — Duração da locução compatível com a decupagem.
  **Teste:** comparar a duração do VO por bloco com a soma das durações dos planos correspondentes.
  **Falha se:** o desvio passa de 15% — a montagem vai ter que esticar ou cortar plano.

### Veredito da Parte B

- **ACEITO** — nenhum `BLOQUEANTE` reprovado → libera `assembly`.
- **RETAKE DIRIGIDO** — o `@sound-designer` atualiza o pacote (pronúncia, intenção, preset)
  e reemite o card. Regravar com a mesma direção repete o mesmo erro.

---

## Registro

| Campo | Valor |
|:---|:---|
| Blocos de VO / pacotes escritos | |
| Voz/preset usado | |
| Operador humano | |
| Termos críticos conferidos | |
| Trilha/SFX com licença | |
| Itens reprovados — A (IDs) | |
| Itens reprovados — B (IDs) | |
