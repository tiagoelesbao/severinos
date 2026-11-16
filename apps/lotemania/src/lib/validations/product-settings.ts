import { z } from "zod";

// Everything from the original's 14-tab product editor beyond the core
// fields (title, price, numbers, dates) — grouped by the tab it lives in.
export const productAdvancedSettingsSchema = z.object({
  // Geral
  showOnHomepage: z.boolean().default(true),
  reservationModel: z.enum(["manual", "random"]).default("manual"),
  drawMechanism: z.enum(["manual", "lottery"]).default("manual"),
  descriptionMode: z.enum(["collapsed", "expanded"]).default("collapsed"),
  fullDescription: z.string().default(""),
  statusText: z.string().default("Adquira Já!"),
  salesStartMode: z.enum(["immediate", "scheduled"]).default("immediate"),
  autoFinishOnDrawDate: z.boolean().default(false),
  showDrawDateToParticipants: z.boolean().default(false),
  allowReceiptDownload: z.boolean().default(false),
  showPaidParticipantNames: z.boolean().default(false),
  showRandomSelectionOption: z.boolean().default(false),
  requiredFields: z
    .array(z.enum(["name", "phone", "cpf", "email", "socialName", "birthDate"]))
    .default(["phone"]),

  // Títulos
  reservationExpiryMinutes: z.coerce.number().int().positive().default(15),
  maxPerBuyer: z.coerce.number().int().min(0).default(0),
  maxQuantityPerBuyer: z.coerce.number().int().min(0).default(0),
  minPerReservation: z.coerce.number().int().positive().default(1),
  maxPerReservation: z.coerce.number().int().positive().default(1000),
  initialPerReservation: z.coerce.number().int().min(0).default(1),
  quickBuyCards: z.array(z.coerce.number().int().positive()).default([5, 10, 50, 100, 500, 1000]),
  popularCardIndex: z.coerce.number().int().min(0).default(1),
  showSalesProgressBar: z.boolean().default(true),
  showDailyRanking: z.boolean().default(false),
  showGeneralRanking: z.boolean().default(false),
  freeCampaign: z.boolean().default(false),
  hasFee: z.boolean().default(false),

  // Prêmios (do próprio sorteio, distintos dos jogos bônus)
  prizes: z.array(z.string()).default([]),
  showPrizes: z.boolean().default(true),
  ebookEnabled: z.boolean().default(false),
  groupCta: z
    .object({
      title: z.string().default(""),
      text: z.string().default(""),
      accessLink: z.string().default(""),
      buttonText: z.string().default(""),
    })
    .default({}),

  // Afiliados
  allowAffiliates: z.boolean().default(false),

  // Títulos Premiados
  instantPrizesEnabled: z.boolean().default(false),

  // Pagamento
  paymentGatewayProvider: z.string().nullable().default(null),

  // Promoções
  promotionsEnabled: z.boolean().default(false),
  doublePromoEnabled: z.boolean().default(false),

  // Alertas
  alertEnabled: z.boolean().default(false),

  // Upsell
  upsellEnabled: z.boolean().default(false),

  // Anti Spam
  antiSpamEnabled: z.boolean().default(true),

  // Suporte
  support: z
    .object({
      widgetType: z.enum(["icon_text", "icon_only"]).default("icon_text"),
      whatsapp: z.string().default(""),
      whatsappGroup: z.string().default(""),
      telegram: z.string().default(""),
      email: z.string().default(""),
      discord: z.string().default(""),
      instagram: z.string().default(""),
    })
    .default({}),

  // Capitalizadora
  capitalizerEnabled: z.boolean().default(false),
  capitalizerCode: z.string().default(""),

  // Restrições
  restrictedDdds: z.array(z.string()).default([]),

  // Imagens
  videoEnabled: z.boolean().default(false),
});

export type ProductAdvancedSettings = z.infer<typeof productAdvancedSettingsSchema>;

export function defaultAdvancedSettings(): ProductAdvancedSettings {
  return productAdvancedSettingsSchema.parse({});
}
