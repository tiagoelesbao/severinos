import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import {
  orders,
  products,
  productNumbers,
  settings,
  tenants,
  users,
} from "@/db/schema";
import { readPixCharge, tenantHasActiveGateway } from "@/lib/actions/pix-charge";
import { reservationMinutesFor } from "@/lib/validations/reserve";
import { siteConfigSchema } from "@/lib/validations/site-config";

import { ReservationCountdown } from "./countdown";
import { buildOrderView } from "./order-view";
import { OrderScreen } from "./order-screen";
import { PaymentStatus } from "./payment-status";

// A tela de acompanhamento do pedido (LTM-14).
//
// ════════════════════════════════════════════════════════════════════════
// ESTA PÁGINA NÃO DECIDE NADA — ela consulta e renderiza
// ════════════════════════════════════════════════════════════════════════
//
// Toda decisão de exibição mora em `buildOrderView` (`order-view.ts`), que é
// puro: o prazo da reserva, o estado da tela, o mascaramento do dado pessoal
// e o estado "gerando" saem de lá. A razão está escrita naquele arquivo —
// componente de servidor assíncrono não é renderizável por
// `renderToStaticMarkup`, e com a decisão aqui dentro quatro ACs desta story
// só seriam verificáveis por leitura de fonte.
//
// ⚠️ O telefone e o nome CRUS do comprador são lidos aqui e entregues a
// `buildOrderView`, que os devolve mascarados. Nada abaixo desta linha volta
// a tocá-los: o que a tela recebe é o `OrderView`, e ele não TEM campo de
// telefone inteiro (AC5).
//
// ⚠️ A cobrança é LIDA, nunca criada (decisão da LTM-03b, mantida).
// Renderizar uma página é um GET, e GET que cria cobrança no provedor cria
// uma por recarga de aba.

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ tenant: string; productSlug: string; orderId: string }>;
}) {
  const { tenant: tenantSlug, productSlug, orderId } = await params;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) notFound();

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      // Lido para a janela da reserva, não para exibição — ver
      // `reservationMinutesFor`.
      advancedSettings: products.advancedSettings,
    })
    .from(products)
    .where(eq(products.id, order.productId))
    .limit(1);

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, order.tenantId))
    .limit(1);

  // A URL tem de descrever ESTE pedido. Sem esta guarda, o mesmo pedido
  // renderizaria sob o endereço de qualquer sorteio de qualquer operador — e
  // o cartão da campanha (bloco 6) passaria a contradizer o endereço que o
  // comprador está lendo.
  if (!product || !tenant) notFound();
  if (tenant.slug !== tenantSlug || product.slug !== productSlug) notFound();

  const [buyer] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  const units = await db
    .select({
      number: productNumbers.number,
      half: productNumbers.half,
      reservedUntil: productNumbers.reservedUntil,
    })
    .from(productNumbers)
    .where(eq(productNumbers.orderId, orderId));

  const charge = await readPixCharge(orderId);
  // Decide o AC13 da LTM-03b: com gateway ligado, "Simular pagamento" sai do
  // caminho.
  const hasActiveGateway = await tenantHasActiveGateway(order.tenantId);

  const [tenantSettings] = await db
    .select({ siteConfig: settings.siteConfig })
    .from(settings)
    .where(eq(settings.tenantId, order.tenantId))
    .limit(1);
  // SEMPRE pelo schema, nunca por acesso cru ao jsonb: operador que nunca
  // salvou configurações tem `site_config = {}`, e é o `.default(false)` do
  // zod que entrega `showQrCodeByDefault`. Acesso cru devolveria `undefined`
  // e o QR abriria ou fecharia por acidente. Mesma razão escrita em
  // `validations/reserve.ts` e em `raffles/divisibility.ts`.
  const siteConfig = siteConfigSchema.parse(tenantSettings?.siteConfig ?? {});

  // ⚠️ O "15" ERA ESCRITO À MÃO NESTE ARQUIVO (AC14 da LTM-03b). Agora o
  // texto, o `reservedUntil` da unidade e o `expiration_seconds` da cobrança
  // saem todos de `reservationMinutesFor`.
  const reservationMinutes = reservationMinutesFor(product);

  const agora = new Date();
  const view = buildOrderView({
    order: {
      id: order.id,
      status: order.status,
      amount: order.amount,
      quantity: order.quantity,
      createdAt: order.createdAt,
    },
    product,
    buyer: buyer ?? null,
    units,
    charge,
    reservationMinutes,
    showQrCodeByDefault: siteConfig.showQrCodeByDefault,
    now: agora,
  });

  // Os botões de ação só existem onde fazem sentido: criar a cobrança que
  // ainda não existe, ou simular o pagamento onde não há gateway. Com
  // cobrança E gateway ativos, o caminho é o COPIAR dos três passos, e
  // repetir um segundo botão de copiar aqui só confundiria.
  const mostrarAcoes = view.state === "waiting" && (!view.brCode || !hasActiveGateway);

  return (
    <div className="flex flex-col gap-4">
      <OrderScreen
        view={view}
        countdown={
          <ReservationCountdown
            deadlineMs={view.deadlineMs}
            initialNowMs={agora.getTime()}
          />
        }
        actions={
          mostrarAcoes ? (
            <PaymentStatus
              orderId={order.id}
              status={order.status}
              hasActiveGateway={hasActiveGateway}
              // `null` de propósito: este ramo é o de GERAR a cobrança ou o
              // de simular o pagamento. Onde a cobrança existe, ela já está
              // nos três passos.
              charge={null}
            />
          ) : null
        }
      />

      {view.state === "waiting" ? (
        <p
          className="mx-auto max-w-md text-center text-xs text-muted-foreground"
          data-reservation-window
        >
          Seus títulos ficam reservados por {reservationMinutes} minutos a
          partir da criação do pedido.
        </p>
      ) : null}
    </div>
  );
}
