ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'volunteer' NOT NULL;
-- Update the role column to only accept specific values
ALTER TABLE users ADD CONSTRAINT valid_roles CHECK (role IN ('volunteer', 'scholar', 'sponsor'));
