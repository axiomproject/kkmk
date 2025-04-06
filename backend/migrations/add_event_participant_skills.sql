
-- Create table for storing skill assignments for event participants
CREATE TABLE IF NOT EXISTS event_participant_skills (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(event_id, user_id) -- Each participant can only have one skill assignment per event
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_participant_skills_event_id ON event_participant_skills(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participant_skills_user_id ON event_participant_skills(user_id);