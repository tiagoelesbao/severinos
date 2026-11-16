"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FieldInput } from "@/components/ui/form-field";
import { sendContactMessage } from "@/lib/actions/contact";

const CATEGORY_ITEMS = {
  outro: "Outro",
  vendas: "Vendas",
  suporte: "Suporte",
  reclamacao: "Reclamação",
};

export function SupportForm({ tenantSlug }: { tenantSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await sendContactMessage(tenantSlug, {
        name,
        email,
        phone,
        category: (category || "outro") as "outro" | "vendas" | "suporte" | "reclamacao",
        message,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Mensagem enviada! Responderemos em breve.");
      setName("");
      setEmail("");
      setPhone("");
      setCategory("");
      setMessage("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nome" required>
        <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="E-mail">
        <FieldInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Telefone" required>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🇧🇷</span>
          <FieldInput
            placeholder="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </FormField>
      <Select items={CATEGORY_ITEMS} value={category} onValueChange={setCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um assunto" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CATEGORY_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <textarea
        placeholder="Digite sua mensagem aqui.*"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        className="min-h-28 w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
      <Button
        onClick={submit}
        disabled={isPending || !name || !phone || !message}
        className="bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isPending ? "Enviando..." : "Enviar"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
