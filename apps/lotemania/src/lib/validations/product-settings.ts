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

  // ── O PRÊMIO, NA FORMA QUE A MEIA COTA PRECISA SABER (LTM-07) ─────────
  //
  // `prizes` acima é DESCRIÇÃO livre ("Um Fiat Argo 2026", "R$ 100 mil").
  // Texto não responde às duas perguntas que a divisibilidade faz, e as duas
  // estão no ADR-0001:
  //
  //   • é prêmio em DINHEIRO? (só nele existe meia cota)
  //   • ele DIVIDE EXATO em centavos? (o AC4 exige soma exata, sem política
  //     de desempate — a restrição na entrada substituiu o arredondamento)
  //
  // Por que aqui e não como coluna de `products`: o comentário de
  // `raffles.ts:77-82` registra a decisão de que a configuração das abas do
  // editor — a de Prêmios inclusive — vive em `advanced_settings` em vez de
  // virar dezenas de colunas. Esta é a aba de Prêmios. A exceção que já
  // existe (`is_divisible` virou coluna) é de campo lido no caminho quente
  // da reserva; o prêmio não é lido em reserva nenhuma.
  //
  // ⚠️ Lido SEMPRE por `productAdvancedSettingsSchema.parse(...)`, nunca por
  // acesso cru ao jsonb: sorteio antigo tem `advanced_settings = {}` e são
  // os defaults abaixo que entregam o valor. Mesma razão escrita em
  // `validations/reserve.ts:56-60`.
  //
  // O default `"other"` é conservador de propósito: um sorteio que nunca
  // declarou o prêmio NÃO pode virar divisível, e a recusa diz exatamente
  // isso em vez de deixar passar por omissão.
  prizeKind: z.enum(["cash", "other"]).default("other"),
  /**
   * O valor do prêmio em reais, como STRING decimal de até duas casas —
   * a mesma forma de `orders.amount` e `products.price_per_number`, e lida
   * pelo mesmo `toCents` de `lib/payments/money.ts`.
   *
   * String, e não `number`, pela razão já escrita em `money.ts:36-39`:
   * `number` chega aqui tendo passado por ponto flutuante, e depois do fato
   * não há como distinguir "o dado tem três casas" de "o binário deixou
   * resíduo". É exatamente a distinção de que o AC12 depende —
   * R$ 100.000,01 recusa, R$ 100.000,00 aceita.
   */
  prizeAmount: z.string().nullable().default(null),
  ebookEnabled: z.boolean().default(false),
  groupCta: z
    .object({
      title: z.string().default(""),
      text: z.string().default(""),
      accessLink: z.string().default(""),
      buttonText: z.string().default(""),
    })
    // prefault, nao default: `.default({})` devolvia o `{}` literal como saida,
    // sem aplicar os defaults dos campos acima — o tipo prometia strings e o
    // runtime entregava undefined. `.prefault({})` faz o `{}` passar pelo parse,
    // entao cada campo recebe o default que ja estava declarado aqui.
    .prefault({}),

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
    // idem groupCta: prefault para que os defaults dos campos sejam aplicados.
    .prefault({}),

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
