-- Drop existing constraints
ALTER TABLE forum_comments DROP CONSTRAINT IF EXISTS forum_comments_author_id_fkey;

-- Drop previous function and trigger if they exist
DROP TRIGGER IF EXISTS check_comment_author_exists ON forum_comments;
DROP FUNCTION IF EXISTS check_comment_author_exists();

-- Create updated function that handles NULL values better
CREATE OR REPLACE FUNCTION check_comment_author_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL author_id for system-generated comments if needed
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if author exists in either users or admin_users table
  IF EXISTS (
    SELECT 1 
    FROM (
      SELECT id, role FROM users
      UNION ALL
      SELECT id, 'admin' as role FROM admin_users
    ) authors 
    WHERE id = NEW.author_id
  ) THEN
    -- Set author role
    NEW.author_role := COALESCE(
      (SELECT 'admin' FROM admin_users WHERE id = NEW.author_id),
      (SELECT role FROM users WHERE id = NEW.author_id)
    );
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Author ID % not found in users or admin_users table', NEW.author_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with BEFORE INSERT OR UPDATE
CREATE TRIGGER check_comment_author_exists
  BEFORE INSERT OR UPDATE ON forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION check_comment_author_exists();

-- Add author_role column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_comments' AND column_name = 'author_role'
  ) THEN
    ALTER TABLE forum_comments ADD COLUMN author_role VARCHAR(50);
  END IF;
END $$;

-- Update existing comments with correct roles
UPDATE forum_comments fc
SET author_role = COALESCE(
  (SELECT 'admin' FROM admin_users WHERE id = fc.author_id),
  (SELECT role FROM users WHERE id = fc.author_id)
)
WHERE author_role IS NULL;
