# Gate de Estágio — Research (`gate-research`)

> **Estágio:** `research` · **Dono:** `@research-scout` · **Executor:** `agent` (com worker de ETL)
> **Roda:** ao fim da pesquisa, antes de liberar `concept` (ou `script`, conforme o pipeline).
> **Artefato validado:** `{job}/02-research/reference-dossier.md` + `{job}/02-research/moodboard/`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** se a referência é bonita. Valida-se se o dossiê **explica por que
> a referência funciona** e se ele é utilizável por quem vai criar.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **RS-01** · `BLOQUEANTE` — O dossiê segue o template e tem no mínimo 3 referências analisadas.
  **Teste:** conferir contra `templates/reference-dossier-tmpl.md`; contar as referências com análise completa.
  **Falha se:** menos de 3, ou há referência listada sem análise.

- [ ] **RS-02** · `BLOQUEANTE` — Cada referência tem origem verificável.
  **Teste:** cada item traz link, autor/veículo e data de captura.
  **Falha se:** há referência sem link, ou com link morto no momento do gate.

- [ ] **RS-03** · `BLOQUEANTE` — Cada referência responde **por que funciona**, em mecanismo.
  **Teste:** a análise aponta o dispositivo concreto (estrutura de hook, cadência de corte, dispositivo de retenção, código visual), não o efeito ("é envolvente").
  **Falha se:** a análise é adjetiva. Referência sem mecanismo não é replicável.

- [ ] **RS-04** · `BLOQUEANTE` — Existe a seção "o que NÃO copiar".
  **Teste:** cada referência traz ao menos um item do que não deve ser reproduzido, com motivo (marca de terceiro, claim sem fonte, código fora do brand-lock, direito de imagem).
  **Falha se:** ausente. É a seção que impede o pipeline de importar o problema junto com a solução.

- [ ] **RS-05** · `BLOQUEANTE` — Nenhum asset de terceiro foi incorporado ao job como material de produção.
  **Teste:** os arquivos em `{job}/02-research/` estão marcados como referência, não como insumo; nenhum deles é referenciado por estágio posterior como asset.
  **Falha se:** um frame de benchmark migrou para a pasta de produção.

- [ ] **RS-06** · `BLOQUEANTE` — Handles, nomes e marcas de terceiro estão sinalizados como não-reutilizáveis.
  **Teste:** o dossiê marca explicitamente os identificadores de terceiro presentes nas referências.
  **Falha se:** o dossiê traz `@handle` do criador sem marcação — ele reaparece no roteiro e no nome de arquivo.

- [ ] **RS-07** · `ATENÇÃO` — As referências cobrem o gênero e o canal do job.
  **Teste:** ao menos 2 referências são do mesmo gênero e canal declarados no brief.
  **Falha se:** todas as referências são de outro formato — a analogia vira erro de execução.

- [ ] **RS-08** · `ATENÇÃO` — Moodboard organizado por eixo, não em pilha.
  **Teste:** os arquivos em `moodboard/` estão agrupados por eixo (luz, paleta, enquadramento, tipografia, ritmo).
  **Falha se:** é uma pasta única de imagens soltas.

- [ ] **RS-09** · `ATENÇÃO` — O dossiê aponta o que é replicável **neste** job.
  **Teste:** existe uma seção conectando cada mecanismo à restrição do brand-lock e ao orçamento do job.
  **Falha se:** o dossiê descreve o mundo sem dizer o que serve aqui.

- [ ] **RS-10** · `ATENÇÃO` — Benchmark ETL registrado quando foi executado.
  **Teste:** se houve ETL, o dossiê aponta o diretório de saída e o estado (completo/degradado) de cada pack.
  **Falha se:** o ETL rodou e o resultado não está rastreado.

---

## Registro

| Campo | Valor |
|:---|:---|
| Referências analisadas (qtd) | |
| Mecanismos extraídos | |
| Itens "não copiar" (qtd) | |
| Identificadores de terceiro sinalizados | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@research-scout`.
