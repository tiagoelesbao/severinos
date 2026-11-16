"use client";

// Arquivo perdido (0 bytes). RECONSTRUÍDO, não recuperado — este não estava
// no bundle público. O contrato vem de dois lugares que sobreviveram: as
// props que src/app/dashboard/contacts/page.tsx passa, e a server action
// resolveContact() em src/lib/actions/misc.ts, que marca o contato como
// "resolved" e revalida esta rota. Nada aqui foi inventado.

import { useTransition } from "react";
import { Mail, Phone, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveContact } from "@/lib/actions/misc";

const categoryLabels: Record<string, string> = {
  outro: "Outro",
  vendas: "Vendas",
  suporte: "Suporte",
  reclamacao: "Reclamação",
};

export function ContactCard({
  id,
  name,
  email,
  phone,
  message,
  category,
  status,
  createdAt,
}: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  category: string;
  status: string;
  createdAt: string;
}) {
  const [pending, startTransition] = useTransition();
  const resolved = status === "resolved";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          <Badge variant="outline">{categoryLabels[category] ?? category}</Badge>
          <Badge variant={resolved ? "secondary" : "default"}>
            {resolved ? "Resolvido" : "Aberto"}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{createdAt}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Mail className="size-4" />
            {email}
          </a>
        )}
        {phone && (
          <a
            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <Phone className="size-4" />
            {phone}
          </a>
        )}
      </div>

      {message && <p className="whitespace-pre-line text-sm">{message}</p>}

      {!resolved && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => resolveContact(id))}
          >
            <Check className="size-4" />
            Marcar como lido
          </Button>
        </div>
      )}
    </div>
  );
}
