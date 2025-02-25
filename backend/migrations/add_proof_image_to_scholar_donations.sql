
-- Add proof_image column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scholar_donations' 
        AND column_name = 'proof_image'
    ) THEN 
        ALTER TABLE scholar_donations 
        ADD COLUMN proof_image VARCHAR(255);
    END IF;
END $$;