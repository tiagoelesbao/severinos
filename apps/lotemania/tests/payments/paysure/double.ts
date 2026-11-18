// O dublê HTTP da Paysure (LTM-03b, AC11).
//
// ════════════════════════════════════════════════════════════════════════
// NENHUM TESTE DESTA STORY FALA COM A PAYSURE DE VERDADE
//
// É AC, não cuidado: o `ci`/`cs` do Império não existe neste repositório e
// não vai existir, e um teste que dependesse dele só rodaria para quem
// tivesse a credencial — o que é o oposto do que a `LTM-05` estabeleceu
// ("os testes rodam sem intervenção manual").
//
// Este servidor é `node:http` puro, sobe numa PORTA PRÓPRIA DECLARADA e
// responde o que o teste programar. O `fetch` do cliente de produção não é
// substituído: ele faz uma chamada HTTP de verdade, para 127.0.0.1. O que
// está sob teste é o cliente inteiro, incluindo cabeçalhos, serialização e
// leitura de `Retry-After` — não um dublê de `fetch`.
//
// ⚠️ A PORTA É DECLARADA PELA SUÍTE, e a regra de ondas
// (`.claude/rules/parallel-waves.md`) é a razão: duas tarefas de teste
// subindo dublê na mesma porta colidem, e a colisão aparece como falha
// aleatória num teste que não tem nada a ver. Porta por tarefa, declarada,
// sobreponível por ambiente.
// ════════════════════════════════════════════════════════════════════════

import { createServer, type IncomingMessage, type Server } from "node:http";

/** A porta do dublê desta tarefa. Declarada, não sorteada. */
export const PAYSURE_DOUBLE_PORT = Number(
  process.env.LTM_PAYSURE_DOUBLE_PORT ?? 4471,
);

export interface RecordedRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string | undefined>;
  readonly rawBody: string;
  /** O corpo já interpretado, ou `null` quando não é JSON. */
  readonly body: Record<string, unknown> | null;
}

export interface ProgrammedResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

/** A resposta 201 da Paysure (§4), com valores SINTÉTICOS. */
export function createdResponse(
  overrides: { referenceCode?: string; content?: string } = {},
): ProgrammedResponse {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    status: 201,
    body: {
      qrcode: {
        reference_code: overrides.referenceCode ?? `PSR-sintetico-${suffix}`,
        external_reference: "preenchido-pelo-teste",
        // Não é um BR Code válido de propósito: um BR Code com CRC correto
        // num repositório é um convite a alguém tentar pagá-lo. O que o
        // código faz com ele é tratá-lo como texto opaco, que é tudo o que
        // ele é para nós.
        content: overrides.content ?? `00020126-br-code-sintetico-${suffix}`,
      },
    },
  };
}

export class PaysureDouble {
  readonly requests: RecordedRequest[] = [];
  private server: Server | null = null;
  private queue: ProgrammedResponse[] = [];
  private standing: ProgrammedResponse | null = null;

  get baseUrl(): string {
    return `http://127.0.0.1:${PAYSURE_DOUBLE_PORT}/v1`;
  }

  /** A próxima chamada (e só ela) recebe esta resposta. */
  enqueue(...responses: ProgrammedResponse[]): this {
    this.queue.push(...responses);
    return this;
  }

  /** TODA chamada recebe esta resposta, até o próximo `reset`. */
  always(response: ProgrammedResponse): this {
    this.standing = response;
    return this;
  }

  reset(): void {
    this.requests.length = 0;
    this.queue.length = 0;
    this.standing = null;
  }

  async start(): Promise<void> {
    if (this.server) return;

    const server = createServer((req, res) => {
      void readBody(req).then((rawBody) => {
        let body: Record<string, unknown> | null = null;
        try {
          const parsed = JSON.parse(rawBody);
          body =
            parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : null;
        } catch {
          body = null;
        }

        this.requests.push({
          method: req.method ?? "",
          path: req.url ?? "",
          headers: req.headers as Record<string, string | undefined>,
          rawBody,
          body,
        });

        const programmed =
          this.queue.shift() ??
          this.standing ?? {
            status: 599,
            body: {
              error:
                "O dublê da Paysure recebeu uma chamada que o teste não programou. " +
                "Isto é falha do teste, não do código: um dublê com resposta " +
                "implícita esconde chamada a mais.",
            },
          };

        res.writeHead(programmed.status, {
          "Content-Type": "application/json",
          ...(programmed.headers ?? {}),
        });
        res.end(JSON.stringify(programmed.body ?? {}));
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", (error: NodeJS.ErrnoException) => {
        reject(
          error.code === "EADDRINUSE"
            ? new Error(
                `A porta ${PAYSURE_DOUBLE_PORT} do dublê da Paysure já está em uso. ` +
                  `Ela é declarada por esta tarefa de teste — se outra tarefa a ` +
                  `estiver usando, defina LTM_PAYSURE_DOUBLE_PORT. Ver ` +
                  `.claude/rules/parallel-waves.md.`,
              )
            : error,
        );
      });
      server.listen(PAYSURE_DOUBLE_PORT, "127.0.0.1", () => resolve());
    });

    this.server = server;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /** O último corpo recebido — é sobre ele que o AC10c assere. */
  lastBody(): Record<string, unknown> {
    const last = this.requests.at(-1);
    if (!last) throw new Error("O dublê da Paysure não recebeu nenhuma chamada.");
    if (!last.body) {
      throw new Error(`O dublê recebeu corpo que não é objeto JSON: ${last.rawBody}`);
    }
    return last.body;
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Credencial SINTÉTICA, gerada por execução.
 *
 * ⚠️ Nunca um literal fixo, nem um valor "de exemplo" com a forma da
 * credencial real. O AC11 exige que uma varredura nos artefatos da story
 * não encontre credencial — e o jeito de garantir isso é não haver nenhuma
 * string de credencial neste repositório, nem parecida.
 */
export function syntheticCredentials(): { ci: string; cs: string } {
  const salt = Math.random().toString(36).slice(2, 10);
  return { ci: `ci-de-teste-${salt}`, cs: `cs-de-teste-${salt}` };
}
