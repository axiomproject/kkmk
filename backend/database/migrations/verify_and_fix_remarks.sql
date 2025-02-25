-- First, verify column types
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'report_cards' 
AND column_name IN ('step1_remark', 'step1_remark_date', 'step2_remark', 'step2_remark_date');

-- If needed, recreate the columns with proper types
ALTER TABLE report_cards 
  ALTER COLUMN step1_remark TYPE TEXT,
  ALTER COLUMN step2_remark TYPE TEXT,
  ALTER COLUMN step1_remark_date TYPE TIMESTAMP,
  ALTER COLUMN step2_remark_date TYPE TIMESTAMP;

-- Set default values for timestamps
ALTER TABLE report_cards 
  ALTER COLUMN step1_remark_date SET DEFAULT NULL,
  ALTER COLUMN step2_remark_date SET DEFAULT NULL;
