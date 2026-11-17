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
import { CircleCheck } from "lucide-react";
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

  // Valores medidos na loja da Sorteamos com getComputedStyle, nao escolhidos.
  // Ver docs/research/2026-11-17-paridade-visual-loja.md. Tokens semanticos do
  // Tailwind (bg-muted, bg-yellow-400, bg-emerald-500) foram o que causou a
  // divergencia visual: sao cores parecidas, nao as mesmas.
  const colorFor: Record<NumberStatus | "selected", string> = {
    available: "bg-[#37495d] text-white hover:bg-[#37495d]/80",
    reserved: "bg-[#ffeb3b] text-black",
    sold: "bg-[#4caf50] text-black",
    selected: "bg-[#266c58] text-white",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-xs font-medium">
        <span className="flex-1 rounded-[5px] bg-[#6c757d] px-3 py-2 text-center text-white">
          {counts.available} Livres
        </span>
        <span className="flex-1 rounded-[5px] bg-[#ffeb3b] px-3 py-2 text-center text-black">
          {counts.reserved} Reservados
        </span>
        <span className="flex-1 rounded-[5px] bg-[#4caf50] px-3 py-2 text-center text-black">
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
              className={`rounded-[4px] py-2 text-xs font-normal tabular-nums transition-colors duration-300 ease-in-out disabled:cursor-default shadow-[0_0_2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.12)] ${
                isSelected ? colorFor.selected : colorFor[status]
              }`}
            >
              {String(number).padStart(2, "0")}
            </button>
          );
        })}
      </div>

      {/* Fixa no rodape, nao `sticky` dentro do fluxo: na loja da Sorteamos
          isto e a barra do app, com topo arredondado e sem borda. Medido. */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[999] flex flex-col gap-2 rounded-t-2xl bg-[#161c24] px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-1">
            {selected.slice(0, 8).map((n) => (
              <span
                key={n}
                className="rounded-[6px] bg-[#198754] px-2 py-0.5 text-xs text-white"
              >
                {String(n).padStart(2, "0")}
              </span>
            ))}
            {selected.length > 8 && (
              <span className="text-xs text-white/70">+{selected.length - 8}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="flex h-[60px] w-full items-center justify-between rounded-[5px] bg-[#198754] px-4 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)]"
          >
            <span className="flex items-center gap-2 text-base font-normal">
              <CircleCheck className="size-5" />
              Quero participar
            </span>
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(total)}
            </span>
          </button>
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
