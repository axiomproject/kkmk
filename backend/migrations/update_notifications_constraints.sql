-- Drop existing foreign key constraints
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

-- Create function to check user exists in either table
CREATE OR REPLACE FUNCTION check_notification_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check user_id and actor_id exist in either users or admin_users
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT id FROM users
      UNION ALL
      SELECT id FROM admin_users
    ) users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User ID % not found in users or admin_users table', NEW.user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT id FROM users
      UNION ALL
      SELECT id FROM admin_users
    ) users WHERE id = NEW.actor_id
  ) THEN
    RAISE EXCEPTION 'Actor ID % not found in users or admin_users table', NEW.actor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_notification_users_exist ON notifications;
CREATE TRIGGER check_notification_users_exist
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION check_notification_user_exists();
