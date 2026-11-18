// O aviso da Paysure fechando o pedido pela ROTA (LTM-03b, AC3 a AC6c).
//
// É o adaptador exercitado de ponta a ponta: URL tokenizada → verificação
// sem assinatura → tradução → reivindicação → fechamento, com Postgres de
// verdade. `adapter.test.ts` prova a tradução campo a campo; aqui prova-se
// o EFEITO.
//
// Nenhuma fixture vem de aviso real de produção (ver o cabeçalho de
// `adapter.test.ts`). Nenhuma chamada de rede: a rota é invocada como
// função, que é o que a suíte da LTM-03a já fazia.

import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { POST as POST_TOKENIZADA } from "@/app/api/webhooks/payment/[tenant]/[provider]/[token]/route";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { REDACTED } from "@/lib/payments/redact";
import { webhookPath } from "@/lib/payments/webhook-url";

import { orderIdOf, titulos } from "../../helpers/actions";
import {
  countBankingTransactions,
  createPaymentGateway,
  createRaffle,
  createTenant,
  readBankingTransactions,
  readOrder,
  readUnits,
  readWebhookEvents,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../../helpers/seed";

const PAYSURE = "paysure";

let tenant: SeededTenant;
let raffle: SeededRaffle;
let token: string;

beforeEach(async () => {
  tenant = await createTenant();
  raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  const gateway = await createPaymentGateway({
    tenantId: tenant.id,
    provider: PAYSURE,
    // ⚠️ `null` e não um valor: a paysure NÃO assina, e o campo "Segredo do
    // Webhook" nem é pedido ao operador dela. Guardar um segredo aqui seria
    // guardar um dado sem destinatário do outro lado.
    webhookSecret: null,
  });
  token = gateway.webhookToken as string;
});

async function reservar(numeros: number[]): Promise<string> {
  return orderIdOf(
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(...numeros),
      phone: syntheticPhone(),
    }),
  );
}

async function entregar(opts: {
  body: unknown;
  token?: string;
  headers?: Record<string, string>;
}): Promise<Response> {
  const usado = opts.token ?? token;
  const request = new Request(
    `http://localhost${webhookPath(tenant.slug, PAYSURE, usado)}`,
    {
      method: "POST",
      body: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
      headers: opts.headers ?? {},
    },
  );
  return POST_TOKENIZADA(request as unknown as NextRequest, {
    params: Promise.resolve({ tenant: tenant.slug, provider: PAYSURE, token: usado }),
  });
}

/** Um aviso de cash-in sintético, na forma de §2/§9.3. */
function avisoCashin(overrides: Record<string, unknown> = {}) {
  return {
    cashin: {
      reference_code: `PSR-sintetico-${Math.random().toString(36).slice(2, 10)}`,
      value_cents: 2000,
      status: "paid",
      payer_name: "marcador-sintetico-de-nome",
      payer_document: "marcador-sintetico-de-documento",
      payment_date: "2026-11-18T12:00:00.000Z",
      registration_date: "2026-11-18T11:45:00.000Z",
      end_to_end: "E-sintetico-paysure-1",
      content: "00020126-br-code-sintetico-do-aviso",
      ...overrides,
    },
  };
}

describe("AC3: o aviso da paysure fecha o pedido ponta a ponta", () => {
  it("cash-in `paid` fecha o pedido, vende as unidades e lança UM crédito", async () => {
    const orderId = await reservar([0, 1]);
    const body = avisoCashin({ external_reference: orderId });

    const response = await entregar({ body });

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
    // Os dois identificadores do pagamento, vindos do aviso da Paysure.
    expect(lancamentos[0]).toMatchObject({
      amount: "20.00",
      payment_id: body.cashin.reference_code,
      end_to_end_id: "E-sintetico-paysure-1",
    });

    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("settled");
    expect(evento.external_event_id).toBe(
      `cashin:${body.cashin.reference_code}:paid`,
    );
    expect(evento.amount_cents).toBe(2000);
  });

  it("valor divergente do pedido NÃO fecha — pagamento parcial não vale título", async () => {
    const orderId = await reservar([2]);
    await entregar({
      body: avisoCashin({ external_reference: orderId, value_cents: 500 }),
    });

    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await countBankingTransactions(tenant.id)).toBe(0);
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("amount_mismatch");
  });

  it("`external_reference` ausente não casa por heurística de valor", async () => {
    await reservar([3]);
    await entregar({ body: avisoCashin({ external_reference: undefined }) });

    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("unmatched");
    expect(await countBankingTransactions(tenant.id)).toBe(0);
  });

  it("dado pessoal do pagador é mascarado na trilha (portão G7)", async () => {
    const orderId = await reservar([4]);
    const body = avisoCashin({ external_reference: orderId, value_cents: 1000 });
    await entregar({ body });

    const [evento] = await readWebhookEvents(tenant.id);
    const persistido = JSON.stringify(evento.payload);
    expect(persistido).not.toContain(body.cashin.payer_name);
    expect(persistido).not.toContain(body.cashin.payer_document);
    expect(persistido).toContain(REDACTED);
    // E o que o fechamento usa continua lá.
    expect(persistido).toContain(body.cashin.reference_code);
  });
});

describe("AC4: sem assinatura é ACEITO; token errado é recusado", () => {
  it("aviso SEM `x-webhook-signature` e com token válido fecha o pedido", async () => {
    // ⚠️ A regressão do erro que a LTM-03 ia cometer. Sob o esquema HMAC
    // genérico, este mesmo pedido responderia 401 — e seriam 100% dos
    // avisos da Paysure, porque não existe assinatura a mandar.
    const orderId = await reservar([5]);
    const response = await entregar({
      body: avisoCashin({ external_reference: orderId, value_cents: 1000 }),
      headers: {},
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ processed: true, state: "settled" });
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.signature_valid).toBe(true);
  });

  it("o MESMO aviso com token inválido é recusado com 401 e registrado", async () => {
    const orderId = await reservar([6]);
    const response = await entregar({
      body: avisoCashin({ external_reference: orderId, value_cents: 1000 }),
      token: "token-sintetico-que-nao-e-o-emitido-000000000",
    });

    expect(response.status).toBe(401);
    expect((await readOrder(orderId)).status).toBe("pending");
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("unauthenticated");
    // Aviso recusado NÃO reserva a chave de idempotência — senão bastaria
    // adivinhar um `reference_code` para bloquear o pagamento de verdade.
    expect(evento.external_event_id).toBeNull();
  });

  it("um `x-webhook-signature` qualquer é IGNORADO, não verificado", async () => {
    // A paysure declara `signature: "none"`. Se a rota ainda verificasse
    // assinatura para ela, um cabeçalho de lixo derrubaria o aviso.
    const orderId = await reservar([7]);
    const response = await entregar({
      body: avisoCashin({ external_reference: orderId, value_cents: 1000 }),
      headers: { "x-webhook-signature": "0".repeat(64) },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "settled" });
  });
});

describe("AC5: ciclo de vida não é duplicata", () => {
  it("`paid` e depois `refunded` do mesmo reference_code são DOIS eventos", async () => {
    const orderId = await reservar([8]);
    const referenceCode = "PSR-sintetico-ciclo-de-vida";

    await entregar({
      body: avisoCashin({
        external_reference: orderId,
        value_cents: 1000,
        reference_code: referenceCode,
      }),
    });
    const resposta = await entregar({
      body: avisoCashin({
        external_reference: orderId,
        value_cents: 1000,
        reference_code: referenceCode,
        status: "refunded",
      }),
    });

    // O estorno é REGISTRADO e não reverte nada nesta story (Escopo OUT).
    expect(await resposta.json()).toMatchObject({ state: "not_actionable" });

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(2);
    expect(eventos.map((e) => e.external_event_id)).toEqual([
      `cashin:${referenceCode}:paid`,
      `cashin:${referenceCode}:refunded`,
    ]);
    expect(eventos.map((e) => e.match_state)).toEqual(["settled", "not_actionable"]);

    // O pedido continua pago, e o crédito continua sendo UM.
    expect((await readOrder(orderId)).status).toBe("paid");
    expect(await readBankingTransactions(orderId)).toHaveLength(1);
  });

  it("o MESMO `paid` reentregue é duplicata, e a reentrega é contada", async () => {
    const orderId = await reservar([9]);
    const body = avisoCashin({ external_reference: orderId, value_cents: 1000 });

    await entregar({ body });
    const segunda = await entregar({ body });

    expect(await segunda.json()).toMatchObject({ state: "duplicate", deliveries: 2 });
    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].delivery_count).toBe(2);
    // Um crédito, nunca dois — é a defesa contra a reentrega vender o
    // número duas vezes.
    expect(await readBankingTransactions(orderId)).toHaveLength(1);
  });
});

describe("AC6: `expired` é registrado e aparece na lista do operador", () => {
  it("`expired` não fecha nem cancela nada, e tem motivo escrito", async () => {
    const orderId = await reservar([0]);
    const response = await entregar({
      body: avisoCashin({
        external_reference: orderId,
        value_cents: 1000,
        status: "expired",
        payment_date: undefined,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "not_actionable" });

    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await countBankingTransactions(tenant.id)).toBe(0);

    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("not_actionable");
    expect(evento.match_reason).toContain("expired");
    expect(evento.external_event_id).toContain(":expired");
  });

  it("cash-out é reconhecido e registrado, não processado", async () => {
    const response = await entregar({
      body: {
        cashout: {
          reference_code: "PSR-sintetico-cashout",
          external_reference: "99999999-9999-4999-8999-999999999999",
          status: "paid",
          end_to_end: "E-sintetico-cashout",
          occurred_at: "2026-11-18T12:00:00.000Z",
        },
      },
    });

    expect(await response.json()).toMatchObject({ state: "not_actionable" });
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_state).toBe("not_actionable");
    expect(evento.match_reason).toContain("cashout");
  });
});

describe("AC6b: status desconhecido é recusa nomeada, e o pedido fica intocado", () => {
  it.each(["failed", "banana"])(
    'cash-in com status "%s" é registrado com o valor literal',
    async (status) => {
      const orderId = await reservar([1]);
      const response = await entregar({
        body: avisoCashin({
          external_reference: orderId,
          value_cents: 1000,
          status,
        }),
      });

      // Responde 200 (a Paysure reentrega três vezes e depois some com o
      // problema) e o fail-loud mora no REGISTRO.
      expect(response.status).toBe(200);
      const corpo = (await response.json()) as Record<string, unknown>;
      expect(corpo.state).toBe("invalid_payload");
      expect(String(corpo.reason)).toContain(`"${status}"`);

      // Pedido intocado, nenhum dinheiro lançado.
      expect((await readOrder(orderId)).status).toBe("pending");
      expect(await countBankingTransactions(tenant.id)).toBe(0);

      // Item na lista do operador, com o literal.
      const [evento] = await readWebhookEvents(tenant.id);
      expect(evento.match_state).toBe("invalid_payload");
      expect(evento.match_reason).toContain(`"${status}"`);
      // Não caiu em ramo genérico nem foi tratado como pago.
      expect(evento.match_state).not.toBe("settled");
      expect(evento.match_state).not.toBe("not_actionable");
    },
  );

  it("corpo sem chave de topo conhecida não é lido como cash-in", async () => {
    const orderId = await reservar([2]);
    const response = await entregar({
      body: {
        pagamento: { reference_code: "PSR-x", status: "paid", external_reference: orderId },
      },
    });

    expect(await response.json()).toMatchObject({ state: "invalid_payload" });
    expect((await readOrder(orderId)).status).toBe("pending");
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_reason).toContain("sem chave de topo conhecida");
  });
});

describe("AC6c: o refund ramifica pelo `event`", () => {
  it("`event: \"med_block\"` é registrado com `event` e `reason` preservados", async () => {
    const body = {
      refund: {
        reference_code: "PSR-sintetico-med",
        external_reference: "88888888-8888-4888-8888-888888888888",
        status: "refunded",
        amount_cents: 1000,
        end_to_end: "E-sintetico-med",
        event: "med_block",
        reason: "bloqueio-sintetico-de-teste",
        occurred_at: "2026-11-18T12:00:00.000Z",
      },
    };

    const response = await entregar({ body });
    expect(await response.json()).toMatchObject({ state: "not_actionable" });

    const [evento] = await readWebhookEvents(tenant.id);
    // O `event` entra na chave de idempotência — dois eventos MED da mesma
    // transação têm o mesmo `reference_code` E o mesmo `status`.
    expect(evento.external_event_id).toBe("refund:PSR-sintetico-med:med_block");
    // E o literal de `event` e `reason` fica no payload gravado, que é onde
    // esta story os preserva (nenhum dos dois é dado pessoal, então nenhum
    // é mascarado).
    const persistido = JSON.stringify(evento.payload);
    expect(persistido).toContain("med_block");
    expect(persistido).toContain("bloqueio-sintetico-de-teste");
  });

  it("`event` desconhecido é recusado com o valor literal registrado", async () => {
    const response = await entregar({
      body: {
        refund: {
          reference_code: "PSR-sintetico-med-2",
          external_reference: "88888888-8888-4888-8888-888888888888",
          status: "refunded",
          event: "med_desconhecido",
        },
      },
    });

    expect(await response.json()).toMatchObject({ state: "invalid_payload" });
    const [evento] = await readWebhookEvents(tenant.id);
    expect(evento.match_reason).toContain("Evento de refund desconhecido");
    expect(evento.match_reason).toContain("med_desconhecido");
  });
});
