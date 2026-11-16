---
task_name: factcheck
status: ready
responsible_executor: fact-checker
execution_type: agent
tipo: estagio
stage_id: factcheck
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-015
blocking: true
waiver_allowed: false
waiver_ref: 'ADR-003 — terminal e bloqueante, sem waiver de estágio'
pipelines: [P1, P2, P3, P4, P5, P6]
input: |
  - {job}/14-assembly/master/ — a peça montada (ou 11-stills/finalizadas/ em P6)
  - {job}/05-script/claim-ledger.json — o razão de claims, criado no estágio script (ADR-003)
  - {job}/01-brief/brand-lock.yaml — léxico proibido e restrições, com versão
  - {job}/02-research/fontes.json (P5) · {job}/09-character/_riscos-de-identidade.md
  - artefatos fora do master: caption, título, thumbnail, nome de arquivo, alt text
output: |
  - {job}/15-gate/factcheck-report.md   o laudo, com veredito explícito
gate: checklists/gate-factcheck.md
failure_modes: |
  - Checagem que para no roteiro e ignora caption, título e thumb
  - Laudo anterior à última alteração do master
  - Claim sem entrada no claim-ledger passando por não estar na lista
  - Tentativa de waiver em item non-waivable
  - Case fabricado entrando como "exemplo ilustrativo"
  - Confundir este estágio com julgamento de qualidade criativa
acceptance_criteria: |
  - O laudo é posterior ao último arquivo alterado no master
  - O laudo declara o brand-identity usado, com versão
  - Todos os artefatos foram analisados, inclusive os de fora do master
  - Veredito explícito, e nenhum item non-waivable derrubado por decisão
---

# factcheck — Checagem, compliance e direitos

> **Terminal e BLOQUEANTE. Sem waiver de estágio (ADR-003).**
> As categorias non-waivable não caem por decisão de ninguém — só por correção ou por
> apresentação de fonte ou licença. Nem o `studio-chief` derruba.

O `fact-checker` opera em modelo de ombudsman jornalístico. Não avalia se a peça é boa —
isso é do `gate`. Avalia se ela é **defensável**.

## Comando

```text
@fact-checker
*check {job-id}
*ledger {job-id}      # confronta a peça com o claim-ledger
*rights {job-id}      # só a frente de direitos de terceiro
```

## O claim-ledger vem do script

`{job}/05-script/claim-ledger.json` é criado no estágio `script` (ADR-003) e é o objeto
de auditoria deste estágio. Cada afirmação da peça precisa de uma entrada, e cada entrada
precisa de uma âncora: transcrição do benchmark, fonte primária em `fontes.json`, ou
documento do cliente.

**Mas o razão não é o limite da checagem.** Claim que aparece na peça e **não** está no
ledger é achado grave: significa que uma afirmação entrou depois do roteiro, sem
auditoria. É o caminho mais comum de erro no squad.

## Onde o claim novo se esconde

A checagem que para no master falha. Os artefatos que entram depois — e que ninguém
auditou — são:

- caption de publicação
- título
- thumbnail (texto composto na arte)
- nome de arquivo e alt text
- descrição e hashtags do publishing-kit

Todos entram no laudo (`FC-03`).

## As quatro frentes

| Frente | O que se checa | Modo de falha típico |
|---|---|---|
| **Fidelidade factual** | Número, data, citação, atribuição | Número que "arredondou" e virou outro |
| **Compliance de marca** | Léxico proibido do `brand-lock`, arquétipo, tabus | Palavra proibida na caption, não no roteiro |
| **Direitos de terceiro** | Rosto, voz, música, marca, obra reconhecível | Trilha "livre" que não é |
| **Sem case fabricado** | A regra do `_BLUEPRINT.md` §1 | Exemplo hipotético lido como case real |

### Sem case fabricado

A Oraclum **não tem case de cliente**. Nenhuma peça inventa depoimento, número ou
resultado de cliente. A prova é o sistema rodando. Este item é `NON-WAIVABLE`, e a
armadilha é o exemplo "meramente ilustrativo" que o espectador lê como case.

## O worker cobre o determinístico, o agente cobre o resto

`python squads/virals-marketing-squad/scripts/quality_gate_video.py {job}/05-script/video-brief.yaml`

Deste script vêm os checks **bloqueantes**: **V3** (números fabricados), **V4**
(atribuição ou evidência inventada), **V5** (léxico proibido), **V7** (CTA proibido).
Exit 2 = FAIL. V1, V2 e V6 **não** são deste estágio — pertencem ao `gate`.

O que o script **não** detecta, e o agente revisa sempre: direitos de terceiro,
semelhança com pessoa real, case fabricado, e claim escrito dentro da arte.

Em **P6** o script não se aplica (valida plano de vídeo). A revisão é integralmente do
agente.

## Action Items

1. **Verificar a versão.** O laudo precisa ser posterior ao último arquivo alterado em
   `14-assembly/master/`. Laudo velho não vale para peça nova (`FC-01`).
2. **Declarar o `brand-identity` usado, com versão** (`FC-02`). Cuidado: em job de cliente
   externo, o brand-lock é o do CLIENTE, não o da Oraclum.
3. **Listar todos os artefatos analisados**, incluindo os de fora do master (`FC-03`).
4. **Rodar o worker_assist** quando aplicável e registrar V3, V4, V5 e V7.
5. **Confrontar a peça com o `claim-ledger.json`** — nos dois sentidos: entrada sem
   correspondência na peça, e afirmação na peça sem entrada no razão.
6. **Rodar as quatro frentes** manualmente sobre o que o script não cobre.
7. **Escrever o laudo** com veredito explícito e, para cada achado, o estágio de origem
   do problema (`script`, `stills`, `takes`, `audio` ou `assembly`).
8. **Rodar `checklists/gate-factcheck.md`.** Item non-waivable reprovado → a peça não vai
   a veredito. Ponto.

## Variações por pipeline

| Pipeline | O risco dominante |
|---|---|
| **P1 brand-film** | Claim de produto que o script não prova e direitos de música e de imagem. A peça-vitrine circula muito e é a mais exposta. |
| **P2 ugc-ads** | O maior risco de compliance do catálogo, porque **parece depoimento**. Política de plataforma (saúde, finanças, antes-e-depois, atributo pessoal), depoimento sintético apresentado como real, direito de imagem e de voz do creator, semelhança com pessoa pública, e a marcação de conteúdo gerado por IA. Reprovar aqui é risco de conta bloqueada, não de gosto. |
| **P3 nicho-series** | O risco não é número inventado: é **pessoa ou marca real identificável na sátira sem autorização**. Isso é jurídico e não sai por regex — revisão do agente, sempre. |
| **P4 oraclum-institucional** | O gate mais importante do pipeline é **sem case fabricado** — a regra que define a credibilidade da Oraclum. Somam-se: limitação de ferramenta não omitida, e nada de "IA como mágica". |
| **P5 dark-room** | O formato é denso em número e citação: V3 e V4 são os mais acionados. Toda afirmação rastreável a `02-research/fontes.json`. E o **par título-thumb** é objeto de checagem: clickbait que o conteúdo não sustenta derruba o canal por retenção antes de derrubar por denúncia. |
| **P6 image-lab** | Sem worker. Direito de terceiro (rosto, marca, trade dress, obra reconhecível) e **claim escrito na arte** — "nº 1 do Brasil", número sem fonte. Ambos bloqueiam. Candidato a worker: OCR do texto composto cruzado com o ledger e o léxico proibido. |

## Gate

`checklists/gate-factcheck.md` — com itens `BLOQUEANTE NON-WAIVABLE`.

- [ ] Laudo posterior ao último arquivo do master
- [ ] `brand-identity` declarado com versão, e é o do cliente certo
- [ ] Caption, título, thumb, nome de arquivo e alt text analisados
- [ ] Claim-ledger confrontado nos dois sentidos
- [ ] Veredito explícito, com estágio de origem por achado
- [ ] Nenhum item non-waivable derrubado por decisão

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Checagem para no roteiro | O claim novo mora na caption e no título. Analisar tudo o que publica junto. |
| Laudo velho reaproveitado | Comparar datas. Peça alterada exige laudo novo. |
| Claim fora do ledger ignorado | É o achado mais grave: afirmação que entrou sem auditoria. Registrar e devolver ao `script`. |
| Pedido de waiver | Recusar e citar ADR-003. Non-waivable não é negociável — sai por correção ou por fonte. |
| Case fabricado como "ilustrativo" | Se o espectador pode ler como case real, é case fabricado. Cortar. |
| Confundir com qualidade criativa | Este estágio julga se a peça é **defensável**, não se é boa. O julgamento criativo é do `gate`. |
| Brand-identity errado | Em job de cliente externo, usar o da Oraclum invalida o laudo inteiro. |

## Handoff

`{job}/15-gate/factcheck-report.md` → **gate**.
Reprovado → devolve ao estágio de origem do problema, nomeado no laudo.
