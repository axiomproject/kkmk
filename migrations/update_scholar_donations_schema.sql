-- Update the scholar_donations table to use foreign keys correctly
BEGIN;

-- First ensure the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scholar_donations') THEN
        CREATE TABLE scholar_donations (
            id SERIAL PRIMARY KEY,
            scholar_id INTEGER NOT NULL,
            sponsor_id INTEGER,
            donor_name VARCHAR(255),
            donor_email VARCHAR(255),
            donor_phone VARCHAR(100),
            amount NUMERIC NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            proof_image VARCHAR(255),
            message TEXT,
            verification_status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP,
            verified_by VARCHAR(255),
            rejected_at TIMESTAMP,
            rejected_by VARCHAR(255),
            rejection_reason TEXT
        );
    END IF;
END$$;

-- Drop foreign key constraints if they exist
ALTER TABLE scholar_donations
DROP CONSTRAINT IF EXISTS scholar_donations_scholar_id_fkey,
DROP CONSTRAINT IF EXISTS scholar_donations_sponsor_id_fkey;

-- Add foreign keys that reference the users table directly
ALTER TABLE scholar_donations
ADD CONSTRAINT scholar_donations_scholar_id_fkey
FOREIGN KEY (scholar_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE scholar_donations
ADD CONSTRAINT scholar_donations_sponsor_id_fkey
FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add any missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'scholar_donations' AND column_name = 'message') THEN
        ALTER TABLE scholar_donations ADD COLUMN message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'scholar_donations' AND column_name = 'rejection_reason') THEN
        ALTER TABLE scholar_donations ADD COLUMN rejection_reason TEXT;
    END IF;
END$$;

-- Create an index on scholar_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_scholar_donations_scholar_id ON scholar_donations(scholar_id);

COMMIT;
