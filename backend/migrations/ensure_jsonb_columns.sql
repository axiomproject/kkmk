-- Ensure skill_requirements column exists and is JSONB type
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'skill_requirements'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE events ADD COLUMN skill_requirements JSONB;
        RAISE NOTICE 'Added skill_requirements column as JSONB';
    ELSE
        -- Check if the column needs conversion to JSONB
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'events'
            AND column_name = 'skill_requirements'
            AND data_type != 'jsonb'
        ) THEN
            -- Convert from TEXT or JSON to JSONB if needed
            ALTER TABLE events ALTER COLUMN skill_requirements TYPE JSONB USING 
                CASE 
                    WHEN skill_requirements IS NULL THEN NULL
                    WHEN skill_requirements::text = '' THEN '[]'::jsonb
                    ELSE skill_requirements::jsonb
                END;
            RAISE NOTICE 'Converted skill_requirements column to JSONB';
        ELSE
            RAISE NOTICE 'skill_requirements column is already JSONB';
        END IF;
    END IF;
END $$;

-- Update any NULL or invalid skill_requirements to empty arrays
UPDATE events 
SET skill_requirements = '[]'::jsonb 
WHERE skill_requirements IS NULL OR skill_requirements::text = '';

-- Add an index to improve query performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'events' AND indexname = 'idx_events_skill_requirements'
    ) THEN
        CREATE INDEX idx_events_skill_requirements ON events USING gin(skill_requirements);
        RAISE NOTICE 'Created index on skill_requirements';
    END IF;
END $$;
