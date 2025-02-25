ALTER TABLE report_cards DROP COLUMN IF EXISTS remarks;
ALTER TABLE report_cards ADD COLUMN step1_remark TEXT;
ALTER TABLE report_cards ADD COLUMN step1_remark_date TIMESTAMP;
ALTER TABLE report_cards ADD COLUMN step2_remark TEXT;
ALTER TABLE report_cards ADD COLUMN step2_remark_date TIMESTAMP;
ALTER TABLE report_cards ADD COLUMN rejection_reason TEXT;
ALTER TABLE report_cards ADD COLUMN rejection_date TIMESTAMP;
