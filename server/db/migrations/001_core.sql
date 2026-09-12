CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'worker')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  name_ar TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  unit TEXT NOT NULL,
  weight_grams NUMERIC(14,3),
  package_type TEXT,
  retail_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
  wholesale_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  production_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (production_cost >= 0),
  min_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  min_order_qty NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK (min_order_qty > 0),
  expiry_days INTEGER,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  retail_price NUMERIC(14,2) NOT NULL,
  wholesale_price NUMERIC(14,2) NOT NULL,
  production_cost NUMERIC(14,2) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('draft','confirmed','preparing','ready','partially_delivered','delivered','invoiced','partially_paid','paid','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid')),
  delivery_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  delivered_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (delivered_quantity >= 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  variant_id UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('production','sale','order_reservation','delivery','purchase','return','waste','adjustment')),
  quantity NUMERIC(14,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  note TEXT,
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id),
  milk_type TEXT,
  milk_input_liters NUMERIC(14,3),
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  output_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(14,2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS livestock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('purchase','sale','birth','death','loss','feed','veterinary','medicine','other')),
  animal_type TEXT NOT NULL CHECK (animal_type IN ('cow','goat')),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  amount NUMERIC(14,2),
  event_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  loss_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create','update','delete')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON inventory_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_operations_device ON sync_operations(device_id, created_at);
