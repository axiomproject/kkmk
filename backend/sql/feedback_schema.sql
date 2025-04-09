-- Check if user_type column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_feedback' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE event_feedback ADD COLUMN user_type VARCHAR(50);
        -- Update existing records
        UPDATE event_feedback ef
        SET user_type = u.role
        FROM users u
        WHERE ef.user_id = u.id;
    END IF;
END
$$;

-- Create index on event_id and user_type for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_event_feedback_event_id_user_type'
    ) THEN
        CREATE INDEX idx_event_feedback_event_id_user_type 
        ON event_feedback(event_id, user_type);
    END IF;
END
$$;

-- Ensure nullable constraint for comment
ALTER TABLE event_feedback ALTER COLUMN comment DROP NOT NULL;
