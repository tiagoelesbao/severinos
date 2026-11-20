"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  Copy,
  Pencil,
  PieChart,
  Link2,
  ExternalLink,
  ShoppingCart,
  MoreVertical,
  Trash2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  toggleProductFavorite,
  duplicateProduct,
  deleteProduct,
} from "@/lib/actions/products";
import type { PrizePlace } from "@/lib/raffles/define-winners";
import { WinnersDialog } from "./winners-dialog";

export function ProductRowActions({
  productId,
  tenantSlug,
  productSlug,
  title,
  isFavorite,
  available,
  reserved,
  sold,
  total,
  prizePlaces,
  digits,
  drawDateIso,
}: {
  productId: string;
  tenantSlug: string;
  productSlug: string;
  title: string;
  isFavorite: boolean;
  available: number;
  reserved: number;
  sold: number;
  total: number;
  /** Os premios configurados — o ponto de partida do modal (LTM-27, AC3). */
  prizePlaces: readonly PrizePlace[];
  /** Quantos digitos tem o titulo deste sorteio (AC6 da LTM-27). */
  digits: number;
  /** A data do sorteio cadastrada, que o modal deixa corrigir (AC7). */
  drawDateIso: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statsOpen, setStatsOpen] = useState(false);
  const [winnersOpen, setWinnersOpen] = useState(false);
  const storeUrl = `/loja/${tenantSlug}/${productSlug}`;

  function copyLink() {
    const full = `${window.location.origin}${storeUrl}`;
    navigator.clipboard.writeText(full);
    toast.success("Link copiado!");
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        title="Favoritar"
        onClick={() =>
          startTransition(async () => {
            await toggleProductFavorite(productId);
          })
        }
      >
        <Star className={`size-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        title="Duplicar"
        onClick={() =>
          startTransition(async () => {
            const newId = await duplicateProduct(productId);
            if (newId) {
              toast.success("Sorteio duplicado.");
              router.push(`/dashboard/products/${newId}`);
            }
          })
        }
      >
        <Copy className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        title="Editar"
        render={<Link href={`/dashboard/products/${productId}`} />}
        nativeButton={false}
      >
        <Pencil className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        title="Estatísticas"
        onClick={() => setStatsOpen(true)}
      >
        <PieChart className="size-4" />
      </Button>
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Progress value={Math.round((sold / Math.max(1, total)) * 100)} />
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-lg font-semibold">{available}</p>
              <p className="text-muted-foreground">Disponíveis</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-500">{reserved}</p>
              <p className="text-muted-foreground">Reservados</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-500">{sold}</p>
              <p className="text-muted-foreground">Pagos</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" size="icon-sm" title="Copiar link" onClick={copyLink}>
        <Link2 className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        title="Abrir na loja"
        render={<a href={storeUrl} target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        <ExternalLink className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        title="Lista de Compras"
        render={<Link href={`/dashboard/products/${productId}/orders`} />}
        nativeButton={false}
        className="text-emerald-500"
      >
        <ShoppingCart className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/*
            `Definir ganhadores` e a ENTRADA desta funcionalidade, e ate a
            LTM-27 este menu tinha UM item, e era `Excluir`. O sorteio podia
            nascer, vender, receber pagamento e encerrar — e nao existia como
            dizer quem ganhou.
          */}
          <DropdownMenuItem onClick={() => setWinnersOpen(true)}>
            <Trophy />
            Definir ganhadores
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                await deleteProduct(productId);
                toast.success("Sorteio excluído.");
              })
            }
          >
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WinnersDialog
        open={winnersOpen}
        onOpenChange={setWinnersOpen}
        title={title}
        productId={productId}
        prizePlaces={prizePlaces}
        digits={digits}
        drawDateIso={drawDateIso}
      />
    </div>
  );
}
