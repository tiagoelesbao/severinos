"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserStatus } from "@/lib/actions/misc";

export function UserStatusSelect({
  id,
  status,
}: {
  id: string;
  status: "active" | "inactive" | "blocked";
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      items={{ active: "Ativo", inactive: "Inativo", blocked: "Bloqueado" }}
      defaultValue={status}
      disabled={isPending}
      onValueChange={(v) =>
        startTransition(() =>
          setUserStatus(id, v as "active" | "inactive" | "blocked"),
        )
      }
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Ativo</SelectItem>
        <SelectItem value="inactive">Inativo</SelectItem>
        <SelectItem value="blocked">Bloqueado</SelectItem>
      </SelectContent>
    </Select>
  );
}
