"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { deleteFaq, toggleFaqActive } from "@/lib/actions/site-config";

export function FaqRow({
  id,
  question,
  answer,
  isActive,
}: {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div>
        <p className="font-medium">{question}</p>
        <p className="text-sm text-muted-foreground">{answer}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={isActive}
          disabled={isPending}
          onCheckedChange={(v) =>
            startTransition(async () => {
              await toggleFaqActive(id, v);
            })
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteFaq(id);
              toast.success("Pergunta removida.");
            })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
