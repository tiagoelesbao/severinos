import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// O PEDIDO DEIXOU DE SER UMA LISTA DE NÚMEROS (LTM-02, AC9)
//
// Era `numbers: z.array(z.number())`. Uma lista de inteiros não consegue
// dizer QUAL metade do 42 se quer — e endereçar a metade é a diferença
// entre vender uma meia cota e tirar o título inteiro do estoque cobrando
// metade (ADR-0001). O contrato passa a carregar a UNIDADE VENDÁVEL.
//
//   { number: 42, half: null }  o TÍTULO inteiro — todas as unidades do 42.
//                               Em sorteio de cota inteira é a única linha
//                               que existe; em sorteio divisível são as
//                               duas metades, tomadas juntas ou nenhuma.
//   { number: 42, half: 1 }     UMA metade, nomeada. A outra metade do 42
//                               continua à venda.
//
// `half: null` não é "não sei": é "o título todo", e é o que faz a grade de
// hoje continuar correta sem precisar saber se o sorteio é divisível. Quem
// escolhe metade avulsa na tela é a LTM-08.
// ════════════════════════════════════════════════════════════════════════

/** Metades por título num sorteio divisível (ADR-0001: duas, nunca outra). */
export const HALVES_PER_DIVISIBLE_TITLE = 2;

export const reserveUnitSchema = z.object({
  number: z.number().int().min(0),
  half: z.number().int().min(1).max(HALVES_PER_DIVISIBLE_TITLE).nullable(),
});

export type ReserveUnitInput = z.infer<typeof reserveUnitSchema>;

/** Chave de identidade da seleção, para detectar pedido repetido. */
function unitKey(unit: ReserveUnitInput): string {
  return `${unit.number}:${unit.half ?? "inteiro"}`;
}

export const reserveNumbersSchema = z
  .object({
    tenantSlug: z.string().min(1),
    productSlug: z.string().min(1),
    units: z.array(reserveUnitSchema).min(1, "Selecione ao menos um número"),
    phone: z.string().min(8, "Telefone inválido"),
  })
  // Seleção repetida é recusada em vez de deduplicada, e isso é decisão de
  // dinheiro: deduplicar em silêncio cobraria um valor diferente do que a
  // tela somou. Dois casos, os dois recusados aqui:
  //   • a MESMA unidade duas vezes;
  //   • o título inteiro E uma metade dele na mesma seleção, que é pedir a
  //     mesma metade duas vezes com dois nomes.
  .superRefine((input, ctx) => {
    const vistas = new Set<string>();
    const inteiros = new Set<number>();
    const metades = new Set<number>();

    for (const unit of input.units) {
      const key = unitKey(unit);
      if (vistas.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message: `A unidade ${key} aparece duas vezes na seleção.`,
        });
        return;
      }
      vistas.add(key);
      if (unit.half === null) inteiros.add(unit.number);
      else metades.add(unit.number);
    }

    for (const number of inteiros) {
      if (metades.has(number)) {
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message:
            `O título ${number} aparece como título inteiro e como metade na mesma ` +
            `seleção — é a mesma metade pedida duas vezes.`,
        });
        return;
      }
    }
  });

export type ReserveNumbersInput = z.infer<typeof reserveNumbersSchema>;
