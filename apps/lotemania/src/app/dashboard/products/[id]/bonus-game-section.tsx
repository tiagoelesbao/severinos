"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bonusGameSchema,
  bonusGameComboSchema,
  bonusGameLabels,
  type BonusGameKind,
  type BonusGameInput,
  type BonusGameComboInput,
} from "@/lib/validations/bonus-game";
import {
  createBonusGame,
  toggleBonusGameActive,
  createBonusGameCombo,
} from "@/lib/actions/bonus-games";
import { formatCurrency } from "@/lib/format";

type Game = {
  id: string;
  title: string;
  isActive: boolean;
  items: string[];
  combos: { id: string; quantity: number; price: string }[];
};

export function BonusGameSection({
  kind,
  productId,
  games,
}: {
  kind: BonusGameKind;
  productId: string;
  games: Game[];
}) {
  const label = bonusGameLabels[kind];
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BonusGameInput>({ resolver: zodResolver(bonusGameSchema) });

  function onSubmit(data: BonusGameInput) {
    startTransition(async () => {
      await createBonusGame(kind, productId, data);
      toast.success(`${label.title} criada.`);
      reset();
      setOpen(false);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {label.icon} {label.title}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus />
            Adicionar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova {label.title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${kind}-title`}>Título</Label>
                <Input id={`${kind}-title`} {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${kind}-items`}>{label.itemsLabel}</Label>
                <Input
                  id={`${kind}-items`}
                  placeholder="Ex: Fone Bluetooth, R$50, Vale-compra"
                  {...register("items")}
                />
                {errors.items && (
                  <p className="text-sm text-destructive">{errors.items.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {games.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma configurada ainda.</p>
        )}
        {games.map((game) => (
          <GameRow key={game.id} kind={kind} productId={productId} game={game} />
        ))}
      </CardContent>
    </Card>
  );
}

function GameRow({
  kind,
  productId,
  game,
}: {
  kind: BonusGameKind;
  productId: string;
  game: Game;
}) {
  const [comboOpen, setComboOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BonusGameComboInput>({ resolver: zodResolver(bonusGameComboSchema) });

  function onComboSubmit(data: BonusGameComboInput) {
    startTransition(async () => {
      await createBonusGameCombo(kind, game.id, productId, data);
      toast.success("Combo adicionado.");
      reset();
      setComboOpen(false);
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{game.title}</p>
          <p className="text-xs text-muted-foreground">{game.items.join(", ")}</p>
        </div>
        <Switch
          checked={game.isActive}
          onCheckedChange={(checked) =>
            startTransition(() =>
              toggleBonusGameActive(kind, game.id, productId, checked),
            )
          }
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {game.combos.map((combo) => (
          <span
            key={combo.id}
            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {combo.quantity}x — {formatCurrency(Number(combo.price))}
          </span>
        ))}
        <Dialog open={comboOpen} onOpenChange={setComboOpen}>
          <DialogTrigger render={<Button variant="ghost" size="xs" />}>
            + combo
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo combo — {game.title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onComboSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Quantidade</Label>
                <Input type="number" {...register("quantity")} />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" {...register("price")} />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
