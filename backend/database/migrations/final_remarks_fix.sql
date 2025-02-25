-- First, drop all existing columns and triggers
DROP TRIGGER IF EXISTS check_remark_with_date ON report_cards CASCADE;
DROP TRIGGER IF EXISTS set_remark_dates ON report_cards CASCADE;
DROP FUNCTION IF EXISTS ensure_remark_with_date() CASCADE;

-- Drop and recreate columns
ALTER TABLE report_cards 
  DROP COLUMN IF EXISTS step1_remark CASCADE,
  DROP COLUMN IF EXISTS step1_remark_date CASCADE,
  DROP COLUMN IF EXISTS step2_remark CASCADE,
  DROP COLUMN IF EXISTS step2_remark_date CASCADE,
  DROP COLUMN IF EXISTS rejection_reason CASCADE,
  DROP COLUMN IF EXISTS rejection_date CASCADE,
  DROP COLUMN IF EXISTS remarks CASCADE;

-- Add fresh columns with NOT NULL default
ALTER TABLE report_cards 
  ADD COLUMN step1_remark TEXT NOT NULL DEFAULT '',
  ADD COLUMN step2_remark TEXT NOT NULL DEFAULT '',
  ADD COLUMN rejection_reason TEXT NOT NULL DEFAULT '';
