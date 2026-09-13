ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_company_idempotency ON deliveries(company_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_company_idempotency ON invoices(company_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
