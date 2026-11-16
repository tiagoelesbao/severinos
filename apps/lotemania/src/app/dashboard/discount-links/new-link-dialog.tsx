"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  discountLinkSchema,
  type DiscountLinkInput,
} from "@/lib/validations/affiliate";
import { createDiscountLink } from "@/lib/actions/affiliates";

const CHECKOUT_ITEMS = { direto: "Direto", manual: "Manual" };

export function NewLinkDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DiscountLinkInput>({
    resolver: zodResolver(discountLinkSchema),
    defaultValues: {
      checkoutType: "direto",
      ticketQuantity: 0,
      minQuantity: 1,
      usageLimit: 0,
      perUserLimit: 0,
    },
  });

  function onSubmit(data: DiscountLinkInput) {
    startTransition(async () => {
      try {
        await createDiscountLink(data);
        toast.success("Link criado.");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar link.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Novo Link De Desconto
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Link de Desconto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" {...register("code")} />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountPercent">Desconto (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.01"
                {...register("discountPercent")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Checkout</Label>
              <Select
                items={CHECKOUT_ITEMS}
                defaultValue="direto"
                onValueChange={(v) => setValue("checkoutType", v as "direto" | "manual")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">Direto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ticketQuantity">Qtd de Títulos</Label>
              <Input id="ticketQuantity" type="number" {...register("ticketQuantity")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minQuantity">Qtd Mínima</Label>
              <Input id="minQuantity" type="number" {...register("minQuantity")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="usageLimit">Lim. Uso (0 = ilimitado)</Label>
              <Input id="usageLimit" type="number" {...register("usageLimit")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="perUserLimit">Lim. por Usuário (0 = ilimitado)</Label>
              <Input id="perUserLimit" type="number" {...register("perUserLimit")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
