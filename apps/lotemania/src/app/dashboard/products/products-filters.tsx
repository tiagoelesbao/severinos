"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["Dinheiro", "Eletrônicos", "Veículos", "Outros"];

const statusLabels: Record<string, string> = {
  all: "Status",
  draft: "Rascunho",
  active: "Ativo",
  finished: "Finalizado",
  canceled: "Cancelado",
};

const privacyLabels: Record<string, string> = {
  all: "Privacidade",
  public: "Pública",
  private: "Privada",
};

export function ProductsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/dashboard/products?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título"
          defaultValue={searchParams.get("q") ?? ""}
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status">
            {(value: string) => statusLabels[value] ?? "Status"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Status</SelectItem>
          <SelectItem value="draft">Rascunho</SelectItem>
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="finished">Finalizado</SelectItem>
          <SelectItem value="canceled">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("privacy") ?? "all"}
        onValueChange={(v) => setParam("privacy", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Privacidade">
            {(value: string) => privacyLabels[value] ?? "Privacidade"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Privacidade</SelectItem>
          <SelectItem value="public">Pública</SelectItem>
          <SelectItem value="private">Privada</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        defaultValue={searchParams.get("date") ?? ""}
        onChange={(e) => setParam("date", e.target.value)}
        className="w-[160px]"
      />

      <Select
        defaultValue={searchParams.get("category") ?? "all"}
        onValueChange={(v) => setParam("category", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Categoria">
            {(value: string) => (value === "all" ? "Categoria" : value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Categoria</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        title="Limpar filtros"
        onClick={() => router.push("/dashboard/products")}
      >
        <Filter className="size-4" />
      </Button>
    </div>
  );
}
