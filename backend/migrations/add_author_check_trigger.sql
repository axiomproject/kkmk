
CREATE OR REPLACE FUNCTION check_author_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.author_id
    UNION
    SELECT 1 FROM admin_users WHERE id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'Invalid author ID: % not found in users or admin_users table', NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_author_before_insert
  BEFORE INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_author_exists();