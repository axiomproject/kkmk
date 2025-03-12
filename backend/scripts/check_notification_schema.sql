
-- Check if the notifications table exists and has the right columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications';

-- Check if we have any existing scholar_location notifications
SELECT id, type, content, user_id, related_id, created_at, read 
FROM notifications 
WHERE type = 'scholar_location' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check admin users table
SELECT id, name, email 
FROM admin_users 
LIMIT 5;

-- Check if there are any issues with notifications for admin users
SELECT n.id, n.type, n.content, n.user_id, a.name as admin_name, n.created_at, n.read 
FROM notifications n
JOIN admin_users a ON n.user_id = a.id
ORDER BY n.created_at DESC 
LIMIT 20;