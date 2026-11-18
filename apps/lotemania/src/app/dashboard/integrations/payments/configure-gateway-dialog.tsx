"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  credentialFieldsFor,
  gatewaySpecFor,
  MIN_WEBHOOK_SECRET_LENGTH,
  paymentGatewaySchema,
  type PaymentGatewayInput,
} from "@/lib/validations/payment-gateway";
import { webhookPath } from "@/lib/payments/webhook-url";
import { savePaymentGateway } from "@/lib/actions/payment-gateways";

// ════════════════════════════════════════════════════════════════════════
// O FORMULÁRIO É DO PROVEDOR, NÃO DA PLATAFORMA (AC-A3)
//
// Esta tela pedia dois campos fixos — "Chave de API" e "Segredo do Webhook"
// — para todos os 18 provedores. As duas suposições estavam erradas para o
// único provedor que importa:
//
//   • a Paysure usa DOIS valores (`ci` e `cs`). Um campo só salvaria metade
//     da credencial, e toda chamada à API voltaria 401;
//   • a Paysure NÃO ASSINA os avisos. O "Segredo do Webhook" pedido aqui não
//     tinha destinatário: não existe lugar na Paysure para informá-lo.
//
// Agora os campos vêm da descrição do provedor
// (`lib/validations/payment-gateway.ts`), que é a mesma fonte que o schema de
// validação e o adaptador leem. Três consumidores, uma descrição.
// ════════════════════════════════════════════════════════════════════════

/**
 * A URL do webhook — renderizada por UMA função, usada em DOIS lugares.
 *
 * ⚠️ Este componente é a correção de um defeito real, não enfeite. A versão
 * anterior exibia aqui `/api/webhooks/payment/{provider}` — SEM o tenant —
 * enquanto a página de gateways exibia a forma com o slug. Duas strings
 * escritas à mão, discordando entre si, e o operador que copiasse a desta
 * tela configurava um endereço que responde 404.
 *
 * O AC-B1 é o teste que EXTRAI a URL do render deste componente nos dois
 * lugares, exige que sejam iguais, e faz um POST nela.
 */
export function WebhookUrlHint({
  tenantSlug,
  provider,
  token,
}: {
  tenantSlug: string;
  provider: string;
  token: string | null;
}) {
  if (!token) {
    return (
      <p className="text-xs text-muted-foreground">
        A URL de recebimento aparece aqui depois de salvar as credenciais — ela
        inclui um token que é emitido junto com o gateway.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Avisos de pagamento deste provedor entram em{" "}
      <code data-webhook-url>{webhookPath(tenantSlug, provider, token)}</code>. O
      token no fim do endereço é o que autentica o aviso — trate a URL inteira
      como segredo.
    </p>
  );
}

function errorMessageAt(
  errors: Record<string, unknown>,
  path: readonly string[],
): string | null {
  let current: unknown = errors;
  for (const key of path) {
    if (current === null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  if (current !== null && typeof current === "object" && "message" in current) {
    const message = (current as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

/**
 * O corpo do formulário, exportado à parte do diálogo.
 *
 * Fica fora do `Dialog` por uma razão de verificabilidade: o `Dialog` do
 * `@base-ui` monta o conteúdo num portal, e portal não produz marcação em
 * render de servidor — o teste do AC-A3 ("renderiza exatamente os campos do
 * provedor") não teria o que ler. Renderizado à parte, é React de verdade,
 * com o `useForm` de verdade e a descrição de provedor de verdade.
 */
export function GatewayConfigForm({
  provider,
  tenantSlug,
  webhookToken,
  onSaved,
}: {
  provider: string;
  tenantSlug: string;
  webhookToken: string | null;
  onSaved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const spec = gatewaySpecFor(provider);
  const fields = credentialFieldsFor(provider);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentGatewayInput>({
    resolver: zodResolver(paymentGatewaySchema),
    defaultValues: {
      provider: provider as PaymentGatewayInput["provider"],
      credentials: {},
    },
  });

  function onSubmit(data: PaymentGatewayInput) {
    startTransition(async () => {
      try {
        await savePaymentGateway({
          ...data,
          provider: provider as PaymentGatewayInput["provider"],
        });
        toast.success(`${provider} configurado. Ative no interruptor da lista.`);
        reset();
        onSaved?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  const errorBag = errors as unknown as Record<string, unknown>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {fields.map((field) => {
        const message = errorMessageAt(errorBag, ["credentials", field.name]);
        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={`credentials.${field.name}`}>{field.label}</Label>
            <Input
              id={`credentials.${field.name}`}
              type={field.type}
              {...register(`credentials.${field.name}` as `credentials.${string}`)}
            />
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
            {message && <p className="text-sm text-destructive">{message}</p>}
          </div>
        );
      })}

      {/* Só para quem de fato assina. Pedir este campo a quem não assina é
          pedir um dado sem destinatário — foi o defeito que esta story
          corrige, não um detalhe de ergonomia. */}
      {spec.signsWebhooks ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="webhookSecret">Segredo do Webhook</Label>
          <Input id="webhookSecret" type="password" {...register("webhookSecret")} />
          {errorMessageAt(errorBag, ["webhookSecret"]) && (
            <p className="text-sm text-destructive">
              {errorMessageAt(errorBag, ["webhookSecret"])}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Mínimo {MIN_WEBHOOK_SECRET_LENGTH} caracteres. Usado para verificar a
            assinatura HMAC-SHA256 de cada aviso recebido.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground" data-no-signature-notice>
          Este provedor não assina os avisos de webhook, então não há segredo de
          assinatura a informar. A autenticidade vem do token na URL de
          recebimento.
        </p>
      )}

      <WebhookUrlHint
        tenantSlug={tenantSlug}
        provider={provider}
        token={webhookToken}
      />

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ConfigureGatewayDialog({
  provider,
  tenantSlug,
  webhookToken,
  open,
  onOpenChange,
  configured,
}: {
  provider: string;
  tenantSlug: string;
  webhookToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configured: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{provider}</DialogTitle>
          <DialogDescription>
            {configured
              ? "Atualize as credenciais deste provedor. Salvar não liga nem desliga o gateway."
              : "Informe as credenciais. O gateway nasce desativado — ligue no interruptor da lista."}
          </DialogDescription>
        </DialogHeader>
        <GatewayConfigForm
          provider={provider}
          tenantSlug={tenantSlug}
          webhookToken={webhookToken}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
