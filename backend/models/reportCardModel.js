const db = require('../config/db');

const ReportCardModel = {
  async submitReportCard(userId, frontImage, backImage) {
    try {
      // Replace db.one with db.query
      const result = await db.query(`
        INSERT INTO report_cards 
        (user_id, front_image, back_image, status, verification_step, submitted_at, updated_at)
        VALUES 
        ($1, $2, $3, 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [userId, frontImage, backImage]);

      // Replace db.none with db.query
      await db.query(`
        UPDATE users 
        SET has_submitted_report = true 
        WHERE id = $1
      `, [userId]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  async updateVerificationStep(userId, step) {
    // Replace db.one with db.query
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
    // Replace db.oneOrNone with db.query
    const result = await db.query(`
      SELECT * FROM report_cards 
      WHERE user_id = $1 
      ORDER BY submitted_at DESC 
      LIMIT 1
    `, [userId]);
    
    return result.rows.length ? result.rows[0] : null;
  },

  async getAllReportCards() {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT rc.*, 
             u.name as user_name, 
             u.email as user_email
      FROM report_cards rc
      LEFT JOIN users u ON rc.user_id = u.id
      ORDER BY rc.submitted_at DESC
    `);
    
    return result.rows;
  },

  async verifyReportCard(id) {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE report_cards 
      SET 
        status = CASE 
          WHEN verification_step = 1 THEN 'in_review'
          WHEN verification_step = 2 THEN 'verified'
          ELSE status
        END,
        verification_step = LEAST(verification_step + 1, 3),
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `, [id]);
    
    return result.rows[0];
  },

  async rejectReportCard(id, reason) {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE report_cards 
      SET 
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [id]);
    
    return result.rows[0];
  },

  async getActiveReportCard(userId) {
    // Replace db.oneOrNone with db.query
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
    // Replace db.result with db.query
    const result = await db.query(`
      DELETE FROM report_cards 
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    return { rowCount: result.rowCount };
  }
};

module.exports = ReportCardModel;
