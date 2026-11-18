// Criar e RECUPERAR a cobrança do pedido (LTM-03b, AC8, AC9, AC12, AC13).
//
// Banco Postgres de verdade (a base descartável da LTM-05) e dublê HTTP em
// porta própria. Nenhuma chamada à Paysure, nenhuma credencial real — AC11.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ensurePixCharge,
  readPixCharge,
  tenantHasActiveGateway,
} from "@/lib/actions/pix-charge";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import {
  savePaymentGatewayForTenant,
  setPaymentGatewayActiveForTenant,
} from "@/lib/payments/gateway-config";
import { chargeExpirationSecondsFor } from "@/lib/payments/paysure-client";

import { orderIdOf, titulos } from "../../helpers/actions";
import { query, queryOne } from "../../helpers/db";
import {
  createRaffle,
  createTenant,
  readOrder,
  setGatewayActive,
  setOrderStatus,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../../helpers/seed";
import { PaysureDouble, createdResponse, syntheticCredentials } from "./double";

const PAYSURE = "paysure";
const duble = new PaysureDouble();

let tenant: SeededTenant;
let raffle: SeededRaffle;

interface PixChargeRow {
  order_id: string;
  provider: string;
  reference_code: string;
  br_code: string;
  expires_at: string;
  tenant_id: string;
}

async function readChargeRows(orderId: string): Promise<PixChargeRow[]> {
  return query<PixChargeRow>(
    `SELECT order_id, provider, reference_code, br_code, expires_at, tenant_id
       FROM pix_charges WHERE order_id = $1`,
    [orderId],
  );
}

async function reservar(numeros: number[]): Promise<string> {
  return orderIdOf(
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(...numeros),
      phone: syntheticPhone(),
    }),
  );
}

/** Configura a paysure pelo caminho de PRODUÇÃO: credencial cifrada + token. */
async function ligarPaysure(): Promise<void> {
  await savePaymentGatewayForTenant(tenant.id, {
    provider: PAYSURE,
    credentials: syntheticCredentials(),
  });
  // `savePaymentGateway` nasce DESLIGADO de propósito (AC-A4 da LTM-03a):
  // ligar é ato explícito do operador.
  await setPaymentGatewayActiveForTenant(tenant.id, PAYSURE, true);
}

beforeAll(async () => {
  await duble.start();
  // A base da API aponta para o dublê, e a base pública do app é a que
  // monta a `postbackUrl`. As duas por ambiente, como a própria Paysure
  // recomenda para separar produção de teste (§1).
  process.env.PAYSURE_API_BASE_URL = duble.baseUrl;
  process.env.APP_PUBLIC_BASE_URL = "https://loja-de-teste.invalid";
});

afterAll(async () => {
  await duble.stop();
  delete process.env.PAYSURE_API_BASE_URL;
  delete process.env.APP_PUBLIC_BASE_URL;
});

beforeEach(async () => {
  duble.reset();
  tenant = await createTenant();
  raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
});

describe("AC8: a cobrança é persistida ANTES de ser mostrada", () => {
  it("criação bem-sucedida grava reference_code, BR Code e expiração", async () => {
    await ligarPaysure();
    const orderId = await reservar([0, 1]);

    const resposta = createdResponse();
    duble.enqueue(resposta);

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await readChargeRows(orderId);
    expect(row).toBeDefined();
    expect(row.provider).toBe(PAYSURE);
    expect(row.tenant_id).toBe(tenant.id);
    // Os dois valores que a Paysure devolveu, gravados.
    const esperado = (resposta.body as { qrcode: { reference_code: string; content: string } })
      .qrcode;
    expect(row.reference_code).toBe(esperado.reference_code);
    expect(row.br_code).toBe(esperado.content);

    // ⚠️ O que a ação devolve é o que está GRAVADO, não o que ficou em
    // memória: a releitura do banco é parte do caminho.
    expect(result.brCode).toBe(row.br_code);
    expect(result.referenceCode).toBe(row.reference_code);
    expect(result.created).toBe(true);
  });

  it("a expiração gravada reflete a janela da reserva, não o padrão da Paysure", async () => {
    await ligarPaysure();
    const orderId = await reservar([2]);
    duble.enqueue(createdResponse());

    const antes = Date.now();
    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const segundos = chargeExpirationSecondsFor({ id: raffle.id });
    const esperado = antes + segundos * 1000;
    // Tolerância de um minuto: o relógio corre entre a chamada e a
    // asserção. O que se verifica é que NÃO é 1 h nem 24 h (o padrão do
    // provedor), e sim a janela da reserva.
    expect(Math.abs(result.expiresAt.getTime() - esperado)).toBeLessThan(60_000);
    expect(segundos).toBeLessThan(3600);
  });

  it("`readPixCharge` devolve a linha gravada, e `null` quando não há", async () => {
    await ligarPaysure();
    const orderId = await reservar([3]);
    expect(await readPixCharge(orderId)).toBeNull();

    duble.enqueue(createdResponse());
    await ensurePixCharge(orderId);

    const lida = await readPixCharge(orderId);
    expect(lida).not.toBeNull();
    expect(lida?.created).toBe(false);
  });

  it("segunda chamada NÃO procura a Paysure — a nossa linha vem primeiro", async () => {
    await ligarPaysure();
    const orderId = await reservar([4]);
    duble.enqueue(createdResponse());

    const primeira = await ensurePixCharge(orderId);
    expect(duble.requests).toHaveLength(1);

    const segunda = await ensurePixCharge(orderId);
    // Nenhuma chamada nova: o dublê não foi programado para uma segunda, e
    // se tivesse sido procurado responderia 599.
    expect(duble.requests).toHaveLength(1);
    expect(segunda.ok).toBe(true);
    if (segunda.ok && primeira.ok) {
      expect(segunda.brCode).toBe(primeira.brCode);
      expect(segunda.created).toBe(false);
    }
  });
});

describe("AC9: o 409 tem saída", () => {
  it("409 com a nossa linha gravada devolve O MESMO BR Code", async () => {
    await ligarPaysure();
    const orderId = await reservar([5]);
    duble.enqueue(createdResponse());
    const primeira = await ensurePixCharge(orderId);
    expect(primeira.ok).toBe(true);
    if (!primeira.ok) return;

    // O AC, ao pé da letra: segunda chamada para o mesmo pedido com o
    // dublê devolvendo 409 não cria cobrança nova e devolve O MESMO BR
    // Code. O dublê fica armado com 409 para que, se a ação CHAMAR, ela
    // receba o conflito.
    duble.always({ status: 409, body: { error: "Já existe uma transação com esse ID Externo" } });
    const segunda = await ensurePixCharge(orderId);

    expect(segunda.ok).toBe(true);
    if (segunda.ok) expect(segunda.brCode).toBe(primeira.brCode);
    // Nenhuma cobrança nova: uma linha, sempre.
    expect(await readChargeRows(orderId)).toHaveLength(1);

    // E mais forte do que o AC pede: a ação nem chamou. A nossa linha vem
    // ANTES do provedor, então o 409 não é pago em latência nem em cota de
    // taxa no caminho sequencial.
    //
    // ⚠️ Consequência disto, dita em voz alta: o ramo "409 e a linha
    // existe" dentro de `ensurePixCharge` é INALCANÇÁVEL sequencialmente,
    // por desenho. Ele existe para a corrida — duas chamadas simultâneas
    // para o mesmo pedido, a primeira recebendo 201 e a segunda 409 — e
    // essa corrida não é testada aqui porque o resultado dela depende de
    // qual transação cometeu primeiro, e teste cuja asserção depende disso
    // é teste intermitente. O que está verificado é o OBSERVÁVEL: mesmo BR
    // Code, uma linha, nenhuma cobrança nova.
    expect(duble.requests).toHaveLength(1);
  });

  it("409 vindo da Paysure numa primeira chamada recupera a linha que já existia", async () => {
    await ligarPaysure();
    const orderId = await reservar([6]);

    // Linha gravada "por fora", como se uma execução anterior tivesse
    // criado a cobrança e perdido a resposta. A ação não sabe disso — ela
    // encontra a linha e nem chama.
    const gravada = await queryOne<{ br_code: string }>(
      `INSERT INTO pix_charges
         (tenant_id, order_id, provider, reference_code, br_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + interval '15 minutes')
       RETURNING br_code`,
      [
        tenant.id,
        orderId,
        PAYSURE,
        "PSR-sintetico-pre-existente",
        "00020126-br-code-sintetico-pre-existente",
      ],
    );

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.brCode).toBe(gravada.br_code);
    expect(duble.requests).toHaveLength(0);
  });

  it("409 SEM linha gravada falha ALTO, e NÃO devolve tela sem código", async () => {
    // ⚠️ O estado sem saída, e o único em que a Paysure e nós discordamos
    // sobre a existência da cobrança. Ele só ocorre se a gravação falhar
    // depois da chamada — e falhar alto aqui é a diferença entre o operador
    // ver um item para resolver e o comprador ver uma tela vazia.
    await ligarPaysure();
    const orderId = await reservar([7]);
    duble.always({
      status: 409,
      body: { error: "Já existe uma transação com esse ID Externo" },
    });

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.refusal).toBe("duplicate_without_charge");
    expect(result.providerKind).toBe("duplicate");
    expect(result.operatorAction).toBe(true);
    // O motivo nomeia o que é irrecuperável e o que fazer.
    expect(result.reason).toContain("IRRECUPERÁVEL");
    expect(result.reason).toContain("Revisão manual");
    // E nenhuma linha foi inventada para tapar o buraco.
    expect(await readChargeRows(orderId)).toHaveLength(0);
  });
});

describe("AC12: o provedor do pedido fica registrado", () => {
  it("`orders.payment_gateway_provider` passa a ser preenchido", async () => {
    await ligarPaysure();
    const orderId = await reservar([8]);

    // O estado de hoje: a coluna existe e NENHUM código escrevia nela.
    const antes = await queryOne<{ payment_gateway_provider: string | null }>(
      `SELECT payment_gateway_provider FROM orders WHERE id = $1`,
      [orderId],
    );
    expect(antes.payment_gateway_provider).toBeNull();

    duble.enqueue(createdResponse());
    await ensurePixCharge(orderId);

    const depois = await queryOne<{ payment_gateway_provider: string | null }>(
      `SELECT payment_gateway_provider FROM orders WHERE id = $1`,
      [orderId],
    );
    expect(depois.payment_gateway_provider).toBe(PAYSURE);
  });

  it("cobrança gravada e provedor registrado andam juntos", async () => {
    // As duas escritas estão na mesma transação: cobrança sem provedor
    // deixaria a coluna mentindo sobre por onde o dinheiro vem.
    await ligarPaysure();
    const orderId = await reservar([9]);
    duble.enqueue(createdResponse());
    await ensurePixCharge(orderId);

    const [row] = await readChargeRows(orderId);
    const order = await queryOne<{ payment_gateway_provider: string | null }>(
      `SELECT payment_gateway_provider FROM orders WHERE id = $1`,
      [orderId],
    );
    expect(Boolean(row)).toBe(order.payment_gateway_provider === PAYSURE);
  });
});

describe("as recusas da ação são nomeadas, nunca \"erro ao gerar cobrança\"", () => {
  it("pedido inexistente", async () => {
    const result = await ensurePixCharge("00000000-0000-4000-8000-000000000000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal).toBe("order_not_found");
    expect(duble.requests).toHaveLength(0);
  });

  it("pedido que não está pendente não é cobrado", async () => {
    await ligarPaysure();
    const orderId = await reservar([0]);
    await setOrderStatus(orderId, "paid");

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal).toBe("order_not_pending");
      expect(result.reason).toContain("paid");
    }
    // Cobrar pedido pago é criar caminho para o comprador pagar duas vezes.
    expect(duble.requests).toHaveLength(0);
  });

  it("operador sem gateway paysure configurado", async () => {
    const orderId = await reservar([1]);
    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal).toBe("no_active_gateway");
      expect(result.reason).toContain("paysure");
    }
    expect(duble.requests).toHaveLength(0);
  });

  it("gateway configurado e DESLIGADO não cobra", async () => {
    await ligarPaysure();
    await setGatewayActive(tenant.id, PAYSURE, false);
    const orderId = await reservar([2]);

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal).toBe("no_active_gateway");
      expect(result.reason).toContain("desativado");
    }
    // Coerente com a rota, que recusa o aviso de gateway desligado: cobrar
    // e não poder fechar é o pior par possível.
    expect(duble.requests).toHaveLength(0);
  });

  it("credencial incompleta nomeia QUAL cabeçalho falta, sem chamar", async () => {
    // A API exige os DOIS (§1); meia credencial voltaria 401 e ninguém
    // saberia por quê. Era o defeito que a LTM-03a corrigiu no
    // armazenamento — aqui é a guarda na leitura.
    await ligarPaysure();
    await query(
      `UPDATE payment_gateways SET credentials_encrypted = NULL
        WHERE tenant_id = $1 AND provider = $2`,
      [tenant.id, PAYSURE],
    );
    const orderId = await reservar([3]);

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal).toBe("missing_credentials");
      expect(result.reason).toContain("`ci`");
      expect(result.reason).toContain("`cs`");
    }
    expect(duble.requests).toHaveLength(0);
  });

  it("gateway sem token de webhook não cobra — a postbackUrl não seria autêntica", async () => {
    await ligarPaysure();
    await query(
      `UPDATE payment_gateways SET webhook_token = NULL
        WHERE tenant_id = $1 AND provider = $2`,
      [tenant.id, PAYSURE],
    );
    const orderId = await reservar([4]);

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal).toBe("missing_webhook_token");
    // Cobrar sem token é combinar receber o dinheiro com não poder fechar o
    // pedido: o aviso voltaria e a rota o recusaria.
    expect(duble.requests).toHaveLength(0);
  });

  it("sem APP_PUBLIC_BASE_URL a cobrança não é criada, e a variável é nomeada", async () => {
    await ligarPaysure();
    const orderId = await reservar([5]);
    const anterior = process.env.APP_PUBLIC_BASE_URL;
    delete process.env.APP_PUBLIC_BASE_URL;
    try {
      const result = await ensurePixCharge(orderId);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.refusal).toBe("missing_base_url");
        expect(result.reason).toContain("APP_PUBLIC_BASE_URL");
      }
      expect(duble.requests).toHaveLength(0);
    } finally {
      process.env.APP_PUBLIC_BASE_URL = anterior;
    }
  });

  it("a recusa do provedor chega com a classe e o motivo dele", async () => {
    await ligarPaysure();
    const orderId = await reservar([6]);
    duble.always({ status: 501, body: {} });

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal).toBe("provider_refused");
      expect(result.providerKind).toBe("not_implemented");
      expect(result.reason).toContain("501");
    }
    // 501 não repete, nem passando pela ação.
    expect(duble.requests).toHaveLength(1);
    expect(await readChargeRows(orderId)).toHaveLength(0);
  });

  it("valor abaixo do mínimo da Paysure é recusado pela ação, sem chamada", async () => {
    // AC10b pelo caminho de verdade: sorteio de R$ 0,50 é configuração
    // plausível, e o pedido de uma unidade vale 50 centavos.
    const baratinho = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      pricePerNumber: "0.50",
    });
    await ligarPaysure();
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: baratinho.slug,
        units: titulos(0),
        phone: syntheticPhone(),
      }),
    );
    expect((await readOrder(orderId)).amount).toBe("0.50");

    const result = await ensurePixCharge(orderId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.providerKind).toBe("below_minimum");
      expect(result.reason).toContain("100");
    }
    expect(duble.requests).toHaveLength(0);
  });
});

describe("AC13: a pergunta que decide a simulação", () => {
  it("`tenantHasActiveGateway` é falso sem gateway, verdadeiro com gateway LIGADO", async () => {
    expect(await tenantHasActiveGateway(tenant.id)).toBe(false);

    await savePaymentGatewayForTenant(tenant.id, {
      provider: PAYSURE,
      credentials: syntheticCredentials(),
    });
    // Configurado e desligado ainda não é caminho de dinheiro: a rota
    // recusaria o aviso. Então a simulação tem de continuar visível.
    expect(await tenantHasActiveGateway(tenant.id)).toBe(false);

    await setPaymentGatewayActiveForTenant(tenant.id, PAYSURE, true);
    expect(await tenantHasActiveGateway(tenant.id)).toBe(true);
  });
});
