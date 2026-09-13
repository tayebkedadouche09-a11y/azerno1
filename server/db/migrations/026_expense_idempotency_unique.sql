CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_idempotency_key
  ON expenses (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
