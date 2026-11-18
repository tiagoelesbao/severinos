import Link from "next/link";
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
import { providersWithoutAdapter } from "@/lib/payments/providers";
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

  const semAdaptador = providersWithoutAdapter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Gateways de Pagamento
        </h1>
        <p className="text-muted-foreground">
          Um único ponto de configuração para todos os provedores PIX. Cada
          gateway recebe avisos numa URL própria, com um token que autentica o
          aviso — a URL completa aparece na linha do provedor depois de salvar
          as credenciais.
        </p>
        {semAdaptador.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Sem adaptador implementado:{" "}
            <strong className="capitalize">{semAdaptador.join(", ")}</strong>. O
            gateway é configurável, mas todo aviso recebido fica registrado como
            não processado em{" "}
            <Link
              className="underline"
              href="/dashboard/integrations/payments/events"
            >
              Avisos recebidos
            </Link>{" "}
            — nenhum pedido é fechado.
          </p>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>URL de recebimento</TableHead>
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
                  tenantSlug={tenant?.slug ?? ""}
                  webhookToken={row?.webhookToken ?? null}
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
