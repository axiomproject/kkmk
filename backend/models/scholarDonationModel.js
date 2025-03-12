const db = require('../config/db');

const ScholarDonationModel = {
  async createDonation(data) {
    try {
      // First check if the scholar exists as a user
      const scholarCheckResult = await db.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2',
        [data.scholarId, 'scholar']
      );

      if (scholarCheckResult.rows.length === 0) {
        throw new Error(`Scholar with ID ${data.scholarId} not found`);
      }

      // If sponsor ID is provided, validate that it exists
      if (data.sponsorId) {
        const sponsorCheckResult = await db.query(
          'SELECT id FROM users WHERE id = $1 AND role = $2',
          [data.sponsorId, 'sponsor']
        );

        if (sponsorCheckResult.rows.length === 0) {
          throw new Error(`Sponsor with ID ${data.sponsorId} not found`);
        }
      }

      // Insert the donation with scholar_id pointing directly to user_id
      const result = await db.query(`
        INSERT INTO scholar_donations (
          scholar_id, sponsor_id, donor_name, donor_email, donor_phone,
          amount, payment_method, proof_image, message, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        data.scholarId,
        data.sponsorId || null,
        data.donorName || data.name || null,
        data.email,
        data.phone,
        data.amount,
        data.paymentMethod,
        data.proofOfPayment || null,
        data.message || '',
        'pending'
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  },

  async getDonationWithScholarAndSponsorInfo(id) {
    try {
      const result = await db.query(`
        SELECT 
          sd.*,
          u_scholar.name as scholar_name,
          u_scholar.email as scholar_email,
          u_sponsor.name as donor_name,
          u_sponsor.email as donor_email
        FROM scholar_donations sd
        LEFT JOIN users u_scholar ON sd.scholar_id = u_scholar.id
        LEFT JOIN users u_sponsor ON sd.sponsor_id = u_sponsor.id
        WHERE sd.id = $1
      `, [id]);
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching donation with info:', error);
      throw error;
    }
  },

  async getVerifiedDonationsForScholar(scholarId) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          amount::numeric,
          payment_method,
          verified_at,
          COALESCE(donor_name, 'Anonymous') as donor_name,
          CASE 
            WHEN sponsor_id IS NOT NULL THEN 
              (SELECT name FROM users WHERE id = sponsor_id)
            ELSE donor_name
          END as sponsor_name
        FROM scholar_donations
        WHERE scholar_id = $1
        AND verification_status = 'verified'
        ORDER BY verified_at DESC
      `, [scholarId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching verified donations:', error);
      throw error;
    }
  },

  async getDonationStatsByScholar(scholarId) {
    try {
      const result = await db.query(`
        WITH monthly_stats AS (
          SELECT
            DATE_TRUNC('month', verified_at) as month,
            SUM(amount::numeric) as total
          FROM scholar_donations
          WHERE scholar_id = $1
          AND verification_status = 'verified'
          GROUP BY DATE_TRUNC('month', verified_at)
          ORDER BY month DESC
          LIMIT 6
        )
        SELECT
          TO_CHAR(month, 'Mon YYYY') as month_name,
          total
        FROM monthly_stats
        ORDER BY month
      `, [scholarId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching donation stats:', error);
      throw error;
    }
  },

  async getScholarDonationTotal(scholarId) {
    try {
      const result = await db.query(`
        SELECT COALESCE(SUM(amount::numeric), 0) as total
        FROM scholar_donations
        WHERE scholar_id = $1
        AND verification_status = 'verified'
      `, [scholarId]);
      
      return parseFloat(result.rows[0].total) || 0;
    } catch (error) {
      console.error('Error fetching donation total:', error);
      throw error;
    }
  }
};

module.exports = ScholarDonationModel;
