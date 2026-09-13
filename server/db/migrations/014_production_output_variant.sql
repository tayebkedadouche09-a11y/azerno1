ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS output_variant_id UUID;

UPDATE production_batches pb
SET output_variant_id = (
  SELECT pv.id
  FROM product_variants pv
  WHERE pv.product_id = pb.product_id
  ORDER BY pv.created_at ASC, pv.id ASC
  LIMIT 1
)
WHERE pb.output_variant_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_batches_output_variant_fk'
      AND conrelid = 'production_batches'::regclass
  ) THEN
    ALTER TABLE production_batches
      ADD CONSTRAINT production_batches_output_variant_fk
      FOREIGN KEY (output_variant_id) REFERENCES product_variants(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_production_batches_output_variant
  ON production_batches(output_variant_id);
