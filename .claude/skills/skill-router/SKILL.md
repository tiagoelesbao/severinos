---
name: skill-router
description: Diz qual skill, agente ou pipeline do severinos atende a situação atual, e em que ordem. Use quando a pessoa não souber por onde começar, perguntar "que skill eu uso para isso", tiver um pedido que cruza várias frentes, ou quando duas skills parecerem fazer a mesma coisa.
disable-model-invocation: true
---

# Roteador do severinos

<!-- Inspirado no padrão de roteador da skill `ask-matt` de mattpocock/skills (MIT). O conteúdo
é nosso: roteia sobre o catálogo deste repositório. -->

Você é o roteador. **Não execute o trabalho** — identifique o caminho, explique por que é esse, e
entregue o primeiro comando. Se o pedido já é óbvio e tem uma skill só, diga a skill em uma linha
e pare.

A referência completa é `docs/guides/BIBLIA-SEVERINOS.md`. Este arquivo é o atalho de decisão.

## Primeiro, as três perguntas que resolvem 80% dos casos

1. **É código ou é negócio?** Código vai para a trilha AIOX ou para as skills de engenharia.
   Negócio vai para um squad Virals ou para as skills comerciais.
2. **A fala do vídeo é gravada por uma pessoa, ou é TTS?** Gravada → `/editonny`. TTS → nosso
   pipeline.
3. **Você sabe o que quer, ou precisa descobrir?** Precisa descobrir → **sempre** comece por
   `/grill-with-docs`. É o erro mais caro do catálogo: pular o alinhamento e implementar a coisa
   errada rápido.

---

## Engenharia de software

### O ciclo canônico

Trabalho de código neste repo passa pelo **Story Development Cycle**. Não existe trilha paralela:

```
@sm *draft  →  /validate-story-draft  →  /develop-story  →  /review-story  →  /close-story
```

| Atalho | Quando |
|---|---|
| `/full-sdc` | Rodar o ciclo inteiro de uma story, ponta a ponta, com lock de sequência |
| `/wave-execute` | Várias stories em paralelo, em ondas por propriedade de arquivo. Leia `.claude/rules/parallel-waves.md` antes |
| `@pm *create-epic` → `*execute-epic` | Agrupar stories com contexto estratégico |

### As disciplinas que entram *dentro* do ciclo

Estas não substituem o ciclo — elas melhoram o que acontece dentro dele:

| Situação | Skill |
|---|---|
| Ainda não está claro **o que** construir | `/grill-with-docs` (em repo) ou `/grill-me` (fora de repo) |
| O vocabulário do projeto está confuso; termo fazendo três trabalhos | `/domain-modeling` → `GLOSSARY.md` + ADR |
| Decidir onde fica a fronteira de um módulo | `/codebase-design` |
| Construir ou corrigir test-first | `/tdd` |
| Bug difícil, regressão de performance, "não sei por que quebrou" | `/diagnosing-bugs` |
| Responder uma dúvida de design antes de comprometer | `/prototype` |
| Revisar o diff em dois eixos (padrões + fidelidade à spec) | `/code-review-2axis` |
| Revisar com o CodeRabbit, com auto-correção | `/coderabbit-review` |
| Escrever o corpo do PR | `/pr` (o envio em si é `@devops`) |
| Varrer a base por oportunidades de aprofundar módulo | `/improve-codebase-architecture` |
| Esforço grande demais para uma sessão; a névoa não abriu | `/wayfinder` |
| A sessão terminou e o ambiente do agente podia ser melhor | `/retro` |
| Decisão arquitetural antes de código | `/architect-first` |
| Script interativo para um passo que **só um humano** pode fazer | `/wizard` |
| Está no Windows e o PowerShell está brigando | `/powershell-windows` |

### Infraestrutura do próprio framework

| Situação | Caminho |
|---|---|
| Criar ou editar uma skill | `/skill-creator` + `/writing-for-agents` |
| Criar um servidor MCP | `/mcp-builder` |
| Criar um squad novo | `@squad-creator` |
| Governança do framework, roteamento entre agentes | `@aiox-master` |
| Contexto e regras do SYNAPSE | `/synapse` |
| Rodar um checklist qualquer | `/checklist-runner` |
| Commit local convencional | `/aiox-commit` |
| Enviar ao remoto, PR, merge, CI, MCP | **`@devops`, e só ele** |

---

## Comercial e operação

| Situação | Caminho |
|---|---|
| Não sei o que vender, para quem, nem por quanto | `/oferta-5p` |
| Tenho a oferta e um cliente concreto para abordar | `/proposta-comercial` |
| A oferta precisa de engenharia de valor, garantia, escada de preço | `@hormozi-sales` |
| O cliente sumiu depois do orçamento | `/proposta-comercial` (os três follow-ups) ou `@blount-sales` (cadência) |
| Objeção não cedeu com a resposta pronta | `@belfort-sales` |
| Canal é WhatsApp | `@thiago-reis` |
| Preciso de pipeline previsível e estrutura de outbound | `@ross-sales` |
| Roteamento comercial em dúvida | `@sales-chief` |
| Tirar um processo da minha cabeça e poder delegar | `/manual-de-processo` |
| Processo virou gargalo de escala | `@hormozi-sys` |
| Sistema de decisão, princípios, auditoria | `@dalio` |
| OKR, tração, os seis componentes do EOS | `@wickman` |
| BI, métrica acionável | `@kaushik` |
| Lançamento | `@walker-launch` |
| Roteamento operacional em dúvida | `@ops-chief` |

⚠️ Qualquer texto que vá para fora — anúncio, DM, proposta, legenda, página — passa por
`.claude/rules/claims-ledger.md` antes. Sem exceção.

---

## Marketing e conteúdo

| Situação | Caminho |
|---|---|
| O que está performando hoje nas redes | `@marketing-chief` `*daily-monitor` |
| ETL profundo dos top criativos (transcrição + frames + análise) | `@marketing-chief` `*creative-benchmark` |
| Garimpar criativo no TikTok e modelar | `/farming-pipeline` |
| Título e thumb por nicho, antes do roteiro | `/packaging` |
| O que postar hoje no canal de futebol | `/pauta-futebol` |
| Peça do AI Creative Studio (dark room, filme de marca, UGC, série) | `/oraclum-studio` |
| Arquitetura de conteúdo viral | `@mrbeast-mk` |
| Copy de alta conversão | `@ladeira` |
| VSL e script de vídeo | `@georgi` |
| Tráfego: brand e funil / resposta direta | `@ezra-firestone` / `@perry-marshall` |
| SEO e orgânico | `@fishkin-mk` |
| Marca e presença social | `@garyvee-mk` |
| Direção de imagem e carrossel / vídeo e motion | `@casey-neistat-img` / `@sam-kolder-vid` |

---

## Vídeo — a árvore de decisão

Esta é a parte onde mais se erra de ferramenta. A pergunta é sempre a mesma: **de onde vem a
fala?**

```
A fala foi gravada por uma pessoa?
├── SIM → /editonny
│         (Reels, anúncio, aula, vídeo de vendas, UGC, depoimento,
│          adaptar uma referência com a sua gravação)
└── NÃO (é TTS) → qual gênero?
    ├── curto dark modelado de criativo do TikTok  → /farming-pipeline (F6 monta e exporta)
    ├── peça de gênero do estúdio                  → /oraclum-studio
    ├── VOD longo de canal dark                    → apps/canal-futebol, apps/canal-estoico
    ├── overlay/locução de live                    → apps/live-futebol
    └── edição manual fina: FX, togi, timeline     → apps/video-studio
```

**Não misture editonny e video-studio no mesmo vídeo.** Os formatos de projeto são diferentes
(`project.json` vs. `studio-edit.json`) e não há conversor. Decida um dos dois e vá até o fim.
Detalhes em `docs/guides/editonny-ponte.md`.

---

## Pesquisa e aprendizado

| Situação | Caminho |
|---|---|
| Pesquisa técnica profunda, com fontes, salva no repo | `/tech-search` |
| Mercado, concorrência, ROI | `@analyst` |
| Quero **aprender** um assunto ao longo de várias sessões | `/teach` |
| A mensagem do agente não fez sentido | `/wait-what` |
| Uma decisão depende de outra pessoa | `/to-questionnaire` |
| Receita pronta para uma necessidade de setup/qualidade | `docs/guides/vibe-coding-toolkit/README.md` |

---

## Como responder

1. Nomeie **um** caminho principal. Se houver um segundo passo óbvio, nomeie-o também — não mais
   que dois.
2. Diga em uma frase **por que** é esse, e não o vizinho mais parecido.
3. Entregue o comando exato para começar.
4. Se o pedido cruza frentes de verdade (ex.: "quero vender edição de vídeo para clínicas"),
   mostre a sequência: `/oferta-5p` → `/proposta-comercial` → `/manual-de-processo` → `/editonny`.
5. Se a situação **não** tem skill no catálogo, diga isso. Não force um encaixe. Uma skill chamada
   por engano custa mais que nenhuma.
