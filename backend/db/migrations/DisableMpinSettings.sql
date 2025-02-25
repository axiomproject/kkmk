-- First verify the current settings
SELECT id, name, email, is_mpin_enabled FROM admin_users;

-- Then update all admin users to disable MPIN
UPDATE admin_users 
SET is_mpin_enabled = false, 
    mpin = NULL;  -- Also clear any stored MPIN values for security
