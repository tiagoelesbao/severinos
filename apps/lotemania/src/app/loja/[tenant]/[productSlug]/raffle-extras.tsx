"use client";

// RECUPERADO do bundle de produção em 2026-11-16. Este arquivo existia e
// funcionava — o deploy em test-beige-seven-35.vercel.app ainda o executa —
// mas o fonte foi sobrescrito com 0 bytes em 2026-10-24 18:03, três horas e
// meia depois da página que o importa. Reconstruído a partir do módulo
// minificado em /_next/static/immutable/chunks/ e do HTML renderizado.
// Ver docs/research/2026-11-16-lotemania-build-health.md.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Link2,
  MessageCircle,
  Send,
  Share2,
  ShoppingCart,
  SquareMinus,
  SquarePlus,
  Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export function AvailabilityWarning({ available }: { available: number }) {
  if (available > 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-500/15 px-4 py-3 text-sm text-amber-500">
      Todos os títulos disponíveis já foram pagos ou reservados.
    </div>
  );
}

export function DescriptionPanel({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  if (!description) return null;
  return (
    <div className="px-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-t border-border py-4 text-sm font-medium"
      >
        {open ? <SquareMinus className="size-5" /> : <SquarePlus className="size-5" />}
        Descrição/Regulamento
      </button>
      {open && (
        <p className="whitespace-pre-line pb-4 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

const SUPPORT_BUTTON_CLASS =
  "flex items-center gap-2 rounded-[4px] bg-[#1b9b5b] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_40px_-4px_rgba(0,0,0,0.16)] hover:bg-[#1b9b5b]/90";

export function FloatingSupportButtons({
  whatsapp,
  whatsappGroup,
}: {
  whatsapp: string;
  whatsappGroup: string;
}) {
  if (!whatsapp && !whatsappGroup) return null;
  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-2">
      {whatsappGroup && (
        <a
          href={whatsappGroup}
          target="_blank"
          rel="noopener noreferrer"
          className={SUPPORT_BUTTON_CLASS}
        >
          <MessageCircle className="size-4" />
          Grupo
        </a>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={SUPPORT_BUTTON_CLASS}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      )}
    </div>
  );
}

export function MeusTitulosRow({ tenantSlug }: { tenantSlug: string }) {
  return (
    <Link
      href={`/loja/${tenantSlug}/meus-titulos`}
      className="flex items-center justify-center gap-2 border-b border-border bg-card py-3 text-sm font-medium hover:bg-muted/40"
    >
      <ShoppingCart className="size-4" />
      Meus títulos
    </Link>
  );
}

export function PrizesPanel({ prizes, title }: { prizes: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  if (prizes.length === 0) return null;
  return (
    <div className="px-5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[5px] bg-[#6c757d] py-2.5 text-sm font-medium text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)] hover:bg-[#6c757d]/90"
      >
        <Trophy className="size-4" />
        Prêmios
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-400" />
              Prêmios
            </DialogTitle>
            <DialogDescription>
              Esses são os prêmios no sorteio {title}
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col divide-y divide-dashed divide-border">
            {prizes.map((prize, index) => (
              <li key={index} className="flex items-center gap-3 py-3">
                <span
                  className={`text-xl font-bold ${index === 0 ? "text-primary" : "text-foreground"}`}
                >
                  {index + 1}°
                </span>
                <span className={index === 0 ? "font-medium text-primary" : ""}>
                  {prize}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ShareRow({ title }: { title: string }) {
  // A URL só existe depois da hidratação, então o HTML servido sai com os
  // links de compartilhamento vazios. É o comportamento atual em produção.
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      icon: Share2,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: "bg-[#3b5998] hover:bg-[#3b5998]/90",
    },
    {
      icon: Link2,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      bg: "bg-[#1da1f2] hover:bg-[#1da1f2]/90",
    },
    {
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      bg: "bg-[#1da1f2] hover:bg-[#1da1f2]/90",
    },
    {
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      bg: "bg-[#1b9b5b] hover:bg-[#1b9b5b]/90",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-4">
      {targets.map(({ icon: Icon, href, bg }, index) => (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex size-8 items-center justify-center rounded-[5px] text-white ${bg}`}
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  );
}

type InlineWinner = {
  winnerName: string;
  prizeAmount: string | null;
  winningNumber: number | null;
};

export function WinnersInline({ winners }: { winners: InlineWinner[] }) {
  if (winners.length === 0) return null;
  return (
    <div className="mx-5 flex flex-col gap-2 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">🎉 Ganhadores sortudos</p>
      {winners.map((winner, index) => (
        <div key={index} className="text-sm">
          <p className="font-medium">{winner.winnerName}</p>
          {winner.prizeAmount && (
            <p className="text-xs text-muted-foreground">
              Prêmio: {formatCurrency(Number(winner.prizeAmount))}
            </p>
          )}
          {winner.winningNumber !== null && (
            <p className="text-xs text-muted-foreground">
              Número da sorte: {String(winner.winningNumber).padStart(2, "0")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
