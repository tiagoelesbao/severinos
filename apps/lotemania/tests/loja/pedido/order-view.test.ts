// O relógio e o mascaramento da tela de pedido (LTM-14, AC1, AC2, AC5, AC7).
//
// Tudo aqui é aritmética pura sobre `buildOrderView` — sem banco, sem
// relógio falso, sem jsdom. E a ausência de relógio falso é deliberada: a
// nota de ondas da story manda usar tempo FALSO para não dormir 15 minutos,
// mas há uma forma melhor, e é a que o próprio AC1 exige. Como a tela deriva
// a contagem de `reservedUntil - agora`, o "agora" é ENTRADA da função. Dois
// instantes diferentes são dois argumentos diferentes, não dois estados de
// um relógio global — e dois arquivos com relógio global falso na mesma
// suíte colidiriam, que é o risco registrado na própria story.
//
// A passagem de tempo do componente de cliente (o `setInterval`) é o único
// pedaço que isto não cobre, e ele não tem decisão nenhuma: chama
// `remainingMs(deadlineMs, Date.now())`, que é o que está medido aqui.

import { describe, expect, it } from "vitest";

import {
  buildOrderView,
  formatRemaining,
  remainingMs,
  type OrderViewInput,
} from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-view";

// ── A reserva REAL medida na Sorteamos em 2026-11-19 ────────────────────
//
// Pedido `6afede7ffd2ffe1c9e74a905`, número 95 da `46º RAPIDINHA`:
//
//   criada    08:33:19
//   expira    09:02:49      (29 min 30 s de janela)
//   a tela abriu mostrando  29:17
//
// Os três valores juntos são o que torna o AC1 verificável por aritmética em
// vez de por opinião: se a contagem saísse de um contador iniciado na
// abertura da tela, ela teria aberto em 29:30 (a janela inteira), não em
// 29:17. A diferença de 13 segundos é o caminho do clique até o render — e é
// exatamente o que um contador por duração apaga.
const CRIADA = new Date("2026-11-19T08:33:19-03:00");
const EXPIRA = new Date("2026-11-19T09:02:49-03:00");
const ABERTURA = new Date("2026-11-19T08:33:32-03:00");

/** Telefone sintético: DDD 00 não existe no plano de numeração brasileiro. */
const TELEFONE = "00987654321";
const NOME = "Comprador Sintetico Da Suite";

function entrada(over: Partial<OrderViewInput> = {}): OrderViewInput {
  return {
    order: {
      id: "11111111-1111-4111-8111-111111111111",
      status: "pending",
      amount: "4.00",
      quantity: 1,
      createdAt: CRIADA,
      ...over.order,
    },
    product: over.product ?? {
      title: "Sorteio sintetico da suite",
      description: "Subtitulo sintetico",
      imageUrl: "https://example.invalid/arte.jpg",
      slug: "sorteio-sintetico",
    },
    buyer: over.buyer === undefined ? { name: NOME, phone: TELEFONE } : over.buyer,
    units: over.units ?? [{ number: 95, half: 1, reservedUntil: EXPIRA }],
    charge:
      over.charge === undefined
        ? {
            referenceCode: "PSR-sintetico",
            brCode: "00020126-br-code-sintetico",
            expiresAt: EXPIRA,
          }
        : over.charge,
    reservationMinutes: over.reservationMinutes ?? 15,
    showQrCodeByDefault: over.showQrCodeByDefault ?? false,
    now: over.now ?? ABERTURA,
  };
}

describe("AC1: a contagem é o PRAZO menos agora, nunca uma duração", () => {
  it("reproduz a medição da Sorteamos: 08:33:19 → 09:02:49 abre em 29:17", () => {
    const view = buildOrderView(entrada());
    expect(view.deadlineMs).toBe(EXPIRA.getTime());
    expect(formatRemaining(remainingMs(view.deadlineMs, ABERTURA.getTime()))).toBe(
      "29:17",
    );
  });

  it("a janela inteira NÃO é o que a tela mostra — 29:30 seria o defeito", () => {
    // Um contador iniciado na abertura mostraria a janela cheia. Se este
    // valor e o de cima fossem iguais, o teste de cima não distinguiria uma
    // implementação da outra.
    const janelaCheia = formatRemaining(EXPIRA.getTime() - CRIADA.getTime());
    expect(janelaCheia).toBe("29:30");
    expect(janelaCheia).not.toBe("29:17");
  });

  it("RECARREGAR não reinicia: o prazo é o mesmo e o restante só diminui", () => {
    const abertura = buildOrderView(entrada({ now: ABERTURA }));
    const dezMinutosDepois = new Date(ABERTURA.getTime() + 10 * 60 * 1000);
    const recarga = buildOrderView(entrada({ now: dezMinutosDepois }));

    expect(recarga.deadlineMs).toBe(abertura.deadlineMs);
    expect(
      remainingMs(recarga.deadlineMs, dezMinutosDepois.getTime()),
      "recarregar devolveu MAIS tempo do que havia — é o defeito do AC1",
    ).toBeLessThan(remainingMs(abertura.deadlineMs, ABERTURA.getTime()));
    expect(formatRemaining(remainingMs(recarga.deadlineMs, dezMinutosDepois.getTime()))).toBe(
      "19:17",
    );
  });

  it("DOIS APARELHOS mostram o mesmo: o prazo não depende de quem abriu", () => {
    // O celular abriu a tela às 08:33:32; o computador abriu às 08:40:00. Os
    // dois leem o MESMO prazo, e cada um mostra o que de fato falta pelo seu
    // relógio.
    const celular = buildOrderView(entrada({ now: ABERTURA }));
    const computador = buildOrderView(
      entrada({ now: new Date("2026-11-19T08:40:00-03:00") }),
    );

    expect(computador.deadlineMs).toBe(celular.deadlineMs);
    expect(celular.details.expiresAt).toBe(computador.details.expiresAt);
    // E o mesmo instante lido pelos dois dá o mesmo texto.
    const instante = new Date("2026-11-19T08:50:00-03:00").getTime();
    expect(formatRemaining(remainingMs(celular.deadlineMs, instante))).toBe(
      formatRemaining(remainingMs(computador.deadlineMs, instante)),
    );
  });

  it("o prazo sai de `reservedUntil` — o MENOR entre as unidades do pedido", () => {
    const antes = new Date(EXPIRA.getTime() - 60 * 1000);
    const view = buildOrderView(
      entrada({
        units: [
          { number: 95, half: 1, reservedUntil: EXPIRA },
          { number: 96, half: 1, reservedUntil: antes },
        ],
      }),
    );
    expect(view.deadlineMs).toBe(antes.getTime());
  });

  it("sem unidade apontando para o pedido, recua para criação + janela", () => {
    // É o estado que a varredura da LTM-20 deixa: `order_id` e
    // `reserved_until` apagados das unidades.
    const view = buildOrderView(
      entrada({ units: [], reservationMinutes: 30, now: CRIADA }),
    );
    expect(view.deadlineMs).toBe(CRIADA.getTime() + 30 * 60 * 1000);
  });

  it("a janela exibida NÃO é um número cravado: muda com a fonte única", () => {
    const quinze = buildOrderView(entrada({ units: [], reservationMinutes: 15 }));
    const trinta = buildOrderView(entrada({ units: [], reservationMinutes: 30 }));
    expect(trinta.deadlineMs - quinze.deadlineMs).toBe(15 * 60 * 1000);
    expect(quinze.reservationMinutes).toBe(15);
  });
});

describe("AC2: no zero, a tela muda de estado sem esperar o banco", () => {
  it("prazo vencido com o pedido AINDA `pending` no banco já é expirado", () => {
    // A varredura da LTM-20 roda na reserva e na grade; ninguém garante que
    // alguma das duas rodou. A tela não pode continuar pedindo pagamento de
    // uma reserva que já não vale.
    const view = buildOrderView(
      entrada({ now: new Date(EXPIRA.getTime() + 1) }),
    );
    expect(view.state).toBe("expired");
    expect(view.details.situation).toBe("Reserva expirada");
  });

  it("o instante EXATO do prazo já conta como vencido", () => {
    expect(buildOrderView(entrada({ now: EXPIRA })).state).toBe("expired");
    expect(
      buildOrderView(entrada({ now: new Date(EXPIRA.getTime() - 1000) })).state,
    ).toBe("waiting");
  });

  it("o restante nunca é negativo, e o texto do zero é `00:00`", () => {
    expect(remainingMs(EXPIRA.getTime(), EXPIRA.getTime() + 60_000)).toBe(0);
    expect(formatRemaining(0)).toBe("00:00");
  });

  it("pedido já `expired` no banco é expirado em qualquer relógio", () => {
    const view = buildOrderView(
      entrada({ order: { ...entrada().order, status: "expired" }, now: CRIADA }),
    );
    expect(view.state).toBe("expired");
  });

  it("pedido pago é pago mesmo depois do prazo — pagamento ganha do relógio", () => {
    const view = buildOrderView(
      entrada({
        order: { ...entrada().order, status: "paid" },
        now: new Date(EXPIRA.getTime() + 60_000),
      }),
    );
    expect(view.state).toBe("paid");
    expect(view.titles).toEqual(["095"]);
  });

  it("antes do pagamento os títulos NÃO são listados", () => {
    expect(buildOrderView(entrada()).titles).toBeNull();
  });
});

describe("AC5 (revisado 2x): nome e telefone inteiros nesta tela", () => {
  // ⚠️ DUAS DECISÕES DO FOUNDER, em dias seguidos, na mesma direção:
  //
  //   2026-11-19  o TELEFONE sai inteiro na tela do próprio pedido
  //   2026-11-20  o NOME também
  //
  // A primeira falou só de número, e a implementação não estendeu por conta —
  // deixando a tela com `Comprador ***` ao lado de `(00) 98765-4321`, para a
  // mesma pessoa, na mesma linha. Levada ao founder como incoerência, ele
  // resolveu soltando o nome, pela mesma razão: é a tela que a própria pessoa
  // abriu sobre a compra dela.
  //
  // ⛔ **O LIMITE DAS DUAS DECISÕES É ESTA TELA.** O cartão de ganhador é
  // página pública e expõe terceiros: `maskName` e `maskPhone` continuam
  // aplicados lá (LTM-15), e `tests/loja/mascaras.test.ts` prende as duas
  // formas. Se algum dia alguma destas asserções mudar, é porque houve uma
  // TERCEIRA decisão — não porque "ficou coerente".

  it("o nome e o telefone saem inteiros, o telefone formatado", () => {
    const view = buildOrderView(entrada());
    expect(view.details.buyerName).toBe(NOME);
    expect(view.details.buyerPhone).toBe("(00) 98765-4321");
  });

  it("o nome vai no objeto exibido — e é a decisão, não um vazamento", () => {
    // É o objeto que a página renderiza e que viaja para os componentes de
    // cliente, logo é o que o payload de hidratação carrega. Mascarar na
    // exibição e mandar inteiro no payload seria vazamento com aparência de
    // proteção; aqui as duas pontas dizem a mesma coisa, de propósito.
    const serializado = JSON.stringify(buildOrderView(entrada()));
    expect(serializado).toContain(NOME);
  });

  it("e-mail, CPF e endereço continuam fora do tipo — não há como vazá-los", () => {
    const view = buildOrderView(entrada());
    const campos = Object.keys(view.details);
    expect(campos).not.toContain("email");
    expect(campos).not.toContain("cpf");
    expect(campos).not.toContain("address");
  });

  it("telefone de 10 dígitos (fixo) também é formatado, sem nono dígito", () => {
    const view = buildOrderView(
      entrada({ buyer: { name: NOME, phone: "0034567890" } }),
    );
    expect(view.details.buyerPhone).toBe("(00) 3456-7890");
  });

  it("telefone de comprimento inesperado sai COMO ESTÁ GRAVADO", () => {
    // Forçar um molde de 11 dígitos sobre o que veio com código de país ou
    // incompleto exibiria um número que não é o do comprador.
    const view = buildOrderView(
      entrada({ buyer: { name: NOME, phone: "+55 (00) 98765-4321" } }),
    );
    expect(view.details.buyerPhone).toBe("+55 (00) 98765-4321");
  });

  it("comprador sem linha na base não vira string vazia na tela", () => {
    const view = buildOrderView(entrada({ buyer: null }));
    expect(view.details.buyerName).toBe("—");
    expect(view.details.buyerPhone).toBe("—");
  });
});

describe("AC7: sem cobrança, a tela não inventa código", () => {
  it("sem linha em `pix_charges`, `brCode` é null — nunca string vazia", () => {
    const view = buildOrderView(entrada({ charge: null }));
    expect(view.brCode).toBeNull();
    expect(view.chargeReference).toBeNull();
  });

  it("com cobrança, o BR Code é o GRAVADO, inteiro", () => {
    const view = buildOrderView(entrada());
    expect(view.brCode).toBe("00020126-br-code-sintetico");
  });
});

describe("Os detalhes da compra, na forma medida", () => {
  it("data e prazo em `DD/MM/AAAA às HH:MM:SS`, no fuso de São Paulo", () => {
    const view = buildOrderView(entrada());
    expect(view.details.createdAt).toBe("19/11/2026 às 08:33:19");
    expect(view.details.expiresAt).toBe("19/11/2026 às 09:02:49");
  });

  it("total e quantidade saem do pedido", () => {
    const view = buildOrderView(entrada());
    expect(view.details.quantity).toBe(1);
    expect(view.details.total).toMatch(/R\$\s?4,00/);
  });
});
