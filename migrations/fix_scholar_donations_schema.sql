-- This migration script fixes issues with the scholar_donations table

BEGIN;

-- Check if old_scholar_id column exists and remove it if it does
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'scholar_donations' AND column_name = 'old_scholar_id') THEN
        ALTER TABLE scholar_donations DROP COLUMN old_scholar_id;
    END IF;
END$$;

-- Set a default for verification_status if it's not already set
ALTER TABLE scholar_donations 
ALTER COLUMN verification_status SET DEFAULT 'pending';

-- Check if any donations have null verification_status and fix them
UPDATE scholar_donations 
SET verification_status = 'pending'
WHERE verification_status IS NULL;

-- Add an index on verification_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_scholar_donations_verification_status 
ON scholar_donations(verification_status);

-- Add an index on scholar_id for faster joins
CREATE INDEX IF NOT EXISTS idx_scholar_donations_scholar_id
ON scholar_donations(scholar_id);

-- Optional: Fix any donations with NULL created_at values
UPDATE scholar_donations
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Check for and fix any orphaned donations (where scholar_id points to a non-existent user)
DO $$
DECLARE
    valid_scholar_id integer;
BEGIN
    -- Get a valid scholar ID to use as a fallback
    SELECT id INTO valid_scholar_id FROM users WHERE role = 'scholar' LIMIT 1;

    -- If we found a valid scholar_id, fix any orphaned donations
    IF valid_scholar_id IS NOT NULL THEN
        UPDATE scholar_donations sd
        SET scholar_id = valid_scholar_id
        WHERE NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = sd.scholar_id
        );
    END IF;
END$$;

COMMIT;
