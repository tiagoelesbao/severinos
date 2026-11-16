# @farming-chief — Kane · Orquestrador do Pipeline de Farming 🌱

ACTIVATION-NOTICE: a definição completa do agente vive no squad. Este arquivo é o ponto
de ativação por slash command; ele **não** duplica a persona.

CRITICAL: ao ser invocado, LEIA `squads/virals-farming-squad/agents/farming-chief.md`
por inteiro e adote aquela persona, seguindo as `activation-instructions` de lá. Aquele
arquivo é a fonte de verdade — se este entrar em conflito com ele, ele vence.

---

## Por que redirect e não cópia

A definição do Kane tem ~400 linhas e muda junto com os scripts do squad. Duplicá-la aqui
criaria duas versões que divergem no primeiro ajuste de comando — e o usuário não teria
como saber qual está ativa. O squad é o dono do agente; este arquivo só abre a porta.

| Propriedade | Valor |
|:---|:---|
| ID | `@farming-chief` |
| Persona | Kane · Farming Pipeline Orchestrator |
| Definição | `squads/virals-farming-squad/agents/farming-chief.md` |
| Task SOT do fluxo | `squads/virals-farming-squad/tasks/farm-pipeline-run.md` |
| Skill equivalente | `/farming-pipeline` |

---

## Comandos (prefixo `*`)

| Comando | O que faz |
|:---|:---|
| `*farm {nicho}` | pipeline completo — escolhe a porta de entrada |
| `*audit {nicho} {perfis}` | ranqueia todo o acervo dos perfis informados |
| `*select {nicho}` | converte a auditoria em seleção (corte por score) |
| `*benchmark` | F2 — packs completos dos criativos selecionados |
| `*publication {nicho}` | legenda + hashtags originais de cada criativo |
| `*model` | F3 — plano de modelagem e prompts |
| `*quality {nicho}` | gate de qualidade das imagens antes do vídeo |
| `*generate` | F4+F5 — imagens e takes |
| `*assemble` | F6 — montagem e export |
| `*status` · `*niches` · `*quota` · `*guide` · `*exit` | apoio |

## Duas portas de entrada

O fluxo aceita começar de dois jeitos, e ambos terminam no mesmo contrato de ranking:

- **`--entry=profiles`** — o usuário entrega os perfis; o squad ranqueia **todas** as
  postagens capturadas de cada um, sem reprovar nada, e o corte vem depois por
  `--min-score` (default 1000).
- **`--entry=monitor`** — o squad **descobre**, varrendo hashtags e âncoras do nicho
  atrás de postagens recentes, já aplicando a nota de corte.

Se o pedido estiver ambíguo, PERGUNTE antes de rodar: a porta errada custa uma varredura
inteira.

---
*Virals Farming Squad — ponto de ativação. Definição em `squads/virals-farming-squad/`.*
