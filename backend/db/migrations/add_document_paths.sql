
-- Add document_paths column to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS document_paths JSONB;
COMMENT ON COLUMN users.document_paths IS 'Stores paths to scholar required documents (school registration form, PSA, parents ID, report card)';