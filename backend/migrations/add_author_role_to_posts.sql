-- Add author_role column to forum_posts table
ALTER TABLE forum_posts
ADD COLUMN author_role VARCHAR(50);

-- Update existing posts with roles from users table
UPDATE forum_posts fp
SET author_role = u.role
FROM users u
WHERE fp.author_id = u.id;

-- Update existing posts with admin roles
UPDATE forum_posts fp
SET author_role = 'admin'
FROM admin_users a
WHERE fp.author_id = a.id;
