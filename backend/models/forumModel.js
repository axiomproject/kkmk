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

      // Get approval status from post data or set default based on user role
      let approvalStatus = postData.approval_status || 'pending';
      
      // If user is admin or staff, auto-approve their posts
      if (author.role === 'admin' || author.role === 'staff') {
        approvalStatus = 'approved';
      }
      
      console.log('Post approval status:', approvalStatus);

      // Create the base post first - replace db.one with client.query
      const postResult = await client.query(`
        INSERT INTO forum_posts 
        (title, content, author_id, category, type, image_url, event_id, author_role, approval_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, title, content, author_id, category, type, image_url, event_id, created_at, approval_status`,
        [
          postData.title,
          postData.content,
          authorId,
          category, // Use exact category name
          postData.type,
          postData.imageUrl || null,
          eventId, // Add eventId to the insert
          author.role, // Add role to the post
          approvalStatus // Add approval status
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
        poll: pollData, // Add poll data to returned post
        approval_status: approvalStatus
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
        p.approval_status,
        p.rejection_reason,
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
          // Get the absolute URL for the author's profile photo
          let avatarUrl = author.profile_photo;
          
          // Debug the avatar URL
          console.log('Original author avatar URL:', avatarUrl);
          
          // Check if the URL is already absolute
          if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
            // Extract filename from path if it contains slashes
            const filename = avatarUrl.split('/').pop();
            
            // Ensure we have the correct path prefix for each user type
            if (author.source === 'admin') {
              avatarUrl = `/uploads/admin/${filename}`;
            } else if (author.source === 'staff') {
              avatarUrl = `/uploads/staff/${filename}`;
            } else {
              // For regular users
              avatarUrl = `/uploads/users/${filename}`;
            }
          }
          
          // Log the processed avatar URL
          console.log('Processed avatar URL for notification:', avatarUrl);
          
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
              avatarUrl
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
            // Get the URL for the user's profile photo
            let avatarUrl = user.profile_photo;
            
            // Debug the avatar URL
            console.log('Original liker avatar URL:', avatarUrl);
            
            // Check if the URL is already absolute
            if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
              // Extract filename from path if it contains slashes
              const filename = avatarUrl.split('/').pop();
              
              // Ensure we have the correct path prefix for each user type
              if (user.user_type === 'admin') {
                avatarUrl = `/uploads/admin/${filename}`;
              } else if (user.user_type === 'staff') {
                avatarUrl = `/uploads/staff/${filename}`;
              } else {
                // For regular users
                avatarUrl = `/uploads/users/${filename}`;
              }
            }
            
            // Log the processed avatar URL
            console.log('Processed avatar URL for notification:', avatarUrl);
            
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
                avatarUrl // Use the processed avatar URL
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
        
        // Get user info
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

        // Create notification if the liker is not the post author
        if (post.author_id !== userIdInt) {
          // Check target user type
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
            // Get the URL for the user's profile photo
            let avatarUrl = user.profile_photo;
            
            // Debug the avatar URL
            console.log('Original liker avatar URL:', avatarUrl);
            
            // Check if the URL is already absolute
            if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
              // Extract filename from path if it contains slashes
              const filename = avatarUrl.split('/').pop();
              
              // Ensure we have the correct path prefix for each user type
              if (user.user_type === 'admin') {
                avatarUrl = `/uploads/admin/${filename}`;
              } else if (user.user_type === 'staff') {
                avatarUrl = `/uploads/staff/${filename}`;
              } else {
                // For regular users
                avatarUrl = `/uploads/users/${filename}`;
              }
            }
            
            // Log the processed avatar URL
            console.log('Processed avatar URL for notification:', avatarUrl);
            
            await client.query(`
              INSERT INTO notifications 
              (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                post.author_id,
                'post_like',
                `${user.name} liked your post "${post.title}"`,
                postId,
                userIdInt,
                user.name,
                avatarUrl // Use the processed avatar URL
              ]
            );
          } else {
            console.warn(`Cannot create notification: recipient ${post.author_id} not found in ${targetTable}`);
          }
        }
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
  },

  async deletePost(postId, userId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid post or user ID');
      }
      
      // Check post exists and get more info about it
      const postResult = await client.query(
        'SELECT author_id, category, event_id FROM forum_posts WHERE id = $1',
        [postIdInt]
      );
      
      if (postResult.rows.length === 0) {
        return { success: false, message: 'Post not found' };
      }
      
      const post = postResult.rows[0];
      console.log('Attempting to delete post:', { 
        postId: postIdInt,
        userId: userIdInt,
        postAuthorId: post.author_id,
        category: post.category,
        hasEventId: post.event_id !== null
      });
      
      // Check if the user is the author or has admin/staff privileges
      const isAdmin = await client.query(
        'SELECT id FROM admin_users WHERE id = $1',
        [userIdInt]
      );
      
      const isStaff = await client.query(
        'SELECT id FROM staff_users WHERE id = $1',
        [userIdInt]
      );
      
      // Get the role of the post author
      const authorRoleResult = await client.query(`
        SELECT 
          CASE 
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $1) THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $1) THEN 'staff'
            ELSE 'user'
          END as role
        `, [post.author_id]
      );
      
      const authorRole = authorRoleResult.rows[0]?.role || 'user';
      
      const isAuthor = post.author_id === userIdInt;
      const isAdminUser = isAdmin.rows.length > 0;
      const isStaffUser = isStaff.rows.length > 0;
      
      console.log('Authorization check:', {
        isAuthor,
        isAdminUser, 
        isStaffUser,
        authorRole
      });
      
      // Staff cannot delete admin posts
      if (isStaffUser && !isAdminUser && authorRole === 'admin' && !isAuthor) {
        throw new Error('Unauthorized to delete this post');
      }
      
      // Handle general authorization
      if (!isAuthor && !isAdminUser && !isStaffUser) {
        throw new Error('Unauthorized to delete this post');
      }
      
      // Delete all related data in the correct order
      // 1. First delete poll options and votes
      await client.query(`
        DELETE FROM forum_poll_options 
        WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)
      `, [postIdInt]);
      
      await client.query(`
        DELETE FROM forum_poll_votes 
        WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)
      `, [postIdInt]);
      
      // 2. Delete polls
      await client.query('DELETE FROM forum_polls WHERE post_id = $1', [postIdInt]);
      
      // 3. Delete comment likes
      await client.query(`
        DELETE FROM forum_comment_likes 
        WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = $1)
      `, [postIdInt]);
      
      // 4. Delete comments
      await client.query('DELETE FROM forum_comments WHERE post_id = $1', [postIdInt]);
      
      // 5. Delete post likes
      await client.query('DELETE FROM forum_post_likes WHERE post_id = $1', [postIdInt]);
      
      // 6. Delete related notifications
      await client.query('DELETE FROM notifications WHERE related_id = $1', [postIdInt]);
      
      // 7. Finally delete the post itself
      await client.query('DELETE FROM forum_posts WHERE id = $1', [postIdInt]);
      
      console.log('Post deleted successfully:', postIdInt);
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in deletePost:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  async getUserVotedPolls(userId) {
    const userIdInt = parseInt(userId, 10);
    const result = await db.query(`
      SELECT DISTINCT post_id 
      FROM forum_polls p
      JOIN forum_poll_votes v ON p.id = v.poll_id
      WHERE v.user_id = $1
    `, [userIdInt]);
    return result.rows.map(row => row.post_id);
  },

  async updatePollVote(postId, optionId, userId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const optionIdInt = parseInt(optionId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(optionIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid ID format');
      }
      
      // First, check if user has already voted on this poll
      const pollIdResult = await client.query(`
        SELECT p.id
        FROM forum_polls p
        WHERE p.post_id = $1
      `, [postIdInt]);
      
      if (pollIdResult.rows.length === 0) {
        throw new Error('Poll not found');
      }
      
      const pollId = pollIdResult.rows[0].id;
      
      const existingVoteResult = await client.query(`
        SELECT id, option_id
        FROM forum_poll_votes
        WHERE poll_id = $1 AND user_id = $2
      `, [pollId, userIdInt]);
      
      const hasVoted = existingVoteResult.rows.length > 0;
      
      if (hasVoted) {
        throw new Error('User has already voted on this poll');
      }
      
      // Check if option exists
      const optionResult = await client.query(`
        SELECT id
        FROM forum_poll_options
        WHERE id = $1 AND poll_id = $2
      `, [optionIdInt, pollId]);
      
      if (optionResult.rows.length === 0) {
        throw new Error('Option not found');
      }
      
      // Record the vote
      await client.query(`
        INSERT INTO forum_poll_votes (poll_id, option_id, user_id)
        VALUES ($1, $2, $3)
      `, [pollId, optionIdInt, userIdInt]);
      
      // Increment vote count for the option
      await client.query(`
        UPDATE forum_poll_options
        SET votes = votes + 1
        WHERE id = $1
      `, [optionIdInt]);
      
      // Update total votes count in poll
      await client.query(`
        UPDATE forum_polls
        SET total_votes = total_votes + 1
        WHERE id = $1
      `, [pollId]);
      
      // Fetch updated poll data
      const updatedPollResult = await client.query(`
        SELECT 
          p.id,
          p.question,
          p.total_votes as "totalVotes",
          json_agg(
            json_build_object(
              'id', po.id,
              'text', po.text,
              'votes', po.votes
            )
          ) as options
        FROM forum_polls p
        JOIN forum_poll_options po ON p.id = po.poll_id
        WHERE p.post_id = $1
        GROUP BY p.id
      `, [postIdInt]);
      
      await client.query('COMMIT');
      
      return updatedPollResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  async updatePost(postId, userId, updateData) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid post or user ID');
      }
      
      // Check post exists and get its current data
      const postResult = await client.query(
        'SELECT * FROM forum_posts WHERE id = $1',
        [postIdInt]
      );
      
      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }
      
      const post = postResult.rows[0];
      
      // Only the author can edit their post
      if (post.author_id !== userIdInt) {
        throw new Error('Unauthorized to edit this post');
      }
      
      // If it's a poll, check if it already has votes
      if (updateData.type === 'poll' && post.type === 'poll') {
        const pollResult = await client.query(`
          SELECT total_votes
          FROM forum_polls
          WHERE post_id = $1
        `, [postIdInt]);
        
        if (pollResult.rows.length > 0 && pollResult.rows[0].total_votes > 0) {
          throw new Error('Cannot edit a poll that already has votes');
        }
      }
      
      // Update the post with the new data
      const updateFields = [];
      const updateValues = [];
      const paramStartIndex = 3; // Starting index for parameter placeholders
      let paramIndex = 1;
      
      if (updateData.title) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(updateData.title);
        paramIndex++;
      }
      
      if (updateData.content !== undefined) {
        updateFields.push(`content = $${paramIndex}`);
        updateValues.push(updateData.content);
        paramIndex++;
      }
      
      if (updateData.category) {
        updateFields.push(`category = $${paramIndex}`);
        updateValues.push(updateData.category);
        paramIndex++;
      }
      
      if (updateData.type) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(updateData.type);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
        return post; // Nothing to update
      }
      
      updateValues.push(postIdInt); // Add postId as the last parameter
      
      const updateQuery = `
        UPDATE forum_posts
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const updatedPostResult = await client.query(updateQuery, updateValues);
      const updatedPost = updatedPostResult.rows[0];
      
      // If it's a poll and has poll data, update or create the poll
      if (updateData.type === 'poll' && updateData.poll) {
        // First, check if poll exists
        const existingPollResult = await client.query(
          'SELECT id FROM forum_polls WHERE post_id = $1',
          [postIdInt]
        );
        
        let pollId;
        if (existingPollResult.rows.length > 0) {
          // Update existing poll
          pollId = existingPollResult.rows[0].id;
          await client.query(
            'UPDATE forum_polls SET question = $1 WHERE id = $2',
            [updateData.poll.question || updatedPost.title, pollId]
          );
          
          // Delete existing options
          await client.query(
            'DELETE FROM forum_poll_options WHERE poll_id = $1',
            [pollId]
          );
        } else {
          // Create new poll
          const newPollResult = await client.query(
            'INSERT INTO forum_polls (post_id, question, total_votes) VALUES ($1, $2, 0) RETURNING id',
            [postIdInt, updateData.poll.question || updatedPost.title]
          );
          pollId = newPollResult.rows[0].id;
        }
        
        // Add new options
        if (updateData.poll.options && Array.isArray(updateData.poll.options)) {
          for (const option of updateData.poll.options) {
            await client.query(
              'INSERT INTO forum_poll_options (poll_id, text, votes) VALUES ($1, $2, 0)',
              [pollId, option.text]
            );
          }
        }
        
        // Get updated poll data
        const updatedPollResult = await client.query(`
          SELECT 
            p.id,
            p.question,
            p.total_votes as "totalVotes",
            json_agg(
              json_build_object(
                'id', po.id,
                'text', po.text,
                'votes', po.votes
              )
            ) as options
          FROM forum_polls p
          JOIN forum_poll_options po ON p.id = po.poll_id
          WHERE p.post_id = $1
          GROUP BY p.id
        `, [postIdInt]);
        
        if (updatedPollResult.rows.length > 0) {
          updatedPost.poll = updatedPollResult.rows[0];
        }
      }
      
      await client.query('COMMIT');
      return updatedPost;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteComment(postId, commentId, userId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const commentIdInt = parseInt(commentId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(commentIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid post, comment or user ID');
      }
      
      // Check comment exists
      const commentResult = await client.query(
        'SELECT author_id, author_role FROM forum_comments WHERE id = $1 AND post_id = $2',
        [commentIdInt, postIdInt]
      );
      
      if (commentResult.rows.length === 0) {
        return { success: false, message: 'Comment not found' };
      }
      
      const comment = commentResult.rows[0];
      
      // Check if the user is the author or has admin/staff privileges
      const isAdmin = await client.query(
        'SELECT id FROM admin_users WHERE id = $1',
        [userIdInt]
      );
      
      const isStaff = await client.query(
        'SELECT id FROM staff_users WHERE id = $1',
        [userIdInt]
      );
      
      const isAuthor = comment.author_id === userIdInt;
      const isAdminUser = isAdmin.rows.length > 0;
      const isStaffUser = isStaff.rows.length > 0;

      console.log('Authorization check for comment deletion:', {
        isAuthor,
        isAdminUser,
        isStaffUser,
        commentAuthorRole: comment.author_role
      });
      
      // Staff cannot delete admin comments
      if (isStaffUser && !isAdminUser && comment.author_role === 'admin') {
        throw new Error('Unauthorized to delete this comment');
      }
      
      // Regular users can only delete their own comments
      if (!isAuthor && !isAdminUser && !isStaffUser) {
        throw new Error('Unauthorized to delete this comment');
      }
      
      // Delete all related data in the correct order
      // 1. First delete comment likes
      await client.query(
        'DELETE FROM forum_comment_likes WHERE comment_id = $1',
        [commentIdInt]
      );
      
      // 2. Delete the comment itself
      await client.query(
        'DELETE FROM forum_comments WHERE id = $1 AND post_id = $2',
        [commentIdInt, postIdInt]
      );
      
      console.log('Comment deleted successfully:', commentIdInt);
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in deleteComment:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  async approvePost(postId, userId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid post or user ID');
      }
      
      // Check if user is admin or staff
      const isAdminOrStaff = await client.query(`
        SELECT 1 FROM (
          SELECT id FROM admin_users WHERE id = $1
          UNION
          SELECT id FROM staff_users WHERE id = $1
        ) AS auth_users
      `, [userIdInt]);
      
      if (isAdminOrStaff.rows.length === 0) {
        throw new Error('Only admin or staff can approve posts');
      }
      
      // Update the post approval status
      const updateResult = await client.query(`
        UPDATE forum_posts
        SET approval_status = 'approved', rejection_reason = NULL
        WHERE id = $1
        RETURNING id, title, approval_status
      `, [postIdInt]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Post not found');
      }
      
      // Get post author information
      const postAuthorResult = await client.query(`
        SELECT 
          p.author_id,
          CASE 
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = p.author_id) THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = p.author_id) THEN 'staff'
            ELSE 'user'
          END as author_type
        FROM forum_posts p
        WHERE p.id = $1
      `, [postIdInt]);
      
      if (postAuthorResult.rows.length > 0) {
        const post = postAuthorResult.rows[0];
        
        // Create notification for post author
        if (post.author_id !== userIdInt) {
          // Get approver's name and avatar
          const approverResult = await client.query(`
            SELECT 
              COALESCE(a.name, s.name) as name,
              COALESCE(a.profile_photo, s.profile_photo) as profile_photo,
              CASE 
                WHEN a.id IS NOT NULL THEN 'admin'
                ELSE 'staff'
              END as role
            FROM (
              SELECT NULL as id, NULL as name, NULL as profile_photo
              WHERE false
              UNION ALL
              SELECT id, name, profile_photo FROM admin_users WHERE id = $1
              UNION ALL
              SELECT id, name, profile_photo FROM staff_users WHERE id = $1
            ) combined
            LEFT JOIN admin_users a ON combined.id = a.id AND a.id = $1
            LEFT JOIN staff_users s ON combined.id = s.id AND s.id = $1
          `, [userIdInt]);
          
          if (approverResult.rows.length > 0) {
            const approver = approverResult.rows[0];
            
            // Determine the correct table for the recipient
            let targetTable;
            if (post.author_type === 'admin') {
              targetTable = 'admin_users';
            } else if (post.author_type === 'staff') {
              targetTable = 'staff_users';
            } else {
              targetTable = 'users';
            }
            
            // Get avatar URL
            let avatarUrl = approver.profile_photo;
            if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
              const filename = avatarUrl.split('/').pop();
              if (approver.role === 'admin') {
                avatarUrl = `/uploads/admin/${filename}`;
              } else {
                avatarUrl = `/uploads/staff/${filename}`;
              }
            }
            
            // Create notification
            await client.query(`
              INSERT INTO notifications 
              (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              post.author_id,
              'post_approved',
              `Your post has been approved by ${approver.name}`,
              postIdInt,
              userIdInt,
              approver.name,
              avatarUrl
            ]);
          }
        }
      }
      
      await client.query('COMMIT');
      
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  async rejectPost(postId, userId, reason) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert IDs to integers
      const postIdInt = parseInt(postId, 10);
      const userIdInt = parseInt(userId, 10);
      
      if (isNaN(postIdInt) || isNaN(userIdInt)) {
        throw new Error('Invalid post or user ID');
      }
      
      // Check if user is admin or staff
      const isAdminOrStaff = await client.query(`
        SELECT 1 FROM (
          SELECT id FROM admin_users WHERE id = $1
          UNION
          SELECT id FROM staff_users WHERE id = $1
        ) AS auth_users
      `, [userIdInt]);
      
      if (isAdminOrStaff.rows.length === 0) {
        throw new Error('Only admin or staff can reject posts');
      }
      
      // Use default rejection reason if none provided
      const rejectionReason = reason || 'Content does not meet community guidelines';
      
      // Update the post approval status
      const updateResult = await client.query(`
        UPDATE forum_posts
        SET approval_status = 'rejected', rejection_reason = $1
        WHERE id = $2
        RETURNING id, title, approval_status, rejection_reason
      `, [rejectionReason, postIdInt]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Post not found');
      }
      
      // Get post author information
      const postAuthorResult = await client.query(`
        SELECT 
          p.author_id,
          CASE 
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = p.author_id) THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = p.author_id) THEN 'staff'
            ELSE 'user'
          END as author_type
        FROM forum_posts p
        WHERE p.id = $1
      `, [postIdInt]);
      
      if (postAuthorResult.rows.length > 0) {
        const post = postAuthorResult.rows[0];
        
        // Create notification for post author
        if (post.author_id !== userIdInt) {
          // Get rejecter's name and avatar
          const rejecterResult = await client.query(`
            SELECT 
              COALESCE(a.name, s.name) as name,
              COALESCE(a.profile_photo, s.profile_photo) as profile_photo,
              CASE 
                WHEN a.id IS NOT NULL THEN 'admin'
                ELSE 'staff'
              END as role
            FROM (
              SELECT NULL as id, NULL as name, NULL as profile_photo
              WHERE false
              UNION ALL
              SELECT id, name, profile_photo FROM admin_users WHERE id = $1
              UNION ALL
              SELECT id, name, profile_photo FROM staff_users WHERE id = $1
            ) combined
            LEFT JOIN admin_users a ON combined.id = a.id AND a.id = $1
            LEFT JOIN staff_users s ON combined.id = s.id AND s.id = $1
          `, [userIdInt]);
          
          if (rejecterResult.rows.length > 0) {
            const rejecter = rejecterResult.rows[0];
            
            // Determine the correct table for the recipient
            let targetTable;
            if (post.author_type === 'admin') {
              targetTable = 'admin_users';
            } else if (post.author_type === 'staff') {
              targetTable = 'staff_users';
            } else {
              targetTable = 'users';
            }
            
            // Get avatar URL
            let avatarUrl = rejecter.profile_photo;
            if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
              const filename = avatarUrl.split('/').pop();
              if (rejecter.role === 'admin') {
                avatarUrl = `/uploads/admin/${filename}`;
              } else {
                avatarUrl = `/uploads/staff/${filename}`;
              }
            }
            
            // Create notification
            await client.query(`
              INSERT INTO notifications 
              (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              post.author_id,
              'post_rejected',
              `Your post has been rejected. Reason: ${rejectionReason}`,
              postIdInt,
              userIdInt,
              rejecter.name,
              avatarUrl
            ]);
          }
        }
      }
      
      await client.query('COMMIT');
      
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Add method to get pending posts count for admins/staff
  async getPendingPostsCount() {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM forum_posts
        WHERE approval_status = 'pending'
      `);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Error getting pending posts count:', error);
      throw error;
    }
  },
  
  // Add method to get posts by approval status (for pending approval filter)
  async getPostsByApprovalStatus(status) {
    try {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new Error('Invalid approval status');
      }
      
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
          p.approval_status,
          p.rejection_reason,
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
        WHERE p.approval_status = $1
        GROUP BY p.id, pl.id, a.name, a.profile_photo, a.role, a.source
        ORDER BY p.created_at DESC
      `, [status]);
      
      return result.rows;
    } catch (error) {
      console.error(`Error getting ${status} posts:`, error);
      throw error;
    }
  },

};

module.exports = forumModel;
