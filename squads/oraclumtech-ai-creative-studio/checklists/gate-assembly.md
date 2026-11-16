# Gate de Estágio — Assembly (`gate-assembly`)

> **Estágio:** `assembly` · **Dono:** `@editor` · **Executor:** `agent` (spec) + `human`/`worker` (montagem)
> **Roda:** ao fim da montagem, antes de liberar `factcheck`.
> **Artefatos validados:** `{job}/14-assembly/assembly-spec.yaml` + `{job}/14-assembly/master/`
> **Libera:** estágio `factcheck`
> **Cadeia canônica (§3.3 do blueprint / `_CONVENTIONS.md` §5):** `apps/video-studio`
> (timeline auto-montada, autolegenda, FX on-brand) → **After Effects** (motion, composição,
> VFX, lower-third) → **Premiere Pro** (corte final, mix, master, export).
> **Não se avalia aqui:** codec, bitrate e safe area do arquivo entregue — isso é do
> `gate-delivery` e do `gate-transversal-entrega`. Aqui se valida se a **especificação é
> executável** e se a **montagem corresponde à decupagem**.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

## Bloco 1 — Especificação de montagem (o entregável do `@editor`)

- [ ] **AS-01** · `BLOQUEANTE` — A spec existe e é parseável.
  **Teste:** `assembly-spec.yaml` carrega sem erro e tem as seções `studio`, `after_effects`, `premiere` e `export`.
  **Falha se:** o arquivo não existe, não carrega, ou falta seção.

- [ ] **AS-02** · `BLOQUEANTE` — A ordem de cortes tem timecode e motivo.
  **Teste:** cada corte traz `t_in`, `t_out` (ou duração) e uma frase dizendo por que corta ali.
  **Falha se:** há corte sem timecode, ou a spec descreve intenção ("montagem dinâmica no meio") sem ponto de aplicação.

- [ ] **AS-03** · `BLOQUEANTE` — A seção `studio` declara o que o app próprio **já resolveu** e não deve ser refeito.
  **Teste:** a seção lista explicitamente o que veio pronto (timeline base a partir do `video-brief`, autolegenda, FX on-brand, presets do registry) e o que é trabalho de AE/Premiere.
  **Falha se:** a seção não existe.
  **Por quê:** sem ela o operador refaz a legenda à mão e perde a sincronia que o app já tinha acertado — retrabalho puro.

- [ ] **AS-04** · `BLOQUEANTE` — Cada composição de After Effects está especificada com parâmetros.
  **Teste:** por composição — nome, duração, o que anima, valores de animação (in/out, easing, escala/posição/opacidade) e em que ponto da timeline entra.
  **Falha se:** há composição citada sem parâmetro, ou a spec diz apenas "animar o logo".
  **N/A quando:** a peça não usa AE — e a spec precisa **declarar** isso, não omitir.

- [ ] **AS-05** · `BLOQUEANTE` — Lower-third, legendas e motion graphics têm spec no padrão da marca.
  **Teste:** por elemento recorrente — tipografia (família, peso, corpo), cor (hex do `brand-config`), posição, tempo em tela e animação. Os cinco campos.
  **Falha se:** falta qualquer um dos cinco em qualquer elemento recorrente.

- [ ] **AS-06** · `BLOQUEANTE` — A seção `premiere` define a organização do projeto.
  **Teste:** mapa de bins (ex.: `01_FOOTAGE`, `02_AUDIO`, `03_GFX`, `04_SEQ`), regra de nomenclatura dos itens e nome da sequência master.
  **Falha se:** ausente. Projeto sem bins é projeto que ninguém reabre.

- [ ] **AS-07** · `BLOQUEANTE` — A spec aponta o `mix-spec.yaml` do `gate-audio` para a mixagem.
  **Teste:** a seção `premiere` referencia o arquivo e não redefine níveis por conta própria.
  **Falha se:** a spec inventa níveis diferentes dos aprovados no estágio de áudio.

- [ ] **AS-08** · `BLOQUEANTE` — Presets de export declarados por destino, **antes** do export.
  **Teste:** para cada destino de `job.json`, a seção `export` traz formato, codec, bitrate, resolução, fps e safe area.
  **Falha se:** falta destino, ou o preset é "exportar em alta qualidade".

- [ ] **AS-09** · `ATENÇÃO` — A spec declara o que fazer se um asset faltar.
  **Teste:** existe regra de contingência (plano substituto, reordenação, encurtamento).
  **Falha se:** ausente — a montagem para no primeiro buraco.

---

## Bloco 2 — Montagem executada (o master)

- [ ] **AS-10** · `BLOQUEANTE` — Existe um único master identificado.
  **Teste:** `{job}/14-assembly/master/` tem um arquivo apontado como master na spec.
  **Falha se:** há vários candidatos sem hierarquia declarada, ou nenhum.

- [ ] **AS-11** · `BLOQUEANTE` — A ordem da montagem corresponde à decupagem.
  **Teste:** comparar a sequência de planos do master com `storyboard.yaml`.
  **Falha se:** há plano fora de ordem, ausente ou extra sem registro de mudança de decisão.

- [ ] **AS-12** · `BLOQUEANTE` — Nenhum plano ausente ou substituído por placeholder.
  **Teste:** varrer a timeline por gap, slug, tela preta não intencional ou asset de rascunho.
  **Falha se:** encontrar qualquer um.

- [ ] **AS-13** · `BLOQUEANTE` — Cortes limpos.
  **Teste:** revisar cada ponto de corte: frame duplicado, flash de frame preto, corte no meio de sílaba, salto de posição.
  **Falha se:** existe qualquer um desses defeitos.

- [ ] **AS-14** · `BLOQUEANTE` — Legenda sincronizada com o áudio final.
  **Teste:** em 5 pontos distribuídos, o cue entra no máximo 200 ms antes e sai no máximo 300 ms depois da fala.
  **Falha se:** algum ponto estoura a tolerância.

- [ ] **AS-15** · `BLOQUEANTE` — Legenda derivada da transcrição do áudio final, não do roteiro.
  **Teste:** conferir 3 trechos em que a locução divergiu do roteiro.
  **Falha se:** a legenda repete o roteiro onde a fala mudou.

- [ ] **AS-16** · `BLOQUEANTE` — Nenhum asset com velocidade extrema para preencher tempo.
  **Teste:** conferir o `playbackRate` dos inserts.
  **Falha se:** há asset abaixo de 0,5× ou acima de 1,8× — sinal de material insuficiente mascarado na montagem.

- [ ] **AS-17** · `BLOQUEANTE` — O master saiu do Premiere quando a spec previa a cadeia completa.
  **Teste:** a rastreabilidade do master aponta a etapa de origem.
  **Falha se:** o master é o render direto do app próprio numa peça cuja spec previa AE/Premiere, sem justificativa registrada.

- [ ] **AS-18** · `ATENÇÃO` — Duração do master dentro da meta do brief.
  **Teste:** comparar com a duração-alvo.
  **Falha se:** desvio acima de 15% sem registro.

- [ ] **AS-19** · `ATENÇÃO` — Projetos-fonte salvos no job.
  **Teste:** projeto do Premiere, projetos de AE e o estado do `video-studio` presentes em `{job}/14-assembly/`.
  **Falha se:** faltam — o `gate-delivery` vai barrar no arquivamento.

- [ ] **AS-20** · `ATENÇÃO` — Determinismo do que veio do app.
  **Teste:** a mesma entrada (`video-brief` + assets) reproduz a mesma timeline base.
  **Falha se:** a timeline foi editada à mão a ponto de não ser mais reproduzível, sem registro do que mudou.

---

## Registro

| Campo | Valor |
|:---|:---|
| Master (arquivo + origem na cadeia) | |
| Planos na spec / na montagem | |
| Composições de AE (qtd) | |
| Destinos com preset declarado | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera `factcheck`.
- **REPROVADO** — devolve ao `@editor` (spec ou montagem), ou ao estágio de origem do asset
  faltante, conforme o item que falhou.
