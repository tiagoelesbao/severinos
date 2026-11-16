import { z } from "zod";

export const settingsSchema = z.object({
  siteName: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  twoFactorRequired: z.boolean(),
  captchaEnabled: z.boolean(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const communicationSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
});
export type CommunicationInput = z.infer<typeof communicationSchema>;
