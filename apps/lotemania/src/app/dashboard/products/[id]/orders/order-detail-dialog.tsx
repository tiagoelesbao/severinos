"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";

type OrderDetail = {
  id: string;
  buyerName: string | null;
  buyerPhone: string | null;
  status: string;
  quantity: number;
  amount: string;
  createdAt: string | Date;
  paidAt: string | Date | null;
  numbers: number[];
};

export function OrderDetailDialog({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
        <Info className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do pedido</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Compra</dt>
            <dd className="font-mono text-xs">{order.id}</dd>
            <dt className="text-muted-foreground">Participante</dt>
            <dd>{order.buyerName ?? "—"}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{order.buyerPhone ?? "—"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{order.status}</dd>
            <dt className="text-muted-foreground">Quantidade</dt>
            <dd>{order.quantity}</dd>
            <dt className="text-muted-foreground">Valor</dt>
            <dd>{formatCurrency(Number(order.amount))}</dd>
            <dt className="text-muted-foreground">Números</dt>
            <dd>{order.numbers.map((n) => String(n).padStart(2, "0")).join(", ")}</dd>
            <dt className="text-muted-foreground">Criado em</dt>
            <dd>{formatDate(order.createdAt)}</dd>
            <dt className="text-muted-foreground">Pago em</dt>
            <dd>{order.paidAt ? formatDate(order.paidAt) : "—"}</dd>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
