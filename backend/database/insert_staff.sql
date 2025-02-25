-- Insert a staff member with hashed password
INSERT INTO staff_users (
    name,
    email,
    password, -- This is a hashed version of 'password123'
    department,
    phone,
    role
) VALUES (
    'John Smith',
    'staff@kkmk.com',
    '$2a$10$6KqMX8kzfLGWQ4REFrhO0.0WMBKS3cKGjvFNwCz4ugp6Pz0BAWZ4O',
    'Operations',
    '123-456-7890',
    'staff'
);
