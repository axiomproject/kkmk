-- Add name component columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS name_extension VARCHAR(10);

-- For existing records, split name into components (optional migration)
UPDATE users 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
    THEN SPLIT_PART(name, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1))
    ELSE NULL
  END,
  middle_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 2
    THEN substring(
            name 
            FROM position(' ' in name) + 1 
            FOR greatest(0, position(' ' in reverse(name)) - 1)
         )
    ELSE NULL
  END
WHERE 
  first_name IS NULL AND name IS NOT NULL;

-- Create index for improved searching
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
