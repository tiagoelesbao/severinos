// O fechamento transacional (LTM-03a, bloco C).
//
// Cobre AC-C1, AC-C2, AC-C3, AC-C4, AC-C5 e AC-C6 contra `settle-order.ts`
// diretamente — o mesmo código que o webhook chama. Zero mock: a transação é
// do Postgres, e é o que o Postgres faz com ela que está em jogo.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it } from "vitest";

import { simulatePayment } from "@/lib/actions/checkout";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { settleOrder } from "@/lib/payments/settle-order";

import { orderIdOf, titulos } from "../helpers/actions";
import { errorChain, settle, withFailingWrite } from "../helpers/fault";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  readBankingTransactions,
  readOrder,
  readUnits,
  reassignUnitToOrder,
  releaseUnitsOfOrder,
  setOrderStatus,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(dirname, "../../src");

describe("settleOrder", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  async function reservar(numeros: number[], phone = syntheticPhone()) {
    return orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(...numeros),
        phone,
      }),
    );
  }

  it("AC-C1: fecha o pedido, vende as unidades e lança UM crédito com paymentId e endToEndId", async () => {
    const orderId = await reservar([0, 1]);

    const result = await settleOrder({
      orderId,
      tenantId: tenant.id,
      description: "Pagamento confirmado — teste",
      expectedAmountCents: 2000,
      paymentId: "ref-sintetica-pagamento",
      endToEndId: "e2e-sintetico-0001",
      externalReference: orderId,
    });

    expect(result).toMatchObject({ ok: true, unitsSold: 2, amount: "20.00" });

    const order = await readOrder(orderId);
    expect(order.status).toBe("paid");
    expect(order.paid_at).not.toBeNull();

    const vendidas = (await readUnits(raffle.id)).filter((u) => u.status === "sold");
    expect(vendidas.map((u) => u.number)).toEqual([0, 1]);
    expect(vendidas.every((u) => u.order_id === orderId)).toBe(true);

    const lancamentos = await readBankingTransactions(orderId);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]).toMatchObject({
      type: "credit",
      amount: "20.00",
      // As duas colunas que esta story cria (item 10 da arquitetura). Sem
      // elas, o ETL da LTM-04 não tem de onde ler o E2E do PIX — que é o
      // único identificador que o Banco Central reconhece.
      payment_id: "ref-sintetica-pagamento",
      end_to_end_id: "e2e-sintetico-0001",
      external_reference: orderId,
    });

    await assertProductInvariants(raffle.id, "fechamento pelo settle-order");
  });

  it("AC-C2: é transação, não sequência — falha DEPOIS de marcar o pedido pago não deixa nada", async () => {
    const orderId = await reservar([2, 3]);

    // O gatilho derruba a INSERÇÃO do crédito bancário, que é a terceira das
    // quatro escritas: quando ele dispara, o pedido já foi marcado como pago
    // e as unidades já foram marcadas como vendidas DENTRO da transação. É
    // exatamente o "depois de marcar o pedido como pago" que o AC pede.
    //
    // A falha vem do BANCO, não de um dublê: o que está em jogo é o que o
    // Postgres faz com uma transação interrompida, e um mock provaria o
    // comportamento do mock.
    const outcome = await withFailingWrite(
      {
        table: "banking_transactions",
        when: "BEFORE INSERT",
        label: "falha injetada pela suite (credito do fechamento)",
      },
      () =>
        settle(
          settleOrder({
            orderId,
            tenantId: tenant.id,
            description: "Pagamento que vai falhar no meio",
          }),
        ),
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(errorChain(outcome.error)).toContain("credito do fechamento");
    }

    // Nenhuma das quatro escritas sobreviveu.
    const order = await readOrder(orderId);
    expect(order.status).toBe("pending");
    expect(order.paid_at).toBeNull();

    const unidades = await readUnits(raffle.id);
    expect(unidades.filter((u) => u.status === "sold")).toHaveLength(0);
    expect(
      unidades.filter((u) => u.order_id === orderId && u.status === "reserved"),
    ).toHaveLength(2);

    expect(await readBankingTransactions(orderId)).toHaveLength(0);

    await assertProductInvariants(raffle.id, "fechamento revertido pela transação");
  });

  it("AC-C3: a sequência do fechamento existe em UM arquivo só, verificável por busca", async () => {
    // A verificação que o AC define, executada: procurar nos fontes quem
    // escreve as TRÊS peças da sequência — pedido para pago, unidades para
    // vendidas, crédito em banking_transactions.
    //
    // ⚠️ `bonus-play.ts` fica FORA do conjunto por decisão registrada, e não
    // por omissão: ele não tem duas das três peças (não toca `orders`, não
    // tem `product_numbers`) e o crédito dele não tem `orderId`. A nota
    // completa está no fim de `src/lib/payments/settle-order.ts`.
    const arquivos = [
      "lib/payments/settle-order.ts",
      "lib/actions/checkout.ts",
      "lib/actions/bonus-play.ts",
      "lib/actions/reserve.ts",
      "app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts",
      "app/api/webhooks/payment/[tenant]/[provider]/route.ts",
    ];

    const implementadores: string[] = [];
    for (const relativo of arquivos) {
      const texto = await readFile(path.join(SRC, relativo), "utf8");
      // As marcas são as escritas, não os comentários: `status: "paid"` em
      // `orders`, `status: "sold"` em `product_numbers`, e `insert` em
      // `bankingTransactions`.
      const marcaPedidoPago = /\.update\(orders\)[\s\S]{0,200}status:\s*"paid"/.test(texto);
      const marcaUnidadeVendida =
        /\.update\(productNumbers\)[\s\S]{0,200}status:\s*"sold"/.test(texto);
      const marcaCredito = /\.insert\(bankingTransactions\)/.test(texto);

      if (marcaPedidoPago && marcaUnidadeVendida && marcaCredito) {
        implementadores.push(relativo);
      }
    }

    expect(implementadores).toEqual(["lib/payments/settle-order.ts"]);
  });

  it("AC-C3: simulatePayment chama a MESMA função, sem cópia da sequência", async () => {
    const checkout = await readFile(path.join(SRC, "lib/actions/checkout.ts"), "utf8");
    expect(checkout).toContain("settleOrder");
    // E não tem nenhuma das três escritas por conta própria.
    expect(checkout).not.toMatch(/\.update\(orders\)/);
    expect(checkout).not.toMatch(/\.update\(productNumbers\)/);
    expect(checkout).not.toMatch(/\.insert\(bankingTransactions\)/);
  });

  it("AC-C4: simulatePayment chamado duas vezes fecha UMA vez", async () => {
    const orderId = await reservar([4]);

    expect(await simulatePayment(orderId)).toEqual({ ok: true });
    expect(await simulatePayment(orderId)).toEqual({ error: "Pedido inválido." });

    expect(await readBankingTransactions(orderId)).toHaveLength(1);
    const pagos = (await readUnits(raffle.id)).filter((u) => u.status === "sold");
    expect(pagos).toHaveLength(1);

    await assertProductInvariants(raffle.id, "segundo simulatePayment");
  });

  it("AC-C5: unidade já vendida por OUTRO pedido não é sobrescrita", async () => {
    // Monta exatamente o estado do AC: o pedido A reservou o 5; a unidade do
    // 5 passou a pertencer ao pedido B, que a pagou. O pagamento de A chega
    // depois.
    //
    // ⚠️ O estado montado é DELIBERADAMENTE inconsistente (o pedido B fica
    // com duas unidades e `quantity` 1), e é por isso que este teste não
    // chama `assertProductInvariants`: ele existe para provar que o código
    // RECUSA um estado assim, não que o estado é válido.
    const pedidoA = await reservar([5]);
    const pedidoB = await reservar([6]);

    await reassignUnitToOrder({
      productId: raffle.id,
      number: 5,
      half: 1,
      orderId: pedidoB,
      status: "sold",
    });

    const result = await settleOrder({
      orderId: pedidoA,
      tenantId: tenant.id,
      description: "Pagamento de pedido cuja unidade foi para outro",
    });

    expect(result).toMatchObject({ ok: false, refusal: "unit_conflict" });
    if (!result.ok) {
      expect(result.detail).toContain("Revisão manual");
    }

    // O pedido A não fechou.
    expect((await readOrder(pedidoA)).status).toBe("pending");
    expect(await readBankingTransactions(pedidoA)).toHaveLength(0);

    // E a linha do 5 continua apontando para B, intocada — o AC é explícito
    // sobre isto: "não altera o `order_id` daquela linha".
    const unidade5 = (await readUnits(raffle.id)).find(
      (u) => u.number === 5 && u.half === 1,
    );
    expect(unidade5?.order_id).toBe(pedidoB);
    expect(unidade5?.status).toBe("sold");
  });

  it("AC-C5: a guarda é chavada na LINHA, não no número — meia cota passa por ela", async () => {
    // ⚠️ Este é o teste da correção do @po de 2026-11-17, e é o que impede a
    // volta do defeito. Num sorteio DIVISÍVEL, "o número 42 já está vendido
    // por outro pedido" é estado CORRETO: a outra metade é de outra pessoa.
    //
    // Uma guarda chavada no número recusaria o fechamento abaixo — um
    // pagamento perfeitamente válido, com dinheiro já capturado — e mandaria
    // o pedido para revisão manual.
    const divisivel = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      isDivisible: true,
      pricePerNumber: "10.00",
    });

    const metadeA = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: divisivel.slug,
        units: [{ number: 7, half: 1 }],
        phone: syntheticPhone(),
      }),
    );
    const metadeB = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: divisivel.slug,
        units: [{ number: 7, half: 2 }],
        phone: syntheticPhone(),
      }),
    );

    // A metade 1 do 7 é vendida primeiro.
    expect(
      await settleOrder({
        orderId: metadeA,
        tenantId: tenant.id,
        description: "Metade 1 do título 7",
        expectedAmountCents: 500,
      }),
    ).toMatchObject({ ok: true, unitsSold: 1, amount: "5.00" });

    // Agora o número 7 "já está vendido". A metade 2 TEM de fechar.
    expect(
      await settleOrder({
        orderId: metadeB,
        tenantId: tenant.id,
        description: "Metade 2 do título 7",
        expectedAmountCents: 500,
      }),
    ).toMatchObject({ ok: true, unitsSold: 1, amount: "5.00" });

    const sete = (await readUnits(divisivel.id)).filter((u) => u.number === 7);
    expect(sete).toHaveLength(2);
    expect(sete.map((u) => u.status)).toEqual(["sold", "sold"]);
    expect(new Set(sete.map((u) => u.order_id)).size).toBe(2);

    await assertProductInvariants(divisivel.id, "duas metades do mesmo titulo vendidas");
  });

  it("AC-C6: pagamento atrasado não lança dinheiro sem número — e nomeia o estorno pendente", async () => {
    // A política escolhida, registrada no Dev Agent Record: pedido para
    // revisão manual COM registro de estorno pendente, e NENHUM lançamento
    // em `banking_transactions`.
    //
    // O invariante do AC é este: não existe estado final em que o pagamento
    // está em `banking_transactions` e o comprador não tem nem o número nem
    // um registro de estorno pendente.
    const orderId = await reservar([8]);

    // O estado que a varredura de expiração deixa, montado direto: unidade
    // de volta a `available` com `order_id` nulo, pedido `expired`
    // (`reserve.ts:149-156`).
    await releaseUnitsOfOrder(orderId);
    await setOrderStatus(orderId, "expired");

    const result = await settleOrder({
      orderId,
      tenantId: tenant.id,
      description: "Pagamento que chegou depois da expiração",
    });

    expect(result).toMatchObject({ ok: false, refusal: "order_expired" });
    if (!result.ok) {
      expect(result.detail).toContain("NÃO é lançado em banking_transactions");
    }

    // O invariante, medido: zero crédito para este pedido.
    expect(await readBankingTransactions(orderId)).toHaveLength(0);
    expect((await readOrder(orderId)).status).toBe("expired");
  });

  it("ramo de falha: pedido inexistente", async () => {
    const result = await settleOrder({
      orderId: "00000000-0000-4000-8000-000000000000",
      description: "nada",
    });
    expect(result).toMatchObject({ ok: false, refusal: "order_not_found" });
  });

  it("ramo de falha: pedido de OUTRO operador é tratado como inexistente", async () => {
    const orderId = await reservar([0]);
    const outro = await createTenant();

    const result = await settleOrder({
      orderId,
      tenantId: outro.id,
      description: "tentativa cruzada entre operadores",
    });

    expect(result).toMatchObject({ ok: false, refusal: "order_not_found" });
    expect((await readOrder(orderId)).status).toBe("pending");
  });

  it("AC-E3: valor divergente NÃO fecha o pedido", async () => {
    const orderId = await reservar([1]);

    const result = await settleOrder({
      orderId,
      tenantId: tenant.id,
      description: "Pagamento parcial",
      // O pedido vale R$ 10,00 = 1000 centavos. O aviso afirma R$ 5,00.
      expectedAmountCents: 500,
    });

    expect(result).toMatchObject({ ok: false, refusal: "amount_mismatch" });
    if (!result.ok) {
      expect(result.detail).toContain("Pagamento parcial não fecha pedido");
    }

    expect((await readOrder(orderId)).status).toBe("pending");
    expect(await readBankingTransactions(orderId)).toHaveLength(0);
  });
});
