"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleCommunicationActive } from "@/lib/actions/settings";

export function CommunicationActiveSwitch({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => startTransition(() => toggleCommunicationActive(id, checked))}
    />
  );
}
