"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Settings2,
  Ticket,
  ImageIcon,
  Trophy,
  UserPlus,
  Gift,
  CreditCard,
  Tag,
  Bell,
  TrendingUp,
  ShieldAlert,
  Headphones,
  Landmark,
  ShieldX,
  Plus,
  X,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FieldHint, FieldInput } from "@/components/ui/form-field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  productAdvancedSettingsSchema,
  type ProductAdvancedSettings,
} from "@/lib/validations/product-settings";
import { updateProductSettings } from "@/lib/actions/product-settings";
import { updateProduct } from "@/lib/actions/products";
import { slugify } from "@/lib/slugify";
import { ProductEditTabsBar, type EditTab } from "./product-edit-tabs-bar";
import { BonusGameSection, type Game } from "./bonus-game-section";

const DDD_OPTIONS = ["11", "21", "31", "41", "51", "61", "71", "81", "85", "91"];

const PRIVACY_ITEMS = { public: "Público", private: "Privado" };
const RESERVATION_MODEL_ITEMS = {
  manual: "Escolhe os bilhetes manualmente",
  random: "Números Aleatórios",
};
const DRAW_MECHANISM_ITEMS = { manual: "Sorteio manual", lottery: "Baseado em Loteria Federal" };
const DESCRIPTION_MODE_ITEMS = { collapsed: "Colapsado/Retraído", expanded: "Expandido" };
const SALES_START_ITEMS = { immediate: "Imediatamente", scheduled: "Agendado" };
const WIDGET_TYPE_ITEMS = { icon_text: "Ícone e texto", icon_only: "Apenas ícone" };

const TABS: EditTab[] = [
  { value: "geral", label: "Geral", icon: Settings2 },
  { value: "titulos", label: "Títulos", icon: Ticket },
  { value: "imagens", label: "Imagens", icon: ImageIcon },
  { value: "premios", label: "Prêmios", icon: Trophy },
  { value: "afiliados", label: "Afiliados", icon: UserPlus },
  { value: "titulos-premiados", label: "Títulos Premiados", icon: Gift },
  { value: "pagamento", label: "Pagamento", icon: CreditCard },
  { value: "promocoes", label: "Promoções", icon: Tag },
  { value: "alertas", label: "Alertas", icon: Bell },
  { value: "upsell", label: "Upsell", icon: TrendingUp },
  { value: "anti-spam", label: "Anti Spam", icon: ShieldAlert },
  { value: "suporte", label: "Suporte", icon: Headphones },
  { value: "capitalizadora", label: "Capitalizadora", icon: Landmark },
  { value: "restricoes", label: "Restrições", icon: ShieldX },
];

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

export function AdvancedSettingsTabs({
  productId,
  title: initialTitle,
  slug: initialSlug,
  description: initialDescription,
  privacy: initialPrivacy,
  pricePerNumber: initialPrice,
  totalNumbers,
  drawDate: initialDrawDate,
  imageUrl: initialImageUrl,
  category: initialCategory,
  initial,
  awardedBoxGames,
  rewardSpinGames,
  scratchCardGames,
}: {
  productId: string;
  title: string;
  slug: string;
  description: string;
  privacy: "public" | "private";
  pricePerNumber: number;
  totalNumbers: number;
  drawDate: Date | null;
  imageUrl: string | null;
  category: string | null;
  initial: ProductAdvancedSettings;
  awardedBoxGames: Game[];
  rewardSpinGames: Game[];
  scratchCardGames: Game[];
}) {
  const [activeTab, setActiveTab] = useState("geral");
  const [isPending, startTransition] = useTransition();
  const [s, setS] = useState<ProductAdvancedSettings>(initial);

  // Core product-table fields (not part of advancedSettings jsonb).
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [price, setPrice] = useState(initialPrice);
  const [drawDate, setDrawDate] = useState(
    initialDrawDate ? new Date(initialDrawDate).toISOString().slice(0, 16) : "",
  );
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");

  function set<K extends keyof ProductAdvancedSettings>(key: K, value: ProductAdvancedSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function saveSettings(extraToast?: string) {
    startTransition(async () => {
      const parsed = productAdvancedSettingsSchema.parse(s);
      await updateProductSettings(productId, parsed);
      toast.success(extraToast ?? "Configurações salvas.");
    });
  }

  function saveGeral() {
    startTransition(async () => {
      await updateProduct(productId, {
        title,
        slug,
        description,
        privacy,
        category,
        pricePerNumber: price,
        drawDate: drawDate || undefined,
      });
      const parsed = productAdvancedSettingsSchema.parse(s);
      await updateProductSettings(productId, parsed);
      toast.success("Configurações salvas.");
    });
  }

  function saveTitulos() {
    startTransition(async () => {
      await updateProduct(productId, { pricePerNumber: price });
      const parsed = productAdvancedSettingsSchema.parse(s);
      await updateProductSettings(productId, parsed);
      toast.success("Configurações salvas.");
    });
  }

  function saveImagens() {
    startTransition(async () => {
      await updateProduct(productId, { imageUrl });
      const parsed = productAdvancedSettingsSchema.parse(s);
      await updateProductSettings(productId, parsed);
      toast.success("Configurações salvas.");
    });
  }

  function updatePrize(i: number, value: string) {
    const next = [...s.prizes];
    next[i] = value;
    set("prizes", next);
  }
  function addPrize() {
    if (s.prizes.length >= 10) return;
    set("prizes", [...s.prizes, ""]);
  }
  function removePrize(i: number) {
    set("prizes", s.prizes.filter((_, idx) => idx !== i));
  }

  function toggleDdd(ddd: string) {
    const has = s.restrictedDdds.includes(ddd);
    set("restrictedDdds", has ? s.restrictedDdds.filter((d) => d !== ddd) : [...s.restrictedDdds, ddd]);
  }

  const instantPrizesBlocked = s.reservationModel === "manual";
  const upsellBlocked = s.reservationModel === "manual";

  return (
    <div className="rounded-lg border border-border">
      <div className="px-4">
        <ProductEditTabsBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="p-4">
        {activeTab === "geral" && (
          <div className="flex flex-col gap-4">
            <FormField label="Título" required>
              <FieldInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
            <FormField label="URL Amigável" required>
              <FieldInput value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </FormField>
            <FieldHint>Essa é a url que corresponderá ao sorteio</FieldHint>
            <FormField label="Breve Descrição" required>
              <FieldInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            <FormField label="Privacidade">
              <Select
                items={PRIVACY_ITEMS}
                value={privacy}
                onValueChange={(v) => setPrivacy(v as "public" | "private")}
              >
                <SelectTrigger className="h-7 w-full border-none px-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <SwitchRow
              label="Mostrar o sorteio na página inicial"
              checked={s.showOnHomepage}
              onChange={(v) => set("showOnHomepage", v)}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Categoria">
                <FieldInput value={category} onChange={(e) => setCategory(e.target.value)} />
              </FormField>
              <FormField label="Modelo de Reserva">
                <Select
                  items={RESERVATION_MODEL_ITEMS}
                  value={s.reservationModel}
                  onValueChange={(v) => set("reservationModel", v as "manual" | "random")}
                >
                  <SelectTrigger className="h-7 w-full border-none px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Escolhe os bilhetes manualmente</SelectItem>
                    <SelectItem value="random">Números Aleatórios</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Modalidade">
                <Select
                  items={DRAW_MECHANISM_ITEMS}
                  value={s.drawMechanism}
                  onValueChange={(v) => set("drawMechanism", v as "manual" | "lottery")}
                >
                  <SelectTrigger className="h-7 w-full border-none px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Sorteio manual</SelectItem>
                    <SelectItem value="lottery">Baseado em Loteria Federal</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Modo de Descrição">
              <Select
                items={DESCRIPTION_MODE_ITEMS}
                value={s.descriptionMode}
                onValueChange={(v) => set("descriptionMode", v as "collapsed" | "expanded")}
              >
                <SelectTrigger className="h-7 w-full border-none px-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collapsed">Colapsado/Retraído</SelectItem>
                  <SelectItem value="expanded">Expandido</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Texto</p>
              <RichTextEditor value={s.fullDescription} onChange={(html) => set("fullDescription", html)} />
            </div>

            <FormField label="Texto do status" required>
              <FieldInput value={s.statusText} onChange={(e) => set("statusText", e.target.value)} />
            </FormField>

            <FormField label="Início das vendas">
              <Select
                items={SALES_START_ITEMS}
                value={s.salesStartMode}
                onValueChange={(v) => set("salesStartMode", v as "immediate" | "scheduled")}
              >
                <SelectTrigger className="h-7 w-full border-none px-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediatamente</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Data do Sorteio">
              <FieldInput
                type="datetime-local"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
              />
            </FormField>

            <SwitchRow
              label="Encerrar automático na data do sorteio"
              checked={s.autoFinishOnDrawDate}
              onChange={(v) => set("autoFinishOnDrawDate", v)}
            />
            <SwitchRow
              label="Mostrar a data do sorteio para os participantes"
              checked={s.showDrawDateToParticipants}
              onChange={(v) => set("showDrawDateToParticipants", v)}
            />
            <SwitchRow
              label="Permite download do comprovante"
              checked={s.allowReceiptDownload}
              onChange={(v) => set("allowReceiptDownload", v)}
            />
            <SwitchRow
              label="Mostrar o nome do participante em números pagos"
              checked={s.showPaidParticipantNames}
              onChange={(v) => set("showPaidParticipantNames", v)}
            />
            <SwitchRow
              label="Mostrar seleção de números aleatórios para os participantes"
              checked={s.showRandomSelectionOption}
              onChange={(v) => set("showRandomSelectionOption", v)}
            />

            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Campos requeridos para realizar a reserva</p>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["name", "Nome"],
                    ["phone", "Telefone"],
                    ["cpf", "CPF"],
                    ["email", "E-mail"],
                    ["socialName", "Nome Social"],
                    ["birthDate", "Data de Nascimento"],
                  ] as const
                ).map(([field, label]) => (
                  <SwitchRow
                    key={field}
                    label={label}
                    checked={s.requiredFields.includes(field)}
                    onChange={() =>
                      set(
                        "requiredFields",
                        s.requiredFields.includes(field)
                          ? s.requiredFields.filter((f) => f !== field)
                          : [...s.requiredFields, field],
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <Button onClick={saveGeral} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "titulos" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Preço da cota">
                <FieldInput
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </FormField>
              <FormField label="Quantidade de cotas">
                <FieldInput value={totalNumbers} disabled className="opacity-70" />
              </FormField>
              <FormField label="Tempo para uma reserva pendente expirar">
                <Select
                  items={{ "10": "10 Minutos", "15": "15 Minutos", "30": "30 Minutos", "60": "60 Minutos", "120": "120 Minutos" }}
                  value={String(s.reservationExpiryMinutes)}
                  onValueChange={(v) => set("reservationExpiryMinutes", Number(v))}
                >
                  <SelectTrigger className="h-7 w-full border-none px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 30, 60, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} Minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex gap-6">
              <SwitchRow
                label="Campanha gratuita"
                checked={s.freeCampaign}
                onChange={(v) => set("freeCampaign", v)}
              />
              <SwitchRow label="Adicionar taxa" checked={s.hasFee} onChange={(v) => set("hasFee", v)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FormField label="Quantidade por Comprador">
                  <FieldInput
                    type="number"
                    value={s.maxPerBuyer}
                    onChange={(e) => set("maxPerBuyer", Number(e.target.value))}
                  />
                </FormField>
                <FieldHint>Coloque 0 para não ter limites de compras</FieldHint>
              </div>
              <div>
                <FormField label="Quantidade de cotas por comprador">
                  <FieldInput
                    type="number"
                    value={s.maxQuantityPerBuyer}
                    onChange={(e) => set("maxQuantityPerBuyer", Number(e.target.value))}
                  />
                </FormField>
                <FieldHint>Coloque 0 para não ter limites de cotas por comprador</FieldHint>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Quantidade mínima por reserva" required>
                <FieldInput
                  type="number"
                  value={s.minPerReservation}
                  onChange={(e) => set("minPerReservation", Number(e.target.value))}
                />
              </FormField>
              <FormField label="Quantidade máxima por reserva" required>
                <FieldInput
                  type="number"
                  value={s.maxPerReservation}
                  onChange={(e) => set("maxPerReservation", Number(e.target.value))}
                />
              </FormField>
              <FormField label="Quantidade inicial por reserva">
                <FieldInput
                  type="number"
                  value={s.initialPerReservation}
                  onChange={(e) => set("initialPerReservation", Number(e.target.value))}
                />
              </FormField>
            </div>

            <SwitchRow
              label="Mostrar barra de progresso das vendas"
              checked={s.showSalesProgressBar}
              onChange={(v) => set("showSalesProgressBar", v)}
            />
            <SwitchRow
              label="Mostrar Ranking Diário de Maiores Compradores"
              checked={s.showDailyRanking}
              onChange={(v) => set("showDailyRanking", v)}
            />
            <SwitchRow
              label="Mostrar Ranking Geral de Maiores Compradores"
              checked={s.showGeneralRanking}
              onChange={(v) => set("showGeneralRanking", v)}
            />

            <Button onClick={saveTitulos} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "imagens" && (
          <div className="flex flex-col gap-4">
            <FormField label="URL da imagem/banner">
              <FieldInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </FormField>
            {imageUrl && (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Pré-visualização" className="h-32 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">* Imagens permitidas: jpg, jpeg, png</p>
            <SwitchRow label="Ativar vídeo" checked={s.videoEnabled} onChange={(v) => set("videoEnabled", v)} />
            <Button onClick={saveImagens} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "premios" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-400">
              Informe quais os prêmios os participantes estarão concorrendo. Você pode informar até 10 prêmios.
            </div>
            <SwitchRow
              label="Disponibilizar E-book"
              checked={s.ebookEnabled}
              onChange={(v) => set("ebookEnabled", v)}
            />

            <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-400">
              O e-book será liberado para download quando a compra for concluída.
            </div>

            <FormField label="Título (card do grupo)">
              <FieldInput
                value={s.groupCta.title}
                onChange={(e) => set("groupCta", { ...s.groupCta, title: e.target.value })}
              />
            </FormField>
            <FormField label="Texto">
              <FieldInput
                value={s.groupCta.text}
                onChange={(e) => set("groupCta", { ...s.groupCta, text: e.target.value })}
              />
            </FormField>
            <FormField label="Link de Acesso">
              <FieldInput
                value={s.groupCta.accessLink}
                onChange={(e) => set("groupCta", { ...s.groupCta, accessLink: e.target.value })}
              />
            </FormField>
            <FormField label="Texto do Botão">
              <FieldInput
                value={s.groupCta.buttonText}
                onChange={(e) => set("groupCta", { ...s.groupCta, buttonText: e.target.value })}
              />
            </FormField>

            <SwitchRow label="Mostrar Prêmios" checked={s.showPrizes} onChange={(v) => set("showPrizes", v)} />

            <div className="flex flex-col gap-2">
              {s.prizes.map((prize, i) => (
                <FormField key={i} label={i === 0 ? "Prêmio 1º colocado" : `Prêmio ${i + 1}º colocado`}>
                  <div className="flex items-center gap-2">
                    <FieldInput value={prize} onChange={(e) => updatePrize(i, e.target.value)} />
                    <button type="button" onClick={() => removePrize(i)} className="text-muted-foreground hover:text-destructive">
                      <Minus className="size-4" />
                    </button>
                  </div>
                </FormField>
              ))}
              {s.prizes.length < 10 && (
                <button
                  type="button"
                  onClick={addPrize}
                  className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="size-3.5" />
                  Novo Prêmio
                </button>
              )}
            </div>

            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "afiliados" && (
          <div className="flex flex-col gap-4">
            <SwitchRow
              label="Permite afiliados?"
              checked={s.allowAffiliates}
              onChange={(v) => set("allowAffiliates", v)}
            />
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "titulos-premiados" && (
          <div className="flex flex-col gap-4">
            {instantPrizesBlocked ? (
              <div className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-400">
                Não é possível cadastrar Títulos Premiados no modo de reserva &ldquo;manual&rdquo;.
              </div>
            ) : (
              <>
                <SwitchRow
                  label="Ativar Títulos Premiados"
                  checked={s.instantPrizesEnabled}
                  onChange={(v) => set("instantPrizesEnabled", v)}
                />
                {s.instantPrizesEnabled && (
                  <div className="flex flex-col gap-4">
                    <BonusGameSection kind="awardedBox" productId={productId} games={awardedBoxGames} />
                    <BonusGameSection kind="rewardSpin" productId={productId} games={rewardSpinGames} />
                    <BonusGameSection kind="scratchCard" productId={productId} games={scratchCardGames} />
                  </div>
                )}
              </>
            )}
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "pagamento" && (
          <div className="flex flex-col gap-4">
            <FormField label="Provedor de pagamentos online" required>
              <FieldInput
                value={s.paymentGatewayProvider ?? ""}
                onChange={(e) => set("paymentGatewayProvider", e.target.value || null)}
                placeholder="deixe em branco para usar o gateway padrão do tenant"
              />
            </FormField>
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "promocoes" && (
          <div className="flex flex-col gap-4">
            <SwitchRow
              label="Ativar Promoção em Dobro"
              checked={s.doublePromoEnabled}
              onChange={(v) => set("doublePromoEnabled", v)}
            />
            <SwitchRow
              label="Ativar Promoções"
              checked={s.promotionsEnabled}
              onChange={(v) => set("promotionsEnabled", v)}
            />
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "alertas" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-400">
              Ative um alerta para aparecer na página de vendas com cronômetro de início e fim.
            </div>
            <SwitchRow label="Ativar Alerta" checked={s.alertEnabled} onChange={(v) => set("alertEnabled", v)} />
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "upsell" && (
          <div className="flex flex-col gap-4">
            {upsellBlocked ? (
              <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-500">
                Não é possível upsell em compras no formato manual
              </div>
            ) : (
              <SwitchRow
                label="Ativar Promoções Mais Atrativas"
                checked={s.upsellEnabled}
                onChange={(v) => set("upsellEnabled", v)}
              />
            )}
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "anti-spam" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-500">
              O Anti Spam consiste em bloquear temporariamente usuários que fazem muitas reservas sem pagar. O
              bloqueio é feito por um tempo determinado e após o tempo de bloqueio o usuário pode fazer reservas
              normalmente.
            </div>
            <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-400">
              <b>Exemplo:</b> Participante faz 3 reservas seguidas sem pagar, ele é bloqueado e não pode fazer mais
              reservas até que o tempo de bloqueio acabe.
            </div>
            <SwitchRow
              label="Ativar Anti Spam"
              checked={s.antiSpamEnabled}
              onChange={(v) => set("antiSpamEnabled", v)}
            />
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "suporte" && (
          <div className="flex flex-col gap-4">
            <FormField label="Tipo do Widget">
              <Select
                items={WIDGET_TYPE_ITEMS}
                value={s.support.widgetType}
                onValueChange={(v) => set("support", { ...s.support, widgetType: v as "icon_text" | "icon_only" })}
              >
                <SelectTrigger className="h-7 w-full border-none px-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icon_text">Ícone e texto</SelectItem>
                  <SelectItem value="icon_only">Apenas ícone</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="WhatsApp">
              <FieldInput
                value={s.support.whatsapp}
                onChange={(e) => set("support", { ...s.support, whatsapp: e.target.value })}
                placeholder="(11) 98888-7777"
              />
            </FormField>
            <FormField label="Grupo do WhatsApp">
              <FieldInput
                value={s.support.whatsappGroup}
                onChange={(e) => set("support", { ...s.support, whatsappGroup: e.target.value })}
                placeholder="https://..."
              />
            </FormField>
            <FormField label="Telegram">
              <FieldInput
                value={s.support.telegram}
                onChange={(e) => set("support", { ...s.support, telegram: e.target.value })}
                placeholder="https://t.me/id"
              />
            </FormField>
            <FormField label="E-mail">
              <FieldInput
                value={s.support.email}
                onChange={(e) => set("support", { ...s.support, email: e.target.value })}
                placeholder="seuemail@dominio.com"
              />
            </FormField>
            <FormField label="Discord">
              <FieldInput
                value={s.support.discord}
                onChange={(e) => set("support", { ...s.support, discord: e.target.value })}
                placeholder="https://discord.com/invite/id"
              />
            </FormField>
            <FormField label="Instagram">
              <FieldInput
                value={s.support.instagram}
                onChange={(e) => set("support", { ...s.support, instagram: e.target.value })}
                placeholder="https://instagram.com/perfil"
              />
            </FormField>
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "capitalizadora" && (
          <div className="flex flex-col gap-4">
            <SwitchRow
              label="Ativar Capitalizadora"
              checked={s.capitalizerEnabled}
              onChange={(v) => set("capitalizerEnabled", v)}
            />
            <FormField label="Código do Sorteio (SUSEP, etc)">
              <FieldInput
                value={s.capitalizerCode}
                onChange={(e) => set("capitalizerCode", e.target.value)}
              />
            </FormField>
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {activeTab === "restricoes" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Apenas os usuários com DDDs selecionados poderão comprar deste sorteio.
            </p>
            <div className="flex flex-wrap gap-2">
              {DDD_OPTIONS.map((ddd) => (
                <button
                  key={ddd}
                  type="button"
                  onClick={() => toggleDdd(ddd)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    s.restrictedDdds.includes(ddd)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {ddd}
                </button>
              ))}
            </div>
            <Button onClick={() => saveSettings()} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
