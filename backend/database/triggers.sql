-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS check_author_trigger ON forum_posts;
DROP TRIGGER IF EXISTS check_comment_author_trigger ON forum_comments;
DROP FUNCTION IF EXISTS check_author_exists() CASCADE;
DROP FUNCTION IF EXISTS check_comment_author_exists() CASCADE;

-- Create function to check author for posts
CREATE OR REPLACE FUNCTION check_author_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT id FROM users 
      UNION ALL 
      SELECT id FROM admin_users
      UNION ALL
      SELECT id FROM staff_users
    ) combined_users 
    WHERE id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'Invalid author ID: % not found in users, admin_users, or staff_users table', NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to check author for comments
CREATE OR REPLACE FUNCTION check_comment_author_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT id FROM users 
      UNION ALL 
      SELECT id FROM admin_users
      UNION ALL
      SELECT id FROM staff_users
    ) combined_users 
    WHERE id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'Invalid author ID: % not found in users, admin_users, or staff_users table', NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for posts
CREATE TRIGGER check_author_trigger
BEFORE INSERT ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION check_author_exists();

-- Create trigger for comments
CREATE TRIGGER check_comment_author_trigger
BEFORE INSERT ON forum_comments
FOR EACH ROW
EXECUTE FUNCTION check_comment_author_exists();
