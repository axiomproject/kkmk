-- Update the users table to add new fields for enhanced registration

ALTER TABLE users 
  -- Name fields
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS name_extension VARCHAR(10),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
  
  -- Scholar-specific fields
  ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS school VARCHAR(100),
  
  -- Volunteer-specific fields
  ADD COLUMN IF NOT EXISTS skills JSONB;

-- Update existing records to split name into components (optional migration)
-- This will only work properly for names in "First Last" format
UPDATE users 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
WHERE 
  first_name IS NULL AND name IS NOT NULL AND POSITION(' ' IN name) > 0;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_users_education ON users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN (skills);
