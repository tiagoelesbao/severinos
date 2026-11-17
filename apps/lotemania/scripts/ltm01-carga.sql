-- Carga de teste de PLANO para a LTM-01 — não é seed de aplicação.
--
-- O que ela existe para provar: que o custo de uma reserva parou de
-- acompanhar o tamanho da tabela (AC2, AC3, AC5). Por isso o volume
-- importa e o conteúdo não: títulos sem comprador real, com um pedido
-- pendente e vencido por rodada, que é o estado que a varredura de
-- expiração procura.
--
-- Pré-requisito: a migração `drizzle/0000_baseline_schema.sql` aplicada.
-- Sem os índices dela, esta carga mede o "antes" — que também é
-- evidência pedida pelo AC2 (plano com Seq Scan).
--
-- Como rodar:
--   psql "$DATABASE_URL" -f scripts/ltm01-carga.sql
--   psql "$DATABASE_URL" -f scripts/ltm01-explain.sql
--
-- NUNCA contra o banco de produção: o script cria ~1 milhão de linhas e
-- apaga, no começo, tudo que pertence ao tenant `ltm01-carga`.

\timing on

-- Idempotência: o cascade de tenant_id leva embora products,
-- product_numbers, orders e users desta carga, e só desta.
DELETE FROM tenants WHERE slug = 'ltm01-carga';

DO $$
DECLARE
  -- 10.000 rodadas x 100 títulos x 1 metade = 1.000.000 de linhas (AC2/AC5).
  -- Para a base pequena do AC3, rode de novo com qtd_rodadas := 100.
  qtd_rodadas          int     := 10000;
  titulos_por_rodada   int     := 100;
  -- true => duas linhas por título (sorteio divisível, ADR-0001), o que
  -- dobra product_numbers. O AC3 mede invariância de escala, então vale a
  -- pena rodar as duas formas.
  divisivel            boolean := false;
  t_id uuid;
  u_id uuid;
BEGIN
  INSERT INTO tenants (slug, name)
  VALUES ('ltm01-carga', 'Carga de plano LTM-01')
  RETURNING id INTO t_id;

  INSERT INTO users (tenant_id, phone)
  VALUES (t_id, '+550000000000')
  RETURNING id INTO u_id;

  INSERT INTO products
    (tenant_id, title, slug, price_per_number, total_numbers, status, is_divisible)
  SELECT t_id,
         'Rodada ' || g,
         'rodada-' || g,
         5.00,
         titulos_por_rodada,
         'active',
         divisivel
    FROM generate_series(1, qtd_rodadas) AS g;

  -- Inserção em massa, não linha a linha: é o que torna 1 milhão viável.
  INSERT INTO product_numbers (product_id, number, half)
  SELECT p.id, n, h
    FROM products p
    CROSS JOIN generate_series(1, titulos_por_rodada) AS n
    CROSS JOIN generate_series(1, CASE WHEN divisivel THEN 2 ELSE 1 END) AS h
   WHERE p.tenant_id = t_id;

  -- Um pedido pendente por rodada. Quantidade em UNIDADES do sorteio
  -- (ADR-0001): metades em sorteio divisível, títulos em cota inteira.
  INSERT INTO orders (tenant_id, user_id, product_id, quantity, amount, status)
  SELECT t_id,
         u_id,
         p.id,
         10 * CASE WHEN divisivel THEN 2 ELSE 1 END,
         50.00,
         'pending'
    FROM products p
   WHERE p.tenant_id = t_id;

  -- Reserva vencida há um minuto: sem isto, a consulta de expiração do
  -- AC5 não tem nada para encontrar e o plano medido é de conjunto vazio.
  UPDATE product_numbers pn
     SET status = 'reserved',
         order_id = o.id,
         reserved_until = now() - interval '1 minute'
    FROM orders o
   WHERE o.tenant_id = t_id
     AND o.product_id = pn.product_id
     AND pn.number <= 10;
END $$;

-- Sem ANALYZE o planejador decide sobre estatística velha, e o EXPLAIN
-- medido a seguir não vale como evidência.
ANALYZE products;
ANALYZE product_numbers;
ANALYZE orders;

SELECT
  (SELECT count(*) FROM product_numbers pn
     JOIN products p ON p.id = pn.product_id
     JOIN tenants t ON t.id = p.tenant_id
    WHERE t.slug = 'ltm01-carga')                      AS linhas_product_numbers,
  (SELECT count(*) FROM orders o
     JOIN tenants t ON t.id = o.tenant_id
    WHERE t.slug = 'ltm01-carga')                      AS pedidos,
  (SELECT count(*) FROM product_numbers
    WHERE status = 'reserved' AND reserved_until < now()) AS reservas_vencidas;
