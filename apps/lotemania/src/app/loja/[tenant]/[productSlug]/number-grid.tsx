"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { AvailabilityWarning } from "./raffle-extras";

type NumberStatus = "available" | "reserved" | "sold";

export function NumberGrid({
  tenantSlug,
  productSlug,
  pricePerNumber,
  numbers,
}: {
  tenantSlug: string;
  productSlug: string;
  pricePerNumber: number;
  numbers: { number: number; status: NumberStatus }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    for (const n of numbers) c[n.status]++;
    return c;
  }, [numbers]);

  function toggle(n: number, status: NumberStatus) {
    if (status !== "available") return;
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }

  const total = selected.length * pricePerNumber;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await reserveSelectedNumbers({
        tenantSlug,
        productSlug,
        numbers: selected,
        phone,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Números reservados!");
      router.push(`/loja/${tenantSlug}/${productSlug}/pedido/${result.orderId}`);
    });
  }

  const colorFor: Record<NumberStatus | "selected", string> = {
    available: "bg-muted hover:bg-muted/70 text-muted-foreground",
    reserved: "bg-yellow-400 text-black",
    sold: "bg-emerald-500 text-white",
    selected: "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-xs font-medium">
        <span className="flex-1 rounded-full bg-muted px-3 py-2 text-center text-muted-foreground">
          {counts.available} Livres
        </span>
        <span className="flex-1 rounded-full bg-yellow-400 px-3 py-2 text-center text-black">
          {counts.reserved} Reservados
        </span>
        <span className="flex-1 rounded-full bg-emerald-500 px-3 py-2 text-center text-white">
          {counts.sold} Pagos
        </span>
      </div>

      <AvailabilityWarning available={counts.available} />

      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
        {numbers.map(({ number, status }) => {
          const isSelected = selected.includes(number);
          return (
            <button
              key={number}
              type="button"
              disabled={status !== "available"}
              onClick={() => toggle(number, status)}
              className={`rounded-md py-2 text-xs font-mono font-medium tabular-nums transition-colors disabled:cursor-default ${
                isSelected ? colorFor.selected : colorFor[status]
              }`}
            >
              {String(number).padStart(2, "0")}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background p-3 shadow-lg">
          <div className="flex flex-wrap gap-1">
            {selected.slice(0, 8).map((n) => (
              <span
                key={n}
                className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary"
              >
                {String(n).padStart(2, "0")}
              </span>
            ))}
            {selected.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{selected.length - 8}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatCurrency(total)}
            </span>
            <Button size="sm" onClick={() => setCheckoutOpen(true)}>
              Quero participar
            </Button>
          </div>
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 text-sm">
            Você está adquirindo <b>{selected.length}</b> unidade(s) — {" "}
            {formatCurrency(total)}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Informe seu telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 98888-7777"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Ao confirmar, você declara que leu e concorda com os termos de uso.
          </p>
          <DialogFooter>
            <Button onClick={submit} disabled={isPending || !phone} className="w-full">
              {isPending ? "Reservando..." : "Concluir Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
