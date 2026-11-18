// A representação e a configuração do provedor (LTM-03a, bloco A e AC-B1).
//
// ════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO PROVA, E POR QUE ELE EXISTE
//
// O 404 do webhook da paysure NÃO vinha do `pgEnum`. Vinha de
// `PAYMENT_GATEWAY_PROVIDERS` em `lib/validations/payment-gateway.ts` — uma
// SEGUNDA cópia da lista, com três consumidores. Acrescentar o provedor só no
// schema não resolveria nenhum dos três efeitos.
//
// O AC-A1 exige um teste POR CONSUMIDOR. Os três estão aqui, menos o (i) —
// a rota —, que mora em `webhook.test.ts` porque é lá que a rota é
// exercitada.
//
// Por que `savePaymentGateway` (a server action) não é chamada diretamente:
// ela chama `requireAdmin()`, que lê `cookies()` do Next, e `cookies()` não
// existe fora de uma requisição. Mockar a autenticação para testar uma regra
// de dinheiro testaria o dublê. A decisão de gravação foi extraída para
// `lib/payments/gateway-config.ts` exatamente para ser verificável com o
// banco de verdade — e a server action passou a ser a casca que só autoriza.
// ════════════════════════════════════════════════════════════════════════

import { createHmac } from "node:crypto";

import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { POST as POST_TOKENIZADA } from "@/app/api/webhooks/payment/[tenant]/[provider]/[token]/route";
import {
  GatewayConfigForm,
  WebhookUrlHint,
} from "@/app/dashboard/integrations/payments/configure-gateway-dialog";
import { GatewayRow } from "@/app/dashboard/integrations/payments/gateway-row";
import { decryptCredentials, encryptSecret } from "@/lib/crypto";
import {
  savePaymentGatewayForTenant,
  setPaymentGatewayActiveForTenant,
} from "@/lib/payments/gateway-config";
import { adapterFor, providersWithoutAdapter } from "@/lib/payments/providers";
import { webhookPath } from "@/lib/payments/webhook-url";
import {
  PAYMENT_GATEWAY_PROVIDERS,
  credentialFieldsFor,
  gatewaySpecFor,
  paymentGatewaySchema,
} from "@/lib/validations/payment-gateway";

import {
  createPaymentGateway,
  createTenant,
  readPaymentGateway,
  readWebhookEvents,
  type SeededTenant,
} from "../helpers/seed";

const PAYSURE = "paysure";
const COM_HMAC = "paggue";

/** Extrai o conteúdo de `<code data-webhook-url>` da marcação renderizada. */
function urlDoRender(markup: string): string {
  const match = /<code[^>]*data-webhook-url[^>]*>([^<]+)<\/code>/.exec(markup);
  if (!match) {
    throw new Error(
      `A marcação renderizada não tem <code data-webhook-url>. ` +
        `O AC-B1 exige que a URL seja EXTRAÍDA do render, não comparada com ` +
        `uma string escrita à mão. Marcação: ${markup.slice(0, 400)}`,
    );
  }
  return match[1];
}

describe("as duas listas de provedores (AC-A1)", () => {
  it("`paysure` existe em PAYMENT_GATEWAY_PROVIDERS", () => {
    expect(PAYMENT_GATEWAY_PROVIDERS).toContain(PAYSURE);
  });

  it("AC-A1(ii): `savePaymentGateway` com provider paysure passa a validação", () => {
    // Era o `z.enum` que recusava — o segundo dos três consumidores.
    const parsed = paymentGatewaySchema.parse({
      provider: PAYSURE,
      credentials: { ci: "ci-sintetico", cs: "cs-sintetico" },
    });
    expect(parsed.provider).toBe(PAYSURE);
  });

  it("AC-A1(iii): a listagem da tela inclui paysure", () => {
    // A tela itera por `PAYMENT_GATEWAY_PROVIDERS`
    // (`payments/page.tsx:54`) — o terceiro consumidor. Com o provedor fora
    // da lista, o operador não conseguia nem abrir o formulário dele.
    expect([...PAYMENT_GATEWAY_PROVIDERS]).toContain(PAYSURE);
    expect(gatewaySpecFor(PAYSURE).credentialFields.map((f) => f.name)).toEqual([
      "ci",
      "cs",
    ]);
  });

  // ⚠️ REESCRITO PELA LTM-03b, e a razão é o próprio enunciado anterior.
  //
  // Este teste dizia "paysure está na lista e deliberadamente SEM adaptador
  // (LTM-03b)" — ele nomeava a story que o invalidaria. A LTM-03a entregou a
  // paysure representável e recusada EM VOZ ALTA; a LTM-03b entrega o
  // adaptador dela, e com isso `providersWithoutAdapter()` fica VAZIA.
  //
  // O que se verifica agora é a condição mais forte: TODO provedor da lista
  // tem adaptador, e a paysure tem um PRÓPRIO — escrito contra a
  // documentação dela, declarando `signature: "none"` — em vez do HMAC de
  // referência que os 17 herdados usam.
  //
  // O mecanismo de "provedor sem adaptador" NÃO foi apagado: ele é a
  // resposta a "e quando alguém acrescentar provedor às listas sem escrever
  // o adaptador?". Ver o bloco de comentário em `lib/payments/providers/index.ts`.
  it("todo provedor da lista tem adaptador, e a paysure tem um PRÓPRIO", () => {
    expect(providersWithoutAdapter()).toEqual([]);

    for (const provider of PAYMENT_GATEWAY_PROVIDERS) {
      expect(adapterFor(provider), `${provider} sem adaptador`).not.toBeNull();
    }

    // O adaptador da paysure é o único que declara não assinar — porque é o
    // único cujo provedor de fato não assina.
    expect(adapterFor(PAYSURE)?.signsWebhooks).toBe(false);
    for (const provider of PAYMENT_GATEWAY_PROVIDERS) {
      if (provider === PAYSURE) continue;
      expect(adapterFor(provider)?.signsWebhooks).toBe(true);
    }
  });

  it("o adaptador lê os campos da MESMA descrição que o formulário", () => {
    const adapter = adapterFor(COM_HMAC);
    expect(adapter?.credentialFields).toEqual(credentialFieldsFor(COM_HMAC));
  });
});

describe("validação da credencial por provedor", () => {
  it("AC-A3: paysure exige `ci` e `cs`, e recusa `apiKey`", () => {
    expect(
      paymentGatewaySchema.safeParse({
        provider: PAYSURE,
        credentials: { ci: "x" },
      }).success,
    ).toBe(false);

    const comApiKey = paymentGatewaySchema.safeParse({
      provider: PAYSURE,
      credentials: { apiKey: "x" },
    });
    expect(comApiKey.success).toBe(false);
  });

  it("AC-A3: paysure RECUSA segredo de webhook — não há onde informá-lo", () => {
    const result = paymentGatewaySchema.safeParse({
      provider: PAYSURE,
      credentials: { ci: "ci-sintetico", cs: "cs-sintetico" },
      webhookSecret: "segredo-sem-destinatario",
    });
    expect(result.success).toBe(false);
  });

  it("AC-A3: provedor que assina continua exigindo o segredo", () => {
    expect(
      paymentGatewaySchema.safeParse({
        provider: COM_HMAC,
        credentials: { apiKey: "chave-sintetica" },
      }).success,
    ).toBe(false);

    expect(
      paymentGatewaySchema.safeParse({
        provider: COM_HMAC,
        credentials: { apiKey: "chave-sintetica" },
        webhookSecret: "segredo-sintetico-longo",
      }).success,
    ).toBe(true);
  });
});

describe("a credencial é um objeto cifrado (AC-A2)", () => {
  let tenant: SeededTenant;

  beforeEach(async () => {
    tenant = await createTenant();
  });

  it("os dois campos da paysure cabem em UM blob, e nenhum sai em claro", async () => {
    const CI = "ci-sintetico-da-suite";
    const CS = "cs-sintetico-da-suite";

    await savePaymentGatewayForTenant(tenant.id, {
      provider: PAYSURE,
      credentials: { ci: CI, cs: CS },
    });

    const row = await readPaymentGateway(tenant.id, PAYSURE);
    expect(row).not.toBeNull();
    const blob = row!.credentials_encrypted as string;

    // Consulta DIRETA à tabela: nenhum dos dois valores aparece em claro.
    expect(blob).not.toContain(CI);
    expect(blob).not.toContain(CS);

    // E decifrado devolve os DOIS.
    expect(decryptCredentials(blob)).toEqual({ ci: CI, cs: CS });

    // Provedor que não assina não guarda segredo de assinatura.
    expect(row!.webhook_secret).toBeNull();
  });

  it("blob LEGADO em formato de string solta é lido como `{ apiKey }`", async () => {
    // Nenhuma linha existente se perde e nenhuma migração de dado é
    // necessária. Sem esta compatibilidade, a tela de integrações de quem já
    // tinha gateway configurado estouraria ao ler a própria credencial.
    const legado = encryptSecret("chave-de-api-sintetica-legada");
    expect(decryptCredentials(legado)).toEqual({
      apiKey: "chave-de-api-sintetica-legada",
    });
  });

  it("blob nulo não estoura", () => {
    expect(decryptCredentials(null)).toEqual({});
    expect(decryptCredentials(undefined)).toEqual({});
    expect(decryptCredentials("")).toEqual({});
  });
});

describe("`isActive` deixa de ser forçado (AC-A4)", () => {
  let tenant: SeededTenant;

  beforeEach(async () => {
    tenant = await createTenant();
  });

  it("as três transições", async () => {
    // 1. Criar deixa `is_active` FALSO.
    const criado = await savePaymentGatewayForTenant(tenant.id, {
      provider: PAYSURE,
      credentials: { ci: "ci-1", cs: "cs-1" },
    });
    expect(criado.isActive).toBe(false);
    expect((await readPaymentGateway(tenant.id, PAYSURE))!.is_active).toBe(false);
    // E o token nasce com o gateway.
    expect(criado.webhookToken).toBeTruthy();

    // 2. Ligar é ato explícito do operador.
    await setPaymentGatewayActiveForTenant(tenant.id, PAYSURE, true);
    expect((await readPaymentGateway(tenant.id, PAYSURE))!.is_active).toBe(true);

    // 3. Atualizar um gateway LIGADO não o desliga nem o religa por efeito
    // colateral — e não rotaciona o token, que invalidaria em silêncio a
    // postbackUrl que o provedor já tem.
    const atualizado = await savePaymentGatewayForTenant(tenant.id, {
      provider: PAYSURE,
      credentials: { ci: "ci-2", cs: "cs-2" },
    });
    expect(atualizado.isActive).toBe(true);
    expect(atualizado.webhookToken).toBe(criado.webhookToken);
    expect(
      decryptCredentials(
        (await readPaymentGateway(tenant.id, PAYSURE))!.credentials_encrypted,
      ),
    ).toEqual({ ci: "ci-2", cs: "cs-2" });
  });

  it("gateway legado sem token recebe um na primeira gravação", async () => {
    await createPaymentGateway({
      tenantId: tenant.id,
      provider: COM_HMAC,
      webhookToken: null,
      isActive: true,
    });

    const salvo = await savePaymentGatewayForTenant(tenant.id, {
      provider: COM_HMAC,
      credentials: { apiKey: "chave-sintetica" },
      webhookSecret: "segredo-sintetico-longo",
    });

    expect(salvo.webhookToken).toBeTruthy();
    // E o gateway que já estava ligado continua ligado.
    expect(salvo.isActive).toBe(true);
  });
});

describe("o formulário é do provedor (AC-A3, por render)", () => {
  // Renderizado com `react-dom/server`, sem DOM e sem biblioteca de teste de
  // componente: o que se verifica é a MARCAÇÃO que o React produz com o
  // `useForm` de verdade e a descrição de provedor de verdade.
  //
  // O corpo do formulário é exportado à parte do `Dialog` porque o `Dialog`
  // do @base-ui monta num portal, e portal não produz marcação em render de
  // servidor — o teste não teria o que ler.

  it("paysure renderiza `ci` e `cs`, e NÃO renderiza Segredo do Webhook", () => {
    const markup = renderToStaticMarkup(
      <GatewayConfigForm
        provider={PAYSURE}
        tenantSlug="operador-sintetico"
        webhookToken="token-sintetico"
      />,
    );

    expect(markup).toContain("Client ID (ci)");
    expect(markup).toContain("Client Secret (cs)");
    expect(markup).toContain('name="credentials.ci"');
    expect(markup).toContain('name="credentials.cs"');

    expect(markup).not.toContain("Segredo do Webhook");
    expect(markup).not.toContain('name="webhookSecret"');
    expect(markup).toContain("data-no-signature-notice");
  });

  it("provedor que usa HMAC continua renderizando Segredo do Webhook", () => {
    const markup = renderToStaticMarkup(
      <GatewayConfigForm
        provider={COM_HMAC}
        tenantSlug="operador-sintetico"
        webhookToken="token-sintetico"
      />,
    );

    expect(markup).toContain("Chave de API");
    expect(markup).toContain('name="credentials.apiKey"');
    expect(markup).toContain("Segredo do Webhook");
    expect(markup).toContain('name="webhookSecret"');
    expect(markup).not.toContain("data-no-signature-notice");
  });

  it("nenhum provedor renderiza campo que a descrição dele não declara", () => {
    for (const provider of PAYMENT_GATEWAY_PROVIDERS) {
      const markup = renderToStaticMarkup(
        <GatewayConfigForm
          provider={provider}
          tenantSlug="operador-sintetico"
          webhookToken="token-sintetico"
        />,
      );
      const declarados = credentialFieldsFor(provider).map((f) => f.name);
      const renderizados = [
        ...markup.matchAll(/name="credentials\.([a-zA-Z0-9_]+)"/g),
      ].map((m) => m[1]);
      expect(renderizados.sort()).toEqual([...declarados].sort());
    }
  });
});

describe("a URL que o operador copia é a que funciona (AC-B1)", () => {
  let tenant: SeededTenant;
  let token: string;
  let secret: string;

  beforeEach(async () => {
    tenant = await createTenant();
    const gateway = await createPaymentGateway({
      tenantId: tenant.id,
      provider: COM_HMAC,
    });
    token = gateway.webhookToken as string;
    secret = gateway.webhookSecret as string;
  });

  it("o diálogo e a linha da tela exibem a MESMA URL, com tenant, provider e token", () => {
    const doDialogo = urlDoRender(
      renderToStaticMarkup(
        <GatewayConfigForm
          provider={COM_HMAC}
          tenantSlug={tenant.slug}
          webhookToken={token}
        />,
      ),
    );

    const daTela = urlDoRender(
      renderToStaticMarkup(
        <GatewayRow
          provider={COM_HMAC}
          tenantSlug={tenant.slug}
          webhookToken={token}
          configured
          isActive
        />,
      ),
    );

    // Regressão do defeito de `configure-gateway-dialog.tsx:92`, que exibia
    // `/api/webhooks/payment/{provider}` — SEM o tenant. As duas telas
    // discordavam entre si, e a do diálogo estava errada.
    expect(doDialogo).toBe(daTela);
    expect(doDialogo).toContain(tenant.slug);
    expect(doDialogo).toContain(COM_HMAC);
    expect(doDialogo).toContain(token);
    expect(doDialogo).toBe(webhookPath(tenant.slug, COM_HMAC, token));
  });

  it("um POST na URL EXTRAÍDA do render é aceito", async () => {
    // Nada de string escrita à mão: a URL vem do render e é usada como está.
    const url = urlDoRender(
      renderToStaticMarkup(
        <GatewayConfigForm
          provider={COM_HMAC}
          tenantSlug={tenant.slug}
          webhookToken={token}
        />,
      ),
    );

    // Os três parâmetros saem da URL extraída, não das variáveis do teste:
    // se o render produzir uma URL errada, a requisição vai para o lugar
    // errado e o teste reprova — que é o ponto do AC.
    const segmentos = url.split("/");
    const tokenDaUrl = segmentos[segmentos.length - 1];
    const providerDaUrl = segmentos[segmentos.length - 2];
    const tenantDaUrl = segmentos[segmentos.length - 3];

    const body = JSON.stringify({
      flow: "cashin",
      eventId: "evt-ac-b1",
      // `expired` leva a rota até a DECISÃO sem precisar montar um pedido —
      // e chegar à decisão é o que prova que a autenticidade passou.
      status: "expired",
    });

    const request = new Request(`http://localhost${url}`, {
      method: "POST",
      body,
      headers: {
        "x-webhook-signature": createHmac("sha256", secret)
          .update(body)
          .digest("hex"),
      },
    });

    const response = await POST_TOKENIZADA(request as unknown as NextRequest, {
      params: Promise.resolve({
        tenant: tenantDaUrl,
        provider: providerDaUrl,
        token: tokenDaUrl,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: false,
      state: "not_actionable",
    });

    const eventos = await readWebhookEvents(tenant.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].signature_valid).toBe(true);
  });

  it("sem token, a URL não é exibida — não há endereço válido a copiar", () => {
    const markup = renderToStaticMarkup(
      <WebhookUrlHint
        tenantSlug={tenant.slug}
        provider={COM_HMAC}
        token={null}
      />,
    );
    expect(markup).not.toContain("data-webhook-url");
    expect(markup).toContain("depois de salvar as credenciais");
  });
});
