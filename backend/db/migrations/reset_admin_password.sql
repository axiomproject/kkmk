-- First, delete existing admin if exists
DELETE FROM admin_users WHERE email = 'admin@kkmk.com';

-- Then insert admin with known password hash (password: admin123)
INSERT INTO admin_users (
    name, 
    email, 
    password, 
    role
) VALUES (
    'Admin User',
    'admin@kkmk.com',
    '$2a$10$zPiOmtmGGfdgE3kyoR2TLeIcHumj0YCyXHNUWVesK/h2z5gdrzh0e',
    'admin'
);
