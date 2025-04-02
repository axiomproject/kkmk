
-- Add certificate tracking columns to monetary_donations table
ALTER TABLE monetary_donations 
ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMP;