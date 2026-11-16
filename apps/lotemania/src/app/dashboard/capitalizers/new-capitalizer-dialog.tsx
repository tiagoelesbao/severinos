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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { capitalizerSchema, type CapitalizerInput } from "@/lib/validations/misc";
import { createCapitalizer } from "@/lib/actions/misc";

export function NewCapitalizerDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CapitalizerInput>({
    resolver: zodResolver(capitalizerSchema),
  });

  function onSubmit(data: CapitalizerInput) {
    startTransition(async () => {
      try {
        await createCapitalizer(data);
        toast.success("Capitalizadora cadastrada.");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Nova Capitalizadora
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Capitalizadora</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="susepProcessNumber">Processo SUSEP</Label>
            <Input id="susepProcessNumber" {...register("susepProcessNumber")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="terms">Termos</Label>
            <Input id="terms" {...register("terms")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
