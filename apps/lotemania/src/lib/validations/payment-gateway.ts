import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// A SEGUNDA CÓPIA DA LISTA DE PROVEDORES — E O QUE ELA DECIDE
//
// `paymentGatewayProviderEnum` em `src/db/schema/payments.ts` é a primeira
// cópia. Esta é a segunda, e é DELA que saem três efeitos que a primeira
// não produz:
//
//   1. o `404` da rota de webhook  (route.ts filtra por esta lista)
//   2. a recusa ao salvar credencial (o `z.enum` abaixo)
//   3. a ausência do provedor na tela (`payments/page.tsx` itera por aqui)
//
// Acrescentar provedor só no `pgEnum` não resolve nenhum dos três. As duas
// listas têm de andar juntas, e a `LTM-03a` as atualiza de forma coordenada.
//
// Derivar esta lista do `pgEnum` — e acabar com a duplicidade na raiz — é
// decisão de @architect e está declarada FORA do escopo da `LTM-03a`
// (Escopo OUT). Fica registrado aqui para quem vier depois não concluir que
// a duplicidade passou despercebida.
// ════════════════════════════════════════════════════════════════════════
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
  // O gateway de PRODUÇÃO do Império. Faltava nas duas listas — era a causa
  // medida do 404 do webhook, da recusa ao salvar a credencial e da ausência
  // na tela. Representável a partir da `LTM-03a`; o ADAPTADOR dele é a
  // `LTM-03b`, e até lá todo aviso da paysure é recusado EM VOZ ALTA
  // (`unsupported_provider`), nunca aceito em silêncio.
  "paysure",
  "resetpay",
  "starkbank",
] as const;

export type PaymentGatewayProvider = (typeof PAYMENT_GATEWAY_PROVIDERS)[number];

/**
 * Um campo de credencial declarado por um provedor.
 *
 * Existe porque "uma credencial por gateway" era premissa errada: a Paysure
 * usa DOIS cabeçalhos (`ci` = Client ID, `cs` = Client Secret). Uma string
 * solta em `credentials_encrypted` guardaria metade da credencial e toda
 * chamada à API voltaria 401 — ver `docs/research/2026-11-16-paysure-contrato.md`
 * §1.
 */
export interface CredentialField {
  name: string;
  label: string;
  type: "text" | "password";
  required: boolean;
  help?: string;
}

export interface ProviderGatewaySpec {
  /** Os campos que o formulário renderiza e que o adaptador consome. */
  readonly credentialFields: readonly CredentialField[];
  /**
   * O provedor assina os avisos de webhook?
   *
   * Quando falso, o campo "Segredo do Webhook" NÃO é pedido ao operador —
   * porque não existe destinatário para ele do outro lado. A autenticidade
   * do aviso passa a vir do token opaco na própria URL (ver
   * `src/lib/payments/webhook-token.ts`).
   */
  readonly signsWebhooks: boolean;
}

/**
 * Credencial dos 17 provedores herdados da plataforma anterior: uma chave de
 * API, assinatura HMAC-SHA256 no corpo cru.
 *
 * ⚠️ Isto descreve o que o CÓDIGO ATUAL assume, não um contrato lido de cada
 * um dos 17. Nenhum deles está contratado (nota de escopo do founder,
 * 2026-11-16: "o único gateway que importa agora é a paysure"). Quando um for
 * de fato contratado, a entrada dele aqui passa a ser escrita contra a
 * documentação dele — como a da paysure foi.
 */
const LEGACY_HMAC_SPEC: ProviderGatewaySpec = {
  credentialFields: [
    {
      name: "apiKey",
      label: "Chave de API",
      type: "password",
      required: true,
    },
  ],
  signsWebhooks: true,
};

const PAYSURE_SPEC: ProviderGatewaySpec = {
  credentialFields: [
    {
      name: "ci",
      label: "Client ID (ci)",
      type: "text",
      required: true,
      help: "Cabeçalho `ci` de toda chamada à API da Paysure.",
    },
    {
      name: "cs",
      label: "Client Secret (cs)",
      type: "password",
      required: true,
      help: "Cabeçalho `cs`. Nunca sai do banco em claro.",
    },
  ],
  // A documentação da Paysure não descreve assinatura nenhuma: sem HMAC, sem
  // cabeçalho de assinatura, sem segredo compartilhado. Pedir "Segredo do
  // Webhook" aqui seria pedir um dado que não tem onde ser informado do
  // outro lado — foi exatamente o defeito que esta story corrige.
  signsWebhooks: false,
};

export const PAYMENT_GATEWAY_SPECS: Record<PaymentGatewayProvider, ProviderGatewaySpec> = {
  apipay: LEGACY_HMAC_SPEC,
  authbank: LEGACY_HMAC_SPEC,
  basspago: LEGACY_HMAC_SPEC,
  codetech: LEGACY_HMAC_SPEC,
  e2pay: LEGACY_HMAC_SPEC,
  efipay: LEGACY_HMAC_SPEC,
  fyhub: LEGACY_HMAC_SPEC,
  hyperwallet: LEGACY_HMAC_SPEC,
  infopago: LEGACY_HMAC_SPEC,
  metapay: LEGACY_HMAC_SPEC,
  mutualpay: LEGACY_HMAC_SPEC,
  nexo: LEGACY_HMAC_SPEC,
  onlyup: LEGACY_HMAC_SPEC,
  paggue: LEGACY_HMAC_SPEC,
  pagstar: LEGACY_HMAC_SPEC,
  pay2m: LEGACY_HMAC_SPEC,
  paysure: PAYSURE_SPEC,
  resetpay: LEGACY_HMAC_SPEC,
  starkbank: LEGACY_HMAC_SPEC,
};

export function isPaymentGatewayProvider(
  value: string,
): value is PaymentGatewayProvider {
  return (PAYMENT_GATEWAY_PROVIDERS as readonly string[]).includes(value);
}

/**
 * A descrição do provedor, resolvida pelo nome.
 *
 * É esta função — e não uma suposição sobre `apiKey` — que o formulário, o
 * schema de validação e o adaptador consultam. Três consumidores, uma
 * descrição.
 */
export function gatewaySpecFor(provider: string): ProviderGatewaySpec {
  if (!isPaymentGatewayProvider(provider)) {
    throw new Error(`Provedor de pagamento desconhecido: "${provider}".`);
  }
  return PAYMENT_GATEWAY_SPECS[provider];
}

export function credentialFieldsFor(provider: string): readonly CredentialField[] {
  return gatewaySpecFor(provider).credentialFields;
}

export const MIN_WEBHOOK_SECRET_LENGTH = 8;

export const paymentGatewaySchema = z
  .object({
    provider: z.enum(PAYMENT_GATEWAY_PROVIDERS),
    /**
     * Mapa de campo → valor. O que é obrigatório, o que é aceito e o que é
     * recusado vem do `superRefine` abaixo, lido da descrição do provedor —
     * não de uma lista fixa de nomes.
     */
    credentials: z.record(z.string(), z.string()),
    webhookSecret: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const spec = PAYMENT_GATEWAY_SPECS[value.provider];

    for (const field of spec.credentialFields) {
      const raw = value.credentials[field.name];
      if (field.required && (raw === undefined || raw.trim() === "")) {
        ctx.addIssue({
          code: "custom",
          path: ["credentials", field.name],
          message: "Obrigatório",
        });
      }
    }

    // Campo que o provedor não declarou é recusado em vez de guardado: blob
    // cifrado com lixo dentro é dívida silenciosa, e foi assim que o
    // `webhookSecret` sem destinatário sobreviveu tanto tempo.
    const declared = new Set(spec.credentialFields.map((f) => f.name));
    for (const key of Object.keys(value.credentials)) {
      if (!declared.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["credentials", key],
          message: `O provedor "${value.provider}" não declara o campo "${key}".`,
        });
      }
    }

    if (spec.signsWebhooks) {
      if (
        value.webhookSecret === undefined ||
        value.webhookSecret.length < MIN_WEBHOOK_SECRET_LENGTH
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["webhookSecret"],
          message: `Mínimo ${MIN_WEBHOOK_SECRET_LENGTH} caracteres`,
        });
      }
      return;
    }

    if (value.webhookSecret !== undefined && value.webhookSecret !== "") {
      ctx.addIssue({
        code: "custom",
        path: ["webhookSecret"],
        message: `O provedor "${value.provider}" não assina os avisos — não há onde informar este segredo.`,
      });
    }
  });

export type PaymentGatewayInput = z.input<typeof paymentGatewaySchema>;

export const bankAccountSchema = z.object({
  bankName: z.string().min(2),
  holderName: z.string().min(2),
  document: z.string().optional(),
  pixKey: z.string().optional(),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
