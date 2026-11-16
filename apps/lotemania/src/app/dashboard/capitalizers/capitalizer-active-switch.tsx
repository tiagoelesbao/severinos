"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleCapitalizerActive } from "@/lib/actions/misc";

export function CapitalizerActiveSwitch({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => startTransition(() => toggleCapitalizerActive(id, checked))}
    />
  );
}
