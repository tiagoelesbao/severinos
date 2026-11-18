// A tela do pedido (LTM-03b, AC8, AC13, AC14).
//
// Render com `react-dom/server` em ambiente `node` — sem jsdom, sem
// biblioteca de teste de componente, sem dependência nova. Mesmo padrão
// que a LTM-03a estabeleceu em `gateway-config.test.tsx`.

import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import {
  PaymentStatusView,
  PixCodeBlock,
} from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/payment-status";
import { reservationMinutesFor } from "@/lib/validations/reserve";

import { codigoDe, fonteDe } from "./source";

const PEDIDO = "app/loja/[tenant]/[productSlug]/pedido/[orderId]";

const cobranca = {
  referenceCode: "PSR-sintetico-da-tela",
  brCode: "00020126-br-code-sintetico-da-tela",
  expiresAt: new Date("2026-11-18T12:15:00.000Z"),
};

/** Extrai o BR Code DO RENDER, em vez de comparar com string escrita à mão. */
function brCodeDoRender(markup: string): string {
  const match = /<code[^>]*data-br-code[^>]*>([^<]+)<\/code>/.exec(markup);
  if (!match) {
    throw new Error(
      `A marcação não tem <code data-br-code>. O AC8 exige que o BR Code ` +
        `exibido seja extraído do render. Marcação: ${markup.slice(0, 400)}`,
    );
  }
  return match[1];
}

describe("AC8: a tela exibe o BR Code que está GRAVADO", () => {
  it("o bloco do código Pix renderiza o BR Code recebido", () => {
    const markup = renderToStaticMarkup(<PixCodeBlock charge={cobranca} />);
    expect(brCodeDoRender(markup)).toBe(cobranca.brCode);
    expect(markup).toContain(cobranca.referenceCode);
  });

  it("a página LÊ a cobrança do banco e não a cria ao renderizar", async () => {
    // ⚠️ GET que cria cobrança no provedor cria uma por recarga de aba. A
    // página chama `readPixCharge`; `ensurePixCharge` é chamada pelo botão,
    // no componente de cliente.
    const pagina = await codigoDe(`${PEDIDO}/page.tsx`);
    expect(pagina).toContain("readPixCharge");
    expect(pagina).not.toContain("ensurePixCharge");

    expect(await codigoDe(`${PEDIDO}/payment-status.tsx`)).toContain(
      "ensurePixCharge",
    );
  });

  it("com gateway ativo e cobrança, a tela oferece COPIAR o código", () => {
    const markup = renderToStaticMarkup(
      <PaymentStatusView
        orderId="55555555-5555-4555-8555-555555555555"
        status="pending"
        hasActiveGateway
        charge={cobranca}
      />,
    );
    expect(markup).toContain("data-copy-br-code");
    expect(markup).toContain("Copiar código Pix");
  });

  it("com gateway ativo e SEM cobrança, a tela oferece gerar o código", () => {
    const markup = renderToStaticMarkup(
      <PaymentStatusView
        orderId="55555555-5555-4555-8555-555555555555"
        status="pending"
        hasActiveGateway
        charge={null}
      />,
    );
    expect(markup).toContain("data-create-pix-charge");
    expect(markup).toContain("Gerar código Pix");
  });
});

describe("AC13: a simulação sai do caminho quando há gateway", () => {
  it("COM gateway ativo, \"Simular pagamento\" NÃO é renderizado", () => {
    for (const charge of [null, cobranca]) {
      const markup = renderToStaticMarkup(
        <PaymentStatusView
          orderId="55555555-5555-4555-8555-555555555555"
          status="pending"
          hasActiveGateway
          charge={charge}
        />,
      );
      expect(markup).not.toContain("Simular pagamento");
      expect(markup).not.toContain("data-simulate-payment");
    }
  });

  it("SEM gateway ativo, \"Simular pagamento\" continua aparecendo", () => {
    const markup = renderToStaticMarkup(
      <PaymentStatusView
        orderId="55555555-5555-4555-8555-555555555555"
        status="pending"
        hasActiveGateway={false}
        charge={null}
      />,
    );
    expect(markup).toContain("Simular pagamento (ambiente de teste)");
    expect(markup).toContain("data-simulate-payment");
  });

  it("pedido pago mostra o selo e nenhum dos dois caminhos", () => {
    const markup = renderToStaticMarkup(
      <PaymentStatusView
        orderId="55555555-5555-4555-8555-555555555555"
        status="paid"
        hasActiveGateway={false}
        charge={cobranca}
      />,
    );
    expect(markup).toContain("Pago");
    expect(markup).not.toContain("Simular pagamento");
  });

  it("`simulatePayment` NÃO foi removida — ela é o caminho de teste", async () => {
    // O AC é explícito: o botão sai do caminho, a função fica. Ela continua
    // chamando `settle-order`, que é o que impede o caminho de teste e o do
    // dinheiro de divergirem (AC-C3 da LTM-03a).
    const checkout = await codigoDe("lib/actions/checkout.ts");
    expect(checkout).toContain("simulatePayment");
    expect(checkout).toContain("settleOrder");
  });
});

describe("AC14: o relógio da reserva tem UMA fonte", () => {
  it("o texto da tela de pedido DERIVA da função, não do número 15", async () => {
    const pagina = await codigoDe(`${PEDIDO}/page.tsx`);
    expect(pagina).toContain("reservationMinutesFor");
    // O "15 minutos" escrito à mão desapareceu.
    expect(pagina).not.toMatch(/15\s*minutos/);
    expect(pagina).toContain("{reservationMinutes} minutos");
  });

  it("a declaração do número existe em UM lugar em todo o src", async () => {
    // A verificação literal do AC: uma busca pelo número de minutos da
    // reserva encontra UMA declaração. Antes eram três lugares que não se
    // conheciam — a constante em `actions/reserve.ts`, o texto da tela, e
    // (a partir desta story) o `expiration_seconds` da cobrança.
    const arquivos = [
      "lib/validations/reserve.ts",
      "lib/actions/reserve.ts",
      "lib/payments/paysure-client.ts",
      "lib/actions/pix-charge.ts",
      `${PEDIDO}/page.tsx`,
      `${PEDIDO}/payment-status.tsx`,
    ];

    let declaracoes = 0;
    for (const arquivo of arquivos) {
      const fonte = await codigoDe(arquivo);
      declaracoes += [...fonte.matchAll(/RESERVATION_MINUTES_DEFAULT\s*=\s*\d+/g)].length;
      // E ninguém mais declara um número de minutos de reserva por conta
      // própria.
      expect(
        fonte,
        `${arquivo} declara a janela de reserva por conta própria`,
      ).not.toMatch(/RESERVATION_MINUTES\s*=\s*\d+/);
    }
    expect(declaracoes).toBe(1);
  });

  it("os três consumidores leem a MESMA função", async () => {
    for (const arquivo of [
      "lib/actions/reserve.ts",
      "lib/payments/paysure-client.ts",
      `${PEDIDO}/page.tsx`,
    ]) {
      const fonte = await codigoDe(arquivo);
      expect(fonte, `${arquivo} não lê a fonte única`).toContain(
        "reservationMinutesFor",
      );
    }
  });

  it("o padrão NÃO é exportado — ler o padrão de fora é o acoplamento evitado", async () => {
    const fonte = await codigoDe("lib/validations/reserve.ts");
    expect(fonte).not.toMatch(/export\s+const\s+RESERVATION_MINUTES/);
    expect(fonte).toMatch(/^const RESERVATION_MINUTES_DEFAULT/m);
    // A função é a única porta, e é pura (nada de `"use server"` aqui — a
    // razão está escrita no próprio arquivo).
    expect(fonte).not.toContain('"use server"');
    expect(reservationMinutesFor({ id: "qualquer" })).toBeGreaterThan(0);
  });

  it("`actions/reserve.ts` NÃO exporta a janela — é um arquivo `\"use server\"`", async () => {
    // Medido contra `next build` em 2026-11-18: exportar valor não-função
    // de um arquivo `"use server"` faz o módulo perder TODAS as exportações
    // no grafo do cliente. Este teste é a guarda de leitura; `pnpm build` é
    // a guarda de verdade.
    const fonte = await fonteDe("lib/actions/reserve.ts");
    expect(fonte).toContain('"use server"');
    const exportacoes = [...fonte.matchAll(/^export .*/gm)].map((m) => m[0]);
    expect(exportacoes.length).toBeGreaterThan(0);
    for (const linha of exportacoes) {
      expect(
        linha,
        `\`${linha.trim()}\` em um arquivo "use server" nao e funcao assincrona ` +
          `e quebra o build`,
      ).toMatch(/^export async function /);
    }
  });
});
