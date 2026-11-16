import { z } from "zod";

export const BONUS_GAME_KINDS = ["awardedBox", "rewardSpin", "scratchCard"] as const;
export type BonusGameKind = (typeof BONUS_GAME_KINDS)[number];

export const bonusGameLabels: Record<BonusGameKind, { title: string; itemsLabel: string; icon: string }> = {
  awardedBox: { title: "Caixa Premiada", itemsLabel: "Prêmios (separados por vírgula)", icon: "🎁" },
  rewardSpin: { title: "Roleta Premiada", itemsLabel: "Segmentos (separados por vírgula)", icon: "🎡" },
  scratchCard: { title: "Raspadinha", itemsLabel: "Prêmios (separados por vírgula)", icon: "🎟️" },
};

export const bonusGameSchema = z.object({
  title: z.string().min(2),
  items: z.string().min(1, "Informe ao menos um item"),
  totalBoxes: z.coerce.number().int().positive().optional(),
});
export type BonusGameInput = z.infer<typeof bonusGameSchema>;

export const bonusGameComboSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
});
export type BonusGameComboInput = z.infer<typeof bonusGameComboSchema>;
