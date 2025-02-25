
-- Drop all existing columns and recreate them as simple TEXT fields
ALTER TABLE report_cards 
  DROP COLUMN IF EXISTS step1_remark CASCADE,
  DROP COLUMN IF EXISTS step2_remark CASCADE,
  DROP COLUMN IF EXISTS rejection_reason CASCADE;

ALTER TABLE report_cards 
  ADD COLUMN step1_remark TEXT,
  ADD COLUMN step2_remark TEXT,
  ADD COLUMN rejection_reason TEXT;