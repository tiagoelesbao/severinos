"use client";

// Arquivo perdido (0 bytes em 2026-10-24 20:37, no mesmo minuto em que
// page.tsx foi escrita íntegra). RECONSTRUÍDO, não recuperado — não estava
// no bundle público. Três fontes sobreviveram e definem tudo o que há aqui:
//
//   1. as props que src/app/dashboard/settings/page.tsx passa;
//   2. o siteConfigSchema, cujos próprios comentários agrupam os campos em
//      Geral / Chats & Suporte / Campanha / Experiência / Prêmios / Preços —
//      é daí que saem as abas, não de invenção;
//   3. updateSettings() e updateSiteConfig() em src/lib/actions/settings.ts.
//
// O SettingsForm (íntegro) cobre a aba Geral; as demais editam o siteConfig.

import { useTransition } from "react";
import { useForm, Controller, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  siteConfigSchema,
  type SiteConfig,
  type SiteConfigFormInput,
} from "@/lib/validations/site-config";
import { updateSiteConfig } from "@/lib/actions/settings";
import { SettingsForm } from "./settings-form";

type FieldName = keyof SiteConfigFormInput;

function TextRow({
  name,
  label,
  hint,
  register,
  type = "text",
}: {
  name: FieldName;
  label: string;
  hint?: string;
  register: UseFormRegister<SiteConfigFormInput>;
  type?: "text" | "number";
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} {...register(name)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AreaRow({
  name,
  label,
  hint,
  register,
}: {
  name: FieldName;
  label: string;
  hint?: string;
  register: UseFormRegister<SiteConfigFormInput>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} rows={3} {...register(name)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  name,
  label,
  hint,
  control,
}: {
  name: FieldName;
  label: string;
  hint?: string;
  control: Control<SiteConfigFormInput, unknown, SiteConfig>;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  );
}

function SelectRow({
  name,
  label,
  options,
  control,
}: {
  name: FieldName;
  label: string;
  options: { value: string; label: string }[];
  control: Control<SiteConfigFormInput, unknown, SiteConfig>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <select
            id={name}
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            value={String(field.value)}
            onChange={(e) => field.onChange(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      />
    </div>
  );
}

export function SettingsTabs({
  initialSiteName,
  initialLogoUrl,
  initialTwoFactor,
  initialCaptcha,
  initial,
}: {
  initialSiteName: string;
  initialLogoUrl: string;
  initialTwoFactor: boolean;
  initialCaptcha: boolean;
  initial: SiteConfig;
}) {
  const [isPending, startTransition] = useTransition();
  const { register, control, handleSubmit } = useForm<
    SiteConfigFormInput,
    unknown,
    SiteConfig
  >({
    resolver: zodResolver(siteConfigSchema),
    defaultValues: initial,
  });

  function onSubmit(data: SiteConfig) {
    startTransition(async () => {
      try {
        await updateSiteConfig(data);
        toast.success("Configurações salvas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <Tabs defaultValue="geral">
      <TabsList>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="suporte">Chats &amp; Suporte</TabsTrigger>
        <TabsTrigger value="campanha">Campanha</TabsTrigger>
        <TabsTrigger value="experiencia">Experiência</TabsTrigger>
        <TabsTrigger value="premios">Prêmios instantâneos</TabsTrigger>
        <TabsTrigger value="precos">Preços</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="pt-4">
        <SettingsForm
          initial={{
            siteName: initialSiteName,
            logoUrl: initialLogoUrl,
            twoFactorRequired: initialTwoFactor,
            captchaEnabled: initialCaptcha,
          }}
        />
      </TabsContent>

      <form onSubmit={handleSubmit(onSubmit)}>
        <TabsContent value="suporte" className="flex max-w-xl flex-col gap-4 pt-4">
          <TextRow name="supportPhone" label="Telefone de suporte" register={register} />
          <TextRow name="jivoChatId" label="JivoChat ID" register={register} />
          <TextRow name="blipChatId" label="Blip Chat ID" register={register} />
          <TextRow name="liveChatLicenseId" label="LiveChat License ID" register={register} />
        </TabsContent>

        <TabsContent value="campanha" className="flex max-w-xl flex-col gap-4 pt-4">
          <SelectRow
            name="loginMode"
            label="Entrar com"
            control={control}
            options={[
              { value: "phone", label: "Telefone" },
              { value: "email", label: "E-mail" },
            ]}
          />
          <SelectRow
            name="numberNomenclature"
            label="Como chamar um número"
            control={control}
            options={[
              { value: "titulos", label: "Títulos" },
              { value: "cotas", label: "Cotas" },
              { value: "numeros", label: "Números" },
              { value: "bilhetes", label: "Bilhetes" },
            ]}
          />
          <AreaRow
            name="purchaseCardText"
            label="Texto do cartão de compra"
            register={register}
          />
          <TextRow
            name="minPurchaseAge"
            label="Idade mínima para comprar"
            type="number"
            register={register}
          />
          <SwitchRow
            name="showMinAgeAlert"
            label="Exibir alerta de idade mínima"
            control={control}
          />
        </TabsContent>

        <TabsContent value="experiencia" className="flex max-w-xl flex-col gap-4 pt-4">
          <TextRow
            name="affiliateCookieHours"
            label="Duração do cookie de afiliado (horas)"
            type="number"
            register={register}
          />
          <SelectRow
            name="rankingSortMode"
            label="Ordenar ranking por"
            control={control}
            options={[
              { value: "quantity", label: "Quantidade" },
              { value: "revenue", label: "Faturamento" },
            ]}
          />
          <TextRow name="rouletteModel" label="Modelo da roleta" register={register} />
          <TextRow
            name="rankingCacheMinutes"
            label="Cache do ranking (minutos)"
            type="number"
            register={register}
          />
          <AreaRow
            name="numberLookupMessage"
            label="Mensagem da consulta de números"
            register={register}
          />
          <TextRow
            name="passwordSupportPhone"
            label="Telefone de suporte para senha"
            register={register}
          />
          <SwitchRow name="securityAlertEnabled" label="Alerta de segurança" control={control} />
          <SwitchRow
            name="showQrCodeByDefault"
            label="Mostrar QR Code por padrão"
            control={control}
          />
          <SwitchRow name="requireStateCity" label="Exigir estado e cidade" control={control} />
          <SwitchRow name="affiliatePublic" label="Página de afiliado pública" control={control} />
          <SwitchRow
            name="shareButtonsEnabled"
            label="Botões de compartilhamento"
            control={control}
          />
          <SwitchRow
            name="manualQuantityEdit"
            label="Permitir editar a quantidade manualmente"
            control={control}
          />
          <SwitchRow
            name="buyerPrivacy"
            label="Privacidade do comprador"
            hint="Oculta dados pessoais nas listagens públicas."
            control={control}
          />
          <SwitchRow name="autoImageCarousel" label="Carrossel automático" control={control} />
          <SwitchRow name="showPricesOnCards" label="Preço nos cartões" control={control} />
          <SwitchRow name="showAppButton" label="Botão do aplicativo" control={control} />
          <SwitchRow name="requirePassword" label="Exigir senha" control={control} />
          <SwitchRow
            name="manualNumberSelectionLoad"
            label="Carregar seleção manual de números"
            control={control}
          />
          <SwitchRow
            name="disableNumberLookup"
            label="Desativar consulta de números"
            control={control}
          />
          <SwitchRow
            name="highlightPrizedNumbers"
            label="Destacar títulos premiados"
            control={control}
          />
        </TabsContent>

        <TabsContent value="premios" className="flex max-w-xl flex-col gap-4 pt-4">
          <AreaRow
            name="winnerMessageTitulos"
            label="Mensagem do ganhador — títulos"
            hint="Variáveis disponíveis: {name}, {number}, {prize}."
            register={register}
          />
          <AreaRow
            name="winnerMessageCaixas"
            label="Mensagem do ganhador — caixas"
            register={register}
          />
          <AreaRow
            name="winnerMessageRoletas"
            label="Mensagem do ganhador — roletas"
            register={register}
          />
          <AreaRow
            name="winnerMessageRaspadinhas"
            label="Mensagem do ganhador — raspadinhas"
            register={register}
          />
          <AreaRow name="winnerTextBoxes" label="Texto de entrega do prêmio" register={register} />
        </TabsContent>

        <TabsContent value="precos" className="flex max-w-xl flex-col gap-4 pt-4">
          <SwitchRow
            name="showPromoPercentage"
            label="Exibir percentual de promoção"
            control={control}
          />
          <SwitchRow name="showComboPrices" label="Exibir preços de combo" control={control} />
          <SwitchRow name="showFees" label="Exibir taxas" control={control} />
        </TabsContent>

        <div className="pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Tabs>
  );
}
