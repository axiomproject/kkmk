-- Drop and recreate columns to ensure proper setup
ALTER TABLE report_cards 
  DROP COLUMN IF EXISTS step1_remark,
  DROP COLUMN IF EXISTS step1_remark_date,
  DROP COLUMN IF EXISTS step2_remark,
  DROP COLUMN IF EXISTS step2_remark_date,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS rejection_date;

ALTER TABLE report_cards 
  ADD COLUMN step1_remark TEXT,
  ADD COLUMN step1_remark_date TIMESTAMP,
  ADD COLUMN step2_remark TEXT,
  ADD COLUMN step2_remark_date TIMESTAMP,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN rejection_date TIMESTAMP;

-- Add some constraints to ensure data integrity
ALTER TABLE report_cards
  ALTER COLUMN step1_remark_date DROP NOT NULL,
  ALTER COLUMN step2_remark_date DROP NOT NULL,
  ALTER COLUMN rejection_date DROP NOT NULL;

-- Add a trigger to ensure remarks are set when dates are set
CREATE OR REPLACE FUNCTION ensure_remark_with_date() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.step1_remark_date IS NOT NULL AND NEW.step1_remark IS NULL THEN
    RAISE EXCEPTION 'step1_remark cannot be null when step1_remark_date is set';
  END IF;
  IF NEW.step2_remark_date IS NOT NULL AND NEW.step2_remark IS NULL THEN
    RAISE EXCEPTION 'step2_remark cannot be null when step2_remark_date is set';
  END IF;
  IF NEW.rejection_date IS NOT NULL AND NEW.rejection_reason IS NULL THEN
    RAISE EXCEPTION 'rejection_reason cannot be null when rejection_date is set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_remark_with_date
  BEFORE INSERT OR UPDATE ON report_cards
  FOR EACH ROW
  EXECUTE FUNCTION ensure_remark_with_date();
