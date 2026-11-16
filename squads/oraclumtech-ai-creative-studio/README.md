# 🎬 Oraclum Tech · AI Creative Studio

Estúdio de criação audiovisual e de imagem com IA da **Oraclum Tech** — a vertical
criativa da agência IA-first de aquisição e conversão.

Um pedido entra por um lugar só, é classificado em um **gênero**, e o gênero decide o
resto: quais estágios rodam, quem é convocado, o que cada etapa entrega e onde o
processo **para para um humano trabalhar**.

> **Princípio central:** o gênero define o pipeline; o pipeline define o elenco.
>
> **Regra de ouro:** o squad **não gera** a imagem nem o vídeo — o squad **dirige** a
> geração. Quem gera é uma pessoa, com feeling, iterando. O que os agentes entregam é o
> **Pacote de Direção**: ferramenta certa, prompt pronto, parâmetro exato, armadilha
> antecipada e critério de aceite. Ver [ADR-001](ARCHITECTURE.md#adr-001).

---

## Atende três tipos de cliente

| Cliente | O que produz | Gêneros típicos |
|---|---|---|
| **Interno Oraclum** | Institucional, prova de método, build-in-public | `oraclum-institucional`, `image-lab` |
| **Perfis próprios de farming** | Páginas de nicho para crescimento e captação | `nicho-series`, `dark-room`, `ugc-ads` |
| **Clientes externos** | Campanha, UGC, ads e imagem | `brand-film`, `ugc-ads`, `image-lab` |

Para peça da própria Oraclum, a marca-guia é o `brand-identity.yaml` da Oraclum.
Para cliente externo, a marca-guia é o brand-identity **do cliente** — carregado pelo
`brief-strategist` no estágio `brief` e congelado como snapshot no job.

---

## Os 6 pipelines

| # | Gênero | Para que serve | KPI primário | Estágios |
|---|---|---|---|---|
| **P1** | `brand-film` | Campanha e comercial de produto. A peça-vitrine. | View-through + brand lift | 15 |
| **P2** | `ugc-ads` | UGC/creator AI para conversão em mídia paga. Alto volume, ciclo curto. | CPA / ROAS | 12 |
| **P3** | `nicho-series` | Sketch, sátira e microdrama de bolha. O ativo é o personagem. | Retenção + seguidores/ep | 16 |
| **P4** | `oraclum-institucional` | Institucional dor→solução da própria Oraclum. | Reuniões agendadas | 13 |
| **P5** | `dark-room` | Canal sem rosto: VO + b-roll + motion. | Retenção / watch time | 10 |
| **P6** | `image-lab` | Imagem pura: thumb, key art, packshot, capa, carrossel. | CTR do asset | 9 |

**P6 é transversal:** qualquer pipeline pode chamá-lo como sub-rotina (a capa do episódio
do P3, a thumbnail do P5) sem abrir job novo.

Passo a passo operacional de cada um, com os pontos de parada humana:
**[`docs/PIPELINES.md`](docs/PIPELINES.md)**.

Além dos 6 do MVP, há **11 gêneros catalogados no backlog** (`data/genre-catalog.yaml`),
cada um declarado como **diff** de um pipeline existente — implementar é editar um perfil,
não desenhar um projeto novo.

---

## O elenco — 17 agentes em 5 tiers

### Tier 0 · Comando

| Agente | Persona | Mind reference | Escopo |
|---|---|---|---|
| `@studio-chief` 👑 | Chief Creative Officer | David Droga | Porta de entrada. Intake, roteamento por gênero, convocação, arbitragem e **poder de veto**. Nunca executa peça. |
| `@exec-producer` | Produtor Executivo & Line Producer | Kathleen Kennedy | Dono do job: cronograma, orçamento, alocação humano×worker×agente, **emissão dos cards humanos**, fan-in dos handoffs. |

### Tier 1 · Planejamento

| Agente | Persona | Mind reference | Escopo |
|---|---|---|---|
| `@brief-strategist` | Account Planning | Jon Steel | Pedido bruto → brief formal. **Classifica o gênero** e carrega a identidade do cliente. |
| `@research-scout` | Pesquisa & Benchmark | — | Referência, moodboard, dossiê e **o que NÃO copiar**. Roda o benchmark ETL. |
| `@creative-director` | Diretor de Criação | Washington Olivetto | Big idea e território. Aprova ou **mata** rota antes de qualquer produção. |
| `@head-of-copy` | Redator-chefe & Roteirista | — (ref. `@ladeira`, `@georgi`) | Script, VSL, sketch, copy de ad, CTA. Dono da voz. |
| `@showrunner` | Showrunner & Story Architect | Dan Harmon | **Só P3.** Bíblia de personagem, arco, continuidade, gancho. |

### Tier 2 · Direção

| Agente | Persona | Mind reference | Escopo |
|---|---|---|---|
| `@film-director` | Diretor | Ridley Scott | Decupagem, storyboard, blocking, ritmo, `edit_spec`. |
| `@dop` | Diretor de Fotografia | Roger Deakins | Lente, luz, paleta, grade — traduzido para **prompt** E para **instrução de set**. |
| `@art-director` | Direção de Arte & Production Design | Nathan Crowley | Cenário, props, wardrobe, tipografia. Guardião do `brand-config`. |

### Tier 3 · Execução

| Agente | Persona | Mind reference | Escopo |
|---|---|---|---|
| `@image-lead` | Diretor de Imagem Generativa | — (ref. `@casey-neistat-img`) | **Não gera a imagem.** Entrega o Pacote de Direção, avalia o retorno e dirige o retake. |
| `@motion-lead` | Diretor de Motion & I2V | — (ref. `@sam-kolder-vid`) | **Não gera o vídeo.** Pacote de Direção por take + composições de AE. |
| `@character-lead` | Character Design & Casting | — | Reference sheets, consistência entre takes e episódios, creator sintético. |
| `@editor` | Editor & Finalização | Walter Murch | Decisão de corte e ritmo. Entrega **especificação executável** para AE e Premiere. |
| `@sound-designer` | Sound Design, Trilha & Voz | Ben Burtt | SFX, trilha, ducking, casting de voz. Dirige a gravação; o humano grava. |

### Tier 4 · Qualidade

| Agente | Persona | Mind reference | Escopo |
|---|---|---|---|
| `@fact-checker` | Checagem, Compliance & Direitos | Ombudsman jornalístico | **Poder de bloqueio.** Fidelidade, léxico proibido, direitos de terceiro, "sem case fabricado". |
| `@qa-critic` | Crítico de Peça & Quality Gate | — | Checklist do gênero. PASS / CONCERNS / FAIL / WAIVED. Escreve o que falta, não opinião. |

Ativação: `@studio-chief` ou `/oraclumStudio:agents:studio-chief`.
Comandos usam prefixo `*`. Todo agente tem `*help` e `*guide`.

---

## Quick start

```text
@studio-chief
```

```text
*intake                          # abre um job a partir de um pedido
*genero brand-film               # consulta o catálogo e o pipeline do gênero
*status {job-id}                 # onde o job está e o que trava
*cards {job-id}                  # cards humanos abertos, aguardando devolução
*veto {job-id} {motivo}          # mata a rota antes de queimar produção
```

Exemplos de pedido, na linguagem real de quem pede:

```text
@studio-chief
"Comercial de 45s para o lançamento do sérum da {marca}, foco em sensorialidade,
 entrega em 16:9 e 9:16, prazo 10 dias."
→ classificado como P1 brand-film

@studio-chief
"Preciso de 6 variações de UGC para testar na conta de Meta do {cliente},
 mesma oferta, hooks diferentes."
→ classificado como P2 ugc-ads

@studio-chief
"Episódio 4 da série do analista de dados sofrendo com reunião."
→ classificado como P3 nicho-series (bíblia existente)

@studio-chief
"Thumbnail do vídeo sobre automação de CRM."
→ classificado como P6 image-lab
```

---

## Como o trabalho realmente acontece

O estúdio alterna entre três tipos de executor. O que muda de squad para squad é
**onde** cada um entra:

| Executor | Onde entra aqui |
|---|---|
| **agente** | Brief, conceito, roteiro, direção, Pacote de Direção, drift-check, gates |
| **humano** | ⏸ Aprovação de rota · **toda geração de still e take** · VO · montagem em AE/Premiere |
| **worker** | Benchmark ETL, autolegenda por palavra, composição on-brand, empacotamento |

Quando um estágio é humano, o pipeline **para** e emite um card com tudo pronto:
ferramenta, prompt para colar, parâmetros, quantas variações, critério de aceite, onde
devolver o arquivo e o plano B. Depois que você devolve, o agente avalia contra o
critério e, se precisar, dirige o retake dizendo **o que mudar no prompt** — não
"tente de novo".

**Nada é simulado.** Um estágio só é dado como concluído quando o arquivo existe em disco.

---

## Cadeia de finalização

```
apps/video-studio (Remotion)  →  After Effects  →  Premiere Pro
   autolegenda, timeline,          motion, comp,      corte final,
   FX on-brand · worker            VFX, lower-third   mix, master · humano
```

```bash
npm run studio            # abre o Remotion studio
npm run render [slug]     # renderiza a timeline auto-montada
```

Para imagem e carrossel, o app equivalente é **`apps/creative-design`**.

O `editor` **não renderiza** — entrega `ae-comp-spec.md` e `premiere-cut-spec.md`, com
parâmetros numéricos, timecodes, bins, presets de export por canal e o campo
`ja_resolvido_pelo_app` (o que o app já fez e não deve ser refeito na mão).
DaVinci Resolve está **fora** do fluxo ([ADR-002](ARCHITECTURE.md#adr-002)).

---

## Estrutura

```text
squads/oraclumtech-ai-creative-studio/
├── squad.yaml                  # metadados, elenco, workspace, regra de ouro
├── README.md                   # este arquivo
├── ARCHITECTURE.md             # tiers, fluxo, modelo híbrido, ADRs, riscos
├── CHANGELOG.md
├── _BLUEPRINT.md               # fonte única de verdade
├── agents/                     # 17 agentes
├── tasks/                      # 1+ task por estágio nomeado
├── workflows/                  # 6 workflows (wf-<pipeline-id>.yaml)
├── checklists/                 # gates transversais + 1 por gênero
├── templates/                  # brief, bíblia, storyboard, shotlist, card humano, dossiê
├── data/
│   ├── genre-catalog.yaml      # 6 gêneros MVP + 11 no backlog (cada um como diff)
│   ├── pipeline-profiles.yaml  # estágios, executor, handon/handoff, gate, fallback
│   ├── handoff-matrix.yaml     # contrato de cada artefato + o Pacote de Direção
│   ├── model-routing.yaml      # recomendação de ferramenta por asset (não é cascata)
│   └── craft-references.yaml   # o código de ofício de cada gênero
└── docs/
    └── PIPELINES.md            # passo a passo, com os pontos de parada humana
```

### Anatomia de um job

```text
workspaces/businesses/oraclum/creative-studio/jobs/{job-id}/
├── job.json                    # manifesto: estágios, gates, waivers, cards, degradados
├── _cards/                     # cards de tarefa humana, abertos e fechados
├── 00-intake/  01-brief/  02-research/  03-concept/  04-story/  05-script/
├── 06-decupagem/  07-look/  08-design/  09-character/   10-(reservado)
├── 11-stills/
│   ├── _direction/{asset-id}.yaml    # o Pacote de Direção, um por asset
│   ├── entregues/                    # o que o humano devolveu
│   └── drift-check.md                # avaliação e direção de retake
├── 12-takes/                   # mesma anatomia de 11-stills
├── 13-audio/
├── 14-assembly/
│   ├── autolegenda/                  # app próprio
│   ├── ae-comp-spec.md               # → After Effects
│   ├── premiere-cut-spec.md          # → Premiere
│   └── master/
├── 15-gate/                    # factcheck-report.md + gate-verdict.md
├── 16-delivery/
└── _degraded.md                # o que saiu abaixo do planejado, e por quê
```

---

## Restrições não-negociáveis

- **Sem case fabricado.** Nenhuma peça inventa depoimento, número ou resultado de cliente.
  A prova é o sistema rodando.
- **Léxico proibido** do brand-identity vale para peça da Oraclum: "fórmula mágica",
  "fique rico fácil", "segredo infalível", "revolução milagrosa", "case de cliente".
- **Nunca** robô apertando mão humana, IA como mágica, ou omitir limitação de ferramenta.
- **Todo handoff é arquivo em disco.** Contexto de conversa não é entrega.
- **`factcheck` é bloqueante e não aceita waiver.**
- **Geração de asset é humana.** Não existe variante automática de `stills` e `takes`.

---

## Documentação

- [`docs/PIPELINES.md`](docs/PIPELINES.md) — operação de cada pipeline, com os pontos de parada
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — decisões arquiteturais, porquês, riscos conhecidos
- [`data/craft-references.yaml`](data/craft-references.yaml) — o código de ofício por gênero
- [`data/model-routing.yaml`](data/model-routing.yaml) — que ferramenta usar, por quê e onde ela falha
- [`_BLUEPRINT.md`](_BLUEPRINT.md) — fonte única de verdade

---

**Versão:** 1.0.0 · **Entry agent:** `@studio-chief` · **Prefix:** `oraclumStudio`
