"use client";

import { useState, useTransition } from "react";
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
  paymentGatewaySchema,
  type PaymentGatewayInput,
} from "@/lib/validations/payment-gateway";
import { savePaymentGateway } from "@/lib/actions/payment-gateways";

export function ConfigureGatewayDialog({
  provider,
  open,
  onOpenChange,
  configured,
}: {
  provider: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentGatewayInput>({
    resolver: zodResolver(paymentGatewaySchema),
    defaultValues: { provider: provider as PaymentGatewayInput["provider"] },
  });

  function onSubmit(data: PaymentGatewayInput) {
    startTransition(async () => {
      try {
        await savePaymentGateway({ ...data, provider: provider as PaymentGatewayInput["provider"] });
        toast.success(`${provider} configurado.`);
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
          <DialogTitle className="capitalize">{provider}</DialogTitle>
          <DialogDescription>
            {configured
              ? "Atualize a chave de API e o segredo do webhook."
              : "Informe as credenciais para ativar este gateway."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">Chave de API</Label>
            <Input id="apiKey" type="password" {...register("apiKey")} />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhookSecret">Segredo do Webhook</Label>
            <Input
              id="webhookSecret"
              type="password"
              {...register("webhookSecret")}
            />
            {errors.webhookSecret && (
              <p className="text-sm text-destructive">
                {errors.webhookSecret.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Usado para verificar a assinatura de cada evento recebido em{" "}
              <code>/api/webhooks/payment/{provider}</code>.
            </p>
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
