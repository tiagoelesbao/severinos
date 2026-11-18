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

// O adaptador da Paysure — o gateway de produção do Império (LTM-03b).
//
// Contrato: `docs/research/2026-11-16-paysure-contrato.md`, lido da
// documentação oficial em 2026-11-16 e reaprofundado em 2026-11-18. Nada
// aqui é formato suposto: cada campo abaixo tem parágrafo de origem.
//
// ════════════════════════════════════════════════════════════════════════
// 1. NÃO HÁ VERIFICAÇÃO DE ASSINATURA PORQUE NÃO HÁ ASSINATURA
//
// Isto está escrito em voz alta de propósito, e não é modéstia de
// comentário: é a regressão de um defeito que esta base já cometeu.
//
// A Paysure NÃO assina os avisos. Sem HMAC, sem cabeçalho de assinatura,
// sem segredo compartilhado (§2 do contrato). A orientação dela é validar
// que o IP de origem é da Cloudflare — faixa pública, compartilhada por
// milhões de domínios, e por isso defesa ADICIONAL, nunca substituta.
//
// Além disso não existe onde informar um segredo: a `postbackUrl` vai em
// CADA cobrança, não é cadastrada uma vez num painel. Então o campo
// "Segredo do Webhook" que a tela pedia ao operador não tinha
// destinatário do outro lado — e a verificação HMAC-SHA256 em
// `x-webhook-signature` que vivia na rota rejeitaria **100%** dos avisos da
// Paysure com 401.
//
// ⚠️ SE VOCÊ ABRIU ESTE ARQUIVO ACHANDO QUE FALTA UM HMAC AQUI: não falta.
// A autenticidade é o TOKEN OPACO no caminho da URL, emitido por nós por
// `(tenant, provider)` e conferido pela rota antes de o adaptador ser
// chamado (`src/lib/payments/webhook-token.ts`, portão 3 da rota).
// "Consertar" isto inventando um HMAC é exatamente o erro que a `LTM-03`
// ia cometer.
//
// ⚠️ E ISTO VAI MUDAR. A página de webhooks da Paysure registra validação
// HMAC como **"em breve"** (§9.5 do contrato). Quando ela existir, o
// adaptador ganha verificação de assinatura **ALÉM** do token da URL — não
// em lugar dele. O token é nosso e continua valendo; a assinatura é dela e
// passa a valer também.
//
// ════════════════════════════════════════════════════════════════════════
// 2. O `event` DO REFUND MORA NA CHAVE DE IDEMPOTÊNCIA, NÃO EM `ParsedEvent`
//
// A nota de ondas da story deixou DOIS caminhos aceitáveis para o AC6c e
// pediu escolha explícita. A escolha, com a razão:
//
//   ESCOLHIDO  compor `externalEventId = refund:{reference_code}:{event}` e
//              deixar o valor literal de `event` (e de `reason`) no payload
//              cru, que a rota já grava em `payment_webhook_events.payload`
//              antes de qualquer decisão.
//
//   RECUSADO   acrescentar um campo opcional em `ParsedEvent`.
//
// Por que: `types.ts` é o contrato COMUM aos 18 adaptadores. Acrescentar
// campo lá para um sub-caso de um provedor — num fluxo que esta story
// explicitamente NÃO processa (estorno está no Escopo OUT) — alarga o
// contrato de todos para servir um. E o literal não se perde: ele está no
// payload persistido e no `match_reason`, que é o que a lista do operador
// mostra. Se e quando o estorno passar a ser PROCESSADO, o campo em
// `ParsedEvent` deixa de ser conveniência e passa a ser necessidade — e
// aí é requisito novo, com story própria, não refazimento deste arquivo.
//
// Consequência verificada pelo AC6c: `event` desconhecido é RECUSA NOMEADA
// com o valor literal, nunca ramo genérico.
// ════════════════════════════════════════════════════════════════════════

export const PAYSURE_PROVIDER = "paysure";

/**
 * O esquema de autenticidade do provedor, declarado como valor.
 *
 * O AC4 exige que o adaptador "declare `signature: "none"`" — e declarar em
 * comentário não é declarar. `GatewayAdapter` (comum aos 18) só tem o
 * booleano `signsWebhooks`; este literal é a declaração nomeada, local, que
 * o teste lê.
 */
export const PAYSURE_SIGNATURE_SCHEME = "none" as const;

/**
 * Os status de cash-in que este adaptador conhece.
 *
 * ⚠️ TRÊS, e a própria documentação da Paysure se contradiz sobre isso
 * (§9.2 do contrato):
 *
 *   concepts/webhooks.md          paid · refunded · expired        (três)
 *   cashin/consult.md             pending · paid · expired ·
 *                                 refunded · failed               (cinco)
 *
 * `pending` e `failed` existem no modelo da CONSULTA e não aparecem na
 * lista de AVISOS. Não há como saber se a Paysure não avisa esses dois ou
 * se a página de webhooks está incompleta — e a diferença importa: um aviso
 * com `failed` contra um `parse` de três status ou estoura, ou — pior — cai
 * num ramo genérico e é tratado como coisa nenhuma.
 *
 * A regra desta lista: ela enumera o que o AVISO documenta. Qualquer outro
 * valor, inclusive os dois que a consulta lista, é RECUSA NOMEADA com o
 * literal registrado (AC6b). Nunca ignora, nunca assume.
 */
export const PAYSURE_CASHIN_STATUSES = ["paid", "refunded", "expired"] as const;

/** Cash-out, §2 do contrato. Reconhecido e registrado, não processado. */
export const PAYSURE_CASHOUT_STATUSES = ["paid", "refunded"] as const;

/** Refund/MED, §2 e §9.4. Reconhecido e registrado, não processado. */
export const PAYSURE_REFUND_STATUSES = ["refunded"] as const;

/**
 * Os valores de `event` do refund que este adaptador conhece.
 *
 * A documentação dá **um** exemplo (`"med_block"`) e não enumera o
 * conjunto — é desconhecido quantos existem (§9.4). Por isso a lista é
 * curta de propósito e a ausência de um valor nela NÃO é descuido: é o
 * AC6c funcionando. Acrescentar valor aqui exige vê-lo documentado ou
 * recebido, não supô-lo.
 */
export const PAYSURE_REFUND_EVENTS = ["med_block"] as const;

const STATUSES_BY_FLOW: Record<PaymentFlow, readonly string[]> = {
  cashin: PAYSURE_CASHIN_STATUSES,
  cashout: PAYSURE_CASHOUT_STATUSES,
  refund: PAYSURE_REFUND_STATUSES,
};

/** As três chaves de topo pelas quais o aviso ramifica (§2). */
export const PAYSURE_FLOW_KEYS: readonly PaymentFlow[] = [
  "cashin",
  "cashout",
  "refund",
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** O que a Paysure chama de corpo do aviso, antes de qualquer validação. */
interface PaysureNotificationBody {
  reference_code?: unknown;
  external_reference?: unknown;
  value_cents?: unknown;
  amount_cents?: unknown;
  status?: unknown;
  payment_date?: unknown;
  registration_date?: unknown;
  occurred_at?: unknown;
  end_to_end?: unknown;
  content?: unknown;
  event?: unknown;
  reason?: unknown;
}

/**
 * O valor afirmado, em centavos.
 *
 * ⚠️ DOIS NOMES PARA O MESMO CAMPO, e a divergência é da documentação, não
 * nossa: §2 mostra o refund com `amount_cents`, e §9.4 afirma que o refund
 * é "o cash-in com um evento em cima" — o que implica `value_cents`. Os
 * dois são aceitos, com `value_cents` tendo precedência, porque é o nome
 * usado nos três outros lugares onde a documentação fala de valor
 * (criação, cash-in, consulta). Divergência registrada como achado da
 * LTM-03b, não resolvida por suposição.
 */
function readCents(
  body: PaysureNotificationBody,
): { ok: true; cents: number | null } | { ok: false; reason: string } {
  const raw = body.value_cents ?? body.amount_cents;
  if (raw === undefined || raw === null) return { ok: true, cents: null };
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return {
      ok: false,
      reason:
        `Valor do aviso não é inteiro em centavos: ${JSON.stringify(raw)}. ` +
        `A Paysure manda \`value_cents\` como inteiro (§4.1); fração de centavo ` +
        `não existe, e arredondar aqui esconderia o defeito da origem.`,
    };
  }
  return { ok: true, cents: raw };
}

export type PaysureAdapter = GatewayAdapter & {
  /** O esquema de assinatura do provedor — `"none"`, e está declarado. */
  readonly signatureScheme: typeof PAYSURE_SIGNATURE_SCHEME;
};

export function createPaysureAdapter(): PaysureAdapter {
  const spec = gatewaySpecFor(PAYSURE_PROVIDER);

  return {
    provider: PAYSURE_PROVIDER,
    credentialFields: spec.credentialFields,
    // Falso porque o provedor não assina, e não porque alguém deixou de
    // implementar. Ver o bloco 1 no topo deste arquivo.
    signsWebhooks: false,
    signatureScheme: PAYSURE_SIGNATURE_SCHEME,

    /**
     * Não há assinatura a conferir — só o estado do gateway.
     *
     * O que torna o aviso autêntico é o token do caminho da URL, que a rota
     * já conferiu no portão 3 antes de chegar aqui (`request.token` existe
     * e é o mesmo valor). Repetir a comparação aqui daria a impressão de
     * uma segunda camada que não existe; a camada é uma, e é a rota.
     *
     * O único portão que sobra para o adaptador é `isActive`: gateway
     * desligado pelo operador não processa aviso, e isso é decisão do
     * operador, não autenticidade.
     */
    verify(_request: VerifyRequest, context: VerifyContext): VerifyResult {
      if (!context.isActive) {
        return { ok: false, reason: "Gateway paysure desativado pelo operador." };
      }
      return { ok: true };
    },

    parse(payload: unknown): ParseResult {
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return { ok: false, reason: "Corpo do aviso da paysure não é um objeto JSON." };
      }

      const envelope = payload as Record<string, unknown>;

      // ── O aviso ramifica pela CHAVE DE TOPO, não por um campo `type`
      // (§2 do contrato, AC1). Corpo sem nenhuma das três chaves é RECUSADO
      // — nunca interpretado como cash-in por ser o fluxo que nos
      // interessa.
      const present = PAYSURE_FLOW_KEYS.filter((key) => key in envelope);

      if (present.length === 0) {
        return {
          ok: false,
          reason:
            `Aviso da paysure sem chave de topo conhecida. Esperado uma de ` +
            `${PAYSURE_FLOW_KEYS.map((k) => `"${k}"`).join(", ")} e veio ` +
            `${Object.keys(envelope).map((k) => `"${k}"`).join(", ") || "nenhuma chave"}.`,
        };
      }
      if (present.length > 1) {
        // Dois fluxos no mesmo corpo não existe no contrato. Escolher um
        // seria adivinhar qual dinheiro se moveu.
        return {
          ok: false,
          reason:
            `Aviso da paysure com mais de uma chave de topo: ` +
            `${present.map((k) => `"${k}"`).join(", ")}. Não há como saber qual ` +
            `fluxo o aviso descreve.`,
        };
      }

      const flow = present[0];
      const raw = envelope[flow];
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        return {
          ok: false,
          reason: `A chave "${flow}" do aviso da paysure não contém um objeto.`,
        };
      }
      const body = raw as PaysureNotificationBody;

      // ── `reference_code` é a referência do provedor, e é metade da chave
      // de idempotência. Sem ela a reentrega venderia o número duas vezes.
      const referenceCode = asString(body.reference_code);
      if (!referenceCode) {
        return {
          ok: false,
          reason:
            `Aviso de "${flow}" sem \`reference_code\` — é o identificador estável ` +
            `do evento na Paysure (§3) e metade da chave de idempotência. Sem ele ` +
            `uma reentrega seria indistinguível de um pagamento novo.`,
        };
      }

      // ── O status, enumerado. Qualquer outro valor é recusa NOMEADA com o
      // literal (AC6b). A razão é a contradição da própria documentação —
      // ver `PAYSURE_CASHIN_STATUSES`.
      const status = asString(body.status);
      if (!status) {
        return { ok: false, reason: `Aviso de "${flow}" sem \`status\`.` };
      }
      const known = STATUSES_BY_FLOW[flow];
      if (!known.includes(status)) {
        return {
          ok: false,
          reason:
            `Status desconhecido no fluxo "${flow}" da paysure: "${status}". ` +
            `Conhecidos: ${known.map((s) => `"${s}"`).join(", ")}. O aviso foi ` +
            `REGISTRADO com o valor literal e nenhum pedido foi tocado — a ` +
            `documentação da Paysure lista status diferentes em duas páginas ` +
            `(§9.2), então valor fora da lista é achado, não ramo genérico.`,
        };
      }

      // ── O refund ramifica DUAS vezes: pela chave de topo e pelo `event`
      // de dentro (§9.4, AC6c). O cash-out, não: ele tem corpo magro
      // próprio e nenhum `event`.
      let refundEvent: string | null = null;
      if (flow === "refund") {
        const declared = body.event;
        if (declared !== undefined && declared !== null) {
          const value = asString(declared);
          if (!value || !(PAYSURE_REFUND_EVENTS as readonly string[]).includes(value)) {
            return {
              ok: false,
              reason:
                `Evento de refund desconhecido na paysure: ` +
                `${JSON.stringify(declared)}. Conhecidos: ` +
                `${PAYSURE_REFUND_EVENTS.map((e) => `"${e}"`).join(", ")}. A ` +
                `documentação dá UM exemplo e não enumera o conjunto (§9.4), então ` +
                `valor fora da lista é registrado com o literal e nada é aplicado.`,
            };
          }
          refundEvent = value;
        }
        // `event` AUSENTE é aceito de propósito: o corpo de refund
        // documentado em §2 não tem `event` nenhum, e §9.4 o descreve como
        // acréscimo. Exigir o campo recusaria o formato que a própria
        // documentação mostra primeiro.
      }

      const cents = readCents(body);
      if (!cents.ok) return { ok: false, reason: cents.reason };

      // `payment_date` é quando pagou; `occurred_at` é quando o evento se
      // deu (cash-out e refund não têm `payment_date`). `registration_date`
      // — quando a cobrança NASCEU, §9.3 — não entra aqui de propósito: ele
      // não é data de pagamento, e usá-lo como tal marcaria o pedido como
      // pago na hora em que o QR foi gerado.
      const whenRaw = asString(body.payment_date) ?? asString(body.occurred_at);
      let paidAt: Date | null = null;
      if (whenRaw) {
        const parsed = new Date(whenRaw);
        if (Number.isNaN(parsed.getTime())) {
          return {
            ok: false,
            reason: `Data inválida no aviso de "${flow}" da paysure: "${whenRaw}".`,
          };
        }
        paidAt = parsed;
      }

      const event: ParsedEvent = {
        // `{fluxo}:{reference_code}:{status}` — e no refund com `event`, o
        // `event` ocupa a terceira posição, porque dois eventos MED
        // distintos da mesma transação chegam com o mesmo
        // `reference_code` e o mesmo `status: "refunded"`. Ver o bloco 2 no
        // topo deste arquivo.
        externalEventId:
          flow === "refund" && refundEvent
            ? `refund:${referenceCode}:${refundEvent}`
            : `${flow}:${referenceCode}:${status}`,
        flow,
        status,
        // `external_reference` É o nosso `orders.id` — mandado como
        // `external_id` na criação da cobrança (§3).
        orderRef: asString(body.external_reference),
        amountCents: cents.cents,
        paidAt,
        // `reference_code` faz dois trabalhos: parte da chave de
        // idempotência e `banking_transactions.payment_id`.
        paymentId: referenceCode,
        // O E2E do arranjo PIX — o único identificador que o Banco Central
        // reconhece e o único que serve para rastrear o dinheiro fora daqui.
        endToEndId: asString(body.end_to_end),
        // Só cash-in confirmado fecha pedido. `refunded`, `expired`,
        // cash-out e refund são REGISTRADOS com estado próprio e não
        // revertem nada — estorno e saque estão no Escopo OUT.
        actionable: flow === "cashin" && status === "paid",
      };

      return { ok: true, event };
    },
  };
}
