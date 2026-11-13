# Blueprint — sistema de outbound autônomo (Instagram → WhatsApp)

**Status:** blueprint. Nada disto está construído. Este documento existe para que a decisão de
construir (ou não) seja tomada com a arquitetura já resolvida, e para que as travas descritas aqui
sejam reutilizadas pelos pipelines que **já** rodam.

**Origem:** destilado do prompt público de Matheus Gomes
([buscandomilhao](https://github.com/soumatheusgomes/buscandomilhao), sem licença declarada —
ver `docs/reference/PROCEDENCIA.md`). O texto abaixo é nosso; a arquitetura e as travas são o
aprendizado que extraímos de lá, cruzado com o que já sabemos dos nossos próprios pipelines.

---

## O problema que ele resolve

Prospecção no Instagram tem um obstáculo de plataforma que define a arquitetura inteira: **a API
oficial da Meta não abre conversa com quem nunca respondeu**. Isso significa que não existe
sistema de outbound no Instagram feito só com API oficial.

A resposta é um sistema de **dois canais com handoff**:

| Etapa | Canal | Por quê |
|---|---|---|
| Primeiro contato | Chrome real do operador, sessão logada por ele | É o único caminho que abre conversa |
| Depois da resposta | API oficial + webhook | É o caminho suportado, auditável e estável |

E a consequência imediata: se os dois canais podem escrever, os dois **vão** escrever no mesmo fio
em algum momento — e o lead recebe mensagem duplicada de dois "cérebros" diferentes. Daí a trava
central.

---

## O ciclo

```
Observar → Decidir → Agir → Medir → Aprender → Adaptar
```

Descoberta de perfil → qualificação (score de ICP) → primeira DM pelo navegador → espera →
webhook recebe a resposta → propriedade do canal passa para a API → conversa conduzida por LLM →
encaminhamento para WhatsApp → medição do que converteu → realimentação do público e da mensagem.

---

## As sete travas

Estas são a parte que importa, construamos o sistema ou não. Cada uma existe por uma falha
concreta e previsível.

### 1. Trava de propriedade de canal

Cada lead tem **um** campo de canal, e só o dono do canal pode enviar. Depois do handoff, o
navegador está **proibido** de responder aquele fio. Estados:

`browser_contact_pending` · `browser_contact_sent` · `waiting_inbound_reply` · `api_eligible` ·
`api_active` · `api_window_closed` · `human_review_required` · `do_not_contact` · `blocked` ·
`completed`

**Pipeline e canal são campos separados.** Misturar os dois é a origem do envio duplicado: um lead
"interessado" (pipeline) ainda pode estar com janela de API fechada (canal).

### 2. Claims ledger

Só o que está verificado pode ser afirmado. É a regra `.claude/rules/claims-ledger.md` — num
sistema autônomo ela deixa de ser instrução e vira **gate de envio**: a mensagem é validada contra
a tabela de claims antes de sair, e falha fechado.

### 3. Não-contato permanente

Pedido de parar é atendido na hora. O perfil entra em `do_not_contact`: permanente, sem follow-up,
sem reentrada por outra campanha, por nenhum canal. Isto é tabela, não heurística do LLM.

### 4. Ritmo humano — por saúde da conta

| Controle | Valor inicial |
|---|---|
| DMs por dia | 30 |
| Intervalo entre DMs | 90–240s aleatório |
| Janela de operação | 09:00–20:00, fuso configurável |
| Aquecimento | 5/dia na 1ª semana, +5 por semana |

Mesma disciplina de um SDR de verdade. **Proibido:** forjar fingerprint, mascarar automação, usar
API privada, contornar restrição. A linha é clara e nós já a conhecemos dos nossos scrapers: o
limite existe para a conta sobreviver, não para driblar detecção.

### 5. Teto de orçamento de LLM

Toda chamada grava modelo, tokens e custo. Antes de cada chamada, o worker consulta o teto mensal
e **pausa o sistema** ao atingi-lo. O painel mostra **custo por lead** e **custo por cliente
ativo** — sem esses dois números não se sabe se a automação dá lucro, e automação que não dá lucro
é hobby caro.

### 6. Circuit breaker

Pausa automática diante de: alerta ou restrição da plataforma · perda de sessão · crescimento
anormal de erro · mensagem duplicada detectada · aumento de bloqueio ou opt-out · divergência
entre navegador, API e CRM · comportamento inesperado do LLM · estouro de orçamento.

Nós já temos circuit breaker no `daily-monitor` do Instagram. O padrão é o mesmo e a lição também:
**relatório de falhas explícito** vale mais que degradação silenciosa — já nos custou um pipeline
reportando "10 ok / 0 failed" com zero vídeos capturados.

### 7. Experimento com uma variável por vez

Distribuição controlada, grupo de controle, tamanho de amostra registrado, sem declarar vencedor
cedo, aumento gradual da variante campeã, e uma fatia sempre explorando hipótese nova.

Prioridade de otimização — **clientes:** cliente ativo → volume transacionado → cadastro →
encaminhamento qualificado → interesse → resposta. Note que "resposta" é o *último* critério: o
sistema otimizado para taxa de resposta produz mensagem que gera resposta e não venda.

---

## Camada de navegador — os detalhes que decidem

Isto é o que mais se parece com o que já fazemos (temos Playwright em produção no farming e no
daily-monitor), então vale ser específico:

- Playwright conectado por **CDP**: `chromium.connectOverCDP(CHROME_CDP_URL)`.
- Perfil **dedicado** do Chrome, separado do pessoal. O Chrome 136+ recusa
  `--remote-debugging-port` no perfil padrão — isso é requisito, não preferência.
- Reusar o contexto já logado: `browser.contexts()[0]`.
- **Aba própria do agente** (`context.newPage()`). Nunca adotar aba do usuário, nunca
  `bringToFront()`, nunca tomar mouse ou teclado. O operador tem de poder usar o computador.
- Fechar a aba ao fim da job, inclusive em erro (`try/finally`).
- Restrito ao domínio do Instagram.
- **Mutex:** uma job de navegador por vez.
- Se `connectOverCDP` falhar: **não** abrir Chrome novo por conta própria. Registrar
  `browser_unavailable`, pausar a fila, avisar no painel.
- Preferir snapshot de acessibilidade a seletor CSS frágil.
- Falha salva: screenshot, snapshot de acessibilidade, URL, erros de console, falhas de rede, job id.

> ⚠️ **Segurança:** a porta de debug dá controle total sobre a sessão logada naquele perfil.
> Mantenha em `127.0.0.1`, nunca `0.0.0.0`, nunca em máquina compartilhada. O diretório do perfil
> guarda os cookies — vai para o `.gitignore` e não sai da máquina.

---

## Stack proposta

Next.js (App Router) · TypeScript `strict` · Tailwind · **SQLite** com Drizzle e migrações ·
Node.js 24 LTS · Playwright via CDP · SDK oficial do provedor de LLM.

Monolito modular. Sem microservices, sem fila externa, sem Redis: a tabela de jobs no SQLite
substitui o Redis enquanto for uma máquina. SQLite é a fonte única de verdade do MVP — e **não vai
para serverless com disco efêmero**. Migrar para PostgreSQL só com várias máquinas, deploy remoto
ou concorrência incompatível.

Interface em PT-BR; código, banco, status interno e doc técnica em inglês.

---

## Como isto se encaixa no que já temos

Esta é a parte que decide se vale construir:

| Peça do blueprint | O que já existe no severinos | Lacuna real |
|---|---|---|
| Descoberta de perfis no Instagram | `services/ETL/Extract` + `daily-monitor` (cascata API anônima → autenticada → Playwright) | Nenhuma. Já capturamos perfis |
| Captura via navegador com sessão | Playwright em produção no farming e no monitor | Nenhuma |
| CRM e pipeline | ClickUp (spaces Comercial/Produto/Gestão/Projetos) + `services/clickup` | ClickUp **não** é CRM de outbound: não tem estado de canal nem janela de mensageria |
| Publicação no Instagram | EPIC de Instagram Publishing (Graph API oficial) | Publicação existe; **mensageria** (DM via webhook) não |
| Motor de conversa | Nada | **Lacuna inteira** |
| Claims ledger | Agora é regra; nenhum enforcement em código | **Lacuna**: regra é instrução, não gate |
| Teto de custo de LLM | Nada mensurado por lead | **Lacuna inteira** |

**Leitura honesta:** a captura e a publicação já são nossas. O que falta é a camada de
*conversa* — webhook de mensageria, trava de canal, motor de resposta e medição de custo por lead.
Isso é um epic, não uma tarde.

## Próximo passo, se for construir

1. `/grill-with-docs` sobre o recorte: um funil só (cliente **ou** afiliado), um negócio só.
2. `@pm *create-epic` com este blueprint como entrada.
3. A ordem de execução do blueprint original é boa e vale seguir: banco e estados **antes** do
   CRM, CRM **antes** do worker, worker **antes** da integração do navegador, e o motor de conversa
   **depois** da trava de canal funcionando.
4. Simulação → dry-run com envio final bloqueado → autorização explícita do operador → piloto
   limitado → autonomia. Nessa ordem, sem pular.

## O que colher agora, sem construir nada

Três coisas já valem, independentemente da decisão:

1. **`claims-ledger.md`** — já está em `.claude/rules/`. Resolve uma dor nossa documentada.
2. **Pipeline e canal como campos separados** — vale para o ClickUp hoje: status do Lote não é a
   mesma coisa que estado de publicação.
3. **Custo por unidade de resultado** — o par "custo por lead / custo por cliente ativo" é o
   padrão que falta nos nossos pipelines de criativo também: medimos tempo por criativo, não custo
   por criativo aproveitado.
