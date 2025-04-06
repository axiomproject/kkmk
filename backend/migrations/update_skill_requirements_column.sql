-- Add the skill_requirements column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'skill_requirements'
    ) THEN
        ALTER TABLE events ADD COLUMN skill_requirements JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added skill_requirements column as JSONB with default empty array';
    ELSE
        -- If the column exists, make sure it's JSONB type
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'events'
            AND column_name = 'skill_requirements'
            AND data_type != 'jsonb'
        ) THEN
            ALTER TABLE events 
            ALTER COLUMN skill_requirements TYPE JSONB 
            USING 
                CASE
                    WHEN skill_requirements IS NULL THEN '[]'::jsonb
                    WHEN skill_requirements::text = '' THEN '[]'::jsonb
                    ELSE 
                        CASE 
                            WHEN skill_requirements::text ~ '^\\{.*\\}$' THEN skill_requirements::jsonb
                            ELSE ('['||skill_requirements::text||']')::jsonb
                        END
                END;
            RAISE NOTICE 'Converted skill_requirements column to JSONB type';
        ELSE
            RAISE NOTICE 'skill_requirements column already exists as JSONB type';
        END IF;
    END IF;
END $$;

-- Update any NULL skill_requirements to empty arrays
UPDATE events
SET skill_requirements = '[]'::jsonb
WHERE skill_requirements IS NULL;

-- Add comment to the column
COMMENT ON COLUMN events.skill_requirements IS 'JSON array of skill requirements with skill name and count';
