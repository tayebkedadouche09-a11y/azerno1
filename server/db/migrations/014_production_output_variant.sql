ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS output_variant_id UUID;

UPDATE production_batches pb
SET output_variant_id = v.id
FROM LATERAL (
  SELECT id
  FROM product_variants
  WHERE product_id = pb.product_id
  ORDER BY created_at ASC, id ASC
  LIMIT 1
) v
WHERE pb.output_variant_id IS NULL;

ALTER TABLE production_batches
  ADD CONSTRAINT production_batches_output_variant_fk
  FOREIGN KEY (output_variant_id) REFERENCES product_variants(id);

CREATE INDEX IF NOT EXISTS idx_production_batches_output_variant
  ON production_batches(output_variant_id);
