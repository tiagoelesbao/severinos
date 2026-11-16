"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { simulatePayment } from "@/lib/actions/checkout";

export function PaymentStatus({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status === "paid") {
    return <Badge>Pago</Badge>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Badge variant="outline">Aguardando pagamento</Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await simulatePayment(orderId);
            router.refresh();
          })
        }
      >
        {isPending ? "Confirmando..." : "Simular pagamento (ambiente de teste)"}
      </Button>
    </div>
  );
}
