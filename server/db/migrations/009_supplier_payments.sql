CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  note TEXT,
  created_by UUID REFERENCES users(id),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_payments_idempotency_key_uq
  ON supplier_payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase
  ON supplier_payments(purchase_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier
  ON supplier_payments(supplier_id, payment_date DESC);
