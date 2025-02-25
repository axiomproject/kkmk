-- View all users before deletion (optional)
SELECT * FROM users;

-- Delete all users
DELETE FROM users;

-- Reset the auto-increment counter (if needed)
ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Verify users are deleted
SELECT COUNT(*) FROM users;
