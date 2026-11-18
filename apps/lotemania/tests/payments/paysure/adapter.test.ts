// O adaptador de ENTRADA da Paysure — o aviso (LTM-03b, AC1 a AC6c).
//
// ════════════════════════════════════════════════════════════════════════
// TODAS AS FIXTURES AQUI SÃO SINTÉTICAS, E A FORMA VEM DA DOCUMENTAÇÃO
//
// Nenhum corpo abaixo é um aviso real de produção: o primeiro aviso real do
// Império ainda não existe (é o portão G5 do epic, que espera o `ci`/`cs`).
// A forma vem de `docs/research/2026-11-16-paysure-contrato.md` §2 e §9, e o
// risco de a documentação divergir do produtivo está registrado como risco
// [Alto] da story — mitigado por `payment_webhook_events` gravar o corpo cru
// ANTES de qualquer decisão, e por este adaptador recusar em voz alta o que
// não reconhece, em vez de adivinhar.
//
// `payer_name` e `payer_document` aparecem em algumas fixtures porque o
// aviso real os traz, e os valores são marcadores que não têm a forma de
// nome nem de CPF — o mascaramento na escrita é verificado em
// `webhook.test.ts`.
// ════════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";

import { adapterFor, providersWithoutAdapter } from "@/lib/payments/providers";
import {
  PAYSURE_CASHIN_STATUSES,
  PAYSURE_PROVIDER,
  PAYSURE_REFUND_EVENTS,
  PAYSURE_SIGNATURE_SCHEME,
  createPaysureAdapter,
} from "@/lib/payments/providers/paysure";
import type { ParsedEvent } from "@/lib/payments/providers/types";

import { codigoDe, fonteDe } from "./source";

const adaptador = createPaysureAdapter();

/** Um corpo de cash-in, na forma documentada em §2/§9.3. */
function cashin(overrides: Record<string, unknown> = {}) {
  return {
    cashin: {
      reference_code: "PSR-sintetico-cashin-1",
      external_reference: "11111111-1111-4111-8111-111111111111",
      value_cents: 6100,
      status: "paid",
      payer_name: "marcador-sintetico-de-nome",
      payer_document: "marcador-sintetico-de-documento",
      payment_date: "2026-11-18T10:13:01-03:00",
      registration_date: "2026-11-18T10:12:15-03:00",
      end_to_end: "E-sintetico-18236120202611181013",
      content: "00020126-br-code-sintetico-do-aviso",
      ...overrides,
    },
  };
}

function cashout(overrides: Record<string, unknown> = {}) {
  return {
    cashout: {
      reference_code: "PSR-sintetico-cashout-1",
      external_reference: "22222222-2222-4222-8222-222222222222",
      status: "paid",
      end_to_end: "E-sintetico-cashout",
      occurred_at: "2026-11-18T11:00:00-03:00",
      ...overrides,
    },
  };
}

function refund(overrides: Record<string, unknown> = {}) {
  return {
    refund: {
      reference_code: "PSR-sintetico-cashin-1",
      external_reference: "11111111-1111-4111-8111-111111111111",
      status: "refunded",
      amount_cents: 6100,
      end_to_end: "E-sintetico-18236120202611181013",
      devolucao_e2e: "E-sintetico-devolucao",
      ...overrides,
    },
  };
}

function parseOk(payload: unknown): ParsedEvent {
  const result = adaptador.parse(payload);
  if (!result.ok) {
    throw new Error(`Esperava tradução e veio recusa: ${result.reason}`);
  }
  return result.event;
}

function parseRecusa(payload: unknown): string {
  const result = adaptador.parse(payload);
  if (result.ok) {
    throw new Error(
      `Esperava RECUSA e o aviso foi traduzido: ${JSON.stringify(result.event)}`,
    );
  }
  return result.reason;
}

describe("AC1: os três fluxos são distinguidos pela chave de topo", () => {
  it("`cashin`, `cashout` e `refund` são identificados", () => {
    expect(parseOk(cashin()).flow).toBe("cashin");
    expect(parseOk(cashout()).flow).toBe("cashout");
    expect(parseOk(refund()).flow).toBe("refund");
  });

  it("corpo SEM nenhuma das três chaves é recusado, não lido como cash-in", () => {
    // É a diferença entre "não sei o que é isto" e "vou supor que é
    // pagamento" — a segunda fecharia pedido com base em corpo
    // desconhecido.
    const motivo = parseRecusa({
      reference_code: "PSR-sintetico-sem-chave",
      status: "paid",
      value_cents: 6100,
      external_reference: "11111111-1111-4111-8111-111111111111",
    });
    expect(motivo).toContain("sem chave de topo conhecida");
    expect(motivo).toContain('"cashin"');
    // O motivo nomeia o que de fato veio, para a lista do operador ser
    // acionável.
    expect(motivo).toContain('"reference_code"');
  });

  it("corpo com DUAS chaves de topo é recusado — não há como saber qual fluxo é", () => {
    const motivo = parseRecusa({ ...cashin(), ...cashout() });
    expect(motivo).toContain("mais de uma chave de topo");
    expect(motivo).toContain('"cashin"');
    expect(motivo).toContain('"cashout"');
  });

  it("corpo que não é objeto, e chave de topo que não contém objeto", () => {
    expect(parseRecusa([])).toContain("não é um objeto JSON");
    expect(parseRecusa("cashin")).toContain("não é um objeto JSON");
    expect(parseRecusa({ cashin: "paid" })).toContain("não contém um objeto");
  });

  it("aviso sem `reference_code` é recusado — é metade da chave de idempotência", () => {
    expect(parseRecusa(cashin({ reference_code: undefined }))).toContain(
      "reference_code",
    );
  });
});

describe("AC2: o mapeamento de cash-in está completo, campo a campo", () => {
  const corpo = cashin();
  const dentro = corpo.cashin;
  const evento = parseOk(corpo);

  it("`external_reference` vira `orderRef` — é o nosso orders.id", () => {
    expect(evento.orderRef).toBe(dentro.external_reference);
  });

  it("`value_cents` vira `amountCents`, em centavos inteiros", () => {
    expect(evento.amountCents).toBe(dentro.value_cents);
  });

  it("`reference_code` vira `paymentId`", () => {
    expect(evento.paymentId).toBe(dentro.reference_code);
  });

  it("`end_to_end` vira `endToEndId`", () => {
    expect(evento.endToEndId).toBe(dentro.end_to_end);
  });

  it("`payment_date` vira `paidAt`", () => {
    expect(evento.paidAt).toEqual(new Date(dentro.payment_date));
  });

  it("`paid` de cash-in é o ÚNICO estado acionável", () => {
    expect(evento.actionable).toBe(true);
    expect(parseOk(cashin({ status: "refunded" })).actionable).toBe(false);
    expect(parseOk(cashin({ status: "expired" })).actionable).toBe(false);
    expect(parseOk(cashout()).actionable).toBe(false);
    expect(parseOk(refund()).actionable).toBe(false);
  });

  it("`payer_name` e `payer_document` NÃO entram no evento traduzido", () => {
    // Nada no fechamento precisa deles (portão G7). O que o adaptador não
    // traduz não pode ser usado por engano mais adiante.
    const serializado = JSON.stringify(evento);
    expect(serializado).not.toContain(dentro.payer_name);
    expect(serializado).not.toContain(dentro.payer_document);
  });

  it("`registration_date` não é confundido com data de pagamento", () => {
    // §9.3: `registration_date` é quando a cobrança NASCEU. Usá-la como
    // `paidAt` marcaria o pedido como pago na hora em que o QR foi gerado.
    const semPagamento = parseOk(cashin({ payment_date: undefined }));
    expect(semPagamento.paidAt).toBeNull();
  });

  it("valor que não é inteiro em centavos é recusado, não arredondado", () => {
    expect(parseRecusa(cashin({ value_cents: 61.5 }))).toContain(
      "não é inteiro em centavos",
    );
    expect(parseRecusa(cashin({ value_cents: "6100" }))).toContain(
      "não é inteiro em centavos",
    );
  });

  it("data inválida é recusada em vez de virar Invalid Date", () => {
    expect(parseRecusa(cashin({ payment_date: "ontem" }))).toContain(
      "Data inválida",
    );
  });
});

describe("AC4: não há assinatura, e isso está DECLARADO", () => {
  it("o adaptador declara `signature: \"none\"`", () => {
    expect(PAYSURE_SIGNATURE_SCHEME).toBe("none");
    expect(adaptador.signatureScheme).toBe("none");
    // O booleano do contrato comum aos 18 adaptadores diz a mesma coisa.
    expect(adaptador.signsWebhooks).toBe(false);
  });

  it("aviso SEM `x-webhook-signature` e com gateway ativo é ACEITO", () => {
    // Regressão do erro que a LTM-03 ia cometer: sob o esquema HMAC
    // genérico, 100% dos avisos da paysure seriam recusados com 401, porque
    // não existe assinatura a mandar.
    const verificacao = adaptador.verify(
      {
        rawBody: JSON.stringify(cashin()),
        headers: new Headers(),
        token: "token-sintetico-da-url",
      },
      { provider: PAYSURE_PROVIDER, webhookSecret: null, isActive: true },
    );
    expect(verificacao).toEqual({ ok: true });
  });

  it("gateway desativado pelo operador é recusado, nomeando a causa", () => {
    const verificacao = adaptador.verify(
      { rawBody: "{}", headers: new Headers(), token: "tok" },
      { provider: PAYSURE_PROVIDER, webhookSecret: null, isActive: false },
    );
    expect(verificacao.ok).toBe(false);
    if (!verificacao.ok) expect(verificacao.reason).toContain("desativado");
  });

  it("o arquivo DIZ por que não há verificação, e que HMAC vem \"em breve\"", async () => {
    // Não é teste de comentário por capricho: a próxima pessoa que abrir o
    // arquivo e não ler o porquê vai tratar a ausência como esquecimento e
    // "consertar" inventando um HMAC. O aviso de que a Paysure anuncia HMAC
    // como "em breve" (§9.5) é o que impede a conclusão oposta — de que a
    // ausência é permanente.
    // Esta é a única asserção da story que lê o TEXTO de propósito: o que
    // ela verifica é que a explicação existe, não o código.
    const fonte = await fonteDe("lib/payments/providers/paysure.ts");
    expect(fonte).toMatch(/N[ÃA]O assina/i);
    expect(fonte).toContain("em breve");
    expect(fonte).toMatch(/token/i);
    // E não há HMAC nenhum no CÓDIGO deste adaptador — os comentários
    // citam HMAC bastante, e é por isso que dizem o que dizem.
    expect(await codigoDe("lib/payments/providers/paysure.ts")).not.toMatch(
      /createHmac|timingSafeEqual/,
    );
  });

  it("a paysure deixou de estar na lista de provedores sem adaptador", () => {
    expect(adapterFor(PAYSURE_PROVIDER)).not.toBeNull();
    expect(providersWithoutAdapter()).not.toContain(PAYSURE_PROVIDER);
  });
});

describe("AC5: ciclo de vida não é duplicata", () => {
  it("`paid` e `refunded` do MESMO reference_code são eventos distintos", () => {
    // A Paysure orienta deduplicar por `reference_code` — e o aviso de
    // pagamento e o de estorno da mesma transação chegam com o MESMO
    // `reference_code`. Unicidade só por ele recusaria o estorno como
    // duplicata, e estorno recusado em silêncio é faturamento falso no
    // painel do operador.
    const pago = parseOk(cashin({ status: "paid" }));
    const estornado = parseOk(cashin({ status: "refunded" }));
    expect(pago.paymentId).toBe(estornado.paymentId);
    expect(pago.externalEventId).not.toBe(estornado.externalEventId);
    expect(pago.externalEventId).toBe("cashin:PSR-sintetico-cashin-1:paid");
    expect(estornado.externalEventId).toBe("cashin:PSR-sintetico-cashin-1:refunded");
  });

  it("o MESMO `paid` repetido continua sendo a MESMA chave", () => {
    // Reentrega (a Paysure entrega até três vezes) tem de colidir.
    expect(parseOk(cashin()).externalEventId).toBe(
      parseOk(cashin()).externalEventId,
    );
  });

  it("a chave nunca é o `reference_code` pelado", () => {
    for (const payload of [cashin(), cashout(), refund()]) {
      const evento = parseOk(payload);
      expect(evento.externalEventId).not.toBe(evento.paymentId);
      expect(evento.externalEventId).toContain(evento.paymentId as string);
    }
  });
});

describe("AC6: `expired` é registrado com estado próprio", () => {
  it("`expired` traduz, não é acionável, e preserva o status", () => {
    const evento = parseOk(cashin({ status: "expired", payment_date: undefined }));
    expect(evento.status).toBe("expired");
    expect(evento.actionable).toBe(false);
    expect(evento.externalEventId).toContain(":expired");
  });

  it("os três status de cash-in documentados traduzem", () => {
    for (const status of PAYSURE_CASHIN_STATUSES) {
      expect(parseOk(cashin({ status })).status).toBe(status);
    }
  });
});

describe("AC6b: status desconhecido é recusa NOMEADA, nunca ramo genérico", () => {
  // Existe porque a própria documentação se contradiz: `failed` e `pending`
  // estão no modelo da consulta (§9.1) e fora da lista de avisos (§9.2).
  it.each(["failed", "pending", "banana", "PAID", ""])(
    'status "%s" é recusado com o valor literal registrado',
    (status) => {
      const motivo = parseRecusa(cashin({ status }));
      if (status === "") {
        expect(motivo).toContain("sem `status`");
      } else {
        expect(motivo).toContain("Status desconhecido");
        expect(motivo).toContain(`"${status}"`);
        // E a recusa lista o que ele CONHECE, para o leitor decidir se o
        // valor é formato novo ou lixo.
        expect(motivo).toContain('"paid"');
      }
    },
  );

  it("nenhum status desconhecido é tratado como `paid`", () => {
    for (const status of ["failed", "banana"]) {
      const resultado = adaptador.parse(cashin({ status }));
      expect(resultado.ok).toBe(false);
    }
  });

  it("o cash-out tem o seu próprio conjunto, e `expired` não está nele", () => {
    // §2: cash-out é `paid` ou `refunded`. Aceitar `expired` aqui seria
    // assumir que os conjuntos são iguais, e eles não são.
    expect(parseRecusa(cashout({ status: "expired" }))).toContain(
      "Status desconhecido no fluxo \"cashout\"",
    );
  });
});

describe("AC6c: o refund ramifica pelo `event`, não só pela chave de topo", () => {
  it("`event: \"med_block\"` traduz, e o `event` entra na chave de idempotência", () => {
    const evento = parseOk(
      refund({ event: "med_block", reason: "bloqueio-sintetico", occurred_at: "2026-11-18T12:00:00-03:00" }),
    );
    expect(evento.flow).toBe("refund");
    expect(evento.externalEventId).toBe("refund:PSR-sintetico-cashin-1:med_block");
    expect(evento.actionable).toBe(false);
  });

  it("`event` desconhecido é recusado com o valor literal registrado", () => {
    for (const valor of ["med_release", "banana", 7]) {
      const motivo = parseRecusa(refund({ event: valor }));
      expect(motivo).toContain("Evento de refund desconhecido");
      expect(motivo).toContain(JSON.stringify(valor));
      expect(motivo).toContain(`"${PAYSURE_REFUND_EVENTS[0]}"`);
    }
  });

  it("refund SEM `event` é aceito — é a forma documentada em §2", () => {
    // §2 mostra o refund sem `event`; §9.4 o descreve como acréscimo.
    // Exigir o campo recusaria o formato que a documentação mostra
    // primeiro.
    const evento = parseOk(refund());
    expect(evento.externalEventId).toBe("refund:PSR-sintetico-cashin-1:refunded");
  });

  it("o refund aceita `amount_cents`, que é o nome que §2 usa", () => {
    // Divergência da documentação, registrada: §2 mostra `amount_cents` no
    // refund e §9.4 afirma que o refund é "o cash-in com um evento em
    // cima", o que implicaria `value_cents`. Os dois são lidos.
    expect(parseOk(refund()).amountCents).toBe(6100);
    expect(
      parseOk(refund({ amount_cents: undefined, value_cents: 500 })).amountCents,
    ).toBe(500);
  });
});

describe("AC11: nenhuma credencial nos artefatos do adaptador", () => {
  it("o adaptador não menciona `ci`/`cs` como valor nem lê variável de ambiente", async () => {
    expect(await codigoDe("lib/payments/providers/paysure.ts")).not.toContain(
      "process.env",
    );
    // Os campos de credencial vêm da descrição única do provedor, não de
    // uma lista repetida aqui.
    expect(adaptador.credentialFields.map((f) => f.name)).toEqual(["ci", "cs"]);
  });
});
