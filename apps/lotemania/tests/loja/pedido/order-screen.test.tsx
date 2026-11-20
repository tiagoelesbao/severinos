// A tela de acompanhamento, renderizada inteira (LTM-14, AC3, AC4, AC5, AC6,
// AC7 e os sete blocos).
//
// Render com `react-dom/server` em ambiente `node` — sem jsdom, sem
// biblioteca de teste de componente, sem dependência nova. Mesmo padrão que
// a LTM-03a estabeleceu em `gateway-config.test.tsx` e a LTM-03b em
// `payments/paysure/screen.test.tsx`.
//
// A contagem entra pela variante PURA (`ReservationCountdownView`), porque a
// de verdade usa `useRouter()` e `useRouter()` LANÇA sob
// `renderToStaticMarkup`. A razão está escrita em `countdown.tsx` e em
// `order-screen.tsx`.

import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { ReservationCountdownView } from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/countdown";
import {
  copyBrCodeTo,
  PIX_STEPS,
} from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/copy-pix";
import { OrderScreen } from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-screen";
import {
  buildOrderView,
  remainingMs,
  type OrderView,
  type OrderViewInput,
} from "@/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-view";

// Um BR Code com o COMPRIMENTO de um real (~190 caracteres). O tamanho é o
// que faz o AC3 ter conteúdo: com uma string curta, uma implementação que
// truncasse passaria o teste por acidente.
const BR_CODE =
  "00020126580014br.gov.bcb.pix0136sintetico-da-suite-0000-0000-000000000052040000530398654044.005802BR5913LOTEMANIA" +
  "TESTE6008SAOPAULO62290525sinteticodasuite00000000063041D3F";

const TELEFONE = "00987654321";
const NOME = "Comprador Sintetico Da Suite";
const CRIADA = new Date("2026-11-19T08:33:19-03:00");
const EXPIRA = new Date("2026-11-19T09:02:49-03:00");
const ABERTURA = new Date("2026-11-19T08:33:32-03:00");

function viewDe(over: Partial<OrderViewInput> = {}): OrderView {
  return buildOrderView({
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
      description: "Subtitulo sintetico da campanha",
      imageUrl: "https://example.invalid/arte.jpg",
      slug: "sorteio-sintetico",
    },
    buyer: over.buyer === undefined ? { name: NOME, phone: TELEFONE } : over.buyer,
    units: over.units ?? [{ number: 95, half: 1, reservedUntil: EXPIRA }],
    charge:
      over.charge === undefined
        ? { referenceCode: "PSR-sintetico", brCode: BR_CODE, expiresAt: EXPIRA }
        : over.charge,
    reservationMinutes: over.reservationMinutes ?? 15,
    showQrCodeByDefault: over.showQrCodeByDefault ?? false,
    now: over.now ?? ABERTURA,
  });
}

/** A tela inteira, com a contagem pura no lugar da de verdade. */
function renderiza(view: OrderView): string {
  return renderToStaticMarkup(
    <OrderScreen
      view={view}
      countdown={
        <ReservationCountdownView
          remainingMs={remainingMs(view.deadlineMs, ABERTURA.getTime())}
        />
      }
    />,
  );
}

/** O valor do campo do BR Code, EXTRAÍDO do render. */
function campoDoRender(markup: string): string {
  const tag = /<input[^>]*data-br-code-field[^>]*>/.exec(markup);
  if (!tag) {
    throw new Error(
      `A marcação não tem <input data-br-code-field>. Marcação: ${markup.slice(0, 600)}`,
    );
  }
  const value = /value="([^"]*)"/.exec(tag[0]);
  if (!value) throw new Error(`O campo não tem atributo value: ${tag[0]}`);
  return value[1];
}

describe("Os sete blocos, na ordem e nos textos observados", () => {
  const markup = renderiza(viewDe());

  it("1. ampulheta + \"Aguardando pagamento!\" + \"Realize o pagamento\"", () => {
    expect(markup).toContain('data-state-header="waiting"');
    expect(markup).toContain("data-hourglass");
    expect(markup).toContain("Aguardando pagamento!");
    expect(markup).toContain("Realize o pagamento");
  });

  it("2. a contagem, em mm:ss", () => {
    const relogio = /<strong[^>]*data-countdown[^>]*>([^<]+)<\/strong>/.exec(markup);
    expect(relogio?.[1]).toBe("29:17");
    expect(markup).toContain("para pagar");
  });

  it("3. os três passos, com os textos LITERAIS da tela observada", () => {
    expect(markup).toContain("data-pix-steps");
    expect(PIX_STEPS).toEqual([
      "Copie o código PIX abaixo.",
      "Abra o app do seu banco e escolha a opção PIX, como se fosse fazer uma transferência.",
      "Selecione a opção PIX cópia e cola, cole a chave copiada e confirme o pagamento.",
    ]);
    for (const passo of PIX_STEPS) {
      expect(markup).toContain(passo);
    }
    expect(markup).toContain("COPIAR");
  });

  it("4. \"Mostrar QR Code\"", () => {
    expect(markup).toContain("Mostrar QR Code");
    expect(markup).toContain("data-qr-toggle");
  });

  it("5. o aviso âmbar, no texto exato", () => {
    expect(markup).toContain(
      "Este pagamento só pode ser realizado dentro do tempo. Após este " +
        "período, caso o pagamento não seja confirmado, os títulos voltam a " +
        "ficar disponíveis.",
    );
  });

  it("6. o cartão da campanha — o MESMO componente do catálogo", () => {
    expect(markup).toContain("data-campaign-card");
    expect(markup).toContain("Sorteio sintetico da suite");
    expect(markup).toContain("Subtitulo sintetico da campanha");
    expect(markup).toContain("Adquira Já!");
  });

  it("7. os detalhes, com os rótulos e os valores medidos", () => {
    expect(markup).toContain("Detalhes da sua compra");
    expect(markup).toContain("11111111-1111-4111-8111-111111111111");
    for (const rotulo of [
      "Comprador:",
      "Telefone:",
      "Situação:",
      "Data/horário:",
      "Expira em:",
      "Quantidade:",
      "Total:",
      "Títulos:",
    ]) {
      expect(markup, `falta o rótulo ${rotulo}`).toContain(rotulo);
    }
    expect(markup).toContain("19/11/2026 às 08:33:19");
    expect(markup).toContain("19/11/2026 às 09:02:49");
    expect(markup).toContain(
      "Os títulos serão disponibilizados quando o pagamento for identificado",
    );
  });
});

describe("AC3: COPIAR põe o BR Code COMPLETO na área de transferência", () => {
  it("o teste LÊ o conteúdo copiado, e ele é o código inteiro", async () => {
    const copiado: string[] = [];
    const ok = await copyBrCodeTo(
      {
        writeText: async (texto) => {
          copiado.push(texto);
        },
      },
      { brCode: BR_CODE },
    );

    expect(ok).toBe(true);
    expect(copiado).toHaveLength(1);
    expect(copiado[0]).toBe(BR_CODE);
    expect(copiado[0].length).toBe(BR_CODE.length);
    // O fim do código é o CRC; um código truncado perde justamente ele, e é
    // o que o app do banco recusa.
    expect(copiado[0].endsWith(BR_CODE.slice(-12))).toBe(true);
  });

  it("o campo da tela guarda o código INTEIRO — quem copia à mão também paga", () => {
    const markup = renderiza(viewDe());
    expect(campoDoRender(markup)).toBe(BR_CODE);
  });

  it("não existe versão curta do código em lugar nenhum da tela", () => {
    const markup = renderiza(viewDe());
    // Toda ocorrência do início do código é seguida pelo código inteiro: se
    // houvesse um pedaço exibido à parte, esta contagem divergiria.
    const inicio = BR_CODE.slice(0, 24);
    const ocorrenciasDoInicio = markup.split(inicio).length - 1;
    const ocorrenciasInteiras = markup.split(BR_CODE).length - 1;
    expect(ocorrenciasDoInicio).toBe(ocorrenciasInteiras);
  });

  it("área de transferência indisponível não derruba a tela", async () => {
    expect(await copyBrCodeTo(undefined, { brCode: BR_CODE })).toBe(false);
    expect(
      await copyBrCodeTo(
        {
          writeText: async () => {
            throw new Error("permissão recusada pelo navegador");
          },
        },
        { brCode: BR_CODE },
      ),
    ).toBe(false);
  });
});

describe("AC4: o QR começa oculto ou visível conforme `showQrCodeByDefault`", () => {
  it("falso: o QR começa OCULTO e o botão convida a mostrar", () => {
    const markup = renderiza(viewDe({ showQrCodeByDefault: false }));
    expect(markup).toContain("Mostrar QR Code");
    expect(markup).not.toContain("Ocultar QR Code");
    expect(markup).not.toContain("data-qr-panel");
    expect(markup).toContain('aria-expanded="false"');
  });

  it("verdadeiro: o QR começa VISÍVEL e o botão convida a ocultar", () => {
    const markup = renderiza(viewDe({ showQrCodeByDefault: true }));
    expect(markup).toContain("Ocultar QR Code");
    expect(markup).not.toContain("Mostrar QR Code");
    expect(markup).toContain("data-qr-panel");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain(
      "Acesse o app do seu banco, escolha a opção de pagar com QR Code, " +
        "escaneie o código acima e confirme o pagamento.",
    );
  });

  it("aberto, o aviso âmbar aparece DUAS vezes — como na tela observada", () => {
    const aberto = renderiza(viewDe({ showQrCodeByDefault: true }));
    const fechado = renderiza(viewDe({ showQrCodeByDefault: false }));
    expect(aberto.split("data-amber-warning").length - 1).toBe(2);
    expect(fechado.split("data-amber-warning").length - 1).toBe(1);
  });

  it("o quadro do QR NÃO finge ter um QR", () => {
    const markup = renderiza(viewDe({ showQrCodeByDefault: true }));
    expect(markup).toContain("data-qr-unavailable");
    // Nenhuma imagem de QR, nenhum serviço de terceiros no caminho do
    // dinheiro.
    expect(markup).not.toMatch(/api\.qrserver|chart\.googleapis|qrcode\.(js|png)/);
  });
});

describe("AC5 (revisado 2x): nome e telefone saem no HTML desta tela", () => {
  const markup = renderiza(viewDe());

  it("o nome e o telefone vão inteiros — na mesma linha", () => {
    // Duas decisões do founder na mesma direção: 11-19 soltou o NÚMERO, 11-20
    // soltou o NOME. A incoerência que a primeira deixou — `Comprador ***`
    // ao lado do telefone inteiro — foi levada a ele e resolvida soltando.
    expect(markup).toContain(NOME);
    expect(markup).toContain("(00) 98765-4321");
  });

  it("varre o HTML servido: os QUATRO que nunca saem continuam fora", () => {
    // ⚠️ O nome saiu desta lista por decisão; os quatro abaixo NÃO, e nenhuma
    // decisão os tocou. Eles não estão no tipo `OrderView`, e esta varredura
    // é o que prova que não entraram por outro caminho — texto, atributo ou
    // payload.
    expect(markup, "e-mail no HTML").not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    // \u26a0\ufe0f CPF s\u00f3 na forma PONTUADA. A forma crua \u2014 11 d\u00edgitos seguidos \u2014 n\u00e3o
    // \u00e9 distingu\u00edvel do BR Code, que come\u00e7a com `00020126580014...` e casaria
    // com qualquer regex de 11 d\u00edgitos. Ent\u00e3o esta varredura pega CPF
    // EXIBIDO, n\u00e3o CPF vazado em campo t\u00e9cnico; a defesa contra o segundo \u00e9 o
    // tipo `OrderView` n\u00e3o ter a coluna, que `order-view.test.ts` prende.
    expect(markup, "CPF no HTML").not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    // A fronteira `\b` nao e enfeite: o UUID do pedido na fixture e todo de
    // `1`, e `11111111-1111` casa com cinco digitos + hifen + tres sem ela.
    expect(markup, "CEP no HTML").not.toMatch(/\b\d{5}-\d{3}\b/);
    expect(markup, "data de nascimento no HTML").not.toContain("nascimento");
  });

  it("o que viaja para o cliente é o `OrderView` — e ele é a fronteira", () => {
    // O payload de hidratação carrega as PROPS dos componentes de cliente, e
    // as props saem daqui. O par exibição/payload tem de dizer a MESMA coisa:
    // mascarar na tela e mandar inteiro no payload seria vazamento com
    // aparência de proteção, e mandar mascarado o que a tela mostra inteiro
    // seria a tela mentir sobre a própria fonte.
    const serializado = JSON.stringify(viewDe());
    expect(serializado).toContain(NOME);
    expect(serializado).toContain("(00) 98765-4321");
  });
});

describe("AC6: pedido alheio — o que a tela revela e o que ela não revela", () => {
  it("nada além do que a tela mostra: sem e-mail, sem CPF, sem endereço", () => {
    // A página é endereçável por `orderId` e NÃO há sessão de comprador: o
    // comprador se identifica por telefone, então não existe quem autorizar.
    // A defesa é o dado que entra no `OrderView`, e ele não tem e-mail, CPF,
    // endereço nem data de nascimento.
    //
    // ⚠️ O NOME E O TELEFONE SÃO A EXCEÇÃO, por duas decisões do founder —
    // 2026-11-19 o número, 2026-11-20 o nome. Quem tiver o link do pedido vê
    // os dois inteiros. O AC6 original dizia "na dúvida, recusar"; as duas
    // decisões são posteriores e explícitas, então elas valem, e o custo está
    // escrito em `order-view.ts` e no Dev Agent Record.
    //
    // **O AC6 não ficou vazio por isso** — ele mudou de alvo: o que ele prende
    // agora são os QUATRO campos que nenhuma decisão tocou, e que a `LTM-21`
    // vai passar a coletar no cadastro de 14 campos. Quando ela chegar, esta
    // asserção é a que impede o dado novo de vazar nesta tela de tabela.
    const markup = renderiza(viewDe());
    expect(markup, "e-mail").not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(markup, "CPF").not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(markup, "CEP").not.toMatch(/\b\d{5}-\d{3}\b/);
    expect(markup, "nascimento").not.toContain("nascimento");
  });
});

describe("AC7: enquanto a cobrança não existe, a tela diz que está gerando", () => {
  const markup = renderiza(viewDe({ charge: null }));

  it("mostra o aviso de geração, e NENHUM campo de código", () => {
    expect(markup).toContain("data-pix-generating");
    expect(markup).toContain("Estamos gerando o seu código PIX");
    expect(markup).not.toContain("data-br-code-field");
    expect(markup).not.toContain("COPIAR");
  });

  it("nenhum campo vazio e nenhum código falso", () => {
    expect(markup).not.toContain('value=""');
    expect(markup).not.toContain("00020126");
  });

  it("sem cobrança não há botão de QR para abrir — não há o que mostrar", () => {
    expect(markup).not.toContain("data-qr-toggle");
  });

  it("os três passos continuam visíveis — o comprador sabe o que vem", () => {
    expect(markup).toContain(PIX_STEPS[1]);
  });
});

describe("Os estados além de aguardando", () => {
  it("expirado: diz que os títulos voltaram, e some com o caminho de pagar", () => {
    const markup = renderiza(viewDe({ now: new Date(EXPIRA.getTime() + 1000) }));
    expect(markup).toContain('data-state-header="expired"');
    expect(markup).toContain("Os títulos voltaram a ficar disponíveis");
    expect(markup).not.toContain("data-pix-steps");
    expect(markup).not.toContain("data-qr-toggle");
    expect(markup).toContain("Reserva expirada");
  });

  it("a contagem no zero vira o aviso de vencimento, sem recarga", () => {
    const markup = renderToStaticMarkup(
      <ReservationCountdownView remainingMs={0} />,
    );
    expect(markup).toContain("data-countdown-expired");
    expect(markup).toContain("Os títulos voltam a ficar disponíveis");
    // `data-countdown-expired` CONTÉM a string `data-countdown`, então a
    // asserção tem de olhar o atributo fechado, não o prefixo.
    expect(markup).not.toContain('data-countdown=""');
  });

  it("pago: lista os títulos e não pede mais pagamento", () => {
    const markup = renderiza(
      viewDe({
        order: {
          id: "11111111-1111-4111-8111-111111111111",
          status: "paid",
          amount: "4.00",
          quantity: 1,
          createdAt: CRIADA,
        },
      }),
    );
    expect(markup).toContain('data-state-header="paid"');
    expect(markup).toContain("data-titles");
    expect(markup).toContain("095");
    expect(markup).not.toContain("data-pix-steps");
    expect(markup).not.toContain("data-titles-pending");
  });
});
