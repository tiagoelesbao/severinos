"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updatePhilanthropy } from "@/lib/actions/site-config";

export function PhilanthropyForm({
  initialEnabled,
  initialDescription,
}: {
  initialEnabled: boolean;
  initialDescription: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [description, setDescription] = useState(initialDescription);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updatePhilanthropy(enabled, description);
      toast.success("Configuração salva.");
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Exibir selo de filantropia</p>
          <p className="text-xs text-muted-foreground">
            Mostra uma seção na loja explicando a causa apoiada.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Descrição da causa</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
