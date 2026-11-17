// Webhook de pagamento (LTM-05, AC6 e AC7) — verde contra o código atual.
//
// A rota é o receptor genérico de todo gateway PIX. Hoje ela verifica
// assinatura HMAC-SHA256 do corpo cru, grava o evento e para num TODO sem
// fechar o pedido. Os testes abaixo descrevem isso como é — inclusive o
// corpo que não é JSON, que a rota guarda como `{ raw: ... }` em vez de
// recusar, e que por isso NÃO derruba a rota.

import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/webhooks/payment/[tenant]/[provider]/route";

import { createPaymentGateway, createTenant, readWebhookEvents } from "../helpers/seed";

const PROVIDER = "paggue";

function assinar(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function chamar(opts: {
  tenant: string;
  provider: string;
  body: string;
  signature?: string;
}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.signature !== undefined) headers["x-webhook-signature"] = opts.signature;

  // Request padrão da plataforma. A rota usa só `.text()` e `.headers`, e
  // nada aqui substitui o módulo de banco — a gravação do evento vai para a
  // base de verdade.
  const request = new Request(
    `http://localhost/api/webhooks/payment/${opts.tenant}/${opts.provider}`,
    { method: "POST", body: opts.body, headers },
  );

  return POST(request as unknown as NextRequest, {
    params: Promise.resolve({ tenant: opts.tenant, provider: opts.provider }),
  });
}

describe("POST /api/webhooks/payment/[tenant]/[provider]", () => {
  let tenantSlug: string;
  let tenantId: string;
  let webhookSecret: string;

  beforeEach(async () => {
    const tenant = await createTenant();
    tenantId = tenant.id;
    tenantSlug = tenant.slug;
    const gateway = await createPaymentGateway({ tenantId, provider: PROVIDER });
    webhookSecret = gateway.webhookSecret as string;
  });

  it("assinatura válida: aceita, grava o evento e marca a assinatura como boa", async () => {
    const body = JSON.stringify({ reference_code: "ref-sintetica-1", status: "paid" });

    const response = await chamar({
      tenant: tenantSlug,
      provider: PROVIDER,
      body,
      signature: assinar(webhookSecret, body),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const events = await readWebhookEvents(tenantId);
    expect(events).toHaveLength(1);
    expect(events[0].signature_valid).toBe(true);
    expect(events[0].payload).toEqual({ reference_code: "ref-sintetica-1", status: "paid" });
  });

  it("assinatura inválida: 401 E grava o evento, que é o rastro para auditoria", async () => {
    const body = JSON.stringify({ reference_code: "ref-sintetica-2" });

    const response = await chamar({
      tenant: tenantSlug,
      provider: PROVIDER,
      body,
      // Mesmo comprimento da esperada (64 hex), conteúdo errado.
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Assinatura inválida." });

    const events = await readWebhookEvents(tenantId);
    expect(events).toHaveLength(1);
    expect(events[0].signature_valid).toBe(false);
  });

  it("assinatura de comprimento divergente: 401 sem derrubar a rota", async () => {
    // `timingSafeEqual` do Node LANÇA quando os buffers têm tamanhos
    // diferentes. A rota se protege comparando o comprimento antes
    // (route.ts:56) — este teste é a prova de que a proteção está lá, e
    // quebra na hora se alguém a remover por achá-la redundante.
    const body = JSON.stringify({ reference_code: "ref-sintetica-3" });

    const response = await chamar({
      tenant: tenantSlug,
      provider: PROVIDER,
      body,
      signature: "curta",
    });

    expect(response.status).toBe(401);
    const events = await readWebhookEvents(tenantId);
    expect(events).toHaveLength(1);
    expect(events[0].signature_valid).toBe(false);
  });

  it("sem cabeçalho de assinatura: 401", async () => {
    const response = await chamar({
      tenant: tenantSlug,
      provider: PROVIDER,
      body: JSON.stringify({ reference_code: "ref-sintetica-4" }),
    });

    expect(response.status).toBe(401);
    expect(await readWebhookEvents(tenantId)).toHaveLength(1);
  });

  it("gateway desativado: nem tenta verificar, e recusa", async () => {
    const outro = await createTenant();
    const gateway = await createPaymentGateway({
      tenantId: outro.id,
      provider: PROVIDER,
      isActive: false,
    });
    const body = JSON.stringify({ reference_code: "ref-sintetica-5" });

    const response = await chamar({
      tenant: outro.slug,
      provider: PROVIDER,
      body,
      // Assinatura correta para o segredo guardado — e ainda assim recusada,
      // porque o gateway está inativo.
      signature: assinar(gateway.webhookSecret as string, body),
    });

    expect(response.status).toBe(401);
    const events = await readWebhookEvents(outro.id);
    expect(events).toHaveLength(1);
    expect(events[0].signature_valid).toBe(false);
  });

  it("ramo de falha: provedor desconhecido devolve 404 e não grava nada", async () => {
    // `paysure` é o gateway de PRODUÇÃO do Império e não está em nenhuma das
    // duas listas do app — o 404 aqui é a dívida medida, não um caso
    // hipotético.
    const response = await chamar({
      tenant: tenantSlug,
      provider: "paysure",
      body: JSON.stringify({ reference_code: "ref-sintetica-6" }),
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Provedor desconhecido." });
    expect(await readWebhookEvents(tenantId)).toHaveLength(0);
  });

  it("ramo de falha: operador desconhecido devolve 404 e não grava nada", async () => {
    const response = await chamar({
      tenant: `operador-que-nao-existe-${Date.now()}`,
      provider: PROVIDER,
      body: JSON.stringify({ reference_code: "ref-sintetica-7" }),
      signature: "0".repeat(64),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Operador desconhecido." });
    expect(await readWebhookEvents(tenantId)).toHaveLength(0);
  });

  it("ramo de falha: corpo que não é JSON é guardado como texto cru e NÃO derruba a rota", async () => {
    const body = "isto-nao-e-json";

    const response = await chamar({
      tenant: tenantSlug,
      provider: PROVIDER,
      body,
      signature: assinar(webhookSecret, body),
    });

    // Comportamento de hoje: assinatura válida sobre corpo ilegível é
    // aceita, e o corpo vai para a auditoria embrulhado em `{ raw }`.
    expect(response.status).toBe(200);
    const events = await readWebhookEvents(tenantId);
    expect(events).toHaveLength(1);
    expect(events[0].signature_valid).toBe(true);
    expect(events[0].payload).toEqual({ raw: body });
  });
});
