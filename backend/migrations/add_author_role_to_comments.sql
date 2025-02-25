-- Add author_role column to forum_comments table
ALTER TABLE forum_comments
ADD COLUMN author_role VARCHAR(50);

-- Update existing comments with roles
UPDATE forum_comments fc
SET author_role = COALESCE(
  (SELECT 'admin' FROM admin_users WHERE id = fc.author_id),
  (SELECT role FROM users WHERE id = fc.author_id)
);
