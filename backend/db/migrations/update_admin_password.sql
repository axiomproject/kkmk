-- First, delete the existing admin user
DELETE FROM admin_users WHERE email = 'admin@kkmk.com';

-- Insert fresh admin user with new password hash
INSERT INTO admin_users (
    name,
    email,
    password,
    role,
    status
) VALUES (
    'Admin User',
    'admin@kkmk.com',
    '$2a$10$n5UHEKxPyfM3YYEtRkF1cOdfBqzCTKk.R4rR3hoXA3XaWTQhvtavG',
    'admin',
    'active'
);
