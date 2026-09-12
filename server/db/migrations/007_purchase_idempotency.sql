ALTER TABLE purchases ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_idempotency_key_uq ON purchases(idempotency_key) WHERE idempotency_key IS NOT NULL;
