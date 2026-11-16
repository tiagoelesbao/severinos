"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AffiliatesFilters({
  products,
}: {
  products: { id: string; title: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["name", "cpf", "phone", "code"]) {
      const value = formData.get(key)?.toString();
      if (value) params.set(key, value);
    }
    const product = formData.get("product")?.toString();
    if (product && product !== "all") params.set("product", product);
    router.push(`/dashboard/affiliates?${params.toString()}`);
  }

  const productItems = Object.fromEntries([
    ["all", "Todos Sorteios"],
    ...products.map((p) => [p.id, p.title]),
  ]);

  return (
    <form action={submit} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <Input name="name" placeholder="Nome" defaultValue={searchParams.get("name") ?? ""} className="w-40" />
      <Input name="cpf" placeholder="CPF" defaultValue={searchParams.get("cpf") ?? ""} className="w-40" />
      <Input name="phone" placeholder="Telefone" defaultValue={searchParams.get("phone") ?? ""} className="w-40" />
      <Input name="code" placeholder="Afiliado" defaultValue={searchParams.get("code") ?? ""} className="w-40" />
      <Select name="product" items={productItems} defaultValue={searchParams.get("product") ?? "all"}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Sorteios</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
        <Search className="size-4" />
        Pesquisar
      </Button>
    </form>
  );
}
