-- Add total_scholars and current_scholars columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS total_scholars INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_scholars INTEGER DEFAULT 0;

-- Update any existing records where scholars are currently mixed with volunteers
-- This will initially set the counts to 0 for existing events
UPDATE events SET total_scholars = 0, current_scholars = 0;

-- Execute this migration by running: psql -d your_database_name -f migrations/add_scholar_counts.sql
