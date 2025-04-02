const express = require('express');
const router = express.Router();
const db = require('../config/db');  // Add this import
const forumModel = require('../models/forumModel');
const multer = require('multer');
const path = require('path');
const profanityFilter = require('../utils/profanityFilter');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/forum')
  },
  filename: function (req, file, cb) {
    cb(null, 'forum-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Add debug middleware
router.use((req, res, next) => {
  console.log('Forum route hit:', {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl
  });
  next();
});

// Get all posts
router.get('/posts', async (req, res) => {
    console.log('Fetching posts...');
    try {
        const posts = await forumModel.getPosts();  // Use the model instead of direct db query
        
        // Ensure comments is always an array
        const postsWithComments = posts.map(post => ({
            ...post,
            comments: post.comments || []
        }));
        
        console.log('Posts fetched successfully:', postsWithComments.length);
        res.json(postsWithComments);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Update the post creation route to properly handle staff role
router.post('/posts', upload.single('image'), async (req, res) => {
    console.log('Creating new post:', req.body);
    try {
        // Add debug logging for author ID
        console.log('Author ID:', req.body.authorId);
        
        // Check for profanity
        if (profanityFilter.isProfane(req.body.title) || profanityFilter.isProfane(req.body.content)) {
            return res.status(400).json({ 
                error: 'Your post contains inappropriate language' 
            });
        }

        // Get user role to determine approval status
        const authorId = req.body.authorId;
        const userRoleResult = await db.query(`
          SELECT 
            CASE 
              WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $1) THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $1) THEN 'staff'
              ELSE 'user'
            END as role
        `, [authorId]);
        
        const userRole = userRoleResult.rows[0]?.role || 'user';
        
        // Set initial approval status based on role
        const approvalStatus = ['admin', 'staff'].includes(userRole) ? 'approved' : 'pending';
        
        // Clean the text just in case
        const postData = {
            ...req.body,
            title: profanityFilter.clean(req.body.title),
            content: profanityFilter.clean(req.body.content),
            imageUrl: req.file ? `/uploads/forum/${req.file.filename}` : null,
            poll: req.body.poll ? JSON.parse(req.body.poll) : undefined,
            approval_status: approvalStatus // Add approval status
        };

        // Clean poll options if they exist
        if (postData.poll) {
            postData.poll = {
                ...postData.poll,
                options: postData.poll.options.map(opt => ({
                    ...opt,
                    text: profanityFilter.clean(opt.text)
                }))
            };
        }

        console.log('Processed post data:', postData);
        const post = await forumModel.createPost(postData);
        console.log('Created post:', post);
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
});

// Add comment to post
router.post('/posts/:postId/comments', async (req, res) => {
    try {
        // Check for profanity
        if (profanityFilter.isProfane(req.body.content)) {
            return res.status(400).json({ 
                error: 'Your comment contains inappropriate language' 
            });
        }

        const postId = req.params.postId;
        const commentData = {
            ...req.body,
            content: profanityFilter.clean(req.body.content)
        };

        console.log('Comment data to insert:', commentData);

        const comment = await forumModel.addComment(postId, commentData);
        
        console.log('Comment created:', comment);
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ 
            error: 'Failed to add comment', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add like comment route
router.post('/posts/:postId/comments/:commentId/like', async (req, res) => {
    console.log('Toggling comment like:', req.params);
    try {
        const { postId, commentId } = req.params;
        const { increment, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedComment = await forumModel.updateCommentLike(postId, commentId, userId, increment);
        console.log('Comment like updated:', updatedComment);
        
        res.json(updatedComment);
    } catch (error) {
        if (error.message === 'User already liked this comment') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating comment like:', error);
        res.status(500).json({ error: 'Failed to update comment like' });
    }
});

// Add post like route
router.post('/posts/:postId/like', async (req, res) => {
    try {
        const { postId } = req.params;
        const { increment, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedPost = await forumModel.updatePostLike(postId, userId, increment);
        res.json(updatedPost);
    } catch (error) {
        if (error.message === 'User already liked this post') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating post like:', error);
        res.status(500).json({ error: 'Failed to update post like' });
    }
});

// Add endpoint to get user's liked posts
router.get('/user-liked-posts/:userId', async (req, res) => {
    try {
        const likedPosts = await forumModel.getUserLikedPosts(req.params.userId);
        res.json(likedPosts);
    } catch (error) {
        console.error('Error fetching user liked posts:', error);
        res.status(500).json({ error: 'Failed to fetch user liked posts' });
    }
});

// Add endpoint to get user's liked comments
router.get('/user-likes/:userId', async (req, res) => {
    try {
        const likedComments = await forumModel.getUserLikedComments(req.params.userId);
        res.json(likedComments);
    } catch (error) {
        console.error('Error fetching user likes:', error);
        res.status(500).json({ error: 'Failed to fetch user likes' });
    }
});

// Add endpoint to get user's voted polls
router.get('/user-voted-polls/:userId', async (req, res) => {
    try {
        const votedPolls = await forumModel.getUserVotedPolls(req.params.userId);
        res.json(votedPolls);
    } catch (error) {
        console.error('Error fetching voted polls:', error);
        res.status(500).json({ error: 'Failed to fetch voted polls' });
    }
});

// Update poll vote route
router.post('/posts/:postId/vote/:optionId', async (req, res) => {
    try {
        const { postId, optionId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updatedPoll = await forumModel.updatePollVote(postId, optionId, userId);
        res.json(updatedPoll);
    } catch (error) {
        if (error.message === 'User has already voted on this poll') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error recording vote:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// Update delete post route
router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;  // Changed from req.query to req.body

    console.log('Delete post request:', { postId, userId });

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and get role
    const userCheckResult = await db.query(`
      SELECT 'admin' as role FROM admin_users WHERE id = $1
      UNION
      SELECT 'staff' as role FROM staff_users WHERE id = $1
      UNION
      SELECT role FROM users WHERE id = $1
    `, [userId]);
    
    const userRole = userCheckResult.rows[0]?.role || 'unknown';
    console.log('User role for deletion:', userRole);

    // Get post info before deletion attempt
    const postInfoResult = await db.query(
      'SELECT category, event_id FROM forum_posts WHERE id = $1',
      [postId]
    );
    
    const postInfo = postInfoResult.rows[0];
    if (postInfo) {
      console.log('Post info before deletion:', {
        category: postInfo.category,
        hasEventId: postInfo.event_id !== null
      });
    }

    const result = await forumModel.deletePost(postId, userId);
    
    if (result.success) {
      console.log('Post deletion successful');
      res.json({ success: true });
    } else {
      console.log('Post deletion failed:', result.message);
      res.status(404).json({ error: result.message || 'Post not found' });
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.message === 'Unauthorized to delete this post') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
  }
});

// Add new route for comment deletion
router.delete('/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;

    console.log('Delete comment request:', { postId, commentId, userId });

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and get role
    const userCheckResult = await db.query(`
      SELECT 'admin' as role FROM admin_users WHERE id = $1
      UNION
      SELECT 'staff' as role FROM staff_users WHERE id = $1
      UNION
      SELECT role FROM users WHERE id = $1
    `, [userId]);
    
    const userRole = userCheckResult.rows[0]?.role || 'unknown';
    console.log('User role for comment deletion:', userRole);

    // Get comment info before deletion attempt
    const commentInfoResult = await db.query(
      'SELECT author_id, author_role FROM forum_comments WHERE id = $1',
      [commentId]
    );
    
    const commentInfo = commentInfoResult.rows[0];
    if (commentInfo) {
      console.log('Comment info before deletion:', {
        authorId: commentInfo.author_id,
        authorRole: commentInfo.author_role
      });
    }

    const result = await forumModel.deleteComment(postId, commentId, userId);
    
    if (result.success) {
      console.log('Comment deletion successful');
      res.json({ success: true });
    } else {
      console.log('Comment deletion failed:', result.message);
      res.status(404).json({ error: result.message || 'Comment not found' });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    if (error.message === 'Unauthorized to delete this comment') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});

// Update post route
router.put('/posts/:postId', async (req, res) => {
  console.log('Received PUT request for post:', req.params.postId);
  console.log('Request body:', req.body);
  
  try {
    const { postId } = req.params;
    const { userId, ...updateData } = req.body;

    if (!userId) {
      console.log('Missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updatedPost = await forumModel.updatePost(postId, userId, updateData);
    console.log('Updated post:', updatedPost);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error in PUT /posts/:postId:', error);
    
    if (error.message === 'Unauthorized to edit this post') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update post', details: error.message });
  }
});

// Add new route for event-specific posts with improved error handling
router.get('/event-posts/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Fetching event posts for eventId:', eventId);
    
    // Basic validation
    const eventIdInt = parseInt(eventId, 10);
    if (isNaN(eventIdInt) || eventIdInt <= 0) {
      console.error('Invalid event ID received:', eventId);
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // First check if event exists
    // Replace db.oneOrNone with db.query
    const eventResult = await db.query('SELECT id FROM events WHERE id = $1', [eventIdInt]);
    const eventExists = eventResult.rows.length > 0;
    
    if (!eventExists) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const posts = await forumModel.getEventPosts(eventId);
    console.log(`Returning ${posts.length} posts for event ${eventId}`);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching event posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch event posts', 
      details: error.message 
    });
  }
});

// Update the polls analytics endpoint to handle date filtering properly
router.get('/polls/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Date filter received:', { startDate, endDate });
    
    // Construct query with proper date filtering
    let query = `
      SELECT 
        fp.id,
        fp.title,
        COALESCE(
          CASE 
            WHEN fp.event_id IS NOT NULL THEN 
              (SELECT title FROM events WHERE id = fp.event_id)
            ELSE fp.category
          END,
          fp.category
        ) as category,
        fp.created_at,
        p.total_votes as "totalVotes",
        json_agg(
          json_build_object(
            'text', po.text,
            'votes', po.votes
          )
        ) as options
      FROM forum_posts fp
      JOIN forum_polls p ON fp.id = p.post_id
      JOIN forum_poll_options po ON p.id = po.poll_id
      WHERE fp.type = 'poll' 
      AND (
        fp.category = 'announcements' 
        OR fp.event_id IS NOT NULL
        OR fp.category = 'events'
      )`;
      
    // Add date filtering if provided
    const params = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND fp.created_at BETWEEN $1 AND $2`;
      console.log('Adding date filter to query:', { startDate, endDate });
    }
    
    query += `
      AND (
        fp.author_id IN (SELECT id FROM admin_users)
        OR fp.author_id IN (SELECT id FROM staff_users)
      )
      GROUP BY fp.id, p.id
      ORDER BY fp.created_at DESC
    `;

    const result = await db.query(query, params);
    console.log(`Returning ${result.rows.length} poll results`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching poll analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch poll analytics', 
      details: error.message 
    });
  }
});

// Add a debug endpoint to check profile photos
router.get('/debug-profile-photos', async (req, res) => {
  try {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT 'user' as type, id, name, role, profile_photo FROM users LIMIT 5
      UNION ALL
      SELECT 'admin' as type, id, name, 'admin' as role, profile_photo FROM admin_users LIMIT 5
      UNION ALL
      SELECT 'staff' as type, id, name, 'staff' as role, profile_photo FROM staff_users LIMIT 5
    `);
    
    res.json({
      profiles: result.rows,
      apiUrl: process.env.API_URL || 'http://localhost:5175'
    });
  } catch (error) {
    console.error('Error fetching debug profile photos:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// Add new analytics endpoint with date filtering support
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = startDate && endDate ? 'created_at BETWEEN $1 AND $2' : '';
    const params = startDate && endDate ? [startDate, endDate] : [];

    // Get total posts with date filtering
    let postsQuery = `SELECT COUNT(*) as total FROM forum_posts`;
    if (dateFilter) {
      postsQuery += ` WHERE ${dateFilter}`;
    }
    const postsResult = await db.query(postsQuery, params);
    const totalPosts = parseInt(postsResult.rows[0].total);

    // Get total comments with date filtering
    let commentsQuery = `SELECT COUNT(*) as total FROM forum_comments`;
    if (dateFilter) {
      commentsQuery += ` WHERE ${dateFilter}`;
    }
    const commentsResult = await db.query(commentsQuery, params);
    const totalComments = parseInt(commentsResult.rows[0].total);

    // Get total likes with date filtering
    let likesQuery = `
      SELECT (
        (SELECT COUNT(*) FROM post_likes ${dateFilter ? `WHERE ${dateFilter}` : ''}) +
        (SELECT COUNT(*) FROM comment_likes ${dateFilter ? `WHERE ${dateFilter}` : ''})
      ) as total
    `;
    const likesResult = await db.query(likesQuery, dateFilter ? params.concat(params) : []);
    const totalLikes = parseInt(likesResult.rows[0].total);

    // Posts per week with date filtering
    let postsPerWeekQuery = `
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', ${dateFilter ? '$1::timestamp' : 'CURRENT_DATE - INTERVAL \'4 weeks\''})::date,
          date_trunc('week', ${dateFilter ? '$2::timestamp' : 'CURRENT_DATE'})::date,
          '1 week'::interval
        ) as week_start
      )
      SELECT
        to_char(week_start, 'Mon DD') as week_label,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM forum_posts
            WHERE created_at >= week_start
              AND created_at < week_start + '1 week'::interval
              ${dateFilter ? `AND ${dateFilter}` : ''}
          ),
          0
        ) as post_count
      FROM weeks
      ORDER BY week_start
    `;
    
    const postsPerWeekResult = await db.query(postsPerWeekQuery, 
      dateFilter ? [startDate, endDate, startDate, endDate] : []);

    // Top categories with date filtering
    let topCategoriesQuery = `
      SELECT 
        c.name as category_name,
        COUNT(p.id) as post_count
      FROM 
        forum_categories c
      LEFT JOIN 
        forum_posts p ON p.category_id = c.id
        ${dateFilter ? `AND ${dateFilter}` : ''}
      GROUP BY 
        c.name
      ORDER BY 
        post_count DESC
      LIMIT 5
    `;
    const topCategoriesResult = await db.query(topCategoriesQuery, params);

    // Get engagement rates with date filtering
    // ... other queries with similar date filtering

    res.json({
      totalPosts,
      totalComments,
      totalLikes,
      postsPerWeek: {
        labels: postsPerWeekResult.rows.map(row => row.week_label),
        data: postsPerWeekResult.rows.map(row => parseInt(row.post_count))
      },
      topCategories: {
        labels: topCategoriesResult.rows.map(row => row.category_name),
        data: topCategoriesResult.rows.map(row => parseInt(row.post_count))
      },
      // Add other data here...
    });
  } catch (error) {
    console.error('Error getting forum analytics:', error);
    res.status(500).json({ error: 'Failed to get forum analytics' });
  }
});

// Add endpoint for pending posts count
router.get('/pending-posts-count', async (req, res) => {
  try {
    // Check if user is admin or staff
    const userId = req.query.userId;
    if (!userId) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const userCheckResult = await db.query(`
      SELECT 1 FROM (
        SELECT id FROM admin_users WHERE id = $1
        UNION
        SELECT id FROM staff_users WHERE id = $1
      ) AS auth_users
    `, [userId]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const count = await forumModel.getPendingPostsCount();
    res.json({ count });
  } catch (error) {
    console.error('Error fetching pending posts count:', error);
    res.status(500).json({ error: 'Failed to fetch pending posts count' });
  }
});

// Add endpoint for fetching posts by approval status
router.get('/posts/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    // Verify user is admin or staff
    const userCheckResult = await db.query(`
      SELECT 1 FROM (
        SELECT id FROM admin_users WHERE id = $1
        UNION
        SELECT id FROM staff_users WHERE id = $1
      ) AS auth_users
    `, [userId]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status parameter' });
    }
    
    const posts = await forumModel.getPostsByApprovalStatus(status);
    res.json(posts);
  } catch (error) {
    console.error(`Error fetching ${req.params.status} posts:`, error);
    res.status(500).json({ error: `Failed to fetch ${req.params.status} posts` });
  }
});

// Add endpoint for approving posts
router.post('/posts/:postId/approve', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verify user is admin or staff
    const userCheckResult = await db.query(`
      SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $1) THEN 'admin'
          WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $1) THEN 'staff'
          ELSE NULL
        END as role
    `, [userId]);
    
    const userRole = userCheckResult.rows[0]?.role;
    if (!userRole) {
      return res.status(403).json({ error: 'Only administrators and staff can approve posts' });
    }
    
    const updatedPost = await forumModel.approvePost(postId, userId);
    res.json(updatedPost);
  } catch (error) {
    console.error('Error approving post:', error);
    res.status(500).json({ 
      error: 'Failed to approve post', 
      details: error.message 
    });
  }
});

// Add endpoint for rejecting posts
router.post('/posts/:postId/reject', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verify user is admin or staff
    const userCheckResult = await db.query(`
      SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $1) THEN 'admin'
          WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $1) THEN 'staff'
          ELSE NULL
        END as role
    `, [userId]);
    
    const userRole = userCheckResult.rows[0]?.role;
    if (!userRole) {
      return res.status(403).json({ error: 'Only administrators and staff can reject posts' });
    }
    
    const updatedPost = await forumModel.rejectPost(postId, userId, reason);
    res.json(updatedPost);
  } catch (error) {
    console.error('Error rejecting post:', error);
    res.status(500).json({ 
      error: 'Failed to reject post', 
      details: error.message 
    });
  }
});

module.exports = router;
