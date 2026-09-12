ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'wholesale'
    CHECK (customer_type IN ('retail','wholesale','superette','restaurant','distributor')),
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER NOT NULL DEFAULT 0 CHECK (payment_terms_days >= 0),
  ADD COLUMN IF NOT EXISTS custom_prices JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
