---
name: lotemania-reserve-known-defects
description: A identidade do comprador do lotemania nasce de check-then-act contra índice único em CINCO caminhos; a reserva foi consertada na LTM-23, e bonus-play.ts continua com cópia byte-a-byte do mesmo defeito
metadata:
  type: project
---

## O que foi consertado (LTM-23, 2026-11-19)

`apps/lotemania/src/lib/actions/reserve.ts` criava o comprador com `SELECT` + `INSERT` cru contra
`users_tenant_phone_idx` em `(tenant_id, phone)`. Duas reservas simultâneas do mesmo telefone novo:
uma insere, a outra estoura, a action relança — **500 na primeira compra da vida**. Quem já era
cliente estava imune.

Virou `ensureBuyerIdentity`, privada do módulo, com `ON CONFLICT (tenant_id, phone) DO NOTHING` +
releitura em laço de 3 voltas.

**Duas escolhas que não são estilo:**

1. **`DO NOTHING`, não `DO UPDATE ... RETURNING`.** `DO UPDATE` obriga a escrever alguma coluna da
   linha que **já existe** — e essa linha é a do comprador, com `consecutive_unpaid_reservations`
   dentro. `DO NOTHING` não escreve nada na linha alheia, então a sobrevivência da ficha do
   anti-spam deixa de depender de alguém ter escolhido bem o `SET`.
2. **O alvo é nomeado.** `users` tem **quatro** índices únicos por tenant (`email`, `username`,
   `phone`, `affiliate_code` em `core.ts:75-80`). Sem alvo, o `ON CONFLICT` casa com qualquer um
   dos quatro.

**Medido, não deduzido:** `ON CONFLICT (tenant_id, phone) DO NOTHING` com e-mail colidente
**estoura** com `users_tenant_email_idx`; **sem alvo** devolve **zero linha e zero erro** — a
colisão desaparece. Essa é a diferença que o alvo compra.

E o `email` nunca é escrito por este caminho (nasce `NULL`, e `NULL` não colide com `NULL`): o
cenário "conflito de e-mail" é **inalcançável pela ação de produção**, e provar isso exige
SQL direto + varredura de fonte.

## O que NÃO foi consertado — o mesmo padrão em quatro outros caminhos

A story da LTM-23 mandou conferir dois. `grep -rn "insert(users)" src/` achou **quatro**:

| Caminho | Gravidade |
|---|---|
| **`bonus-play.ts:48-61`** | **cópia byte-a-byte** do defeito consertado: mesmo `SELECT` por `(tenantId, phone)`, mesmos `values({ tenantId, phone, role: "subscriber" })`, mesmo `.returning()[0].id`. Caminho do comprador na loja. Duas batidas em "comprar" = o mesmo 500 |
| `signup.ts:29-58` | check-then-act com `phone OR email`; o conserto **não** é `ON CONFLICT (tenant_id, phone)` — a colisão pode ser legitimamente de e-mail, e a resposta certa é a mensagem que o arquivo já tem. Exige decisão de produto |
| `affiliate-signup.ts:25-47` | `SELECT` só por e-mail e `INSERT` escrevendo `phone` sem conferir: e-mail novo com telefone já usado estoura **sem concorrência nenhuma**. E `randomBytes(4)` para `affiliateCode` sem repetição contra o índice único |
| `affiliates.ts:25-54` | mesma forma, caminho do painel do operador |

**Why:** a story procurou nos dois lugares onde o conserto é **difícil** e passou ao lado do único
onde ele é mecanicamente idêntico.

**How to apply:** (a) `ensureBuyerIdentity` resolve `bonus-play.ts` sem lógica nova, mas **não pode
ser exportada de `reserve.ts`** — arquivo `"use server"`, e exportar a viraria endpoint POST
público; o caminho é um módulo puro, no molde de `lib/raffles/expire-reservations.ts`; (b) teste de
concorrência de reserva com o **mesmo** telefone tem de pré-criar a identidade (`createBuyer`) ou
mede identidade em vez do que pretende medir.

## Limite nomeado da varredura de expiração (segue aberto)

`src/lib/raffles/expire-reservations.ts` não tem teto de lote: um parâmetro por pedido candidato em
`inArray`. Não morde no uso orgânico, **morde numa importação em massa** de pedidos `pending`
históricos — isto é, na própria migração do Império. Acima de ~30 mil candidatos chega-se ao limite
de bind parameters do Postgres. O teto seria `.limit(N)` nas duas leituras de candidatos.

Relacionado: [[lotemania-suite-feedback-loop]], [[use-server-export-trap]],
[[global-sweep-kills-the-counter]].
