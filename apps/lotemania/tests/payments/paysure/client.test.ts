// O cliente de SAÍDA da Paysure — a cobrança (LTM-03b, AC7, AC10, AC10b, AC10c).
//
// Todos os testes falam com o dublê HTTP em 127.0.0.1 (`./double.ts`).
// Nenhuma chamada à API real, nenhuma credencial real — AC11.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  PAYSURE_API_BASE,
  PAYSURE_EXPIRATION_MAX_SECONDS,
  PAYSURE_EXPIRATION_MIN_SECONDS,
  PAYSURE_MIN_VALUE_CENTS,
  backoffMs,
  chargeExpirationSecondsFor,
  createPixCharge,
  type CreateChargeInput,
  type PaysureFailure,
} from "@/lib/payments/paysure-client";
import { reservationMinutesFor } from "@/lib/validations/reserve";

import { PaysureDouble, createdResponse, syntheticCredentials } from "./double";
import { codigoDe } from "./source";

const duble = new PaysureDouble();

/** O sorteio, pelo que a janela de reserva precisa dele. Sintético. */
const sorteio = { id: "33333333-3333-4333-8333-333333333333", advancedSettings: {} };

/** Esperas registradas em vez de esperadas — ver `CreateChargeInput.sleep`. */
let esperas: number[] = [];

function chamada(overrides: Partial<CreateChargeInput> = {}): CreateChargeInput {
  return {
    credentials: syntheticCredentials(),
    externalId: "44444444-4444-4444-8444-444444444444",
    valueCents: 6100,
    postbackUrl:
      "https://exemplo.invalid/api/webhooks/payment/operador/paysure/token-sintetico",
    description: "Pedido #44444444 — Sorteio sintetico",
    expirationSeconds: chargeExpirationSecondsFor(sorteio),
    baseUrl: duble.baseUrl,
    sleep: async (ms: number) => {
      esperas.push(ms);
    },
    ...overrides,
  };
}

function falha(result: Awaited<ReturnType<typeof createPixCharge>>): PaysureFailure {
  if (result.ok) {
    throw new Error(`Esperava recusa e a cobrança foi criada: ${JSON.stringify(result)}`);
  }
  return result;
}

beforeAll(async () => {
  await duble.start();
});

afterAll(async () => {
  await duble.stop();
});

beforeEach(() => {
  duble.reset();
  esperas = [];
});

describe("AC7: a cobrança nasce com os dois relógios amarrados", () => {
  it("`expiration_seconds` é igual à janela da reserva × 60, lida da FONTE", async () => {
    duble.enqueue(createdResponse());
    const result = await createPixCharge(chamada());
    expect(result.ok).toBe(true);

    // ⚠️ A comparação é com a função IMPORTADA, nunca com o literal 900.
    // Mudar a janela da reserva tem de mudar a cobrança, e é isto que
    // prova: se `reservationMinutesFor` passar a devolver 30, este teste
    // continua passando e o corpo enviado passa a dizer 1800. Um `toBe(900)`
    // aqui passaria a reprovar — provando o oposto do que o AC quer.
    const esperado = reservationMinutesFor(sorteio) * 60;
    expect(duble.lastBody().expiration_seconds).toBe(esperado);
    expect(chargeExpirationSecondsFor(sorteio)).toBe(esperado);

    // E o valor enviado cabe na faixa do contrato (60 a 86 400, §4.1),
    // qualquer que seja a janela que a função devolva.
    //
    // ⚠️ Esta asserção é barata e vale mais do que parece: medido no painel
    // da Sorteamos em 2026-11-18
    // (`docs/research/2026-11-18-inventario-sorteamos/README.md`), a lista de
    // janelas de reserva de lá é **3, 4, 5, 10 e 30 minutos, 1 hora, 3 horas
    // e 1 dia** — e 15 minutos **não existe**. Ou seja: o conjunto de
    // valores que a `LTM-17` vai oferecer provavelmente NÃO é o conjunto de
    // hoje. Os extremos de lá (180 s e 86 400 s) continuam dentro da faixa
    // da Paysure, e esta asserção é o que avisa se algum valor futuro sair
    // dela — sem cravar nenhum valor, que é o ponto do AC7.
    expect(Number(duble.lastBody().expiration_seconds)).toBeGreaterThanOrEqual(
      PAYSURE_EXPIRATION_MIN_SECONDS,
    );
    expect(Number(duble.lastBody().expiration_seconds)).toBeLessThanOrEqual(
      PAYSURE_EXPIRATION_MAX_SECONDS,
    );
  });

  it("nenhum arquivo do caminho da cobrança crava o literal 900", async () => {
    // A outra metade do AC: o valor não pode existir escrito à mão em
    // lugar nenhum, senão a amarração seria coincidência.
    for (const arquivo of [
      "lib/payments/paysure-client.ts",
      "lib/actions/pix-charge.ts",
      "lib/validations/reserve.ts",
    ]) {
      // `codigoDe` tira comentario e literal: o 900 aparece no comentario
      // que diz "nunca com o literal 900", e a varredura ingenua reprovava
      // o arquivo por ele prometer o que promete. Ver `./source.ts`.
      expect(await codigoDe(arquivo), `${arquivo} crava o literal 900`).not.toMatch(
        /\b900\b/,
      );
    }
  });

  it("janela fora da faixa da Paysure falha ANTES da chamada, nomeando", async () => {
    // Rede de segurança do contrato (§4.1: 60 a 86 400). Se a configuração
    // por sorteio da LTM-17 deixar passar 1 minuto... ou 2 dias, o motivo
    // tem de chegar daqui, não de um 422 remoto.
    const curta = falha(await createPixCharge(chamada({ expirationSeconds: 30 })));
    expect(curta.attempts).toBe(0);
    expect(curta.reason).toContain("fora da faixa");
    expect(duble.requests).toHaveLength(0);

    const longa = falha(await createPixCharge(chamada({ expirationSeconds: 90_000 })));
    expect(longa.attempts).toBe(0);
    expect(duble.requests).toHaveLength(0);
  });
});

describe("AC10c: nenhum campo opcional é inventado", () => {
  it("o corpo enviado tem EXATAMENTE as cinco chaves obrigatórias + duas", async () => {
    duble.enqueue(createdResponse());
    await createPixCharge(chamada());

    // ⚠️ Asserção sobre as CHAVES, não sobre os valores. É a regra "não
    // inventar valor de preenchimento para campo opcional" virando
    // verificação: um `generator_name: ""` passaria por uma asserção de
    // valor e é exatamente o que não pode existir.
    expect(Object.keys(duble.lastBody()).sort()).toEqual([
      "description",
      "expiration_seconds",
      "external_id",
      "postbackUrl",
      "value_cents",
    ]);
  });

  it("`generator_name`, `generator_document` e `splits` NÃO são enviados", async () => {
    duble.enqueue(createdResponse());
    await createPixCharge(chamada());
    const corpo = duble.lastBody();

    // Os dois `generator_*` são OPCIONAIS (§4.1). Mandá-los seria mandar
    // dado pessoal a um terceiro sem necessidade — e o lotemania nem coleta
    // CPF na reserva. `splits` muda o desenho de afiliados e está no OUT.
    for (const chave of ["generator_name", "generator_document", "splits"]) {
      expect(corpo).not.toHaveProperty(chave);
    }
    // E nem como `undefined` serializado.
    expect(duble.requests.at(-1)?.rawBody).not.toContain("generator");
    expect(duble.requests.at(-1)?.rawBody).not.toContain("splits");
  });

  it("o cliente manda os DOIS cabeçalhos de autenticação, nunca um", async () => {
    duble.enqueue(createdResponse());
    const credentials = syntheticCredentials();
    await createPixCharge(chamada({ credentials }));

    const headers = duble.requests.at(-1)!.headers;
    expect(headers.ci).toBe(credentials.ci);
    expect(headers.cs).toBe(credentials.cs);
  });

  it("`description` é truncada em 255 caracteres (§4.1)", async () => {
    duble.enqueue(createdResponse());
    await createPixCharge(chamada({ description: "x".repeat(400) }));
    expect(String(duble.lastBody().description)).toHaveLength(255);
  });
});

describe("AC10b: o mínimo de valor é respeitado ANTES da chamada", () => {
  it.each([99, 50, 1, 0])(
    "%i centavos é recusado sem gastar chamada",
    async (valueCents) => {
      const result = falha(await createPixCharge(chamada({ valueCents })));
      expect(result.kind).toBe("below_minimum");
      expect(result.attempts).toBe(0);
      expect(result.retriable).toBe(false);
      expect(result.reason).toContain(String(PAYSURE_MIN_VALUE_CENTS));
      // A verificação que importa: o dublê não foi procurado. Gastar uma
      // chamada para colher um 422 previsível é pagar cota de taxa para
      // descobrir o que a documentação já diz — e um título de R$ 0,50 é
      // configuração plausível num sorteio.
      expect(duble.requests).toHaveLength(0);
    },
  );

  it("exatamente 100 centavos passa — o mínimo é inclusivo", async () => {
    duble.enqueue(createdResponse());
    const result = await createPixCharge(chamada({ valueCents: 100 }));
    expect(result.ok).toBe(true);
    expect(duble.requests).toHaveLength(1);
  });

  it("valor não inteiro é recusado antes da chamada", async () => {
    const result = falha(await createPixCharge(chamada({ valueCents: 610.5 })));
    expect(result.kind).toBe("below_minimum");
    expect(duble.requests).toHaveLength(0);
  });
});

describe("AC10: as OITO classes de erro são distinguidas", () => {
  // Oito casos, oito asserções. O desenho original da story previa seis;
  // 404, 500 e 501 entraram em 2026-11-18 da tabela completa de §7.1.

  it("401 — credencial ausente ou inválida: nomeia, não repete, vai ao operador", async () => {
    duble.always({ status: 401, body: { error: "unauthorized" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("unauthenticated");
    expect(result.status).toBe(401);
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.operatorAction).toBe(true);
    expect(result.reason).toContain("credencial");
    // Não é erro de comprador, e a mensagem diz isso.
    expect(result.reason).toContain("NÃO é erro do comprador");
    expect(esperas).toEqual([]);
  });

  it("403 — conta inativa: nomeia a conta, sem retry, vai ao operador", async () => {
    duble.always({ status: 403, body: { error: "account inactive" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("account_inactive");
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.operatorAction).toBe(true);
    expect(result.reason).toContain("conta inativa");
  });

  it("404 — rota ou base errada: problema NOSSO, nomeado, sem retry", async () => {
    duble.always({ status: 404, body: { error: "not found" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("not_found");
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.reason).toContain("rota");
    expect(esperas).toEqual([]);
  });

  it("422 — validação: SEM retry, porque repetir não corrige payload", async () => {
    duble.always({ status: 422, body: { error: "validation" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("validation");
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(duble.requests).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("429 — limite de taxa: respeita `Retry-After`, nunca retry imediato", async () => {
    duble.enqueue(
      { status: 429, headers: { "Retry-After": "7" }, body: { error: "rate limited" } },
      createdResponse(),
    );
    const result = await createPixCharge(chamada());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    // A espera foi a QUE ELA MANDOU, em milissegundos, e não o recuo
    // interno. Zero espera é o defeito que este caso existe para impedir.
    expect(esperas).toEqual([7000]);
  });

  it("429 persistente: desiste no teto de tentativas, carregando o Retry-After", async () => {
    duble.always({
      status: 429,
      headers: { "Retry-After": "3" },
      body: { error: "rate limited" },
    });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("rate_limited");
    expect(result.attempts).toBe(3);
    expect(result.retryAfterSeconds).toBe(3);
    expect(esperas).toEqual([3000, 3000]);
  });

  it("429 com `Retry-After` absurdo é limitado por teto nosso", async () => {
    duble.always({
      status: 429,
      headers: { "Retry-After": "99999" },
      body: {},
    });
    const result = falha(await createPixCharge(chamada({ maxAttempts: 2 })));
    // O provedor não decide por quanto tempo a nossa requisição fica
    // pendurada.
    expect(result.retryAfterSeconds).toBe(60);
    expect(esperas).toEqual([60_000]);
  });

  it("500 — erro interno: retry com RECUO e teto declarado", async () => {
    duble.enqueue({ status: 500, body: { error: "boom" } }, createdResponse());
    const result = await createPixCharge(chamada());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    expect(esperas).toEqual([backoffMs(1)]);
    // Recuo, não repetição imediata.
    expect(esperas[0]).toBeGreaterThan(0);
  });

  it("501 — PERMANENTE: UMA tentativa, sem retry, sem espera", async () => {
    // ⚠️ O caso que o AC10 existe para travar. Um `if (status >= 500) retry`
    // poria este código em laço eterno sobre "operação não disponível para
    // este recurso" — condição que nenhuma repetição muda. O dublê responde
    // 501 SEMPRE: se houvesse retry, `attempts` passaria de 1.
    duble.always({ status: 501, body: { error: "not implemented" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("not_implemented");
    expect(result.status).toBe(501);
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(duble.requests).toHaveLength(1);
    expect(esperas).toEqual([]);
    expect(result.operatorAction).toBe(true);
    expect(result.reason).toContain("PERMANENTE");
  });

  it("503 — indisponível: retry com recuo, e desiste no teto", async () => {
    duble.always({ status: 503, body: { error: "unavailable" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("provider_unavailable");
    expect(result.retriable).toBe(true);
    expect(result.attempts).toBe(3);
    expect(duble.requests).toHaveLength(3);
    // Recuo crescente com teto — não espera fixa, não espera infinita.
    expect(esperas).toEqual([backoffMs(1), backoffMs(2)]);
    expect(Math.max(...esperas)).toBeLessThanOrEqual(8000);
  });

  it("os três que NÃO repetem fazem exatamente uma chamada cada", async () => {
    // A asserção resumida do que mais escorrega: 404, 422 e 501 juntos.
    for (const status of [404, 422, 501]) {
      duble.reset();
      esperas = [];
      duble.always({ status, body: {} });
      const result = falha(await createPixCharge(chamada()));
      expect(result.attempts, `HTTP ${status} repetiu`).toBe(1);
      expect(duble.requests, `HTTP ${status} chamou mais de uma vez`).toHaveLength(1);
      expect(esperas, `HTTP ${status} esperou para repetir`).toEqual([]);
    }
  });

  it("409 — duplicado: reconhecido como classe própria, sem retry", async () => {
    duble.always({ status: 409, body: { error: "duplicado" } });
    const result = falha(await createPixCharge(chamada()));

    expect(result.kind).toBe("duplicate");
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
    // Não é falha do operador: é idempotência funcionando. Quem resolve é
    // `ensurePixCharge`, lendo a nossa linha (AC9).
    expect(result.operatorAction).toBe(false);
  });

  it("código fora da tabela da Paysure não ganha retry por ser 5xx", async () => {
    duble.always({ status: 599, body: {} });
    const result = falha(await createPixCharge(chamada()));
    expect(result.kind).toBe("unexpected_status");
    expect(result.retriable).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it("201 com corpo sem `qrcode.content` é recusado — e diz por quê", async () => {
    duble.always({
      status: 201,
      body: { qrcode: { reference_code: "PSR-sintetico-sem-content" } },
    });
    const result = falha(await createPixCharge(chamada()));
    expect(result.kind).toBe("malformed_response");
    expect(result.reason).toContain("BR Code");
  });

  it("a classificação não usa faixa de código — a tabela está no código", async () => {
    const codigo = await codigoDe("lib/payments/paysure-client.ts");
    // A forma do defeito, proibida por leitura além de por comportamento.
    // O próprio comentário de `classify` ESCREVE `if (status >= 500) retry`
    // para dizer que ela não existe — por isso a varredura é sobre o
    // código, não sobre o texto. Ver `./source.ts`.
    expect(codigo).not.toMatch(/status\s*>=\s*500/);
    expect(codigo).not.toMatch(/status\s*>\s*499/);
    for (const status of [401, 403, 404, 409, 422, 429, 500, 501, 503]) {
      expect(codigo, `o código ${status} não tem ramo próprio`).toContain(
        `case ${status}:`,
      );
    }
  });
});

describe("AC11: nenhuma credencial, e nenhuma chamada à Paysure de verdade", () => {
  it("todas as chamadas da suíte foram para 127.0.0.1", async () => {
    duble.enqueue(createdResponse());
    await createPixCharge(chamada());
    expect(duble.baseUrl).toContain("127.0.0.1");
    expect(duble.baseUrl).not.toContain("paysurebr");
  });

  it("a base real é o padrão do cliente, e o teste nunca aponta para ela", async () => {
    // A base de produção existe como PADRÃO no cliente — é o endereço
    // certo quando ninguém sobrepõe. O que não pode acontecer é um teste
    // apontar para lá, e é isso que se verifica: toda chamada desta suite
    // foi para o dublê.
    expect(PAYSURE_API_BASE).toBe("https://api.paysurebr.com/v1");

    duble.enqueue(createdResponse());
    await createPixCharge(chamada());
    for (const pedido of duble.requests) {
      expect(pedido.path).toBe("/v1/pix/qrcode");
    }
    // E o cliente não tem credencial nem endereço alternativo escondido.
    const codigo = await codigoDe("lib/payments/paysure-client.ts");
    expect(codigo).not.toMatch(/paysurebr/);
  });

  it("nenhum artefato da story contém variável de credencial com valor", async () => {
    for (const arquivo of [
      "lib/payments/paysure-client.ts",
      "lib/payments/providers/paysure.ts",
      "lib/actions/pix-charge.ts",
    ]) {
      const fonte = await codigoDe(arquivo);
      // Nenhuma atribuição de `ci`/`cs` a um literal de string.
      expect(fonte).not.toMatch(/\bci\s*[:=]\s*"[^"]+"/);
      expect(fonte).not.toMatch(/\bcs\s*[:=]\s*"[^"]+"/);
      expect(fonte).not.toMatch(/PAYSURE_(CI|CS)\b/);
    }
  });
});
