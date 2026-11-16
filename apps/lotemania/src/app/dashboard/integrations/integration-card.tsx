"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { integrationLabels, integrationDescriptions } from "@/lib/validations/integration";
import { ConfigureIntegrationDialog } from "./configure-integration-dialog";

export function IntegrationCard({
  provider,
  icon,
  iconClassName,
  configured,
}: {
  provider: string;
  icon: ReactNode;
  iconClassName: string;
  configured: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary"
      >
        <div className="flex items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
            {icon}
          </div>
          <p className="font-semibold uppercase tracking-wide">{integrationLabels[provider]}</p>
        </div>
        <p className="text-sm text-muted-foreground">{integrationDescriptions[provider]}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary">
            {configured ? "Configurado" : "Saiba mais"}
          </span>
        </div>
      </Card>
      <ConfigureIntegrationDialog provider={provider} open={open} onOpenChange={setOpen} />
    </>
  );
}
