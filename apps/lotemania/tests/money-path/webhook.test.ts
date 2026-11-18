// O receptor de aviso de pagamento (LTM-03a, blocos B, D, F e G).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO FOI REESCRITO, E NÃO AJUSTADO
//
// A versão anterior (LTM-05, AC6/AC7) descrevia corretamente o código
// anterior: a rota verificava HMAC em `x-webhook-signature`, gravava o
// evento e PARAVA num `TODO` sem fechar o pedido. Cada asserção dela era
// verdadeira. A LTM-03a muda o comportamento descrito, de propósito:
//
//   • a URL ganhou um quarto segmento (o token) e a antiga responde 410
//     → o teste "assinatura válida: aceita e grava" virava um teste sobre uma
//       rota aposentada. Reescrito como AC-G1.
//   • `paysure` passou a existir nas duas listas
//     → o teste "provedor desconhecido devolve 404" usava `paysure` como
//       exemplo do 404, e aquele 404 era a DÍVIDA que esta story paga.
//       Reescrito: `paysure` agora responde 200 com `unsupported_provider`
//       (AC-F2), e o 404 passou a ser verificado com um provedor que de fato
//       não existe.
//   • a resposta deixou de ser `{ ok: true }` pelada
//     → AC-F1 proíbe exatamente isso.
//
// O que NÃO mudou e continua testado aqui: o evento é gravado em todos os
// caminhos, inclusive nos recusados; assinatura de comprimento divergente
// não derruba a rota; corpo ilegível é guardado em vez de estourar.
// ════════════════════════════════════════════════════════════════════════

import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { POST as POST_TOKENIZADA } from "@/app/api/webhooks/payment/[tenant]/[provider]/[token]/route";
import { POST as POST_APOSENTADA } from "@/app/api/webhooks/payment/[tenant]/[provider]/route";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { adapterFor, providersWithoutAdapter } from "@/lib/payments/providers";
import { REDACTED } from "@/lib/payments/redact";
import { webhookPath } from "@/lib/payments/webhook-url";

import { orderIdOf, titulos } from "../helpers/actions";
import { fanOut } from "../helpers/concurrency";
import { assertProductInvariants } from "../helpers/invariants";
import {
  countBankingTransactions,
  createPaymentGateway,
  createRaffle,
  createTenant,
  readBankingTransactions,
  readOrder,
  readUnits,
  readWebhookEvents,
  releaseUnitsOfOrder,
  setGatewayActive,
  setOrderStatus,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

/** Provedor com adaptador HMAC de referência. */
const PROVIDER = "paggue";
/** Provedor sem adaptador — o estado da paysure até a LTM-03b. */
const SEM_ADAPTADOR = "paysure";

function assinar(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * O envelope de referência da plataforma — NOSSO, não de provedor nenhum.
 *
 * Documentado em `src/lib/payments/providers/hmac-generic.ts`. Nenhuma
 * fixture aqui vem de pagamento real, e nenhuma carrega dado pessoal de
 * verdade: os valores de `payerName`/`payerDocument` dos testes do AC-G2 são
 * marcadores sintéticos que não têm a forma de CPF.
 */
function aviso(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    flow: "cashin",
    eventId: `evt-sintetico-${Math.random().toString(36).slice(2, 10)}`,
    status: "paid",
    ...overrides,
  });
}

async function chamarTokenizada(opts: {
  tenant: string;
  provider: string;
  token: string;
  body: string;
  signature?: string;
}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.signature !== undefined) headers["x-webhook-signature"] = opts.signature;

  const request = new Request(
    `http://localhost${webhookPath(opts.tenant, opts.provider, opts.token)}`,
    { method: "POST", body: opts.body, headers },
  );

  return POST_TOKENIZADA(request as unknown as NextRequest, {
    params: Promise.resolve({
      tenant: opts.tenant,
      provider: opts.provider,
      token: opts.token,
    }),
  });
}

async function chamarAposentada(opts: {
  tenant: string;
  provider: string;
  body: string;
}): Promise<Response> {
  const request = new Request(
    `http://localhost/api/webhooks/payment/${opts.tenant}/${opts.provider}`,
    { method: "POST", body: opts.body },
  );
  return POST_APOSENTADA(request as unknown as NextRequest, {
    params: Promise.resolve({ tenant: opts.tenant, provider: opts.provider }),
  });
}

describe("POST /api/webhooks/payment/[tenant]/[provider]/[token]", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;
  let secret: string;
  let token: string;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
    const gateway = await createPaymentGateway({
      tenantId: tenant.id,
      provider: PROVIDER,
    });
    secret = gateway.webhookSecret as string;
    token = gateway.webhookToken as string;
  });

  async function reservar(numeros: number[]) {
    return orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(...numeros),
        phone: syntheticPhone(),
      }),
    );
  }

  function assinado(body: string) {
    return { tenant: tenant.slug, provider: PROVIDER, token, body, signature: assinar(secret, body) };
  }

  // ── Bloco C — o caminho feliz, de ponta a ponta ──────────────────────

  it("AC-C1: aviso verificado fecha o pedido pela rota", async () => {
    const orderId = await reservar([0, 1]);
    const body = aviso({
      orderId,
      amountCents: 2000,
      paymentId: "ref-sintetica-1",
      endToEndId: "e2e-sintetico-1",
      paidAt: "2026-11-18T12:00:00.000Z",
    });

    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: true,
      state: "settled",
      orderId,
      unitsSold: 2,
    });

    const order = await readOrder(orderId);
    expect(order.status).toBe("paid");
    expect(order.paid_at).not.toBeNull();

    const vendidas = (await readUnits(raffle.id)).filter((u) => u.status === "sold");
    expect(vendidas.map((u) => u.number)).toEqual([0, 1]);

    const lancamentos = await readBankingTransactions(orderId);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]).toMatchObject({
      amount: "20.00",
      payment_id: "ref-sintetica-1",
      end_to_end_id: "e2e-sintetico-1",
    });

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      match_state: "settled",
      order_id: orderId,
      delivery_count: 1,
      amount_cents: 2000,
      signature_valid: true,
    });

    await assertProductInvariants(raffle.id, "fechamento pelo webhook");
  });

  // ── Bloco B — autenticidade ─────────────────────────────────────────

  it("AC-B2: token errado é recusado e NADA muda nas três tabelas", async () => {
    const orderId = await reservar([2]);
    const antes = {
      order: (await readOrder(orderId)).status,
      unidades: (await readUnits(raffle.id)).filter((u) => u.status === "sold").length,
      creditos: await countBankingTransactions(tenant.id),
    };

    const body = aviso({ orderId, amountCents: 1000 });

    for (const tokenRuim of ["token-que-nao-e-o-certo", "x", `${token}a`]) {
      const response = await chamarTokenizada({
        tenant: tenant.slug,
        provider: PROVIDER,
        token: tokenRuim,
        body,
        signature: assinar(secret, body),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        processed: false,
        state: "unauthenticated",
      });
    }

    expect((await readOrder(orderId)).status).toBe(antes.order);
    expect(
      (await readUnits(raffle.id)).filter((u) => u.status === "sold"),
    ).toHaveLength(antes.unidades);
    expect(await countBankingTransactions(tenant.id)).toBe(antes.creditos);

    // E as três tentativas estão REGISTRADAS, com estado de autenticação
    // falho — recusar não é razão para não deixar rastro.
    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(3);
    expect(eventos.every((e) => e.match_state === "unauthenticated")).toBe(true);
    expect(eventos.every((e) => e.signature_valid === false)).toBe(true);
    // ⚠️ `external_event_id` NULO de propósito: se aviso rejeitado
    // reservasse a chave de idempotência, bastaria adivinhar uma referência
    // para BLOQUEAR o pagamento verdadeiro que chegasse depois.
    expect(eventos.every((e) => e.external_event_id === null)).toBe(true);
  });

  it("AC-B2: gateway sem token emitido recusa — falha fechado", async () => {
    const outro = await createTenant();
    await createPaymentGateway({
      tenantId: outro.id,
      provider: PROVIDER,
      webhookToken: null,
    });

    const body = aviso();
    const response = await chamarTokenizada({
      tenant: outro.slug,
      provider: PROVIDER,
      token: "qualquer-coisa",
      body,
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(401);
    const eventos = await readWebhookEvents(outro.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].match_reason).toContain("não tem token de webhook emitido");
  });

  it("AC-B2: gateway desativado recusa, mesmo com o token certo", async () => {
    await setGatewayActive(tenant.id, PROVIDER, false);
    const body = aviso();

    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(401);
    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].match_reason).toContain("desativado pelo operador");
  });

  it("AC-B3: assinatura inválida é recusada, gravada e não altera nada", async () => {
    const orderId = await reservar([3]);
    const creditosAntes = await countBankingTransactions(tenant.id);
    const body = aviso({ orderId, amountCents: 1000 });

    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body,
      // Mesmo comprimento da esperada (64 hex), conteúdo errado.
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(401);
    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await countBankingTransactions(tenant.id)).toBe(creditosAntes);

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].signature_valid).toBe(false);
    expect(eventos[0].match_state).toBe("unauthenticated");
  });

  it("AC-B3: assinatura de comprimento divergente NÃO derruba a rota", async () => {
    // `timingSafeEqual` do Node LANÇA quando os buffers têm tamanhos
    // diferentes. A checagem de comprimento antes dela é o que impede um 500
    // — e este teste quebra na hora se alguém a remover por achá-la
    // redundante. A guarda mudou de arquivo (route.ts → hmac-generic.ts), e
    // continua coberta.
    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body: aviso(),
      signature: "curta",
    });

    expect(response.status).toBe(401);
    expect((await readWebhookEvents(tenant.id))[0].signature_valid).toBe(false);
  });

  it("AC-B3: sem cabeçalho de assinatura, recusa", async () => {
    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body: aviso(),
    });

    expect(response.status).toBe(401);
    expect(await readWebhookEvents(tenant.id)).toHaveLength(1);
  });

  // ── Bloco D — idempotência ──────────────────────────────────────────

  it("AC-D1 e AC-D4: a MESMA entrega 5× fecha UMA vez, e as 4 repetições ficam visíveis", async () => {
    const orderId = await reservar([4]);
    // O corpo é FIXO entre as entregas — é o que a reentrega do provedor faz.
    const body = JSON.stringify({
      flow: "cashin",
      eventId: "evt-reentrega-fixa",
      status: "paid",
      orderId,
      amountCents: 1000,
      paymentId: "ref-sintetica-reentrega",
    });
    const signature = assinar(secret, body);

    const respostas: Response[] = [];
    for (let i = 0; i < 5; i++) {
      respostas.push(
        await chamarTokenizada({
          tenant: tenant.slug,
          provider: PROVIDER,
          token,
          body,
          signature,
        }),
      );
    }

    expect(respostas[0].status).toBe(200);
    expect(await respostas[0].json()).toMatchObject({ processed: true, state: "settled" });

    for (const resposta of respostas.slice(1)) {
      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toMatchObject({
        processed: false,
        state: "duplicate",
      });
    }

    // 1 pedido pago, 1 crédito, 1 evento.
    const pagos = (await readUnits(raffle.id)).filter((u) => u.status === "sold");
    expect(pagos).toHaveLength(1);
    expect(await readBankingTransactions(orderId)).toHaveLength(1);

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].match_state).toBe("settled");
    // AC-D4 — a reentrega não desaparece: ela conta.
    expect(eventos[0].delivery_count).toBe(5);

    await assertProductInvariants(raffle.id, "cinco reentregas do mesmo aviso");
  });

  it("AC-D2: duas entregas do mesmo evento EM PARALELO fecham uma vez", async () => {
    // Este é o AC que distingue idempotência real de "consultei antes de
    // escrever": a reivindicação é a própria inserção com unicidade, e quem
    // colide fica bloqueado no índice até o vencedor cometer.
    const orderId = await reservar([5]);
    const body = JSON.stringify({
      flow: "cashin",
      eventId: "evt-concorrente",
      status: "paid",
      orderId,
      amountCents: 1000,
    });
    const signature = assinar(secret, body);

    const resultado = await fanOut(2, () =>
      chamarTokenizada({
        tenant: tenant.slug,
        provider: PROVIDER,
        token,
        body,
        signature,
      }),
    );

    expect(resultado.rejected).toHaveLength(0);

    const corpos = await Promise.all(
      resultado.fulfilled.map((o) => (o.value as Response).json()),
    );
    const fechados = corpos.filter((c) => c.state === "settled");
    const duplicatas = corpos.filter((c) => c.state === "duplicate");

    expect(fechados).toHaveLength(1);
    expect(duplicatas).toHaveLength(1);

    expect((await readUnits(raffle.id)).filter((u) => u.status === "sold")).toHaveLength(1);
    expect(await readBankingTransactions(orderId)).toHaveLength(1);

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].delivery_count).toBe(2);

    await assertProductInvariants(raffle.id, "duas entregas concorrentes");
  });

  it("AC-D3: `paid` e `refunded` da MESMA referência são eventos distintos", async () => {
    // O risco nasce da própria orientação do provedor ("dedupe por
    // reference_code"). Se a chave fosse só a referência, o estorno seria
    // recusado como duplicata — e estorno recusado em silêncio é faturamento
    // falso no painel do operador.
    const orderId = await reservar([6]);
    const referencia = "evt-mesma-referencia";

    const pago = JSON.stringify({
      flow: "cashin",
      eventId: referencia,
      status: "paid",
      orderId,
      amountCents: 1000,
    });
    const estornado = JSON.stringify({
      flow: "cashin",
      eventId: referencia,
      status: "refunded",
      orderId,
      amountCents: 1000,
    });

    const r1 = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body: pago,
      signature: assinar(secret, pago),
    });
    const r2 = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body: estornado,
      signature: assinar(secret, estornado),
    });

    expect(await r1.json()).toMatchObject({ state: "settled" });
    // Registrado como evento PRÓPRIO, não engolido como duplicata.
    expect(await r2.json()).toMatchObject({ state: "not_actionable" });

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(2);
    expect(eventos.map((e) => e.match_state).sort()).toEqual([
      "not_actionable",
      "settled",
    ]);
    expect(new Set(eventos.map((e) => e.external_event_id)).size).toBe(2);
    expect(eventos.every((e) => e.delivery_count === 1)).toBe(true);

    // E o MESMO aviso repetido continua sendo duplicata.
    const r3 = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body: estornado,
      signature: assinar(secret, estornado),
    });
    expect(await r3.json()).toMatchObject({ state: "duplicate" });
    expect(await readWebhookEvents(tenant.id)).toHaveLength(2);
  });

  // ── Bloco E — dinheiro ──────────────────────────────────────────────

  it("AC-E3: valor divergente não fecha o pedido, e o motivo é nomeado", async () => {
    const orderId = await reservar([7]);
    const body = aviso({ orderId, amountCents: 500 });

    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: false,
      state: "amount_mismatch",
    });

    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await readBankingTransactions(orderId)).toHaveLength(0);

    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(evento.match_state).toBe("amount_mismatch");
    expect(evento.match_reason).toContain("Pagamento parcial");
    expect(evento.order_id).toBe(orderId);
    expect(evento.amount_cents).toBe(500);
  });

  // ── Bloco F — visibilidade ──────────────────────────────────────────

  it("AC-F1: aviso que não casa com pedido nenhum fica gravado com motivo, e responde 200", async () => {
    const body = aviso({
      orderId: "00000000-0000-4000-8000-000000000000",
      amountCents: 1000,
    });

    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: false,
      state: "unmatched",
    });

    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(evento.match_state).toBe("unmatched");
    expect(evento.order_id).toBeNull();
    expect(evento.match_reason).toBeTruthy();
  });

  it("AC-F1: nenhuma resposta de sucesso é `{ ok: true }` pelada", async () => {
    // A verificação por leitura que o AC pede, executada: o corpo de toda
    // resposta 200 desta rota nomeia o que foi feito ou deixou de ser feito.
    const casos = [
      aviso({ orderId: "00000000-0000-4000-8000-000000000000", amountCents: 1 }),
      aviso({ status: "expired" }),
      "isto-nao-e-json",
    ];

    for (const body of casos) {
      const response = await chamarTokenizada(assinado(body));
      const corpo = (await response.json()) as Record<string, unknown>;
      expect(Object.keys(corpo).sort()).not.toEqual(["ok"]);
      expect(corpo).toHaveProperty("processed");
      expect(corpo).toHaveProperty("state");
    }
  });

  // ⚠️ REESCRITO PELA LTM-03b.
  //
  // O enunciado anterior era "provedor sem adaptador é recusado EM VOZ ALTA,
  // nomeando o provedor", e o corpo do teste usava a `paysure` como exemplo
  // — porque ela ERA o provedor sem adaptador. A LTM-03b entrega o
  // adaptador dela, e `providersWithoutAdapter()` fica vazia: nenhum
  // provedor da lista cai mais no ramo `unsupported_provider`, e o ramo
  // passa a ser inalcançável pela rota.
  //
  // Isso NÃO é regressão do AC-F2 — é a dívida que ele media sendo paga. O
  // que sobra para verificar aqui, e que continua sendo a propriedade de
  // valor, é a mesma de antes com o ramo novo: aviso da paysure que a rota
  // não consegue processar sai com estado NOMEADO e motivo, pedido intocado,
  // item na lista do operador, resposta 200 e nunca `{ ok: true }` pelado.
  //
  // A diferença é de qual portão o recusa: antes era o portão 4 (sem
  // adaptador), agora é o portão 6 (o adaptador da paysure não reconhece
  // este corpo — o envelope de referência da plataforma NÃO é o formato
  // dela). O estado `unsupported_provider` continua no schema e continua
  // coberto por `webhook-events-list.test.tsx`.
  it("aviso que a rota não processa sai com estado NOMEADO, nunca em silêncio", async () => {
    const gateway = await createPaymentGateway({
      tenantId: tenant.id,
      provider: SEM_ADAPTADOR,
      webhookSecret: null,
    });
    const orderId = await reservar([8]);
    // O envelope de referência da PLATAFORMA, que é nosso e não é de
    // provedor nenhum — em particular não é o da paysure, que ramifica por
    // chave de topo (`cashin`/`cashout`/`refund`).
    const body = aviso({ orderId, amountCents: 1000 });

    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: SEM_ADAPTADOR,
      token: gateway.webhookToken as string,
      body,
    });

    expect(response.status).toBe(200);
    const corpo = (await response.json()) as Record<string, unknown>;
    expect(corpo).toMatchObject({ processed: false, state: "invalid_payload" });
    expect(Object.keys(corpo).sort()).not.toEqual(["ok"]);
    expect(String(corpo.reason)).toContain("chave de topo");

    // O pedido fica intocado.
    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await readBankingTransactions(orderId)).toHaveLength(0);

    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(evento.match_state).toBe("invalid_payload");
    expect(evento.match_reason).toBeTruthy();
  });

  it("AC-F2: o mecanismo de provedor sem adaptador continua existindo", () => {
    // A lista está vazia, e é isso que se afirma: não há provedor
    // representável sem tradutor. A guarda do portão 4 fica para o provedor
    // que alguém acrescentar às listas sem escrever o adaptador — ela é a
    // resposta a essa pergunta, não andaime da paysure.
    expect(providersWithoutAdapter()).toEqual([]);
    expect(adapterFor(SEM_ADAPTADOR)).not.toBeNull();
  });

  it("AC-F3: status não acionável é registrado, não ignorado", async () => {
    for (const status of ["refunded", "expired"]) {
      const body = aviso({ status, amountCents: 1000 });
      const response = await chamarTokenizada(assinado(body));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        processed: false,
        state: "not_actionable",
      });
    }

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(2);
    expect(eventos.every((e) => e.match_state === "not_actionable")).toBe(true);
    expect(eventos.every((e) => (e.match_reason ?? "").length > 0)).toBe(true);
  });

  it("AC-F3: pagamento atrasado vira estorno pendente, sem lançar dinheiro", async () => {
    const orderId = await reservar([9]);
    await releaseUnitsOfOrder(orderId);
    await setOrderStatus(orderId, "expired");

    const body = aviso({ orderId, amountCents: 1000 });
    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: false,
      state: "refund_pending",
    });

    // O invariante do AC-C6, medido pela rota: nada em banking_transactions.
    expect(await readBankingTransactions(orderId)).toHaveLength(0);
    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(evento.match_state).toBe("refund_pending");
    expect(evento.order_id).toBe(orderId);
  });

  it("corpo que não é JSON é guardado e NÃO derruba a rota", async () => {
    // Comportamento preservado da versão anterior, com uma diferença: agora
    // a rota diz em voz alta que não processou, em vez de responder
    // `{ ok: true }` para um corpo que ela não entendeu.
    const body = "isto-nao-e-json";
    const response = await chamarTokenizada(assinado(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: false,
      state: "invalid_payload",
    });

    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(evento.signature_valid).toBe(true);
    expect(evento.payload).toEqual({ raw: body });
  });

  it("aviso sem identificador estável é recusado em vez de processado", async () => {
    const orderId = await reservar([0]);
    const body = JSON.stringify({
      flow: "cashin",
      status: "paid",
      orderId,
      amountCents: 1000,
    });

    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body,
      signature: assinar(secret, body),
    });

    expect(await response.json()).toMatchObject({ state: "invalid_payload" });
    expect((await readOrder(orderId)).status).toBe("pending");
  });

  // ── Bloco G — higiene ───────────────────────────────────────────────

  it("AC-G2: o payload persistido NÃO contém nome nem documento do pagador", async () => {
    // A seção 5.4 do contrato nomeia `payer_name` E `payer_document` — o AC
    // foi estendido aos dois pelo @po em 2026-11-17. A fixture é sintética e
    // nenhum valor aqui tem a forma de um CPF.
    const orderId = await reservar([1]);
    const NOME_SINTETICO = "Pagador-sintetico-da-suite";
    const DOC_SINTETICO = "documento-sintetico-da-suite";

    const body = JSON.stringify({
      flow: "cashin",
      eventId: "evt-com-dado-pessoal",
      status: "paid",
      orderId,
      amountCents: 1000,
      payer_name: NOME_SINTETICO,
      payer_document: DOC_SINTETICO,
      payer_email: "pagador@example.invalid",
      // Chave que NÃO é dado pessoal: tem de sobreviver, senão a auditoria
      // perde contexto sem proteger ninguém.
      end_to_end: "e2e-sintetico-g2",
    });

    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token,
      body,
      signature: assinar(secret, body),
    });
    expect(response.status).toBe(200);

    const evento = (await readWebhookEvents(tenant.id))[0];
    const persistido = JSON.stringify(evento.payload);

    expect(persistido).not.toContain(NOME_SINTETICO);
    expect(persistido).not.toContain(DOC_SINTETICO);
    expect(persistido).not.toContain("pagador@example.invalid");
    expect(evento.payload).toMatchObject({
      payer_name: REDACTED,
      payer_document: REDACTED,
      payer_email: REDACTED,
      end_to_end: "e2e-sintetico-g2",
    });
  });

  it("AC-G2: aviso REJEITADO também tem o dado pessoal mascarado", async () => {
    // Rejeitar não é razão para guardar: o aviso com token errado traz o
    // mesmo CPF do aviso legítimo.
    const DOC_SINTETICO = "documento-sintetico-rejeitado";
    const body = JSON.stringify({
      flow: "cashin",
      eventId: "evt-rejeitado",
      status: "paid",
      payer_document: DOC_SINTETICO,
    });

    await chamarTokenizada({
      tenant: tenant.slug,
      provider: PROVIDER,
      token: "token-errado",
      body,
      signature: "0".repeat(64),
    });

    const evento = (await readWebhookEvents(tenant.id))[0];
    expect(JSON.stringify(evento.payload)).not.toContain(DOC_SINTETICO);
  });

  it("ramo de falha: provedor que não existe em lista nenhuma devolve 404", async () => {
    // ⚠️ `paysure` NÃO serve mais como exemplo aqui — ela passou a existir
    // nas duas listas, que é o que esta story entrega (AC-A1). O 404 agora
    // precisa de um nome que de fato não exista.
    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: "provedor-que-nao-existe",
      token,
      body: aviso(),
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Provedor desconhecido." });
    expect(await readWebhookEvents(tenant.id)).toHaveLength(0);
  });

  it("AC-A1(i): a rota tokenizada da paysure NÃO responde 404", async () => {
    // A regressão do defeito medido: antes desta story, `paysure` respondia
    // 404 antes de chegar na autenticidade, porque faltava em
    // `PAYMENT_GATEWAY_PROVIDERS`.
    const gateway = await createPaymentGateway({
      tenantId: tenant.id,
      provider: SEM_ADAPTADOR,
      webhookSecret: null,
    });

    const response = await chamarTokenizada({
      tenant: tenant.slug,
      provider: SEM_ADAPTADOR,
      token: gateway.webhookToken as string,
      body: aviso(),
    });

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(200);
  });

  it("ramo de falha: operador desconhecido devolve 404", async () => {
    const response = await chamarTokenizada({
      tenant: `operador-que-nao-existe-${Date.now()}`,
      provider: PROVIDER,
      token,
      body: aviso(),
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Operador desconhecido." });
  });

  it("AC-G1: a rota SEM token responde 410, registra a tentativa e não altera nada", async () => {
    const orderId = await reservar([2]);
    const creditosAntes = await countBankingTransactions(tenant.id);
    const body = aviso({ orderId, amountCents: 1000 });

    const response = await chamarAposentada({
      tenant: tenant.slug,
      provider: PROVIDER,
      body,
    });

    expect(response.status).toBe(410);
    const corpo = (await response.json()) as Record<string, unknown>;
    expect(corpo).toMatchObject({ processed: false, state: "route_retired" });
    // A mensagem tem de ensinar o endereço certo — 410 sem instrução é 404
    // com outro número.
    expect(String(corpo.error)).toContain("{token}");

    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await countBankingTransactions(tenant.id)).toBe(creditosAntes);

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].match_state).toBe("unauthenticated");
    expect(eventos[0].match_reason).toContain("SEM TOKEN");
  });
});
