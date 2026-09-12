ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory_balances(variant_id, quantity, reserved_quantity);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_created ON production_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livestock_events_date ON livestock_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_losses_date ON waste_losses(loss_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_variant_date ON price_history(variant_id, effective_at DESC);

CREATE OR REPLACE VIEW inventory_available AS
SELECT variant_id, quantity, reserved_quantity, quantity - reserved_quantity AS available_quantity, updated_at
FROM inventory_balances;
