// O prazo da tela contra o POSTGRES de verdade (LTM-14, AC1 e AC2).
//
// `order-view.test.ts` prova a aritmética; este arquivo prova que o dado que
// alimenta a aritmética é o que o banco devolve, pelo MESMO caminho que a
// página usa: `db` de produção, as mesmas colunas, nenhum mock (AC2 da
// LTM-05 proíbe mock de `db`, e com razão).
//
// ⚠️ O QUE ESTE ARQUIVO EXISTE PARA PEGAR, e que nenhum teste puro pegaria:
// `reservedUntil` chegar como STRING em vez de `Date`. O driver é
// neon-serverless sobre HTTP, e a conversão de `timestamptz` é dele. Se um
// dia ela virar string, `deadlineOf` descarta o valor em silêncio e a tela
// passa a mostrar o prazo do RECUO (`created_at + janela`) achando que leu o
// do banco — contagem errada, sem erro em lugar nenhum.

import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, productNumbers } from "@/db/schema";
import { buildOrderView } from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-view";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { reservationMinutesFor } from "@/lib/validations/reserve";

import { orderIdOf, titulos } from "../../helpers/actions";
import {
  createRaffle,
  createTenant,
  readOrder,
  releaseUnitsOfOrder,
  setOrderStatus,
  setReservedUntil,
  syntheticPhone,
} from "../../helpers/seed";

/** O que a página lê, exatamente como ela lê. */
async function lerComoAPagina(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const units = await db
    .select({
      number: productNumbers.number,
      half: productNumbers.half,
      reservedUntil: productNumbers.reservedUntil,
    })
    .from(productNumbers)
    .where(eq(productNumbers.orderId, orderId));

  return { order, units };
}

function viewDe(
  order: { id: string; status: string; amount: string; quantity: number; createdAt: Date },
  units: { number: number; half: number; reservedUntil: Date | null }[],
  now: Date,
) {
  return buildOrderView({
    order,
    product: {
      title: "Sorteio sintetico",
      description: null,
      imageUrl: null,
      slug: "sorteio-sintetico",
    },
    buyer: null,
    units,
    charge: null,
    reservationMinutes: reservationMinutesFor(null),
    showQrCodeByDefault: false,
    now,
  });
}

describe("AC1: o prazo da tela é o `reserved_until` do banco", () => {
  it("o prazo gravado chega como Date e vira a contagem da tela", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });

    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0, 1),
        phone: syntheticPhone(),
      }),
    );

    const { order, units } = await lerComoAPagina(orderId);
    expect(units).toHaveLength(2);

    // ── A asserção que justifica o arquivo.
    for (const unit of units) {
      expect(
        unit.reservedUntil,
        "`reserved_until` não chegou como Date — `deadlineOf` descartaria o " +
          "valor e a tela mostraria o prazo do recuo achando que leu o banco",
      ).toBeInstanceOf(Date);
    }

    const prazoDoBanco = Math.min(
      ...units.map((u) => (u.reservedUntil as Date).getTime()),
    );

    const view = viewDe(order, units, new Date());
    expect(view.deadlineMs).toBe(prazoDoBanco);
    expect(view.state).toBe("waiting");
    // A janela da reserva sai da fonte única, e o prazo gravado tem de cair
    // dentro dela a partir da criação do pedido.
    const janelaMs = reservationMinutesFor(null) * 60 * 1000;
    const desvio = prazoDoBanco - (order.createdAt.getTime() + janelaMs);
    expect(
      Math.abs(desvio),
      `o prazo gravado ficou ${desvio} ms fora da janela da fonte única`,
    ).toBeLessThan(10_000);
  });

  it("mudar o prazo no banco muda a tela — ela não guarda duração", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(3),
        phone: syntheticPhone(),
      }),
    );

    const novoPrazo = new Date(Date.now() + 42 * 60 * 1000);
    await setReservedUntil(orderId, novoPrazo);

    const { order, units } = await lerComoAPagina(orderId);
    const view = viewDe(order, units, new Date());
    expect(view.deadlineMs).toBe(novoPrazo.getTime());
  });
});

describe("AC2: a tela expira pelo prazo, não pelo estado do pedido", () => {
  it("prazo vencido e pedido AINDA `pending` no banco: a tela já diz expirado", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(5),
        phone: syntheticPhone(),
      }),
    );

    // Só o prazo é empurrado para o passado. NENHUMA varredura roda — é
    // exatamente o estado em que o comprador fica com a aba aberta e ninguém
    // visitou a grade.
    await setReservedUntil(orderId, new Date(Date.now() - 1000));

    const naBase = await readOrder(orderId);
    expect(naBase.status, "a varredura não devia ter rodado aqui").toBe("pending");

    const { order, units } = await lerComoAPagina(orderId);
    const view = viewDe(order, units, new Date());
    expect(view.state).toBe("expired");
    expect(view.details.situation).toBe("Reserva expirada");
  });

  it("depois da varredura, sem unidade nenhuma, a tela continua coerente", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(7),
        phone: syntheticPhone(),
      }),
    );

    // O estado que a LTM-20 deixa: unidades devolvidas (com `order_id`
    // apagado) e pedido `expired`.
    await releaseUnitsOfOrder(orderId);
    await setOrderStatus(orderId, "expired");

    const { order, units } = await lerComoAPagina(orderId);
    expect(units).toHaveLength(0);

    const view = viewDe(order, units, new Date());
    expect(view.state).toBe("expired");
    // E ainda exibe um prazo — o do recuo, que é o que a reserva teve.
    expect(view.details.expiresAt).toMatch(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}:\d{2}$/);
  });
});
