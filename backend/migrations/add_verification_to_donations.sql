-- Add verification fields to regular_donations
ALTER TABLE regular_donations
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN verified_at TIMESTAMP,
ADD COLUMN verified_by VARCHAR(100),
ADD COLUMN rejected_at TIMESTAMP,
ADD COLUMN rejected_by VARCHAR(100),
ADD COLUMN rejection_reason TEXT;

-- Add verification fields to inkind_donations
ALTER TABLE inkind_donations
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN verified_at TIMESTAMP,
ADD COLUMN verified_by VARCHAR(100),
ADD COLUMN rejected_at TIMESTAMP,
ADD COLUMN rejected_by VARCHAR(100),
ADD COLUMN rejection_reason TEXT;
