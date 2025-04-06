-- Check if the column exists and is not JSONB type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'skill_requirements'
        AND data_type != 'jsonb'
    ) THEN
        -- Convert from TEXT or JSON to JSONB if needed
        ALTER TABLE events ALTER COLUMN skill_requirements TYPE JSONB USING skill_requirements::JSONB;
        RAISE NOTICE 'Converted skill_requirements column to JSONB type';
    ELSE
        RAISE NOTICE 'skill_requirements column is already JSONB or does not exist';
    END IF;
END $$;

-- Re-add the column if it doesn't exist at all
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'skill_requirements'
    ) THEN
        ALTER TABLE events ADD COLUMN skill_requirements JSONB;
        RAISE NOTICE 'Added skill_requirements column as JSONB';
    END IF;
END $$;

-- Comment on the column
COMMENT ON COLUMN events.skill_requirements IS 'JSON array of skill requirements with skill name and count';
