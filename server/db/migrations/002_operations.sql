CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  number TEXT NOT NULL UNIQUE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('pending','partially_delivered','delivered','cancelled')),
  delivery_person TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('unpaid','partially_paid','paid','cancelled')) DEFAULT 'unpaid',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  description TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0)
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('draft','confirmed','received','cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  description TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS product_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'resalable' CHECK (condition IN ('resalable','damaged','expired')),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_type TEXT NOT NULL CHECK (animal_type IN ('cow','goat','mixed')),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  supplier_id UUID REFERENCES suppliers(id),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
