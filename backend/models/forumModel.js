const db = require('../config/db');

const forumModel = {
  async createPost(postData) {
    return db.tx(async t => {
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

      const author = await t.oneOrNone(authorQuery, [authorId]);
      
      if (!author) {
        throw new Error(`No user, admin, or staff found with ID: ${authorId}`);
      }

      // Update authorization check for restricted categories
      if (postData.category?.toLowerCase() === 'announcements' || 
          (postData.category?.toLowerCase() === 'events' && !postData.eventId)) {
        const isAdminOrStaff = await t.oneOrNone(`
          SELECT id FROM (
            SELECT id FROM admin_users WHERE id = $1
            UNION ALL
            SELECT id FROM staff_users WHERE id = $1
          ) as auth
        `, [authorId]);
        
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

      // Create the base post first
      const post = await t.one(`
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

      // Update the author details query to include staff
      const authorDetails = await t.one(`
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
      
      // Add debug logging to see what's being retrieved
      console.log('Retrieved author details:', authorDetails);

      // If it's a poll, create poll data
      let pollData = null;
      if (postData.type === 'poll' && postData.poll) {
        try {
          const pollOptions = typeof postData.poll === 'string' 
            ? JSON.parse(postData.poll) 
            : postData.poll;

          // Create poll
          const poll = await t.one(`
            INSERT INTO forum_polls (post_id, question, total_votes)
            VALUES ($1, $2, 0)
            RETURNING id, question, total_votes`,
            [post.id, pollOptions.question || postData.title]
          );

          // Create poll options
          const options = await Promise.all(
            pollOptions.options.map(option =>
              t.one(`
                INSERT INTO forum_poll_options (poll_id, text, votes)
                VALUES ($1, $2, 0)
                RETURNING id, text, votes`,
                [poll.id, option.text]
              )
            )
          );

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
    });
  },

  // Update getPosts query to handle all profile photo types
  async getPosts() {
    console.log('Fetching all posts with author info');
    const posts = await db.any(`
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
    
    // Add debug logging for all posts
    posts.forEach(post => {
      console.log(`Post ${post.id} author avatar:`, post.author_avatar?.substring(0, 30) + (post.author_avatar?.length > 30 ? '...' : ''));
    });
    
    return posts;
  },

  async addComment(postId, commentData) {
    return db.tx(async t => {
      // First get the post info with author type
      const post = await t.one(`
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

      // Then get commenter's info
      const author = await t.oneOrNone(`
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

      if (!author) {
        throw new Error('Author not found in any user table');
      }

      // Create comment with necessary fields
      const comment = await t.one(`
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
        const recipientExists = await t.oneOrNone(
          `SELECT 1 FROM ${targetTable} WHERE id = $1`, 
          [post.author_id]
        );

        if (recipientExists) {
          await t.none(`
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

      return {
        ...comment,
        author_name: author.name,
        author_avatar: author.profile_photo,
        author_role: author.role
      };
    });
  },

  async updateCommentLike(postId, commentId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this comment');
        }

        await t.none(
          'INSERT INTO forum_comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [commentId, userIdInt]
        );

        // Get comment author, user info, and post title
        const [commentData, user] = await Promise.all([
          t.one(`
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
          ),
          t.oneOrNone(`
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
          `, [userIdInt])
        ]);

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
          const recipientExists = await t.oneOrNone(
            `SELECT 1 FROM ${targetTable} WHERE id = $1`, 
            [commentData.author_id]
          );

          if (recipientExists) {
            await t.none(`
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
        await t.none(
          'DELETE FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );
      }

      // Update and return comment with accurate like count
      const result = await t.one(`
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
          c.likes`,
        [commentId, postId]
      );

      return result;
    });
  },

  async updatePostLike(postId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this post');
        }

        await t.none(
          'INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userIdInt]
        );

        // Get post author and user info with improved query
        const [post, user] = await Promise.all([
          t.one(`
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
          ),
          t.oneOrNone(`
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
          `, [userIdInt])
        ]);

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
          const recipientExists = await t.oneOrNone(
            `SELECT 1 FROM ${targetTable} WHERE id = $1`, 
            [post.author_id]
          );

          if (recipientExists) {
            await t.none(`
              INSERT INTO notifications 
              (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
              [
                post.author_id,
                'post_like',
                `${user.name} liked your post "${post.title}"`,
                postId,
                userIdInt,
                user.name,
                user.profile_photo
              ]
            );
          } else {
            console.warn(`Cannot create notification: recipient ${post.author_id} not found in ${targetTable}`);
          }
        }

      } else {
        await t.none(
          'DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );
      }

      // Updated query to check both users and admin_users tables
      const result = await t.one(`
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
          (SELECT profile_photo FROM author_info) as author_avatar`,
        [postId]
      );

      return result;
    });
  },

  async updatePostVote(postId, optionId) {
    await db.tx(async t => {
      await t.none(
        `UPDATE forum_poll_options 
         SET votes = votes + 1 
         WHERE id = $1`,
        [optionId]
      );

      await t.none(
        `UPDATE forum_polls 
         SET total_votes = total_votes + 1 
         WHERE post_id = $1`,
        [postId]
      );
    });
  },

  async updateCommentLike(postId, commentId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this comment');
        }

        await t.none(
          'INSERT INTO forum_comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [commentId, userIdInt]
        );

        // Get comment author, user info, and post title
        const [commentData, user] = await Promise.all([
          t.one(`
            SELECT 
              c.author_id, 
              c.content, 
              p.title as post_title 
            FROM forum_comments c 
            JOIN forum_posts p ON c.post_id = p.id 
            WHERE c.id = $1`, 
            [commentId]
          ),
          t.oneOrNone(`
            SELECT name, profile_photo FROM (
              SELECT name, profile_photo FROM users WHERE id = $1
              UNION ALL
              SELECT name, profile_photo FROM admin_users WHERE id = $1
              UNION ALL
              SELECT name, profile_photo FROM staff_users WHERE id = $1
            ) author_info 
            LIMIT 1
          `, [userIdInt])
        ]);

        if (!user) {
          throw new Error('User not found');
        }

        // Create notification if the liker is not the comment author
        if (commentData.author_id !== userIdInt) {
          await t.none(`
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
        }

      } else {
        await t.none(
          'DELETE FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );
      }

      // Update and return comment with accurate like count
      const result = await t.one(`
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
          c.likes`,
        [commentId, postId]
      );

      return result;
    });
  },

  async updatePostLike(postId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this post');
        }

        await t.none(
          'INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userIdInt]
        );

        // Get post author and user info (check both users and admin_users tables)
        const [post, user] = await Promise.all([
          t.one('SELECT author_id, title FROM forum_posts WHERE id = $1', [postId]),
          t.oneOrNone(`
            SELECT name, profile_photo FROM (
              SELECT name, profile_photo FROM users WHERE id = $1
              UNION ALL
              SELECT name, profile_photo FROM admin_users WHERE id = $1
              UNION ALL
              SELECT name, profile_photo FROM staff_users WHERE id = $1
            ) author_info 
            LIMIT 1
          `, [userIdInt])
        ]);

        if (!user) {
          throw new Error('User not found');
        }

        // Create notification if the liker is not the post author
        if (post.author_id !== userIdInt) {
          await t.none(`
            INSERT INTO notifications 
            (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              post.author_id,
              'post_like',
              `${user.name} liked your post "${post.title}"`,
              postId,
              userIdInt,
              user.name,
              user.profile_photo
            ]
          );
        }

      } else {
        await t.none(
          'DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );
      }

      // Updated query to check both users and admin_users tables
      const result = await t.one(`
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
          (SELECT profile_photo FROM author_info) as author_avatar`,
        [postId]
      );

      return result;
    });
  },

  async getUserLikedPosts(userId) {
    const userIdInt = parseInt(userId, 10);
    return db.map(
      'SELECT post_id FROM forum_post_likes WHERE user_id = $1',
      [userIdInt],
      row => row.post_id
    );
  },

  async getUserLikedComments(userId) {
    // Convert userId to integer
    const userIdInt = parseInt(userId, 10);
    return db.map(
      'SELECT comment_id FROM forum_comment_likes WHERE user_id = $1',
      [userIdInt],
      row => row.comment_id
    );
  },

  async updatePollVote(postId, optionId, userId) {
    return db.tx(async t => {
      // Check if user already voted
      const existingVote = await t.oneOrNone(
        `SELECT id FROM forum_poll_votes 
         WHERE poll_id = (SELECT id FROM forum_polls WHERE post_id = $1)
         AND user_id = $2`,
        [postId, userId]
      );

      if (existingVote) {
        throw new Error('User has already voted on this poll');
      }

      // Get poll id
      const poll = await t.one(
        'SELECT id FROM forum_polls WHERE post_id = $1',
        [postId]
      );

      // Record the vote
      await t.none(
        `INSERT INTO forum_poll_votes (poll_id, user_id, option_id)
         VALUES ($1, $2, $3)`,
        [poll.id, userId, optionId]
      );

      // Update vote counts
      await t.none(
        `UPDATE forum_poll_options 
         SET votes = votes + 1 
         WHERE id = $1`,
        [optionId]
      );

      await t.none(
        `UPDATE forum_polls 
         SET total_votes = total_votes + 1 
         WHERE id = $1`,
        [poll.id]
      );

      // Return updated poll data
      return await t.one(`
        SELECT 
          p.id,
          p.question,
          p.total_votes as "totalVotes",
          (
            SELECT json_agg(
              json_build_object(
                'id', po.id,
                'text', po.text,
                'votes', po.votes
              )
            )
            FROM forum_poll_options po
            WHERE po.poll_id = p.id
          ) as options
        FROM forum_polls p
        WHERE p.post_id = $1`,
        [postId]
      );
    });
  },

  async getUserVotedPolls(userId) {
    return db.map(
      `SELECT DISTINCT p.post_id 
       FROM forum_poll_votes v
       JOIN forum_polls p ON v.poll_id = p.id
       WHERE v.user_id = $1`,
      [userId],
      row => row.post_id
    );
  },

  // Update deletePost to include staff authorization with admin post protection
  async deletePost(postId, userId) {
    return db.tx(async t => {
      try {
        // Add debug logging
        console.log('Attempting to delete post:', { postId, userId });

        // Check user role (admin, staff, or regular user)
        const userRole = await t.oneOrNone(`
          SELECT 
            CASE
              WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $1) THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $1) THEN 'staff'
              ELSE 'user'
            END as role
        `, [userId]);

        console.log('User role for delete operation:', userRole);

        // First verify post exists and get post author info
        const post = await t.oneOrNone(`
          SELECT 
            p.id, 
            p.author_id,
            p.author_role,
            CASE 
              WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = $2) THEN true
              WHEN EXISTS (SELECT 1 FROM staff_users WHERE id = $2) AND 
                  NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p.author_id) THEN true
              WHEN p.author_id = $2 THEN true
              ELSE false
            END as can_delete
          FROM forum_posts p 
          WHERE p.id = $1`,
          [postId, userId]
        );

        console.log('Post lookup result:', post); // Debug log

        if (!post) {
          throw new Error('Post not found');
        }

        if (!post.can_delete) {
          if (userRole.role === 'staff' && post.author_role === 'admin') {
            throw new Error('Staff members cannot delete admin posts');
          } else {
            throw new Error('Unauthorized to delete this post');
          }
        }

        // If authorized, proceed with deletion
        await t.none('DELETE FROM forum_post_likes WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_comment_likes WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_comments WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_poll_votes WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_poll_options WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_polls WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_posts WHERE id = $1', [postId]);

        return { success: true };
      } catch (error) {
        console.error('Database error while deleting post:', error);
        throw error;
      }
    });
  },

  // Update updatePost to include staff authorization
  async updatePost(postId, userId, updateData) {
    return db.tx(async t => {
      try {
        // Check if user is the post author or an admin
        const post = await t.oneOrNone(
          `SELECT p.id, p.type, pl.total_votes 
           FROM forum_posts p 
           LEFT JOIN forum_polls pl ON p.id = pl.post_id 
           WHERE p.id = $1 AND (
             p.author_id = $2 OR 
             EXISTS (SELECT 1 FROM admin_users WHERE id = $2) OR
             EXISTS (SELECT 1 FROM staff_users WHERE id = $2)
           )`,
          [postId, userId]
        );

        if (!post) {
          throw new Error('Unauthorized to edit this post');
        }

        // If it's a poll and has votes, prevent editing
        if (post.type === 'poll' && post.total_votes > 0) {
          throw new Error('Cannot edit poll after votes have been cast');
        }

        // Update post basic info
        const updatedPost = await t.one(`
          UPDATE forum_posts 
          SET 
            title = $1,
            content = $2,
            category = $3
          WHERE id = $4 
          RETURNING *
        `, [updateData.title, updateData.content, updateData.category, postId]);

        // If it's a poll, update poll options
        if (updatedPost.type === 'poll' && updateData.poll) {
          // Update poll question
          await t.none(`
            UPDATE forum_polls 
            SET question = $1 
            WHERE post_id = $2
          `, [updateData.title, postId]);

          // Update poll options that have no votes
          for (const option of updateData.poll.options) {
            if (option.votes === 0) {
              await t.none(`
                UPDATE forum_poll_options 
                SET text = $1 
                WHERE id = $2 AND votes = 0
              `, [option.text, option.id]);
            }
          }
        }

        // Get author details from both users and admin_users tables
        const author = await t.oneOrNone(`
          SELECT name, profile_photo, role 
          FROM (
            SELECT name, profile_photo, role FROM users WHERE id = $1
            UNION ALL
            SELECT name, profile_photo, 'admin' as role FROM admin_users WHERE id = $1
            UNION ALL
            SELECT name, profile_photo, 'staff' as role FROM staff_users WHERE id = $1
          ) author_info
          LIMIT 1
        `, [userId]);

        if (!author) {
          throw new Error('Author not found');
        }

        // Update comments query to include staff users
        const comments = await t.any(`
          SELECT 
            c.*,
            COALESCE(u.name, a.name, s.name) as author_name,
            COALESCE(u.profile_photo, a.profile_photo, s.profile_photo) as author_avatar,
            COALESCE(
              CASE 
                WHEN u.id IS NOT NULL THEN u.role
                WHEN a.id IS NOT NULL THEN 'admin'
                WHEN s.id IS NOT NULL THEN 'staff'
              END
            ) as author_role
          FROM forum_comments c
          LEFT JOIN users u ON c.author_id = u.id
          LEFT JOIN admin_users a ON c.author_id = a.id
          LEFT JOIN staff_users s ON c.author_id = s.id
          WHERE c.post_id = $1
          ORDER BY c.created_at DESC
        `, [postId]);

        // Combine all data
        const fullPost = {
          ...updatedPost,
          author_name: author.name,
          author_avatar: author.profile_photo,
          comments: comments || []
        };

        return fullPost;

      } catch (error) {
        console.error('Error in updatePost:', error);
        throw error;
      }
    });
  },

  // Fix the getEventPosts method SQL query syntax error - fix missing FROM clauses
  async getEventPosts(eventId) {
    const eventIdInt = parseInt(eventId, 10);
    
    console.log('Fetching event posts for eventId:', eventIdInt);
    
    // Validate eventId first
    if (isNaN(eventIdInt) || eventIdInt <= 0) {
      console.error('Invalid event ID:', eventId);
      throw new Error('Invalid event ID provided');
    }
    
    try {
      // Check if the event exists first
      const eventExists = await db.oneOrNone('SELECT id FROM events WHERE id = $1', [eventIdInt]);
      if (!eventExists) {
        console.log('Event not found with ID:', eventIdInt);
        return []; // Return empty array instead of throwing error
      }
      
      // Debug log - separate query to avoid complicating the main query
      console.log('Debug: Checking user profile examples');
      const userExamples = await db.any(`
        SELECT id, name, profile_photo, 'user' as type FROM users LIMIT 3`);
      console.log('Sample users:', userExamples);
      
      // The main query with fixed syntax - properly adding FROM clauses
      return await db.any(`
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
    } catch (error) {
      console.error('Error in getEventPosts:', error);
      throw new Error(`Failed to get event posts: ${error.message}`);
    }
  }
};

module.exports = forumModel;
