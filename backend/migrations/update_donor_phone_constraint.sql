
-- Allow donor_phone to be nullable and set default value
ALTER TABLE scholar_donations 
    ALTER COLUMN donor_phone DROP NOT NULL,
    ALTER COLUMN donor_phone SET DEFAULT 'N/A';