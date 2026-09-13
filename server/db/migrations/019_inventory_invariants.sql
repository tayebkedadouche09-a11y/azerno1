ALTER TABLE inventory_balances
  ADD CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0) NOT VALID,
  ADD CONSTRAINT inventory_reserved_non_negative CHECK (reserved_quantity >= 0) NOT VALID,
  ADD CONSTRAINT inventory_reserved_not_above_quantity CHECK (reserved_quantity <= quantity) NOT VALID;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movement_quantity_finite CHECK (quantity <> 'NaN'::numeric) NOT VALID;
