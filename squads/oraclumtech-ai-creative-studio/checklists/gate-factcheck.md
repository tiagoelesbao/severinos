# Gate de Estágio — Factcheck (`gate-factcheck`)

> **Estágio:** `factcheck` · **Dono:** `@fact-checker` · **Executor:** `agent`
> **Roda:** depois do `assembly`, antes de liberar `gate` (veredito do `@qa-critic`).
> **Artefato validado:** `{job}/15-gate/factcheck-report.md`
> **Libera:** estágio `gate`
> **Sem fallback.** Conforme `data/pipeline-profiles.yaml`, reprovação aqui devolve a peça
> ao estágio de origem do problema (`script`, `stills`, `takes`, `audio` ou `assembly`).
> **Waiver de estágio é proibido:** as categorias non-waivable não caem por decisão.
> **Não se avalia aqui:** a qualidade criativa da peça — isso é do `gate-qa` e do gate de
> pipeline. Aqui se valida se a **checagem foi feita e concluída**, e qual foi o resultado.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha e a peça não vai a veredito |
| `BLOQUEANTE NON-WAIVABLE` | Não cai por decisão de ninguém — só por correção ou apresentação de fonte/licença |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

## Bloco 1 — O laudo existe e é válido

- [ ] **FC-01** · `BLOQUEANTE` — Existe laudo para **esta** versão da peça.
  **Teste:** `{job}/15-gate/factcheck-report.md` existe e sua data é posterior à do último arquivo alterado em `{job}/14-assembly/master/`.
  **Falha se:** não existe, ou é anterior à última alteração. Laudo velho não vale para peça nova.

- [ ] **FC-02** · `BLOQUEANTE` — O laudo declara o `brand-identity` usado, com versão.
  **Teste:** o cabeçalho traz caminho e `meta.versao` do arquivo consultado.
  **Falha se:** ausente, ou aponta o brand-identity da Oraclum num job de cliente externo.

- [ ] **FC-03** · `BLOQUEANTE` — O laudo lista os artefatos analisados, incluindo os que ficam fora do master.
  **Teste:** constam caption de publicação, título, thumbnail, nome de arquivo e alt text.
  **Falha se:** a checagem parou no roteiro/master — é onde o claim novo se esconde.

- [ ] **FC-04** · `BLOQUEANTE` — O laudo traz veredito explícito.
  **Teste:** `CLEAR`, `CLEAR_CONDICIONADO`, `BLOCKED` ou `BLOCKED_NON_WAIVABLE`.
  **Falha se:** o laudo termina em prosa, sem estado declarado.

---

## Bloco 2 — Cobertura da checagem

- [ ] **FC-05** · `BLOQUEANTE` — Toda afirmação do `claim-ledger` foi rastreada.
  **Teste:** cruzar as entradas de `{job}/05-script/claim-ledger.yaml` com a tabela de rastreio do laudo.
  **Falha se:** há claim do ledger sem linha no laudo.

- [ ] **FC-06** · `BLOQUEANTE` — Claims que surgiram depois do roteiro também foram checados.
  **Teste:** conferir texto em tela, caption e título contra a tabela do laudo.
  **Falha se:** há afirmação na peça que não aparece nem no ledger nem no laudo.

- [ ] **FC-07** · `BLOQUEANTE` — A matriz de direitos foi preenchida asset por asset.
  **Teste:** cada asset do master tem linha com D-IMG, D-VOZ, D-NOM, D-MAR e D-OBR avaliados.
  **Falha se:** há asset sem linha, ou linha com direito em branco.

- [ ] **FC-08** · `BLOQUEANTE` — Disclosure de IA avaliado (AID-1 a AID-5).
  **Teste:** o laudo diz, caso a caso, se é aplicável e se está resolvido.
  **Falha se:** a seção não existe.

- [ ] **FC-09** · `BLOQUEANTE` — O resultado do gate automático de vídeo foi lido e registrado.
  **Teste:** o laudo cita o status de `quality_gate_video` e os `blocking_failures`.
  **Falha se:** ausente numa peça de vídeo que passou pelo gate automático.

- [ ] **FC-10** · `ATENÇÃO` — A varredura manual do ponto cego do V3 foi feita.
  **Teste:** o laudo registra a conferência de números de conteúdo escritos em formato de tempo no `edit_spec` e no `on_screen_text`.
  **Falha se:** não há registro — o V3 remove tokens de timing antes de varrer, e o claim disfarçado passa.

---

## Bloco 3 — Estado dos bloqueios

- [ ] **FC-11** · `BLOQUEANTE NON-WAIVABLE` — Nenhum bloqueio aberto no laudo.
  **Teste:** ler a seção de bloqueios; todos precisam estar fechados por correção, por apresentação de fonte/licença, ou por waiver válido em categoria waivable.
  **Falha se:** há bloqueio aberto. A peça não vai a veredito.

- [ ] **FC-12** · `BLOQUEANTE` — Cada bloqueio emitido tem as quatro partes obrigatórias.
  **Teste:** evidência verbatim (trecho, timecode, arquivo, frame), regra violada com citação da norma, condição de liberação e responsável nomeado.
  **Falha se:** falta alguma parte. Bloqueio sem condição de liberação é inválido.

- [ ] **FC-13** · `BLOQUEANTE NON-WAIVABLE` — Nenhum waiver aplicado a categoria non-waivable.
  **Teste:** conferir a tabela de waivers contra a lista — case fabricado da Oraclum, direito de imagem/voz/nome sem base, marca de terceiro fora de uso nominativo, claim legal/saúde/financeiro sem fonte oficial, disclosure obrigatório ausente.
  **Falha se:** há waiver em qualquer uma delas.

- [ ] **FC-14** · `BLOQUEANTE` — Todo waiver registrado tem autor nomeado e justificativa escrita.
  **Teste:** o autor é o `@studio-chief`; a justificativa é material, não "prazo".
  **Falha se:** waiver anônimo, assinado pelo autor da peça, ou sem justificativa.

- [ ] **FC-15** · `BLOQUEANTE` — Correções alegadas têm evidência.
  **Teste:** para cada bloqueio fechado por correção, existe o artefato novo, o timecode corrigido ou o documento anexado.
  **Falha se:** o fechamento se apoia apenas na afirmação de que foi corrigido.

- [ ] **FC-16** · `ATENÇÃO` — A correção não introduziu claim novo.
  **Teste:** comparar o texto antes e depois; conferir se o número removido não virou superlativo.
  **Falha se:** o laudo não registra essa reconferência.

- [ ] **FC-17** · `ATENÇÃO` — O laudo lista os itens **aprovados**, não só os reprovados.
  **Teste:** existe a seção de aprovados com a fonte de cada um.
  **Falha se:** ausente — laudo sem lista de aprovados não é auditável meses depois.

---

## Registro

| Campo | Valor |
|:---|:---|
| Laudo (caminho + data) | |
| brand-identity (caminho + versão) | |
| Claims rastreados / no ledger | |
| Assets com matriz de direitos | |
| Bloqueios emitidos / abertos | |
| Waivers (categoria + autor) | |
| Veredito do laudo | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — laudo `CLEAR` (ou `CLEAR_CONDICIONADO` com condições cumpridas e evidência)
  e nenhum `BLOQUEANTE` deste checklist reprovado → libera o estágio `gate`.
- **REPROVADO** — devolve ao estágio de origem do problema, nomeado item a item. Não há
  fallback, não há waiver de estágio, e o `@qa-critic` não pode emitir PASS enquanto isso.
