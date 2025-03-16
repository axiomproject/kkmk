-- Create table for tracking rejected event participants
CREATE TABLE IF NOT EXISTS event_rejected_users (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_rejected_users_event_id ON event_rejected_users(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rejected_users_user_id ON event_rejected_users(user_id);
