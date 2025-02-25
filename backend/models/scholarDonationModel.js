const db = require('../config/db');

const ScholarDonationModel = {
  async createDonation(data) {
    return await db.one(`
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
  },

  async getDonationWithSponsorInfo(id) {
    return await db.oneOrNone(`
      SELECT 
        sd.*,
        u.name as donor_name,
        u.email as donor_email
      FROM scholar_donations sd
      LEFT JOIN users u ON sd.sponsor_id = u.id
      WHERE sd.id = $1
    `, [id]);
  }
};

module.exports = ScholarDonationModel;
