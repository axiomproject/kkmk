const db = require('../config/db');

const ReportCardModel = {
  async submitReportCard(userId, frontImage, backImage) {
    try {
      const result = await db.one(`
        INSERT INTO report_cards 
        (user_id, front_image, back_image, status, verification_step, submitted_at, updated_at)
        VALUES 
        ($1, $2, $3, 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [userId, frontImage, backImage]);

      // Update the user's verification status in users table
      await db.none(`
        UPDATE users 
        SET has_submitted_report = true 
        WHERE id = $1
      `, [userId]);

      return result;
    } catch (error) {
      throw error;
    }
  },

  async updateVerificationStep(userId, step) {
    return await db.one(`
      UPDATE report_cards 
      SET verification_step = $2, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 
      RETURNING *
    `, [userId, step]);
  },

  async getReportCardByUserId(userId) {
    return await db.oneOrNone(`
      SELECT * FROM report_cards 
      WHERE user_id = $1 
      ORDER BY submitted_at DESC 
      LIMIT 1
    `, [userId]);
  },

  async getAllReportCards() {
    return await db.any(`
      SELECT rc.*, 
             u.name as user_name, 
             u.email as user_email
      FROM report_cards rc
      LEFT JOIN users u ON rc.user_id = u.id
      ORDER BY rc.submitted_at DESC
    `);
  },

  async verifyReportCard(id) {
    return await db.one(`
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
  },

  async rejectReportCard(id, reason) {
    return await db.one(`
      UPDATE report_cards 
      SET 
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [id]);
  },

  async getActiveReportCard(userId) {
    return await db.oneOrNone(`
      SELECT * FROM report_cards 
      WHERE user_id = $1 
      AND status IN ('pending', 'in_review')
      ORDER BY submitted_at DESC 
      LIMIT 1
    `, [userId]);
  },

  async deleteReportCard(id) {
    return await db.result(`
      DELETE FROM report_cards 
      WHERE id = $1
      RETURNING *
    `, [id]);
  }
};

module.exports = ReportCardModel;
