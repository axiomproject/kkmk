
-- Allow payment_method to be nullable and set default value
ALTER TABLE scholar_donations 
    ALTER COLUMN payment_method DROP NOT NULL,
    ALTER COLUMN payment_method SET DEFAULT 'Not Specified';