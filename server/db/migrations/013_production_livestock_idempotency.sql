ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS completion_idempotency_key TEXT;

ALTER TABLE livestock_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE feed_records
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'livestock_events'::regclass
      AND conname = 'livestock_events_animal_type_check'
  ) THEN
    ALTER TABLE livestock_events DROP CONSTRAINT livestock_events_animal_type_check;
  END IF;
END $$;

ALTER TABLE livestock_events
  ADD CONSTRAINT livestock_events_animal_type_check
  CHECK (animal_type IN ('cow','goat','sheep','mixed'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_production_batches_idempotency
  ON production_batches(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_production_batches_completion_idempotency
  ON production_batches(completion_idempotency_key)
  WHERE completion_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_livestock_events_idempotency
  ON livestock_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feed_records_idempotency
  ON feed_records(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_production_batches_updated_at
  ON production_batches(updated_at DESC);
