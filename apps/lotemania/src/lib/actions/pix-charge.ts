"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, paymentGateways, pixCharges, products, tenants } from "@/db/schema";
import { decryptCredentials } from "@/lib/crypto";
import { toCents } from "@/lib/payments/money";
import {
  chargeExpirationSecondsFor,
  createPixCharge,
  type PaysureFailureKind,
} from "@/lib/payments/paysure-client";
import { webhookPath } from "@/lib/payments/webhook-url";
import { PAYSURE_PROVIDER } from "@/lib/payments/providers/paysure";

// A cobrança PIX do pedido: criar ou RECUPERAR (LTM-03b, item 4).
//
// ════════════════════════════════════════════════════════════════════════
// A ORDEM "LER A NOSSA LINHA ANTES DE CHAMAR" É O DESENHO, NÃO OTIMIZAÇÃO
//
// A Paysure devolve 409 para `external_id` repetido — idempotência de graça
// do lado dela (§3), que este código USA em vez de reimplementar. O que o
// 409 **não** devolve é o `content`, isto é, o BR Code. E a consulta
// (`POST /v1/pix/cashin/consult`, §9.1) também não devolve: ela dá status e
// `reference_code`, não o código de pagar.
//
// Então a sequência é:
//
//   1. já temos linha em `pix_charges`?  → devolve ela, sem chamar ninguém
//   2. não temos                          → chama a Paysure e GRAVA
//   3. a Paysure diz 409                  → relê a nossa linha
//   4. 409 e linha nenhuma                → FALHA ALTO, nomeando (AC9)
//
// O passo 4 é o único estado sem saída, e ele só ocorre se a gravação falhar
// DEPOIS da chamada. Falhar alto ali é a diferença entre "o operador vê um
// item para resolver" e "o comprador vê uma tela sem código de pagamento e
// vai embora".
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE `"use server"` AQUI, E O QUE ISSO IMPÕE
//
// Esta é a ação que a tela do pedido chama. Toda exportação deste arquivo é
// um endpoint chamável pelo cliente, e as duas abaixo são assíncronas por
// causa disso — não por preferência.
//
// A exposição é a mesma que `simulatePayment(orderId)` já tem e a mesma da
// própria tela do pedido, que é pública por `orderId`: quem conhece o id do
// pedido pode gerar o código de pagar DAQUELE pedido, pelo valor DAQUELE
// pedido. Não há escalada — o dinheiro vai para o operador em qualquer
// caso. Autorização por dono de pedido é decisão de produto (o comprador se
// identifica por telefone, sem sessão) e não entra aqui.
// ════════════════════════════════════════════════════════════════════════

/** As recusas desta ação, nomeadas. Nenhuma é "erro ao gerar cobrança". */
export type PixChargeRefusal =
  | "order_not_found"
  | "order_not_pending"
  | "no_active_gateway"
  | "missing_credentials"
  | "missing_webhook_token"
  | "missing_base_url"
  | "provider_refused"
  /** 409 sem a nossa linha — o único estado sem saída (AC9). */
  | "duplicate_without_charge";

export interface PixChargeView {
  readonly referenceCode: string;
  /** O BR Code copia-e-cola — `qrcode.content`. */
  readonly brCode: string;
  readonly expiresAt: Date;
  /** Esta chamada criou a cobrança, ou recuperou a que já existia? */
  readonly created: boolean;
}

export type PixChargeOutcome =
  | ({ readonly ok: true } & PixChargeView)
  | {
      readonly ok: false;
      readonly refusal: PixChargeRefusal;
      /** A classe da resposta do provedor, quando a recusa veio dele. */
      readonly providerKind: PaysureFailureKind | null;
      /** O item vai para a lista do operador? */
      readonly operatorAction: boolean;
      readonly reason: string;
    };

function refuse(
  refusal: PixChargeRefusal,
  reason: string,
  opts: { operatorAction?: boolean; providerKind?: PaysureFailureKind | null } = {},
): PixChargeOutcome {
  return {
    ok: false,
    refusal,
    providerKind: opts.providerKind ?? null,
    operatorAction: opts.operatorAction ?? true,
    reason,
  };
}

/**
 * A base pública do app, para montar a `postbackUrl`.
 *
 * ⚠️ A `postbackUrl` vai em CADA cobrança — não é cadastrada uma vez num
 * painel (§2). Então ela tem de ser ABSOLUTA e tem de estar certa no momento
 * da cobrança: uma base errada aqui significa aviso de pagamento entregue em
 * lugar nenhum, com o dinheiro recebido e o pedido pendurado para sempre.
 *
 * Falha alto nomeando a variável, no padrão de `src/lib/crypto.ts`: um
 * `?? "http://localhost:3000"` silencioso é exatamente como se produz esse
 * estado em produção.
 */
function appBaseUrl(): { ok: true; value: string } | { ok: false; reason: string } {
  const explicit = process.env.APP_PUBLIC_BASE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : "");

  if (!raw) {
    return {
      ok: false,
      reason:
        "APP_PUBLIC_BASE_URL não está definida. Ela é a base da `postbackUrl` " +
        "que vai em CADA cobrança da Paysure — sem ela o aviso de pagamento " +
        "não tem para onde voltar, e o pedido ficaria pago na Paysure e " +
        "pendente aqui. Defina em .env.local (ex.: https://sorteios.exemplo.br). " +
        "Na Vercel, VERCEL_PROJECT_PRODUCTION_URL serve como padrão.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      reason: `APP_PUBLIC_BASE_URL="${raw}" não é uma URL absoluta válida.`,
    };
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    // A Paysure declara `postbackUrl` como URI HTTPS (§4.1). `localhost` é
    // aberto só para desenvolvimento, onde a Paysure não alcança nada de
    // todo modo.
    return {
      ok: false,
      reason:
        `APP_PUBLIC_BASE_URL="${raw}" não é HTTPS, e a Paysure declara ` +
        `\`postbackUrl\` como URI HTTPS (§4.1).`,
    };
  }
  return { ok: true, value: raw.replace(/\/+$/, "") };
}

/**
 * Lê a cobrança já gravada do pedido, sem criar nada.
 *
 * É o que a tela do pedido chama ao renderizar: GET não cria cobrança. A
 * criação é ato explícito do comprador, pelo botão.
 */
export async function readPixCharge(orderId: string): Promise<PixChargeView | null> {
  const [row] = await db
    .select({
      referenceCode: pixCharges.referenceCode,
      brCode: pixCharges.brCode,
      expiresAt: pixCharges.expiresAt,
    })
    .from(pixCharges)
    .where(eq(pixCharges.orderId, orderId))
    .limit(1);

  if (!row) return null;
  return { ...row, created: false };
}

/**
 * Há gateway de pagamento ATIVO para este operador?
 *
 * É o que decide se o botão "Simular pagamento (ambiente de teste)" aparece
 * (AC13). A pergunta é "existe caminho de dinheiro de verdade?", e a
 * resposta certa não é "o tenant configurou algo" — é "o tenant tem um
 * gateway LIGADO". Gateway configurado e desligado continua sem receber
 * aviso (a rota recusa em `isActive`), então a simulação segue sendo o único
 * caminho e tem de continuar visível.
 */
export async function tenantHasActiveGateway(tenantId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: paymentGateways.id })
    .from(paymentGateways)
    .where(
      and(eq(paymentGateways.tenantId, tenantId), eq(paymentGateways.isActive, true)),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Cria a cobrança PIX do pedido, ou devolve a que já existe.
 *
 * Idempotente dos dois lados: pela nossa linha em `pix_charges` e pelo 409
 * da Paysure. Nunca cria duas cobranças para o mesmo pedido.
 */
export async function ensurePixCharge(orderId: string): Promise<PixChargeOutcome> {
  // ── 1. A nossa linha vem primeiro. Se existe, ninguém é chamado.
  const existing = await readPixCharge(orderId);
  if (existing) return { ok: true, ...existing };

  const [order] = await db
    .select({
      id: orders.id,
      tenantId: orders.tenantId,
      productId: orders.productId,
      amount: orders.amount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return refuse("order_not_found", `Nenhum pedido com id ${orderId}.`);
  }
  if (order.status !== "pending") {
    // Cobrar pedido pago, expirado ou cancelado é criar caminho para o
    // comprador pagar o que já pagou ou o que já não é dele.
    return refuse(
      "order_not_pending",
      `O pedido ${orderId} está "${order.status}" — só pedido pendente recebe ` +
        `cobrança. Pedido pago não é cobrado de novo; pedido expirado perdeu as ` +
        `unidades e cobrá-lo seria vender o que não temos.`,
      { operatorAction: false },
    );
  }

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, order.tenantId))
    .limit(1);
  if (!tenant) {
    return refuse(
      "order_not_found",
      `O pedido ${orderId} aponta para um operador que não existe.`,
    );
  }

  // O sorteio, porque a janela da reserva — e com ela o
  // `expiration_seconds` da cobrança — é função DELE (AC7, AC14).
  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      advancedSettings: products.advancedSettings,
    })
    .from(products)
    .where(eq(products.id, order.productId))
    .limit(1);
  if (!product) {
    return refuse(
      "order_not_found",
      `O pedido ${orderId} aponta para um sorteio que não existe.`,
    );
  }

  // ── 2. O gateway da paysure, LIGADO, com credencial e token.
  const [gateway] = await db
    .select({
      credentialsEncrypted: paymentGateways.credentialsEncrypted,
      webhookToken: paymentGateways.webhookToken,
      isActive: paymentGateways.isActive,
    })
    .from(paymentGateways)
    .where(
      and(
        eq(paymentGateways.tenantId, order.tenantId),
        eq(paymentGateways.provider, PAYSURE_PROVIDER),
      ),
    )
    .limit(1);

  if (!gateway || !gateway.isActive) {
    return refuse(
      "no_active_gateway",
      !gateway
        ? `O operador não tem o gateway "${PAYSURE_PROVIDER}" configurado. Sem ` +
            `ele não há como criar cobrança PIX — a tela segue no caminho de teste.`
        : `O gateway "${PAYSURE_PROVIDER}" está desativado pelo operador. Ligar é ` +
            `ato explícito dele, e sem isso o aviso de pagamento também seria ` +
            `recusado pela rota.`,
    );
  }

  if (!gateway.webhookToken) {
    // Sem token não há `postbackUrl` autêntica, e sem ela o aviso de
    // pagamento seria recusado quando voltasse. Criar a cobrança assim é
    // combinar o recebimento do dinheiro com a impossibilidade de fechar o
    // pedido.
    return refuse(
      "missing_webhook_token",
      `O gateway "${PAYSURE_PROVIDER}" deste operador não tem token de webhook ` +
        `emitido. A \`postbackUrl\` vai em cada cobrança e é o token que a torna ` +
        `autêntica — sem ele a cobrança seria paga e o aviso, recusado. Salve a ` +
        `credencial do gateway novamente para emitir o token.`,
    );
  }

  const credentials = decryptCredentials(gateway.credentialsEncrypted);
  const ci = credentials.ci?.trim();
  const cs = credentials.cs?.trim();
  if (!ci || !cs) {
    return refuse(
      "missing_credentials",
      `A credencial da Paysure deste operador está incompleta: a API exige os ` +
        `DOIS cabeçalhos, \`ci\` e \`cs\` (§1), e ` +
        `${!ci && !cs ? "nenhum dos dois está" : !ci ? "`ci` não está" : "`cs` não está"} ` +
        `gravado. Toda chamada voltaria 401. Reconfigure o gateway.`,
    );
  }

  const base = appBaseUrl();
  if (!base.ok) return refuse("missing_base_url", base.reason);

  // ── 3. A chamada.
  const result = await createPixCharge({
    credentials: { ci, cs },
    // `external_id` É o nosso `orders.id`. É isso que faz o 409 ser
    // informativo e o `external_reference` do aviso casar com o pedido.
    externalId: order.id,
    valueCents: toCents(order.amount),
    postbackUrl: `${base.value}${webhookPath(tenant.slug, PAYSURE_PROVIDER, gateway.webhookToken)}`,
    description: `Pedido #${order.id.slice(0, 8)} — ${product.title}`,
    expirationSeconds: chargeExpirationSecondsFor(product),
  });

  if (!result.ok) {
    // ── 4. O 409 TEM saída, e a saída é a nossa linha.
    if (result.kind === "duplicate") {
      const recovered = await readPixCharge(orderId);
      if (recovered) return { ok: true, ...recovered };
      return refuse(
        "duplicate_without_charge",
        `A Paysure já tem uma cobrança com o \`external_id\` ${order.id} (409) e ` +
          `nós não temos a linha correspondente em \`pix_charges\`. O 409 não ` +
          `devolve o \`content\` e a consulta por \`external_reference\` também ` +
          `não (§9.1), então o BR Code desta cobrança é IRRECUPERÁVEL por API. ` +
          `Revisão manual: localize a cobrança no painel da Paysure ou cancele-a ` +
          `e refaça o pedido. Esta tela NÃO mostra código de pagamento — mostrar ` +
          `um vazio seria pior.`,
        { providerKind: result.kind },
      );
    }

    return refuse("provider_refused", result.reason, {
      providerKind: result.kind,
      operatorAction: result.operatorAction,
    });
  }

  // ── 5. Gravar ANTES de devolver (AC8), e registrar o provedor (AC12).
  //
  // As duas escritas numa transação: cobrança gravada sem o provedor no
  // pedido deixaria `orders.payment_gateway_provider` mentindo sobre por
  // onde o dinheiro vem.
  await db.transaction(async (tx) => {
    await tx
      .insert(pixCharges)
      .values({
        tenantId: order.tenantId,
        orderId: order.id,
        provider: PAYSURE_PROVIDER,
        referenceCode: result.charge.referenceCode,
        brCode: result.charge.brCode,
        expiresAt: result.charge.expiresAt,
      })
      // Duas chamadas simultâneas para o mesmo pedido: a segunda colide na
      // unicidade de `order_id`. `DO NOTHING` + releitura abaixo faz a
      // perdedora devolver a cobrança da vencedora, em vez de estourar.
      .onConflictDoNothing({ target: pixCharges.orderId });

    // ⚠️ AC12: até esta story NENHUM código escrevia nesta coluna. Ela
    // existe desde sempre (`orders.payment_gateway_provider`,
    // `varchar(64)`) e era morta — o pedido não dizia por onde o dinheiro
    // entrou.
    await tx
      .update(orders)
      .set({ paymentGatewayProvider: PAYSURE_PROVIDER })
      .where(eq(orders.id, order.id));
  });

  // A releitura não é paranoia: é o que faz a perdedora da corrida devolver
  // o MESMO BR Code que a vencedora gravou, e o que garante que a tela
  // mostra o que está no banco, nunca o que ficou em memória (AC8).
  const stored = await readPixCharge(orderId);
  if (!stored) {
    return refuse(
      "duplicate_without_charge",
      `A cobrança ${result.charge.referenceCode} foi criada na Paysure e a ` +
        `gravação em \`pix_charges\` não resultou em linha. Revisão manual.`,
    );
  }

  return {
    ok: true,
    ...stored,
    created: stored.referenceCode === result.charge.referenceCode,
  };
}
