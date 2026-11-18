import { createHmac, timingSafeEqual } from "crypto";

import { gatewaySpecFor } from "@/lib/validations/payment-gateway";

import type {
  GatewayAdapter,
  ParseResult,
  ParsedEvent,
  PaymentFlow,
  VerifyContext,
  VerifyRequest,
  VerifyResult,
} from "./types";

// O adaptador HMAC de referência.
//
// ════════════════════════════════════════════════════════════════════════
// DE ONDE ISTO VEIO, E O QUE NELE É INVENTADO (E O QUE NÃO É)
//
// A VERIFICAÇÃO não é nova e não é invenção: é o HMAC-SHA256 sobre o corpo
// cru que já estava na rota, com a comparação por `timingSafeEqual` e a
// checagem de comprimento ANTES dela — `timingSafeEqual` lança quando os
// buffers diferem em tamanho, e aquele código já tratava isso. Migrou para
// dentro de um adaptador em vez de ser apagado, porque continua correto para
// provedor que de fato assine.
//
// O FORMATO DE CORPO abaixo é NOSSO, declarado aqui, e não é atribuído a
// provedor nenhum. Isto é dito em voz alta de propósito: a base já foi
// mordida duas vezes por formato suposto (o `x-webhook-signature` projetado
// e nunca observado; o `webhookSecret` pedido ao operador sem destinatário do
// outro lado). Este envelope existe para:
//
//   • dar aos ACs dos blocos C, D, E e F um aviso verificável sem depender
//     de credencial nem de aviso real de produção — que foi a razão de a
//     `LTM-03` ser dividida;
//   • ser o ponto de encaixe de quem assine, com formato acordado.
//
// Nenhum provedor real usa este envelope. O da Paysure é outro (ramifica
// pela chave de topo `cashin`/`cashout`/`refund`, campos em snake_case) e
// está documentado em `docs/research/2026-11-16-paysure-contrato.md` §2 —
// quem o implementa é a `LTM-03b`, não este arquivo.
// ════════════════════════════════════════════════════════════════════════

/** O cabeçalho de assinatura, como a rota de hoje o lia. */
export const HMAC_SIGNATURE_HEADER = "x-webhook-signature";

/**
 * O envelope de referência da plataforma — NOSSO, não de provedor.
 *
 * ```json
 * {
 *   "flow": "cashin",
 *   "eventId": "evt-...",
 *   "orderId": "<uuid de orders.id>",
 *   "amountCents": 6100,
 *   "status": "paid",
 *   "paidAt": "2026-11-17T12:00:00.000Z",
 *   "paymentId": "...",
 *   "endToEndId": "..."
 * }
 * ```
 */
interface ReferenceEnvelope {
  flow?: unknown;
  eventId?: unknown;
  orderId?: unknown;
  amountCents?: unknown;
  status?: unknown;
  paidAt?: unknown;
  paymentId?: unknown;
  endToEndId?: unknown;
}

const FLOWS: readonly PaymentFlow[] = ["cashin", "cashout", "refund"];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function hmacSignatureIsValid(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  // A checagem de comprimento vem ANTES e não é redundante: sem ela,
  // `timingSafeEqual` LANÇA e a rota cai com 500 em vez de recusar com 401.
  // Coberta por teste próprio (AC-B3, segunda parte).
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createHmacGenericAdapter(provider: string): GatewayAdapter {
  const spec = gatewaySpecFor(provider);

  return {
    provider,
    credentialFields: spec.credentialFields,
    signsWebhooks: true,

    verify(request: VerifyRequest, context: VerifyContext): VerifyResult {
      if (!context.isActive) {
        return { ok: false, reason: "Gateway desativado pelo operador." };
      }
      if (!context.webhookSecret) {
        return {
          ok: false,
          reason:
            "Gateway sem segredo de webhook — este provedor assina os avisos e " +
            "não há com o que verificar.",
        };
      }
      const header = request.headers.get(HMAC_SIGNATURE_HEADER) ?? "";
      if (!hmacSignatureIsValid(request.rawBody, header, context.webhookSecret)) {
        return { ok: false, reason: "Assinatura HMAC-SHA256 inválida." };
      }
      return { ok: true };
    },

    parse(payload: unknown): ParseResult {
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return {
          ok: false,
          reason: "Corpo do aviso não é um objeto JSON.",
        };
      }

      const body = payload as ReferenceEnvelope;

      const flowRaw = asString(body.flow) ?? "cashin";
      if (!FLOWS.includes(flowRaw as PaymentFlow)) {
        return { ok: false, reason: `Fluxo desconhecido: "${flowRaw}".` };
      }
      const flow = flowRaw as PaymentFlow;

      const status = asString(body.status);
      if (!status) {
        return { ok: false, reason: "Aviso sem `status`." };
      }

      const eventId = asString(body.eventId);
      if (!eventId) {
        return {
          ok: false,
          reason:
            "Aviso sem `eventId` — sem identificador estável não há chave de " +
            "idempotência, e sem ela a reentrega venderia o número duas vezes.",
        };
      }

      const amountRaw = body.amountCents;
      if (amountRaw !== undefined && amountRaw !== null) {
        if (typeof amountRaw !== "number" || !Number.isInteger(amountRaw)) {
          return {
            ok: false,
            reason:
              "`amountCents` tem de ser inteiro em centavos. Fração de centavo " +
              "não existe, e arredondar aqui esconderia o defeito da origem.",
          };
        }
      }

      const paidAtRaw = asString(body.paidAt);
      let paidAt: Date | null = null;
      if (paidAtRaw) {
        const parsed = new Date(paidAtRaw);
        if (Number.isNaN(parsed.getTime())) {
          return { ok: false, reason: `Data de pagamento inválida: "${paidAtRaw}".` };
        }
        paidAt = parsed;
      }

      const event: ParsedEvent = {
        // Fluxo + referência + status, nunca a referência pelada — ver a
        // razão em `types.ts` (AC-D3).
        externalEventId: `${flow}:${eventId}:${status}`,
        flow,
        status,
        orderRef: asString(body.orderId),
        amountCents: typeof amountRaw === "number" ? amountRaw : null,
        paidAt,
        paymentId: asString(body.paymentId),
        endToEndId: asString(body.endToEndId),
        actionable: flow === "cashin" && status === "paid",
      };

      return { ok: true, event };
    },
  };
}
