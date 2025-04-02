
-- Add skill_evidence column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_evidence VARCHAR(255);