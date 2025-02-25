
-- Allow donor_name to be nullable and set default value
ALTER TABLE scholar_donations 
    ALTER COLUMN donor_name DROP NOT NULL,
    ALTER COLUMN donor_name SET DEFAULT 'Anonymous';