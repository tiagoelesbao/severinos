"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  outboundWebhookSchema,
  WEBHOOK_EVENTS,
  type OutboundWebhookInput,
} from "@/lib/validations/integration";
import { createOutboundWebhook } from "@/lib/actions/integrations";

export function NewWebhookDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OutboundWebhookInput>({
    resolver: zodResolver(outboundWebhookSchema),
    defaultValues: { events: [] },
  });

  function onSubmit(data: OutboundWebhookInput) {
    startTransition(async () => {
      try {
        await createOutboundWebhook(data);
        toast.success("Webhook criado.");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Novo Webhook
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Webhook</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">URL de destino</Label>
            <Input id="url" placeholder="https://" {...register("url")} />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Eventos</Label>
            <Controller
              control={control}
              name="events"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value?.includes(event)}
                        onCheckedChange={(checked) => {
                          const current = field.value ?? [];
                          field.onChange(
                            checked
                              ? [...current, event]
                              : current.filter((e) => e !== event),
                          );
                        }}
                      />
                      <span className="font-mono">{event}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.events && (
              <p className="text-sm text-destructive">{errors.events.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
