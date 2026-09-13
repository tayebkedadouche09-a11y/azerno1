-- Fix server-side sync feed: company_id is required after isolation migration
CREATE OR REPLACE FUNCTION enqueue_core_sync_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  entity_type_value TEXT;
  entity_id_value UUID;
  payload_value JSONB;
  company_id_value UUID;
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
    BEGIN
      company_id_value := OLD.company_id;
    EXCEPTION WHEN undefined_column THEN
      company_id_value := NULL;
    END;
  ELSE
    entity_id_value := NEW.id;
    payload_value := jsonb_build_object('source','table_trigger','action',lower(TG_OP),'after',to_jsonb(NEW));
    BEGIN
      company_id_value := NEW.company_id;
    EXCEPTION WHEN undefined_column THEN
      company_id_value := NULL;
    END;
  END IF;

  IF company_id_value IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO sync_operations(
    device_id,
    operation_id,
    entity_type,
    entity_id,
    operation_type,
    payload,
    status,
    applied_at,
    company_id
  )
  VALUES (
    'server',
    'table:' || TG_TABLE_NAME || ':' || entity_id_value::text || ':' || extract(epoch FROM clock_timestamp())::text,
    entity_type_value,
    entity_id_value,
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END,
    payload_value,
    'applied',
    NOW(),
    company_id_value
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
