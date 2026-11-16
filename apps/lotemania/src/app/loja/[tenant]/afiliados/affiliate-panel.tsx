"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FieldInput } from "@/components/ui/form-field";
import { formatCurrency } from "@/lib/format";
import { getAffiliateByPhone, signupAffiliate } from "@/lib/actions/affiliate-signup";

type Affiliate = {
  code: string | null;
  commissionRate: string;
  totalSales: string;
  totalCommission: string;
  isActive: boolean;
};

export function AffiliatePanel({ tenantSlug }: { tenantSlug: string }) {
  const [phone, setPhone] = useState("");
  const [loggedPhone, setLoggedPhone] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<Affiliate | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function login() {
    if (!phone) return;
    startTransition(async () => {
      const result = await getAffiliateByPhone(tenantSlug, phone);
      setLoggedPhone(phone);
      setAffiliate(result.affiliate ?? null);
    });
  }

  function becomeAffiliate() {
    startTransition(async () => {
      const result = await signupAffiliate(tenantSlug, { name, email, phone: loggedPhone! });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Cadastro de afiliado enviado!");
      const refreshed = await getAffiliateByPhone(tenantSlug, loggedPhone!);
      setAffiliate(refreshed.affiliate ?? null);
    });
  }

  if (!loggedPhone) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-md bg-amber-500/15 px-4 py-3 text-sm text-amber-500">
          <AlertTriangle className="size-4 shrink-0" />
          Faça o login para continuar
        </div>
        <div className="flex flex-col gap-4 rounded-xl bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="size-5" /> Login
          </h2>
          <FormField label="Informe seu telefone" required>
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🇧🇷</span>
              <FieldInput
                placeholder="99 90000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </FormField>
          {!phone && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/15 px-4 py-3 text-sm text-amber-500">
              <AlertTriangle className="size-4 shrink-0" />
              Informe seu telefone para continuar
            </div>
          )}
          <Button
            onClick={login}
            disabled={isPending || !phone}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {isPending ? "Entrando..." : "Continuar"}
          </Button>
        </div>
      </div>
    );
  }

  if (affiliate === undefined) return null;

  if (affiliate === null) {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Esse telefone ainda não é afiliado. Preencha os dados abaixo para se tornar um.
        </p>
        <FormField label="Nome" required>
          <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Email" required>
          <FieldInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <Button
          onClick={becomeAffiliate}
          disabled={isPending || !name || !email}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {isPending ? "Enviando..." : "Quero ser afiliado"}
        </Button>
      </div>
    );
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/loja/${tenantSlug}?ref=${affiliate.code}` : "";

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Comissão</p>
          <p className="text-lg font-semibold">{Number(affiliate.commissionRate)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="text-lg font-semibold">{formatCurrency(Number(affiliate.totalSales))}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Comissão acumulada</p>
          <p className="text-lg font-semibold">{formatCurrency(Number(affiliate.totalCommission))}</p>
        </div>
      </div>
      <FormField label="Seu link de divulgação">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm">{link}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link copiado!");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="size-4" />
          </button>
        </div>
      </FormField>
    </div>
  );
}
