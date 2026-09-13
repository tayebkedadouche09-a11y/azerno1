DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid='feed_records'::regclass
      AND conname='feed_records_animal_type_check'
  ) THEN
    ALTER TABLE feed_records DROP CONSTRAINT feed_records_animal_type_check;
  END IF;
END $$;

ALTER TABLE feed_records
  ADD CONSTRAINT feed_records_animal_type_check
  CHECK (animal_type IN ('cow','goat','sheep','mixed'));
