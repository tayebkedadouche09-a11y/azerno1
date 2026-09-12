ALTER TABLE product_returns
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS product_returns_idempotency_key_uq
  ON product_returns(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE waste_losses
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS waste_losses_idempotency_key_uq
  ON waste_losses(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
