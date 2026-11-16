"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { updateCustomDomain } from "@/lib/actions/site-config";

export function CertificateForm({
  initialDomain,
  verified,
}: {
  initialDomain: string;
  verified: boolean;
}) {
  const [domain, setDomain] = useState(initialDomain);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updateCustomDomain(domain);
      toast.success(domain ? "Domínio salvo. Aponte o DNS para validar." : "Domínio removido.");
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {initialDomain && (
        <Card className="flex items-center gap-3 p-4">
          {verified ? (
            <ShieldCheck className="size-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-5 text-amber-500" />
          )}
          <div>
            <p className="text-sm font-medium">{initialDomain}</p>
            <p className="text-xs text-muted-foreground">
              {verified
                ? "SSL ativo e domínio verificado."
                : "Aguardando verificação do DNS (CNAME apontando para a plataforma)."}
            </p>
          </div>
        </Card>
      )}
      <div className="flex flex-col gap-2">
        <Label>Domínio próprio</Label>
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="www.seudominio.com"
        />
      </div>
      <Button onClick={submit} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar domínio"}
      </Button>
    </div>
  );
}
