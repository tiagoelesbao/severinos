"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { updateSettings } from "@/lib/actions/settings";

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  });

  function onSubmit(data: SettingsInput) {
    startTransition(async () => {
      try {
        await updateSettings(data);
        toast.success("Configurações salvas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="siteName">Nome do site</Label>
        <Input id="siteName" {...register("siteName")} />
        {errors.siteName && (
          <p className="text-sm text-destructive">{errors.siteName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="logoUrl">URL do logo</Label>
        <Input id="logoUrl" {...register("logoUrl")} />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Exigir 2FA de todos os usuários</p>
          <p className="text-xs text-muted-foreground">
            Recomendado para aumentar a segurança da conta.
          </p>
        </div>
        <Controller
          control={control}
          name="twoFactorRequired"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Captcha</p>
          <p className="text-xs text-muted-foreground">
            Proteger login, cadastro e consulta de números.
          </p>
        </div>
        <Controller
          control={control}
          name="captchaEnabled"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
