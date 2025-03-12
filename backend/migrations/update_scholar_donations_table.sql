-- Create a new schema migration to fix the scholar_donations table constraints
BEGIN;

-- First, check if we need to modify the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'scholar_donations_scholar_id_fkey'
    AND table_name = 'scholar_donations'
  ) THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE scholar_donations DROP CONSTRAINT scholar_donations_scholar_id_fkey;
    
    -- Add new foreign key that references users instead of scholars
    ALTER TABLE scholar_donations
    ADD CONSTRAINT scholar_donations_scholar_id_fkey
    FOREIGN KEY (scholar_id)
    REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint updated to reference users table';
  ELSE
    RAISE NOTICE 'No need to update constraints';
  END IF;
END
$$;

-- Make sure the sponsor_id column also references users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'scholar_donations_sponsor_id_fkey'
    AND table_name = 'scholar_donations'
  ) THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE scholar_donations DROP CONSTRAINT scholar_donations_sponsor_id_fkey;
  END IF;
  
  -- Add new foreign key that references users
  ALTER TABLE scholar_donations
  ADD CONSTRAINT scholar_donations_sponsor_id_fkey
  FOREIGN KEY (sponsor_id)
  REFERENCES users(id) ON DELETE SET NULL;
  
  RAISE NOTICE 'Sponsor ID foreign key constraint updated';
END
$$;

-- Make sure all columns have appropriate types and defaults
ALTER TABLE scholar_donations
  ALTER COLUMN verification_status SET DEFAULT 'pending',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Update any existing records where scholar_id points to nonexistent users
UPDATE scholar_donations sd
SET scholar_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.role = 'scholar' 
  ORDER BY u.id 
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 
  FROM users u 
  WHERE u.id = sd.scholar_id AND u.role = 'scholar'
);

COMMIT;
