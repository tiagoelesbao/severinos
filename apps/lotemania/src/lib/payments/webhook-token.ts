import { randomBytes, timingSafeEqual } from "crypto";

// A autenticidade do aviso de webhook (LTM-03a, item 2 da arquitetura).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE O SEGREDO MORA NA URL, E NÃO NUM CABEÇALHO DE ASSINATURA
//
// A premissa anterior era que todo provedor assina o corpo com HMAC-SHA256 e
// manda o resultado em `x-webhook-signature`. A documentação da Paysure
// desmente isso de forma radical: ela não assina NADA — sem HMAC, sem
// cabeçalho, sem segredo compartilhado. A orientação dela é validar o IP de
// origem da Cloudflare. O `x-webhook-signature` rejeitaria 100% dos avisos.
//
// E não há como "configurar o segredo no painel dela": a `postbackUrl` vai
// em CADA cobrança, não é cadastrada uma vez. Então a autenticidade tem de
// morar no único lugar que nós controlamos e que acompanha cada cobrança —
// a própria URL.
//
// DECISÃO (AC-G3, item i): SEGMENTO DE CAMINHO, não parâmetro de consulta.
//
//   A favor do caminho: sem o segmento não existe rota. Falhar fechado passa
//   a ser propriedade do ROTEADOR, não de uma linha de validação que alguém
//   pode remover por achar redundante. A rota antiga, sem token, responde
//   410 com registro (AC-G1) em vez de aceitar.
//
//   A alternativa (`?token=`) é legítima e foi REJEITADA, não omitida: o
//   parâmetro de consulta é o lugar onde segredo mais vaza em registro de
//   acesso de proxy e de CDN, e a rota existiria mesmo sem ele — a validação
//   voltaria a ser código, não roteamento.
//
// A faixa de IP da Cloudflare é defesa ADICIONAL, não substituta: a faixa é
// pública e compartilhada por milhões de domínios. Está no Escopo OUT.
// ════════════════════════════════════════════════════════════════════════

/** 32 bytes de aleatoriedade criptográfica — 43 caracteres em base64url. */
export const WEBHOOK_TOKEN_BYTES = 32;

export function generateWebhookToken(): string {
  return randomBytes(WEBHOOK_TOKEN_BYTES).toString("base64url");
}

/**
 * Comparação em tempo constante do token recebido com o emitido.
 *
 * ⚠️ Não existe `===` sobre o segredo neste arquivo, e é proposital (AC-B2).
 * O único `===` abaixo é sobre o COMPRIMENTO dos buffers, e ele é
 * obrigatório: `timingSafeEqual` do Node LANÇA quando os buffers têm
 * tamanhos diferentes. Comprimento de token não é segredo (é fixo, 43
 * caracteres), então comparar comprimento não vaza nada que um atacante não
 * saiba lendo este arquivo.
 */
export function webhookTokenMatches(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
