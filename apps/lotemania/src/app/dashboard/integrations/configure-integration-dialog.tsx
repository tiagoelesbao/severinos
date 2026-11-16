"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  integrationSchema,
  integrationLabels,
  type IntegrationInput,
} from "@/lib/validations/integration";
import { saveIntegration } from "@/lib/actions/integrations";

export function ConfigureIntegrationDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IntegrationInput>({
    resolver: zodResolver(integrationSchema),
    defaultValues: { provider: provider as IntegrationInput["provider"] },
  });

  function onSubmit(data: IntegrationInput) {
    startTransition(async () => {
      try {
        await saveIntegration({ ...data, provider: provider as IntegrationInput["provider"] });
        toast.success(`${integrationLabels[provider]} configurado.`);
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{integrationLabels[provider]}</DialogTitle>
          <DialogDescription>Informe a chave de API para ativar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">Chave de API</Label>
            <Input id="apiKey" type="password" {...register("apiKey")} />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
