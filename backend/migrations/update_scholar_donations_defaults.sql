-- Update columns to allow NULL values without default values
ALTER TABLE scholar_donations 
    ALTER COLUMN donor_name DROP NOT NULL,
    ALTER COLUMN donor_name DROP DEFAULT,
    ALTER COLUMN donor_email DROP NOT NULL,
    ALTER COLUMN donor_email DROP DEFAULT,
    ALTER COLUMN donor_phone DROP NOT NULL,
    ALTER COLUMN donor_phone DROP DEFAULT,
    ALTER COLUMN payment_method DROP NOT NULL,
    ALTER COLUMN payment_method DROP DEFAULT;
