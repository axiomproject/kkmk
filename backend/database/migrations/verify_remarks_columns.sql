-- Check if columns exist and their data types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'report_cards' 
AND column_name IN ('step1_remark', 'step1_remark_date', 'step2_remark', 'step2_remark_date');
