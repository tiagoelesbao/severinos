"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { integrationLabels } from "@/lib/validations/integration";
import { toggleIntegrationActive } from "@/lib/actions/integrations";
import { ConfigureIntegrationDialog } from "./configure-integration-dialog";

export function IntegrationRow({
  provider,
  configured,
  isActive,
}: {
  provider: string;
  configured: boolean;
  isActive: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{integrationLabels[provider]}</TableCell>
      <TableCell>
        <Badge variant={configured ? "secondary" : "outline"}>
          {configured ? "Configurado" : "Não configurado"}
        </Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={isActive}
          disabled={!configured || isPending}
          onCheckedChange={(checked) =>
            startTransition(() => toggleIntegrationActive(provider, checked))
          }
        />
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          Configurar
        </Button>
      </TableCell>
      <ConfigureIntegrationDialog
        provider={provider}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </TableRow>
  );
}
