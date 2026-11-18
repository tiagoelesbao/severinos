"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { togglePaymentGatewayActive } from "@/lib/actions/payment-gateways";
import {
  ConfigureGatewayDialog,
  WebhookUrlHint,
} from "./configure-gateway-dialog";

export function GatewayRow({
  provider,
  tenantSlug,
  webhookToken,
  configured,
  isActive,
}: {
  provider: string;
  tenantSlug: string;
  webhookToken: string | null;
  configured: boolean;
  isActive: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium capitalize">{provider}</TableCell>
      <TableCell>
        <Badge variant={configured ? "secondary" : "outline"}>
          {configured ? "Configurado" : "Não configurado"}
        </Badge>
      </TableCell>
      <TableCell>
        {/* A URL de recebimento vem do MESMO componente que o diálogo usa.
            Antes a tela e o diálogo escreviam o endereço à mão, cada um de um
            jeito, e o do diálogo estava errado (sem o tenant). AC-B1. */}
        <WebhookUrlHint
          tenantSlug={tenantSlug}
          provider={provider}
          token={webhookToken}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={isActive}
          disabled={!configured || isPending}
          onCheckedChange={(checked) =>
            startTransition(() => togglePaymentGatewayActive(provider, checked))
          }
        />
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          Configurar
        </Button>
      </TableCell>
      <ConfigureGatewayDialog
        provider={provider}
        tenantSlug={tenantSlug}
        webhookToken={webhookToken}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        configured={configured}
      />
    </TableRow>
  );
}
