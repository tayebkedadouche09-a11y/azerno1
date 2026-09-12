CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL,
  client_updated_at TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id, created_at DESC);
