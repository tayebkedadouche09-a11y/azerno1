CREATE OR REPLACE FUNCTION enforce_same_company(parent_table TEXT, parent_id UUID, child_company UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE parent_company UUID;
BEGIN
  IF parent_id IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT company_id FROM %I WHERE id=$1', parent_table) INTO parent_company USING parent_id;
  IF parent_company IS NULL THEN
    RAISE EXCEPTION 'Referenced % has no visible company row: %', parent_table, parent_id USING ERRCODE='23503';
  END IF;
  IF parent_company <> child_company THEN
    RAISE EXCEPTION 'Cross-company reference to % %', parent_table, parent_id USING ERRCODE='23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_company_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME='products' THEN
    PERFORM enforce_same_company('product_categories', NEW.category_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='product_variants' THEN
    PERFORM enforce_same_company('products', NEW.product_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='price_history' THEN
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='orders' THEN
    PERFORM enforce_same_company('customers', NEW.customer_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='order_items' THEN
    PERFORM enforce_same_company('orders', NEW.order_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='inventory_balances' THEN
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='inventory_movements' THEN
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='payments' THEN
    PERFORM enforce_same_company('customers', NEW.customer_id, NEW.company_id);
    PERFORM enforce_same_company('orders', NEW.order_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='expenses' THEN
    PERFORM enforce_same_company('suppliers', NEW.supplier_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='deliveries' THEN
    PERFORM enforce_same_company('orders', NEW.order_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='delivery_items' THEN
    PERFORM enforce_same_company('deliveries', NEW.delivery_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='invoices' THEN
    PERFORM enforce_same_company('orders', NEW.order_id, NEW.company_id);
    PERFORM enforce_same_company('customers', NEW.customer_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='invoice_items' THEN
    PERFORM enforce_same_company('invoices', NEW.invoice_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='purchases' THEN
    PERFORM enforce_same_company('suppliers', NEW.supplier_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='purchase_items' THEN
    PERFORM enforce_same_company('purchases', NEW.purchase_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='product_returns' THEN
    PERFORM enforce_same_company('orders', NEW.order_id, NEW.company_id);
    PERFORM enforce_same_company('customers', NEW.customer_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='feed_records' THEN
    PERFORM enforce_same_company('suppliers', NEW.supplier_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='production_batches' THEN
    PERFORM enforce_same_company('products', NEW.product_id, NEW.company_id);
    PERFORM enforce_same_company('product_variants', NEW.output_variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='waste_losses' THEN
    PERFORM enforce_same_company('product_variants', NEW.variant_id, NEW.company_id);
  ELSIF TG_TABLE_NAME='supplier_payments' THEN
    PERFORM enforce_same_company('purchases', NEW.purchase_id, NEW.company_id);
    PERFORM enforce_same_company('suppliers', NEW.supplier_id, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','product_variants','price_history','orders','order_items','inventory_balances','inventory_movements',
    'payments','expenses','deliveries','delivery_items','invoices','invoice_items','purchases','purchase_items',
    'product_returns','feed_records','production_batches','waste_losses','supplier_payments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_company_relationships ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_company_relationships BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_company_relationships()', t, t);
  END LOOP;
END $$;
