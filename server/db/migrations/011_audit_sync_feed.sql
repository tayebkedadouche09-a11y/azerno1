-- Make normal online mutations visible to offline clients.
-- Most transactional business mutations already write audit_logs; this trigger turns
-- those audit entries into durable sync-feed events without changing the business rows.

CREATE OR REPLACE FUNCTION enqueue_audit_sync_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
    'audit:' || NEW.id::text,
    NEW.entity_type,
    NEW.entity_id,
    CASE
      WHEN NEW.action = 'delete' THEN 'delete'
      ELSE 'update'
    END,
    jsonb_build_object(
      'source', 'audit_log',
      'auditId', NEW.id,
      'action', NEW.action,
      'before', NEW.before_data,
      'after', NEW.after_data,
      'createdAt', NEW.created_at
    ),
    'applied',
    NEW.created_at
  )
  ON CONFLICT (operation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_sync_feed ON audit_logs;

CREATE TRIGGER trg_audit_logs_sync_feed
AFTER INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION enqueue_audit_sync_event();
