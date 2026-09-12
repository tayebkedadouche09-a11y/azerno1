-- Cover core CRUD paths that do not currently emit audit_logs.
-- The sync client uses these durable events to invalidate/reload its local cache.

CREATE OR REPLACE FUNCTION enqueue_core_sync_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  entity_type_value TEXT;
  entity_id_value UUID;
  payload_value JSONB;
BEGIN
  entity_type_value := CASE TG_TABLE_NAME
    WHEN 'customers' THEN 'customer'
    WHEN 'suppliers' THEN 'supplier'
    WHEN 'products' THEN 'product'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    entity_id_value := OLD.id;
    payload_value := jsonb_build_object('source','table_trigger','action','delete','before',to_jsonb(OLD));
  ELSE
    entity_id_value := NEW.id;
    payload_value := jsonb_build_object('source','table_trigger','action',lower(TG_OP),'after',to_jsonb(NEW));
  END IF;

  INSERT INTO sync_operations(
    device_id,
    operation_id,
    entity_type,
    entity_id,
    operation_type,
    payload,
    status,
    applied_at
  )
  VALUES (
    'server',
    'table:' || TG_TABLE_NAME || ':' || entity_id_value::text || ':' || extract(epoch FROM clock_timestamp())::text,
    entity_type_value,
    entity_id_value,
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END,
    payload_value,
    'applied',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_sync_feed ON customers;
CREATE TRIGGER trg_customers_sync_feed
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION enqueue_core_sync_event();

DROP TRIGGER IF EXISTS trg_suppliers_sync_feed ON suppliers;
CREATE TRIGGER trg_suppliers_sync_feed
AFTER INSERT OR UPDATE OR DELETE ON suppliers
FOR EACH ROW EXECUTE FUNCTION enqueue_core_sync_event();

DROP TRIGGER IF EXISTS trg_products_sync_feed ON products;
CREATE TRIGGER trg_products_sync_feed
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION enqueue_core_sync_event();
