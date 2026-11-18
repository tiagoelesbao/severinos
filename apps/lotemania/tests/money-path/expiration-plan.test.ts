// O plano da varredura de expiração, com volume (LTM-02).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE
//
// A LTM-01 criou um índice PARCIAL para a expiração —
// `product_numbers_status_reserved_until_idx ... WHERE status = 'reserved'`
// — e registrou, no próprio `scripts/ltm01-explain.sql`, que a varredura de
// então NÃO o alcançava: ela filtrava `pn.reserved_until < now()` sem
// filtrar `pn.status`, e índice parcial só é candidato quando o predicado
// dele aparece na consulta. O comentário de lá diz, textualmente, que a
// forma com o predicado "é a forma que a LTM-02 precisa escrever para que o
// índice parcial tenha dono".
//
// A LTM-02 escreveu essa forma. Este teste é a conferência de que escrever
// não bastou — e o resultado é um ACHADO, não uma confirmação. Ver o Dev
// Record da story: com o predicado, o índice passa a ser ALCANÇÁVEL, mas o
// planejador continua (com razão) preferindo entrar por `orders` e saltar
// para `product_numbers` por `order_id`, porque a varredura é por COMPRADOR
// e um comprador tem poucos pedidos. O dono natural do índice parcial é uma
// varredura GLOBAL de reservas vencidas, que este sistema ainda não tem.
//
// Gasta ~200 mil linhas e alguns minutos, então é explícito:
//
//   LTM02_PLAN_MEASURE=1 pnpm test expiration-plan
// ════════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";

import { query, queryOne } from "../helpers/db";

const MEDIR = process.env.LTM02_PLAN_MEASURE === "1";
const RODADAS = Number(process.env.LTM02_PLAN_RODADAS ?? 2000);
const TITULOS = 100;

interface Plano {
  "QUERY PLAN": string;
}

async function explain(label: string, sql: string, params: unknown[]): Promise<string> {
  const rows = await query<Plano>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, params);
  const plano = rows.map((r) => r["QUERY PLAN"]).join("\n");
  console.log(`\n── ${label} ──\n${plano}`);
  return plano;
}

describe.skipIf(!MEDIR)("plano da varredura de expiração", () => {
  it(
    `com ${RODADAS * TITULOS} unidades, a varredura não varre tabela`,
    async () => {
      const slug = `ltm02-plano-${Date.now()}`;
      const tenant = await queryOne<{ id: string }>(
        `INSERT INTO tenants (slug, name) VALUES ($1, $2) RETURNING id`,
        [slug, "Carga de plano LTM-02"],
      );

      await query(
        `INSERT INTO products
           (tenant_id, title, slug, price_per_number, total_numbers, status)
         SELECT $1, 'Rodada ' || g, 'rodada-' || g || '-' || $2, 5.00, $3, 'active'
           FROM generate_series(1, $4::int) AS g`,
        [tenant.id, slug, TITULOS, RODADAS],
      );

      await query(
        `INSERT INTO product_numbers (product_id, number, half)
         SELECT p.id, n, 1
           FROM products p
           CROSS JOIN generate_series(0, $2::int - 1) AS n
          WHERE p.tenant_id = $1`,
        [tenant.id, TITULOS],
      );

      // Um comprador por rodada, com um pedido pendente cada. É a forma
      // real: a varredura é por COMPRADOR, e um comprador tem um ou dois
      // pedidos — não dez mil. Uma carga com um único usuário dono de todos
      // os pedidos mediria um plano que a produção nunca executa.
      await query(
        `INSERT INTO users (tenant_id, phone)
         SELECT $1, '5500' || lpad(g::text, 9, '0')
           FROM generate_series(1, $2::int) AS g`,
        [tenant.id, RODADAS],
      );
      await query(
        `INSERT INTO orders (tenant_id, user_id, product_id, quantity, amount, status)
         SELECT $1, u.id, p.id, 10, '50.00', 'pending'
           FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn
                   FROM products WHERE tenant_id = $1) p
           JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn
                   FROM users WHERE tenant_id = $1) u ON u.rn = p.rn`,
        [tenant.id],
      );
      // Reserva vencida: sem ela a consulta mede plano de conjunto vazio.
      await query(
        `UPDATE product_numbers pn
            SET status = 'reserved', order_id = o.id,
                reserved_until = now() - interval '1 minute'
           FROM orders o
          WHERE o.tenant_id = $1 AND o.product_id = pn.product_id AND pn.number < 10`,
        [tenant.id],
      );

      // Sem ANALYZE o planejador decide sobre estatística velha e o plano
      // medido não vale como evidência (mesma nota da LTM-01).
      await query("ANALYZE products");
      await query("ANALYZE product_numbers");
      await query("ANALYZE orders");
      await query("ANALYZE users");

      const alvo = await queryOne<{ tenant_id: string; user_id: string }>(
        `SELECT tenant_id, user_id FROM orders WHERE tenant_id = $1 LIMIT 1`,
        [tenant.id],
      );

      const totais = await queryOne<{ unidades: string; vencidas: string }>(
        `SELECT
           (SELECT count(*)::text FROM product_numbers pn
              JOIN products p ON p.id = pn.product_id
             WHERE p.tenant_id = $1) AS unidades,
           (SELECT count(*)::text FROM product_numbers pn
              JOIN products p ON p.id = pn.product_id
             WHERE p.tenant_id = $1 AND pn.status = 'reserved'
               AND pn.reserved_until < now()) AS vencidas`,
        [tenant.id],
      );
      console.log(
        `[LTM-02] carga de plano: ${totais.unidades} unidades, ${totais.vencidas} reservas vencidas.`,
      );

      // (1) A varredura COMO ERA (LTM-01 e antes): sem `pn.status`.
      const antes = await explain(
        "varredura ANTES — sem o predicado de status (não alcança o índice parcial)",
        `SELECT o.id
           FROM orders o
           INNER JOIN product_numbers pn ON pn.order_id = o.id
          WHERE o.tenant_id = $1 AND o.user_id = $2 AND o.status = 'pending'
            AND pn.reserved_until < now()
          GROUP BY o.id`,
        [alvo.tenant_id, alvo.user_id],
      );

      // (2) A varredura COMO FICOU (LTM-02): com `pn.status = 'reserved'`.
      const depois = await explain(
        "varredura DEPOIS — com o predicado de status (reserve.ts)",
        `SELECT o.id
           FROM orders o
           INNER JOIN product_numbers pn ON pn.order_id = o.id
          WHERE o.tenant_id = $1 AND o.user_id = $2 AND o.status = 'pending'
            AND pn.status = 'reserved' AND pn.reserved_until < now()
          GROUP BY o.id`,
        [alvo.tenant_id, alvo.user_id],
      );

      // (3) A consulta que o índice parcial de fato serve: varredura
      // GLOBAL de reservas vencidas, sem comprador. Ela NÃO existe no
      // código — é o dono que o índice está esperando, e o registro disto
      // é o achado.
      const global = await explain(
        "varredura GLOBAL de reservas vencidas — a consulta que o índice parcial serve",
        `SELECT pn.id, pn.order_id
           FROM product_numbers pn
          WHERE pn.status = 'reserved' AND pn.reserved_until < now()
          LIMIT 500`,
        [],
      );

      // O que se EXIGE das duas formas da varredura por comprador: nenhuma
      // varredura sequencial de `product_numbers`, que é a tabela que
      // cresce ~900 mil linhas/ano.
      for (const [nome, plano] of [
        ["antes", antes],
        ["depois", depois],
      ] as const) {
        expect(
          /Seq Scan on product_numbers/i.test(plano),
          `a varredura (${nome}) caiu em Seq Scan em product_numbers:\n${plano}`,
        ).toBe(false);
      }

      // E o índice parcial tem de ser usado pela consulta global — se nem
      // ela o usar, ele não tem dono nenhum e a conclusão passa a ser
      // derrubá-lo.
      expect(
        /product_numbers_status_reserved_until_idx/i.test(global),
        `nem a varredura global usou o índice parcial — ele não tem dono:\n${global}`,
      ).toBe(true);

      await query(`DELETE FROM tenants WHERE id = $1`, [tenant.id]);
    },
    600_000,
  );
});
