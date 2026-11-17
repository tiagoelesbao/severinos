# LTM-06: As duas decisões de sessão que ficaram em aberto

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P1** — a sessão já para de morrer sozinha (`65217b0a`); isto fecha as bordas que sobraram
**Complexidade:** M (Standard) — duas decisões de segurança + o teste de cada uma
**Criada por:** @aiox-master · 2026-11-17

> Esta story existe porque duas escolhas apareceram durante o conserto da sessão e **não foram
> tomadas em silêncio**. As duas estão documentadas em comentário no próprio código, no commit
> `65217b0a`. Nenhuma é bug novo: a primeira já existia e ficou mais alcançável, a segunda é
> limitação assumida do desenho escolhido.

## Story

**Como** operador do Império trabalhando no painel o dia inteiro, às vezes com duas abas abertas
**Eu quero** que a sessão sobreviva ao uso normal
**Para que** eu não perca o que estava fazendo por um detalhe de corrida ou por ter clicado num
botão depois do café.

## Contexto

### O que já foi resolvido, para não se reabrir

Até `65217b0a`, toda sessão do painel morria **15 minutos** depois do login. O access token
expirava, o `proxy.ts` mandava para `/login`, e o refresh token de 30 dias ficava no cookie ao
lado sem ninguém usar — porque o único arquivo que chamava `/api/auth/refresh` era
`src/lib/api-client.ts`, **importado por zero arquivos**.

Hoje: o proxy redireciona para `GET /api/auth/refresh`, que renova e devolve o operador ao
destino. A renovação mora na rota porque o cookie de refresh é escopado em `path: "/api/auth"` de
propósito, e o proxy **nunca o recebe**.

**Isto não é escopo desta story.** O que segue são as duas bordas.

---

### Decisão A — a corrida de rotação de refresh token

`src/lib/auth/session.ts`, em `rotateSession()`:

```ts
const revoked = await db
  .update(refreshTokens)
  .set({ revokedAt: new Date() })
  .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)))
  .returning({ id: refreshTokens.id });

if (revoked.length === 0) return false;
```

A revogação condicional **já está aplicada** e fecha o que era inequivocamente errado: antes, duas
requisições concorrentes com o mesmo refresh token emitiriam **duas sessões válidas** do mesmo
token.

**O que ficou aberto:** quem perde a corrida recebe `false` e vai para o login, mesmo com
credencial legítima. O cenário real é duas abas do painel paradas por mais de 15 minutos e
reativadas ao mesmo tempo.

O remédio usual na indústria é uma **janela de tolerância**: aceitar um token revogado há poucos
segundos e devolver a sessão que foi emitida naquela rotação. Mas o comentário do próprio módulo
promete o contrário — que a revogação *"also catches reuse of a stolen/rotated-out token"*. Uma
janela de tolerância **afrouxa exatamente essa detecção**.

**É escolha de segurança, não de implementação.** As duas saídas são defensáveis e a decisão é de
quem responde pelo risco.

| Saída | O que se ganha | O que se perde |
|---|---|---|
| **Manter como está** | detecção de reúso permanece estrita | duas abas simultâneas podem derrubar a sessão |
| **Janela de tolerância de N segundos** | o operador nunca cai por corrida | token roubado e usado dentro da janela passa despercebido |
| **Terceira via: detectar reúso e revogar a família inteira** | reúso vira sinal ativo (desloga tudo e avisa) | mais estado para manter; token roubado derruba o dono legítimo junto |

`[DECIDIR]` — e, se for janela, `[CONFIRMAR]` o N.

---

### Decisão B — Server Action com token vencido

`src/proxy.ts` só tenta renovar em **GET**:

```ts
if (accessToken && req.method === "GET") { /* redireciona para a renovação */ }
```

Em `POST` — que é como Server Action trafega — **redirecionar cancelaria a ação em vez de
executá-la**. Hoje a requisição segue e o `requireUser()` da própria action recusa, que é o
comportamento anterior: nenhuma regressão, mas também nenhuma melhora.

A janela é estreita e real: aba parada por mais de 15 minutos **e** um clique que não navegue
antes. Qualquer navegação renova por mais 15 minutos.

| Saída | Nota |
|---|---|
| **Deixar como está** | a janela é estreita; o custo é um erro ocasional que o operador resolve recarregando |
| **Keepalive no cliente** | um componente no layout do painel chamando `POST /api/auth/refresh` antes do vencimento. Fecha a janela inteira — **mas multiplica a Decisão A**, porque cada aba vira um renovador concorrente |
| **Renovar dentro do proxy** | exigiria alargar o `path` do cookie de refresh para `/`, desfazendo uma proteção que o código tomou de propósito |

**As duas decisões são acopladas:** escolher keepalive sem antes resolver a corrida piora a
situação em vez de melhorar.

## Tarefas (Checklist)

- [ ] Registrar a decisão A e a decisão B com quem decidiu e por quê (ADR em `docs/architecture/adr/`).
- [ ] Implementar a saída escolhida para A em `src/lib/auth/session.ts`.
- [ ] Implementar a saída escolhida para B (`proxy.ts` e/ou um componente de keepalive no layout do painel).
- [ ] Atualizar os comentários do código que hoje descrevem as limitações — eles deixam de valer.
- [ ] Testes dos ACs abaixo.

## Critérios de Aceite

- [ ] **AC1 (a corrida tem comportamento definido e testado):** duas chamadas concorrentes de
      `rotateSession()` com o mesmo refresh token produzem o resultado **que a decisão A
      escolheu**, verificado por teste que dispara as duas em paralelo. Em **nenhuma** saída o
      resultado é duas sessões válidas emitidas do mesmo token.
- [ ] **AC2 (o caminho feliz não regrediu):** depois de o access token vencer, uma navegação a
      `/dashboard/*` renova e entrega a página pedida — não o `/dashboard/app`, não o login.
      Teste com token expirado e refresh válido.
- [ ] **AC3 (expulsão continua funcionando):** refresh token revogado ou vencido → redireciona
      para `/login`, **e o cookie de acesso é apagado**, de modo que a visita seguinte vá direto
      ao login sem o salto pela rota de renovação.
- [ ] **AC4 (a guarda de redirecionamento aberto resiste):** `GET /api/auth/refresh?from=` com
      valor externo (`https://exemplo.com`, `//exemplo.com`, `/api/...`, `../`) **nunca**
      redireciona para fora de `/dashboard/`. Teste com uma lista de entradas hostis.
- [ ] **AC5 (a decisão B tem comportamento definido):** Server Action disparada com access token
      vencido se comporta conforme a decisão B, com teste. Se for keepalive, o AC1 roda **de novo**
      com o keepalive ligado — é o cenário que ele agrava.
- [ ] **AC6 (nada depende de `deviceId`/`userAgent`):** teste de regressão garantindo que trocar
      `deviceId` ou `userAgent` **não** invalida a sessão. Hoje esses campos são só auditoria, e
      a story documenta isso para que ninguém os transforme em autenticação sem decidir.

## Escopo

**IN:** as duas decisões, registradas em ADR; a implementação escolhida; os testes acima;
atualização dos comentários que descrevem as limitações.

**OUT:** 2FA (o campo `twoFactorRequired` existe em `settings` e não é lido por nada — é outra
story); captcha; `deviceId`/`userAgent` virarem fator de autenticação (seria mudança de produto e
contraria o AC6); qualquer coisa no caminho do dinheiro.

## Dependências

- **Depende de `LTM-05`** para a suíte de teste — AC1 e AC5 são de concorrência e não se verificam
  à mão.
- **Independe de `LTM-01`, `LTM-02`, `LTM-03a/b` e `LTM-04`.** Toca `src/lib/auth/session.ts`,
  `src/proxy.ts`, `src/app/api/auth/refresh/route.ts` e, se for keepalive,
  `src/app/dashboard/layout.tsx`. Nenhum desses arquivos está no conjunto de nenhuma outra story —
  **pode ir em qualquer onda**.
- ⚠️ **Não gera migração**, então não disputa o journal do Drizzle.

## Riscos

- **[Médio] Escolher keepalive sem resolver a corrida** piora a situação: cada aba vira um
  renovador concorrente. É por isso que as duas decisões estão na mesma story.
- **[Médio] Janela de tolerância mal dimensionada** vira buraco de segurança silencioso. Se for a
  saída escolhida, o N precisa de justificativa escrita, não de um número redondo.
- **[Baixo] O cookie de acesso agora dura 30 dias** (o JWT dentro continua com 15 min). Quem ler o
  `maxAge` sem ler o comentário pode achar que a sessão foi afrouxada. O AC6 e o comentário em
  `createSession` existem para impedir essa leitura errada.

## Decisões que precisam do dono do negócio

| # | Decisão | Por que não é minha |
|---|---|---|
| A | corrida de rotação: manter estrito, janela de tolerância, ou revogar a família | troca detecção de token roubado por conforto do operador |
| B | Server Action vencida: deixar como está ou keepalive | acopla com A e muda a superfície de renovação |

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Decisão A — escolhida, por quem, quando
_(preencher)_

### Decisão B — escolhida, por quem, quando
_(preencher)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do conserto da sessão (`65217b0a`), para que as duas escolhas que apareceram ali fossem decididas em vez de assumidas em silêncio. | @aiox-master |
