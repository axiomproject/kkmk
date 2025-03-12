
-- Add the disability column to the users table
ALTER TABLE users
ADD COLUMN disability JSONB;

-- Add a comment to explain the column
COMMENT ON COLUMN users.disability IS 'JSON data containing disability information for volunteers (types and details)';