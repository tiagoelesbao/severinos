"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  toggleOutboundWebhookActive,
  deleteOutboundWebhook,
} from "@/lib/actions/integrations";

export function WebhookRowActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-end gap-2">
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(() => toggleOutboundWebhookActive(id, checked))
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={() => startTransition(() => deleteOutboundWebhook(id))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
