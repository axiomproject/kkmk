-- Add approval status and rejection reason columns to forum_posts table
ALTER TABLE forum_posts 
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved',
ADD COLUMN rejection_reason TEXT;

-- Create index for faster filtering by approval status
CREATE INDEX idx_forum_posts_approval_status ON forum_posts(approval_status);

-- Update existing admin and staff posts to ensure they're approved
UPDATE forum_posts 
SET approval_status = 'approved'
WHERE author_id IN (
  SELECT id FROM admin_users
  UNION
  SELECT id FROM staff_users
);

-- Comments on the approved posts should be accessible too
-- This index helps with filtering by approval status when querying comments
CREATE INDEX idx_forum_posts_approval_comments ON forum_posts(id, approval_status);
