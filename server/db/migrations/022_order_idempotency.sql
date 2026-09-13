ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_idempotency ON orders(company_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
