"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setPaymentRequestStatus } from "@/lib/actions/banking";

export function PaymentRequestActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => setPaymentRequestStatus(id, "approved"))}
      >
        Aprovar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => setPaymentRequestStatus(id, "rejected"))}
      >
        Rejeitar
      </Button>
    </div>
  );
}
