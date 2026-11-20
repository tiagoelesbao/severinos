// O que a tela de acompanhamento do pedido MOSTRA — já decidido, já
// mascarado, já formatado (LTM-14).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTA DECISÃO NÃO MORA NO COMPONENTE DE PÁGINA
//
// `page.tsx` é um componente de servidor ASSÍNCRONO, e
// `renderToStaticMarkup` não renderiza componente assíncrono. Com a decisão
// dentro dele, quatro ACs desta story só seriam verificáveis por leitura de
// fonte: o relógio derivado de `reservedUntil` (AC1), a mudança de estado no
// zero (AC2), o telefone que NÃO pode aparecer no HTML (AC5) e o estado
// "gerando" (AC7).
//
// Então a página faz só duas coisas — consultar o banco e renderizar — e
// TODA a decisão vive aqui, num módulo puro: entra linha de banco, sai
// objeto de exibição. É o mesmo desenho de `payments/gateway-config.ts` e de
// `raffles/expire-reservations.ts`, pela mesma razão registrada lá.
//
// ════════════════════════════════════════════════════════════════════════
// O DADO PESSOAL: NESTA TELA NÃO SE CORTA NADA (AC5, revisado 2x)
//
// ⚠️ DECISÃO DO FOUNDER, 2026-11-19: nesta tela — a do PRÓPRIO pedido — o
// telefone aparece INTEIRO. O raciocínio dele: é o número da própria pessoa,
// numa tela que ela abriu sobre a compra dela, e mascarar o dado de alguém
// para essa mesma pessoa é incômodo sem ganho. A decisão foi explicitamente
// *"só na tela do próprio pedido"*: o cartão de ganhador é página pública,
// expõe terceiros que não escolheram aparecer, e segue mascarado por
// `maskPhone` (LTM-15).
//
// ⚠️ SEGUNDA DECISÃO DO FOUNDER, 2026-11-20: o NOME também sai inteiro.
// A primeira decisão falou só de número, e a implementação não estendeu por
// conta — o que deixou a tela mostrando `Tiago ***` ao lado de
// `(11) 98765-4321`, nome escondido e telefone à mostra, para a MESMA pessoa,
// na MESMA linha. Levada ao founder como incoerência, ele resolveu na direção
// de soltar: *"nome inteiro também"*, pela mesma razão do telefone — é a tela
// que a própria pessoa abriu sobre a compra dela.
//
// **O cartão de ganhador NÃO muda**, e isto é o limite das duas decisões:
// `maskName` e `maskPhone` continuam sendo aplicados lá (LTM-15), porque é
// página pública e expõe terceiros que não escolheram aparecer. As duas
// decisões foram sobre A TELA DO PRÓPRIO PEDIDO, nunca sobre a loja.
//
// O que o `OrderView` CONTINUA não tendo: e-mail, CPF, endereço, data de
// nascimento. Não é convenção, é o tipo — e é o que mantém a varredura de
// HTML com conteúdo. O nome saiu da lista de proibidos; os outros quatro
// continuam nela, e `tests/loja/pedido/order-screen.test.tsx` varre o HTML
// renderizado para provar.
//
// ⚠️ O CUSTO QUE A DECISÃO TEM, escrito aqui porque ninguém o apaga depois:
// a página é endereçável por `orderId` e não há sessão de comprador. Quem
// tiver o link vê o telefone inteiro — e isso é o AC6 da story, que ficou
// `[CONFIRMAR]`. A decisão do founder é posterior e explícita, então ela
// vale; o AC6 segue valendo para todo o resto do dado pessoal.
// ════════════════════════════════════════════════════════════════════════

import { formatCurrency } from "@/lib/format";

/**
 * Em que estado a tela está.
 *
 * ⚠️ `paid` e `expired` da Sorteamos NÃO FORAM OBSERVADOS — estão
 * `[CONFIRMAR]` na story e fora do escopo dela. O que existe aqui é o mínimo
 * que o AC2 exige (a tela muda sozinha no zero e diz que os títulos
 * voltaram) e o selo de pago que já existia. A FORMA dessas duas telas na
 * Sorteamos continua desconhecida, e inventá-la seria descrever o que
 * ninguém viu.
 */
export type OrderScreenState = "waiting" | "paid" | "expired";

export interface OrderViewUnit {
  readonly number: number;
  readonly half: number;
  readonly reservedUntil: Date | null;
}

export interface OrderViewInput {
  readonly order: {
    readonly id: string;
    readonly status: string;
    readonly amount: string;
    readonly quantity: number;
    readonly createdAt: Date;
  };
  readonly product: {
    readonly title: string;
    readonly description: string | null;
    readonly imageUrl: string | null;
    readonly slug: string;
  } | null;
  /** O comprador CRU — nome e telefone completos. Não sai daqui. */
  readonly buyer: {
    readonly name: string | null;
    readonly phone: string | null;
  } | null;
  readonly units: readonly OrderViewUnit[];
  readonly charge: {
    readonly referenceCode: string;
    readonly brCode: string;
    readonly expiresAt: Date;
  } | null;
  /** `reservationMinutesFor(product)` — a fonte única do relógio (AC14). */
  readonly reservationMinutes: number;
  /** `siteConfig.showQrCodeByDefault` (AC4). */
  readonly showQrCodeByDefault: boolean;
  readonly now: Date;
}

export interface OrderView {
  readonly orderId: string;
  readonly state: OrderScreenState;
  /**
   * O instante em que a reserva vence, em milissegundos.
   *
   * ⚠️ É O PRAZO, NÃO UMA DURAÇÃO (AC1). A contagem da tela é
   * `deadlineMs - agora`, recalculada a cada segundo pelo cliente. Por isso
   * recarregar a página não reinicia nada e dois aparelhos mostram o mesmo
   * número: o único dado que atravessa é o prazo, que não depende de quando
   * a tela abriu.
   */
  readonly deadlineMs: number;
  readonly campaign: {
    readonly title: string;
    readonly subtitle: string | null;
    readonly imageUrl: string | null;
  } | null;
  readonly details: {
    /** `Primeiro ***` — nunca o nome inteiro. */
    readonly buyerName: string;
    /**
     * O telefone INTEIRO, formatado (decisão do founder, 2026-11-19).
     *
     * Ver o bloco do topo: aqui é a tela do próprio pedido. O cartão de
     * ganhador, que é público, continua mascarado.
     */
    readonly buyerPhone: string;
    readonly situation: string;
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly quantity: number;
    readonly total: string;
  };
  /** O BR Code GRAVADO, ou `null` enquanto a cobrança não existir (AC7). */
  readonly brCode: string | null;
  readonly chargeReference: string | null;
  readonly showQrByDefault: boolean;
  /** Os títulos só são revelados depois do pagamento identificado. */
  readonly titles: readonly string[] | null;
  readonly reservationMinutes: number;
}

/** O rótulo de `Situação`, no texto da Sorteamos. */
const SITUACAO: Record<OrderScreenState, string> = {
  waiting: "Aguardando pagamento",
  paid: "Pago",
  expired: "Reserva expirada",
};

/**
 * O telefone do comprador, inteiro, na forma brasileira.
 *
 * ⚠️ NÃO É MÁSCARA e não mora em `lib/mask.ts` de propósito: aquele arquivo
 * é sobre esconder dado, este campo é sobre mostrá-lo (decisão do founder —
 * ver o bloco do topo). Pôr uma função que REVELA num módulo chamado `mask`
 * é o tipo de vizinhança que faz alguém, meses depois, usar a errada.
 *
 * Só duas formas são escritas, as duas do plano de numeração brasileiro:
 * 11 dígitos (celular, com o nono) e 10 (fixo). Qualquer outro comprimento
 * sai COMO ESTÁ GRAVADO, sem reformatar: o telefone é digitado pelo
 * comprador no checkout e pode ter vindo com código de país, com ramal ou
 * incompleto. Forçar essa string num molde de 11 dígitos exibiria um número
 * que não é o dele.
 */
function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone.trim() || "—";
}

/**
 * `19/11/2026 às 08:33:19` — a forma medida na tela da Sorteamos.
 *
 * Não usa `formatDate` de `lib/format.ts` por dois motivos de fato: ela não
 * tem SEGUNDOS (a tela observada tem, e é o que permite conferir o prazo
 * contra a contagem) e ela não fixa fuso. O fuso é fixado aqui porque o
 * servidor pode rodar em UTC — na Vercel roda — e um prazo exibido três
 * horas adiantado é pior que prazo nenhum.
 */
function formatMoment(value: Date): string {
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
  return `${data} às ${hora}`;
}

/**
 * O prazo da reserva deste pedido.
 *
 * Sai de `product_numbers.reserved_until` — o MENOR entre as unidades do
 * pedido, que é o instante em que ele começa a perder título. É o mesmo dado
 * que a varredura de expiração usa (`raffles/expire-reservations.ts`), então
 * tela e estoque não podem discordar.
 *
 * O recuo para `created_at + janela` existe para UM caso real: depois que a
 * varredura libera as unidades, `order_id` e `reserved_until` são apagados, e
 * o pedido fica sem nenhuma unidade apontando para ele. Sem o recuo, a tela
 * de um pedido já expirado não teria prazo nenhum para exibir — e o prazo que
 * ela exibe por recuo é exatamente o que a reserva teve, porque
 * `reserved_until` nasce de `now + reservationMinutesFor(product)` no MESMO
 * `INSERT` do pedido (`actions/reserve.ts`).
 */
function deadlineOf(input: OrderViewInput): Date {
  const prazos = input.units
    .map((unit) => unit.reservedUntil)
    .filter((value): value is Date => value instanceof Date);

  if (prazos.length > 0) {
    return new Date(Math.min(...prazos.map((value) => value.getTime())));
  }
  return new Date(
    input.order.createdAt.getTime() + input.reservationMinutes * 60 * 1000,
  );
}

/**
 * O estado da tela.
 *
 * ⚠️ `expired` NÃO espera o banco (AC2). O pedido pode continuar `pending`
 * em `orders` por minutos depois do vencimento: a varredura da LTM-20 roda
 * na reserva e na grade, e ninguém garante que alguma das duas rodou desde
 * então. O que decide aqui é o PRAZO comparado com agora — o mesmo predicado
 * que a varredura aplica quando rodar. A tela não pode continuar pedindo
 * pagamento de uma reserva que já não vale.
 */
function stateOf(input: OrderViewInput, deadline: Date): OrderScreenState {
  if (input.order.status === "paid") return "paid";
  if (input.order.status !== "pending") return "expired";
  return deadline.getTime() <= input.now.getTime() ? "expired" : "waiting";
}

export function buildOrderView(input: OrderViewInput): OrderView {
  const deadline = deadlineOf(input);
  const state = stateOf(input, deadline);

  return {
    orderId: input.order.id,
    state,
    deadlineMs: deadline.getTime(),
    campaign: input.product
      ? {
          title: input.product.title,
          subtitle: input.product.description,
          imageUrl: input.product.imageUrl,
        }
      : null,
    details: {
      buyerName: input.buyer?.name ?? "—",
      buyerPhone: formatPhone(input.buyer?.phone ?? null),
      situation: SITUACAO[state],
      createdAt: formatMoment(input.order.createdAt),
      expiresAt: formatMoment(deadline),
      quantity: input.order.quantity,
      total: formatCurrency(Number(input.order.amount)),
    },
    // ⚠️ AC7: sem cobrança gravada, `brCode` é `null` e a tela entra no
    // estado "gerando". Nunca string vazia — campo vazio é o que faz o
    // comprador tentar colar o nada no app do banco.
    brCode: input.charge?.brCode ?? null,
    chargeReference: input.charge?.referenceCode ?? null,
    showQrByDefault: input.showQrCodeByDefault,
    titles:
      state === "paid"
        ? input.units.map((unit) => String(unit.number).padStart(3, "0")).sort()
        : null,
    reservationMinutes: input.reservationMinutes,
  };
}

// ════════════════════════════════════════════════════════════════════════
// A ARITMÉTICA DO RELÓGIO — pura, e é onde o AC1 se prova
// ════════════════════════════════════════════════════════════════════════

/** Quanto falta, em milissegundos, nunca negativo. */
export function remainingMs(deadlineMs: number, nowMs: number): number {
  return Math.max(0, deadlineMs - nowMs);
}

/**
 * `mm:ss` — minuto e segundo, como a tela observada (`29:17`).
 *
 * Arredonda para CIMA o segundo em curso: faltando 29 min 16,4 s a tela diz
 * `29:17`, que é o que a Sorteamos mostrou no instante medido. Truncar faria
 * a contagem exibir `00:00` por um segundo inteiro antes de vencer.
 */
export function formatRemaining(ms: number): string {
  const totalSegundos = Math.ceil(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}
