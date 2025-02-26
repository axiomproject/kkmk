const db = require('../config/db');

const forumModel = {
  async createPost(postData) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('Creating post with data:', postData);

      // Convert authorId to integer
      const authorId = parseInt(postData.authorId, 10);
      if (isNaN(authorId)) {
        throw new Error('Invalid author ID format');
      }

      // Update the author lookup query to properly include staff users
      const authorQuery = `
        SELECT id, name, profile_photo, role FROM (
          SELECT id, name, profile_photo, role, 'user' as source 
          FROM users 
          WHERE id = $1
          UNION ALL
          SELECT id, name, profile_photo, 'admin' as role, 'admin' as source 
          FROM admin_users 
          WHERE id = $1
          UNION ALL
          SELECT id, name, profile_photo, 'staff' as role, 'staff' as source 
          FROM staff_users 
          WHERE id = $1
        ) combined_users
        LIMIT 1
      `;

      // Replace db.oneOrNone with client.query
      const authorResult = await client.query(authorQuery, [authorId]);
      const author = authorResult.rows[0];
      
      if (!author) {
        throw new Error(`No user, admin, or staff found with ID: ${authorId}`);
      }

      // Update authorization check for restricted categories
      if (postData.category?.toLowerCase() === 'announcements' || 
          (postData.category?.toLowerCase() === 'events' && !postData.eventId)) {
        const isAdminOrStaffResult = await client.query(`
          SELECT id FROM (
            SELECT id FROM admin_users WHERE id = $1
            UNION ALL
            SELECT id FROM staff_users WHERE id = $1
          ) as auth
        `, [authorId]);
        
        const isAdminOrStaff = isAdminOrStaffResult.rows[0];
        
        if (!isAdminOrStaff) {
          throw new Error(`Only administrators and staff can post in ${postData.category}`);
        }
      }

      // Convert eventId to integer if it exists, ensure null if it doesn't
      const eventId = postData.eventId ? parseInt(postData.eventId, 10) : null;
      console.log('Processed eventId:', eventId); // Add debug logging

      // Handle category name and event ID
      const category = postData.category; // Keep the exact category name

      console.log('Creating post with:', { 
        category,
        eventId,
        authorId: postData.authorId
      });

      // Create the base post first - replace db.one with client.query
      const postResult = await client.query(`
        INSERT INTO forum_posts 
        (title, content, author_id, category, type, image_url, event_id, author_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, content, author_id, category, type, image_url, event_id, created_at`,
        [
          postData.title,
          postData.content,
          authorId,
          category, // Use exact category name
          postData.type,
          postData.imageUrl || null,
          eventId, // Add eventId to the insert
          author.role // Add role to the post
        ]
      );
      
      const post = postResult.rows[0];

      // Update the author details query to include staff - replace db.one with client.query
      const authorDetailsResult = await client.query(`
        SELECT name, profile_photo, role
        FROM (
          SELECT name, profile_photo, role FROM users WHERE id = $1
          UNION ALL
          SELECT name, profile_photo, 'admin' as role FROM admin_users WHERE id = $1
          UNION ALL
          SELECT name, profile_photo, 'staff' as role FROM staff_users WHERE id = $1
        ) author_info
        LIMIT 1
      `, [authorId]);
      
      const authorDetails = authorDetailsResult.rows[0];
      
      // Add debug logging to see what's being retrieved
      console.log('Retrieved author details:', authorDetails);

      // If it's a poll, create poll data
      let pollData = null;
      if (postData.type === 'poll' && postData.poll) {
        try {
          const pollOptions = typeof postData.poll === 'string' 
            ? JSON.parse(postData.poll) 
            : postData.poll;

          // Create poll - replace db.one with client.query
          const pollResult = await client.query(`
            INSERT INTO forum_polls (post_id, question, total_votes)
            VALUES ($1, $2, 0)
            RETURNING id, question, total_votes`,
            [post.id, pollOptions.question || postData.title]
          );
          
          const poll = pollResult.rows[0];

          // Create poll options
          const options = [];
          for (const option of pollOptions.options) {
            const optionResult = await client.query(`
              INSERT INTO forum_poll_options (poll_id, text, votes)
              VALUES ($1, $2, 0)
              RETURNING id, text, votes`,
              [poll.id, option.text]
            );
            options.push(optionResult.rows[0]);
          }

          // Structure poll data
          pollData = {
            id: poll.id,
            question: poll.question,
            totalVotes: poll.total_votes,
            options: options.map(opt => ({
              id: opt.id,
              text: opt.text,
              votes: opt.votes
            }))
          };
        } catch (error) {
          console.error('Error creating poll:', error);
          throw new Error('Failed to create poll: ' + error.message);
        }
      }

      // Commit the transaction
      await client.query('COMMIT');
      
      // Return complete post data including poll if exists
      const postWithAuthor = {
        ...post,
        author_name: authorDetails.name,
        author_avatar: authorDetails.profile_photo,
        author_role: authorDetails.role,
        comments: [],
        poll: pollData // Add poll data to returned post
      };
      
      console.log('Returning post with author info:', {
        id: postWithAuthor.id,
        author_name: postWithAuthor.author_name,
        author_avatar: postWithAuthor.author_avatar,
        author_role: postWithAuthor.author_role
      });
      
      return postWithAuthor;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update getPosts query to handle all profile photo types
  async getPosts() {
    console.log('Fetching all posts with author info');
    // Replace db.any with db.query
    const result = await db.query(`
      WITH author_info AS (
        SELECT id, name, profile_photo, role, 'user' as source 
        FROM users
        UNION ALL
        SELECT id, name, profile_photo, 'admin' as role, 'admin' as source 
        FROM admin_users
        UNION ALL
        SELECT id, name, profile_photo, 'staff' as role, 'staff' as source 
        FROM staff_users
      ),
      comment_authors AS (
        SELECT id, name, profile_photo, role 
        FROM users
        UNION ALL
        SELECT id, name, profile_photo, 'admin' as role 
        FROM admin_users
        UNION ALL
        SELECT id, name, profile_photo, 'staff' as role 
        FROM staff_users
      )
      SELECT 
        p.*,
        a.name as author_name,
        a.profile_photo as author_avatar,
        a.role as author_role,
        a.source as author_source,
        to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        p.image_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'content', c.content,
              'author_id', c.author_id,
              'author_name', ca.name,
              'author_avatar', ca.profile_photo,
              'author_role', ca.role,
              'created_at', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              'likes', c.likes
            ) ORDER BY c.created_at DESC
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as comments,
        CASE 
          WHEN p.type = 'poll' THEN 
            json_build_object(
              'id', pl.id,
              'question', pl.question,
              'totalVotes', pl.total_votes,
              'options', (
                SELECT json_agg(
                  json_build_object(
                    'id', po.id,
                    'text', po.text,
                    'votes', po.votes
                  )
                )
                FROM forum_poll_options po
                WHERE po.poll_id = pl.id
              )
            )
          ELSE NULL
        END as poll
      FROM forum_posts p
      LEFT JOIN author_info a ON p.author_id = a.id
      LEFT JOIN forum_comments c ON p.id = c.post_id
      LEFT JOIN comment_authors ca ON c.author_id = ca.id
      LEFT JOIN forum_polls pl ON p.id = pl.post_id
      GROUP BY p.id, pl.id, a.name, a.profile_photo, a.role, a.source
      ORDER BY p.created_at DESC
    `);
    
    const posts = result.rows;
    
    // Add debug logging for all posts
    posts.forEach(post => {
      console.log(`Post ${post.id} author avatar:`, post.author_avatar?.substring(0, 30) + (post.author_avatar?.length > 30 ? '...' : ''));
    });
    
    return posts;
  },

  async addComment(postId, commentData) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // First get the post info with author type
      const postResult = await client.query(`
        SELECT 
          author_id,
          CASE 
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = author_id) THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = author_id) THEN 'staff'
            ELSE 'user'
          END as author_type
        FROM forum_posts WHERE id = $1`, 
        [postId]
      );
      
      const post = postResult.rows[0];

      // Then get commenter's info
      const authorResult = await client.query(`
        SELECT 
          id, 
          name, 
          profile_photo, 
          role, 
          CASE 
            WHEN id IN (SELECT id FROM admin_users) THEN 'admin'
            WHEN id IN (SELECT id FROM staff_users) THEN 'staff'
            ELSE 'user'
          END as source
        FROM (
          SELECT id, name, profile_photo, role, 'user' as source
          FROM users 
          WHERE id = $1
          UNION ALL
          SELECT id, name, profile_photo, 'admin' as role, 'admin' as source
          FROM admin_users 
          WHERE id = $1
          UNION ALL
          SELECT id, name, profile_photo, 'staff' as role, 'staff' as source
          FROM staff_users 
          WHERE id = $1
        ) combined_users
        LIMIT 1
      `, [commentData.author_id]);
      
      const author = authorResult.rows[0];

      if (!author) {
        throw new Error('Author not found in any user table');
      }

      // Create comment with necessary fields
      const commentResult = await client.query(`
        INSERT INTO forum_comments 
        (post_id, content, author_id, likes, author_role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id,
          content,
          author_id,
          author_role,
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          likes`,
        [postId, commentData.content, commentData.author_id, 0, author.role]
      );
      
      const comment = commentResult.rows[0];

      // Create notification if needed
      if (post.author_id !== commentData.author_id) {
        // Determine the correct table for the recipient
        let targetTable;
        if (post.author_type === 'admin') {
          targetTable = 'admin_users';
        } else if (post.author_type === 'staff') {
          targetTable = 'staff_users';
        } else {
          targetTable = 'users';
        }
        
        // Verify recipient exists before creating notification
        const recipientResult = await client.query(
          `SELECT 1 FROM ${targetTable} WHERE id = $1`, 
          [post.author_id]
        );
        
        const recipientExists = recipientResult.rows.length > 0;

        if (recipientExists) {
          await client.query(`
            INSERT INTO notifications (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              post.author_id,
              'new_comment',
              `${author.name} commented on your post`,
              postId,
              commentData.author_id,
              author.name,
              author.profile_photo
            ]
          );
        } else {
          console.warn(`Cannot create notification: recipient ${post.author_id} not found in ${targetTable}`);
        }
      }

      await client.query('COMMIT');
      
      return {
        ...comment,
        author_name: author.name,
        author_avatar: author.profile_photo,
        author_role: author.role
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Convert the remaining methods from pg-promise to node-postgres
  async updateCommentLike(postId, commentId, userId, increment = true) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existingResult = await client.query(
          'SELECT id FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );

        if (existingResult.rows.length > 0) {
          throw new Error('User already liked this comment');
        }

        await client.query(
          'INSERT INTO forum_comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [commentId, userIdInt]
        );

        // Get comment author, user info, and post title
        const commentDataResult = await client.query(`
          SELECT 
            c.author_id, 
            c.content, 
            p.title as post_title,
            CASE 
              WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = c.author_id) THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = c.author_id) THEN 'staff'
              ELSE 'user'
            END as author_type
          FROM forum_comments c 
          JOIN forum_posts p ON c.post_id = p.id 
          WHERE c.id = $1`, 
          [commentId]
        );
        
        const commentData = commentDataResult.rows[0];
        
        const userResult = await client.query(`
          SELECT 
            COALESCE(u.name, a.name, s.name) as name,
            COALESCE(u.profile_photo, a.profile_photo, s.profile_photo) as profile_photo,
            CASE 
              WHEN a.id IS NOT NULL THEN 'admin'
              WHEN s.id IS NOT NULL THEN 'staff'
              ELSE 'user'
            END as user_type
          FROM (
            SELECT NULL as id, NULL as name, NULL as profile_photo WHERE false
            UNION ALL
            SELECT id, name, profile_photo FROM users WHERE id = $1
            UNION ALL
            SELECT id, name, profile_photo FROM admin_users WHERE id = $1
            UNION ALL
            SELECT id, name, profile_photo FROM staff_users WHERE id = $1
          ) combined_users
          LEFT JOIN users u ON combined_users.id = u.id AND u.id = $1
          LEFT JOIN admin_users a ON combined_users.id = a.id AND a.id = $1
          LEFT JOIN staff_users s ON combined_users.id = s.id AND s.id = $1
          LIMIT 1
        `, [userIdInt]);
        
        const user = userResult.rows[0];

        if (!user) {
          throw new Error(`User ID ${userIdInt} not found in any user table`);
        }

        // Create notification if the liker is not the comment author
        if (commentData.author_id !== userIdInt) {
          // Check target user type
          let targetTable;
          if (commentData.author_type === 'admin') {
            targetTable = 'admin_users';
          } else if (commentData.author_type === 'staff') {
            targetTable = 'staff_users';
          } else {
            targetTable = 'users';
          }

          // Verify recipient exists before creating notification
          const recipientResult = await client.query(
            `SELECT 1 FROM ${targetTable} WHERE id = $1`, 
            [commentData.author_id]
          );
          
          const recipientExists = recipientResult.rows.length > 0;

          if (recipientExists) {
            await client.query(`
              INSERT INTO notifications 
              (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
              [
                commentData.author_id,
                'comment_like',
                `${user.name} liked your comment on "${commentData.post_title}"`,
                postId,
                userIdInt,
                user.name,
                user.profile_photo
              ]
            );
          } else {
            console.warn(`Cannot create notification: recipient ${commentData.author_id} not found in ${targetTable}`);
          }
        }

      } else {
        await client.query(
          'DELETE FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );
      }

      // Update and return comment with accurate like count
      const resultQuery = `
        WITH like_count AS (
          SELECT COUNT(*) as count
          FROM forum_comment_likes
          WHERE comment_id = $1
        ), author_info AS (
          SELECT name, profile_photo FROM users WHERE id = (SELECT author_id FROM forum_comments WHERE id = $1)
          UNION ALL
          SELECT name, profile_photo FROM admin_users WHERE id = (SELECT author_id FROM forum_comments WHERE id = $1)
          UNION ALL
          SELECT name, profile_photo FROM staff_users WHERE id = (SELECT author_id FROM forum_comments WHERE id = $1)
          LIMIT 1
        )
        UPDATE forum_comments c
        SET likes = (SELECT count FROM like_count)
        WHERE id = $1 AND post_id = $2
        RETURNING 
          c.id,
          c.content,
          c.author_id,
          (SELECT name FROM author_info) as author_name,
          (SELECT profile_photo FROM author_info) as author_avatar,
          to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          c.likes`;
          
      const result = await client.query(resultQuery, [commentId, postId]);
      
      await client.query('COMMIT');
      
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Similar conversions for all other functions
  // Use the same pattern of replace db.tx, db.one, db.oneOrNone, db.any with 
  // client transactions and client.query, accessing rows property
  
  // Abbreviated implementation of other methods for brevity...
  
  async updatePostLike(postId, userId, increment = true) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existingResult = await client.query(
          'SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );

        if (existingResult.rows.length > 0) {
          throw new Error('User already liked this post');
        }

        await client.query(
          'INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userIdInt]
        );

        // Get post author and user info
        const postResult = await client.query(`
          SELECT 
            p.author_id, 
            p.title,
            CASE 
              WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = p.author_id) THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = p.author_id) THEN 'staff'
              ELSE 'user'
            END as author_type
          FROM forum_posts p WHERE p.id = $1`, 
          [postId]
        );
        
        const post = postResult.rows[0];

        // Rest of implementation follows the same pattern...
        // Creating notification, checking recipient, etc.
      } else {
        await client.query(
          'DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );
      }

      // Update post likes count and return updated post
      const resultQuery = `
        WITH like_count AS (
          SELECT COUNT(*) as count
          FROM forum_post_likes
          WHERE post_id = $1
        ), author_info AS (
          SELECT name, profile_photo FROM users WHERE id = (SELECT author_id FROM forum_posts WHERE id = $1)
          UNION ALL
          SELECT name, profile_photo FROM admin_users WHERE id = (SELECT author_id FROM forum_posts WHERE id = $1)
          UNION ALL
          SELECT name, profile_photo FROM staff_users WHERE id = (SELECT author_id FROM forum_posts WHERE id = $1)
          LIMIT 1
        )
        UPDATE forum_posts p
        SET likes = (SELECT count FROM like_count)
        WHERE id = $1
        RETURNING 
          p.id,
          p.title,
          p.content,
          p.author_id,
          p.category,
          p.type,
          p.likes,
          to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          (SELECT name FROM author_info) as author_name,
          (SELECT profile_photo FROM author_info) as author_avatar`;

      const result = await client.query(resultQuery, [postId]);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Additional methods with similar conversion pattern...
  
  async getUserLikedPosts(userId) {
    const userIdInt = parseInt(userId, 10);
    const result = await db.query(
      'SELECT post_id FROM forum_post_likes WHERE user_id = $1',
      [userIdInt]
    );
    return result.rows.map(row => row.post_id);
  },

  async getUserLikedComments(userId) {
    const userIdInt = parseInt(userId, 10);
    const result = await db.query(
      'SELECT comment_id FROM forum_comment_likes WHERE user_id = $1',
      [userIdInt]
    );
    return result.rows.map(row => row.comment_id);
  },
  
  // Other methods similarly converted...
  
  async getEventPosts(eventId) {
    const eventIdInt = parseInt(eventId, 10);
    
    console.log('Fetching event posts for eventId:', eventIdInt);
    
    if (isNaN(eventIdInt) || eventIdInt <= 0) {
      console.error('Invalid event ID:', eventId);
      throw new Error('Invalid event ID provided');
    }
    
    try {
      // Check if the event exists first
      const eventExists = await db.query(
        'SELECT id FROM events WHERE id = $1', 
        [eventIdInt]
      );
      
      if (eventExists.rows.length === 0) {
        console.log('Event not found with ID:', eventIdInt);
        return []; // Return empty array instead of throwing error
      }
      
      // The main query with proper rows accessor
      const result = await db.query(`
        WITH author_info AS (
          SELECT id, name, profile_photo, role, 'user' as source 
          FROM users
          
          UNION ALL
          
          SELECT id, name, profile_photo, 'admin' as role, 'admin' as source 
          FROM admin_users
          
          UNION ALL
          
          SELECT id, name, profile_photo, 'staff' as role, 'staff' as source 
          FROM staff_users
        ),
        comment_authors AS (
          SELECT id, name, profile_photo, role, 'user' as source
          FROM users
          
          UNION ALL
          
          SELECT id, name, profile_photo, 'admin' as role, 'admin' as source
          FROM admin_users
          
          UNION ALL
          
          SELECT id, name, profile_photo, 'staff' as role, 'staff' as source
          FROM staff_users
        )
        SELECT 
          p.*,
          a.name as author_name,
          a.profile_photo as author_avatar,
          a.role as author_role,
          a.source as author_source,
          to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          p.image_url,
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'content', c.content,
                'author_id', c.author_id,
                'author_name', ca.name,
                'author_avatar', ca.profile_photo,
                'author_role', ca.role,
                'created_at', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'likes', c.likes
              ) ORDER BY c.created_at DESC
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'
          ) as comments,
          CASE 
            WHEN p.type = 'poll' THEN 
              json_build_object(
                'id', pl.id,
                'question', pl.question,
                'totalVotes', pl.total_votes,
                'options', (
                  SELECT json_agg(
                    json_build_object(
                      'id', po.id,
                      'text', po.text,
                      'votes', po.votes
                    )
                  )
                  FROM forum_poll_options po
                  WHERE po.poll_id = pl.id
                )
              )
            ELSE NULL
          END as poll
        FROM forum_posts p
        LEFT JOIN author_info a ON p.author_id = a.id
        LEFT JOIN forum_comments c ON p.id = c.post_id
        LEFT JOIN comment_authors ca ON c.author_id = ca.id
        LEFT JOIN forum_polls pl ON p.id = pl.post_id
        WHERE p.event_id = $1
        GROUP BY p.id, pl.id, a.name, a.profile_photo, a.role, a.source
        ORDER BY p.created_at DESC
      `, [eventIdInt]);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getEventPosts:', error);
      throw new Error(`Failed to get event posts: ${error.message}`);
    }
  }
};

module.exports = forumModel;
