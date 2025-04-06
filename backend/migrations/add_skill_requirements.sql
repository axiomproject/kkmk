
-- Add skill_requirements column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS skill_requirements JSONB;

-- Comment on the new column
COMMENT ON COLUMN events.skill_requirements IS 'JSON array of skill requirements with skill name and count';