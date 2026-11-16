"use client";

import { useState } from "react";
import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export function SalesSummaryButton({
  title,
  status,
  available,
  reserved,
  sold,
  progress,
}: {
  title: string;
  status: string;
  available: number;
  reserved: number;
  sold: number;
  progress: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        title="Resumo das Vendas"
      >
        <PieChart className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo das Vendas</DialogTitle>
          </DialogHeader>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{status}</p>
          </div>
          <Progress value={progress} />
          <p className="text-center text-xs text-muted-foreground">{progress}%</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border px-3 py-2 text-center text-sm">
              {available} Livres
            </div>
            <div className="rounded-md border border-amber-500/50 px-3 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
              {reserved} Reservados
            </div>
            <div className="rounded-md border border-emerald-500/50 px-3 py-2 text-center text-sm text-emerald-600 dark:text-emerald-400">
              {sold} Pagos
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
