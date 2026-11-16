"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setProductStatus } from "@/lib/actions/products";

type Status = "draft" | "active" | "finished" | "canceled";

const statusLabel: Record<Status, string> = {
  draft: "Rascunho",
  active: "Ativo",
  finished: "Finalizado",
  canceled: "Cancelado",
};

const statusColor: Record<Status, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  active: "bg-emerald-500 text-white",
  finished: "bg-sky-500/20 text-sky-400",
  canceled: "bg-rose-500/20 text-rose-400",
};

const allStatuses: Status[] = ["draft", "active", "finished", "canceled"];

export function ProductStatusSelect({
  productId,
  status,
}: {
  productId: string;
  status: Status;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={isPending}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status]}`}
          />
        }
      >
        {statusLabel[status]}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {allStatuses.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={s === status}
            onClick={() =>
              startTransition(async () => {
                await setProductStatus(productId, s);
                toast.success(`Status alterado para ${statusLabel[s]}.`);
              })
            }
          >
            {statusLabel[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
