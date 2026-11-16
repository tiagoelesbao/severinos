import { z } from "zod";

export const PAYMENT_GATEWAY_PROVIDERS = [
  "apipay",
  "authbank",
  "basspago",
  "codetech",
  "e2pay",
  "efipay",
  "fyhub",
  "hyperwallet",
  "infopago",
  "metapay",
  "mutualpay",
  "nexo",
  "onlyup",
  "paggue",
  "pagstar",
  "pay2m",
  "resetpay",
  "starkbank",
] as const;

export const paymentGatewaySchema = z.object({
  provider: z.enum(PAYMENT_GATEWAY_PROVIDERS),
  apiKey: z.string().min(1, "Obrigatório"),
  webhookSecret: z.string().min(8, "Mínimo 8 caracteres"),
});

export type PaymentGatewayInput = z.infer<typeof paymentGatewaySchema>;

export const bankAccountSchema = z.object({
  bankName: z.string().min(2),
  holderName: z.string().min(2),
  document: z.string().optional(),
  pixKey: z.string().optional(),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
