// O token da URL e o mascaramento de dado pessoal (LTM-03a, AC-B2 e AC-G2).
//
// Os dois são primitivos do caminho do dinheiro, verificados sem banco: o
// token é a ÚNICA autenticidade que a Paysure admite (ela não assina nada), e
// o mascaramento é o portão G7 por desenho em vez de por política de
// retenção.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  REDACTED,
  isPersonalDataKey,
  redactPersonalData,
  redactRawBody,
} from "@/lib/payments/redact";
import {
  WEBHOOK_TOKEN_BYTES,
  generateWebhookToken,
  webhookTokenMatches,
} from "@/lib/payments/webhook-token";
import { retiredWebhookPath, webhookPath } from "@/lib/payments/webhook-url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(dirname, "../../src");

describe("token de webhook (AC-B2)", () => {
  it("é imprevisível e tem 32 bytes de entropia", () => {
    const amostra = new Set(Array.from({ length: 200 }, generateWebhookToken));
    expect(amostra.size).toBe(200);

    const token = generateWebhookToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(WEBHOOK_TOKEN_BYTES);
    // base64url: nenhum caractere que precise de escape em URL.
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("compara igual com igual, e recusa tudo o mais", () => {
    const token = generateWebhookToken();
    expect(webhookTokenMatches(token, token)).toBe(true);
    expect(webhookTokenMatches(`${token}a`, token)).toBe(false);
    expect(webhookTokenMatches(token.slice(0, -1), token)).toBe(false);
    expect(webhookTokenMatches(generateWebhookToken(), token)).toBe(false);
  });

  it("ausência de token ou de segredo NÃO é coincidência", () => {
    // Falhar fechado: `undefined === undefined` seria verdadeiro, e um
    // gateway sem token aceitaria requisição sem token.
    const token = generateWebhookToken();
    expect(webhookTokenMatches("", token)).toBe(false);
    expect(webhookTokenMatches(token, "")).toBe(false);
    expect(webhookTokenMatches(undefined, undefined)).toBe(false);
    expect(webhookTokenMatches(null, null)).toBe(false);
    expect(webhookTokenMatches("", "")).toBe(false);
  });

  it("comprimento divergente não derruba a comparação", () => {
    // `timingSafeEqual` do Node LANÇA com buffers de tamanhos diferentes. A
    // checagem de comprimento antes dela é o que impede um 500 na rota.
    expect(() => webhookTokenMatches("a", generateWebhookToken())).not.toThrow();
  });

  it("AC-B2: a comparação é em tempo constante — nenhum `===` sobre o segredo", async () => {
    // A verificação POR LEITURA que o AC pede, executada. O único `===` do
    // arquivo é sobre o COMPRIMENTO dos buffers, que é obrigatório e não é
    // segredo (o token tem tamanho fixo).
    const fonte = await readFile(path.join(SRC, "lib/payments/webhook-token.ts"), "utf8");
    const corpo = fonte
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("//") && !linha.trim().startsWith("*"))
      .join("\n");

    expect(corpo).toContain("timingSafeEqual");

    // ZERO `===` no arquivo, não "um, o de comprimento".
    //
    // A primeira versão desta asserção esperava exatamente um — e reprovou,
    // com a razão certa: a guarda de comprimento é escrita `!==`, não `===`.
    // A asserção foi corrigida porque o código está mais limpo do que ela
    // supunha, e não o contrário. Deixada como está, ela passaria a EXIGIR
    // um `===` no arquivo, que é o oposto do que o AC quer.
    const comparacoes = [...corpo.matchAll(/[^=!<>]===[^=]/g)].map((m) => m[0]);
    expect(comparacoes).toHaveLength(0);

    // E a guarda obrigatória está lá: sem ela `timingSafeEqual` lança.
    expect(corpo).toContain("a.length !== b.length");
  });
});

describe("o caminho da rota vem de uma função só (AC-B1)", () => {
  it("inclui tenant, provider e token, nessa ordem", () => {
    expect(webhookPath("imperio", "paysure", "tok-123")).toBe(
      "/api/webhooks/payment/imperio/paysure/tok-123",
    );
  });

  it("escapa o que vier do dado, em vez de interpolar cru", () => {
    expect(webhookPath("a/b", "paysure", "tok/123")).toBe(
      "/api/webhooks/payment/a%2Fb/paysure/tok%2F123",
    );
  });

  it("a forma aposentada é a mesma sem o último segmento", () => {
    expect(retiredWebhookPath("imperio", "paysure")).toBe(
      "/api/webhooks/payment/imperio/paysure",
    );
  });
});

describe("mascaramento de dado pessoal (AC-G2, portão G7)", () => {
  it("as quatro categorias da política de 2026-11-12 são chaves de dado pessoal", () => {
    // Nome, telefone, e-mail e CPF — as quatro, não só o CPF. O AC-G2 foi
    // estendido a `payer_name` pelo @po em 2026-11-17 porque a seção 5.4 do
    // contrato nomeia os dois campos.
    for (const chave of [
      "payer_name",
      "payerName",
      "payer_document",
      "payer-document",
      "cpf",
      "documento",
      "email",
      "phone",
      "telefone",
      "generator_document",
    ]) {
      expect(isPersonalDataKey(chave)).toBe(true);
    }
  });

  it("chave que NÃO é dado pessoal sobrevive", () => {
    // Mascarar demais não protege ninguém e cega a auditoria.
    for (const chave of [
      "reference_code",
      "external_reference",
      "value_cents",
      "status",
      "end_to_end",
      "payment_date",
      "content",
    ]) {
      expect(isPersonalDataKey(chave)).toBe(false);
    }
  });

  it("mascara em profundidade e preserva a forma do aviso", () => {
    const aviso = {
      cashin: {
        reference_code: "PSR-sintetico",
        value_cents: 6100,
        payer_name: "Pagador-sintetico",
        payer_document: "documento-sintetico",
        end_to_end: "e2e-sintetico",
        splits: [{ clientId: "parceiro", name: "Nome-sintetico" }],
      },
    };

    expect(redactPersonalData(aviso)).toEqual({
      cashin: {
        reference_code: "PSR-sintetico",
        value_cents: 6100,
        payer_name: REDACTED,
        payer_document: REDACTED,
        end_to_end: "e2e-sintetico",
        splits: [{ clientId: "parceiro", name: REDACTED }],
      },
    });
  });

  it("não muta o original", () => {
    const original = { payer_name: "Pagador-sintetico" };
    redactPersonalData(original);
    expect(original.payer_name).toBe("Pagador-sintetico");
  });

  it("corpo ilegível: sequência longa de dígitos é mascarada e o texto é truncado", () => {
    // Não dá para casar por chave quando não há chave. A defesa aqui é
    // grosseira de propósito, e só atinge corpo que nenhum provedor manda.
    // Onze zeros: tem a FORMA de um CPF sem pontuação (o que a guarda
    // procura) e não pode ser um — os dígitos verificadores nunca fecham, e
    // a varredura do AC-G2 por padrão de CPF nos artefatos da story não
    // aponta para cá por engano.
    expect(redactRawBody("lixo 00000000000 fim")).toBe(`lixo ${REDACTED} fim`);
    expect(redactRawBody("x".repeat(5000))).toHaveLength(2000);
  });

  it("valor que não é objeto atravessa sem erro", () => {
    expect(redactPersonalData(null)).toBeNull();
    expect(redactPersonalData(42)).toBe(42);
    expect(redactPersonalData("texto")).toBe("texto");
  });
});
