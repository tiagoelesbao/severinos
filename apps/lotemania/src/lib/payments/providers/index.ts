import {
  PAYMENT_GATEWAY_PROVIDERS,
  isPaymentGatewayProvider,
  type PaymentGatewayProvider,
} from "@/lib/validations/payment-gateway";

import { createHmacGenericAdapter } from "./hmac-generic";
import { createPaysureAdapter } from "./paysure";
import type { GatewayAdapter } from "./types";

// O registro de adaptadores — e o que a AUSÊNCIA de uma entrada significa.
//
// ════════════════════════════════════════════════════════════════════════
// PROVEDOR SEM ADAPTADOR É RECUSADO EM VOZ ALTA, NUNCA ACEITO EM SILÊNCIO
//
// `UNSUPPORTED` está VAZIA a partir da LTM-03b, e isso é um marco, não um
// descuido: a `paysure` morava nela — representável, configurável, com
// token e visível na tela, mas sem adaptador, porque implementar adaptador
// sem contrato acordado é inventar formato. O contrato foi lido
// (`docs/research/2026-11-16-paysure-contrato.md`) e o adaptador existe
// (`./paysure.ts`), então a entrada saiu.
//
// O MECANISMO FICA. Ele não é andaime da `paysure`: é a resposta à pergunta
// "o que acontece quando alguém acrescenta um provedor às duas listas e não
// escreve o adaptador?". Enquanto `UNSUPPORTED` está vazia o caminho é
// inalcançável pela rota, e isso é o estado desejável — não razão para
// apagar a guarda. O comportamento, quando ele volta a ser alcançável, é o
// que o AC-F2 da LTM-03a descreveu e segue valendo: o evento é gravado com
// estado `unsupported_provider` NOMEANDO o provedor, pedido intocado, item
// na lista do operador, e a resposta HTTP é 200 — com o corpo dizendo que
// não foi processado, nunca `{ ok: true }` pelado.
//
// Por que 200 e não erro: a Paysure reentrega três vezes (imediata, ~5 min,
// ~30 min) e depois marca `client_error` NO PAINEL DELA. Três reentregas não
// fazem um adaptador aparecer, e depois delas o problema sai da nossa vista.
// O fail-loud mora no registro e na lista do operador, não no código HTTP.
//
// Os 17 provedores herdados usam o adaptador HMAC de referência — que é o
// que o código de hoje já fazia com todos eles. Nenhum está contratado
// (nota de escopo do founder, 2026-11-16: "o único gateway que importa agora
// é a paysure"), então a entrada deles aqui preserva o comportamento atual
// sem afirmar nada novo sobre o formato de cada um.
//
// A `paysure` é o único com adaptador escrito contra documentação própria —
// e o único que declara `signature: "none"`, porque é o único que de fato
// não assina.
// ════════════════════════════════════════════════════════════════════════

const UNSUPPORTED: readonly PaymentGatewayProvider[] = [];

/** Provedores com adaptador PRÓPRIO, escrito contra o contrato deles. */
const DEDICATED_ADAPTERS: Partial<Record<PaymentGatewayProvider, GatewayAdapter>> = {
  paysure: createPaysureAdapter(),
};

const ADAPTERS: Partial<Record<PaymentGatewayProvider, GatewayAdapter>> = {
  ...Object.fromEntries(
    PAYMENT_GATEWAY_PROVIDERS.filter(
      (provider) =>
        !UNSUPPORTED.includes(provider) && !(provider in DEDICATED_ADAPTERS),
    ).map((provider) => [provider, createHmacGenericAdapter(provider)]),
  ),
  ...DEDICATED_ADAPTERS,
};

/**
 * O adaptador do provedor, ou `null` quando ele ainda não tem um.
 *
 * `null` continua sendo resposta legítima e não borda — era o estado da
 * `paysure` até a LTM-03b e passa a ser o estado de qualquer provedor novo
 * acrescentado às listas sem adaptador. A rota tem de tratá-lo como decisão
 * registrada, não como erro inesperado.
 */
export function adapterFor(provider: string): GatewayAdapter | null {
  if (!isPaymentGatewayProvider(provider)) return null;
  return ADAPTERS[provider] ?? null;
}

export function providersWithoutAdapter(): readonly PaymentGatewayProvider[] {
  return UNSUPPORTED;
}

export type { GatewayAdapter } from "./types";
