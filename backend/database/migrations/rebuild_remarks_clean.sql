-- First remove any existing triggers
DROP TRIGGER IF EXISTS check_remark_with_date ON report_cards;
DROP TRIGGER IF EXISTS set_remark_dates ON report_cards;
DROP FUNCTION IF EXISTS ensure_remark_with_date();

-- Drop existing columns if they exist
ALTER TABLE report_cards 
  DROP COLUMN IF EXISTS step1_remark CASCADE,
  DROP COLUMN IF EXISTS step1_remark_date CASCADE,
  DROP COLUMN IF EXISTS step2_remark CASCADE,
  DROP COLUMN IF EXISTS step2_remark_date CASCADE,
  DROP COLUMN IF EXISTS rejection_reason CASCADE,
  DROP COLUMN IF EXISTS rejection_date CASCADE,
  DROP COLUMN IF EXISTS remarks CASCADE;

-- Add fresh columns with simple structure
ALTER TABLE report_cards 
  ADD COLUMN step1_remark TEXT DEFAULT NULL,
  ADD COLUMN step2_remark TEXT DEFAULT NULL,
  ADD COLUMN rejection_reason TEXT DEFAULT NULL;
