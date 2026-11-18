// Bloqueio anti-spam (LTM-05, AC6 e AC7) — verde contra o código atual.
//
// Regra do código: três reservas não pagas CONTADAS levam a 30 minutos de
// bloqueio (`ANTI_SPAM_THRESHOLD = 3`, `ANTI_SPAM_BLOCK_MINUTES = 30`).
//
// Detalhe que só um teste revela, e que importa para o suporte: a contagem
// acontece na varredura, que roda na TENTATIVA SEGUINTE. Quem abandona três
// reservas não é bloqueado na terceira — é bloqueado quando volta pela
// quarta vez. É o comportamento de hoje, descrito aqui como é.

import { beforeEach, describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { errorOf, orderIdOf, titulos } from "../helpers/actions";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  expireReservation,
  readBuyerByPhone,
  readOrders,
  readUnits,
  setBlockedUntil,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

const PRAZO_DE_BLOQUEIO_MIN = 30;

describe("anti-spam", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  async function reservarEAbandonar(phone: string, numero: number): Promise<void> {
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(numero),
        phone,
      }),
    );
    await expireReservation(orderId);
  }

  it("dispara quando a terceira reserva não paga é contada, e bloqueia por 30 minutos", async () => {
    const phone = syntheticPhone();

    await reservarEAbandonar(phone, 0);
    await reservarEAbandonar(phone, 1);
    await reservarEAbandonar(phone, 2);

    // Até aqui o comprador ainda não foi bloqueado: as duas primeiras
    // tentativas contaram um strike cada.
    const antes = await readBuyerByPhone(tenant.id, phone);
    expect(antes.consecutive_unpaid_reservations).toBe(2);
    expect(antes.blocked_until).toBeNull();

    const bloqueado = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(3),
      phone,
    });

    expect(errorOf(bloqueado)).toMatch(/Muitas reservas sem pagamento/i);

    const depois = await readBuyerByPhone(tenant.id, phone);
    expect(depois.blocked_until).not.toBeNull();
    const minutosDeBloqueio =
      (new Date(depois.blocked_until as string).getTime() - Date.now()) / 60_000;
    expect(minutosDeBloqueio).toBeGreaterThan(PRAZO_DE_BLOQUEIO_MIN - 2);
    expect(minutosDeBloqueio).toBeLessThan(PRAZO_DE_BLOQUEIO_MIN + 1);
    // O contador zera no bloqueio: quem cumpre a pena volta com a ficha limpa.
    expect(depois.consecutive_unpaid_reservations).toBe(0);

    // A reserva bloqueada não cria pedido nenhum, e as três abandonadas
    // voltaram todas ao estoque.
    const orders = await readOrders(raffle.id);
    expect(orders).toHaveLength(3);
    expect(orders.every((o) => o.status === "expired")).toBe(true);
    expect((await readUnits(raffle.id)).every((u) => u.status === "available")).toBe(true);

    await assertProductInvariants(raffle.id, "comprador bloqueado por anti-spam");
  });

  it("enquanto o bloqueio está de pé, recusa sem nem olhar o estoque", async () => {
    const phone = syntheticPhone();
    await reservarEAbandonar(phone, 0);
    await reservarEAbandonar(phone, 1);
    await reservarEAbandonar(phone, 2);
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(3),
      phone,
    });

    const segundaTentativa = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(4),
      phone,
    });

    expect(errorOf(segundaTentativa)).toMatch(/Muitas reservas sem pagamento/i);
    expect(await readOrders(raffle.id)).toHaveLength(3);
    await assertProductInvariants(raffle.id, "segunda recusa durante o bloqueio");
  });

  it("passado o prazo, o bloqueio deixa de valer e a reserva volta a funcionar", async () => {
    const phone = syntheticPhone();
    await reservarEAbandonar(phone, 0);
    await reservarEAbandonar(phone, 1);
    await reservarEAbandonar(phone, 2);
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(3),
      phone,
    });

    // Em vez de esperar 30 minutos de relógio, o prazo é empurrado para o
    // passado no dado. Quem decide o que fazer com um bloqueio vencido
    // continua sendo o código de produção, intocado.
    const buyer = await readBuyerByPhone(tenant.id, phone);
    await setBlockedUntil(buyer.id, new Date(Date.now() - 60_000));

    const liberado = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(4),
      phone,
    });

    const orderId = orderIdOf(liberado);
    const units = await readUnits(raffle.id);
    expect(units.find((u) => u.number === 4)?.status).toBe("reserved");
    expect(units.find((u) => u.number === 4)?.order_id).toBe(orderId);

    await assertProductInvariants(raffle.id, "reserva depois do bloqueio vencido");
  });
});
