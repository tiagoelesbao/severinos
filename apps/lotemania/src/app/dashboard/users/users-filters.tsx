"use client";

// Arquivo perdido (0 bytes em 2026-10-24 20:10, um minuto antes de a página
// que o importa ser escrita íntegra). Diferente do raffle-extras, este não
// estava no bundle público — foi RECONSTRUÍDO, não recuperado. A fonte do
// contrato é a própria página: src/app/dashboard/users/page.tsx lê exatamente
// name, cpf, email, phone, code e role de searchParams. O formato segue o
// products-filters.tsx, que é o análogo íntegro desta casa.

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

const roleLabels: Record<string, string> = {
  all: "Perfil",
  admin: "Admin",
  operator: "Operador",
  affiliate: "Afiliado",
  subscriber: "Assinante",
};

export function UsersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/dashboard/users?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome"
          defaultValue={searchParams.get("name") ?? ""}
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("name", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <Input
        placeholder="CPF"
        defaultValue={searchParams.get("cpf") ?? ""}
        className="w-[150px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("cpf", (e.target as HTMLInputElement).value);
        }}
      />

      <Input
        placeholder="Email"
        defaultValue={searchParams.get("email") ?? ""}
        className="w-[180px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("email", (e.target as HTMLInputElement).value);
        }}
      />

      <Input
        placeholder="Telefone"
        defaultValue={searchParams.get("phone") ?? ""}
        className="w-[150px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("phone", (e.target as HTMLInputElement).value);
        }}
      />

      <Input
        placeholder="Código de afiliado"
        defaultValue={searchParams.get("code") ?? ""}
        className="w-[160px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("code", (e.target as HTMLInputElement).value);
        }}
      />

      <Select
        defaultValue={searchParams.get("role") ?? "all"}
        onValueChange={(v) => setParam("role", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Perfil">
            {(value: string) => roleLabels[value] ?? "Perfil"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Perfil</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="operator">Operador</SelectItem>
          <SelectItem value="affiliate">Afiliado</SelectItem>
          <SelectItem value="subscriber">Assinante</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        title="Limpar filtros"
        onClick={() => router.push("/dashboard/users")}
      >
        <Filter className="size-4" />
      </Button>
    </div>
  );
}
