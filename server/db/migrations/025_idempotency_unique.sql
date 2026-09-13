-- Ensure one-effect retries for order/payment/inventory keys
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_idempotency_key
  ON inventory_movements (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
