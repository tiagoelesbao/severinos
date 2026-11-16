"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProductStatus, deleteProduct } from "@/lib/actions/products";

const transitions: Record<string, { label: string; to: "draft" | "active" | "finished" | "canceled" }[]> = {
  draft: [{ label: "Ativar", to: "active" }],
  active: [
    { label: "Finalizar", to: "finished" },
    { label: "Cancelar", to: "canceled" },
  ],
  finished: [],
  canceled: [{ label: "Reabrir como rascunho", to: "draft" }],
};

export function ProductStatusActions({
  productId,
  currentStatus,
}: {
  productId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const options = transitions[currentStatus] ?? [];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <Button
          key={opt.to}
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setProductStatus(productId, opt.to);
              toast.success(`Status atualizado para ${opt.label.toLowerCase()}.`);
            })
          }
        >
          {opt.label}
        </Button>
      ))}
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteProduct(productId);
            toast.success("Sorteio excluído.");
            router.push("/dashboard/products");
          })
        }
      >
        Excluir
      </Button>
    </div>
  );
}
