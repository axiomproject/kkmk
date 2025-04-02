
-- Add certificate tracking columns to regular_donations table
ALTER TABLE regular_donations 
ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMP;

-- Add certificate tracking columns to inkind_donations table
ALTER TABLE inkind_donations 
ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMP;