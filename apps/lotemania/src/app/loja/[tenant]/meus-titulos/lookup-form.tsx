"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField, FieldInput } from "@/components/ui/form-field";
import { formatCurrency, formatDate } from "@/lib/format";
import { lookupOrdersByPhone } from "@/lib/actions/my-titles";

type OrderRow = {
  id: string;
  status: string;
  amount: string;
  createdAt: string | Date;
  productTitle: string;
  productSlug: string;
  numbers: number[];
};

const statusLabel: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  expired: "Expirado",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

export function LookupForm({ tenantSlug }: { tenantSlug: string }) {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!phone) return;
    startTransition(async () => {
      const result = await lookupOrdersByPhone(tenantSlug, phone);
      setOrders((result.orders as OrderRow[]) ?? []);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Informe seu telefone" required>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🇧🇷</span>
          <FieldInput
            placeholder="99 90000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </FormField>

      {!phone && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/15 px-4 py-3 text-sm text-amber-500">
          <AlertTriangle className="size-4 shrink-0" />
          Informe seu telefone para continuar
        </div>
      )}

      <Button
        onClick={submit}
        disabled={isPending || !phone}
        className="bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isPending ? "Buscando..." : "Continuar"}
      </Button>

      {orders !== null && orders.length === 0 && (
        <p className="text-muted-foreground">Nenhum título encontrado para esse telefone.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{order.productTitle}</p>
                <Badge variant={order.status === "paid" ? "default" : "outline"}>
                  {statusLabel[order.status]}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {formatCurrency(Number(order.amount))}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {order.numbers.map((n) => (
                  <span
                    key={n}
                    className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs"
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(order.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
