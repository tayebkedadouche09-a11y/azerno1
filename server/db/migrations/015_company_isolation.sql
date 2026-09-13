CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_memberships (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

INSERT INTO companies(name, slug)
VALUES ('AZRNOU Entreprise', 'azrnou-default')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO company_memberships(company_id, user_id, role)
SELECT c.id, u.id, u.role
FROM companies c
CROSS JOIN users u
WHERE c.slug='azrnou-default'
ON CONFLICT (company_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE v TEXT;
BEGIN
  v := current_setting('app.company_id', true);
  IF v IS NULL OR btrim(v) = '' THEN RETURN NULL; END IF;
  RETURN v::UUID;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','suppliers','product_categories','products','product_variants','price_history',
    'orders','order_items','inventory_balances','inventory_movements','payments','expenses',
    'deliveries','delivery_items','invoices','invoice_items','purchases','purchase_items',
    'product_returns','feed_records','notifications','production_batches','livestock_events',
    'waste_losses','supplier_payments','audit_logs','sync_operations','app_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id UUID', t);
  END LOOP;
END $$;

UPDATE customers SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE suppliers SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE product_categories SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE products SET company_id=COALESCE(company_id,(SELECT company_id FROM product_categories pc WHERE pc.id=products.category_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE product_variants SET company_id=COALESCE(company_id,(SELECT company_id FROM products p WHERE p.id=product_variants.product_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE price_history SET company_id=COALESCE(company_id,(SELECT company_id FROM product_variants pv WHERE pv.id=price_history.variant_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE orders SET company_id=COALESCE(company_id,(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE order_items SET company_id=COALESCE(company_id,(SELECT company_id FROM orders o WHERE o.id=order_items.order_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE inventory_balances SET company_id=COALESCE(company_id,(SELECT company_id FROM product_variants pv WHERE pv.id=inventory_balances.variant_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE inventory_movements SET company_id=COALESCE(company_id,(SELECT company_id FROM product_variants pv WHERE pv.id=inventory_movements.variant_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE payments SET company_id=COALESCE(company_id,(SELECT company_id FROM orders o WHERE o.id=payments.order_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE expenses SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE deliveries SET company_id=COALESCE(company_id,(SELECT company_id FROM orders o WHERE o.id=deliveries.order_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE delivery_items SET company_id=COALESCE(company_id,(SELECT company_id FROM deliveries d WHERE d.id=delivery_items.delivery_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE invoices SET company_id=COALESCE(company_id,(SELECT company_id FROM orders o WHERE o.id=invoices.order_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE invoice_items SET company_id=COALESCE(company_id,(SELECT company_id FROM invoices i WHERE i.id=invoice_items.invoice_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE purchases SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE purchase_items SET company_id=COALESCE(company_id,(SELECT company_id FROM purchases p WHERE p.id=purchase_items.purchase_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE product_returns SET company_id=COALESCE(company_id,(SELECT company_id FROM orders o WHERE o.id=product_returns.order_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE feed_records SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE notifications SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE production_batches SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE livestock_events SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE waste_losses SET company_id=COALESCE(company_id,(SELECT company_id FROM product_variants pv WHERE pv.id=waste_losses.variant_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE supplier_payments SET company_id=COALESCE(company_id,(SELECT company_id FROM purchases p WHERE p.id=supplier_payments.purchase_id),(SELECT id FROM companies WHERE slug='azrnou-default')) WHERE company_id IS NULL;
UPDATE audit_logs SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE sync_operations SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
UPDATE app_settings SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','suppliers','product_categories','products','product_variants','price_history',
    'orders','order_items','inventory_balances','inventory_movements','payments','expenses',
    'deliveries','delivery_items','invoices','invoice_items','purchases','purchase_items',
    'product_returns','feed_records','notifications','production_batches','livestock_events',
    'waste_losses','supplier_payments','audit_logs','sync_operations','app_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET DEFAULT current_company_id()', t);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT', t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I_company_idx ON %I(company_id)', t, t);
  END LOOP;
END $$;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE sessions SET company_id=(SELECT id FROM companies WHERE slug='azrnou-default') WHERE company_id IS NULL;
ALTER TABLE sessions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_company ON sessions(company_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='product_variants'::regclass AND conname='product_variants_sku_key') THEN
    ALTER TABLE product_variants DROP CONSTRAINT product_variants_sku_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='product_variants'::regclass AND conname='product_variants_barcode_key') THEN
    ALTER TABLE product_variants DROP CONSTRAINT product_variants_barcode_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='orders'::regclass AND conname='orders_number_key') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_number_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='deliveries'::regclass AND conname='deliveries_number_key') THEN
    ALTER TABLE deliveries DROP CONSTRAINT deliveries_number_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='invoices'::regclass AND conname='invoices_number_key') THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_number_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='purchases'::regclass AND conname='purchases_number_key') THEN
    ALTER TABLE purchases DROP CONSTRAINT purchases_number_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='production_batches'::regclass AND conname='production_batches_batch_number_key') THEN
    ALTER TABLE production_batches DROP CONSTRAINT production_batches_batch_number_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_company_sku ON product_variants(company_id, sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_company_barcode ON product_variants(company_id, barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_number ON orders(company_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_company_number ON deliveries(company_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_company_number ON invoices(company_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_company_number ON purchases(company_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_production_company_batch_number ON production_batches(company_id, batch_number);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','suppliers','product_categories','products','product_variants','price_history',
    'orders','order_items','inventory_balances','inventory_movements','payments','expenses',
    'deliveries','delivery_items','invoices','invoice_items','purchases','purchase_items',
    'product_returns','feed_records','notifications','production_batches','livestock_events',
    'waste_losses','supplier_payments','audit_logs','sync_operations','app_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_company_isolation ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_company_isolation ON %I USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id())', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_memberships_user ON company_memberships(user_id);
