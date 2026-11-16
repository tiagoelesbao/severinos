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
import { communicationSchema, type CommunicationInput } from "@/lib/validations/settings";
import { createCommunication } from "@/lib/actions/settings";

export function NewCommunicationDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommunicationInput>({
    resolver: zodResolver(communicationSchema),
  });

  function onSubmit(data: CommunicationInput) {
    startTransition(async () => {
      try {
        await createCommunication(data);
        toast.success("Comunicado publicado.");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao publicar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Novo Comunicado
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Comunicado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Mensagem</Label>
            <Input id="body" {...register("body")} />
            {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Publicando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
