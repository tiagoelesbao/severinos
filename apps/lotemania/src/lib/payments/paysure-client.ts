import {
  reservationMinutesFor,
  type ReservationWindowProduct,
} from "@/lib/validations/reserve";

// O cliente de saída da Paysure — `POST /v1/pix/qrcode` (LTM-03b, item 3).
//
// Contrato: `docs/research/2026-11-16-paysure-contrato.md` §1, §4, §4.1, §7
// e §7.1. Cada constante e cada ramo abaixo tem parágrafo de origem; nada
// aqui é número escolhido por conveniência.
//
// ══════════════════════════════════════════════════════════════════════════
// NENHUMA CREDENCIAL NESTE ARQUIVO, EM NENHUMA FORMA
//
// Nem valor, nem exemplo, nem comentário que pareça um. O `ci`/`cs` vive
// cifrado em `payment_gateways.credentials_encrypted`, por tenant, e chega
// aqui como argumento. A própria Paysure recomenda variável de ambiente; o
// equivalente multi-tenant é a credencial por operador, cifrada no banco.
// ══════════════════════════════════════════════════════════════════════════

/** Base da API (§1). Sobreponível por ambiente — ver `resolveBaseUrl`. */
export const PAYSURE_API_BASE = "https://api.paysurebr.com/v1";

/** O endpoint de criação de cobrança (§4). */
export const PAYSURE_QRCODE_PATH = "/pix/qrcode";

/** Mínimo declarado de `value_cents`: R$ 1,00 (§4.1). */
export const PAYSURE_MIN_VALUE_CENTS = 100;

/** Faixa aceita de `expiration_seconds` (§4.1). Padrão da API: 3600. */
export const PAYSURE_EXPIRATION_MIN_SECONDS = 60;
export const PAYSURE_EXPIRATION_MAX_SECONDS = 86_400;

/**
 * A expiração da cobrança, AMARRADA ao relógio da reserva DESTE SORTEIO
 * (AC7).
 *
 * ⚠️ Esta função é a story inteira num lugar. O QR da Paysure dura 1 h por
 * padrão (e a página de webhooks fala de 24 h); a reserva do lotemania dura
 * o que `reservationMinutesFor` disser. Sem a amarração, "pagou depois de a
 * reserva expirar" deixa de ser exceção e vira O CAMINHO NORMAL: o
 * comprador tem um dia para pagar um número que deixou de ser dele em
 * quinze minutos.
 *
 * Derivado, nunca escrito à mão — e derivado DO SORTEIO, não de uma
 * constante de módulo: quando a janela virar configuração por sorteio
 * (`LTM-17`, o campo `reservationExpiryMinutes` já existe na tela e ninguém
 * o lê), a cobrança acompanha sem tocar este arquivo. O AC7 compara o corpo
 * enviado com esta função — nunca com o literal 900.
 */
export function chargeExpirationSecondsFor(
  product?: ReservationWindowProduct | null,
): number {
  return reservationMinutesFor(product) * 60;
}

/** Teto de tentativas de UMA criação de cobrança (tentativa 1 + 2 retries). */
export const PAYSURE_MAX_ATTEMPTS = 3;
/** Recuo exponencial: 500 ms, 1 s, 2 s… com teto. Nunca retry imediato. */
export const PAYSURE_BACKOFF_BASE_MS = 500;
export const PAYSURE_BACKOFF_CEILING_MS = 8_000;
/** Teto do `Retry-After` obedecido. Acima disso a espera é do operador. */
export const PAYSURE_RETRY_AFTER_CEILING_SECONDS = 60;

export interface PaysureCredentials {
  /** Cabeçalho `ci` — Client ID, público (§1). */
  readonly ci: string;
  /** Cabeçalho `cs` — Client Secret, privado (§1). */
  readonly cs: string;
}

/**
 * O corpo de `POST /v1/pix/qrcode`, COMPLETO (AC10c).
 *
 * ⚠️ CINCO CHAVES, E NENHUMA MAIS. Em particular NÃO existem aqui:
 *
 *   `generator_name` / `generator_document`
 *       Os dois são OPCIONAIS (§4.1, texto literal: *"Nome do pagador
 *       (cliente final). Opcional."* / *"CPF ou CNPJ do pagador.
 *       Opcional."*). Omiti-los não é economia de código: é não mandar dado
 *       pessoal que não precisamos mandar. O lotemania coleta telefone na
 *       reserva e não pede CPF para cobrar; expandir a superfície de dado
 *       pessoal de graça num terceiro é exatamente o que o portão G7 do
 *       epic existe para impedir. Campo opcional do provedor NÃO é convite
 *       para preencher.
 *
 *   `splits`
 *       Percentual sobre o bruto, destinatário identificado pelo nome de
 *       usuário Paysure, valor RETIDO se o destinatário não existir (§6).
 *       Muda o desenho de afiliados; é decisão de produto, e está no Escopo
 *       OUT da story.
 *
 * O teste do AC10c assere sobre as CHAVES do corpo que o dublê recebeu, não
 * sobre os valores — é a regra "não inventar valor de preenchimento"
 * virando verificação.
 */
export interface PaysureQrcodeRequestBody {
  /** Obrigatório. O nosso `orders.id` — a idempotência de saída (§3). */
  readonly external_id: string;
  /** Obrigatório. Inteiro, mínimo 100 (§4.1). */
  readonly value_cents: number;
  /** Obrigatório. A URL tokenizada do tenant/provider (LTM-03a). */
  readonly postbackUrl: string;
  /** Opcional no contrato, SEMPRE enviado aqui: é a amarração do AC7. */
  readonly expiration_seconds: number;
  /** Opcional no contrato, máx. 255 caracteres (§4.1). */
  readonly description: string;
}

export interface PaysureCharge {
  /** `qrcode.reference_code`. */
  readonly referenceCode: string;
  /** `qrcode.content` — o BR Code copia-e-cola. */
  readonly brCode: string;
  /** Derivado de `expiration_seconds`, no nosso relógio. */
  readonly expiresAt: Date;
}

/**
 * As classes de resposta, nomeadas (§7.1, AC10).
 *
 * São NOVE, e a enumeração é explícita de propósito — ver `classify`.
 */
export type PaysureFailureKind =
  /** Recusado por nós, ANTES da chamada: `value_cents` < 100 (AC10b). */
  | "below_minimum"
  /** 401 — cabeçalhos ausentes, par errado ou chave desativada. */
  | "unauthenticated"
  /** 403 — conta inativa. */
  | "account_inactive"
  /** 404 — recurso não encontrado. Na criação: rota ou base errada. */
  | "not_found"
  /** 409 — `external_id` já existe. Tem saída: ler a nossa linha (AC9). */
  | "duplicate"
  /** 422 — validação. Retry não corrige payload inválido. */
  | "validation"
  /** 429 — limite de taxa, com `Retry-After` em segundos. */
  | "rate_limited"
  /** 500 — erro interno da Paysure. Transitório. */
  | "provider_error"
  /** 501 — "operação não disponível para este recurso". PERMANENTE. */
  | "not_implemented"
  /** 503 — provedor temporariamente indisponível. Transitório. */
  | "provider_unavailable"
  /** Código que a documentação não lista. Nunca retry às cegas. */
  | "unexpected_status"
  /** A chamada não chegou (DNS, TCP, TLS, timeout do runtime). */
  | "network"
  /** 201 com corpo que não tem `qrcode.reference_code`/`content`. */
  | "malformed_response";

export interface PaysureFailure {
  readonly ok: false;
  readonly kind: PaysureFailureKind;
  /** O HTTP recebido, ou `null` quando a chamada não chegou. */
  readonly status: number | null;
  /** A classe admite retry? É a decisão do item 6, materializada. */
  readonly retriable: boolean;
  /** `Retry-After` do cabeçalho, em segundos, quando houve. */
  readonly retryAfterSeconds: number | null;
  /** O item vai para a lista do operador? (credencial, conta, rota, conta). */
  readonly operatorAction: boolean;
  /** Quantas chamadas HTTP foram de fato feitas. O AC10 assere sobre isto. */
  readonly attempts: number;
  /** Mensagem NOMEANDO a causa — nunca "erro ao criar cobrança". */
  readonly reason: string;
}

export type CreateChargeResult =
  | {
      readonly ok: true;
      readonly charge: PaysureCharge;
      readonly attempts: number;
      /** O corpo exatamente como foi serializado. */
      readonly requestBody: PaysureQrcodeRequestBody;
    }
  | PaysureFailure;

export interface CreateChargeInput {
  readonly credentials: PaysureCredentials;
  /** `orders.id`. */
  readonly externalId: string;
  readonly valueCents: number;
  readonly postbackUrl: string;
  readonly description: string;
  /**
   * `expiration_seconds` do corpo — de `chargeExpirationSecondsFor(product)`.
   *
   * Obrigatório e sem padrão de propósito: um padrão aqui seria um segundo
   * relógio, e o relógio tem de ser um só (AC14). Quem chama já tem o
   * sorteio em mãos e é quem sabe de qual janela se trata.
   */
  readonly expirationSeconds: number;
  /**
   * Base da API. Existe para a suíte apontar para o dublê HTTP — a própria
   * Paysure recomenda chaves separadas de produção e teste (§1), e aponta-se
   * o endereço junto. Sem valor, cai em `resolveBaseUrl()`.
   */
  readonly baseUrl?: string;
  /**
   * A espera entre tentativas. Injetável para o teste do AC10 medir a
   * DECISÃO de recuo sem esperar o recuo — o que se verifica é quantas
   * chamadas houve e quanto se esperou, não a passagem do tempo.
   */
  readonly sleep?: (ms: number) => Promise<void>;
  readonly fetchImpl?: typeof fetch;
  readonly maxAttempts?: number;
}

/**
 * De onde sai a base da API em produção.
 *
 * `PAYSURE_API_BASE_URL` existe porque a Paysure mantém chaves separadas
 * para produção e teste (§1) e porque a suíte precisa de um destino que não
 * seja a API real — AC11: nenhum teste faz chamada de rede à Paysure.
 */
export function resolveBaseUrl(): string {
  return process.env.PAYSURE_API_BASE_URL?.replace(/\/+$/, "") || PAYSURE_API_BASE;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Recuo com TETO declarado, nunca crescimento livre. */
export function backoffMs(attempt: number): number {
  return Math.min(
    PAYSURE_BACKOFF_BASE_MS * 2 ** (attempt - 1),
    PAYSURE_BACKOFF_CEILING_MS,
  );
}

export function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(Math.ceil(seconds), PAYSURE_RETRY_AFTER_CEILING_SECONDS);
}

interface Classification {
  readonly kind: PaysureFailureKind;
  readonly retriable: boolean;
  readonly operatorAction: boolean;
  readonly reason: string;
}

/**
 * A classe de cada código, UMA A UMA (§7.1, AC10).
 *
 * ⚠️ NÃO EXISTE `if (status >= 500) retry` NESTE ARQUIVO, E NÃO É ESTILO.
 *
 * O **501** da Paysure significa *"operação não disponível para este
 * recurso"* — não é falha transitória, é "esta conta/recurso não faz isso".
 * Um tratamento genérico de 5xx o colocaria em LAÇO DE RETRY ETERNO sobre
 * uma condição permanente: cada tentativa volta 501, o recuo cresce até o
 * teto, e o pedido fica pendurado para sempre com a tela sem código. O 501
 * é tratado como o 422: falha alto, sem retry, nomeando a causa.
 *
 * Mesma razão para o `default`: código que a documentação não lista NÃO
 * ganha retry por ser 5xx. Ele ganha nome ("não listado") e vai para o
 * operador.
 */
function classify(status: number): Classification {
  switch (status) {
    case 401:
      return {
        kind: "unauthenticated",
        retriable: false,
        operatorAction: true,
        reason:
          "A Paysure recusou a credencial (401): cabeçalhos `ci`/`cs` ausentes, " +
          "par inválido ou chave desativada. NÃO é erro do comprador — é a " +
          "credencial deste operador, e o item vai para a lista dele. Retry não " +
          "conserta credencial.",
      };
    case 403:
      return {
        kind: "account_inactive",
        retriable: false,
        operatorAction: true,
        reason:
          "A Paysure recusou por conta inativa (403). NÃO é erro do comprador: " +
          "é o cadastro deste operador na Paysure, e só ele resolve. Sem retry.",
      };
    case 404:
      return {
        kind: "not_found",
        retriable: false,
        operatorAction: true,
        reason:
          "A Paysure respondeu 404 na CRIAÇÃO de cobrança, o que não deveria " +
          "ocorrer: criar não depende de recurso existente. Se ocorreu, a rota " +
          "ou a base da API está errada — problema NOSSO, nomeado em vez de " +
          "repetido. Sem retry.",
      };
    case 409:
      return {
        kind: "duplicate",
        retriable: false,
        operatorAction: false,
        reason:
          "A Paysure já tem uma transação com este `external_id` (409). Isto é " +
          "idempotência de saída funcionando, não falha: a saída é ler a nossa " +
          "linha em `pix_charges`. O 409 NÃO devolve o `content`, e a consulta " +
          "por `external_reference` também não (§9.1) — por isso a linha é " +
          "obrigatória.",
      };
    case 422:
      return {
        kind: "validation",
        retriable: false,
        operatorAction: true,
        reason:
          "A Paysure recusou o corpo da cobrança por validação (422). Sem retry: " +
          "repetir não corrige payload inválido, só gasta chamada e esconde a " +
          "causa atrás de um recuo.",
      };
    case 429:
      return {
        kind: "rate_limited",
        retriable: true,
        operatorAction: false,
        reason:
          "Limite de taxa da conta na Paysure (429). O limite é *por chave/conta* " +
          "(§7.2) — não existe número de API —, então a espera é a que ela " +
          "mandar em `Retry-After`. Nunca retry imediato.",
      };
    case 500:
      return {
        kind: "provider_error",
        retriable: true,
        operatorAction: false,
        reason:
          "Erro interno da Paysure (500). Transitório: retry com recuo e teto " +
          "declarado.",
      };
    case 501:
      return {
        kind: "not_implemented",
        retriable: false,
        operatorAction: true,
        // Ver o bloco acima de `classify`. Este é o caso que o AC10 nomeia.
        reason:
          'A Paysure respondeu 501 — "operação não disponível para este recurso". ' +
          "É PERMANENTE, não transitório: a conta ou o recurso não faz isso, e " +
          "nenhuma repetição muda esse fato. Tratado como 422 — falha alto, SEM " +
          "retry — justamente porque um tratamento genérico de 5xx o colocaria em " +
          "laço de retry eterno.",
      };
    case 503:
      return {
        kind: "provider_unavailable",
        retriable: true,
        operatorAction: false,
        reason:
          "Paysure temporariamente indisponível (503). Transitório: retry com " +
          "recuo e teto declarado.",
      };
    default:
      return {
        kind: "unexpected_status",
        retriable: false,
        operatorAction: true,
        reason:
          `A Paysure respondeu ${status}, que não está na tabela de códigos dela ` +
          `(§7.1). Sem retry: código não listado não ganha repetição por ser 5xx ` +
          `— ganha nome e vai para o operador.`,
      };
  }
}

/** O corpo, montado num lugar só. Cinco chaves — ver `PaysureQrcodeRequestBody`. */
export function buildQrcodeRequestBody(input: {
  externalId: string;
  valueCents: number;
  postbackUrl: string;
  description: string;
  /** De `chargeExpirationSecondsFor(product)`, nunca de um literal (AC7). */
  expirationSeconds: number;
}): PaysureQrcodeRequestBody {
  return {
    external_id: input.externalId,
    value_cents: input.valueCents,
    postbackUrl: input.postbackUrl,
    expiration_seconds: input.expirationSeconds,
    description: input.description.slice(0, 255),
  };
}

function readCharge(
  payload: unknown,
  expirationSeconds: number,
): { ok: true; charge: PaysureCharge } | { ok: false; reason: string } {
  if (payload === null || typeof payload !== "object") {
    return { ok: false, reason: "A Paysure devolveu 201 com corpo que não é objeto." };
  }
  const qrcode = (payload as { qrcode?: unknown }).qrcode;
  if (qrcode === null || typeof qrcode !== "object") {
    return {
      ok: false,
      reason: "A Paysure devolveu 201 sem o objeto `qrcode` (§4).",
    };
  }
  const { reference_code: referenceCode, content } = qrcode as {
    reference_code?: unknown;
    content?: unknown;
  };
  if (typeof referenceCode !== "string" || referenceCode.trim() === "") {
    return {
      ok: false,
      reason: "A Paysure devolveu 201 sem `qrcode.reference_code`.",
    };
  }
  if (typeof content !== "string" || content.trim() === "") {
    return {
      ok: false,
      reason:
        "A Paysure devolveu 201 sem `qrcode.content` — e `content` é o BR Code, " +
        "o único campo que nem o 409 nem a consulta devolvem depois. Gravar a " +
        "cobrança sem ele deixaria o comprador sem código para pagar.",
    };
  }
  return {
    ok: true,
    charge: {
      referenceCode,
      brCode: content,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000),
    },
  };
}

/**
 * Cria a cobrança PIX na Paysure.
 *
 * Não grava nada: quem persiste é `lib/actions/pix-charge.ts`. Aqui mora a
 * fronteira HTTP e só ela — classe de resposta, decisão de retry e leitura
 * do 201.
 */
export async function createPixCharge(
  input: CreateChargeInput,
): Promise<CreateChargeResult> {
  // ── A guarda do mínimo vem ANTES da chamada (AC10b).
  //
  // Um título de R$ 0,50 é configuração plausível num sorteio, e o mínimo de
  // 100 centavos está declarado no contrato (§4.1). Gastar uma chamada para
  // colher um 422 que já sabíamos que viria é pagar latência e cota de taxa
  // para descobrir o que está escrito na documentação.
  if (!Number.isInteger(input.valueCents)) {
    return {
      ok: false,
      kind: "below_minimum",
      status: null,
      retriable: false,
      operatorAction: true,
      retryAfterSeconds: null,
      attempts: 0,
      reason:
        `\`value_cents\` tem de ser inteiro em centavos e veio ${input.valueCents}. ` +
        `Nenhuma chamada foi feita.`,
    };
  }
  if (input.valueCents < PAYSURE_MIN_VALUE_CENTS) {
    return {
      ok: false,
      kind: "below_minimum",
      status: null,
      retriable: false,
      operatorAction: true,
      retryAfterSeconds: null,
      attempts: 0,
      reason:
        `O pedido vale ${input.valueCents} centavos e a Paysure exige no mínimo ` +
        `${PAYSURE_MIN_VALUE_CENTS} (R$ 1,00, §4.1). Recusado ANTES da chamada: ` +
        `gastar uma chamada para colher um 422 previsível é pagar cota de taxa ` +
        `para descobrir o que a documentação já diz. Corrija o preço do sorteio.`,
    };
  }

  const body = buildQrcodeRequestBody({
    externalId: input.externalId,
    valueCents: input.valueCents,
    postbackUrl: input.postbackUrl,
    description: input.description,
    expirationSeconds: input.expirationSeconds,
  });

  // Rede de segurança do contrato: se alguém puser `RESERVATION_MINUTES`
  // fora da faixa de `expiration_seconds` (60 a 86 400, §4.1), a Paysure
  // responderia 422 e o motivo chegaria de longe. Falha aqui, com o nome.
  if (
    body.expiration_seconds < PAYSURE_EXPIRATION_MIN_SECONDS ||
    body.expiration_seconds > PAYSURE_EXPIRATION_MAX_SECONDS
  ) {
    return {
      ok: false,
      kind: "validation",
      status: null,
      retriable: false,
      operatorAction: true,
      retryAfterSeconds: null,
      attempts: 0,
      reason:
        `\`expiration_seconds\` derivado da janela de reserva do sorteio vale ` +
        `${body.expiration_seconds}, fora da faixa aceita pela Paysure ` +
        `(${PAYSURE_EXPIRATION_MIN_SECONDS} a ${PAYSURE_EXPIRATION_MAX_SECONDS}, ` +
        `§4.1). Nenhuma chamada foi feita.`,
    };
  }

  const baseUrl = (input.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, "");
  const url = `${baseUrl}${PAYSURE_QRCODE_PATH}`;
  const doFetch = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? defaultSleep;
  const maxAttempts = input.maxAttempts ?? PAYSURE_MAX_ATTEMPTS;

  let attempts = 0;
  let last: PaysureFailure | null = null;

  while (attempts < maxAttempts) {
    attempts += 1;

    let response: Response;
    try {
      response = await doFetch(url, {
        method: "POST",
        headers: {
          // Os DOIS cabeçalhos, nunca um (§1). Uma string solta em
          // `credentials_encrypted` guardaria metade da credencial e toda
          // chamada voltaria 401 — foi o defeito que a LTM-03a corrigiu.
          ci: input.credentials.ci,
          cs: input.credentials.cs,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      last = {
        ok: false,
        kind: "network",
        status: null,
        retriable: true,
        operatorAction: false,
        retryAfterSeconds: null,
        attempts,
        reason:
          `A chamada a ${url} não chegou à Paysure: ` +
          `${error instanceof Error ? error.message : String(error)}.`,
      };
      if (attempts < maxAttempts) {
        await sleep(backoffMs(attempts));
        continue;
      }
      return last;
    }

    if (response.status === 201) {
      const payload = await response.json().catch(() => null);
      const charge = readCharge(payload, body.expiration_seconds);
      if (!charge.ok) {
        return {
          ok: false,
          kind: "malformed_response",
          status: 201,
          retriable: false,
          operatorAction: true,
          retryAfterSeconds: null,
          attempts,
          reason: charge.reason,
        };
      }
      return { ok: true, charge: charge.charge, attempts, requestBody: body };
    }

    const classification = classify(response.status);
    const retryAfterSeconds =
      response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : null;

    last = {
      ok: false,
      kind: classification.kind,
      status: response.status,
      retriable: classification.retriable,
      operatorAction: classification.operatorAction,
      retryAfterSeconds,
      attempts,
      reason: classification.reason,
    };

    // ⚠️ O ÚNICO lugar onde se decide repetir, e a decisão vem da TABELA,
    // nunca da faixa do código. 422, 404, 409 e 501 saem daqui na primeira
    // tentativa.
    if (!classification.retriable || attempts >= maxAttempts) return last;

    // 429 espera o que ela mandou; 500/503 esperam o recuo. Em nenhum caso
    // a espera é zero.
    await sleep(
      retryAfterSeconds !== null ? retryAfterSeconds * 1000 : backoffMs(attempts),
    );
  }

  // Inalcançável: o laço só sai por `return`. Fica pelo tipo, e nomeado.
  return (
    last ?? {
      ok: false,
      kind: "network",
      status: null,
      retriable: false,
      operatorAction: true,
      retryAfterSeconds: null,
      attempts,
      reason: "Nenhuma tentativa foi feita — `maxAttempts` menor que 1.",
    }
  );
}
