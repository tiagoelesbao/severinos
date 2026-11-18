// O caminho da rota de webhook, derivado de UMA função.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ISTO NÃO É UM TEMPLATE ESCRITO EM CADA TELA
//
// Era, e as telas discordavam entre si:
//
//   configure-gateway-dialog.tsx:92   /api/webhooks/payment/{provider}
//                                     — SEM o tenant. O operador que
//                                     copiasse isto configurava um endereço
//                                     que responde 404.
//   payments/page.tsx:38              /api/webhooks/payment/{tenant}/[provider]
//                                     — com tenant, sem token.
//
// Duas formas escritas à mão, nenhuma correta, e nada que as comparasse. A
// correção não é consertar as duas strings: é haver uma só função, e as duas
// telas a chamarem. O AC-B1 é o teste que extrai a URL DO RENDER das duas e
// exige que sejam iguais e que um POST nelas seja aceito.
//
// Este módulo é PURO de propósito — nada de `node:crypto` aqui. Ele é
// importado por componente de cliente (`configure-gateway-dialog.tsx`), e
// `webhook-token.ts`, que usa crypto, não pode ser.
// ════════════════════════════════════════════════════════════════════════

export const WEBHOOK_PATH_PREFIX = "/api/webhooks/payment";

/**
 * O caminho tokenizado — o único endereço que aceita aviso de pagamento.
 *
 * O token é SEGMENTO DE CAMINHO, não parâmetro de consulta. A razão está em
 * `webhook-token.ts`: sem o segmento não existe rota, e não existir rota é
 * falhar fechado por roteamento, antes de qualquer linha de validação.
 */
export function webhookPath(
  tenantSlug: string,
  provider: string,
  token: string,
): string {
  return `${WEBHOOK_PATH_PREFIX}/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(provider)}/${encodeURIComponent(token)}`;
}

/** O caminho sem token — a rota aposentada, que responde 410 (AC-G1). */
export function retiredWebhookPath(tenantSlug: string, provider: string): string {
  return `${WEBHOOK_PATH_PREFIX}/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(provider)}`;
}
