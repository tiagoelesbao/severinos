# Gate de Estágio — Decupagem (`gate-decupagem`)

> **Estágio:** `decupagem` · **Dono:** `@film-director` · **Executor:** `agent`
> **Roda:** ao fim da decupagem, antes de liberar `look`/`design`.
> **Artefato validado:** `{job}/06-decupagem/storyboard.yaml` + `{job}/06-decupagem/edit-spec.yaml` + `{job}/06-decupagem/shotlist.yaml`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** o ritmo do vídeo montado — isso é do gate de pipeline. Aqui se
> valida se o storyboard é **parseável e executável**: um plano = um asset gerável.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **DC-01** · `BLOQUEANTE` — O storyboard é parseável no schema do template.
  **Teste:** validar `storyboard.yaml` contra `templates/storyboard-tmpl.yaml`; todo plano tem `plano_id`, `beat_n`, `duration_s`, `shot_type`, `scene`, `on_screen_text` (ou `null` explícito) e `motion`.
  **Falha se:** o arquivo não carrega, ou há plano com campo obrigatório ausente.

- [ ] **DC-02** · `BLOQUEANTE` — Cada plano corresponde a exatamente um asset a gerar (ou a um asset existente declarado).
  **Teste:** para cada plano, o campo `asset_id` aponta um asset a gerar, ou marca `reuso`/`captura_real`.
  **Falha se:** há plano ambíguo — o estágio `stills` não saberá quantos pacotes escrever.

- [ ] **DC-03** · `BLOQUEANTE` — A soma das durações bate com a duração-alvo.
  **Teste:** somar `duration_s`; comparar com a duração-alvo do brief.
  **Falha se:** o desvio passa de 10% sem decisão registrada.

- [ ] **DC-04** · `BLOQUEANTE` — Toda fala do roteiro está alocada a um plano.
  **Teste:** cruzar o texto do `script.md` com os planos; nenhuma frase fica sem plano.
  **Falha se:** sobra fala sem imagem, ou sobra plano sem função.

- [ ] **DC-05** · `BLOQUEANTE` — A shotlist está completa.
  **Teste:** todo item tem `plano`, `framing`, `falas_chave`, `audio` e `executor` (human/worker/agent).
  **Falha se:** há item sem o que gravar/gerar ou sem fala-chave — é a reprovação V6 do gate automático, antecipada.

- [ ] **DC-06** · `BLOQUEANTE` — O `edit-spec` é executável, não literário.
  **Teste:** transições, zooms, inserts e motion graphics trazem timecode ou âncora ("ao dizer X").
  **Falha se:** há instrução sem ponto de aplicação.

- [ ] **DC-07** · `BLOQUEANTE` — Nenhum plano depende de asset impossível no orçamento.
  **Teste:** o `@exec-producer` confirmou que o número de assets e a complexidade cabem no teto de créditos.
  **Falha se:** não houve conferência, ou estourou sem decisão.

- [ ] **DC-08** · `ATENÇÃO` — Cadência dentro da faixa do gênero.
  **Teste:** calcular a duração média de plano e comparar com o checkpoint do gênero (short-form: ~1,5–2 s; brand film: conforme decupagem).
  **Falha se:** a média está fora da faixa sem partido declarado.

- [ ] **DC-09** · `ATENÇÃO` — Variação de escala de plano.
  **Teste:** listar `shot_type` de todos os planos.
  **Falha se:** a peça inteira vive numa única escala sem partido declarado.

- [ ] **DC-10** · `ATENÇÃO` — Planos de reação/respiro previstos onde a história pede.
  **Teste:** em peças com piada ou virada, existe plano de reação ou beat de silêncio marcado.
  **Falha se:** ausente.

- [ ] **DC-11** · `ATENÇÃO` — `template_refs` resolvidos.
  **Teste:** os presets citados (hook, caption, transição, motion) existem no registry de templates do cliente.
  **Falha se:** há preset órfão — vira improviso na montagem.

---

## Registro

| Campo | Valor |
|:---|:---|
| Planos (qtd) / assets a gerar (qtd) | |
| Duração somada vs. alvo | |
| Duração média de plano | |
| Presets referenciados / resolvidos | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@film-director`. Storyboard não-parseável trava os estágios
  `stills` e `takes`, que dependem dele para contar quantos pacotes escrever.
