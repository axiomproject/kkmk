const db = require('../config/db');

const ReportCardModel = {
  async submitReportCard(userId, frontImage, backImage, gradeLevel, gradingPeriod) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // First check if user already has an active submission
      const activeSubmissionResult = await client.query(`
        SELECT id, status 
        FROM report_cards 
        WHERE user_id = $1 
        AND status NOT IN ('rejected')
        ORDER BY submitted_at DESC 
        LIMIT 1
      `, [userId]);

      if (activeSubmissionResult.rows.length > 0 && 
          activeSubmissionResult.rows[0].status !== 'rejected') {
        throw new Error('You already have an active report card submission');
      }

      // If no active submission, proceed with new submission
      const result = await client.query(`
        INSERT INTO report_cards 
        (user_id, front_image, back_image, grade_level, status, verification_step, submitted_at, updated_at, grading_period)
        VALUES 
        ($1, $2, $3, $4, 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5)
        RETURNING *
      `, [userId, frontImage, backImage, gradeLevel, gradingPeriod]);

      await client.query(`
        UPDATE users 
        SET has_submitted_report = true 
        WHERE id = $1
      `, [userId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async updateVerificationStep(userId, step) {
    const result = await db.query(`
      UPDATE report_cards 
      SET verification_step = $2, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 
      RETURNING *
    `, [userId, step]);
    
    return result.rows[0];
  },

  async getReportCardByUserId(userId) {
    const result = await db.query(`
      SELECT 
        report_cards.*,
        CASE 
          WHEN report_cards.status = 'rejected' THEN true
          WHEN report_cards.status = 'pending' AND verification_step = 0 THEN true
          WHEN report_cards.status = 'pending_renewal' THEN true
          ELSE false
        END as needs_renewal
      FROM report_cards 
      WHERE user_id = $1 
      ORDER BY submitted_at DESC 
      LIMIT 1
    `, [userId]);
    
    return result.rows.length ? result.rows[0] : null;
  },

  async getAllReportCards() {
    const result = await db.query(`
      SELECT rc.*, 
             u.name as user_name, 
             u.email as user_email
      FROM report_cards rc
      LEFT JOIN users u ON rc.user_id = u.id
      WHERE rc.status IN ('pending', 'in_review', 'verified', 'rejected')
      ORDER BY 
        CASE 
          WHEN rc.status = 'pending' THEN 1
          WHEN rc.status = 'in_review' THEN 2
          ELSE 3
        END,
        rc.submitted_at DESC
    `);
    
    return result.rows;
  },

  async verifyReportCard(id) {
    try {
      const result = await db.query(`
        UPDATE report_cards
        SET status = 'verified', verification_step = 3, updated_at = NOW()
        WHERE id = $1
        RETURNING *, (
          SELECT json_build_object('name', u.name, 'email', u.email)
          FROM users u
          WHERE u.id = report_cards.user_id
        ) as user_info
      `, [id]);

      const reportCard = result.rows[0];
      if (!reportCard) {
        throw new Error('Report card not found');
      }

      reportCard.user_name = reportCard.user_info?.name;
      reportCard.user_email = reportCard.user_info?.email;
      delete reportCard.user_info;

      return reportCard;
    } catch (error) {
      console.error('Error verifying report card:', error);
      throw error;
    }
  },

  async rejectReportCard(id, reason) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get report card details to fetch user_id
      const reportCard = await client.query(`
        SELECT user_id FROM report_cards WHERE id = $1
      `, [id]);

      if (!reportCard.rows.length) {
        throw new Error('Report card not found');
      }

      // Update report card status
      const result = await client.query(`
        UPDATE report_cards 
        SET 
          status = 'rejected',
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *
      `, [id, reason]);

      // Reset user's report submission status to allow resubmission
      await client.query(`
        UPDATE users 
        SET has_submitted_report = false 
        WHERE id = $1
      `, [reportCard.rows[0].user_id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getActiveReportCard(userId) {
    const result = await db.query(`
      SELECT * FROM report_cards 
      WHERE user_id = $1 
      AND status IN ('pending', 'in_review')
      ORDER BY submitted_at DESC 
      LIMIT 1
    `, [userId]);
    
    return result.rows.length ? result.rows[0] : null;
  },

  async deleteReportCard(id) {
    const result = await db.query(`
      DELETE FROM report_cards 
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    return { rowCount: result.rowCount };
  },

  async reviewReportCard(id) {
    try {
      const result = await db.query(`
        UPDATE report_cards
        SET status = 'in_review', verification_step = 2, updated_at = NOW()
        WHERE id = $1
        RETURNING *, (
          SELECT json_build_object('name', u.name, 'email', u.email)
          FROM users u
          WHERE u.id = report_cards.user_id
        ) as user_info
      `, [id]);

      const reportCard = result.rows[0];
      if (!reportCard) {
        throw new Error('Report card not found');
      }

      reportCard.user_name = reportCard.user_info?.name;
      reportCard.user_email = reportCard.user_info?.email;
      delete reportCard.user_info;

      return reportCard;
    } catch (error) {
      console.error('Error reviewing report card:', error);
      throw error;
    }
  },

  async renewReportCard(id) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        // First get the existing report card details
        const existingCardResult = await client.query(`
          SELECT rc.*, 
                 TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(NOW() + INTERVAL '1 year', 'YYYY') as school_year
          FROM report_cards rc
          WHERE rc.id = $1
        `, [id]);
        
        if (existingCardResult.rows.length === 0) {
          throw new Error('Report card not found');
        }
        
        const oldReportCard = existingCardResult.rows[0];
        const schoolYear = oldReportCard.school_year;
        
        // Archive the current report card in the history table
        await client.query(`
          INSERT INTO report_card_history (
            report_card_id, user_id, front_image, back_image, 
            grade_level, status, verification_step, 
            submitted_at, updated_at, school_year, 
            renewal_reason, archived_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
          )
        `, [
          oldReportCard.id,
          oldReportCard.user_id,
          oldReportCard.front_image,
          oldReportCard.back_image,
          oldReportCard.grade_level,
          oldReportCard.status,
          oldReportCard.verification_step,
          oldReportCard.submitted_at,
          oldReportCard.updated_at,
          schoolYear,
          'Annual renewal for new school year'
        ]);
        
        // Update the report card status to indicate renewal
        await client.query(`
          UPDATE report_cards
          SET status = 'pending',
              verification_step = 0, -- Reset verification step
              updated_at = NOW()
          WHERE id = $1
        `, [id]);
        
        // Update only the report card submission status
        await client.query(`
          UPDATE users 
          SET has_submitted_report = false
          WHERE id = $1
        `, [oldReportCard.user_id]);
        
        // Fetch user info for notifications
        const userInfoResult = await client.query(`
          SELECT name, email
          FROM users
          WHERE id = $1
        `, [oldReportCard.user_id]);
        
        if (userInfoResult.rows.length === 0) {
          throw new Error('User not found');
        }
        
        const user = userInfoResult.rows[0];

        await client.query('COMMIT');
        
        return {
          id: id,
          user_id: oldReportCard.user_id,
          user_name: user.name,
          user_email: user.email,
          status: 'pending',
          verification_step: 0 // Add verification step to response
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error renewing report card:', error);
      throw error;
    }
  },

  async getReportCardHistory(userId) {
    try {
      // Check if the report_card_history table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'report_card_history'
        );
      `);
      
      // If table doesn't exist, return empty array
      if (!tableExists.rows[0].exists) {
        console.error('report_card_history table does not exist');
        return [];
      }
      
      const result = await db.query(`
        SELECT 
          rch.id as history_id,
          rch.report_card_id,
          rch.user_id,
          rch.grade_level,
          rch.status,
          rch.verification_step,
          rch.submitted_at,
          rch.archived_at,
          rch.school_year,
          rch.renewal_reason
        FROM report_card_history rch
        WHERE rch.user_id = $1
        ORDER BY rch.archived_at DESC
      `, [userId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching report card history:', error);
      // Return empty array instead of throwing to avoid breaking the client
      return [];
    }
  },

  async getReportCardHistoryById(historyId) {
    try {
      const result = await db.query(`
        SELECT 
          rch.*,
          u.name as user_name,
          u.email as user_email
        FROM report_card_history rch
        JOIN users u ON rch.user_id = u.id
        WHERE rch.id = $1
      `, [historyId]);
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching report card history by ID:', error);
      return null;
    }
  }
};

module.exports = ReportCardModel;
