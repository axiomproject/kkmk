-- Fix the check_notification_user_exists function to include staff_users table

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS check_notification_users_trigger ON notifications;

-- Update the function to include staff_users
CREATE OR REPLACE FUNCTION check_notification_user_exists() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user_id exists in any user table
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.user_id
    UNION ALL
    SELECT 1 FROM admin_users WHERE id = NEW.user_id
    UNION ALL
    SELECT 1 FROM staff_users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User ID % not found in users, admin_users, or staff_users table', NEW.user_id;
  END IF;

  -- Check if actor_id exists in any user table (only if it's not null)
  IF NEW.actor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = NEW.actor_id
      UNION ALL
      SELECT 1 FROM admin_users WHERE id = NEW.actor_id
      UNION ALL
      SELECT 1 FROM staff_users WHERE id = NEW.actor_id
    ) THEN
      RAISE EXCEPTION 'Actor ID % not found in users, admin_users, or staff_users table', NEW.actor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
CREATE TRIGGER check_notification_users_trigger
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION check_notification_user_exists();
