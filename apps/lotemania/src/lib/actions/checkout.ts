"use server";

import { settleOrder } from "@/lib/payments/settle-order";

// Dev/test-only: marks an order paid without a real gateway, since no
// live PIX credentials are connected yet. Clearly labeled in the UI —
// remove once a real payment_gateways row is wired up for a tenant.
//
// ════════════════════════════════════════════════════════════════════════
// A SEQUÊNCIA DE FECHAMENTO SAIU DAQUI (LTM-03a, AC-C3)
//
// As quatro escritas moravam neste arquivo, inline, numa transação (LTM-02).
// Elas continuam numa transação e continuam sendo as mesmas quatro — só
// moraram para `src/lib/payments/settle-order.ts`, que é agora o único lugar
// onde elas existem.
//
// A razão é o defeito que esta story conserta: enquanto o fechamento vivia
// no caminho SIMULADO, o caminho real (o webhook) tinha um `TODO` — e os
// zero pedidos pagos do app vinham exatamente disso. Uma implementação só
// significa que o caminho de teste e o caminho do dinheiro não podem
// divergir, porque são o mesmo código.
//
// A guarda contra pagamento em dobro (o antigo `order.status !== "pending"`,
// `checkout.ts:19`) também foi junto, e virou a recusa `already_settled` —
// com o pedido TRAVADO (`FOR UPDATE`) antes da conferência, que a versão
// anterior não fazia. O AC-C4 prova que ela sobreviveu à extração.
// ════════════════════════════════════════════════════════════════════════
export async function simulatePayment(orderId: string) {
  const result = await settleOrder({
    orderId,
    description: "Pagamento simulado (ambiente de teste)",
    // Nenhum valor externo a conferir: não há aviso de provedor aqui, então
    // não há o que divergir de `orders.amount`.
    expectedAmountCents: null,
  });

  if (result.ok) return { ok: true };

  // A mensagem continua sendo "Pedido inválido." para todas as recusas, como
  // era: é texto de tela de ambiente de teste, e o motivo detalhado já está
  // no retorno de `settleOrder` para quem depura. Mudar o texto aqui
  // quebraria a suíte sem melhorar nada para quem usa.
  return { error: "Pedido inválido." };
}
