const db = require('../config/db');

const ScholarDonationModel = {
  async createDonation(data) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO scholar_donations (
        scholar_id, sponsor_id, donor_email, donor_phone,
        amount, payment_method, proof_image, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.scholarId,
      data.sponsorId,
      data.email,
      data.phone,
      data.amount,
      data.paymentMethod,
      data.proofOfPayment || null,
      data.message || ''
    ]);
    return result.rows[0];
  },

  async getDonationWithSponsorInfo(id) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(`
      SELECT 
        sd.*,
        u.name as donor_name,
        u.email as donor_email
      FROM scholar_donations sd
      LEFT JOIN users u ON sd.sponsor_id = u.id
      WHERE sd.id = $1
    `, [id]);
    return result.rows.length ? result.rows[0] : null;
  }
};

module.exports = ScholarDonationModel;
