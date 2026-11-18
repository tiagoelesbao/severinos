import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { paymentWebhookEvents, tenants } from "@/db/schema";
import { redactPersonalData, redactRawBody } from "@/lib/payments/redact";
import { isPaymentGatewayProvider } from "@/lib/validations/payment-gateway";

// ════════════════════════════════════════════════════════════════════════
// A ROTA APOSENTADA — 410 GONE, COM REGISTRO (AC-G1)
//
// Esta rota recebia aviso de pagamento e verificava HMAC-SHA256 em
// `x-webhook-signature`. Ela não aceita mais nada, e a mudança não é
// cosmética:
//
//   • o esquema que ela implementava rejeitaria 100% dos avisos da Paysure,
//     porque a Paysure NÃO ASSINA — não é "ela usa outro esquema", é que não
//     há o que verificar
//     (`docs/research/2026-11-16-paysure-contrato.md` §2);
//   • a autenticidade passou a morar num TOKEN na própria URL, e o token é
//     um quarto segmento de caminho. Sem ele não existe rota — é falhar
//     fechado por roteamento.
//
// O endereço válido é `[tenant]/[provider]/[token]`.
//
// POR QUE 410 E NÃO 404, E POR QUE COM REGISTRO: hoje não há gateway em
// produção apontando para cá (zero pedidos pagos), então o custo de mudar a
// rota é zero AGORA. Depois do primeiro sorteio de teste não é. Provedor mal
// configurado respondido com 404 silencioso é problema que ninguém descobre
// até faltar dinheiro; 410 com trilha é problema que aparece na lista do
// operador no mesmo dia.
//
// A verificação HMAC NÃO foi apagada: ela virou
// `src/lib/payments/providers/hmac-generic.ts`, com a mesma comparação em
// tempo constante e a mesma checagem de comprimento antes dela.
// ════════════════════════════════════════════════════════════════════════

const MENSAGEM =
  "Esta URL de webhook foi aposentada. O endereço válido inclui um token: " +
  "/api/webhooks/payment/{tenant}/{provider}/{token}. Copie-o na tela de " +
  "Gateways de Pagamento do painel.";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; provider: string }> },
) {
  const { tenant: tenantSlug, provider } = await params;

  // A tentativa só é registrável quando o provedor cabe na coluna (é um
  // `pgEnum`) e o operador existe. Fora disso o 410 vai sem trilha — não há
  // onde pendurá-la, e inventar uma linha com provedor nulo tornaria a
  // própria lista do operador ilegível.
  if (isPaymentGatewayProvider(provider)) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (tenant) {
      const rawBody = await req.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = { raw: redactRawBody(rawBody) };
      }

      await db.insert(paymentWebhookEvents).values({
        tenantId: tenant.id,
        provider,
        signatureValid: false,
        payload: (redactPersonalData(parsedBody) ?? {}) as object,
        externalEventId: null,
        matchState: "unauthenticated",
        matchReason:
          "Aviso entregue na URL SEM TOKEN, que foi aposentada (410). " +
          "Reconfigure a postbackUrl do provedor com o token do gateway.",
      });
    }
  }

  return NextResponse.json(
    { processed: false, state: "route_retired", error: MENSAGEM },
    { status: 410 },
  );
}
