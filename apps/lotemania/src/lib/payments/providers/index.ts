import {
  PAYMENT_GATEWAY_PROVIDERS,
  isPaymentGatewayProvider,
  type PaymentGatewayProvider,
} from "@/lib/validations/payment-gateway";

import { createHmacGenericAdapter } from "./hmac-generic";
import type { GatewayAdapter } from "./types";

// O registro de adaptadores — e o que a AUSÊNCIA de uma entrada significa.
//
// ════════════════════════════════════════════════════════════════════════
// PROVEDOR SEM ADAPTADOR É RECUSADO EM VOZ ALTA, NUNCA ACEITO EM SILÊNCIO
//
// `paysure` está deliberadamente FORA deste mapa. Ela existe nas duas listas
// de provedores (é representável, configurável, tem token e aparece na tela),
// mas o adaptador dela é a `LTM-03b` — e implementar adaptador sem contrato
// acordado é inventar formato, que é o defeito que esta story existe para
// não repetir.
//
// A consequência é observável e testada (AC-F2): aviso da paysure entra,
// passa pelo token, e o evento é gravado com estado `unsupported_provider`
// NOMEANDO o provedor, com o pedido intocado e item na lista do operador. A
// resposta HTTP é 200 — com o corpo dizendo que não foi processado, nunca
// `{ ok: true }` pelado.
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
// ════════════════════════════════════════════════════════════════════════

const UNSUPPORTED: readonly PaymentGatewayProvider[] = [
  // Adaptador real: LTM-03b.
  "paysure",
];

const ADAPTERS: Partial<Record<PaymentGatewayProvider, GatewayAdapter>> =
  Object.fromEntries(
    PAYMENT_GATEWAY_PROVIDERS.filter(
      (provider) => !UNSUPPORTED.includes(provider),
    ).map((provider) => [provider, createHmacGenericAdapter(provider)]),
  );

/**
 * O adaptador do provedor, ou `null` quando ele ainda não tem um.
 *
 * `null` é resposta legítima e não é borda: é o estado da `paysure` hoje. A
 * rota tem de tratá-lo como decisão registrada, não como erro inesperado.
 */
export function adapterFor(provider: string): GatewayAdapter | null {
  if (!isPaymentGatewayProvider(provider)) return null;
  return ADAPTERS[provider] ?? null;
}

export function providersWithoutAdapter(): readonly PaymentGatewayProvider[] {
  return UNSUPPORTED;
}

export type { GatewayAdapter } from "./types";
