"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TransactionsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("txid") ?? "");

  function submit() {
    const params = new URLSearchParams();
    if (value) params.set("txid", value);
    router.push(`/dashboard/transactions?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
      <div className="flex flex-1 items-center gap-2 rounded-md border border-input px-2.5">
        <Hash className="size-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Separe por vírgula"
          className="border-none px-0"
        />
      </div>
      <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-500">
        Pesquisar
      </Button>
    </div>
  );
}
