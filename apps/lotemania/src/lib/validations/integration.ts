import { z } from "zod";

export const INTEGRATION_PROVIDERS = [
  "onesignal",
  "z-api",
  "wizebot",
  "meta-ads",
  "dxhub",
  "liguelead",
  "paposms",
  "captcha",
] as const;

export const integrationLabels: Record<string, string> = {
  onesignal: "OneSignal",
  "z-api": "Z-API WhatsApp",
  wizebot: "WizeBot WhatsApp",
  "meta-ads": "Meta Ads",
  dxhub: "DX Hub",
  liguelead: "LigueLead",
  paposms: "PapoSMS",
  captcha: "Captcha",
};

export const integrationDescriptions: Record<string, string> = {
  onesignal:
    "OneSignal é uma maneira fácil de aumentar o engajamento do usuário. Use OneSignal para enviar notificações direcionadas aos visitantes.",
  "z-api": "Integração com a API do WhatsApp para envio de mensagens, notificações e automações.",
  wizebot: "Integração com a API do WhatsApp para envio de mensagens, notificações e automações.",
  "meta-ads": "Integração com a Meta Ads (Facebook Ads) para importar dados de campanhas e anúncios.",
  dxhub:
    "Ecossistema de tecnologia para pós-venda, relacionamento e comunicação inteligente com clientes. Integração com WhatsApp Business API.",
  liguelead: "Utilize autenticação de consulta de números via código SMS.",
  paposms: "Utiliza autenticação de consulta de números via código SMS.",
  captcha:
    "Protege o login, a consulta de números e os cadastros contra robôs, exigindo um desafio antes do envio. Provedor: Cloudflare Turnstile.",
};

export const integrationSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
  apiKey: z.string().min(1, "Obrigatório"),
});
export type IntegrationInput = z.infer<typeof integrationSchema>;

export const outboundWebhookSchema = z.object({
  url: z.string().url("URL inválida"),
  events: z.array(z.string()).min(1, "Selecione ao menos um evento"),
});
export type OutboundWebhookInput = z.infer<typeof outboundWebhookSchema>;

export const WEBHOOK_EVENTS = [
  "order.paid",
  "order.refunded",
  "product.drawn",
  "affiliate.created",
  "payment_request.approved",
] as const;
