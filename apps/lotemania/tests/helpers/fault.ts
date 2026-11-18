// Injeção de falha pelo lado do BANCO (LTM-02, AC5 e AC6).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE NÃO É MOCK, E POR QUE NÃO É `vi.spyOn`
//
// Os ACs 5 e 6 pedem prova de que uma falha NO MEIO da operação não deixa
// escrita parcial. Simular essa falha por dentro (mock do `db`, espião numa
// função) provaria o comportamento do dublê, não o do Postgres — e o que
// está em jogo é exatamente o que o Postgres faz com uma transação
// interrompida.
//
// Então a falha é real e vem de fora do código sob teste, por dois
// mecanismos:
//
//   1. GATILHO QUE LEVANTA EXCEÇÃO numa tabela específica. A transação do
//      app chega lá no meio do caminho, o banco recusa, e o que sobra (ou
//      não sobra) é o que se verifica. Determinístico: não depende de
//      tempo nem de ordem de escalonamento.
//
//   2. DERRUBAR O BACKEND com `pg_terminate_backend`, enquanto a transação
//      do app está parada esperando um lock que a suíte segura. Também
//      determinístico — a espera pelo lock é o que garante que a execução
//      está exatamente entre a inserção do pedido e a tomada das unidades.
// ════════════════════════════════════════════════════════════════════════

import { query, testPool } from "./db";

/**
 * Instala um gatilho que faz TODA escrita da operação indicada falhar,
 * roda `fn`, e desinstala o gatilho — mesmo que `fn` lance.
 *
 * `when` é o evento do gatilho (`BEFORE UPDATE`, `BEFORE INSERT`); `onlyIf`
 * é uma condição em SQL sobre `NEW`, para a falha atingir só a escrita que
 * interessa e não qualquer tráfego da suíte.
 */
export async function withFailingWrite<T>(
  opts: { table: string; when: string; onlyIf?: string; label?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const id = `ltm02_falha_${Math.random().toString(36).slice(2, 10)}`;
  const guard = opts.onlyIf ? `IF ${opts.onlyIf} THEN` : "IF true THEN";
  const message = opts.label ?? `falha injetada pela suite (${opts.table})`;

  await query(
    `CREATE FUNCTION ${id}() RETURNS trigger AS $$
     BEGIN
       ${guard}
         RAISE EXCEPTION '${message}';
       END IF;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql`,
  );
  await query(
    `CREATE TRIGGER ${id} ${opts.when} ON ${opts.table}
       FOR EACH ROW EXECUTE FUNCTION ${id}()`,
  );

  try {
    return await fn();
  } finally {
    await query(`DROP TRIGGER IF EXISTS ${id} ON ${opts.table}`);
    await query(`DROP FUNCTION IF EXISTS ${id}()`);
  }
}

/**
 * A cadeia de mensagens de um erro, da camada de cima até a causa raiz.
 *
 * Existe porque o Drizzle EMBRULHA o erro do banco: o que chega ao chamador
 * é `Failed query: update "orders" ...`, e a mensagem do gatilho — a razão
 * de verdade — fica no `cause`. Asserção feita só na camada de cima passaria
 * a verificar a sintaxe da consulta em vez da falha injetada.
 */
export function errorChain(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current instanceof Error && messages.length < 10) {
    messages.push(current.message);
    current = current.cause;
  }
  if (messages.length === 0) messages.push(String(error));
  return messages.join(" | ");
}

/**
 * Roda a promessa e devolve o resultado JÁ ASSENTADO.
 *
 * O `then` aqui não é estilo: ele anexa o tratamento de rejeição de forma
 * SÍNCRONA. Guardar a promessa e só dar `await` depois (o que o AC5 precisa
 * fazer, porque entre o disparo e a conferência a suíte ainda derruba o
 * backend) deixa a rejeição sem tratador por alguns milissegundos, e o
 * Vitest conta isso como "unhandled rejection" — que reprova a execução
 * inteira mesmo com todos os testes verdes.
 */
export function settle<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}

export interface HeldLock {
  release: () => Promise<void>;
}

/**
 * Segura um lock de escrita sobre unidades vendáveis, numa conexão própria
 * da suíte, até que `release` seja chamado.
 *
 * É o que torna o AC5 determinístico: com estas linhas travadas, a
 * transação da reserva FICA PARADA no `FOR UPDATE` da tomada das unidades —
 * isto é, depois de inserir o pedido e antes de tomar as unidades, que é
 * exatamente o ponto onde o AC pede que a conexão morra.
 */
export async function holdUnitLock(
  productId: string,
  numbers: number[],
): Promise<HeldLock> {
  const client = await testPool().connect();
  await client.query("BEGIN");
  await client.query(
    `SELECT id FROM product_numbers
      WHERE product_id = $1 AND number = ANY($2::int[])
      ORDER BY number, half
      FOR UPDATE`,
    [productId, numbers],
  );
  return {
    release: async () => {
      try {
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Espera que apareça um backend BLOQUEADO por lock sobre `product_numbers`
 * e o derruba. Devolve o pid derrubado.
 *
 * A espera é por estado observável (`wait_event_type = 'Lock'`), não por
 * `setTimeout` com número escolhido a dedo: teste de concorrência que
 * depende de dormir o tempo certo é teste intermitente.
 */
export async function terminateBackendBlockedOn(
  tableFragment: string,
  timeoutMs = 30_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const blocked = await query<{ pid: number }>(
      `SELECT pid FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock'
          AND query ILIKE '%' || $1 || '%'
        LIMIT 1`,
      [tableFragment],
    );
    if (blocked.length === 1) {
      await query(`SELECT pg_terminate_backend($1)`, [blocked[0].pid]);
      return blocked[0].pid;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Nenhum backend ficou bloqueado em lock sobre "${tableFragment}" em ${timeoutMs} ms. ` +
      `Sem o bloqueio, o AC5 não teria onde cortar a conexão — o teste não sabe ` +
      `se o estado é bom ou se a armadilha não armou, e por isso falha em vez de passar.`,
  );
}
