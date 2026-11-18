import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const AES_256_KEY_BYTES = 32;

// ⚠️ A CHAVE É LIDA NA PRIMEIRA CIFRAGEM, NÃO NA IMPORTAÇÃO DO MÓDULO.
//
// Era `Buffer.from(process.env.CREDENTIALS_ENCRYPTION_KEY!, "base64")` no
// topo do arquivo, e o `!` escondia duas coisas: sem a variável, a
// IMPORTAÇÃO deste módulo derrubava quem o importasse — a tela de
// integrações, a server action, a suíte — com
// `TypeError: The "string" argument must be of type string`, que não diz
// qual variável falta nem onde configurá-la.
//
// Agora falha só quem de fato cifra, e com o nome da variável e o comando
// que gera o valor. Também confere o TAMANHO: `aes-256-gcm` exige 32 bytes,
// e uma chave de 16 só é recusada na primeira chamada, com mensagem do Node
// sobre "invalid key length".
let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY não está definida. Ela cifra as credenciais " +
        "de gateway de pagamento por tenant. Gere com `openssl rand -base64 32` " +
        "e ponha em .env.local. ⚠️ Trocar esta chave torna ilegível toda " +
        "credencial já salva.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== AES_256_KEY_BYTES) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY decodifica para ${key.length} bytes e ` +
        `aes-256-gcm exige ${AES_256_KEY_BYTES}. Gere com ` +
        `\`openssl rand -base64 32\`.`,
    );
  }

  cachedKey = key;
  return key;
}

// AES-256-GCM, storing iv:authTag:ciphertext as one base64 blob per field.
// Used for third-party API keys (payment gateways, integrations) — never
// store those as plaintext in the database.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// ════════════════════════════════════════════════════════════════════════
// CREDENCIAL DE GATEWAY: OBJETO, NÃO STRING (LTM-03a, item 3)
//
// A premissa "uma credencial por gateway" era errada. A Paysure usa DOIS
// cabeçalhos — `ci` (Client ID) e `cs` (Client Secret) —, e uma string solta
// em `credentials_encrypted` guardaria metade da credencial: toda chamada à
// API voltaria 401 e ninguém saberia por quê.
//
// O que muda é O QUE se cifra, não COMO. Mesmo AES-256-GCM, mesmo blob,
// mesma coluna `text`: cifra-se o JSON do objeto. Zero mudança de schema,
// zero migração de dado.
// ════════════════════════════════════════════════════════════════════════

export type GatewayCredentials = Record<string, string>;

export function encryptCredentials(credentials: GatewayCredentials): string {
  return encryptSecret(JSON.stringify(credentials));
}

/**
 * Lê o blob de credencial, em qualquer uma das duas formas.
 *
 * ⚠️ LEITURA COMPATÍVEL COM O LEGADO (AC-A2). Blob gravado antes desta story
 * contém uma string solta — a chave de API, cifrada direto. Ele decifra, mas
 * não é JSON de objeto. Em vez de estourar (e derrubar a tela de integrações
 * de quem já tinha gateway configurado), ele é lido como
 * `{ apiKey: <valor> }`, que é exatamente o que ele significava.
 *
 * O caso ambíguo está tratado: um blob legado cujo conteúdo POR ACASO seja
 * JSON válido mas não um objeto de strings (um número, um array, `"null"`)
 * cai no mesmo caminho do legado, não em erro.
 */
export function decryptCredentials(
  blob: string | null | undefined,
): GatewayCredentials {
  if (!blob) return {};
  const plaintext = decryptSecret(blob);

  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return { apiKey: plaintext };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { apiKey: plaintext };
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (!entries.every(([, value]) => typeof value === "string")) {
    return { apiKey: plaintext };
  }

  return Object.fromEntries(entries) as GatewayCredentials;
}
