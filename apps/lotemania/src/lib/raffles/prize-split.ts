// O RATEIO — a divisão do prêmio entre os donos das metades de um título
// sorteado (GLOSSARY → Rateio; LTM-07: AC4, AC5, AC6, AC11).
//
// ════════════════════════════════════════════════════════════════════════
// ISTO É REGISTRO DE RESULTADO, NÃO CÁLCULO DE SORTEIO
//
// O sorteio acontece FORA deste sistema (ADR-0001 → Notas). Nada aqui
// escolhe um número; tudo aqui responde "o 42 saiu — quem recebe quanto".
//
// ════════════════════════════════════════════════════════════════════════
// AS TRÊS REGRAS, E POR QUE NENHUMA DELAS ARREDONDA
//
//   duas metades vendidas → dois rateios de metade do prêmio cada
//   uma metade vendida    → UM rateio do prêmio INTEIRO (metade órfã)
//   cota inteira          → UM rateio do prêmio inteiro
//
// A soma fecha EXATAMENTE o prêmio nos três casos, sem política de
// desempate, porque o prêmio indivisível em centavos não consegue entrar:
// `divisibilityRefusalFor` o recusa quando a divisibilidade é habilitada
// (AC12). Se um prêmio ímpar chegar aqui mesmo assim, este módulo FALHA
// ALTO em vez de arredondar — arredondar em silêncio é criar um centavo de
// diferença no caminho do dinheiro de um ganhador, que é precisamente o
// que a restrição de entrada existe para evitar.
//
// A metade órfã paga INTEIRO por decisão de negócio registrada: qualquer
// outra saída ou pagaria menos a quem não teve culpa, ou mudaria a chance
// do bilhete depois de vendido — que é prática enganosa (GLOSSARY → Metade
// órfã).
//
// Duas metades do MESMO dono não se fundem (AC6): a lista de entrada tem
// uma linha por metade vendida, e a de saída também. Fundir produziria um
// pagamento único e apagaria do registro que aquela pessoa concorria com
// duas unidades.
// ════════════════════════════════════════════════════════════════════════

export class PrizeSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrizeSplitError";
  }
}

/** Uma metade VENDIDA do título sorteado, com quem a comprou. */
export interface SoldHalf {
  /** Qual metade: 1 ou 2. Em sorteio de cota inteira é sempre 1. */
  readonly half: number;
  readonly winnerName: string;
  readonly phone: string | null;
  readonly orderId: string;
}

/** Uma linha de `winners` a ser gravada — uma por ganhador, já rateada. */
export interface PrizeShare {
  readonly winnerName: string;
  readonly phone: string | null;
  /**
   * `null` = título inteiro; 1 ou 2 = a metade nomeada.
   *
   * É o que torna duas linhas do mesmo `winning_number` distinguíveis de
   * uma duplicata acidental (AC11) e o que permite ao feed exibir
   * `42 (metade)` em vez de `42` nu (GLOSSARY → Metade marcada).
   */
  readonly winningHalf: number | null;
  readonly prizeAmountCents: number;
  readonly orderId: string;
}

export interface SplitPrizeInput {
  /** O prêmio INTEIRO do título, em centavos. */
  readonly prizeCents: number;
  /** 1 em sorteio de cota inteira, 2 em sorteio divisível. */
  readonly halvesPerTitle: number;
  /** Só as metades VENDIDAS. Metade reservada e não paga não concorre. */
  readonly soldHalves: readonly SoldHalf[];
}

export function splitPrizeAmongHalves(input: SplitPrizeInput): PrizeShare[] {
  const { prizeCents, halvesPerTitle, soldHalves } = input;

  if (!Number.isInteger(prizeCents) || prizeCents <= 0) {
    throw new PrizeSplitError(
      `Prêmio inválido para rateio: ${prizeCents} centavos. ` +
        "Esperado inteiro positivo de centavos.",
    );
  }
  if (!Number.isInteger(halvesPerTitle) || halvesPerTitle < 1) {
    throw new PrizeSplitError(
      `Metades por título inválidas: ${halvesPerTitle}. Esperado 1 ou 2.`,
    );
  }
  if (soldHalves.length > halvesPerTitle) {
    // Mais donos do que unidades vendáveis é violação do invariante 1 do
    // ADR-0001 ("nenhuma metade tem dois donos") chegando aqui. Falhar alto
    // é o único comportamento honesto: ratear entre três donos de um título
    // de duas metades inventaria uma divisão que ninguém decidiu.
    throw new PrizeSplitError(
      `O título sorteado tem ${soldHalves.length} unidade(s) vendida(s) e o ` +
        `sorteio só tem ${halvesPerTitle} por título. Estado impossível: ` +
        "alguma unidade tem dois donos.",
    );
  }

  const metadesDistintas = new Set(soldHalves.map((u) => u.half));
  if (metadesDistintas.size !== soldHalves.length) {
    throw new PrizeSplitError(
      "A mesma metade aparece duas vezes entre as vendidas do título sorteado.",
    );
  }

  // Ninguém comprou o título sorteado. Não é erro: é o sorteio sem ganhador
  // naquele número, e o operador precisa ver zero linhas, não uma linha
  // vazia.
  if (soldHalves.length === 0) return [];

  // ── Metade órfã, ou cota inteira: um rateio, prêmio integral ──────────
  if (soldHalves.length === 1) {
    const unica = soldHalves[0];
    return [
      {
        winnerName: unica.winnerName,
        phone: unica.phone,
        // Em sorteio de cota inteira não existe metade — marcar 1 ali
        // registraria uma meia cota que nunca foi vendida.
        winningHalf: halvesPerTitle === 1 ? null : unica.half,
        prizeAmountCents: prizeCents,
        orderId: unica.orderId,
      },
    ];
  }

  // ── As duas metades vendidas: a divisão tem de ser exata ──────────────
  if (prizeCents % halvesPerTitle !== 0) {
    throw new PrizeSplitError(
      `O prêmio de ${prizeCents} centavos não se divide em ${halvesPerTitle} ` +
        "partes exatas, e este rateio NÃO arredonda. Um sorteio divisível com " +
        "prêmio indivisível não deveria existir: a recusa está em " +
        "`divisibilityRefusalFor` (LTM-07, AC12). Se este erro apareceu, a " +
        "divisibilidade foi habilitada por fora daquela porta.",
    );
  }
  const porMetade = prizeCents / halvesPerTitle;

  // Ordem por metade, para o registro sair determinístico — duas linhas do
  // mesmo número precisam ter ordem estável para serem conferidas.
  return [...soldHalves]
    .sort((a, b) => a.half - b.half)
    .map((unidade) => ({
      winnerName: unidade.winnerName,
      phone: unidade.phone,
      winningHalf: unidade.half,
      prizeAmountCents: porMetade,
      orderId: unidade.orderId,
    }));
}
