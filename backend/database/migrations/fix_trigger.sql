-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_remark_with_date ON report_cards;
DROP FUNCTION IF EXISTS ensure_remark_with_date();

-- Create new function with proper null handling
CREATE OR REPLACE FUNCTION ensure_remark_with_date() RETURNS TRIGGER AS $$
BEGIN
  -- Set remark date only when remark is not null
  IF NEW.step1_remark IS NOT NULL AND NEW.step1_remark_date IS NULL THEN
    NEW.step1_remark_date = CURRENT_TIMESTAMP;
  END IF;
  
  IF NEW.step2_remark IS NOT NULL AND NEW.step2_remark_date IS NULL THEN
    NEW.step2_remark_date = CURRENT_TIMESTAMP;
  END IF;
  
  IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_date IS NULL THEN
    NEW.rejection_date = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER set_remark_dates
  BEFORE INSERT OR UPDATE ON report_cards
  FOR EACH ROW
  EXECUTE FUNCTION ensure_remark_with_date();
