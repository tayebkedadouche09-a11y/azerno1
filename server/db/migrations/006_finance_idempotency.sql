ALTER TABLE expenses ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_idempotency_key_uq ON expenses(idempotency_key) WHERE idempotency_key IS NOT NULL;
