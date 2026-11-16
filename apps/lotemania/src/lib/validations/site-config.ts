import { z } from "zod";

// Everything from the original's "Configurações" screen (6 tabs) beyond
// branding/security, which already live as dedicated columns on
// `settings`. See db/schema/settings.ts siteConfig.
export const siteConfigSchema = z.object({
  // Geral
  supportPhone: z.string().default(""),

  // Chats & Suporte
  jivoChatId: z.string().default(""),
  blipChatId: z.string().default(""),
  liveChatLicenseId: z.string().default(""),

  // Campanha / Compra
  loginMode: z.enum(["phone", "email"]).default("phone"),
  numberNomenclature: z.enum(["titulos", "cotas", "numeros", "bilhetes"]).default("titulos"),
  purchaseCardText: z.string().default(""),
  minPurchaseAge: z.coerce.number().int().min(0).default(18),
  showMinAgeAlert: z.boolean().default(false),

  // Experiência do Usuário
  affiliateCookieHours: z.coerce.number().int().positive().default(24),
  rankingSortMode: z.enum(["quantity", "revenue"]).default("quantity"),
  rouletteModel: z.string().default("Modelo 1"),
  rankingCacheMinutes: z.coerce.number().int().min(0).default(5),
  numberLookupMessage: z.string().default(""),
  securityAlertEnabled: z.boolean().default(false),
  showQrCodeByDefault: z.boolean().default(false),
  requireStateCity: z.boolean().default(false),
  affiliatePublic: z.boolean().default(true),
  shareButtonsEnabled: z.boolean().default(true),
  manualQuantityEdit: z.boolean().default(false),
  buyerPrivacy: z.boolean().default(true),
  autoImageCarousel: z.boolean().default(true),
  showPricesOnCards: z.boolean().default(true),
  showAppButton: z.boolean().default(false),
  requirePassword: z.boolean().default(true),
  passwordSupportPhone: z.string().default(""),
  manualNumberSelectionLoad: z.boolean().default(false),
  disableNumberLookup: z.boolean().default(false),
  highlightPrizedNumbers: z.boolean().default(true),

  // Prêmios Instantâneos
  instantPrizeOrder: z
    .array(z.enum(["titulos", "roleta", "caixas", "raspadinha"]))
    .default(["titulos", "roleta", "caixas", "raspadinha"]),
  winnerMessageTitulos: z
    .string()
    .default("Olá {name}! Parabéns, seu número premiado foi {number}. Você ganhou o prêmio: {prize}."),
  winnerMessageCaixas: z.string().default("Olá {name}! Parabéns, você ganhou o prêmio: {prize}."),
  winnerMessageRoletas: z.string().default("Olá {name}! Parabéns, você ganhou o prêmio: {prize}."),
  winnerMessageRaspadinhas: z.string().default("Olá {name}! Parabéns, você ganhou o prêmio: {prize}."),
  winnerTextBoxes: z.string().default("Em breve nossa equipe entrará em contato para realizar a entrega do prêmio."),

  // Preços / Promoções
  showPromoPercentage: z.boolean().default(true),
  showComboPrices: z.boolean().default(true),
  showFees: z.boolean().default(true),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

export function defaultSiteConfig(): SiteConfig {
  return siteConfigSchema.parse({});
}
