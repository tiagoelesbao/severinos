"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productSchema,
  type ProductFormInput,
  type ProductInput,
} from "@/lib/validations/product";
import { createProduct } from "@/lib/actions/products";

export default function NewProductPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: { privacy: "public" },
  });

  function onSubmit(data: ProductInput) {
    startTransition(async () => {
      try {
        await createProduct(data);
      } catch (err) {
        if (err instanceof Error && err.message !== "NEXT_REDIRECT") {
          toast.error(err.message);
        }
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Novo Sorteio
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do sorteio</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pricePerNumber">Preço por número (R$)</Label>
                <Input
                  id="pricePerNumber"
                  type="number"
                  step="0.01"
                  {...register("pricePerNumber")}
                />
                {errors.pricePerNumber && (
                  <p className="text-sm text-destructive">
                    {errors.pricePerNumber.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="totalNumbers">Total de números</Label>
                <Input
                  id="totalNumbers"
                  type="number"
                  {...register("totalNumbers")}
                />
                {errors.totalNumbers && (
                  <p className="text-sm text-destructive">
                    {errors.totalNumbers.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" {...register("category")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Privacidade</Label>
                <Select
                  items={{ public: "Público", private: "Privado" }}
                  defaultValue="public"
                  onValueChange={(v) =>
                    setValue("privacy", v as "public" | "private")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="drawDate">Data do sorteio</Label>
              <Input
                id="drawDate"
                type="datetime-local"
                {...register("drawDate")}
              />
            </div>

            <Button type="submit" disabled={isPending} className="mt-2 self-start">
              {isPending ? "Criando..." : "Criar sorteio"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
