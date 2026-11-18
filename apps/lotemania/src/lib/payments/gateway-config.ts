import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentGateways } from "@/db/schema";
import { encryptCredentials } from "@/lib/crypto";
import {
  gatewaySpecFor,
  paymentGatewaySchema,
  type PaymentGatewayInput,
} from "@/lib/validations/payment-gateway";

import { generateWebhookToken } from "./webhook-token";

// A gravação da configuração de gateway, sem a camada de autorização.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ISTO NÃO MORA EM `lib/actions/payment-gateways.ts`
//
// Porque aquele arquivo é `"use server"`, e no Next TODA exportação de um
// arquivo `"use server"` vira um endpoint chamável pelo cliente. Uma função
// que grava credencial de gateway sem conferir quem está pedindo não pode
// ser exportada de lá — seria um endpoint de escrita sem autorização,
// exposto por acidente de organização de arquivo.
//
// Então a decisão fica aqui, em módulo comum, e a server action é uma casca:
// `requireAdmin()` e depois esta função. O efeito colateral bom é que os ACs
// A1(ii), A2 e A4 passam a ser verificáveis contra o banco de verdade, sem
// dublê de autenticação — o `cookies()` do Next não existe fora de uma
// requisição, e mockar a autenticação para testar uma regra de dinheiro
// seria testar o dublê.
// ════════════════════════════════════════════════════════════════════════

export interface SavedGateway {
  provider: string;
  isActive: boolean;
  webhookToken: string | null;
}

export async function savePaymentGatewayForTenant(
  tenantId: string,
  input: PaymentGatewayInput,
): Promise<SavedGateway> {
  const data = paymentGatewaySchema.parse(input);
  const spec = gatewaySpecFor(data.provider);

  // A credencial é um OBJETO cifrado, não uma string (AC-A2). Uma string
  // não cabe os dois cabeçalhos que a Paysure exige — a tela salvaria metade
  // da credencial e toda chamada voltaria 401.
  const credentialsEncrypted = encryptCredentials(data.credentials);

  // Provedor que não assina não guarda segredo de assinatura. O `null`
  // explícito apaga segredo deixado por configuração anterior, em vez de
  // mantê-lo pendurado sem destinatário do outro lado.
  const webhookSecret = spec.signsWebhooks ? (data.webhookSecret ?? null) : null;

  const [row] = await db
    .insert(paymentGateways)
    .values({
      tenantId,
      provider: data.provider,
      credentialsEncrypted,
      webhookSecret,
      // O token nasce com o gateway: é o que torna a URL do webhook
      // autêntica. Emitido por nós, uma vez, por (tenant, provider).
      webhookToken: generateWebhookToken(),
      // ⚠️ `isActive` NÃO É INFORMADO, de propósito (AC-A4).
      //
      // A versão anterior forçava `isActive: true` na criação E na
      // atualização, contra o `default(false)` da coluna e contra o que o
      // comentário do próprio schema documentava. O gateway nascia ligado
      // sem ninguém ter ligado, e o `Switch` da tela — que existe
      // exatamente para isso — era decorativo na criação. Ligar passa a ser
      // ato explícito do operador.
    })
    .onConflictDoUpdate({
      target: [paymentGateways.tenantId, paymentGateways.provider],
      set: {
        credentialsEncrypted,
        webhookSecret,
        // Token EXISTENTE é preservado; só linha sem token (legado) recebe o
        // novo. Rotacionar o token numa simples troca de credencial
        // invalidaria em silêncio a `postbackUrl` que o provedor já tem, e
        // todo aviso em trânsito passaria a responder 401.
        webhookToken: sql`coalesce(${paymentGateways.webhookToken}, excluded.webhook_token)`,
        updatedAt: new Date(),
        // `isActive` fora do `set`: atualizar credencial não liga nem
        // desliga um gateway.
      },
    })
    .returning({
      provider: paymentGateways.provider,
      isActive: paymentGateways.isActive,
      webhookToken: paymentGateways.webhookToken,
    });

  return row;
}

export async function setPaymentGatewayActiveForTenant(
  tenantId: string,
  provider: string,
  isActive: boolean,
): Promise<void> {
  await db
    .update(paymentGateways)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(paymentGateways.provider, provider as never),
        eq(paymentGateways.tenantId, tenantId),
      ),
    );
}
