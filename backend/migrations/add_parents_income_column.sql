-- Add parents_income column to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS parents_income VARCHAR(50);

-- Comment on the column for better documentation
COMMENT ON COLUMN users.parents_income IS 'Monthly income range of parents/guardians for scholar users';
