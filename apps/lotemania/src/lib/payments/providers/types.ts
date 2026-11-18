import type { CredentialField } from "@/lib/validations/payment-gateway";

// O arcabouço de adaptador por provedor (LTM-03a, item 6 da arquitetura).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE A VERIFICAÇÃO MORA NO ADAPTADOR, E NÃO NA ROTA
//
// Porque o esquema de autenticidade é DO PROVEDOR, não da plataforma — e a
// Paysure prova isso da forma mais incômoda possível: o esquema dela é
// "nenhum". Uma rota que verifica HMAC para todo mundo não tem como
// representar um provedor que não assina, a não ser desligando a
// verificação para todos.
//
// O que a rota faz, e é o que ela deve fazer:
//   1. autenticidade da PLATAFORMA — o token na URL, que nós emitimos
//   2. resolver o adaptador, e RECUSAR EM VOZ ALTA quem não tem (AC-F2)
//   3. deixar o adaptador verificar o que é dele
//   4. deixar o adaptador traduzir o corpo
//   5. decidir e fechar, numa transação
//
// Esta story entrega o arcabouço + o adaptador HMAC de referência. O
// adaptador da `paysure` é a `LTM-03b`.
// ════════════════════════════════════════════════════════════════════════

/** Os fluxos de dinheiro que um aviso pode descrever. */
export type PaymentFlow = "cashin" | "cashout" | "refund";

export interface VerifyRequest {
  /** O corpo CRU, byte a byte — é sobre ele que se calcula HMAC. */
  readonly rawBody: string;
  readonly headers: Headers;
  /** O token da URL, já conferido pela rota. Disponível a quem precise. */
  readonly token: string;
}

export interface VerifyContext {
  readonly provider: string;
  readonly webhookSecret: string | null;
  readonly isActive: boolean;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export interface ParsedEvent {
  /**
   * A chave de idempotência, COMPOSTA pelo adaptador (AC-D3).
   *
   * ⚠️ Não é o `reference_code` pelado, e a diferença custa dinheiro. A
   * Paysure orienta deduplicar por `reference_code` — e o aviso de `paid` e o
   * de `refunded` (chargeback, disputa MED) da MESMA transação chegam com o
   * MESMO `reference_code`. Unicidade só por ele recusaria o estorno como
   * duplicata, e estorno recusado em silêncio é faturamento falso no painel
   * do operador.
   *
   * A forma é `{fluxo}:{reference_code}:{status}`: estável entre reentregas
   * (o corpo é o mesmo), distinta entre transições do ciclo de vida.
   */
  readonly externalEventId: string;
  readonly flow: PaymentFlow;
  readonly status: string;
  /** O nosso `orders.id`, que mandamos como `external_id` na cobrança. */
  readonly orderRef: string | null;
  readonly amountCents: number | null;
  readonly paidAt: Date | null;
  readonly paymentId: string | null;
  readonly endToEndId: string | null;
  /**
   * Este aviso deve FECHAR um pedido?
   *
   * Só cash-in confirmado é acionável nesta story. `refunded` e `expired`
   * são registrados com estado próprio e motivo, e não revertem nada
   * (AC-F3) — estorno automático está no Escopo OUT.
   */
  readonly actionable: boolean;
}

export type ParseResult =
  | { ok: true; event: ParsedEvent }
  | { ok: false; reason: string };

export interface GatewayAdapter {
  readonly provider: string;
  /** Lido da descrição única em `lib/validations/payment-gateway.ts`. */
  readonly credentialFields: readonly CredentialField[];
  readonly signsWebhooks: boolean;
  verify(request: VerifyRequest, context: VerifyContext): VerifyResult;
  parse(payload: unknown): ParseResult;
}
