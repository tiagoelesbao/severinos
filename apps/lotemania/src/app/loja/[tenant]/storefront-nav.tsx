"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Megaphone,
  Bell,
  Ticket,
  UserPlus,
  Trophy,
  Award,
  FileText,
  Mail,
  LogIn,
  Menu,
  X,
  Crown,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const items = [
  { href: "", label: "Início", icon: Home },
  { href: "", label: "Campanhas", icon: Megaphone },
  { href: "comunicados", label: "Comunicados", icon: Bell },
  { href: "meus-titulos", label: "Meus títulos", icon: Ticket },
  { href: "cadastrar", label: "Cadastro", icon: UserPlus },
  { href: "ganhadores", label: "Ganhadores", icon: Trophy },
  { href: "afiliados", label: "Afiliados", icon: Award },
  { href: "termos", label: "Termos de uso", icon: FileText },
  { href: "suporte", label: "Suporte", icon: Mail },
];

export function StorefrontNav({
  tenantSlug,
  siteName,
  logoUrl,
}: {
  tenantSlug: string;
  siteName: string;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-full border-none bg-black p-0 !max-w-full"
      >
        <div className="flex items-center gap-2 px-6 py-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="size-7 object-contain" />
          ) : (
            <Crown className="size-6 fill-amber-400 text-amber-400" />
          )}
          <span className="text-lg font-bold uppercase tracking-wide text-white">
            {siteName}
          </span>
          <div className="flex-1" />
          <SheetClose render={<Button variant="ghost" size="icon" className="text-white" />}>
            <X />
          </SheetClose>
        </div>
        <nav className="flex flex-col">
          {items.map((item, i) => {
            const href = `/loja/${tenantSlug}${item.href ? `/${item.href}` : ""}`;
            const isActive = i === 0 ? pathname === href : pathname === href && false;
            return (
              <Link
                key={`${item.label}-${i}`}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 border-b border-white/10 px-6 py-4 text-sm font-medium ${
                  isActive
                    ? "bg-emerald-950/50 text-emerald-400"
                    : "text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4">
          <Button
            render={<Link href={`/loja/${tenantSlug}/entrar`} />}
            nativeButton={false}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <LogIn />
            Entrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
