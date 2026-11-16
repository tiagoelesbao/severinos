import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentGateways, tenants } from "@/db/schema";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_GATEWAY_PROVIDERS } from "@/lib/validations/payment-gateway";
import { requireUser } from "@/lib/auth/require-user";
import { GatewayRow } from "./gateway-row";

export default async function PaymentGatewaysPage() {
  const user = await requireUser();
  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  const configured = await db
    .select()
    .from(paymentGateways)
    .where(eq(paymentGateways.tenantId, user.tenantId));
  const byProvider = new Map(configured.map((g) => [g.provider, g]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Gateways de Pagamento
        </h1>
        <p className="text-muted-foreground">
          Um único ponto de configuração para todos os provedores PIX — cada
          um recebe eventos em{" "}
          <code>/api/webhooks/payment/{tenant?.slug}/[provider]</code>, com
          verificação de assinatura por segredo próprio.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYMENT_GATEWAY_PROVIDERS.map((provider) => {
              const row = byProvider.get(provider);
              return (
                <GatewayRow
                  key={provider}
                  provider={provider}
                  configured={!!row}
                  isActive={row?.isActive ?? false}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
