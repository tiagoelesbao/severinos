// Varredura de expiração (LTM-05, AC6) — verde contra o código atual.
//
// A varredura não é um processo de fundo: ela roda dentro da PRÓXIMA
// tentativa de reserva do mesmo comprador
// (`expireStaleReservationsAndCheckSpam`, reserve.ts:23-75). Quem nunca
// volta nunca tem a reserva liberada por si — e isso é comportamento de
// hoje, descrito aqui, não defeito a consertar nesta story.

import { beforeEach, describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { orderIdOf, titulos } from "../helpers/actions";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  expireReservation,
  readBuyerByPhone,
  readOrder,
  readUnits,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

describe("expiração de reserva", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  it("libera as unidades, marca o pedido como expirado e conta a reserva não paga", async () => {
    const phone = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0, 1),
        phone,
      }),
    );

    // Vence o prazo no dado, sem esperar 15 minutos de relógio.
    await expireReservation(abandonado);

    // A varredura roda aqui, na tentativa seguinte do mesmo comprador.
    const novo = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(5),
        phone,
      }),
    );

    expect((await readOrder(abandonado)).status).toBe("expired");

    const units = await readUnits(raffle.id);
    for (const number of [0, 1]) {
      const unit = units.find((u) => u.number === number);
      expect(unit?.status).toBe("available");
      expect(unit?.order_id).toBeNull();
      expect(unit?.reserved_until).toBeNull();
    }
    const nova = units.find((u) => u.number === 5);
    expect(nova?.status).toBe("reserved");
    expect(nova?.order_id).toBe(novo);

    const buyer = await readBuyerByPhone(tenant.id, phone);
    expect(buyer.consecutive_unpaid_reservations).toBe(1);
    expect(buyer.blocked_until).toBeNull();

    await assertProductInvariants(raffle.id, "depois da varredura de expiração");
  });

  it("a varredura é por pedido do próprio comprador: não toca reserva viva de outro", async () => {
    const abandonador = syntheticPhone();
    const outro = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0),
        phone: abandonador,
      }),
    );
    const viva = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(1),
        phone: outro,
      }),
    );

    await expireReservation(abandonado);

    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(2),
      phone: abandonador,
    });

    const units = await readUnits(raffle.id);
    expect(units.find((u) => u.number === 0)?.status).toBe("available");
    // A unidade do outro comprador continua reservada e no pedido dele.
    expect(units.find((u) => u.number === 1)?.status).toBe("reserved");
    expect(units.find((u) => u.number === 1)?.order_id).toBe(viva);
    expect((await readOrder(viva)).status).toBe("pending");

    const vizinho = await readBuyerByPhone(tenant.id, outro);
    expect(
      vizinho.consecutive_unpaid_reservations,
      "a reserva abandonada de um não pode marcar strike no outro",
    ).toBe(0);

    await assertProductInvariants(raffle.id, "varredura com reserva viva de terceiro");
  });
});
