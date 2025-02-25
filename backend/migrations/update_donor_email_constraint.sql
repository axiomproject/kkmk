
-- Allow donor_email to be nullable and set default value
ALTER TABLE scholar_donations 
    ALTER COLUMN donor_email DROP NOT NULL,
    ALTER COLUMN donor_email SET DEFAULT 'anonymous@example.com';