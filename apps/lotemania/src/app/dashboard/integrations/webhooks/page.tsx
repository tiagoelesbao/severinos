import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { outboundWebhooks } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WEBHOOK_EVENTS } from "@/lib/validations/integration";
import { NewWebhookDialog } from "./new-webhook-dialog";
import { WebhookRowActions } from "./webhook-row-actions";

const examplePayloads: Record<string, object> = {
  "order.paid": {
    event: "order.paid",
    orderId: "b5c1...",
    productId: "a3f2...",
    amount: "25.00",
    numbers: [12, 87, 134],
  },
  "order.refunded": { event: "order.refunded", orderId: "b5c1...", amount: "25.00" },
  "product.drawn": { event: "product.drawn", productId: "a3f2...", winningNumber: 87 },
  "affiliate.created": { event: "affiliate.created", affiliateId: "c9e0...", code: "a1b2c3d4" },
  "payment_request.approved": {
    event: "payment_request.approved",
    requestId: "d7f1...",
    amount: "150.00",
  },
};

export default async function WebhooksPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(outboundWebhooks)
    .where(eq(outboundWebhooks.tenantId, user.tenantId))
    .orderBy(desc(outboundWebhooks.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Notifique seus próprios sistemas quando algo acontecer aqui.
          </p>
        </div>
        <NewWebhookDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Eventos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum webhook cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm">{row.url}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(row.events as string[]).join(", ")}
                </TableCell>
                <TableCell>
                  <WebhookRowActions id={row.id} isActive={row.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exemplos de payload</CardTitle>
          <CardDescription>
            Cada evento é enviado como POST com corpo JSON e assinado via
            HMAC-SHA256 no header <code>x-webhook-signature</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {WEBHOOK_EVENTS.map((event) => (
            <div key={event}>
              <p className="mb-1 font-mono text-sm font-medium">{event}</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(examplePayloads[event], null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
