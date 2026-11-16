import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { paymentGateways, paymentWebhookEvents, tenants } from "@/db/schema";
import { PAYMENT_GATEWAY_PROVIDERS } from "@/lib/validations/payment-gateway";

// Single generic receiver for every PIX gateway, replacing the 18
// bespoke `/api/<provider>/webhook` endpoints from the original system.
// The tenant slug is part of the URL because gateway credentials are
// configured per white-label operator — the provider only knows one
// callback URL per account, so that URL has to carry which operator it
// belongs to. Signature verification is HMAC-SHA256 over the raw
// request body, sent as `x-webhook-signature` (hex).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; provider: string }> },
) {
  const { tenant: tenantSlug, provider } = await params;

  if (!PAYMENT_GATEWAY_PROVIDERS.includes(provider as never)) {
    return NextResponse.json({ error: "Provedor desconhecido." }, { status: 404 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Operador desconhecido." }, { status: 404 });
  }

  const [gateway] = await db
    .select()
    .from(paymentGateways)
    .where(
      and(
        eq(paymentGateways.tenantId, tenant.id),
        eq(paymentGateways.provider, provider as never),
      ),
    )
    .limit(1);

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-webhook-signature") ?? "";

  let signatureValid = false;
  if (gateway?.isActive && gateway.webhookSecret) {
    const expected = createHmac("sha256", gateway.webhookSecret)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    signatureValid = a.length === b.length && timingSafeEqual(a, b);
  }

  let payload: unknown = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = { raw: rawBody };
  }

  await db.insert(paymentWebhookEvents).values({
    tenantId: tenant.id,
    provider: provider as never,
    signatureValid,
    payload: payload as object,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  // TODO: match payload to an order (by externalReference / orderId) and
  // mark it paid via bankingTransactions + orders.status once a real
  // provider's payload shape is wired up.

  return NextResponse.json({ ok: true });
}
