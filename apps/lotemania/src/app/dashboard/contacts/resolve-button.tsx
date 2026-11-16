"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveContact } from "@/lib/actions/misc";

export function ResolveButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => resolveContact(id))}
    >
      Marcar como resolvido
    </Button>
  );
}
