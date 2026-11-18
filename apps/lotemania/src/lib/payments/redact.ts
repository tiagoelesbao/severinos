// Dado pessoal não entra em claro no banco (LTM-03a, item 11 — portão G7).
//
// ════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO IMPEDE, CONCRETAMENTE
//
// O aviso de cash-in da Paysure traz `payer_name` e `payer_document` (CPF) —
// §5.4 de `docs/research/2026-11-16-paysure-contrato.md`. A rota gravava o
// corpo INTEIRO em `payment_webhook_events.payload`. Isso é dado pessoal
// entrando no banco por um caminho que ninguém declarou, contra a política
// de 2026-11-12 (`docs/ESTADO-ATUAL.md` §1-A).
//
// A razão de dar para resolver por desenho, e não por promessa de retenção:
// NADA no fechamento precisa desses campos. O casamento é por
// `external_reference` (o nosso `orders.id`), o valor é conferido contra
// `orders.amount`, e o crédito bancário usa `paymentId`/`endToEndId`. Nome e
// CPF do pagador não entram em nenhuma decisão.
//
// Então eles são mascarados NA ESCRITA — a trilha de auditoria guarda a
// forma do aviso, não a identidade de quem pagou.
//
// DECISÃO: mascaramento TOTAL, não parcial. Guardar os dois últimos dígitos
// do CPF seria defensável para conciliação, e foi recusado porque a decisão
// #2 do dono do negócio ("o operador precisa ver o CPF para disputa MED?")
// tem default "não" — e o default seguro é o que não guarda nada. Se a
// resposta virar "sim", a mudança é de "mascarar na escrita" para "guardar
// cifrado com acesso registrado", que é requisito novo, não refazimento.
// ════════════════════════════════════════════════════════════════════════

export const REDACTED = "[mascarado]";

/**
 * As chaves tratadas como dado pessoal, normalizadas (minúsculas, sem `_` e
 * sem `-`).
 *
 * A política de 2026-11-12 cobre NOME, TELEFONE, E-MAIL e CPF — os quatro,
 * não só o CPF. O AC-G2 foi estendido a `payer_name` pelo @po em 2026-11-17
 * exatamente por isso.
 *
 * A comparação é por chave EXATA (depois de normalizar), nunca por
 * "contém": `contains("name")` engoliria `product_name` e `tenant_name`, que
 * são dado de catálogo — a auditoria perderia contexto sem proteger ninguém.
 * O preço dessa escolha é que chave de provedor com nome inesperado passa
 * batida; é por isso que o AC-G2 varre o payload PERSISTIDO procurando os
 * valores sintéticos, em vez de confiar na lista.
 */
const PERSONAL_DATA_KEYS: ReadonlySet<string> = new Set([
  // identidade do pagador, como a Paysure a entrega
  "payername",
  "payerdocument",
  "payeremail",
  "payerphone",
  // identidade de quem gera a cobrança (POST /v1/pix/qrcode, §4)
  "generatorname",
  "generatordocument",
  // formas genéricas que outro provedor pode usar
  "document",
  "documento",
  "cpf",
  "cnpj",
  "taxid",
  "name",
  "nome",
  "fullname",
  "email",
  "mail",
  "phone",
  "telefone",
  "celular",
  "holdername",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, "");
}

export function isPersonalDataKey(key: string): boolean {
  return PERSONAL_DATA_KEYS.has(normalizeKey(key));
}

/** Teto de profundidade: corpo de terceiro não decide quanto a pilha anda. */
const MAX_DEPTH = 12;

/**
 * Devolve uma cópia do payload com todo valor de chave de dado pessoal
 * substituído por `[mascarado]`, em qualquer profundidade.
 *
 * Chamada ANTES de qualquer `insert` em `payment_webhook_events` — em todos
 * os caminhos, inclusive nos recusados. Aviso rejeitado por token errado
 * também traz CPF, e rejeitar não é razão para guardar.
 */
export function redactPersonalData(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((item) => redactPersonalData(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      output[key] = isPersonalDataKey(key)
        ? REDACTED
        : redactPersonalData(source[key], depth + 1);
    }
    return output;
  }

  return value;
}

/** Teto do corpo ilegível guardado na auditoria. */
const MAX_RAW_LENGTH = 2000;

/**
 * Corpo que não é JSON.
 *
 * Não dá para casar por chave quando não há chave, então aqui a defesa é
 * grosseira de propósito: sequência de 11 ou mais dígitos — a forma de um
 * CPF sem pontuação — é substituída, e o texto é truncado. Isto só acontece
 * com corpo ilegível, que nenhum provedor manda num aviso válido; o caminho
 * normal passa por `redactPersonalData`, que é preciso.
 */
export function redactRawBody(rawBody: string): string {
  return rawBody.slice(0, MAX_RAW_LENGTH).replace(/\d{11,}/g, REDACTED);
}
