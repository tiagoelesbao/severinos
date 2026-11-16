"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteUtmLink } from "@/lib/actions/site-config";

export function UtmLinkRow({
  id,
  name,
  clicks,
  fullUrl,
}: {
  id: string;
  name: string;
  clicks: number;
  fullUrl: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{fullUrl}</p>
        <p className="text-xs text-muted-foreground">{clicks} cliques</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            navigator.clipboard.writeText(fullUrl);
            toast.success("Link copiado!");
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteUtmLink(id);
              toast.success("Link removido.");
            })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
