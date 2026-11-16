"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  blockedNumberSchema,
  type BlockedNumberInput,
} from "@/lib/validations/misc";
import { createBlockedNumber, deleteBlockedNumber } from "@/lib/actions/misc";

type BlockedNumber = { id: string; phone: string; reason: string | null };

export function BlockedNumbersCard({ numbers }: { numbers: BlockedNumber[] }) {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset } = useForm<BlockedNumberInput>({
    resolver: zodResolver(blockedNumberSchema),
  });

  function onSubmit(data: BlockedNumberInput) {
    startTransition(async () => {
      try {
        await createBlockedNumber(data);
        toast.success("Número bloqueado.");
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao bloquear.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Números Bloqueados</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
          <Input placeholder="Telefone" {...register("phone")} />
          <Input placeholder="Motivo (opcional)" {...register("reason")} />
          <Button type="submit" disabled={isPending} size="icon">
            <Plus />
          </Button>
        </form>
        <ul className="flex flex-col gap-2">
          {numbers.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nenhum número bloqueado.
            </li>
          )}
          {numbers.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-mono">{n.phone}</span>
                {n.reason && (
                  <span className="ml-2 text-muted-foreground">{n.reason}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => startTransition(() => deleteBlockedNumber(n.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
