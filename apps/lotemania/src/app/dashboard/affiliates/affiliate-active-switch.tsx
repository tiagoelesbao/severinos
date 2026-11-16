"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleAffiliateActive } from "@/lib/actions/affiliates";

export function AffiliateActiveSwitch({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) =>
        startTransition(() => toggleAffiliateActive(id, checked))
      }
    />
  );
}
