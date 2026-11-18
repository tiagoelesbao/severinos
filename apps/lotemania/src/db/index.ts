// A conexão do app com o Postgres (Neon).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE NÃO É MAIS `neon-http` (LTM-02)
//
// `drizzle-orm/neon-http` fala HTTP: cada consulta é uma requisição
// independente, SEM sessão. Transação interativa exige sessão — e sem ela
// `db.transaction()` não existe como opção, o que é a causa raiz de o
// caminho do dinheiro inteiro ser feito de escritas soltas com compensação
// à mão (o pedido nascia, as unidades eram tomadas depois, e um `catch`
// manual tentava desfazer).
//
// `neon-serverless` com `Pool` fala WebSocket e mantém a sessão. É o único
// caminho para transação interativa mantendo Neon.
//
// ⚠️ RESTRIÇÃO DE RUNTIME (AC7). Este módulo é de runtime NODE. O driver
// WebSocket usa o pacote `ws`, que não existe no Edge Runtime — então
// `@/db` NÃO pode ser importado de middleware, de rota com
// `export const runtime = "edge"` nem de Edge Function. Todas as server
// actions e rotas de API deste app rodam em Node, que é o padrão do Next, e
// o smoke do AC7 foi feito em `next build` + `next start`.
// ════════════════════════════════════════════════════════════════════════

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// Node tem `WebSocket` global desde a 22, mas o app roda também onde a
// plataforma escolhe a versão do Node, e um `undefined` aqui só apareceria
// na primeira consulta. Declarar o construtor é determinístico e é o que a
// documentação do driver manda fazer fora do browser.
neonConfig.webSocketConstructor = ws;

// Teto de conexões — explícito de propósito (AC8).
//
// Rota de servidor do Next cria e descarta contexto com frequência, e pool
// sem teto em plataforma serverless esgota a conexão do Neon com 5 rodadas
// simultâneas esgotando. O número é configuração, não padrão implícito: 10
// é o que a medição do AC8 usou (200 reservas sequenciais mantiveram as
// conexões abaixo do teto).
const DEFAULT_POOL_MAX = 10;

function resolvePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (!raw) return DEFAULT_POOL_MAX;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `DATABASE_POOL_MAX="${raw}" não é um inteiro >= 1. ` +
        `Deixe a variável vazia para usar o padrão (${DEFAULT_POOL_MAX}).`,
    );
  }
  return parsed;
}

/**
 * Nome com que as conexões do app aparecem em `pg_stat_activity`.
 *
 * Não é enfeite: sem ele, toda conexão do projeto aparece com o nome do
 * driver e fica indistinguível da de qualquer script, migração ou suíte
 * apontada para a mesma base — e a medição do AC8 ("as conexões abertas
 * ficam abaixo do teto") não teria o que contar.
 */
export const DB_APPLICATION_NAME = "lotemania";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: DB_APPLICATION_NAME,
  max: resolvePoolMax(),
  // Conexão ociosa custa slot no Neon; 30 s é mais que suficiente para
  // aproveitar a sessão entre duas requisições do mesmo visitante.
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

// Conexão ociosa derrubada pelo outro lado (o Neon fecha socket parado, e a
// suíte da LTM-02 derruba o backend de propósito para provar o AC5) emite
// `error` no pool. Sem este ouvinte o Node trata como exceção não tratada e
// derruba o processo inteiro — o servidor cairia por causa de uma conexão
// que ninguém estava usando.
pool.on("error", (error: Error) => {
  console.error("[db] conexão do pool caiu fora de uso:", error.message);
});

// E o mesmo cuidado para a conexão EM USO. O ouvinte acima só pega conexão
// ociosa; se o backend morre no meio de uma transação — reinício do Neon,
// `pg_terminate_backend`, rede caindo —, o erro é emitido na conexão, e sem
// ouvinte o Node o trata como exceção não tratada e derruba o processo.
// Medido ao escrever o AC5 desta story, que derruba o backend de propósito:
// a transação tem de falhar para QUEM A CHAMOU, não matar o servidor.
pool.on("connect", (client: PoolClient) => {
  client.on("error", (error: Error) => {
    console.error("[db] conexão em uso caiu:", error.message);
  });
});

export const db = drizzle(pool, { schema });
