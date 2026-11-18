import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentGateways, paymentWebhookEvents, tenants } from "@/db/schema";
import { adapterFor } from "@/lib/payments/providers";
import { redactPersonalData, redactRawBody } from "@/lib/payments/redact";
import {
  settleOrderInTransaction,
  type SettlementRefusal,
} from "@/lib/payments/settle-order";
import { webhookTokenMatches } from "@/lib/payments/webhook-token";
import { isPaymentGatewayProvider } from "@/lib/validations/payment-gateway";
import type { PaymentGatewayProvider } from "@/lib/validations/payment-gateway";

// ════════════════════════════════════════════════════════════════════════
// O RECEPTOR DE AVISO DE PAGAMENTO — ONDE O CAMINHO DO DINHEIRO FECHA
//
// Era um `TODO`. Assinatura válida, evento gravado, pedido intocado: os zero
// pedidos pagos do app tinham exatamente esta causa.
//
// A rota ganhou um quarto segmento, o TOKEN, e ele é obrigatório POR
// CONSTRUÇÃO: sem ele não existe rota. Falhar fechado passa a ser
// propriedade do roteador em vez de uma linha de validação que alguém pode
// remover. A razão de a autenticidade ter mudado de lugar — de assinatura
// para token — está em `src/lib/payments/webhook-token.ts`: a Paysure não
// assina nada, e a `postbackUrl` vai em cada cobrança.
//
// A ORDEM DOS PORTÕES, e por que ela é esta:
//
//   1. provedor conhecido?        404 — a coluna é um enum; não há como
//                                 gravar o que não existe nele
//   2. operador conhecido?        404
//   3. TOKEN confere?             401 + registro. Portão da PLATAFORMA,
//                                 primeiro, porque é o único que é nosso
//   4. existe adaptador?          200 + registro `unsupported_provider`,
//                                 NOMEANDO o provedor (AC-F2)
//   5. o adaptador verifica?      401 + registro. Portão do PROVEDOR
//   6. o adaptador traduz?        200 + registro `invalid_payload`
//   7. reivindicação + decisão + fechamento, numa transação
//
// RESPOSTA 200 PARA O NÃO PROCESSADO (mudança deliberada em relação à
// LTM-03, que pedia erro). A documentação da Paysure orienta responder
// sempre 200, e a razão é concreta: três reentregas não fazem um adaptador
// aparecer, e depois delas o evento é marcado `client_error` NO PAINEL DELA
// — o problema sai da nossa vista. O fail-loud mora no registro e na lista
// do operador. As duas exceções em que o HTTP continua recusando são o token
// inválido e a assinatura inválida, porque ali a reentrega É a resposta
// certa: pode ser configuração a corrigir do outro lado.
// ════════════════════════════════════════════════════════════════════════

type MatchState = (typeof paymentWebhookEvents.$inferInsert)["matchState"];

/**
 * Para onde cada recusa do fechamento vai no registro.
 *
 * Mapa explícito em vez de `default`: recusa nova em `settle-order.ts`
 * quebra o `typecheck` aqui, que é o que impede uma decisão de dinheiro
 * nova de cair em silêncio num estado genérico.
 */
const REFUSAL_TO_STATE: Record<SettlementRefusal, MatchState> = {
  order_not_found: "unmatched",
  already_settled: "already_settled",
  // AC-C6: pagamento atrasado. O estado NOMEIA o estorno pendente, e por
  // construção não há lançamento em `banking_transactions` — é assim que o
  // invariante "nunca pagamento registrado sem número e sem estorno" se
  // mantém.
  order_expired: "refund_pending",
  order_not_live: "refund_pending",
  amount_mismatch: "amount_mismatch",
  unit_conflict: "unit_conflict",
};

interface RejectionRecord {
  tenantId: string;
  provider: PaymentGatewayProvider;
  signatureValid: boolean;
  payload: object;
  state: MatchState;
  reason: string;
}

/**
 * Grava o aviso recusado ANTES de responder.
 *
 * `externalEventId` fica NULO aqui de propósito, e a razão é de segurança:
 * se um aviso rejeitado reservasse a chave de idempotência, bastaria
 * adivinhar um `reference_code` e mandar uma entrega falsa para BLOQUEAR o
 * pagamento de verdade que chegasse depois. Negação de serviço de graça. Em
 * índice único o Postgres trata NULL como distinto de si mesmo, então
 * qualquer número de recusas conviveem sem travar nada.
 */
async function recordRejection(record: RejectionRecord): Promise<void> {
  await db.insert(paymentWebhookEvents).values({
    tenantId: record.tenantId,
    provider: record.provider,
    signatureValid: record.signatureValid,
    payload: record.payload,
    externalEventId: null,
    matchState: record.state,
    matchReason: record.reason,
  });
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ tenant: string; provider: string; token: string }> },
) {
  const { tenant: tenantSlug, provider: providerParam, token } = await params;

  // ── Portão 1 — provedor conhecido.
  if (!isPaymentGatewayProvider(providerParam)) {
    return NextResponse.json({ error: "Provedor desconhecido." }, { status: 404 });
  }
  const provider: PaymentGatewayProvider = providerParam;

  // ── Portão 2 — operador conhecido.
  const [tenant] = await db
    .select({ id: tenants.id })
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
        eq(paymentGateways.provider, provider),
      ),
    )
    .limit(1);

  const rawBody = await req.text();

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = { raw: redactRawBody(rawBody) };
  }

  // Mascarado ANTES de qualquer escrita, em TODOS os caminhos — inclusive
  // nos recusados. Aviso rejeitado também traz CPF, e rejeitar não é razão
  // para guardar (portão G7, `src/lib/payments/redact.ts`).
  const safePayload = (redactPersonalData(parsedBody) ?? {}) as object;

  // ── Portão 3 — o token. Autenticidade da PLATAFORMA.
  if (!gateway || !gateway.isActive || !gateway.webhookToken) {
    await recordRejection({
      tenantId: tenant.id,
      provider,
      signatureValid: false,
      payload: safePayload,
      state: "unauthenticated",
      reason: !gateway
        ? `Nenhum gateway "${provider}" configurado para este operador.`
        : !gateway.isActive
          ? `O gateway "${provider}" está desativado pelo operador.`
          : `O gateway "${provider}" não tem token de webhook emitido.`,
    });
    return NextResponse.json(
      { processed: false, state: "unauthenticated", error: "Não autorizado." },
      { status: 401 },
    );
  }

  if (!webhookTokenMatches(token, gateway.webhookToken)) {
    await recordRejection({
      tenantId: tenant.id,
      provider,
      signatureValid: false,
      payload: safePayload,
      state: "unauthenticated",
      reason: "Token da URL não corresponde ao emitido para este gateway.",
    });
    return NextResponse.json(
      { processed: false, state: "unauthenticated", error: "Não autorizado." },
      { status: 401 },
    );
  }

  // ── Portão 4 — existe adaptador para este provedor?
  const adapter = adapterFor(provider);
  if (!adapter) {
    const reason =
      `O provedor "${provider}" está na lista de provedores mas não tem adaptador ` +
      `implementado — o aviso NÃO foi processado e nenhum pedido foi tocado. ` +
      `Implementar adaptador sem contrato acordado é inventar formato.`;
    await recordRejection({
      tenantId: tenant.id,
      provider,
      signatureValid: false,
      payload: safePayload,
      state: "unsupported_provider",
      reason,
    });
    return NextResponse.json(
      { processed: false, state: "unsupported_provider", provider, reason },
      { status: 200 },
    );
  }

  // ── Portão 5 — a verificação do PROVEDOR.
  const verification = adapter.verify(
    { rawBody, headers: req.headers, token },
    {
      provider,
      webhookSecret: gateway.webhookSecret,
      isActive: gateway.isActive,
    },
  );

  if (!verification.ok) {
    await recordRejection({
      tenantId: tenant.id,
      provider,
      signatureValid: false,
      payload: safePayload,
      state: "unauthenticated",
      reason: verification.reason,
    });
    return NextResponse.json(
      { processed: false, state: "unauthenticated", error: "Assinatura inválida." },
      { status: 401 },
    );
  }

  // ── Portão 6 — a tradução.
  const parsed = adapter.parse(parsedBody);
  if (!parsed.ok) {
    await recordRejection({
      tenantId: tenant.id,
      provider,
      signatureValid: true,
      payload: safePayload,
      state: "invalid_payload",
      reason: parsed.reason,
    });
    return NextResponse.json(
      { processed: false, state: "invalid_payload", reason: parsed.reason },
      { status: 200 },
    );
  }

  const event = parsed.event;

  // ── Portão 7 — reivindicar, decidir e fechar. Tudo numa transação.
  //
  // ⚠️ A REIVINDICAÇÃO É A PRÓPRIA INSERÇÃO DO EVENTO, e é o que torna a
  // idempotência real em vez de "consultei antes de escrever" (AC-D2).
  //
  // Duas entregas do mesmo evento em paralelo: as duas tentam inserir a
  // mesma chave `(tenant_id, provider, external_event_id)`. Uma insere; a
  // outra fica BLOQUEADA no índice único até a primeira cometer, e então o
  // `ON CONFLICT DO NOTHING` devolve zero linhas — ela sabe que perdeu, sem
  // ter lido nada antes de escrever. Não há janela entre a consulta e a
  // escrita porque não há consulta.
  //
  // E porque reivindicação e fechamento estão na MESMA transação, não existe
  // o estado "evento reivindicado e pedido não fechado": se o fechamento
  // falhar por infra, a reivindicação volta atrás junto e a reentrega do
  // provedor (~5 min) encontra o caminho limpo.
  const outcome = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(paymentWebhookEvents)
      .values({
        tenantId: tenant.id,
        provider,
        signatureValid: true,
        payload: safePayload,
        externalEventId: event.externalEventId,
        matchState: "received",
        amountCents: event.amountCents,
      })
      .onConflictDoNothing({
        target: [
          paymentWebhookEvents.tenantId,
          paymentWebhookEvents.provider,
          paymentWebhookEvents.externalEventId,
        ],
      })
      .returning({ id: paymentWebhookEvents.id });

    if (!claimed) {
      // Duplicata. A entrega repetida não é descartada: ela incrementa o
      // contador do evento original (AC-D4). Reentrega invisível é
      // incidente sem rastro.
      const [bumped] = await tx
        .update(paymentWebhookEvents)
        .set({
          deliveryCount: sql`${paymentWebhookEvents.deliveryCount} + 1`,
        })
        .where(
          and(
            eq(paymentWebhookEvents.tenantId, tenant.id),
            eq(paymentWebhookEvents.provider, provider),
            eq(paymentWebhookEvents.externalEventId, event.externalEventId),
          ),
        )
        .returning({
          deliveryCount: paymentWebhookEvents.deliveryCount,
          matchState: paymentWebhookEvents.matchState,
        });

      return {
        status: 200,
        body: {
          processed: false,
          state: "duplicate",
          deliveries: bumped?.deliveryCount ?? null,
          firstOutcome: bumped?.matchState ?? null,
        },
      };
    }

    const finish = async (
      state: MatchState,
      reason: string,
      orderId: string | null,
      httpStatus = 200,
    ) => {
      await tx
        .update(paymentWebhookEvents)
        .set({ matchState: state, matchReason: reason, orderId })
        .where(eq(paymentWebhookEvents.id, claimed.id));
      return {
        status: httpStatus,
        body: { processed: false, state, reason },
      };
    };

    // Status que esta story não trata: registrado, não aplicado (AC-F3).
    // Estorno automático está no Escopo OUT — `refunded` é REGISTRADO, e o
    // evento dele é DISTINTO do de `paid` porque a chave inclui o status.
    if (!event.actionable) {
      return finish(
        "not_actionable",
        `Aviso de fluxo "${event.flow}" com status "${event.status}": registrado, ` +
          `nenhum pedido alterado. Esta story só fecha cash-in confirmado.`,
        null,
      );
    }

    if (!event.orderRef) {
      return finish(
        "unmatched",
        "Aviso sem referência externa — não há por onde casar com um pedido. " +
          "O casamento é por referência explícita, nunca por heurística de valor.",
        null,
      );
    }

    const settlement = await settleOrderInTransaction(tx, {
      orderId: event.orderRef,
      tenantId: tenant.id,
      description: `Pagamento confirmado — ${provider}`,
      expectedAmountCents: event.amountCents,
      paymentId: event.paymentId,
      endToEndId: event.endToEndId,
      externalReference: event.orderRef,
      paidAt: event.paidAt,
    });

    if (!settlement.ok) {
      const state = REFUSAL_TO_STATE[settlement.refusal];
      // O pedido fica ligado ao evento quando ele existe — é o que faz a
      // lista do operador ser fila de revisão e não só registro.
      const orderId =
        settlement.refusal === "order_not_found" ? null : event.orderRef;
      return finish(state, settlement.detail, orderId);
    }

    await tx
      .update(paymentWebhookEvents)
      .set({
        matchState: "settled",
        matchReason: `Pedido fechado: ${settlement.unitsSold} unidade(s) vendida(s), R$ ${settlement.amount}.`,
        orderId: settlement.orderId,
      })
      .where(eq(paymentWebhookEvents.id, claimed.id));

    return {
      status: 200,
      body: {
        processed: true,
        state: "settled",
        orderId: settlement.orderId,
        unitsSold: settlement.unitsSold,
      },
    };
  });

  return NextResponse.json(outcome.body, { status: outcome.status });
}
