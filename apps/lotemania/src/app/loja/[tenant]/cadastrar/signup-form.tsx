"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { signupSchema, type SignupInput } from "@/lib/validations/signup";
import { signupCustomer } from "@/lib/actions/signup";
import { BR_STATES } from "@/lib/br-states";

const UF_ITEMS = Object.fromEntries(BR_STATES.map((uf) => [uf, uf]));

export function SignupForm({ tenantSlug }: { tenantSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue("street", data.logradouro ?? "");
        setValue("neighborhood", data.bairro ?? "");
        setValue("city", data.localidade ?? "");
        setValue("state", data.uf ?? "");
      }
    } catch {
      // CEP lookup is a convenience — the fields stay editable either way.
    }
  }

  function onSubmit(data: SignupInput) {
    startTransition(async () => {
      const result = await signupCustomer(tenantSlug, data);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDone(true);
      toast.success("Cadastro concluído!");
    });
  }

  if (done) {
    return (
      <p className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
        Cadastro concluído! Você já pode entrar com seu email e senha.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Nome Completo" required>
        <FieldInput {...register("name")} />
      </FormField>
      {errors.name && <p className="-mt-2 text-sm text-destructive">{errors.name.message}</p>}

      <FormField label="Informe seu CPF" required>
        <FieldInput placeholder="000.000.000-00" {...register("cpf")} />
      </FormField>
      {errors.cpf && <p className="-mt-2 text-sm text-destructive">{errors.cpf.message}</p>}

      <FormField label="Nome Social (opcional)">
        <FieldInput {...register("socialName")} />
      </FormField>

      <FormField label="Telefone" required>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🇧🇷</span>
          <FieldInput placeholder="Telefone" {...register("phone")} />
        </div>
      </FormField>
      {errors.phone && <p className="-mt-2 text-sm text-destructive">{errors.phone.message}</p>}

      <FormField label="Confirme o Telefone" required>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🇧🇷</span>
          <FieldInput placeholder="Telefone" {...register("phoneConfirm")} />
        </div>
      </FormField>
      {errors.phoneConfirm && (
        <p className="-mt-2 text-sm text-destructive">{errors.phoneConfirm.message}</p>
      )}

      <FormField label="E-mail" required>
        <FieldInput type="email" {...register("email")} />
      </FormField>
      {errors.email && <p className="-mt-2 text-sm text-destructive">{errors.email.message}</p>}

      <FormField label="Data de Nascimento" required>
        <FieldInput type="date" {...register("birthDate")} />
      </FormField>
      {errors.birthDate && (
        <p className="-mt-2 text-sm text-destructive">{errors.birthDate.message}</p>
      )}

      <FormField label="CEP" required>
        <FieldInput
          placeholder="00000-000"
          {...register("zipCode", { onBlur: (e) => lookupCep(e.target.value) })}
        />
      </FormField>
      {errors.zipCode && <p className="-mt-2 text-sm text-destructive">{errors.zipCode.message}</p>}

      <FormField label="Logradouro" required>
        <FieldInput placeholder="Rua, Avenida, Travessa..." {...register("street")} />
      </FormField>
      {errors.street && <p className="-mt-2 text-sm text-destructive">{errors.street.message}</p>}

      <FormField label="Número" required>
        <FieldInput placeholder="Número" {...register("addressNumber")} />
      </FormField>
      {errors.addressNumber && (
        <p className="-mt-2 text-sm text-destructive">{errors.addressNumber.message}</p>
      )}

      <FormField label="Bairro" required>
        <FieldInput placeholder="Bairro" {...register("neighborhood")} />
      </FormField>
      {errors.neighborhood && (
        <p className="-mt-2 text-sm text-destructive">{errors.neighborhood.message}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="UF" required>
          <Select items={UF_ITEMS} onValueChange={(v) => setValue("state", v)}>
            <SelectTrigger className="h-7 w-full border-none px-0">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {BR_STATES.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Cidade" required>
          <FieldInput {...register("city")} />
        </FormField>
      </div>

      <FormField label="Complemento (opcional)">
        <FieldInput placeholder="Apto, Bloco, Casa..." {...register("complement")} />
      </FormField>

      <FormField label="Senha" required>
        <FieldInput type="password" {...register("password")} />
      </FormField>
      {errors.password && (
        <p className="-mt-2 text-sm text-destructive">{errors.password.message}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-2 bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isPending ? "Enviando..." : "Concluir Cadastro"}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
