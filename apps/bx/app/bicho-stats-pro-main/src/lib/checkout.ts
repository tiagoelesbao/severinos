/**
 * Quando os checkouts estiverem prontos, cole um link de pagamento para cada plano.
 */
export const LINKS_CHECKOUT = {
  estatisticas: "",
  completo: "",
} as const;

export type PlanoCheckout = keyof typeof LINKS_CHECKOUT;
