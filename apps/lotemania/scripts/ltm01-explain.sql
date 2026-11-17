-- Prova de plano da LTM-01 — AC2, AC3, AC4 e AC5.
--
-- Cada consulta aqui é a consulta real do código, com o arquivo e a linha
-- que a emite. Se alguma divergir do código, a evidência não vale: é a
-- consulta do código que tem de rodar por índice, não uma parecida.
--
-- Rodar depois de `scripts/ltm01-carga.sql`:
--   psql "$DATABASE_URL" -f scripts/ltm01-explain.sql
--
-- Para a evidência do "antes" exigida pelo AC2, rodar contra uma base sem
-- a migração 0000 aplicada (ou com os quatro índices derrubados). O
-- esperado ali é Seq Scan em product_numbers.
--
-- Os blocos que escrevem estão em BEGIN/ROLLBACK: EXPLAIN ANALYZE de um
-- UPDATE executa o UPDATE de verdade.

\timing on
\set ON_ERROR_STOP on

SELECT id AS pid FROM products WHERE slug = 'rodada-5000' \gset
SELECT t.id AS tid, u.id AS uid
  FROM tenants t
  JOIN users u ON u.tenant_id = t.id
 WHERE t.slug = 'ltm01-carga'
 LIMIT 1 \gset
SELECT id AS oid FROM orders WHERE tenant_id = :'tid' LIMIT 1 \gset

\echo '=== AC2 — reserva: product_id + 10 numeros + status (reserve.ts:147-161) ==='
\echo '=== espera: Index Scan ou Bitmap Index Scan em product_numbers_product_number_half_idx; proibido: Seq Scan ==='
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE product_numbers
   SET status = 'reserved',
       order_id = :'oid',
       reserved_until = now() + interval '15 minutes'
 WHERE product_id = :'pid'
   AND number IN (11,12,13,14,15,16,17,18,19,20)
   AND status = 'available';
ROLLBACK;

\echo '=== AC2 (forma da LTM-02) — reserva endereçando a UNIDADE VENDAVEL, nao o numero ==='
\echo '=== ADR-0001: com duas linhas por numero, um WHERE por numero reserva as duas ==='
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE product_numbers
   SET status = 'reserved',
       order_id = :'oid',
       reserved_until = now() + interval '15 minutes'
 WHERE product_id = :'pid'
   AND (number, half) IN ((11,1),(12,1),(13,1),(14,1),(15,1),(16,1),(17,1),(18,1),(19,1),(20,1))
   AND status = 'available';
ROLLBACK;

\echo '=== AC4 — desfazer reserva por order_id (reserve.ts:163-167) ==='
\echo '=== dono do indice product_numbers_order_idx; espera Index Scan ==='
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE product_numbers
   SET status = 'available', order_id = NULL, reserved_until = NULL
 WHERE order_id = :'oid';
ROLLBACK;

\echo '=== AC4 — pagamento por order_id (checkout.ts:19-22) ==='
\echo '=== o mesmo indice product_numbers_order_idx, segundo consumidor ==='
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE product_numbers SET status = 'sold' WHERE order_id = :'oid';
ROLLBACK;

\echo '=== AC5 — varredura de expiracao, orders x product_numbers (reserve.ts:34-46) ==='
\echo '=== proibido: Seq Scan nas DUAS tabelas. orders por orders_tenant_user_status_idx, product_numbers por product_numbers_order_idx ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id
  FROM orders o
  INNER JOIN product_numbers pn ON pn.order_id = o.id
 WHERE o.tenant_id = :'tid'
   AND o.user_id = :'uid'
   AND o.status = 'pending'
   AND pn.reserved_until < now()
 GROUP BY o.id;

\echo '=== AC4 — o indice parcial de expiracao so e alcancavel com o predicado de status ==='
\echo '=== ATENCAO: reserve.ts:34-46 NAO filtra pn.status, entao NAO alcanca este indice. ==='
\echo '=== Esta consulta e a forma que a LTM-02 precisa escrever para que o indice parcial tenha dono. ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT pn.id, pn.order_id
  FROM product_numbers pn
 WHERE pn.status = 'reserved'
   AND pn.reserved_until < now()
 LIMIT 500;

\echo '=== AC7 — os indices que a migracao 0000 produziu ==='
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename IN ('product_numbers', 'orders')
 ORDER BY tablename, indexname;

\echo '=== AC1 — a invariante, sem depender da suite da LTM-05 ==='
-- O primeiro caso ESPERA erro, então o script para de abortar aqui. Isto
-- não substitui o AC1, que pede teste automatizado na base da LTM-05 — é
-- a conferência manual que cabe antes dela existir.
\set ON_ERROR_STOP off
\echo '=== 1) mesma (product_id, number, half) deve FALHAR com unique violation ==='
BEGIN;
INSERT INTO product_numbers (product_id, number, half) VALUES (:'pid', 777, 1);
INSERT INTO product_numbers (product_id, number, half) VALUES (:'pid', 777, 1);
ROLLBACK;
\echo '=== 2) mesmo (product_id, number) com half diferente deve PASSAR — e o estado correto do sorteio divisivel ==='
BEGIN;
INSERT INTO product_numbers (product_id, number, half) VALUES (:'pid', 778, 1);
INSERT INTO product_numbers (product_id, number, half) VALUES (:'pid', 778, 2);
SELECT count(*) AS deve_ser_2 FROM product_numbers WHERE product_id = :'pid' AND number = 778;
ROLLBACK;
