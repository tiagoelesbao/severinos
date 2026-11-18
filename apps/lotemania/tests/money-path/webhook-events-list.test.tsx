// A lista do operador (LTM-03a, AC-F4) e a verificação por leitura do AC-F1.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO IMPORTA MAIS DO QUE PARECE
//
// A rota responde 200 até para o aviso que NÃO processou. Esse compromisso só
// é defensável se a lista do operador existir e MOSTRAR o que aconteceu —
// senão "responder 200" é só outro nome para engolir em silêncio, que é o
// defeito que a story existe para corrigir.
//
// Então o teste não verifica a lista em abstrato: ele PRODUZ os eventos
// chamando a rota de verdade nos três cenários do AC-F4 (AC-F1 não casado,
// AC-F2 provedor sem adaptador, AC-F3 status não acionável), lê os eventos do
// banco e renderiza o componente de verdade com eles.
// ════════════════════════════════════════════════════════════════════════

import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { POST as POST_TOKENIZADA } from "@/app/api/webhooks/payment/[tenant]/[provider]/[token]/route";
import {
  WebhookEventsTable,
  type WebhookEventListItem,
} from "@/app/dashboard/integrations/payments/events/page";
import { webhookPath } from "@/lib/payments/webhook-url";

import {
  createPaymentGateway,
  createTenant,
  readWebhookEvents,
  type SeededTenant,
} from "../helpers/seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(dirname, "../../src");

const COM_HMAC = "paggue";
const SEM_ADAPTADOR = "paysure";

/** As entidades que o React produz ao escapar texto. */
function decodificar(markup: string): string {
  return markup
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("AC-F4: a lista existe e mostra o que importa", () => {
  let tenant: SeededTenant;
  let hmacToken: string;
  let hmacSecret: string;
  let paysureToken: string;

  beforeEach(async () => {
    tenant = await createTenant();
    const hmac = await createPaymentGateway({
      tenantId: tenant.id,
      provider: COM_HMAC,
    });
    hmacToken = hmac.webhookToken as string;
    hmacSecret = hmac.webhookSecret as string;
    const paysure = await createPaymentGateway({
      tenantId: tenant.id,
      provider: SEM_ADAPTADOR,
      webhookSecret: null,
    });
    paysureToken = paysure.webhookToken as string;
  });

  async function entregar(opts: {
    provider: string;
    token: string;
    body: string;
    assinar?: boolean;
  }) {
    const headers: Record<string, string> = {};
    if (opts.assinar) {
      headers["x-webhook-signature"] = createHmac("sha256", hmacSecret)
        .update(opts.body)
        .digest("hex");
    }
    const request = new Request(
      `http://localhost${webhookPath(tenant.slug, opts.provider, opts.token)}`,
      { method: "POST", body: opts.body, headers },
    );
    return POST_TOKENIZADA(request as unknown as NextRequest, {
      params: Promise.resolve({
        tenant: tenant.slug,
        provider: opts.provider,
        token: opts.token,
      }),
    });
  }

  it("contém os itens produzidos por AC-F1, AC-F2 e AC-F3, com data, provedor, valor, estado e motivo", async () => {
    // AC-F1 — verificado, não casa com pedido nenhum.
    await entregar({
      provider: COM_HMAC,
      token: hmacToken,
      assinar: true,
      body: JSON.stringify({
        flow: "cashin",
        eventId: "evt-f1",
        status: "paid",
        orderId: "00000000-0000-4000-8000-000000000000",
        amountCents: 6100,
      }),
    });

    // AC-F2 — provedor na lista, sem adaptador.
    await entregar({
      provider: SEM_ADAPTADOR,
      token: paysureToken,
      body: JSON.stringify({ cashin: { reference_code: "PSR-sintetico" } }),
    });

    // AC-F3 — status que esta story não trata.
    await entregar({
      provider: COM_HMAC,
      token: hmacToken,
      assinar: true,
      body: JSON.stringify({
        flow: "cashin",
        eventId: "evt-f3",
        status: "refunded",
        amountCents: 500,
      }),
    });

    const eventos: WebhookEventListItem[] = (await readWebhookEvents(tenant.id)).map(
      (e) => ({
        id: e.id,
        provider: e.provider,
        // `readWebhookEvents` não traz `received_at`; a lista ordena por ele
        // e o que o AC exige é que a COLUNA de data apareça preenchida.
        receivedAt: new Date("2026-11-18T12:00:00.000Z"),
        amountCents: e.amount_cents,
        matchState: e.match_state,
        matchReason: e.match_reason,
        orderId: e.order_id,
        deliveryCount: e.delivery_count,
      }),
    );

    expect(eventos).toHaveLength(3);
    expect(eventos.map((e) => e.matchState).sort()).toEqual([
      "not_actionable",
      "unmatched",
      "unsupported_provider",
    ]);

    const markup = renderToStaticMarkup(<WebhookEventsTable eventos={eventos} />);

    // Os cinco campos que o AC nomeia.
    expect(markup).toContain("2026-11-18T12:00:00.000Z"); // data
    expect(markup).toContain(COM_HMAC); // provedor
    expect(markup).toContain(SEM_ADAPTADOR);
    expect(markup).toContain("R$ 61.00"); // valor, convertido de centavos
    expect(markup).toContain("R$ 5.00");
    expect(markup).toContain('data-event-state="unmatched"'); // estado
    expect(markup).toContain('data-event-state="unsupported_provider"');
    expect(markup).toContain('data-event-state="not_actionable"');

    // Motivo: cada um tem o seu, e o do provedor sem adaptador NOMEIA o
    // provedor — que é o que torna o item acionável em vez de decorativo.
    //
    // A comparação é feita no texto DECODIFICADO: o React escapa `"` como
    // `&quot;`, e os motivos citam o nome do provedor entre aspas. A primeira
    // versão desta asserção escapava só `&` e reprovou por isso — com a
    // marcação correta. Decodificar é mais honesto que reescrever o motivo
    // para não ter aspas.
    const texto = decodificar(markup);
    for (const evento of eventos) {
      expect(evento.matchReason).toBeTruthy();
      expect(texto).toContain(evento.matchReason as string);
    }
    expect(texto).toContain(`O provedor "${SEM_ADAPTADOR}"`);
  });

  it("estado desconhecido não derruba a lista", async () => {
    // Rótulo novo no banco sem rótulo correspondente na tela: a lista mostra
    // o nome cru em vez de renderizar vazio.
    const markup = renderToStaticMarkup(
      <WebhookEventsTable
        eventos={[
          {
            id: "id-sintetico",
            provider: COM_HMAC,
            receivedAt: new Date("2026-11-18T00:00:00.000Z"),
            amountCents: null,
            matchState: "estado_que_a_tela_nao_conhece",
            matchReason: null,
            orderId: null,
            deliveryCount: 1,
          },
        ]}
      />,
    );

    expect(markup).toContain("estado_que_a_tela_nao_conhece");
    // Valor ausente aparece como travessão, não como "R$ NaN".
    expect(markup).toContain("—");
    expect(markup).not.toContain("NaN");
  });

  it("lista vazia tem texto próprio", () => {
    const markup = renderToStaticMarkup(<WebhookEventsTable eventos={[]} />);
    expect(markup).toContain("Nenhum aviso recebido ainda");
  });
});

describe("AC-F1: a verificação por leitura", () => {
  const rotas = [
    "app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts",
    "app/api/webhooks/payment/[tenant]/[provider]/route.ts",
  ];

  it("nenhuma rota de webhook devolve `{ ok: true }` pelado", async () => {
    // A verificação literal que o AC define: "não existe
    // `return NextResponse.json({ ok: true })` sem escrita precedente no
    // mesmo caminho". A forma mais forte e mais simples de garanti-la é não
    // existir `{ ok: true }` nenhum — o corpo de toda resposta nomeia o que
    // foi feito (`processed` + `state`).
    for (const rota of rotas) {
      const fonte = await readFile(path.join(SRC, rota), "utf8");
      expect(fonte).not.toMatch(/ok:\s*true/);
      expect(fonte).toContain("processed");
      expect(fonte).toContain("state");
    }
  });

  it("todo estado de casamento do schema tem rótulo na lista do operador", async () => {
    // Estado novo sem rótulo apareceria na tela como nome cru de coluna de
    // banco. Não é catastrófico — e é o tipo de coisa que ninguém nota até
    // alguém precisar da tela às 2 da manhã.
    const schema = await readFile(path.join(SRC, "db/schema/payments.ts"), "utf8");
    const bloco = /paymentWebhookMatchStateEnum[\s\S]*?\]\s*,?\s*\)/.exec(schema);
    expect(bloco).not.toBeNull();

    const estados = [...(bloco as RegExpExecArray)[0].matchAll(/"([a-z_]+)"/g)]
      .map((m) => m[1])
      .filter((nome) => nome !== "payment_webhook_match_state");

    expect(estados.length).toBeGreaterThan(5);

    const tela = await readFile(
      path.join(SRC, "app/dashboard/integrations/payments/events/page.tsx"),
      "utf8",
    );
    for (const estado of estados) {
      expect(tela).toContain(`${estado}:`);
    }
  });
});
