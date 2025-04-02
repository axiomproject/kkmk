-- Add certificate fields to scholar_donations table

-- First add the basic tracking columns
ALTER TABLE scholar_donations 
ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMP;

-- Add a column to store the role of who sent the certificate (admin or staff)
ALTER TABLE scholar_donations 
ADD COLUMN IF NOT EXISTS certificate_sent_by_role VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_scholar_donations_certificate 
ON scholar_donations(certificate_sent);

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scholar_donations_certificate_sent_by_fkey'
    ) THEN
        ALTER TABLE scholar_donations DROP CONSTRAINT scholar_donations_certificate_sent_by_fkey;
    END IF;
END $$;

-- Check if certificate_sent_by column exists and if so, keep it without the FK constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scholar_donations' AND column_name = 'certificate_sent_by'
    ) THEN
        -- Column exists, but let's remove the constraint
        -- We don't drop it since it might contain useful historical data
        NULL;
    END IF;
END $$;