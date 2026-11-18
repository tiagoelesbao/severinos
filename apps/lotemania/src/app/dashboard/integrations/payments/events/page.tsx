import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { paymentWebhookEvents } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fromCents } from "@/lib/payments/money";
import { requireUser } from "@/lib/auth/require-user";

// ════════════════════════════════════════════════════════════════════════
// A LISTA QUE SUBSTITUI A REENTREGA (AC-F4)
//
// A rota responde 200 até para o aviso que NÃO foi processado, porque é o que
// a documentação da Paysure orienta e porque reentregar não conserta nada do
// que costuma dar errado (provedor sem adaptador, pedido inexistente, valor
// divergente). Depois de três reentregas o evento é marcado `client_error` no
// painel do provedor — isto é, o problema sai da nossa vista.
//
// Esta tela é o outro lado desse compromisso: o fail-loud mora AQUI. Sem
// ela, responder 200 seria engolir em silêncio, que é exatamente o defeito
// que a story existe para corrigir.
// ════════════════════════════════════════════════════════════════════════

const ROTULOS: Record<string, { texto: string; tom: "neutro" | "atencao" | "ok" }> = {
  received: { texto: "Recebido (sem decisão)", tom: "atencao" },
  unauthenticated: { texto: "Não autenticado", tom: "atencao" },
  unsupported_provider: { texto: "Provedor sem adaptador", tom: "atencao" },
  invalid_payload: { texto: "Corpo não interpretável", tom: "atencao" },
  not_actionable: { texto: "Status não acionável", tom: "neutro" },
  unmatched: { texto: "Sem pedido correspondente", tom: "atencao" },
  amount_mismatch: { texto: "Valor divergente", tom: "atencao" },
  unit_conflict: { texto: "Conflito de unidade", tom: "atencao" },
  already_settled: { texto: "Pedido já estava pago", tom: "neutro" },
  refund_pending: { texto: "Estorno pendente", tom: "atencao" },
  settled: { texto: "Pedido fechado", tom: "ok" },
};

const LIMITE = 200;

export interface WebhookEventListItem {
  id: string;
  provider: string;
  receivedAt: Date;
  amountCents: number | null;
  matchState: string;
  matchReason: string | null;
  orderId: string | null;
  deliveryCount: number;
}

/**
 * A tabela, exportada à parte da página.
 *
 * Fica separada porque a página chama `requireUser()`, que lê `cookies()` do
 * Next — e `cookies()` não existe fora de uma requisição. Sem a separação, o
 * AC-F4 ("a lista exibe data, provedor, valor, estado e motivo, e contém os
 * itens produzidos por AC-F1, AC-F2 e AC-F3") só seria verificável por
 * inspeção visual. Com ela, o teste alimenta este componente com os eventos
 * que a ROTA de verdade produziu e lê a marcação.
 *
 * A data sai em ISO em vez de `toLocaleString("pt-BR")`: formato local
 * depende do fuso e do ICU de quem renderiza, e o operador precisa poder
 * comparar o horário com o painel do provedor sem adivinhar o fuso.
 */
export function WebhookEventsTable({
  eventos,
}: {
  eventos: readonly WebhookEventListItem[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Provedor</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Entregas</TableHead>
          <TableHead>Motivo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eventos.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">
              Nenhum aviso recebido ainda.
            </TableCell>
          </TableRow>
        )}
        {eventos.map((evento) => {
          const rotulo =
            ROTULOS[evento.matchState] ?? {
              texto: evento.matchState,
              tom: "neutro" as const,
            };
          return (
            <TableRow key={evento.id}>
              <TableCell className="whitespace-nowrap" data-event-date>
                {evento.receivedAt.toISOString()}
              </TableCell>
              <TableCell className="capitalize" data-event-provider>
                {evento.provider}
              </TableCell>
              <TableCell className="whitespace-nowrap" data-event-amount>
                {evento.amountCents === null
                  ? "—"
                  : `R$ ${fromCents(evento.amountCents)}`}
              </TableCell>
              <TableCell data-event-state={evento.matchState}>
                <Badge
                  variant={
                    rotulo.tom === "ok"
                      ? "secondary"
                      : rotulo.tom === "atencao"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {rotulo.texto}
                </Badge>
              </TableCell>
              <TableCell data-event-deliveries>{evento.deliveryCount}</TableCell>
              <TableCell
                className="text-sm text-muted-foreground"
                data-event-reason
              >
                {evento.matchReason ?? "—"}
                {evento.orderId && (
                  <span className="block font-mono text-xs">
                    pedido {evento.orderId}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function PaymentWebhookEventsPage() {
  const user = await requireUser();

  const eventos = await db
    .select({
      id: paymentWebhookEvents.id,
      provider: paymentWebhookEvents.provider,
      receivedAt: paymentWebhookEvents.receivedAt,
      amountCents: paymentWebhookEvents.amountCents,
      matchState: paymentWebhookEvents.matchState,
      matchReason: paymentWebhookEvents.matchReason,
      orderId: paymentWebhookEvents.orderId,
      deliveryCount: paymentWebhookEvents.deliveryCount,
    })
    .from(paymentWebhookEvents)
    .where(eq(paymentWebhookEvents.tenantId, user.tenantId))
    .orderBy(desc(paymentWebhookEvents.receivedAt))
    .limit(LIMITE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Avisos de pagamento recebidos
        </h1>
        <p className="text-muted-foreground">
          Todo aviso que chega fica aqui — processado ou não, autenticado ou
          não. Aviso que não fechou pedido tem um estado e um motivo nomeados, e
          é esta lista que faz dele um problema visível em vez de silencioso.
        </p>
      </div>

      <div className="rounded-lg border">
        <WebhookEventsTable eventos={eventos} />
      </div>
    </div>
  );
}
