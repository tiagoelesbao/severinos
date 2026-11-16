"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleDiscountLinkActive } from "@/lib/actions/affiliates";

export function LinkActiveSwitch({
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
        startTransition(() => toggleDiscountLinkActive(id, checked))
      }
    />
  );
}
